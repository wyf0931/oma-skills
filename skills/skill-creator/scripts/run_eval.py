#!/usr/bin/env python3
"""Run trigger evaluation for a skill description (Pi native).

Tests whether a skill's description causes Pi to trigger (load the skill)
for a set of queries. Injects the skill via `pi -p --skill <path>` so it
appears in Pi's available_skills list, then watches the `--mode json` event
stream for a `read` tool call on the skill's SKILL.md path — that read is
Pi's triggering mechanism (skills are progressive disclosure: only name +
description are in context until the agent reads SKILL.md).

This is the Pi-native replacement for the Claude Code `run_eval.py`, which
injected a fake command into `.claude/commands/` and watched for Skill/Read
tool calls. No project files are touched: the skill is passed on the CLI and
queries run in a temp workdir so AGENTS.md/CLAUDE.md context can't skew the
trigger decision.
"""

import argparse
import json
import os
import select
import subprocess
import sys
import tempfile
import time
from concurrent.futures import ProcessPoolExecutor, as_completed
from pathlib import Path

from scripts.utils import parse_skill_md


def _read_target_from_event(event: dict) -> list[str]:
    """Extract paths the assistant tried to read from one JSON event."""
    paths: list[str] = []
    etype = event.get("type")
    if etype == "message_update":
        ame = event.get("assistantMessageEvent", {})
        if ame.get("type") == "toolcall_end":
            tc = ame.get("toolCall", {})
            if tc.get("name") == "read":
                args = tc.get("arguments", {})
                path = args.get("path", "") if isinstance(args, dict) else str(args)
                paths.append(str(path))
    elif etype == "message_end":
        msg = event.get("message", {})
        for item in msg.get("content", []):
            if item.get("type") == "toolCall" and item.get("name") == "read":
                args = item.get("arguments", {})
                path = args.get("path", "") if isinstance(args, dict) else str(args)
                paths.append(str(path))
    return paths


def run_single_query(
    query: str,
    skill_path: str,
    timeout: int,
    model: str | None = None,
    workdir: str | None = None,
) -> bool:
    """Run one query via `pi -p` and return whether the skill was triggered.

    Trigger = the model called the `read` tool on the skill's SKILL.md path.
    We stream `--mode json` output and return as soon as the read is seen,
    killing the subprocess to save tokens/time on negative runs.
    """
    skill_md = str(Path(skill_path) / "SKILL.md")

    cmd = ["pi", "-p", "--no-session", "--skill", str(skill_path), "--mode", "json"]
    if model:
        cmd.extend(["--model", model])
    cmd.append(query)

    # Drop Pi session vars so a nested `pi -p` inside a Pi session starts
    # clean (same idea as Claude Code's run_eval removing CLAUDECODE).
    env = {
        k: v
        for k, v in os.environ.items()
        if not k.startswith("PI_SESSION_") and k != "PI_CODING_AGENT"
    }

    process = subprocess.Popen(
        cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.DEVNULL,
        cwd=workdir or tempfile.gettempdir(),
        env=env,
    )
    stdout = process.stdout
    if stdout is None:
        # We passed stdout=PIPE, so this should never happen.
        process.kill()
        process.wait()
        return False

    triggered = False
    start_time = time.time()
    buffer = ""
    try:
        while time.time() - start_time < timeout:
            if process.poll() is not None:
                remaining = stdout.read()
                if remaining:
                    buffer += remaining.decode("utf-8", errors="replace")
                break

            ready, _, _ = select.select([stdout], [], [], 1.0)
            if not ready:
                continue

            chunk = os.read(stdout.fileno(), 8192)
            if not chunk:
                break
            buffer += chunk.decode("utf-8", errors="replace")

            while "\n" in buffer:
                line, buffer = buffer.split("\n", 1)
                line = line.strip()
                if not line:
                    continue
                try:
                    event = json.loads(line)
                except (json.JSONDecodeError, ValueError):
                    continue
                for path in _read_target_from_event(event):
                    if skill_md in path:
                        triggered = True
                        process.kill()
                        return True
        return triggered
    finally:
        if process.poll() is None:
            process.kill()
            process.wait()


