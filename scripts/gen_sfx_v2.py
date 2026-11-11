# -*- coding: utf-8 -*-
"""
环境音效合成器 v2（2026-10-14 修复"奇怪的背景音乐"）
根因：v1 wind 用棕噪+低通 → 低频轰头像电流嗡嗡声；birds 扫频正弦太机械像电子音。
v2 改进：
  - wind: 白噪 + 带通 400-1200Hz + 多层慢调制包络（真实风声的"呼-呼"质感，无低频轰头）
  - birds: 啁啾加随机频率抖动 + 二次谐波 + 音量随机，去机械感
  - rain: 白噪改多层滤网 + 雨滴更稀疏自然（顺带重做）
其余（night/water/fire/kitchen/chime）暂保留 v1（第 16/17 集已发布不动，重出会影响旧集一致性——
旧集音频在 mp4 里已固化，重生成 _sfx 文件不影响已渲染成片，只影响未来重渲。为保守只重做 birds/wind/rain）。
"""
import numpy as np
from scipy.io import wavfile
from scipy import signal as sig
import subprocess, os
import imageio_ffmpeg

SR = 44100
OUT = "public/assets/_sfx"
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()
rng = np.random.default_rng(7)

def save_mp3(name, data, gain=0.9):
    data = np.clip(data * gain, -1, 1)
    wav_path = os.path.join(OUT, name + ".wav")
    mp3_path = os.path.join(OUT, name + ".mp3")
    wavfile.write(wav_path, SR, (data * 32767).astype(np.int16))
    subprocess.run([FFMPEG, "-y", "-i", wav_path, "-b:a", "128k", mp3_path],
                   capture_output=True, check=True)
    os.remove(wav_path)
    print(name + ".mp3", round(os.path.getsize(mp3_path)/1024), "KB")

def bandpass(x, lo, hi):
    b, a = sig.butter(4, [lo/(SR/2), hi/(SR/2)], "band")
    return sig.lfilter(b, a, x)

def envelope(n, attack, release):
    e = np.ones(n)
    a = int(attack*SR); r = int(release*SR)
    e[:a] = np.linspace(0, 1, a)
    e[-r:] *= np.linspace(1, 0, r)
    return e

# ── wind v2：白噪带通 + 多层呼吸式调制（"呼——呼——"），无低频轰头 ──
dur = 12
n = dur * SR
wind = bandpass(rng.standard_normal(n), 400, 1200) * 0.5
# 三层不同周期的呼吸调制，模拟阵风
t = np.arange(n) / SR
mod = (0.55 + 0.25*np.sin(2*np.pi*0.09*t + 1.2) *
       np.sin(2*np.pi*0.031*t) + 0.2*np.sin(2*np.pi*0.17*t + 3.0))
wind *= mod
# 再叠一层极轻的高频"叶响"质感
leaves = bandpass(rng.standard_normal(n), 2000, 5000) * 0.06 * (0.5 + 0.5*np.sin(2*np.pi*0.05*t))
wind += leaves * mod
wind *= envelope(n, 2.0, 2.0)
save_mp3("wind", wind, gain=0.8)

# ── birds v2：啁啾加抖动+泛音，去电子感 ──
dur = 10
n = dur * SR
birds = np.zeros(n)
for _ in range(22):
    t0 = rng.integers(0, n - SR//2)
    for k in range(rng.integers(2, 5)):
        off = t0 + k*int(rng.uniform(0.11, 0.19)*SR)
        chirp_dur = rng.uniform(0.07, 0.18)
        m = int(chirp_dur * SR)
        if off + m >= n: continue
        tt = np.linspace(0, chirp_dur, m)
        f0 = rng.uniform(2200, 3000)
        # 频率路径带随机抖动（不再是光滑扫频）
        jitter = np.cumsum(rng.standard_normal(m)) / m * 350
        f_path = f0 + (rng.uniform(600, 1100)) * np.sin(np.pi * tt / chirp_dur) + jitter
        phase = 2*np.pi*np.cumsum(f_path)/SR
        # 基音 + 弱二次谐波（真鸟有泛音）
        env = np.exp(-tt*7) * (0.5 + 0.5*np.sin(np.pi*tt/chirp_dur))
        chirp = (np.sin(phase) + 0.35*np.sin(2*phase)) * env * rng.uniform(0.12, 0.2)
        birds[off:off+m] += chirp
birds *= envelope(n, 1.0, 1.0)
save_mp3("birds", birds)

# ── rain v2：多层滤网白噪 + 更自然的雨滴（轻打+偶发重滴）──
dur = 12
n = dur * SR
rain = bandpass(rng.standard_normal(n), 300, 2400) * 0.32
rain += bandpass(rng.standard_normal(n), 100, 500) * 0.15  # 远处雨幕
for _ in range(160):
    pos = rng.integers(0, n-900)
    drop = rng.standard_normal(900) * np.exp(-np.linspace(0, 9, 900))
    rain[pos:pos+900] += bandpass(drop, 2000, 6000) * rng.uniform(0.06, 0.14)
rain *= envelope(n, 1.5, 1.5)
save_mp3("rain", rain)

# 频谱验证
print("\n── 频谱验证 ──")
for name in ["wind", "birds"]:
    wav_tmp = f"output/_petalfix/_v2_{name}.wav"
    subprocess.run([FFMPEG, "-y", "-i", f"{OUT}/{name}.mp3", "-ar", "22050", "-ac", "1", wav_tmp],
                   capture_output=True, check=True)
    sr, data = wavfile.read(wav_tmp)
    data = data.astype(np.float32) / 32768
    freqs = np.abs(np.fft.rfft(data[:sr*4] * np.hanning(min(sr*4, len(data)))))
    lo = np.mean(freqs[:int(300/(sr/2)*len(freqs))])
    mid = np.mean(freqs[int(300/(sr/2)*len(freqs)):int(2000/(sr/2)*len(freqs))])
    hi = np.mean(freqs[int(2000/(sr/2)*len(freqs)):int(8000/(sr/2)*len(freqs))])
    print(f"{name}: 低频 {lo:.1f} / 中频 {mid:.1f} / 高频 {hi:.1f}")
    os.remove(wav_tmp)
