# -*- coding: utf-8 -*-
# magic-ding：清脆魔法叮（快速上行五度双铃音+快衰减，短促不拖尾）
import numpy as np
from scipy.io import wavfile
from scipy import signal as sig
import subprocess, os
import imageio_ffmpeg

SR = 44100
OUT = "public/assets/_sfx"
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()

dur = 1.2
n = int(dur * SR)
t = np.arange(n) / SR
magic = np.zeros(n)

# 两个快速上行五度的铃音（C6→G6，间隔 0.12s）
for i, (f0, off) in enumerate([(1046.5, 0.0), (1568.0, 0.12)]):
    m = int(0.5 * SR)
    tt = np.linspace(0, 0.5, m)
    # 铃音 = 基音 + 泛音（2.76x 产生钟铃质感）
    tone = (np.sin(2*np.pi*f0*tt) + 0.5*np.sin(2*np.pi*f0*2.76*tt) +
            0.25*np.sin(2*np.pi*f0*5.4*tt)) * np.exp(-tt*9)
    pos = int(off*SR)
    magic[pos:pos+m] += tone * (0.28 if i == 0 else 0.34)

# 尾部一点点星光闪烁感（高频轻颤音）
sparkle_t = np.linspace(0, 0.5, int(0.5*SR))
sparkle = np.sin(2*np.pi*2093*sparkle_t) * np.exp(-sparkle_t*11) * 0.10
magic[int(0.3*SR):int(0.3*SR)+len(sparkle)] += sparkle

magic *= np.linspace(1, 0.85, n)  # 整体轻微衰减收尾
magic = np.clip(magic * 0.9, -1, 1)

wav_path = os.path.join(OUT, "magic-ding.wav")
mp3_path = os.path.join(OUT, "magic-ding.mp3")
wavfile.write(wav_path, SR, (magic * 32767).astype(np.int16))
subprocess.run([FFMPEG, "-y", "-i", wav_path, "-b:a", "128k", mp3_path],
               capture_output=True, check=True)
os.remove(wav_path)
from mutagen.mp3 import MP3
print("magic-ding.mp3", round(os.path.getsize(mp3_path)/1024), "KB /", round(MP3(mp3_path).info.length, 2), "s")
