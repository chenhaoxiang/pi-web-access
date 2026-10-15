---
doc_type: runbook
project: workspace
component: pi-web-access
status: active
truth_mode: maintained
created: 2026-10-15
verified: 2026-10-15
verified_by: manual
owner: chx
---

# Fork maintenance, releases and installation

## Scope and source

The maintained repository is `chenhaoxiang/pi-web-access`; community source remains `nicobailon/pi-web-access`. The current fork version is **0.41.0-fork.1**, based on community **v0.41.0**, exact commit `d47dc040552505e3b135d0136a0b15eaf4bdba52`. The initial **0.40.0-fork.1** baseline was community v0.40.0 at `9861ad72a11c9af419b39f9b00860708407f7025`. The package keeps the community license and author attribution. GitHub Release distribution is separate from npm: never publish under the original author's npm identity.

The local trial history is in [search routing diagnostics](search-routing-diagnostics.md). Its 0.40.0-local.1 checks and stopped review are historical evidence, not approval or release evidence for a later fork commit.

## Branches and integration

- `origin` points to our fork; `main` is the canonical integration/release branch. All changes enter via PR, applicable CI and independent read-only review, then a regular merge. Main protection requires the exact `test (ubuntu-latest)` check, a current branch and resolved conversations; it does not invent a second human maintainer.
- `upstream` fetches only community main and has push URL `DISABLED`.
- `upstream-main` exactly mirrors community main and is not an install source. Push mirror advances only when they are fast-forwards; preserve and investigate divergence rather than force-pushing.
- Develop only in the owner-mandated external worktree root, under `<worktree-root>/pi-web-access/<task>`. The canonical source checkout remains on main and receives only verified safe fast-forwards.
- Each synchronization uses an explicit community tip, diff/semantic review and regression run. Do not use a GitHub one-click fork sync to overwrite our fixes.

## Community v0.41.0 synchronization

This update integrates the exact v0.41.0 tag, not a moving community tip. Community changes add `fetchContent.userAgent` for direct HTTP page fetching and limit the configured SearXNG loopback exemption to its original origin. An invalid User-Agent fails before a request or provider fallback; SearXNG redirects to another loopback address or port remain blocked. No local configuration is automatically changed.

The merge retains our private identity, compiled-release provenance and search reliability changes. Runtime dependencies are unchanged. Community tests add User-Agent and loopback/redirect coverage without removing existing assertions; fork routing and packaging regressions remain intact. Source validation is recorded below; exact-head independent review and CI remain PR evidence, while actual release/download/installation checks are recorded separately in GitHub Release notes and the owner-local receipt. Never infer a published or loaded version from this document alone.

## Retained fork behavior

1. Exa MCP recognizes valid empty results separately from unparseable payloads. Malformed responses use invalid-response diagnostics instead of claiming no provider or missing credentials.
2. Configured ordered routes continue on valid empty responses, retain the first empty result if none is useful, and do not hide authentication/cancellation failures.
3. Successful fallback in configured ordered routes (`searchRouting`) carries prior provider failures through model-visible output, programmatic data and stored retrieval, while the successful query keeps `error: null`. The legacy automatic chain retains its existing final-error behavior. `providerErrors[].error` is human-readable diagnostic text, not a stable machine-parsable classification field; parallel-provider errors retain their pre-existing format.
4. Exa → AnySearch is the suggested opt-in local route, not a silently changed global provider default. Explicit provider choices remain strict.
5. Browser-cookie access, hosted-fetch consent, model routing, API credentials and paid-provider opt-in boundaries are unchanged. The only SSRF adjustment in this synchronization is the community's configured-origin SearXNG loopback allowance described above; ordinary page fetches and cross-origin loopback redirects do not inherit it.

Nonempty results are not automatically relevant. No relevance score or model-based correctness verdict is fabricated. Known URLs should be fetched directly; a WeChat verification page is not evidence that every search provider is broken.

## Validation

Install development dependencies with `npm ci --ignore-scripts --legacy-peer-deps`. Use synthetic HOME and an external TMPDIR; the test suite uses local fake executables and disposable npm installs and must not discover the source package as their parent project. Existing tests and assertions remain intact.

Run:

```bash
npm run typecheck
npm test -- --test-concurrency=2
npm run build
npm run audit:runtime
```

