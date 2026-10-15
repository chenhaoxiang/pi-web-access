# Pi Web Access maintained fork

This repository is `chenhaoxiang/pi-web-access`; `nicobailon/pi-web-access` remains the community upstream. Read the fork maintenance contract before changing routing, release or installation behavior.

## Branch and release contract

- `main` is the reviewed integration/release branch. Use isolated topic worktrees, pull requests, passing CI and independent read-only review, then regular merge. Never directly push, force-push or delete main.
- `upstream-main` exactly mirrors community main. The `upstream` remote fetches only main and has push URL `DISABLED`. Refresh the mirror only by fast-forward; preserve divergent tips rather than overwriting them.
- Retain fork fixes when integrating upstream. First read upstream diffs and run applicable regressions; a clean merge is not proof of semantic compatibility.
- Versions use `<community-version>-fork.<revision>` with immutable v-prefixed tags. Every release includes a compiled installable tarball, exact-source provenance and SHA-256 checksums.
- The source package is private. Do not publish the upstream npm identity. `npm run release -- --out <new-directory>` builds the local release asset set only; upload reviewed exact-main assets through GitHub Releases separately.
- Preserve old installations and loaded active sessions. New package selection does not prove runtime hot-load; never force-restart unrelated sessions.

## Documentation map

- [Fork maintenance and installation](docs/maintenance/fork-maintenance.md): v0.41.0 synchronization baseline, retained fork behavior, dated release/local-installation acceptance and branch/CI/release/rollback contracts.
- [Search routing diagnostics](docs/maintenance/search-routing-diagnostics.md): runtime behavior, test coverage and the local trial history before the fork was created.
- [Simplified Chinese README](README.zh-CN.md): fork installation, capabilities, configuration and validation in Chinese.

## Validation

Use a synthetic HOME and an external fixture root under an owner-local `tmp/` directory. Do not put TMPDIR below this ESM package: fake executables can inherit its module mode and npm fixture installs can discover and modify the parent manifest. Keep existing tests unchanged. Run `npm run typecheck`, focused routing/Exa/fork tests, the full suite with two workers, `npm run build`, runtime dependency audit and packed/installed loading checks. Keep public-query smoke evidence separate from provider-free tests. No real provider credentials or paid model calls are needed for local tests.
