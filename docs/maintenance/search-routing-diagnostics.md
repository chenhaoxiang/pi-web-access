---
doc_type: runbook
project: workspace
component: pi-web-access
status: active
truth_mode: maintained
created: 2026-10-15
verified: 2026-10-15
verified_by: manual
updated: 2026-10-15
owner: chx
---

# Local search routing and diagnostics

## Problem and scope

With keyless Exa MCP, an unrecognized successful HTTP payload previously returned null. Automatic search could then report "No search provider available", while configured routing classified "Exa search returned no results" as unknown and never reached its backup. A valid JSON `results: []` was indistinguishable from that parser failure. The original live incident is not proven to have followed this path; synthetic regression tests reproduce the defect independently.

This local patch is based on upstream v0.40.0, commit `9861ad72a11c9af419b39f9b00860708407f7025`. It reuses the community automatic-empty improvements introduced after the previously installed v0.38.0. There is no public fork, upstream PR, npm publication, or claim of shared Git closure.

## Behavior

- Default ordered route: Exa, then AnySearch. Do not set top-level `provider` or `searchProvider`: either overrides the ordered route.
- Eligible fallback categories: transient, quota, network, invalid-response and unsupported. Authentication, credential/config errors and cancellation remain strict.
- A valid Exa JSON empty array or exact `No results found` text is a successful empty search. Configured routing tries its next provider and keeps the first valid empty response if none has useful content.
- Unrecognized Exa content is an invalid response, not proof of no matching pages or missing credentials.
- Successful fallback retains prior failures as optional per-query `providerErrors` in programmatic results, model-visible output and stored search retrieval. The successful query itself keeps `error: null`.
- A nonempty provider response is not a relevance guarantee. No model-based relevance filter is added, and source URLs/snippets remain available for verification. Known WeChat URLs should be read directly; browser verification challenges are not search-provider failures.

```json
{
  "searchRouting": {
    "providers": ["exa", "anysearch"],
    "fallbackOn": ["transient", "quota", "network", "invalid-response", "unsupported"]
  }
}
```

This configuration does not configure API keys, invoke paid providers, enable browser-cookie extraction, relax SSRF validation, or enable third-party hosted page-fetch fallbacks.

## Validation and installation boundaries

`test/search-routing-diagnostics.test.mjs` contains characterization pins and regressions for normal/explicit requests, valid empty responses, malformed payloads, ordered fallback, route exhaustion, diagnostics preservation, authentication and cancellation. Tests mock network calls and use a synthetic HOME. Existing tests and their assertions are unchanged. Full source tests, typecheck, build, package loading, runtime audit and real public-query smoke results must be recorded separately in the local installation receipt.

The local installation uses a version-labelled, side-by-side package snapshot, not the mutable worktree. Record the upstream base, patch hash, packed artifact hash and installed declaration in the owner-local receipt. Retain the previous package tree and compare current settings before changing only its web-access entry. Do not copy personal settings, credentials or test fixture paths into this public-source candidate.

A disk selection is not proof that an existing Pi process loaded it. Fresh-process acceptance is separate; settled sessions can reload later without stopping other sessions. Rollback restores only the matching package declaration and previous routing configuration, preserving unrelated settings.

## 2026-10-15 local acceptance

- Source implementation commit: `609f86e9c926c1d57faf66744fab5e1dddbe6dfc`; all existing test assertions were retained.
- Eighteen focused pin/regression cases and the full 1,256-test suite passed. Typecheck and bundle build passed. Source and installed runtime dependency audits each reported zero findings at the verification time.
- The side-by-side package is labelled `0.40.0-local.1` and `private: true`; only packaging metadata differs from the committed source. Its SHA-256 is `6c9cf2d323e211e875c2df401e35deb98ac5fa3c0b7c2d081647910757c058d1`. All 102 packed files matched their installed bytes.
- Pi `1.2.0-fork.1` loaded the selected extension in a fresh SDK process without loader errors. With the actual local route, a simulated Exa HTTP 503 reached AnySearch; a real public query returned three results through Exa. Simulated fallback is not a real Exa outage acceptance, and one public query is not long-term quality/reliability evidence.
- The previous `0.38.0` package tree was retained. Local settings select the new package for reload/new sessions; no active session was stopped or forced to reload. Browser-cookie, SSRF and hosted-fetch defaults were not relaxed.
- Independent review did not complete: the native read-only reviewer stalled without a result and was stopped. Do not describe this local trial as independently reviewed, publicly released or shared-main delivery. There is no remote fork/PR/merge for this candidate; source and owner-local receipts remain available for follow-up review.
