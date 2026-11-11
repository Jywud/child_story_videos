# -*- coding: utf-8 -*-
# 3 个点状特效音：wind-gust（风呼）/ sneeze（阿嚏）/ bubble（泡泡）
import numpy as np
from scipy.io import wavfile
from scipy import signal as sig
import subprocess, os
import imageio_ffmpeg

SR = 44100
OUT = "public/assets/_sfx"
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()
rng = np.random.default_rng(19)

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

def bandpass(x, lo, hi):
    b, a = sig.butter(4, [lo/(SR/2), hi/(SR/2)], "band")
    return sig.lfilter(b, a, x)

# 1. wind-gust：一阵风呼——（1.5s，中频起→扬→落）
dur = 1.5
n = int(dur * SR)
t = np.arange(n) / SR
gust = bandpass(rng.standard_normal(n), 400, 1500)
env = np.sin(np.pi * t / dur) ** 1.5  # 平滑起伏
gust *= env * 0.6
save_mp3("wind-gust", gust, gain=0.8)

# 2. sneeze：可爱小喷嚏（1.2s，两声短促"阿-嚏"）
dur = 1.2
n = int(dur * SR)
sneeze = np.zeros(n)
for off, pitch in [(0.1, 600), (0.45, 800)]:
    m = int(0.3 * SR)
    tt = np.linspace(0, 0.3, m)
    base = rng.standard_normal(m) * np.exp(-tt*18)
    base += np.sin(2*np.pi*pitch*tt) * np.exp(-tt*14) * 0.4
    pos = int(off * SR)
    sneeze[pos:pos+m] += bandpass(base, 300, 3000) * 0.8
save_mp3("sneeze", sneeze, gain=0.85)

# 3. bubble：泡泡声（1.5s，咕嘟咕嘟一串气泡，每个是短促上滑音）
dur = 1.5
n = int(dur * SR)
bubble = np.zeros(n)
for _ in range(9):
    off = rng.uniform(0.05, 1.2)
    f0 = rng.uniform(300, 900)
    m = int(0.08 * SR)
    tt = np.linspace(0, 0.08, m)
    # 上滑音=气泡破裂
    b = np.sin(2*np.pi*(f0 + f0*3*tt/0.08)*tt) * np.exp(-tt*30) * rng.uniform(0.2, 0.35)
    pos = int(off * SR)
    if pos + m < n:
        bubble[pos:pos+m] += b
save_mp3("bubble", bubble, gain=0.8)
