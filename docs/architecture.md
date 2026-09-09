# Architecture

Tetris uses a small layered design. The rules are kept independent from the
desktop shell so they can be tested without a native window.

```text
                 +----------------------+
                 |      src/main.ts     |
                 | composition root     |
                 +----------+-----------+
                            |
        +-------------------+-------------------+
        |                   |                   |
  input adapter       UI / renderer        audio / storage
   src/input/        src/ui, src/render/      adapters
        |                   |                   |
        +-------------------+-------------------+
                            |
                 +----------v-----------+
                 |      src/game/       |
                 | deterministic rules  |
                 +----------------------+
```

## Domain

`src/game/` owns the board, pieces, randomizer, scoring, timing settings, and
game state. Its public operations are ordinary TypeScript methods and pure
helpers. Domain tests run in Vitest without a browser or Tauri.

## Adapters

- `src/input/` turns keyboard events into domain actions. Held-key repeat is
  advanced by the main fixed-step loop.
- `src/render/` draws snapshots onto Canvas and does not mutate game state.
- `src/ui/` owns DOM overlays, settings controls, responsive layout, and
  leaderboard presentation.
- `src/audio/` wraps Web Audio and HTML audio APIs.
- `src/storage/` serializes settings and leaderboard records through a small
  localStorage adapter. Records are validated when loaded.

## Runtime flow

1. `main.ts` creates the game and adapters.
2. The fixed loop advances input repeat and then advances the game by 16 ms.
3. The renderer and HUD consume a game snapshot each animation frame.
4. Game events drive sound and screen transitions.
5. Settings and completed scores are persisted locally in the WebView profile.

## Intentional limits

This is a small offline game, so it does not introduce a dependency injection
container, event bus, database, or remote service. If the application grows,
the next useful extraction is a game-session use case that coordinates domain
commands and persistence without expanding `main.ts`.