Add focused routing/Exa/fork-maintenance tests before release. Record the exact head, command exit codes, CI runs and independent review. Tests, CI, artifact checks, SDK loading and real public-query smoke are different evidence layers. Do not call the release complete before its own checks pass.

## Immutable release assets

1. Merge reviewed source into main, then fetch/read back the exact remote merge SHA. Build in an isolated, tracked-clean checkout of that SHA; ignored dependency/build directories are allowed.
2. Run `npm run release -- --out <new-owner-tmp-directory>`. The packer refuses dirty tracked source, an existing output path, wrong repository/version metadata or a baseline outside history. It rebuilds bundles from that exact HEAD, rechecks source/HEAD stability, records each bundle hash and changes only the staged artifact manifest's Pi extension entry to `./dist`.
3. The output includes `pi-web-access-<version>.tgz`, `release-manifest.json` and `SHA256SUMS`. The manifest names repository, exact source commit, upstream commit/version and the package SHA-256. The source manifest remains private and uses `index.ts` for source installs; the tarball loads compiled code. The standalone binary embeds the same fork version at build time.
4. Verify/extract the candidate, install only runtime dependencies without lifecycle scripts or peer replacement, and smoke-load it using the actual Pi host. Publish to GitHub with immutable `v<version>` tag targeting that same main SHA. Never reuse a tag or replace an asset.
5. Download all published assets afresh and run `shasum -a 256 -c SHA256SUMS`; verify manifest identity/source and installed package bytes before selecting it. Release source/asset provenance does not by itself prove every transitive dependency or every active process.

The packer creates local files only; it does not push, publish, install, change settings or call a model. GitHub release operations require the current owner-authorized maintenance scope.

## Installation and rollback

After the matching GitHub Release/tag has actually been published, the reproducible source install is:

```bash
pi install git:github.com/chenhaoxiang/pi-web-access@v0.41.0-fork.1
```

`@main` is permitted only when deliberately following our moving integration branch. Never install `upstream-main` or the community npm package when fork behavior is required.

For a compiled install, prefer the verified GitHub Release tarball. Extract into a new permanent versioned directory, run `npm install --ignore-scripts --legacy-peer-deps --omit=dev` there (the running Pi host provides optional peers), audit the effective runtime and verify compiled extension loading. Select only the matching web-access package declaration, preserving unrelated settings and the ordered local route. Do not keep an active install under worktree/tmp staging.

Before selecting a version, preserve the prior package and matching settings/config fingerprints. Compare the current configuration again before updating to avoid concurrent-session overwrites. Rollback restores only the matching package declaration and any changed routing config, not the entire settings snapshot if unrelated values changed.

No active session is force-restarted or hot-reloaded. New sessions load the selected version; settled sessions may reload/restart separately. Distinguish installed selection from runtime evidence. Do not delete old source tips, trial packages, sessions, cache, artifacts or recovery data as part of this task.

## v0.41.0 source validation (2026-10-15)

On Node 26.9.0 / npm 11.19.1, with an empty synthetic HOME and external fixture TMPDIR:

- Pre-merge fork characterization/packaging baseline: **20/20** tests passed.
- Post-merge routing, Exa, packaging, User-Agent, SearXNG and SSRF/redirect tests: **127/127** passed.
- Full suite with two workers: **1,263/1,263** passed, with zero skipped or cancelled tests.
- `npm run typecheck`, `npm run build` and `npm run audit:runtime` passed; the runtime audit reported **0 vulnerabilities** at this verification time.
- The three updated runtime files and the two community test files match v0.41.0 exactly. Fork search/diagnostic implementation and its test files are unchanged from the prior reviewed main; existing community tests only gain additions, with no removed assertions.

These are source-level, provider-free results. They do not claim the later PR CI, independent review, GitHub Release, installed-package identity, fresh Pi-host loading or live public-network smoke has completed. Consult the exact PR, Release notes and installation receipt for those layers.

## Current acceptance boundary

The fork source/PR, exact CI and release/install receipt are recorded by the performing session and GitHub Release notes at their actual completion. This maintained document defines the contract, not a prospective PASS. The initial local trial passed 18 focused and 1,256 full tests, but its independent reviewer was stopped without output; those old results do not satisfy review for this fork head.
