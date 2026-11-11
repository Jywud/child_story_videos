# -*- coding: utf-8 -*-
"""
生成「儿童绘本故事系列」总封面（1080x1080 方图）。

流程：
  1. 抹掉 ImageGen 出图右下角的生成器水印（该区域是平滑水彩底纹，用左侧同纹镜像补）
  2. LANCZOS 放大到 1080x1080
  3. 叠渐变描边标题（站酷快乐体）+ 楷体副标，风格与正片卡片一致

用法:
  python scripts/make_series_cover.py <源图.png> <输出.jpg>
"""
import os
import sys

from PIL import Image, ImageDraw, ImageFilter, ImageFont

W = H = 1080
FONT_DIR = os.path.join("public", "assets", "fonts")
FONT_TITLE = os.path.join(FONT_DIR, "ZCOOLKuaiLe-Regular.ttf")
FONT_SUB = "C:/Windows/Fonts/simkai.ttf"  # 楷体

TITLE = "儿童绘本故事系列"
SUB = "每天一个睡前好故事"

# 与 Overlay.tsx 保持一致的配色
OUTLINE = (255, 253, 244, 255)
GRAD_STOPS = [(0.00, (255, 232, 115)), (0.34, (255, 201, 60)),
              (0.70, (255, 158, 31)), (1.00, (255, 122, 18))]
SUB_FILL = (255, 250, 236, 255)
SUB_STROKE = (138, 74, 18, 255)
HALO = (104, 52, 4)


def remove_watermark(im: Image.Image) -> Image.Image:
    """右下角水印区用左侧同纹水平镜像补掉，接缝处做 alpha 羽化。"""
    im = im.copy()
    box = (886, 948, 1024, 1024)          # 水印外扩一圈的矩形
    x0, y0, x1, y1 = box
    w, h = x1 - x0, y1 - y0
    # 镜像源：紧邻水印左侧、与水印等宽的一条
    src = im.crop((x0 - w, y0, x0, y1)).transpose(Image.FLIP_LEFT_RIGHT)
    patch = src.filter(ImageFilter.GaussianBlur(0.8))

    # 羽化 mask：左边缘 14px、顶边 10px 内 alpha 由 0 升到 1。
    # 水印自 x≈898 起，横向羽化带（886–900）内没有水印像素，不会把字糊回来。
    mask = Image.new("L", (w, h), 0)
    mp = mask.load()
    for j in range(h):
        ay = min(1.0, j / 10)
        for i in range(w):
            ax = min(1.0, i / 14)
            mp[i, j] = int(255 * min(ax, ay))

    im.paste(patch, (x0, y0), mask)
    return im


def gradient(size, stops):
    """竖直渐变，返回 RGBA 图。"""
    w, h = size
    g = Image.new("RGBA", (w, h))
    d = ImageDraw.Draw(g)
    for y in range(h):
        t = y / max(1, h - 1)
        c = stops[-1][1]
        for i in range(len(stops) - 1):
            a, ca = stops[i]
            b, cb = stops[i + 1]
            if a <= t <= b:
                k = (t - a) / (b - a)
                c = tuple(int(ca[j] + (cb[j] - ca[j]) * k) for j in range(3))
                break
        d.line([(0, y), (w, y)], fill=c + (255,))
    return g


def draw_text_block(base, text, font_path, size, center_x, top, gradient_fill=None,
                    fill=None, stroke=None, stroke_w=0, halo_w=0, halo_alpha=170,
                    shadow=True):
    """画一段描边（+渐变填充）文字，返回其包围盒高度。"""
    font = ImageFont.truetype(font_path, size)
    tmp = Image.new("L", (1, 1))
    bbox = ImageDraw.Draw(tmp).textbbox((0, 0), text, font=font, stroke_width=stroke_w)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    x = int(center_x - tw / 2 - bbox[0])
    y = int(top - bbox[1])

    layer = Image.new("RGBA", base.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)

    # 1) 紧致暗轮廓（让亮色填充在任何底色上都立得住）
    if halo_w > 0:
        hl = Image.new("RGBA", base.size, (0, 0, 0, 0))
        ImageDraw.Draw(hl).text(
            (x, y), text, font=font,
            fill=HALO + (halo_alpha,), stroke_width=halo_w, stroke_fill=HALO + (halo_alpha,),
        )
        base.alpha_composite(hl.filter(ImageFilter.GaussianBlur(9)))

    # 2) 柔和投影
    if shadow:
        sh = Image.new("RGBA", base.size, (0, 0, 0, 0))
        ImageDraw.Draw(sh).text(
            (x, y + 12), text, font=font,
            fill=HALO + (110,), stroke_width=stroke_w, stroke_fill=HALO + (110,),
        )
        base.alpha_composite(sh.filter(ImageFilter.GaussianBlur(16)))

    # 3) 描边层
    if stroke_w > 0:
        d.text((x, y), text, font=font, fill=stroke, stroke_width=stroke_w, stroke_fill=stroke)

    # 4) 填充层（渐变或纯色）
    if gradient_fill is not None:
        mask = Image.new("L", base.size, 0)
        ImageDraw.Draw(mask).text((x, y), text, font=font, fill=255)
        g = gradient((base.size[0], th + 40), GRAD_STOPS)
        gx = Image.new("RGBA", base.size, (0, 0, 0, 0))
        gx.paste(g, (0, int(top - 20)))
        layer.paste(gx, (0, 0), mask)
    else:
        d.text((x, y), text, font=font, fill=fill)

    base.alpha_composite(layer)
    return th


def main():
    src, out = sys.argv[1], sys.argv[2]
    im = Image.open(src).convert("RGB")
    im = remove_watermark(im)
    im = im.resize((W, H), Image.LANCZOS).convert("RGBA")

    # 顶部提亮，保证亮色文字在浅色天空上压得住
    lift = Image.new("RGBA", (W, 430), (0, 0, 0, 0))
    ld = ImageDraw.Draw(lift)
    for y in range(430):
        a = int(255 * 0.30 * (1 - y / 430))
        ld.line([(0, y), (W, y)], fill=(255, 252, 244, a))
    im.alpha_composite(lift)

    draw_text_block(im, TITLE, FONT_TITLE, 118, W / 2, 104,
                    gradient_fill=True, stroke=OUTLINE, stroke_w=13,
                    halo_w=21, halo_alpha=175)
    draw_text_block(im, SUB, FONT_SUB, 56, W / 2, 252,
                    fill=SUB_FILL, stroke=SUB_STROKE, stroke_w=6,
                    halo_w=13, halo_alpha=120)

    os.makedirs(os.path.dirname(out) or ".", exist_ok=True)
    im.convert("RGB").save(out, "JPEG", quality=93, subsampling=0, optimize=True)
    mb = os.path.getsize(out) / 1048576
    print(f"saved {out}  {im.size[0]}x{im.size[1]}  {mb:.2f} MB")


if __name__ == "__main__":
    main()
