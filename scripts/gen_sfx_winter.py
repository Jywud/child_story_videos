# -*- coding: utf-8 -*-
# 3 个点状特效音：sleigh-bell（雪橇铃铛）/ snow-roll（雪球滚动）/ spring-bird（春鸟一声）
import numpy as np
from scipy.io import wavfile
from scipy import signal as sig
import subprocess, os
import imageio_ffmpeg

SR = 44100
OUT = "public/assets/_sfx"
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()
rng = np.random.default_rng(22)

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

# 1. sleigh-bell：雪橇铃铛（1.4s，一串叮叮当当，节奏轻快）
dur = 1.4
n = int(dur * SR)
bell = np.zeros(n)
offs = [0.0, 0.14, 0.25, 0.42, 0.5, 0.68, 0.82, 0.95]
for i, off in enumerate(offs):
    m = int(0.12 * SR)
    tt = np.linspace(0, 0.12, m)
    f = 2400 if i % 2 == 0 else 3200
    tone = (np.sin(2*np.pi*f*tt) + 0.4*np.sin(2*np.pi*f*2.7*tt)) * np.exp(-tt*32) * 0.22
    pos = int(off * SR)
    if pos + m < n:
        bell[pos:pos+m] += tone
save_mp3("sleigh-bell", bell, gain=0.8)

# 2. snow-roll：雪球滚动（1.4s，低频簌簌+节奏性起伏，越滚越响）
dur = 1.4
n = int(dur * SR)
t = np.arange(n) / SR
white = rng.standard_normal(n)
roll = low = None
b, a = sig.butter(4, [200/(SR/2), 900/(SR/2)], "band")
roll = sig.lfilter(b, a, white)
# 节奏起伏（滚动周期感）
mod = 0.5 + 0.5*np.sin(2*np.pi*3.5*t)
roll *= mod * (0.3 + 0.7*t/dur)  # 越滚越响
save_mp3("snow-roll", roll, gain=0.75)

# 3. spring-bird：春鸟一声（1.1s，清脆上扬啁啾，单次不拖沓）
dur = 1.1
n = int(dur * SR)
bird = np.zeros(n)
for off in [0.05, 0.3]:
    m = int(0.18 * SR)
    tt = np.linspace(0, 0.18, m)
    f0 = 2600 if off < 0.2 else 3100
    f_path = f0 + f0*0.35*np.sin(np.pi*tt/0.18)
    phase = 2*np.pi*np.cumsum(f_path)/SR
    chirp = (np.sin(phase) + 0.3*np.sin(2*phase)) * np.exp(-tt*16) * 0.3
    pos = int(off * SR)
    bird[pos:pos+m] += chirp
save_mp3("spring-bird", bird, gain=0.8)
