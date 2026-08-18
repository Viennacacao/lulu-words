#!/usr/bin/env python3
"""Generate the app icon set for 字里行间 BetweenLines.

Concept C "文档里的词行": a paper page with six learning rows,
where row 3 is a highlighted word card (ink green) reading "learn".
Regenerates every size under src-tauri/icons plus the icns/ico bundles.
"""
from PIL import Image, ImageDraw, ImageFilter, ImageFont
import os
import subprocess

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ICONS_DIR = os.path.join(ROOT, "src-tauri", "icons")
SRC_PNG = os.path.join(ROOT, "scripts", "icon_src_512.png")

SIZE = 512

# ---- palette ----
PAPER_TOP = (253, 252, 249, 255)
PAPER_BOTTOM = (242, 239, 232, 255)
TITLE_LINE = (58, 58, 58, 255)          # #3A3A3A
BODY_LINE = (201, 195, 184, 255)        # #C9C3B8
WORD_CARD = (47, 93, 80, 255)           # #2F5D50 ink green
WORD_TEXT = (255, 255, 255, 255)
FOLD = (232, 228, 218, 255)
FOLD_EDGE = (213, 207, 194, 255)
SHADOW = (0, 0, 0, 26)


def font(size):
    for path in ("/System/Library/Fonts/Helvetica.ttc",
                 "/System/Library/Fonts/Supplemental/Arial.ttf"):
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size)
            except Exception:
                continue
    return ImageFont.load_default()


def draw_icon():
    img = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))

    # soft page shadow
    shadow = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    sd.rounded_rectangle((44, 52, 480, 480), radius=64, fill=SHADOW)
    shadow = shadow.filter(ImageFilter.GaussianBlur(18))
    img.alpha_composite(shadow)

    # paper page with vertical gradient
    paper = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    pd = ImageDraw.Draw(paper)
    for y in range(36, 477):
        t = (y - 36) / 440
        color = tuple(int(PAPER_TOP[i] + (PAPER_BOTTOM[i] - PAPER_TOP[i]) * t) for i in range(4))
        pd.line((36, y, 476, y), fill=color)
    mask = Image.new("L", (SIZE, SIZE), 0)
    md = ImageDraw.Draw(mask)
    md.rounded_rectangle((36, 36, 476, 476), radius=64, fill=255)
    img.paste(paper, (0, 0), mask)

    d = ImageDraw.Draw(img)

    # row 1: document title line
    d.rounded_rectangle((72, 120, 312, 134), radius=7, fill=TITLE_LINE)

    # row 2: body line
    d.rounded_rectangle((72, 168, 372, 178), radius=5, fill=BODY_LINE)

    # row 3: highlighted word card
    d.rounded_rectangle((72, 212, 322, 252), radius=18, fill=WORD_CARD)
    fnt = font(24)
    label = "learn"
    bbox = d.textbbox((0, 0), label, font=fnt)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    d.text((197 - tw / 2 - bbox[0], 232 - th / 2 - bbox[1]), label,
           font=fnt, fill=WORD_TEXT)

    # rows 4-6: body lines
    d.rounded_rectangle((72, 274, 372, 284), radius=5, fill=BODY_LINE)
    d.rounded_rectangle((72, 320, 372, 330), radius=5, fill=BODY_LINE)
    d.rounded_rectangle((72, 366, 300, 376), radius=5, fill=BODY_LINE)

    # top-right page fold
    d.polygon([(448, 36), (476, 36), (476, 64)], fill=FOLD)
    d.line((448, 36, 476, 64), fill=FOLD_EDGE, width=2)

    return img


def resized(img, size):
    return img.resize((size, size), Image.LANCZOS)


def main():
    os.makedirs(ICONS_DIR, exist_ok=True)
    base = draw_icon()
    base.save(SRC_PNG)
    print("source:", SRC_PNG)

    # png set referenced by tauri.conf.json
    base.save(os.path.join(ICONS_DIR, "icon.png"))          # 512
    resized(base, 128).save(os.path.join(ICONS_DIR, "128x128.png"))
    resized(base, 256).save(os.path.join(ICONS_DIR, "128x128@2x.png"))
    resized(base, 32).save(os.path.join(ICONS_DIR, "32x32.png"))

    # iconset for icns
    iconset = os.path.join(ICONS_DIR, "icon.iconset")
    os.makedirs(iconset, exist_ok=True)
    specs = {
        "icon_16x16.png": 16, "icon_16x16@2x.png": 32,
        "icon_32x32.png": 32, "icon_32x32@2x.png": 64,
        "icon_128x128.png": 128, "icon_128x128@2x.png": 256,
        "icon_256x256.png": 256, "icon_256x256@2x.png": 512,
        "icon_512x512.png": 512, "icon_512x512@2x.png": 1024,
    }
    for name, size in specs.items():
        resized(base, size).save(os.path.join(iconset, name))
    icns = os.path.join(ICONS_DIR, "icon.icns")
    subprocess.run(["iconutil", "-c", "icns", iconset, "-o", icns], check=True)

    # ico (multi-size)
    base.save(os.path.join(ICONS_DIR, "icon.ico"),
              format="ICO", sizes=[(16, 16), (32, 32), (48, 48), (256, 256)])

    print("icon set written to", ICONS_DIR)


if __name__ == "__main__":
    main()
