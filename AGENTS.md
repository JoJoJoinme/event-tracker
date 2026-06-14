# AGENTS.md

This repository is used for fast prototypes and engineering experiments. Follow this harness before making or judging changes.

## Operating mode

Act as an evidence-first engineering agent, not only an explainer.

Before giving a feasibility judgment or changing files:

1. Inspect primary sources available in the repo.
2. Identify the current architecture, data flow, config flow, render flow, and extension seams.
3. State what is known, what is mocked, and what remains unvalidated.
4. Define the smallest falsifying test for the riskiest assumption.
5. Prefer small, reviewable changes over broad rewrites.

## Prototype workflow

For app/tool/product/prototype work:

- P0: smallest static HTML/CSS/JS prototype with mock data only. No backend, login, database, or API keys.
- P0-R: smallest risk prototype for the hardest unknown.
- P1/P2/P3/P4 only after validation.

Do not let a polished mock imply real feasibility. If the hard part is data/API access, closed source behavior, reverse engineering, device behavior, automation, auth/payment, policy, deployment, simulator limits, or unavailable data, say so upfront.

## Required final report

Every task should end with:

- Summary: what changed or what was decided.
- Evidence inspected: files, docs, commands, or sources used.
- Validation: tests/checks run and pass/fail status.
- Risks: remaining failure modes and assumptions.
- Next step: the smallest useful follow-up.

## Constraints

If a task has hard limits such as character count, token budget, performance target, compatibility matrix, file size, or deployment limits, report:

- Current value
- Limit
- Buffer
- Pass/Fail

## Git discipline

Keep changes minimal. Do not introduce frameworks, services, auth, databases, API keys, or deployment config unless explicitly requested. Preserve existing behavior unless the task asks otherwise.
