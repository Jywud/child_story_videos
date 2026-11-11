# -*- coding: utf-8 -*-
"""把 tmp-imgs/<slug> 里的 PNG 按时间顺序转成 1080x1440 JPEG，写入 public/assets/<slug>/。
用法: python scripts/prep_images.py <slug> <name1, name2, ...>
"""
import os
import re
import sys

from PIL import Image

TW, TH = 1080, 1440

TS = re.compile(r"(\d{4})-(\d{2})-(\d{2})T(\d{2})-(\d{2})-(\d{2})")


def sort_key(name: str) -> str:
    """按文件名里的时间戳排序，别用字符串序（中文名会乱）"""
    m = TS.search(name)
    return "".join(m.groups()) if m else name


def main() -> None:
    slug = sys.argv[1]
    names = sys.argv[2].split(",")
    src_slug = sys.argv[3] if len(sys.argv) > 3 else slug

    src_dir = os.path.join("tmp-imgs", src_slug)
    out_dir = os.path.join("public", "assets", slug)
    os.makedirs(out_dir, exist_ok=True)

    files = sorted(
        (f for f in os.listdir(src_dir) if f.lower().endswith((".png", ".jpg", ".jpeg"))),
        key=sort_key,
    )
    if len(files) != len(names):
        print(f"WARN count mismatch: {len(files)} files vs {len(names)} names")
        print("\n".join(files))

    for i, name in enumerate(names):
        if i >= len(files):
            print(f"MISSING image for {name}")
            continue
        img = Image.open(os.path.join(src_dir, files[i])).convert("RGB")
        # 等比放大到宽度，再居中裁到 3:4
        scale = TW / img.width
        img = img.resize((TW, round(img.height * scale)), Image.LANCZOS)
        if img.height > TH:
            top = (img.height - TH) // 2
            img = img.crop((0, top, TW, top + TH))
        out = os.path.join(out_dir, f"{name}.jpg")
        img.save(out, "JPEG", quality=88, optimize=True)
        print(f"{name}.jpg  <-  {files[i]}  ({os.path.getsize(out)//1024} KB)")


if __name__ == "__main__":
    main()
