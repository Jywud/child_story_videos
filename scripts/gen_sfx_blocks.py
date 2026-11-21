# -*- coding: utf-8 -*-
"""
第30集《再搭一次》专用木质积木点状音效（2026-11-21）。

只做短促点状音（loop=false），不做持续铺底——遵循音效终版策略。
木质碰撞声学特征：中频（400-2600Hz）为主、快速指数衰减、带一点木材共鸣，
避免低频轰头（被否的旧 wind 教训）和纯正弦机械感（旧 birds 教训）。

生成 3 个音（放 public/assets/_sfx/，共用库）：
  block-tap.mp3     单块积木轻碰（叠积木/递积木/扶正）
  block-wobble.mp3  塔身晃动的轻微木头吱呀
  block-crash.mp3   积木塔哗啦散落（多块错落撞击）

用法: python scripts/gen_sfx_blocks.py
"""
import numpy as np
from scipy.io import wavfile
from scipy import signal as sig
import subprocess
import os
import imageio_ffmpeg
from mutagen.mp3 import MP3

SR = 44100
OUT = "public/assets/_sfx"
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()
os.makedirs(OUT, exist_ok=True)
rng = np.random.default_rng(30)


def save_mp3(name, data, gain=0.9):
    data = np.clip(data * gain, -1, 1)
    wav_path = os.path.join(OUT, name + ".wav")
    mp3_path = os.path.join(OUT, name + ".mp3")
    wavfile.write(wav_path, SR, (data * 32767).astype(np.int16))
    subprocess.run(
        [FFMPEG, "-y", "-i", wav_path, "-b:a", "128k", mp3_path],
        capture_output=True, check=True,
    )
    os.remove(wav_path)
    print(name + ".mp3", round(os.path.getsize(mp3_path) / 1024), "KB /",
          round(MP3(mp3_path).info.length, 2), "s")


def bandpass(x, lo, hi):
    b, a = sig.butter(4, [lo / (SR / 2), hi / (SR / 2)], "band")
    return sig.lfilter(b, a, x)


def wood_knock(dur=0.16, base=520, bright=1.0):
    """单声木块碰撞：带通噪声瞬态 + 两个衰减共鸣正弦，快速收尾"""
    n = int(dur * SR)
    t = np.arange(n) / SR
    # 瞬态：短促宽带噪声经带通，模拟木头"哒"的敲击
    hit = rng.standard_normal(n) * np.exp(-t * 46)
    hit = bandpass(hit, 420, 2600)
    # 共鸣：两个略微失谐的正弦，木材固有频率感
    body = (
        np.sin(2 * np.pi * base * t) * 0.5
        + np.sin(2 * np.pi * base * 1.62 * t) * 0.28
    ) * np.exp(-t * 30)
    out = hit * 0.75 + body * bright
    out *= np.minimum(1, t * 400)  # 极短 attack，避免爆音
    return out


def place(buf, sound, at_sec, gain=1.0):
    pos = int(at_sec * SR)
    if pos >= len(buf):
        return
    seg = sound[: len(buf) - pos]
    buf[pos : pos + len(seg)] += seg * gain


# ── 1. block-tap：单块积木轻碰（0.45s 内一声，柔和）──
dur = 0.45
buf = np.zeros(int(dur * SR))
place(buf, wood_knock(0.18, base=480, bright=0.8), 0.02, gain=0.9)
save_mp3("block-tap", buf, gain=0.8)

# ── 2. block-wobble：塔身晃动轻微吱呀（0.9s，两三声很轻的木碰）──
dur = 0.9
buf = np.zeros(int(dur * SR))
place(buf, wood_knock(0.16, base=400, bright=0.5), 0.05, gain=0.5)
place(buf, wood_knock(0.14, base=430, bright=0.45), 0.38, gain=0.42)
place(buf, wood_knock(0.13, base=380, bright=0.4), 0.66, gain=0.34)
save_mp3("block-wobble", buf, gain=0.75)

# ── 3. block-crash：塔倒哗啦散落（1.3s，多块错落撞击）──
dur = 1.3
buf = np.zeros(int(dur * SR))
# 先一声较大的"哗"（塔身垮塌）
place(buf, wood_knock(0.28, base=360, bright=1.1), 0.02, gain=1.0)
# 随后一串错落的小木块落地声，密度前密后疏
offsets = [0.12, 0.2, 0.27, 0.36, 0.44, 0.5, 0.6, 0.68, 0.79, 0.9, 1.02]
for i, off in enumerate(offsets):
    base = rng.uniform(380, 720)
    gain = max(0.22, 0.7 - i * 0.045)  # 越后面越轻
    place(buf, wood_knock(rng.uniform(0.1, 0.18), base=base, bright=0.85),
          off + rng.uniform(-0.02, 0.02), gain=gain)
save_mp3("block-crash", buf, gain=0.85)

print("完成：block-tap / block-wobble / block-crash")
