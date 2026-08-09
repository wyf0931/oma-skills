---
name: spec-pipeline
description: >-
  Deterministic spec-orchestration pipeline for complex coding tasks: refine → research → grill →
  compose → critique → implement → verify → enforce. Use whenever the user wants a feature planned
  and specced BEFORE code is written, says "/task", "/task-plan", "先出方案/先写spec/规划一下/设计这个功能",
  asks for a plan for multi-step work, or when requirements are vague and need clarification first.
  Also use for decomposing a large feature into an ordered, executable task list. The pipeline
  combines the todo tool (phase/task tracking) with the subagent tool (isolated research + fresh-eyes
  review) so the parent context stays clean. Make sure to use this skill whenever the user mentions
  task pipeline, spec orchestration, feature planning, "spec first", plan-then-implement, or asks
  the agent to think before coding — even if they don't explicitly name the skill.
compatibility:
  required_tools:
    - todo
    - subagent
    - bash
  notes: >-
    Requires the rpiv-todo extension (@juicesharp/rpiv-todo) for the 4-state todo tool and the
    pi-subagents extension for the subagent tool. Verify gates execute real commands via bash.
---

# Spec Pipeline

A single prompt is not enough for non-trivial changes. Models drift: they skip context, hallucinate
APIs, and forget what was actually asked. This skill fixes that by NOT trusting one shot — it drives
the request through a fixed, persisted pipeline of small verifiable steps, then executes the
resulting spec with real verification gates.

**Why a pipeline?** Each phase has one job and one output section. The phase order is a convention
you follow in code, not a model's free choice — this is what makes the outcome deterministic.

## When this runs

Trigger for complex/multi-step requests. Skip it for single trivial tasks, one-line fixes, or
purely conversational requests — the pipeline overhead isn't worth it for those.

## How to run the pipeline

1. **Set up phase tracking first** — create todo tasks for the pipeline phases:
   `refine`, `research`, `grill`, `compose`, `critique`, `implement`, `verify`, `enforce`.
   Mark `refine` in_progress. Exactly one phase in_progress at a time; mark completed IMMEDIATELY
   when its output section is written — never batch completions.

