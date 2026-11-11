# -*- coding: utf-8 -*-
# 3 个点状特效音：glass-crash（玻璃碎）/ shadow-whoosh（影子出现）/ shadow-pip（影子缩小溜走）
import numpy as np
from scipy.io import wavfile
from scipy import signal as sig
import subprocess, os
import imageio_ffmpeg

SR = 44100
OUT = "public/assets/_sfx"
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()
rng = np.random.default_rng(21)

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

# 1. glass-crash：陶瓷杯碎裂（1.0s，高频碎裂+低频闷响，不刺耳偏卡通）
dur = 1.0
n = int(dur * SR)
crash = np.zeros(n)
# 主体碎裂声：高频噪声簇
crash += bandpass(rng.standard_normal(n) * np.exp(-np.linspace(0, 22, n)), 2500, 7000) * 0.7
# 低频闷响（瓷底落地）
thud = np.sin(2*np.pi*140*np.arange(int(0.25*SR))/SR) * np.exp(-np.linspace(0, 14, int(0.25*SR))) * 0.5
crash[:len(thud)] += thud
# 几声散落的碎片轻响
for off in [0.3, 0.45, 0.62]:
    m = int(0.08 * SR)
    tt = np.linspace(0, 0.08, m)
    frag = bandpass(rng.standard_normal(m), 3000, 8000) * np.exp(-tt*50) * 0.25
    pos = int(off * SR)
    crash[pos:pos+m] += frag
save_mp3("glass-crash", crash, gain=0.75)

# 2. shadow-whoosh：影子悄悄冒出来（1.2s，低频滑动+神秘轻颤，不吓人）
dur = 1.2
n = int(dur * SR)
t = np.arange(n) / SR
whoosh = bandpass(rng.standard_normal(n), 200, 900) * np.sin(np.pi * t / dur) ** 2 * 0.5
# 尾部一点神秘闪烁（高频轻音上行）
sparkle = np.sin(2*np.pi*np.linspace(1200, 1800, int(0.25*SR))/SR*SR*t[:int(0.25*SR)]) * 0.08
whoosh[-len(sparkle):] += sparkle * np.linspace(0, 1, len(sparkle))
save_mp3("shadow-whoosh", whoosh, gain=0.7)

# 3. shadow-pip：影子缩小溜走（0.9s，两声可爱的下滑泡泡音）
dur = 0.9
n = int(dur * SR)
pip = np.zeros(n)
for off, f0 in [(0.1, 1500), (0.4, 1100)]:
    m = int(0.15 * SR)
    tt = np.linspace(0, 0.15, m)
    # 下滑音=缩小溜走
    p = np.sin(2*np.pi*(f0 - f0*0.5*tt/0.15)*tt) * np.exp(-tt*20) * 0.35
    pos = int(off * SR)
    pip[pos:pos+m] += p
save_mp3("shadow-pip", pip, gain=0.75)
