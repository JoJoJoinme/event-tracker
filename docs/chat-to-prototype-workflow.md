# Chat-to-Prototype Workflow v2

This workflow is the default path for turning an idea discussed in ChatGPT into a small clickable prototype, then gradually upgrading it into a deployable Vercel demo when the interaction has been validated.

The goal is not to build a production system first. The goal is to shorten the loop from idea to usable interaction.

## Core principle

Start with the smallest static clickable prototype. Upgrade only after the interaction is accepted.

```text
Idea
→ P0 htmlpreview prototype
→ P1 structured static app
→ P2 Vercel Preview demo
→ P3 Vercel API demo
→ P4 production-ish app
```

The ChatGPT conversation remains the primary operating surface. GitHub stores the source and history. htmlpreview validates the first static interaction. Vercel provides stable preview deployments, runtime logs, and a deploy-side debugging loop.

## Default repository convention

Use the public repository:

```text
JoJoJoinme/event-tracker
```

Place prototypes under:

```text
prototypes/<prototype-name>/
```

Every prototype should include:

```text
README.md
prototype.json
```

## P0: htmlpreview prototype

### Purpose

Create the fastest possible clickable version of an idea.

### Use when the user says

```text
see it now
try it
make it runnable
turn it into an app
先做个能点的
先看效果
先做原型
```

### Default output

```text
prototypes/<prototype-name>/
  index.html
  README.md
  prototype.json
```

### Constraints

- Use plain HTML, CSS, and JavaScript by default.
- Use mock data.
- Avoid backend, login, database, API keys, Vercel, Cloudflare, and deployment configuration.
- Do not block on real integrations.
- The first success criterion is that the user can click through the core interaction.

### Delivery

Return:

```text
GitHub file link
htmlpreview link
```

## P1: structured static app

### Purpose

Turn an accepted P0 into a maintainable static app while preserving the validated interaction.

### Default output

```text
prototypes/<prototype-name>/
  package.json
  index.html
  src/
    main.js
    styles.css
    data/
    components/
  scripts/
    smoke-test.js
  README.md
  prototype.json
```

### Requirements

- Keep the P0 interaction intact.
- Split UI, data, and styles.
- Add basic scripts.
- Keep mock mode as the default.
- Prepare for Vercel, but do not require real APIs yet.

### Default scripts

```json
{
  "scripts": {
    "dev": "vite --host 0.0.0.0",
    "build": "vite build",
    "preview": "vite preview --host 0.0.0.0",
    "smoke": "node scripts/smoke-test.js",
    "test": "npm run smoke"
  }
}
```

## P2: Vercel Preview demo

### Purpose

Create a stable online preview that can be shared, tested, debugged, and iterated.

### Use when the user says

```text
upgrade to Vercel
make it a stable demo
I want a stable link
让它能长期访问
升级到 Vercel
```

### Default additions

```text
vercel.json
scripts/smoke-test.js
debug panel
Vercel Preview deployment
```

### Requirements

- Use Vercel Preview by default, not production-first deployment.
- Add a debug panel available through `?debug=1`.
- Keep mock mode working even when API mode is added later.
- Return the Vercel Preview URL after deployment.

## P3: Vercel API demo

### Purpose

Add lightweight backend capability while keeping the prototype debuggable.

### Default output

```text
prototypes/<prototype-name>/
  package.json
  index.html
  src/
  api/
    generate.js
    save.js
    status.js
  scripts/
    smoke-test.js
  README.md
  prototype.json
  vercel.json
```

### Requirements

- API keys must be kept in Vercel environment variables, not frontend code.
- API responses must include `requestId`.
- Server-side logs must include the same `requestId`.
- Support `mock` and `api` modes.
- Frontend errors should be visible in the debug panel.

### API response format

Success:

```json
{
  "ok": true,
  "requestId": "req_20260613_xxxx",
  "data": {}
}
```

Failure:

```json
{
  "ok": false,
  "requestId": "req_20260613_xxxx",
  "error": {
    "code": "WATCHFACE_PARSE_FAILED",
    "message": "Unable to parse watchface settings"
  }
}
```

