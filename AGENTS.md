# Local maintenance boundary

This checkout holds a local search reliability patch based on community `nicobailon/pi-web-access` v0.40.0 (`9861ad72a11c9af419b39f9b00860708407f7025`). It is not a published fork or an upstream release. The community remote is read-only. Do not publish the community npm identity, overwrite existing installations, or force-restart active Pi sessions.

## Documentation map

- [Search routing and diagnostics](docs/maintenance/search-routing-diagnostics.md): Exa/AnySearch order, empty/error semantics, regression evidence and local installation boundaries.

## Validation

Use synthetic HOME and an external fixture root under the agent `tmp/` directory. Do not put TMPDIR below this package: fake executables can inherit its ESM mode and npm fixture installs can discover and modify the parent manifest. Keep existing tests unchanged. Run `npm run typecheck`, the focused routing/Exa tests, the full test suite with two workers, and `npm run build`; record runtime dependency audit separately.
