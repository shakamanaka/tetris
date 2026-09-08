# Third-Party Licenses

Tetrix bundles the following third-party assets. Each asset is used in
compliance with the license terms described below.

## Background music

* **Track**: Starlight City (Loop version)
* **Author**: Zane Little Music
* **Original URL**: <https://opengameart.org/content/starlight-city-loop-included>
* **Author URL**: <https://opengameart.org/users/zane-little-music>
* **License**: Creative Commons CC0 1.0 Universal (public domain dedication)
* **License URL**: <https://creativecommons.org/publicdomain/zero/1.0/>
* **File included in this repository**: `src/assets/music.ogg`

The looped OGG version (Vorbis, 48 kHz stereo) was downloaded from
OpenGameArt.org and is redistributed here unchanged. Because the track is
dedicated to the public domain via CC0, it may be used, modified, and
redistributed for any purpose, including bundled within a commercial desktop
application, without requiring attribution. Attribution is nevertheless given
here as good practice.

## Software libraries

The Tetrix application itself relies on the following open-source
dependencies; their licenses are not bundled but can be reviewed in each
project's repository:

| Library | License | URL |
| --- | --- | --- |
| Tauri | MIT / Apache-2.0 | <https://github.com/tauri-apps/tauri> |
| Tauri plugin store | MIT / Apache-2.0 | <https://github.com/tauri-apps/plugins-workspace> |
| Vite | MIT | <https://github.com/vitejs/vite> |
| Vitest | MIT | <https://github.com/vitest-dev/vitest> |
| TypeScript | Apache-2.0 | <https://github.com/microsoft/TypeScript> |

The game font (Press Start 2P) is loaded at runtime from Google Fonts and is
licensed under the SIL Open Font License 1.1; if the network font cannot be
fetched the UI falls back to a generic monospace stack.