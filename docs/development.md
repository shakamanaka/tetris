# Development notes

## Frontend

```sh
npm ci
npm run dev
```

The browser development server is useful for gameplay changes. Native behavior
and packaging should be checked with:

```sh
npm run tauri:dev
npm run tauri:build
```

## Validation

```sh
npm run format:check
npm run typecheck
npm test
npm run lint
npm run build
cargo fmt --manifest-path src-tauri/Cargo.toml --all -- --check
cargo check --manifest-path src-tauri/Cargo.toml
```

## Persistence

Settings use `tetrix.settings.v1` and the local leaderboard uses
`tetrix.leaderboard.v1`. Both are local to the browser or Tauri WebView
profile. The leaderboard stores at most ten entries and normalizes nicknames
to twelve characters.

## Releases

Pushing a tag matching `v*` starts the GitHub Actions release workflow. It
builds unsigned Tauri bundles for Ubuntu, Windows, and macOS, then attaches the
artifacts to a GitHub release. Signing and notarization require repository
secrets and are intentionally left for the project owner to configure.
