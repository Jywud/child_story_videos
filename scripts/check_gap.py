# -*- coding: utf-8 -*-
"""像素级检查笔刷遮罩是否残留未覆盖缝隙。

原理：StoryScene 里 Paper 在底、插画在上，已揭示的像素应当等于原图。
      未揭示处露出的是奶油色纸张 —— 于是"渲染比原图明显更亮且原图很暗"的像素就是缝隙。

用法: python scripts/check_gap.py <渲染帧.png> <原图.jpg>
"""
import sys

import numpy as np
from PIL import Image

rnd = np.asarray(Image.open(sys.argv[1]).convert("RGB")).astype(np.int16)
src = np.asarray(Image.open(sys.argv[2]).convert("RGB")).astype(np.int16)

if rnd.shape != src.shape:
    print(f"尺寸不一致: {rnd.shape} vs {src.shape}")
    sys.exit(1)

lum_r = rnd.mean(axis=2)
lum_s = src.mean(axis=2)
diff = np.abs(rnd - src).mean(axis=2)

# 缝隙：原图很暗、渲染却变亮、且差异大
gap = (lum_s < 150) & (lum_r > 195) & (diff > 55)

# 排除角标 / 字幕 / 底部渐变条区域
h, w = gap.shape
gap[:180, 640:] = False        # 右上角标
gap[int(h * 0.62):, :] = False  # 底部字幕带

total = int(gap.sum())
print(f"疑似缝隙像素: {total}  ({total / (h * w) * 100:.4f}%)")

if total:
    ys, xs = np.nonzero(gap)
    print(f"  范围 x: {xs.min()}~{xs.max()}  y: {ys.min()}~{ys.max()}")
    # 连通性粗看：按 y 聚类
    order = np.argsort(ys)
    ys = ys[order]
    runs, start = [], ys[0]
    prev = ys[0]
    for y in ys[1:]:
        if y - prev > 6:
            runs.append((start, prev))
            start = y
        prev = y
    runs.append((start, prev))
    print(f"  纵向分布（{len(runs)} 段）: " + ", ".join(f"{a}-{b}" for a, b in runs[:12]))
