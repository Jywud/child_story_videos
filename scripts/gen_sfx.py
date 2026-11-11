# -*- coding: utf-8 -*-
"""
环境音效本地合成器（2026-10-11）
外网音效站不可直连，用 numpy+scipy 合成自然类音效（CC0 等效，无版权问题）。
合成清单（共用库 public/assets/_sfx/）：
  rain.mp3      雨声（白噪+低通+随机雨滴脉冲）
  birds.mp3     鸟鸣（啁啾正弦扫频组）
  wind.mp3      风声（粉噪+慢调制）
  night.mp3     夜虫鸣（高频短脉冲串）
  water.mp3     溪水/洗衣水声（蓝噪+气泡调制）
  fire.mp3      篝火（棕噪+爆裂脉冲）
  kitchen.mp3   厨房氛围（碗碟轻碰脉冲组）
  chime.mp3     温馨提示音（马林巴式五声音阶，寓意卡/结尾用）
输出 mp3（edge-tts 环境有 ffmpeg）。
"""
import numpy as np
from scipy.io import wavfile
from scipy import signal as sig
import subprocess, os
import imageio_ffmpeg
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()

SR = 44100
OUT = "public/assets/_sfx"
os.makedirs(OUT, exist_ok=True)

def save_mp3(name, data, gain=0.9):
    data = np.clip(data * gain, -1, 1)
    wav_path = os.path.join(OUT, name + ".wav")
    mp3_path = os.path.join(OUT, name + ".mp3")
    wavfile.write(wav_path, SR, (data * 32767).astype(np.int16))
    subprocess.run([FFMPEG, "-y", "-i", wav_path, "-b:a", "128k", mp3_path],
                   capture_output=True, check=True)
    os.remove(wav_path)
    print(name + ".mp3", round(os.path.getsize(mp3_path)/1024), "KB")

rng = np.random.default_rng(42)

def lowpass(x, cutoff):
    b, a = sig.butter(4, cutoff / (SR/2), "low")
    return sig.lfilter(b, a, x)

def highpass(x, cutoff):
    b, a = sig.butter(4, cutoff / (SR/2), "high")
    return sig.lfilter(b, a, x)

def envelope(n, attack, release):
    e = np.ones(n)
    a = int(attack*SR); r = int(release*SR)
    e[:a] = np.linspace(0, 1, a)
    e[-r:] *= np.linspace(1, 0, r)
    return e

# 1. 雨声：白噪低通打底 + 随机雨滴高频短脉冲
dur = 12
n = dur * SR
rain = lowpass(rng.standard_normal(n), 1200) * 0.35
n_drops = 240
for _ in range(n_drops):
    pos = rng.integers(0, n-800)
    drop = rng.standard_normal(800) * np.exp(-np.linspace(0, 8, 800))
    rain[pos:pos+800] += highpass(drop, 2500) * 0.12
rain *= envelope(n, 1.5, 1.5)
save_mp3("rain", rain)

