"""Crop raw MCP screenshots into framed README images.

Each shot defines a horizontal band (x0..x1) and top (y0). The bottom is
auto-detected by scanning up from a cap until a row carrying real content
(bright pixels above the dark sidebar background) is found, then padded.
Fixed-bottom shots skip auto-detect (tables / boards we cut deliberately).
"""

import os
from PIL import Image

SRC = r"C:\Dev\minisheet\mcp\screenshots"
OUT = r"C:\Dev\minisheet\readme-crops"
os.makedirs(OUT, exist_ok=True)

# name, raw, x0, x1, y0, bottom(None=auto), cap
SHOTS = [
    ("screenshot-character-builder", "probe-config-character2.png", 49, 1101, 96, None, 1270),
    ("screenshot-quick-actions",     "probe-config-effects.png",    49, 1101, 96, None, 1150),
    ("screenshot-equipment-database","probe-equip-weapons.png",     49, 1722, 96, 1176, None),
    ("screenshot-forge",             "probe-forge.png",             49, 1722, 96, 728,  None),
    ("screenshot-spell-database",    "probe-spelldb.png",           49, 1722, 96, 1176, None),
    ("screenshot-party-inventory",   "probe-partyinv.png",         345, 1448, 96, None, 700),
    ("screenshot-sheet-combat",      "probe-combat.png",           483,  912, 66, None, 2262),
    ("screenshot-skills",            "probe-skills.png",           483,  912, 66, None, 2262),
    ("screenshot-spells",            "probe-spells-adarin.png",    483,  912, 198, None, 2262),
    ("screenshot-spells-arcanist",   "probe-spells-maelis.png",    483,  912, 198, 2448, None),
    ("screenshot-inventory",         "probe-inventory.png",        483,  912, 66, None, 3085),
    ("screenshot-references",        "probe-references.png",       483,  912, 66, 1720, None),
]


def content_bottom(img, x0, x1, y0, cap):
    px = img.load()
    w, h = img.size
    cap = min(cap, h)
    # luminance of a pixel
    def lum(x, y):
        p = px[x, y]
        r, g, b = p[0], p[1], p[2]
        return 0.299 * r + 0.587 * g + 0.114 * b
    step = 2
    for y in range(cap - 1, y0, -1):
        bright = 0
        for x in range(x0, x1, step):
            if lum(x, y) > 72:
                bright += 1
                if bright >= 6:
                    return min(y + 20, h)
    return cap


def main():
    for name, raw, x0, x1, y0, fixed, cap in SHOTS:
        path = os.path.join(SRC, raw)
        img = Image.open(path).convert("RGB")
        w, h = img.size
        x1 = min(x1, w)
        if fixed is not None:
            bottom = min(fixed, h)
        else:
            bottom = content_bottom(img, x0, x1, y0, cap)
        crop = img.crop((x0, y0, x1, bottom))
        out = os.path.join(OUT, name + ".png")
        crop.save(out)
        print(f"{name:32} {crop.size[0]:>5}x{crop.size[1]:<5}  <- {raw}")


if __name__ == "__main__":
    main()
