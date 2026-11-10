# Vendored browser dependencies

This directory is served as `/vendor/` and copied unchanged into the static build. Browser dependencies used at runtime must be stored here; the app must not load runtime code from a CDN.

For every vendored dependency, include:

- the exact upstream package name and version
- the upstream project URL and the retrieval date
- its license text and required notices
- only the browser-ready files required by the app

Keep build-time tools (for example Vite and TypeScript) in the package manager lockfile; they are not browser runtime dependencies and do not belong here. Prefer native browser APIs and keep this directory empty of third-party code until a dependency is actually selected. Never copy a package without checking its license and transitive runtime requirements.
