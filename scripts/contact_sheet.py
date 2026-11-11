# -*- coding: utf-8 -*-
"""把一集的所有插画拼成带编号的联络表，便于核对道具/造型一致性。
用法: python scripts/contact_sheet.py <slug> <out.png> [cols]
"""
import os
import sys

from PIL import Image, ImageDraw

slug = sys.argv[1]
out = sys.argv[2]
cols = int(sys.argv[3]) if len(sys.argv) > 3 else 5

d = os.path.join("public", "assets", slug)
files = sorted(f for f in os.listdir(d) if f.lower().endswith(".jpg"))

TW, TH = 200, 267
pad = 26
rows = (len(files) + cols - 1) // cols

sheet = Image.new("RGB", (cols * TW, rows * (TH + pad)), (255, 255, 255))
draw = ImageDraw.Draw(sheet)

for i, f in enumerate(files):
    img = Image.open(os.path.join(d, f)).convert("RGB").resize((TW, TH), Image.LANCZOS)
    r, c = divmod(i, cols)
    x, y = c * TW, r * (TH + pad)
    sheet.paste(img, (x, y))
    draw.rectangle([x, y, x + TW - 1, y + TH - 1], outline=(200, 200, 200))
    draw.text((x + 4, y + TH + 6), f"[{i + 1}] {f}", fill=(0, 0, 0))

sheet.save(out)
print(f"{len(files)} images -> {out}  ({sheet.width}x{sheet.height})")
for i, f in enumerate(files):
    print(f"[{i + 1}] {f}")
