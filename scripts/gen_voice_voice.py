# -*- coding: utf-8 -*-
"""
分幕情绪配音生成器（2026-10-10 升级）
- VOICE 固定 zh-CN-XiaoyiNeural（读绘本甜美少女声）
- PARTS 支持两种写法：
    "纯文本"                                → 用 MOOD_PRESETS['narr'] 默认温柔叙述
    {"text": "...", "mood": "conflict"}     → 按情绪档覆盖 rate/pitch
- 用法: python gen_voice_voice.py <slug>
"""
import asyncio
import math
import os
import sys

import edge_tts
from mutagen.mp3 import MP3

VOICE = "zh-CN-XiaoyiNeural"
FPS = 30

# 情绪档预设（读绘本语气为基底，随情节起伏）
MOOD_PRESETS = {
    "narr":     {"rate": "-32%", "pitch": "+8Hz"},   # 温柔叙述（默认）
    "setup":    {"rate": "-34%", "pitch": "+6Hz"},   # 铺垫/好奇：稍慢稍沉拉悬念
    "conflict": {"rate": "-26%", "pitch": "+14Hz"},  # 冲突/紧张：微提速+音调扬
    "climax":   {"rate": "-24%", "pitch": "+16Hz"},  # 惊讶/高潮：情绪顶点
    "warm":     {"rate": "-38%", "pitch": "+4Hz"},   # 温情/结尾：放缓放柔
    "interact": {"rate": "-30%", "pitch": "+12Hz"},  # 互动提问：轻快亲和
}

# 《会说谢谢的小喇叭》20 幕 V24（完全原创，品格·感恩节应景；说不出口的谢谢=石子，说出口变星星）
KEEP_EXISTING = []
PARTS = [
    {"text": "谢谢说出口，石头也会变星星呀。", "mood": "warm"},
    {"text": "小狐狸阿栗有个小烦恼：别人帮了它，谢谢两个字总说不出口。", "mood": "setup"},
    {"text": "蜂鸟帮它捡回帽子，它脸憋得通红，扭头就跑掉了。", "mood": "conflict"},
    {"text": "回家路上，它捡到一只金色的小喇叭，喇叭口还闪着光。", "mood": "setup"},
    {"text": "喇叭有个魔法：心里每想说一次谢谢，喇叭就亮一下。", "mood": "climax"},
    {"text": "可喇叭越来越重——原来没说出口的谢谢，都变成了小石子存在里面。", "mood": "conflict"},
    {"text": "阿栗想道谢的机会越来越多，喇叭里的石子也越来越满。", "mood": "conflict"},
    {"text": "它累得抱不动喇叭了，一屁股坐在草地上。", "mood": "conflict"},
    {"text": "萤火虫奶奶路过：傻孩子，谢谢不说出来，怎么送得到别人心里呢？", "mood": "climax"},
    {"text": "阿栗想起熊奶奶扶它上坡的事，深吸一口气：谢谢……您！", "mood": "climax"},
    {"text": "叮——喇叭里的石子全变成了亮晶晶的星星，飞向熊奶奶家的窗口！", "mood": "climax"},
    {"text": "那晚，熊奶奶梦见漫天星星，醒来心里暖暖的，不知道为什么。", "mood": "warm"},
    {"text": "阿栗的喇叭轻飘飘的——原来谢谢说出口，心里就轻了。", "mood": "warm"},
    {"text": "谢谢说出口，石头也会变星星呀。", "mood": "warm"},
    {"text": "后来，阿栗的谢谢越说越顺口：谢谢蜂鸟！谢谢奶奶！谢谢你们！", "mood": "warm"},
    {"text": "每说一次，喇叭就叮地亮一下，像在为它鼓掌。", "mood": "warm"},
    {"text": "把感谢送到心里，是最温柔的礼物。", "mood": "warm"},
    {"text": "心里装着谢谢的人，走到哪儿都亮亮的。", "mood": "warm"},
    {"text": "谢谢你——听到这句话的人也会发光。", "mood": "warm"},
    {"text": "问问宝贝：今天你想对谁说谢谢呀？如果喜欢，就关注我，明晚继续讲新故事。", "mood": "interact"},
]



async def tts(text: str, out: str, rate: str, pitch: str) -> bool:
    for attempt in range(1, 6):
        try:
            comm = edge_tts.Communicate(text, voice=VOICE, rate=rate, pitch=pitch)
            await comm.save(out)
            if os.path.getsize(out) > 1024:
                return True
            print(f"  retry {attempt}: file too small")
        except Exception as e:  # noqa: BLE001
            print(f"  retry {attempt}: {type(e).__name__}")
        await asyncio.sleep(2 * attempt)
    return False


async def main() -> None:
    slug = sys.argv[1] if len(sys.argv) > 1 else "tui-bu-dong-de-da-nan-gua"
    outdir = os.path.join("public", "assets", slug)
    os.makedirs(outdir, exist_ok=True)

    ok = True
    for i, part in enumerate(PARTS, 1):
        text = part["text"] if isinstance(part, dict) else part
        mood = part.get("mood", "narr") if isinstance(part, dict) else "narr"
        preset = MOOD_PRESETS[mood]
        path = os.path.join(outdir, f"v{i}.mp3")
        if KEEP_EXISTING and i in KEEP_EXISTING and os.path.exists(path) and os.path.getsize(path) > 1024:
            print(f"[{i}/{len(PARTS)}] skip (keep existing)")
            continue
        print(f"[{i}/{len(PARTS)}] mood={mood} {len(text)} chars")
        if not await tts(text, path, preset["rate"], preset["pitch"]):
            print(f"FAILED part {i}")
            ok = False

    if not ok:
        sys.exit(1)

    print("--- frames (ceil+1) ---")
    for i in range(1, len(PARTS) + 1):
        path = os.path.join(outdir, f"v{i}.mp3")
        sec = MP3(path).info.length
        print(f"v{i}: {math.ceil(sec * FPS) + 1}")


if __name__ == "__main__":
    asyncio.run(main())
