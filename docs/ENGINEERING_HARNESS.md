# Engineering Harness

This document defines the repo-level operating contract for ChatGPT, Codex, and local agents.

## Goal

Make every non-trivial engineering answer or change follow a closed loop:

1. Evidence
2. Architecture model
3. Feasibility split
4. Decision
5. Validation

## Required review structure

For technical/product feasibility questions, produce:

- **Evidence inspected**: repo files, official docs, issues, PRs, changelog, examples, command output.
- **Architecture / flow**: entry points, modules, data flow, config flow, render flow, extension seams.
- **Feasibility split**:
  - Demo feasible: can be shown as a mock or local prototype.
  - Engineering feasible: real implementation path exists and can be validated.
  - Product feasible: can be maintained, tested, deployed, and supported.
- **Decision**:
  - Do now
  - Do later
  - Do not do
- **Risks**: failure modes, hidden costs, unsupported dependencies, policy/device/API/deployment constraints.
- **Smallest falsifying test**: the cheapest test that could prove the path wrong.
- **Confidence**: High / Medium / Low, with reason.

## Prototype risk gate

Before building a prototype, answer:

1. What can P0 show now?
2. What is mocked or faked?
3. What must be validated before the real product works?
4. What is the riskiest assumption?
5. What is the smallest falsifying test?

Risk levels:

- **Green**: UI, workflow, local state, mock data. Build P0.
- **Yellow**: public API, import/export, automation, deployment, third-party data. Build P0 but mark mocks and validations.
- **Red**: closed source behavior, undocumented API, reverse engineering, anti-automation, device behavior, signing, account limits, unclear official support. Do P0-R first.

## Hard constraint check

For tasks with hard limits, never estimate only. Report exact or measured values when possible:

- Current
- Limit
- Buffer
- Pass/Fail

Examples: character count, file size, performance, API quota, deployment limit, browser support, SDK version, test coverage.

## Done means

A task is not done until the response includes validation evidence or explicitly says validation was not possible.
