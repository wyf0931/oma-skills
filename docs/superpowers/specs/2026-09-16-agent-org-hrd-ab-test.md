# Agent Organization Director HRD Skill A/B Test

## Objective

Test whether `evidence-role-distillation` produces a stronger HR Director skill than a direct
one-shot LLM request for an agent-native internet content studio.

The studio produces text-and-image content for Xiaohongshu, WeChat Official Accounts, and Zhihu.
All team members are agents. The target HR Director is therefore an **Agent Organization Director**:
it helps the CEO design capability coverage, role boundaries, collaboration, permissions, memory,
and quality evaluation. Human payroll, headcount, labor relations, and employment-law operations are
out of scope.

## Fair comparison

Both arms use the same model and identical Role Contract.

| Arm | Inputs | Deliverable |
| --- | --- | --- |
| A — direct | Role Contract only | One-shot HRD skill |
| B — distilled | Role Contract plus evidence acquired under `evidence-role-distillation` | Evidence ledger, Role Package, and derived HRD skill |

The deliverables will be anonymized before assessment. Artifact length, citations, and elaborate
formatting are not scoring dimensions by themselves.

## Role Contract

- **Business goal:** build an agent team that reliably creates, packages, and delivers high-quality
  multi-platform text-and-image content.
- **Target role:** HR Director / Agent Organization Director, partnering with the CEO.
- **Owns:** capability architecture, role design, responsibility and authority boundaries,
  collaboration contracts, tool/skill/memory requirements, organizational diagnostics, and role
  evaluation design.
- **Does not own:** editorial strategy itself, final content approval, publishing, platform-account
  actions, legal guidance, or human-employment activities.
- **Operating constraint:** prioritize capability clarity, quality, traceability, and safe
  coordination; do not use human salary or headcount as decision variables.

## Evidence plan for Arm B

1. HR / organization-design theory and occupation models.
2. Content-studio and multi-platform editorial operating models.
3. Agent-system design: tool boundaries, handoffs, context, and evaluation.
4. Failure modes and counterexamples: coordination overhead, duplicated ownership, quality drift,
   and unsafe authority.

Findings are coded into a ledger, compared, and sampled further only where an uncertainty would
change the role package. The user sees the candidate capability tree before final compilation.

## Downstream test suite

Each anonymized HRD skill receives the same five tasks:

1. Propose a 90-day agent-organization blueprint for the studio.
2. Define collaboration for one idea becoming Xiaohongshu, WeChat, and Zhihu deliverables.
3. Diagnose duplicated work and missed quality ownership after the studio starts operating.
4. Respond when the CEO asks the HRD to publish content directly or make an unsupported policy
   decision.
5. Redesign the organization when a new platform and short-video-plus-image content format arrive.

## Blind rubric

Score each dimension from 0–4 using observable evidence in the response:

| Dimension | What a 4 demonstrates |
| --- | --- |
| Business alignment | Converts the studio goal into role outcomes and operating priorities. |
| Capability architecture | Covers essential capabilities without duplicating roles or assuming human constraints. |
| Boundaries and authority | Separates ownership, influence, prohibited actions, and escalation paths. |
| Collaboration design | Defines concrete inputs, outputs, handoffs, context/memory, and coordination controls. |
| Decision quality | Supplies conditional rules and tradeoffs rather than generic role lists. |
| Tooling and evaluation | Maps tools/skills/permissions and quality measures to responsibilities. |
| Adaptation and safety | Responds to change, uncertainty, failure modes, and out-of-scope requests appropriately. |

The evaluator receives only artifacts labeled `Artifact A` and `Artifact B`, plus their responses to
the five tasks. It records evidence for each score, notes failure modes, and names a winner only if
the quality difference is material.

## Completion conditions

- Both skills and Arm B's evidence/Role Package are saved in an isolated experiment workspace.
- The candidate Role Package has been presented for user Keep / Remove / Merge / Delegate shaping.
- Downstream outputs are blind-reviewed against the rubric.
- The result reports scores, qualitative differences, tradeoffs, and limitations rather than merely
  declaring a winner.
