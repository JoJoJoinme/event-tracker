# Acceptance Tests

Use this file to define what must be true before a task is considered complete.

## General task acceptance

Every non-trivial task should report:

- Files inspected or changed
- Commands run
- Test/check output
- Known unvalidated parts
- Remaining risks

## Prototype acceptance

For P0:

- Static HTML/CSS/JS works locally.
- Mock data is clearly marked.
- No backend, login, database, or API keys.
- Interaction proves the intended flow.
- Real integration gaps are listed.

For P0-R:

- The hardest unknown is named.
- The test is minimal and falsifiable.
- Result is pass/fail, not a vague impression.

## Constraint acceptance

For hard limits, report:

```text
Current:
Limit:
Buffer:
Pass/Fail:
```

## Engineering review acceptance

Before a feasibility decision is accepted, the answer must include:

- Evidence inspected
- Architecture / data / config / render flow
- Extension seams
- License or policy constraints if relevant
- Test burden
- Failure modes
- Short-term path
- Medium-term path
- What not to do
- Confidence
- Smallest falsifying test
