---
doc_type: report
project: workspace
component: pi-web-access
status: active
truth_mode: maintained
created: 2026-10-21
verified: 2026-10-21
verified_by: manual
owner: chx
---

# 0.44.0-fork.1 community integration

## Exact scope

Integrate 9 community commits through `d0e323ac935e8753d11e1853b81c057e39dee4dc` (source version 0.44.0) into the maintained `main`; preserve previous release 0.42.0-fork.1 for rollback. Pure `upstream-main` remains a separate exact mirror. This document records source validation, not a pre-emptive release or installed-runtime claim.

The selected community main has package version 0.44.0; its latest GitHub Release was v0.43.0 when selected. This is explicitly a main-snapshot integration, not a claim that upstream published v0.44.0. Adds API gateways, credential stripping on cross-origin redirects, explicit-only Linkup, opt-in DeepSeek fetch, xAI endpoint/timeout, default-array routing fallback and complete short-page fetching. Retains Exa empty/invalid diagnostics, ordered-route providerErrors and strict explicit selection. Runtime audit found GHSA-5r4p-p66f-jhc7 in Hono 4.13.8; only that transitive lock entry is advanced to 4.13.13.

## Verification

Typecheck, build and all 1,423 tests passed with two workers. Runtime audit after the Hono update reports zero vulnerabilities. A first fixture run under the shared workspace resolved ancestor undici unexpectedly; the final provider-free run uses an external synthetic HOME/TMPDIR outside Git and node_modules ancestors. No existing test is removed or weakened.

Independent review and exact-head CI are bound to the synchronization PR. Release assets must be built from the exact remote merge commit, include a source manifest and SHA-256 checksums, then be freshly downloaded and verified before installation. GitHub Release notes record those later outcomes; do not infer them from this source report.

## Independent-review corrections

The first exact-head review found a new xAI full-endpoint userinfo leak through native Request errors, lost diagnostics at the configured-array-to-route boundary, and a DeepSeek inline-code normalization error. All three were reproduced with synthetic inputs and mocked fetch, then fixed: reject URL userinfo before request construction; prepend initial array failures to route diagnostics; protect equal-length complete backtick runs. Six added provider-free regressions cover raw/tool/stored diagnostics, code-span fidelity and both username/password URL forms. Existing tests remain unchanged. Final typecheck/build/audit pass, and all **1,429** tests pass with two workers. The original review and red logs remain PR evidence; the later delta review binds the fix commit.

## Installation boundary

The authorized rollout selects a new permanent versioned package directory only after artifact and provider-free host-loading checks. Preserve old packages and a settings backup; do not force-restart loaded parents, children or a shared broker. Disk selection does not prove existing sessions loaded the new code. Real credentials, paid queries/probes, provider settings and unrelated package declarations are not part of verification.
