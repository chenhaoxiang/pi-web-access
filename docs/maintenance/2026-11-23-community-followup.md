---
doc_type: report
project: workspace
component: pi-web-access
status: active
truth_mode: maintained
created: 2026-11-23
verified: 2026-11-23
verified_by: manual
owner: chx
---

# 0.48.0-fork.3 community follow-up

## Scope

This candidate is based on maintained `origin/main` `b82ae6bf7bc78cb377ab4425e2085d61aa473752` and selectively integrates low-risk community fixes from upstream `nicobailon/pi-web-access` through the safe portion of the 14-commit follow-up:

- Chrome `Network/Cookies` path compatibility;
- default HTTP(S) proxy port preservation;
- fetch validation diagnostics;
- Exa search objective and Parallel objective forwarding;
- bounded Parallel excerpts;
- blank `web_search` model omission;
- answer-mode usage reporting;
- multi-query/multi-URL `get_search_content` retrieval without an index.

The upstream tip is not merged wholesale. Its large provider replacement commit would remove fork routing diagnostics, reseller/provider boundaries, fork release scripts, private package identity and maintenance documents. Those fork contracts remain excluded from this candidate.

## Validation

- `npm ci --ignore-scripts --legacy-peer-deps --no-audit --no-fund --allow-remote=all` — passed.
- `npm run typecheck` — passed.
- `npm run build` — passed.
- `npm test -- --test-concurrency=2` — **1741 passed, 0 failed, 0 skipped**.
- Provider-free fixtures and synthetic HTTP/cookie/proxy tests only; no paid provider calls or real credentials.

## Delivery boundary

Candidate version: `0.48.0-fork.3`. Source worktree is `sync/community-followup-0.48.0-20261123`. No PR, merge, Release or installation has yet been performed. Existing `0.48.0-fork.2` remains the rollback/install reference. The candidate must retain fork private package identity, Release provenance, SHA-256 assets, routing/privacy/SSRF safeguards and active-session reload boundaries.