def run_eval(
    eval_set: list[dict],
    skill_name: str,
    description: str,
    num_workers: int,
    timeout: int,
    runs_per_query: int = 1,
    trigger_threshold: float = 0.5,
    model: str | None = None,
    skill_path: str | None = None,
) -> dict:
    """Run the full eval set and return results."""
    results = []
    if skill_path is None:
        raise ValueError("skill_path is required for Pi trigger evaluation")

    with ProcessPoolExecutor(max_workers=num_workers) as executor:
        future_to_info = {}
        for item in eval_set:
            for run_idx in range(runs_per_query):
                future = executor.submit(
                    run_single_query,
                    item["query"],
                    skill_path,
                    timeout,
                    model,
                )
                future_to_info[future] = (item, run_idx)

        query_triggers: dict[str, list[bool]] = {}
        query_items: dict[str, dict] = {}
        for future in as_completed(future_to_info):
            item, _ = future_to_info[future]
            query = item["query"]
            query_items[query] = item
            if query not in query_triggers:
                query_triggers[query] = []
            try:
                query_triggers[query].append(future.result())
            except Exception as e:
                print(f"Warning: query failed: {e}", file=sys.stderr)
                query_triggers[query].append(False)

    for query, triggers in query_triggers.items():
        item = query_items[query]
        trigger_rate = sum(triggers) / len(triggers)
        should_trigger = item["should_trigger"]
        if should_trigger:
            did_pass = trigger_rate >= trigger_threshold
        else:
            did_pass = trigger_rate < trigger_threshold
        results.append(
            {
                "query": query,
                "should_trigger": should_trigger,
                "trigger_rate": trigger_rate,
                "triggers": sum(triggers),
                "runs": len(triggers),
                "pass": did_pass,
            }
        )

    passed = sum(1 for r in results if r["pass"])
    total = len(results)

    return {
        "skill_name": skill_name,
        "description": description,
        "results": results,
        "summary": {
            "total": total,
            "passed": passed,
            "failed": total - passed,
        },
    }


def materialize_skill_copy(skill_path: Path, description: str) -> Path:
    """Copy a skill dir into a temp dir with SKILL.md's description replaced.

    Trigger testing reads the description from the skill's SKILL.md, so a
    candidate description has to be written into a throwaway copy before
    `pi -p --skill` can test it.
    """
    import shutil

    tmp = Path(tempfile.mkdtemp(prefix="pi-skill-eval-"))
    shutil.copytree(skill_path, tmp / skill_path.name, dirs_exist_ok=True)
    skill_md = tmp / skill_path.name / "SKILL.md"
    lines = skill_md.read_text().split("\n")
    in_front = False
    out: list[str] = []
    replaced = False
    for line in lines:
        if line.strip() == "---" and not in_front:
            in_front = True
            out.append(line)
            continue
        if in_front and line.strip() == "---":
            in_front = False
            out.append(line)
            continue
        if in_front and line.startswith("description:") and not replaced:
            out.append(f"description: {description!r}")
            replaced = True
            continue
        out.append(line)
    skill_md.write_text("\n".join(out))
    return tmp / skill_path.name


def main():
    parser = argparse.ArgumentParser(
        description="Run trigger evaluation for a skill description (Pi native)"
    )
    parser.add_argument("--eval-set", required=True, help="Path to eval set JSON file")
    parser.add_argument(
        "--skill-path",
        required=True,
        help="Path to skill directory (injected via pi -p --skill)",
    )
    parser.add_argument(
        "--description",
        default=None,
        help="Override description to test (temporarily rewritten into SKILL.md)",
    )
    parser.add_argument(
        "--num-workers", type=int, default=10, help="Number of parallel workers"
    )
    parser.add_argument(
        "--timeout", type=int, default=60, help="Timeout per query in seconds"
    )
    parser.add_argument(
        "--runs-per-query", type=int, default=3, help="Number of runs per query"
    )
    parser.add_argument(
        "--trigger-threshold", type=float, default=0.5, help="Trigger rate threshold"
    )
    parser.add_argument(
        "--model",
        default=None,
        help="Model to use for pi -p (default: pi's configured model)",
    )
    parser.add_argument(
        "--verbose", action="store_true", help="Print progress to stderr"
    )
    args = parser.parse_args()

    try:
        eval_set = json.loads(Path(args.eval_set).read_text())
    except (OSError, json.JSONDecodeError) as exc:
        print(f"Error reading eval set {args.eval_set}: {exc}", file=sys.stderr)
        sys.exit(1)
    skill_path = Path(args.skill_path)

    if not (skill_path / "SKILL.md").exists():
        print(f"Error: No SKILL.md found at {skill_path}", file=sys.stderr)
        sys.exit(1)

    name, original_description, _ = parse_skill_md(skill_path)
    description = args.description or original_description

    # Trigger testing reads the description from SKILL.md, so a candidate
    # description is tested from a temp copy with the frontmatter rewritten.
    if args.description and args.description != original_description:
        test_skill_path = materialize_skill_copy(skill_path, args.description)
    else:
        test_skill_path = skill_path

    if args.verbose:
        print(f"Evaluating: {description}", file=sys.stderr)

    output = run_eval(
        eval_set=eval_set,
        skill_name=name,
        description=description,
        num_workers=args.num_workers,
        timeout=args.timeout,
        runs_per_query=args.runs_per_query,
        trigger_threshold=args.trigger_threshold,
        model=args.model,
        skill_path=str(test_skill_path),
    )

    if args.verbose:
        summary = output["summary"]
        print(
            f"Results: {summary['passed']}/{summary['total']} passed", file=sys.stderr
        )
        for r in output["results"]:
            status = "PASS" if r["pass"] else "FAIL"
            rate_str = f"{r['triggers']}/{r['runs']}"
            print(
                f"  [{status}] rate={rate_str} expected={r['should_trigger']}: {r['query'][:70]}",
                file=sys.stderr,
            )

    print(json.dumps(output, indent=2))


if __name__ == "__main__":
    main()
