# Tetris

A polished, classic block-stacking desktop arcade game built with **Tauri** and
**TypeScript**. Tetris runs as a native application on Windows, macOS, and
Linux without any external browser, plays fully offline once installed, and
ships with a procedurally synthesised sound-effect bank and a looped chiptune
soundtrack.

> **Unofficial fan project:** This repository is a simple independent copy
> inspired by the original Tetris game. It is not affiliated with, endorsed by,
> or licensed by the rights holders of the original game.

The rules and runtime boundaries are documented in
[`docs/architecture.md`](docs/architecture.md). Contributor and release
guidance is available in [`CONTRIBUTING.md`](CONTRIBUTING.md).

## Features

- 10x20 playfield with a 4-row hidden spawn buffer (standard SRS).
- All seven tetrominoes (I, O, T, S, Z, J, L) with distinct colours.
- **SRS-compliant rotation** with full wall-kick tables for the I piece and
  the JLSTZ group.
- **7-bag randomizer** for fair piece distribution.
- **Ghost piece**, **lock delay**, **soft drop**, **hard drop**, **DAS / ARR**
  for precise horizontal control.
- **Line clear** scoring with classic multipliers, persistent high score, level
  progression (+1 every 10 lines), and progressive gravity.
- **Local top-ten leaderboard** with a saved nickname and score, level, lines,
  and date for each completed game.
- **Game states** (`MENU`, `PLAYING`, `PAUSED`, `GAME_OVER`) explicitly enforced.
- Procedural **sound effects** generated via the Web Audio API and a **CC0
  chiptune soundtrack** bundled inside the application binary.
- **Music / SFX toggles and volume sliders** with preferences persisted across
  sessions.
- **Fixed-step game loop** that stays consistent at 60 / 120 / 144 / 165 Hz
  refresh rates.
- Full **keyboard control overlay**, retro arcade aesthetic, and a centred
  window that is resizable while keeping the playfield proportions intact.

## Controls

| Action                   | Key          |
| ------------------------ | ------------ |
| Move left                | `←`          |
| Move right               | `→`          |
| Soft drop                | `↓`          |
| Rotate clockwise         | `↑`          |
| Rotate counter-clockwise | `Z`          |
| Hard drop                | `Space`      |
| Pause / resume           | `Esc` or `P` |
| Restart                  | `R`          |

Hold-to-move uses a 170 ms DAS delay and a 55 ms ARR repeat rate, with soft
drop repeating every 50 ms. Horizontal movement stays immediate on a tap while
held movement gives more time to correct the position.

## Scoring

| Lines cleared | Base points |
| ------------- | ----------- |
| 1             | 100 × level |
| 2             | 300 × level |
| 3             | 500 × level |
| 4 (Tetris)    | 800 × level |

Soft drop awards 1 point per cell, hard drop awards 2 points per cell.
Every 10 lines bumps the level by 1 (up to level 20), and the gravity
interval follows the formula `1000 * 0.8^(level - 1)` ms clamped to a
minimum of 50 ms per row.

## Technology

| Layer          | Stack                                                         |
| -------------- | ------------------------------------------------------------- |
| Window / shell | Tauri 2 (WebKit / WebView2 / WebKitGTK depending on platform) |
| Native code    | Rust (Tauri runtime)                                          |
| UI / game      | Vanilla TypeScript + Vite (no frontend framework)             |
| Rendering      | HTML5 Canvas 2D                                               |
| Audio          | Web Audio API (SFX) + HTMLAudioElement (music)                |
| Persistence    | Validated localStorage adapter via the WebView                |
| Tests          | Vitest + jsdom                                                |
| Linting        | ESLint 9 + typescript-eslint                                  |
| Formatting     | Prettier                                                      |

The deliberate choice of vanilla TypeScript keeps the dependency surface tiny
and the frontend bundle small. The production build reports its current bundle
size during `pnpm run build`; native installer sizes vary by operating system.

## Project structure

