# -*- coding: utf-8 -*-
"""花头环带颜色直方图: 统计各色相带占环带的面积比例, 判断有哪些颜色花瓣。
用法: python hue_hist.py <image> <cx> <cy> <rin> <rout> [label]
"""
import os, sys, math, cv2, numpy as np
from PIL import Image

BANDS = [('red', 0, 8), ('red', 172, 179), ('orange', 9, 24), ('yellow', 25, 40),
         ('green', 41, 80), ('cyan', 81, 100), ('blue', 101, 130),
         ('purple', 131, 160), ('pink', 161, 171)]


def hist(path, cx, cy, rin, rout):
    rgb = np.array(Image.open(path).convert('RGB'))
    H, W = rgb.shape[:2]
    hsv = cv2.cvtColor(rgb, cv2.COLOR_RGB2HSV)
    yy, xx = np.mgrid[0:H, 0:W]
    r = np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2)
    ring = (r >= rin) & (r <= rout)
    Hc = hsv[:, :, 0].astype(int); S = hsv[:, :, 1].astype(int); V = hsv[:, :, 2].astype(int)
    sat = (S > 65) & (V > 75) & ring
    tot = sat.sum()
    out = {}
    for n, a, b in BANDS:
        m = sat & (Hc >= a) & (Hc <= b)
        out[n] = out.get(n, 0) + int(m.sum())
    return out, tot


if __name__ == '__main__':
    path, cx, cy, rin, rout = sys.argv[1], *[float(v) for v in sys.argv[2:6]]
    label = sys.argv[6] if len(sys.argv) > 6 else os.path.basename(path)
    out, tot = hist(path, cx, cy, rin, rout)
    print(f'{label}: 环带彩色像素 {tot}')
    for n, c in sorted(out.items(), key=lambda kv: -kv[1]):
        if c > 300:
            print(f'    {n:8s} {c:8d}  ({c / max(1, tot) * 100:5.1f}%)')
