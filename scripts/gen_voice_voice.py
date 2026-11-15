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

# 《数九歌的小守卫》20 幕 V26（完全原创，冬至卡位 12/21；数九民俗+耐心期待）
KEEP_EXISTING = []
PARTS = [
    {"text": "一天一朵小雪花，数着数着春天就来啦。", "mood": "warm"},
    {"text": "冬至这天，天黑得好早好早。小刺猬球球有点怕：黑夜会不会一直霸占白天呀？", "mood": "conflict"},
    {"text": "山羊爷爷捋捋胡子：别怕，今天是数九第一天，数够九九八十一天，春天就回来啦！", "mood": "setup"},
    {"text": "它把一篮子小雪花交给球球：请你当数九小守卫，每天挂一朵，好吗？", "mood": "setup"},
    {"text": "第一朵挂上去啦！球球念：一九二九不出手——", "mood": "setup"},
    {"text": "三九四九冰上走，五九六九沿河看柳——球球越念越顺口。", "mood": "setup"},
    {"text": "一天一朵，雪花在树枝上越挂越多，白天也一天比一天长。", "mood": "warm"},
    {"text": "可是这天刮起了大风雪，雪花把整棵树都盖住了——挂的雪花找不到了！", "mood": "conflict"},
    {"text": "球球急哭了：我数乱了，春天是不是不来了？", "mood": "climax"},
    {"text": "树懒爷爷慢悠悠地说：别急别急，先数数你身边的雪——第一朵，还在这呢。", "mood": "climax"},
    {"text": "球球擦擦眼泪重新数：从今天这朵开始，一朵一朵慢慢来。", "mood": "warm"},
    {"text": "树枝太高够不着？树懒爷爷慢慢托起球球——高处的雪花也挂上去啦。", "mood": "warm"},
    {"text": "挂着挂着，雪花的数量过了半——天黑得越来越晚，球球不怕黑了。", "mood": "warm"},
    {"text": "它发现：太阳每天多陪它一会儿！原来黑夜真的在一天天变短。", "mood": "warm"},
    {"text": "第八十一朵挂上去的这天清晨——冰裂了，河水叮咚流。", "mood": "climax"},
    {"text": "挂了一冬的雪花落下来，化成亮晶晶的水珠。", "mood": "warm"},
    {"text": "一天一朵小雪花，数着数着春天就来啦。", "mood": "warm"},
    {"text": "枝头冒出粉红的花苞——梅花开了！球球守来了一整个春天。", "mood": "warm"},
    {"text": "再长的黑夜，也会一天一天变短呀。", "mood": "warm"},
    {"text": "问问宝贝：跟着数九歌一起数数吧！如果喜欢，就关注我，明晚继续讲新故事。", "mood": "interact"},
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
