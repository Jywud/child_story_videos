# -*- coding: utf-8 -*-
# 2 个点状特效音：nut-roll（松果咕噜滚落）/ found-cheer（找到啦欢呼）
import numpy as np
from scipy.io import wavfile
from scipy import signal as sig
import subprocess, os
import imageio_ffmpeg

SR = 44100
OUT = "public/assets/_sfx"
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()
rng = np.random.default_rng(23)

def save_mp3(name, data, gain=0.9):
    data = np.clip(data * gain, -1, 1)
    wav_path = os.path.join(OUT, name + ".wav")
    mp3_path = os.path.join(OUT, name + ".mp3")
    wavfile.write(wav_path, SR, (data * 32767).astype(np.int16))
    subprocess.run([FFMPEG, "-y", "-i", wav_path, "-b:a", "128k", mp3_path],
                   capture_output=True, check=True)
    os.remove(wav_path)
    from mutagen.mp3 import MP3
    print(name + ".mp3", round(os.path.getsize(mp3_path)/1024), "KB /", round(MP3(mp3_path).info.length, 2), "s")

# 1. nut-roll：松果咕噜滚落（1.1s，节奏性轻敲+滚动摩擦感，由快到慢）
dur = 1.1
n = int(dur * SR)
t = np.arange(n) / SR
roll = np.zeros(n)
# 节奏敲击（石缝滚动的磕碰）
offs = [0.02, 0.12, 0.25, 0.4, 0.58, 0.78]
for i, off in enumerate(offs):
    m = int(0.06 * SR)
    tt = np.linspace(0, 0.06, m)
    f = 700 - i * 60  # 越滚越低
    knock = np.sin(2*np.pi*f*tt) * np.exp(-tt*45) * (0.28 - i*0.03)
    pos = int(off * SR)
    if pos + m < n:
        roll[pos:pos+m] += knock
# 底噪滚动摩擦
b, a = sig.butter(4, [400/(SR/2), 1600/(SR/2)], "band")
roll += sig.lfilter(b, a, rng.standard_normal(n)) * np.linspace(0.15, 0.02, n)
save_mp3("nut-roll", roll, gain=0.8)

# 2. found-cheer：找到啦欢呼（1.2s，上行三连音+轻快掌声感，不吵闹）
dur = 1.2
n = int(dur * SR)
cheer = np.zeros(n)
# 上行三连音（do-mi-sol）
for off, f in [(0.05, 523), (0.22, 659), (0.39, 784)]:
    m = int(0.16 * SR)
    tt = np.linspace(0, 0.16, m)
    tone = (np.sin(2*np.pi*f*tt) + 0.3*np.sin(2*np.pi*f*2*tt)) * np.exp(-tt*18) * 0.3
    pos = int(off * SR)
    cheer[pos:pos+m] += tone
# 尾部轻快掌声感（高频短簇）
for off in [0.6, 0.75, 0.9]:
    m = int(0.05 * SR)
    tt = np.linspace(0, 0.05, m)
    clap = bandpass = sig.lfilter(*sig.butter(4, [2000/(SR/2), 6000/(SR/2)], "band"), rng.standard_normal(m)) * np.exp(-tt*60) * 0.18
    pos = int(off * SR)
    cheer[pos:pos+m] += clap
save_mp3("found-cheer", cheer, gain=0.8)
