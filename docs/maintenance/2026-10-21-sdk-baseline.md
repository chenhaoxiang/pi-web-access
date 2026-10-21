---
doc_type: runbook
project: pi-web-access
status: active
truth_mode: maintained
created: 2026-10-21
verified: 2026-10-21
verification_scope: pinned SDK source, provider-free local validation and explicit delivery boundaries
owner: chx
---

# Pi 1.3 development SDK baseline

Development uses the verified immutable `v1.3.0-fork.1` SDK assets from `chenhaoxiang/pi` instead of registry 1.0.4. Direct URLs, transitive Pi overrides and integrity are locked in `package-lock.json`; local and CI installs use `npm ci --ignore-scripts`. The SDK stays in devDependencies, while runtime Pi packages remain optional host-provided peers. No SDK is bundled into the extension or standalone MCP runtime.

`test/sdk-baseline.test.mjs` checks exact declared, locked and installed versions, immutable asset sources and dev-only SDK placement. Existing runtime dependencies, provider selection, credentials, opt-ins and search/fetch behavior are unchanged.

Validation includes typecheck, the full provider-free suite with two workers, build, runtime dependency audit and source/packed extension loading in an isolated Pi 1.3 host. Synthetic HOME and an external fixture TMPDIR prevent discovery of real settings or mutation of the source manifest by fixture installs. No paid or real provider request is needed.

The change is source/development maintenance only: no package version bump, Release upload, installation selection or forced session reload. Exact review/head/CI results remain in the associated PR; existing releases and their provenance remain immutable.
