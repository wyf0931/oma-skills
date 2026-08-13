<div align="center">

# oma-skills

**Agent skills from [ohmyagent.ai](https://ohmyagent.ai) — built for the Pi coding agent.**

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Pi](https://img.shields.io/badge/pi-agent-7c3aed?logo=pi&logoColor=white)](https://pi.dev)

</div>

Reusable, prompt-first workflows distilled from production usage. Each skill turns a proven
multi-step process into a deterministic, verifiable pipeline your agent can follow.

## Agent compatibility

These skills are authored for and tested against the **Pi coding agent** — that is the ecosystem
we primarily support. Ports to other agents are planned but not yet shipped.

| Skill | Claude | Codex | OpenCode | **Pi** | OpenClaw | Hermes Agent |
| ----- | :----: | :----: | :------: | :----: | :------: | :-----------: |
| spec-pipeline | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| skill-creator | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |

> ✅ = adapted & tested · ❌ = not yet adapted
>
> **skill-creator** is a Pi-native port of Anthropic's
> [skill-creator](https://github.com/anthropics/skills/tree/main/skills/skill-creator). The
> Claude Code–specific bits (`claude -p`, `.claude/commands` injection, Skill/Read tool
> detection) are replaced with Pi equivalents (`pi -p --skill --mode json` + `read`-tool
> detection).

## Skills

### [spec-pipeline](skills/spec-pipeline/)

Deterministic spec-orchestration for complex coding tasks. Instead of trusting a single prompt,
drives the request through a fixed pipeline and executes the result with real verification gates:

```
refine → research → grill → compose → critique → implement → verify → enforce
```

- Isolated research via subagents — the parent context only ever sees distilled answers
- `reviewer` subagent critiques the spec with fresh eyes before any code is written
- A mandatory, executable `VERIFY` block — the task is not done until it actually passes
- Post-implementation check against the project's `AGENTS.md` conventions
- Crash-safe: every phase boundary is persisted to `.pi-tasks/TASK.md`, resumable after interruption
- Multi-task mode decomposes a feature into an ordered, dependency-linked task list

**Triggers:** complex/multi-step requests, "先出方案 / 先写 spec / 规划一下", plan-before-code,
feature decomposition.

### [skill-creator](skills/skill-creator/)

Create, evaluate, and iterate on skills — a full creation loop with quantitative benchmarking:

```
capture intent → draft SKILL.md → test cases → dual-track runs → grade → benchmark → human review → iterate → description optimization
```

- Dual-track testing: each eval runs with-skill and baseline (without-skill) in parallel via
  `subagent`, so the benchmark measures real skill value
- Quantitative evals with assertions, `benchmark.json` aggregation (pass rate / time / tokens),
  and a browser viewer (`eval-viewer/generate_review.py`) for human review
- Pi-native trigger testing: `scripts/run_eval.py` drives `pi -p --skill <path> --mode json` and
  detects `read`-tool calls on the SKILL.md — no `.claude/commands` injection
- Description optimization loop (`scripts/run_loop.py`) with train/test holdout to prevent
  overfitting

**Triggers:** creating/building/improving skills, skill evals, benchmarking, description
optimization.

## Install

```bash
pi install git:github.com/wyf0931/oma-skills
```

Then reload Pi:

```bash
/reload
```

## Dependencies

spec-pipeline composes two Pi extensions — install them alongside:

```bash
pi install npm:@juicesharp/rpiv-todo     # 4-state todo tool (task/phase tracking)
pi install npm:pi-subagents              # subagent tool (isolated research & review)
```

| Tool | Provided by | Used for |
| ---- | ----------- | -------- |
| `todo` | [@juicesharp/rpiv-todo](https://pi.dev/packages/@juicesharp/rpiv-todo) | phase & task tracking, dependency ordering |
| `subagent` | [pi-subagents](https://pi.dev/packages/pi-subagents) | isolated research (`scout`/`researcher`), fresh-eyes review (`reviewer`) |
| `bash` | built-in | executing the VERIFY gate |

## Adding a skill

1. Create `skills/<skill-name>/SKILL.md` following the [Pi skill format](https://pi.dev/docs/skills)
2. Frontmatter: `name`, `description` (trigger-oriented, bilingual if relevant), `compatibility`
3. Keep the body under ~500 lines; push details into `references/` for progressive disclosure
4. Add a row to the compatibility matrix and a section above

## License

MIT © ohmyagent.ai — [ohmyagent.ai](https://ohmyagent.ai)
