# Role Package and Evidence Ledger

Read this reference when compiling a candidate role model into an artifact, maintaining the
evidence ledger, or designing its evaluation suite.

## Evidence Ledger

Store one row per atomic claim. JSONL, a table, or a database is acceptable as long as every claim
remains traceable.

| Field | Meaning |
| --- | --- |
| `claim_id` | Stable identifier. |
| `claim` | A single falsifiable or reviewable proposition. |
| `code` | `mission`, `responsibility`, `activity`, `competency`, `knowledge`, `know-how`, `decision-rule`, `metric`, `tool`, `risk`, `boundary`, `handoff`, or `context`. |
| `source` | Title, publisher/author, URL or local path, and retrieval date. |
| `source_type` | Theory, occupation, job-market, practitioner, case/artifact, or negative evidence. |
| `support` | Short paraphrase plus a precise locator or compliant excerpt. |
| `role_context` | Industry, geography, company size/stage, seniority, and operating model when known. |
| `status` | Supporting, conflicting, contextual, superseded, or needs verification. |
| `related_claims` | Duplicates, synonyms, parent category, or contradictions. |
| `confidence` | E0–E5, with a short reason. |
| `next_question` | What would reduce material uncertainty, if any. |

### Confidence scale

| Level | Meaning | Use in the package |
| --- | --- | --- |
| E0 | Model prior only; no inspected evidence. | Never present as a verified rule. |
| E1 | One weak, indirect, or unverified source. | Research lead only. |
| E2 | Several weak sources or one credible but narrow source. | Tentative contextual hypothesis. |
| E3 | Multiple independent credible sources converge. | Candidate practice, with stated scope. |
| E4 | Authoritative theory/standard plus credible market or case evidence. | Strong default where context matches. |
| E5 | Cross-source convergence including practitioner or artifact evidence, with no unresolved material conflict. | High-confidence operating rule, subject to organizational authority. |

Frequency is evidence of prevalence, not importance or universality. Weight source independence,
quality, contextual fit, and contradictory evidence before assigning confidence.

## Role Package

Use this structure; omit a section only when it is genuinely inapplicable and explain why.

```yaml
role:
  name: ""
  version: ""
  role_contract:
    business_goal: ""
    users_or_internal_customers: []
    organization_context: ""
    role_level: ""
    assumptions: []
  mission: ""
  scope:
    owns: []
    influences: []
    excludes: []
  responsibilities:
    - outcome: ""
      measures: []
      evidence_claim_ids: []
  authority:
    recommend: []
    decide: []
    execute_with_approval: []
    prohibited: []
  capabilities:
    knowledge: []
    skills: []
    competencies: []
    know_how: []
  decision_model:
    principles: []
    rules:
      - when: ""
        assess: []
        decide_or_recommend: ""
        exceptions_and_escalation: ""
        evidence_claim_ids: []
  collaboration:
    reports_to: ""
    collaborators: []
    inputs: []
    outputs: []
    handoffs:
      - trigger: ""
        recipient: ""
        payload: []
  operating_requirements:
    tools:
      required: []
      optional: []
      restrictions: []
    skills:
      required: []
      optional: []
    memory:
      persistent_context: []
      prohibited_retention: []
  guardrails:
    risks: []
    compliance_constraints: []
    human_approval_points: []
  evidence_summary:
    coverage: ""
    saturation_rationale: ""
    unresolved_conflicts: []
    low_confidence_assumptions: []
  evaluation:
    success_metrics: []
    failure_modes: []
    test_cases: []
```

## Agent Skill compilation checklist

The resulting target skill should:

1. Lead with the role mission, scope, decision posture, and explicit exclusions.
2. Describe the operating sequence and only the knowledge needed at runtime; retain detailed
   research in the ledger and package rather than duplicating it in the prompt.
3. Explain when to use tools, when to ask a human, and when to hand off to another role.
4. Distinguish recommendations from authorized actions.
5. Link decisions or hard rules back to package claim IDs where traceability matters.

Before delivery, run this compact quality check:

- The claim taxonomy has canonical names, with synonyms and duplicates merged or linked.
- Each material responsibility has a decision, boundary, evidence, and—when relevant—an output or
  handoff; missing elements are explicit gaps, not silently omitted.
- Coverage includes the source types and contexts that materially affect the Role Contract, plus
  credible counterexamples where the role has meaningful variants.
- Detailed research has not obscured the role's business goal or widened the scope without user
  approval. Deferred findings are separated from the deployable package.

## Evaluation suite

Use three to five scenarios tailored to the role:

1. A typical high-value request that exercises the role's central decision model.
2. A contextual variant that should change the recommendation rather than receive a generic answer.
3. A boundary request that must be handed off, rejected, or sent for human approval.
4. A low-confidence or conflicting-evidence request that should state uncertainty and trigger
   targeted research rather than inventing a rule.
5. An end-to-end collaboration scenario that validates inputs, outputs, and handoff payloads.

For each test, define observable passing behavior and failure signals. Check especially for scope
creep, generic persona prose, unsupported universal claims, hidden authority escalation, and missing
handoffs.
