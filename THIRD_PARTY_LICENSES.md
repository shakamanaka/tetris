# Third-Party Licenses

Tetris bundles the following third-party assets. Each asset is used in
compliance with the license terms described below.

## Background music

- **Track**: Starlight City (Loop version)
- **Author**: Zane Little Music
- **Original URL**: <https://opengameart.org/content/starlight-city-loop-included>
- **Author URL**: <https://opengameart.org/users/zane-little-music>
- **License**: Creative Commons CC0 1.0 Universal (public domain dedication)
- **License URL**: <https://creativecommons.org/publicdomain/zero/1.0/>
- **File included in this repository**: `src/assets/music.ogg`

The looped OGG version (Vorbis, 48 kHz stereo) was downloaded from
OpenGameArt.org and is redistributed here unchanged. Because the track is
dedicated to the public domain via CC0, it may be used, modified, and
redistributed for any purpose, including bundled within a commercial desktop
application, without requiring attribution. Attribution is nevertheless given
here as good practice.

## Software libraries

The Tetris application itself relies on the following open-source
dependencies; their licenses are not bundled but can be reviewed in each
project's repository:

| Library    | License          | URL                                       |
| ---------- | ---------------- | ----------------------------------------- |
| Tauri      | MIT / Apache-2.0 | <https://github.com/tauri-apps/tauri>     |
| Vite       | MIT              | <https://github.com/vitejs/vite>          |
| Vitest     | MIT              | <https://github.com/vitest-dev/vitest>    |
| TypeScript | Apache-2.0       | <https://github.com/microsoft/TypeScript> |

The UI uses a system monospace stack and does not fetch fonts or other runtime
assets from an external service.
