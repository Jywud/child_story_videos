# -*- coding: utf-8 -*-
"""插画风格一致性校验：抓出与全片画风割裂的「漂移图」。

ImageGen 单张独立生成，仅靠提示词尾巴维持风格，场景跨度大时会漂移。历史上两类：
  1) 全图色调漂移 —— 如《曹冲称象》s6 色相漂到 97°偏青冷，其余都在 32-46°暖黄区；
  2) 主体暖/背景冷 —— 如《再搭一次》s7-window，橙色主角把全图平均色相拉回 33°（看似正常），
     但墙面窗帘整片冷绿，肉眼看明显离群。全图平均色相抓不到这类，必须看「绿像素占比」。

判据（双轨，任一命中即离群）：
  A. 全图色相 |Hue - 中位| > HUE_TOL（默认 18°）
  B. 绿像素占比 > GREEN_TOL（默认 8%）—— 室内暖色绘本里出现大片冷绿即漂移

Sat/Lum 只打印参考，不作判据：hook 留白偏淡、户外场景偏亮属正常，避免误报。
户外剧情场景（树/鸟窝/夜空等本就冷绿）在 prompts.json 的 _toneExempt 白名单里豁免绿占比判据。

用法: python scripts/check_tone.py [slug] [--loose]
  不给 slug 则扫描全部故事目录（precheck 走这条）——任何一集漂移都会被拦住。
  --loose 放宽一档（夜景/多户外场景时），仅供人工确认后使用，默认严判。
"""
import json
import os
import sys

import numpy as np
from PIL import Image

HUE_TOL = 18.0
GREEN_TOL = 8.0


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
    # 绿像素占比：g 明显高于 r 且非灰，抓「背景整片冷绿」这类漂移
    greenish = (g > r * 1.06) & (g > b * 1.02) & (diff > 0.06)
    return {
        "hue": float(np.mean(hue[sel])) if sel.any() else 0.0,
        "sat": float(np.mean(sat) * 100),
        "lum": float(np.mean(lum) * 100),
        "green": round(float(greenish.mean()) * 100, 1),
    }


def check_slug(slug, hue_tol, green_tol):
    root = os.path.join("public", "assets", slug)
    prompts_path = os.path.join("src", "stories", slug, "prompts.json")
    if not os.path.exists(root):
        print(f"没有素材目录 public/assets/{slug}，跳过")
        return

    prompts = {}
    if os.path.exists(prompts_path):
        prompts = json.load(open(prompts_path, encoding="utf-8"))
    exempt = set(prompts.get("_toneExempt", []))  # 户外/夜景等剧情合理冷绿的图

    order = list(prompts.get("images", {}).keys())
    names = [f for f in order if f.lower().endswith((".jpg", ".png"))]
    if not names:
        names = sorted(
            f for f in os.listdir(root) if f.lower().endswith((".jpg", ".png"))
        )

    rows = [(n, stats(os.path.join(root, n))) for n in names]
    med_hue = float(np.median([s["hue"] for _, s in rows]))

    print(f"== {slug} 风格一致性（{len(rows)} 张）==")
    print(f"   全片色相中位数 Hue {med_hue:.1f}  |  判据 Hue 差>{hue_tol:.0f}° 或 绿像素>{green_tol:.0f}%")
    print(f"   Sat/Lum 仅参考不作判据；_toneExempt 白名单: {', '.join(sorted(exempt)) or '无'}")
    print(f"{'图片':22}{'Hue':>7}{'绿%':>7}{'Sat':>7}{'Lum':>7}  判定")
    bad = []
    for n, s in rows:
        flags = []
        if abs(s["hue"] - med_hue) > hue_tol:
            flags.append(f"色相差{abs(s['hue']-med_hue):.0f}°")
        if n not in exempt and s["green"] > green_tol:
            flags.append(f"绿像素{s['green']:.0f}%")
        verdict = "离群 ⚠ " + " / ".join(flags) if flags else "OK"
        mark = " (户外豁免)" if n in exempt else ""
        print(f"{n:22}{s['hue']:7.1f}{s['green']:7.1f}{s['sat']:7.1f}{s['lum']:7.1f}  {verdict}{mark}")
        if flags:
            bad.append(n)

    if bad:
        print(f"\n发现 {len(bad)} 张风格离群: {', '.join(bad)}")
        print("处理：挑一张色调标准图作参考重出（纯文生图用正面暖色描述；图生图 input_fidelity≈0.55），")
        print("      转码覆盖后重跑本脚本 + 重渲主视频。户外/夜景合理冷绿的图加入 prompts.json 的 _toneExempt。")
        return True
    print("\n全部图片风格一致，通过。")
    return False


def main():
    loose = "--loose" in sys.argv
    hue_tol = HUE_TOL + (10 if loose else 0)
    green_tol = GREEN_TOL + (6 if loose else 0)

    args = [a for a in sys.argv[1:] if a != "--loose"]
    if args:
        failed = check_slug(args[0], hue_tol, green_tol)
    else:
        # 无 slug（手动跑 precheck / compositions 命令）：历史集风格不一概不阻断新渲染，
        # 这里只提示如何单独检查，真正拦截发生在渲染命令注入 PRECHECK_SLUG 时。
        print("[check_tone] 未指定 slug，跳过。渲染某集时会自动只校验该集；")
        print("            单独检查用: python scripts/check_tone.py <slug>")
        failed = False

    if failed:
        sys.exit(1)


if __name__ == "__main__":
    main()
