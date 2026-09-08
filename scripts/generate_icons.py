"""Generate Tauri app icons from scratch.

Creates simple PNG / ICO / ICNS placeholders with a Tetris-themed look so
Tauri can bundle the application. The generated images are functional
placeholders; the visual design is intentionally generic.
"""

from __future__ import annotations

import os
import struct
import zlib
from pathlib import Path

from PIL import Image

OUT = Path(__file__).resolve().parent.parent / "src-tauri" / "icons"
OUT.mkdir(parents=True, exist_ok=True)


def render_icon(size: int) -> Image.Image:
    """Render a square icon at the given size."""
    img = Image.new("RGBA", (size, size), (11, 10, 20, 255))
    px = img.load()

    cell = max(1, size // 8)
    board_origin_x = (size - cell * 6) // 2
    board_origin_y = (size - cell * 6) // 2

    blocks = [
        (0, 0, (0, 240, 240)),
        (1, 0, (0, 240, 240)),
        (2, 0, (0, 240, 240)),
        (3, 0, (0, 240, 240)),
        (1, 1, (240, 240, 0)),
        (2, 1, (240, 240, 0)),
        (1, 2, (160, 0, 240)),
        (3, 1, (0, 240, 0)),
        (4, 1, (0, 240, 0)),
        (4, 2, (240, 0, 0)),
        (5, 2, (240, 0, 0)),
        (3, 3, (240, 0, 0)),
        (4, 4, (240, 160, 0)),
        (5, 4, (240, 160, 0)),
        (0, 5, (240, 160, 0)),
        (1, 5, (240, 160, 0)),
    ]

    for bx, by, (r, g, b) in blocks:
        x0 = board_origin_x + bx * cell
        y0 = board_origin_y + by * cell
        for x in range(x0, x0 + cell):
            for y in range(y0, y0 + cell):
                if 0 <= x < size and 0 <= y < size:
                    inset = cell // 6 if cell >= 6 else 0
                    if inset and (x - x0 < inset or y - y0 < inset or x - x0 >= cell - inset or y - y0 >= cell - inset):
                        px[x, y] = (max(0, r - 60), max(0, g - 60), max(0, b - 60), 255)
                    else:
                        px[x, y] = (r, g, b, 255)

    return img


def main() -> None:
    sizes = {
        "32x32.png": 32,
        "128x128.png": 128,
        "128x128@2x.png": 256,
        "icon.png": 512,
    }
    for name, size in sizes.items():
        render_icon(size).save(OUT / name, "PNG")

    ico_sizes = [16, 32, 48, 64, 128, 256]
    images = [render_icon(s) for s in ico_sizes]
    images[0].save(
        OUT / "icon.ico",
        format="ICO",
        sizes=[(s, s) for s in ico_sizes],
        append_images=images[1:],
    )

    icns_sizes = [16, 32, 64, 128, 256, 512]
    icns_images = [render_icon(s) for s in icns_sizes]
    icns_images[0].save(
        OUT / "icon.icns",
        format="ICNS",
        append_images=icns_images[1:],
    )

    print(f"Generated icons in {OUT}")


if __name__ == "__main__":
    main()