```
.
├── src/                       # TypeScript frontend
│   ├── index.html
│   ├── main.ts                # Application entry / wiring
│   ├── styles.css             # Retro arcade styling
│   ├── assets/
│   │   └── music.ogg          # Bundled CC0 soundtrack
│   ├── audio/                 # SFX + music engines
│   ├── game/                  # Pure game logic (DOM-free)
│   │   ├── bag.ts             # 7-bag randomizer
│   │   ├── board.ts           # Collisions, ghost, line clears
│   │   ├── loop.ts            # Fixed-step rAF loop
│   │   ├── pieces.ts          # Tetromino shapes + SRS kicks
│   │   ├── scoring.ts         # Levels, gravity, points
│   │   ├── tetris.ts          # High-level game class
│   │   └── types.ts           # Shared type definitions
│   ├── input/                 # Keyboard input adapter
│   │   └── input-manager.ts   # Keyboard, DAS/ARR
│   ├── render/                # Canvas renderer
│   ├── storage/               # Validated local persistence
│   │   ├── leaderboard.ts
│   │   ├── local-storage.ts
│   │   └── persistence.ts
│   └── ui/                    # Screens, overlays, and responsive layout
├── src-tauri/                 # Tauri (Rust) shell
│   ├── src/                   # main.rs / lib.rs
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   ├── capabilities/          # Permission manifests
│   └── icons/                 # App icons (PNG / ICO / ICNS)
├── tests/                     # Vitest unit tests
│   ├── input.test.ts
│   ├── leaderboard.test.ts
│   ├── persistence.test.ts
│   └── tetris.test.ts
├── docs/                      # Architecture and development notes
├── scripts/                   # Utility scripts (icon generation)
├── package.json
├── tsconfig.json
├── vite.config.ts
├── eslint.config.js
├── THIRD_PARTY_LICENSES.md
├── LICENSE
└── README.md
```

## Requirements

- Node.js 24+.
- pnpm 11+ (the required version is pinned in `package.json`).
- Rust 1.77+ with the standard Tauri prerequisites for your platform. On
  macOS this means Xcode command-line tools; on Linux the WebKitGTK
  development packages; on Windows the WebView2 runtime plus the MSVC
  build tools.
- See the official Tauri prerequisites guide for the full list:
  <https://v2.tauri.app/start/prerequisites/>.

## Installation

```sh
pnpm install
```

This installs the JavaScript dependencies. Rust dependencies are resolved by
Cargo when you run a Tauri development or build command.

## Development

```sh
pnpm run tauri:dev
```

This launches Vite on <http://localhost:5173> and Tauri in development mode,
opening a native window pointing at it. HMR is provided by Vite; Rust changes
recompile automatically via the Tauri CLI.

If you only want to run the frontend in a regular browser for quick iteration
(not all features will work because of the bundled music asset path and the
Web Audio autoplay policy), use:

```sh
pnpm run dev
```

## Build

```sh
pnpm run tauri:build
```

This runs the production Vite build, compiles the Rust binary in release
mode, and produces platform-native installers and binaries inside
`src-tauri/target/release/bundle/`:

| Platform | Output                              |
| -------- | ----------------------------------- |
| Windows  | `.msi` and `.exe` (NSIS) installers |
| macOS    | `.app` bundle and `.dmg`            |
| Linux    | `.deb`, `.rpm`, and `.AppImage`     |

For a quicker Rust-only verification build, run:

```sh
pnpm exec tauri build --no-bundle
```

## Tests

```sh
pnpm test            # single run
pnpm run test:watch  # watch mode
```

The unit tests cover collisions (walls, floor, piece-on-piece), hard and soft
drop behavior, line clears, rotation including SRS wall kicks, the 7-bag
randomizer, scoring math, level progression, local leaderboard persistence,
the pause / resume state machine, and game-over detection.

## Lint, format, type-check

```sh
pnpm run lint        # ESLint
pnpm run format      # Prettier (write)
pnpm run format:check # Prettier validation
pnpm run typecheck   # tsc --noEmit
```

## Music and credits

The bundled background track is "Starlight City" by Zane Little Music,
released to the public domain via CC0. See [`THIRD_PARTY_LICENSES.md`](./THIRD_PARTY_LICENSES.md)
for full attribution and license details.

Sound effects (move, rotate, soft drop, hard drop, line clear, Tetris, menu
click, game over) are synthesised at runtime via the Web Audio API and require
no external assets.

## Releases

Every tag matching `v*` starts the GitHub Actions release workflow. It builds
unsigned Tauri bundles for Ubuntu, Windows, and macOS and attaches them to a
GitHub release. Signing and notarization can be added later with repository
secrets; see [`docs/development.md`](docs/development.md).

## License

The Tetris source code is released under the MIT License. See [`LICENSE`](./LICENSE)
for the full text.
