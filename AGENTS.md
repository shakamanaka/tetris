# Tetrix agent guide

## Project intent

Tetrix is a small offline desktop game built with Tauri, TypeScript, Vite, and
Canvas. Keep the game rules deterministic and keep browser or Tauri APIs at the
application boundary.

## Repository map

- `src/game/` contains the domain model and pure board, piece, bag, scoring,
  and game-state logic. Do not import DOM, audio, storage, or Tauri APIs here.
- `src/input/` contains keyboard and other input adapters.
- `src/render/` contains Canvas rendering only.
- `src/ui/` contains DOM screens and layout orchestration.
- `src/audio/` contains sound and music adapters.
- `src/storage/` contains persistence adapters and serialization validation.
- `src/main.ts` is the composition root. Keep feature logic out of it when a
  focused module can own the responsibility.
- `src-tauri/` contains the native shell and packaging configuration.

The boundary relationships and runtime flow are documented in
[`docs/architecture.md`](docs/architecture.md).

## Required checks

Run these commands before opening a pull request:

```sh
npm ci
npm run format:check
npm run typecheck
npm test
npm run lint
npm run build
cargo fmt --manifest-path src-tauri/Cargo.toml --all -- --check
cargo check --manifest-path src-tauri/Cargo.toml
```

Use `npm run tauri:dev` for a native development session and
`npm run tauri:build` to validate packaging on a supported operating system.

## Working rules

- Preserve unrelated user changes in a dirty worktree.
- Prefer small, focused modules and pure functions for game rules.
- Add a regression test when changing game state, input timing, scoring, or
  persistence behavior.
- Use `textContent` or DOM APIs for user-provided display values.
- Keep persisted data versioned and tolerant of malformed or older records.
- Update the README or the relevant document when behavior, controls, or build
  requirements change.
- Do not add network services, accounts, analytics, or cloud storage without a
  separate product decision.