2. **Persist progress** — after each phase, write its output section into
   `.pi-tasks/TASK.md` (append, don't replace earlier sections). This makes the task crash-safe:
   if interrupted, the state is a readable file you can resume from. Do not create
   `.pi-tasks/` until the first phase output is ready.

3. Follow the phases below in order. Do not skip a phase because it seems obvious — each one
   exists to catch a specific failure mode of a single-shot approach.

---

## Phase 1 — refine

Sharpen the raw ask into an unambiguous, self-contained statement.

- Rewrite the request as a single paragraph that a fresh reader could act on without the
  conversation history: the WHAT, the SCOPE (what's in / out), and the SUCCESS criteria.
- If the original request references files, docs, or issues, name them explicitly and read them
  if you haven't.
- Write the result under a `## refined prompt` section. Then mark `refine` completed, `research`
  in_progress.

**Why:** vague asks produce vague specs. Cheap to fix at the start, expensive at the end.

## Phase 2 — research

Gather context in ISOLATED child sessions so noisy work never floods the parent context.

- **Mandatory: use the `subagent` tool for research.** Spawn a `scout` agent to map relevant
  project files (entry points, data flow, risks) and a `researcher` agent for anything external
  (APIs, docs, tooling).
- Do NOT read large files inline during this phase. The parent should only ever see the distilled
  answers the subagents return — that is the entire point.
- When the request references a package/URL/external service, fetch its docs and verify any
  tooling claims the request depends on (e.g. "X supports Y") before trusting them.
- Write a compact `## research` section (bullet list of verified facts with sources). Mark
  `research` completed, `grill` in_progress.

**Why:** a 4k-line file read or a page fetch in the parent session burns context the rest of the
pipeline needs. Child sessions do the digging; you inherit only the answer.

## Phase 3 — grill

Surface the clarifying questions the spec cannot be written without.

- From the refined prompt + research, generate the questions where a wrong guess would derail the
  spec (scope boundaries, tech choices, acceptance criteria, ambiguity).
- Auto-answer every question you can from context/research. For the rest, ask the user in a
  numbered list at the end of your reply and WAIT for their answer — do not guess on decisions
  that materially change the spec.
- Record the Q&A under a `## grill Q&A` section. Mark `grill` completed, `compose` in_progress.

**Why:** asking the few questions whose answers change the shape of the work is cheaper than
building the wrong thing.

## Phase 4 — compose

Assemble refined prompt + research + Q&A into ONE implementation spec.

Use this exact structure:

```markdown
## spec
### Goal
### Scope (in / out)
### Implementation plan (ordered steps)
### Files to touch
### VERIFY
<the exact commands that prove this works — tests, build, or a manual check; must be runnable>
```

- Every explicit requirement from the user must map to a plan step. If a requirement has no step,
  the spec is incomplete — fix the spec.
- The VERIFY block is mandatory and must be real commands, not vibes ("run `npm test` and the
  specific test names", "build and start the dev server", etc.).
- Write the spec under `## spec` (append to TASK.md). Mark `compose` completed, `critique`
  in_progress.

**Why:** the spec is the contract. If the user can't read it and know what will happen, it isn't
done yet.

## Phase 5 — critique

Triple-check the spec with fresh eyes before any code is written.

- **Mandatory: spawn a `reviewer` subagent** (fresh context — not your own confirmation bias) to
  review the spec against the original request: missing requirements, wrong assumptions, unclear
  steps, unverifiable VERIFY blocks.
- If the reviewer finds real issues, rewrite the spec accordingly (you don't need another review
  round for small fixes). If the spec is clean, note it and move on.
- Mark `critique` completed, `implement` in_progress. Then either present the spec for user
  sign-off (recommended for large tasks) or proceed if the user asked for full autonomy.

**Why:** your own draft always looks fine to you. A separate context sees what you're blind to.

---

## Implementation

- Do the work per the spec, in order. Use the todo tool to track meaningful sub-steps if the
  implementation is large.
- Follow the spec exactly. If reality contradicts the spec (an API doesn't exist, a step is
  impossible), STOP and update the spec first — a spec that lies produces a lying implementation.
- This phase may be delegated to a `worker` subagent for implementation with `reviewer` after, or
  done inline — your call based on task size. Mark `implement` completed only when the code is
  written and the todo sub-steps are done.

## Phase 6 — verify (the gate that matters)

**The spec is not done until its VERIFY block actually passes.**

- Run the VERIFY block commands for real in the workspace. Observe the actual output.
- PASS → mark `verify` completed, move to enforce.
- FAIL → do NOT mark completed. Fix the implementation, re-run VERIFY, repeat until PASS or you
  have evidence the check itself is wrong (then fix the check, not the code, and re-verify).
- A task that doesn't build is indistinguishable from one that works unless you run the check.

## Phase 7 — enforce guidelines

Check the work against the project's written rules before calling it done.

- Read `AGENTS.md` / `CLAUDE.md` / `.pi/rules` etc. in the working directory (if present) and
  check the diff against them: naming, structure, conventions, forbidden patterns.
- Violations → fix in place. After fixing, re-run the VERIFY gate to prove the fix didn't
  regress. If a violation can't be cleared, report it explicitly to the user rather than
  silently proceeding.
- Mark `enforce` completed. Update TASK.md's spec status. Summarize for the user:
  what was built, what VERIFY proved, any guideline deviations.

---

## Multi-task mode (feature decomposition)

When the request is a whole feature ("/task-auto Implement PLAN.md", "make this app support X"):

1. Read the feature plan / ask 1-2 clarifying questions whose answers change how it decomposes.
2. Decompose into an ORDERED list of task titles — each task must be independently
   implementable and verifiable. Create todo items with `blockedBy` expressing the order
   (task N depends on task N-1).
3. Run the full pipeline (refine→…→enforce) for ONE task at a time, in order. Do not start the
   next task until the current one passes its VERIFY gate.
4. When a task's implementation is done and verified, mark it completed immediately; the next
   task's blockedBy is then satisfied and it can start.

**Why sequential?** Parallel features interleave context and break verification. One verified task
at a time produces a clean, reviewable history.

---

## Guardrails

- **Never mark a phase/task completed with failing verification** — keep it in_progress and
  create a blocker task describing what's wrong.
- **Timeouts on long-running commands**: always pass a `timeout` to bash for commands that could
  hang (builds, dev servers, installs). A hung command costs minutes; a timeout costs seconds.
- **Stuck/looping**: if you catch yourself repeating the same tool call or producing near-identical
  output, stop and re-read the spec — the failure is usually a wrong assumption upstream.
- **Context economy**: the only large content that belongs in the parent session is the TASK.md
  file and distilled subagent answers. Everything else stays in child sessions.
