# -*- coding: utf-8 -*-
"""插画风格一致性校验：统计一集所有图的色调，找出离群的漂移图。

原理：ImageGen 单张独立生成，仅靠提示词尾巴维持风格，场景跨度大时会漂移
（例如《曹冲称象》s6 色相漂到 97°偏青冷，其余 21 张都在 32-46°暖黄区）。
用「色相中位数 ± 阈值」判定离群，防止某张图画风/色调和全片割裂。

用法: python scripts/check_tone.py <slug>
  可选项：--loose（阈值放宽一档，室内/夜景等剧情合理偏色时用）
"""
import json
import os
import sys

import numpy as np
from PIL import Image

# 默认离群判定：色相差 > 15°，或饱和度/亮度超出中位数 ± 12%
HUE_TOL = 15.0
SAT_LUM_TOL = 12.0


def stats(path: str):
    img = np.asarray(Image.open(path).convert("RGB")).astype(np.float32) / 255
    r, g, b = img[..., 0], img[..., 1], img[..., 2]
    mx = img.max(axis=2)
    mn = img.min(axis=2)
    sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0)
    lum = r * 0.299 + g * 0.587 + b * 0.114
    diff = mx - mn
    hue = np.zeros_like(r)
    sel = diff > 0.08
    idx = mx == r
    hue[idx] = ((g[idx] - b[idx]) / np.maximum(diff[idx], 1e-6)) % 6
    idx = mx == g
    hue[idx] = (b[idx] - r[idx]) / np.maximum(diff[idx], 1e-6) + 2
    idx = mx == b
    hue[idx] = (r[idx] - g[idx]) / np.maximum(diff[idx], 1e-6) + 4
    hue = hue * 60
    return {
        "hue": float(np.mean(hue[sel])) if sel.any() else 0.0,
        "sat": float(np.mean(sat) * 100),
        "lum": float(np.mean(lum) * 100),
    }


def main():
    slug = sys.argv[1]
    loose = "--loose" in sys.argv
    hue_tol = HUE_TOL + (8 if loose else 0)
    sat_tol = SAT_LUM_TOL + (8 if loose else 0)

    root = os.path.join("public", "assets", slug)
    prompts_path = os.path.join("src", "stories", slug, "prompts.json")
    if not os.path.exists(root):
        print(f"没有素材目录 public/assets/{slug}，跳过")
        return

    # 用 prompts.json 的 images 顺序（出图顺序）保证展示稳定
    order = []
    if os.path.exists(prompts_path):
        order = list(
            json.load(open(prompts_path, encoding="utf-8")).get("images", {}).keys()
        )
    names = [f for f in order if f.lower().endswith((".jpg", ".png"))]
    if not names:
        names = sorted(
            f for f in os.listdir(root) if f.lower().endswith((".jpg", ".png"))
        )

    rows = [(n, stats(os.path.join(root, n))) for n in names]
    hues = [s["hue"] for _, s in rows]
    med_hue = float(np.median(hues))
    med_sat = float(np.median([s["sat"] for _, s in rows]))
    med_lum = float(np.median([s["lum"] for _, s in rows]))

    print(f"== {slug} 色调一致性（{len(rows)} 张）==")
    print(f"   中位  Hue {med_hue:.1f}  Sat {med_sat:.1f}  Lum {med_lum:.1f}")
    print(f"   离群判据  Hue 差>{hue_tol:.0f} 或 Sat/Lum 差>{sat_tol:.0f}")
    print(f"{'图片':22}{'Hue':>7}{'Sat':>7}{'Lum':>7}  判定")
    bad = []
    for n, s in rows:
        flags = []
        if abs(s["hue"] - med_hue) > hue_tol:
            flags.append(f"色相差{abs(s['hue']-med_hue):.0f}°")
        if abs(s["sat"] - med_sat) > sat_tol:
            flags.append(f"饱和差{abs(s['sat']-med_sat):.0f}")
        if abs(s["lum"] - med_lum) > sat_tol:
            flags.append(f"亮度差{abs(s['lum']-med_lum):.0f}")
        verdict = "离群 ⚠ " + " / ".join(flags) if flags else "OK"
        print(f"{n:22}{s['hue']:7.1f}{s['sat']:7.1f}{s['lum']:7.1f}  {verdict}")
        if flags:
            bad.append(n)

    if bad:
        print(f"\n发现 {len(bad)} 张风格离群: {', '.join(bad)}")
        print("处理建议：挑一张色调标准的同场景图作参考，图生图重出这张（input_fidelity≈0.55）。")
        sys.exit(1)
    print("\n全部图片色调一致，通过。")


if __name__ == "__main__":
    main()
