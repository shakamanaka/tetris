# Contributing to Tetris

Thanks for helping improve Tetris. Small, focused pull requests are easiest to
review and keep the game stable across desktop platforms.

## Setup

Requirements are Node.js 20 or newer, npm 10 or newer, and Rust 1.77 or newer
with the Tauri prerequisites for your operating system.

```sh
npm ci
npm run dev
```

Use `npm run tauri:dev` when native window behavior needs to be tested.

## Before opening a pull request

Run the full local checks:

```sh
npm run format:check
npm run typecheck
npm test
npm run lint
npm run build
cargo fmt --manifest-path src-tauri/Cargo.toml --all -- --check
cargo check --manifest-path src-tauri/Cargo.toml
```

Changes to game rules, input timing, scoring, or persistence should include a
focused regression test. Changes to controls or user-visible behavior should
update `README.md`.

## Code organization

The game domain in `src/game/` is independent of the DOM and Tauri. Input,
rendering, audio, UI, and storage adapt that domain to the desktop application.
Keep `src/main.ts` responsible for wiring those pieces together rather than
implementing new feature logic there. See
[`docs/architecture.md`](docs/architecture.md) for the current flow.

## Pull requests

Describe the user-visible behavior first, then the implementation and checks
that support it. Include screenshots or a short recording for visual changes.
Keep unrelated formatting or generated files out of the pull request.

Use imperative commit subjects such as `fix: prevent duplicate hard drops` or
`docs: add contributor guide`.