### Logging convention

```js
console.error({
  requestId,
  event: "WATCHFACE_PARSE_FAILED",
  inputSummary,
  error: String(error)
});
```

## P4: production-ish app

### Purpose

Only after the demo has been validated, upgrade the prototype into a longer-lived app.

### Possible additions

```text
database
authentication
permissions
queues
cron jobs
persistent storage
monitoring
custom domain
rate limiting
```

Do not jump to P4 before the interaction and use case are validated.

## prototype.json convention

Every prototype should have a `prototype.json` file.

P0 example:

```json
{
  "name": "garmin-watchface-preview",
  "stage": "P0-htmlpreview",
  "status": "interaction-draft",
  "runtime": "static",
  "entry": "index.html",
  "repository": "JoJoJoinme/event-tracker",
  "path": "prototypes/garmin-watchface-preview",
  "preview": {
    "htmlpreview": "",
    "vercelPreview": "",
    "vercelProduction": ""
  },
  "modes": ["mock"],
  "assumptions": [
    "External integrations are mocked",
    "Data is static",
    "No login, database, or API key is required"
  ],
  "nextSteps": [
    "Validate interaction",
    "Upgrade to P1 if accepted",
    "Deploy to Vercel Preview if stable sharing is needed"
  ]
}
```

P2 example:

```json
{
  "name": "garmin-watchface-preview",
  "stage": "P2-vercel-preview",
  "status": "preview-deployed",
  "runtime": "vercel",
  "entry": "src/main.js",
  "repository": "JoJoJoinme/event-tracker",
  "path": "prototypes/garmin-watchface-preview",
  "preview": {
    "htmlpreview": "",
    "vercelPreview": "https://example.vercel.app",
    "vercelProduction": ""
  },
  "modes": ["mock", "api"],
  "debug": {
    "enabled": true,
    "query": "?debug=1"
  }
}
```

## Debug panel convention

From P2 onward, support:

```text
?debug=1
```

The debug panel should show:

```text
Prototype name
Version
Stage
Git commit if available
Runtime mode: mock / api
Current route
Current selected state
Last API request
Last API response
Last error
Request ID
Feature flags
```

## mock/api mode convention

Vercel prototypes should keep mock mode working.

Recommended query parameters:

```text
?mode=mock
?mode=api
?debug=1
```

Recommended environment variables:

```text
VITE_DATA_MODE=mock
VITE_ENABLE_REAL_API=false
```

Debug rule:

```text
mock works, api fails  → backend/API problem
mock fails             → frontend/UI/state problem
```

## Vercel debugging loop

When a Vercel prototype has a problem, use this order:

```text
1. Check the debug panel.
2. Confirm whether mock mode works.
3. Check build logs.
4. Check runtime logs.
5. Use requestId to locate API errors.
6. Fix the code.
7. Run build and smoke scripts.
8. Redeploy Preview.
9. Return the new Preview URL.
```

## When to use Codex

The ChatGPT + GitHub + Vercel loop is enough for:

```text
small UI changes
copy and layout iterations
mock data changes
simple API endpoints
build errors
runtime log debugging
small refactors
```

Use Codex or a local IDE for:

```text
large multi-file refactors
complex state management
real external API integrations
Playwright end-to-end tests
long debugging sessions
large test suites
production hardening
```

## Default technology choices

| Stage | Default technology |
|---|---|
| P0 | Plain HTML/CSS/JS |
| P1 | Vite + plain JS or light React |
| P2 | Vercel Preview |
| P3 | Vercel Functions |
| P4 | Decide case by case |

Avoid early use of:

```text
Next.js
database
login
Docker
monorepo
Cloudflare
complex UI frameworks
```

Use them only when the prototype has earned the complexity.

## Acceptance rule

Do not let infrastructure complexity kill a fragile idea.

A prototype can advance stages only when the previous stage has validated something concrete:

```text
P0 validates interaction.
P1 validates maintainability.
P2 validates stable sharing and deployability.
P3 validates real capability.
P4 validates repeated usage.
```