# 2. 鸟鸣：多组啁啾（正弦扫频 2-4kHz，短促上扬）
dur = 10
n = dur * SR
birds = np.zeros(n)
for _ in range(26):
    t0 = rng.integers(0, n - SR//2)
    chirp_dur = rng.uniform(0.08, 0.22)
    m = int(chirp_dur * SR)
    t = np.linspace(0, chirp_dur, m)
    f0, f1 = rng.uniform(2000, 2800), rng.uniform(3200, 4200)
    phase = 2*np.pi*(f0*t + (f1-f0)*t**2/(2*chirp_dur))
    chirp = np.sin(phase) * np.exp(-t*6) * 0.22
    # 每次鸣叫 2-4 声
    for k in range(rng.integers(2, 5)):
        off = t0 + k*int(rng.uniform(0.12, 0.2)*SR)
        if off+m < n:
            birds[off:off+m] += chirp
birds *= envelope(n, 1.0, 1.0)
save_mp3("birds", birds)

# 3. 风声：粉噪+低频幅度调制
dur = 12
n = dur * SR
white = rng.standard_normal(n)
# 粉噪近似：累积低通
wind = lowpass(white, 500) * 0.5
mod = 0.55 + 0.45*np.sin(2*np.pi*0.13*np.arange(n)/SR + rng.uniform(0, 6)) * np.sin(2*np.pi*0.07*np.arange(n)/SR)
wind *= mod
wind *= envelope(n, 2.0, 2.0)
save_mp3("wind", wind, gain=0.75)

# 4. 夜虫鸣：4-5kHz 短脉冲串，规律节奏
dur = 10
n = dur * SR
night = np.zeros(n)
t = np.arange(int(0.03*SR))
carrier = np.sin(2*np.pi*4600*t/SR) * np.exp(-t/(0.008*SR))
pos = 0
while pos < n - int(0.4*SR):
    for k in range(rng.integers(3, 6)):
        off = pos + k*int(0.07*SR)
        if off + len(carrier) < n:
            night[off:off+len(carrier)] += carrier * 0.16
    pos += int(rng.uniform(0.5, 0.9)*SR)
night *= envelope(n, 1.0, 1.0)
save_mp3("night", night, gain=0.7)

# 5. 水声：蓝噪+随机气泡（正弦短包络上扫频）
dur = 10
n = dur * SR
water = highpass(rng.standard_normal(n), 800) * 0.18
water = lowpass(water, 3500)
for _ in range(70):
    pos = rng.integers(0, n-2000)
    f = rng.uniform(400, 1400)
    m = rng.integers(600, 2000)
    t = np.linspace(0, m/SR, m)
    bubble = np.sin(2*np.pi*(f*t + 300*t**2)) * np.exp(-t*9) * 0.10
    water[pos:pos+m] += bubble
water *= envelope(n, 1.2, 1.2)
save_mp3("water", water)

# 6. 篝火：棕噪打底+随机爆裂
dur = 10
n = dur * SR
brown = np.cumsum(rng.standard_normal(n))
brown /= np.max(np.abs(brown))
fire = lowpass(brown, 400) * 0.30
for _ in range(90):
    pos = rng.integers(0, n-400)
    crack = rng.standard_normal(400) * np.exp(-np.linspace(0, 12, 400))
    fire[pos:pos+400] += highpass(crack, 1800) * 0.25
fire *= envelope(n, 1.0, 1.0)
save_mp3("fire", fire, gain=0.7)

# 7. 厨房氛围：低频嗡+碗碟轻碰（金属感衰减音）
dur = 10
n = dur * SR
kitchen = np.zeros(n)
for _ in range(16):
    pos = rng.integers(0, n-SR)
    f = rng.uniform(900, 2600)
    m = int(0.25*SR)
    t = np.linspace(0, 0.25, m)
    ding = (np.sin(2*np.pi*f*t) + 0.4*np.sin(2*np.pi*f*2.7*t)) * np.exp(-t*14) * 0.13
    kitchen[pos:pos+m] += ding
hum = np.sin(2*np.pi*50*np.arange(n)/SR) * 0.02
kitchen += hum
kitchen *= envelope(n, 1.0, 1.0)
save_mp3("kitchen", kitchen, gain=0.7)

# 8. 温馨提示音：五声音阶马林巴（C大调 do mi sol do'），寓意卡/结尾
notes = [523.25, 659.25, 783.99, 1046.5]  # C5 E5 G5 C6
dur = 4
n = dur * SR
chime = np.zeros(n)
for i, f in enumerate(notes):
    off = int(i*0.45*SR)
    m = int(1.2*SR)
    t = np.linspace(0, 1.2, m)
    tone = (np.sin(2*np.pi*f*t) + 0.3*np.sin(2*np.pi*f*4*t)) * np.exp(-t*3.2) * 0.22
    if off+m < n:
        chime[off:off+m] += tone
save_mp3("chime", chime)

print("\n全部合成完成:", sorted(os.listdir(OUT)))
