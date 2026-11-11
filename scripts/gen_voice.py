# -*- coding: utf-8 -*-
"""生成童声配音（edge-tts），带指数退避重试，实测帧数输出。
用法: python scripts/gen_voice.py <story-slug>
文案写在本文件 PARTS 中，按集改。
"""
import asyncio
import os
import sys
import time

import edge_tts
from mutagen.mp3 import MP3

# 甜美小女生：Xiaoyi = Lively（年轻甜美）；Xiaoxiao = Warm（偏成熟温柔）
VOICE = "zh-CN-XiaoyiNeural"
RATE = "-32%"
PITCH = "+8Hz"
FPS = 30

# 《等一朵花开》20 幕（完全原创，品格·耐心；画中画时间线手法）
# 结构：种种子 → 每天一张「种子睡觉图」 → 忍住三次不扒土 → 第 30 天芽冒出来 → 画铺开时间线
# 出图规范：春日庭院。⚠ 可数防线：无「30天/30张」台词。
PARTS = [
    "种子种下去了，然后呢？",
    "爷爷给了糖糖一颗神奇的种子。",
    "它挖了个小坑，把种子轻轻放进去，盖好土，浇了水。",
    "第二天，糖糖跑去看——土里什么都没有。",
    "它好想扒开土看看。手伸出去，又缩了回来。",
    "它画了一张画：泥土，安安静静。",
    "第三天，泥土。第五天，还是泥土。画攒了厚厚一沓。",
    "爷爷说：种子在土里，也在努力呢。",
    "糖糖想象着：种子在黑黑的土里，悄悄伸着小白根。",
    "这天，它在画里添了一个太阳。",
    "过些天，画里多了一只唱歌的小鸟。",
    "画里慢慢有了云，有了风。",
    "一天早上——土里冒出了一个绿色的小芽！",
    "糖糖高兴得跳了起来！",
    "它画了最新的一张：泥土上，站着一个小芽。",
    "它把所有的画铺开——从泥土，到小芽。",
    "爷爷笑了：你看，等的时候，你也在努力呀。",
    "后来呀，小芽长啊长，开出了一朵大大的花。",
    "等一朵花开，要先学会一天一天地等。",
    "问问宝贝：你等过什么东西呀？如果喜欢，就关注我，明晚继续讲新故事。",
]

async def tts(text: str, out: str) -> bool:
    for attempt in range(1, 6):
        try:
            comm = edge_tts.Communicate(
                text, voice=VOICE, rate=RATE, pitch=PITCH
            )
            await comm.save(out)
            if os.path.getsize(out) > 1024:
                return True
            print(f"  retry {attempt}: file too small")
        except Exception as e:  # noqa: BLE001
            print(f"  retry {attempt}: {type(e).__name__}")
        await asyncio.sleep(2 * attempt)
    return False


async def main() -> None:
    slug = sys.argv[1] if len(sys.argv) > 1 else "gui-tu-sai-pao"
    outdir = os.path.join("public", "assets", slug)
    os.makedirs(outdir, exist_ok=True)

    ok = True
    for i, text in enumerate(PARTS, 1):
        path = os.path.join(outdir, f"v{i}.mp3")
        print(f"[{i}/{len(PARTS)}] {len(text)} chars")
        if not await tts(text, path):
            print(f"FAILED part {i}")
            ok = False

    if not ok:
        sys.exit(1)

    print("--- frames ---")
    total = 0
    for i in range(1, len(PARTS) + 1):
        path = os.path.join(outdir, f"v{i}.mp3")
        sec = MP3(path).info.length
        fr = round(sec * FPS)
        total += fr
        print(f"v{i}: {sec:.3f}s -> {fr} frames")
    print(f"--- total {total} frames ({total / FPS:.1f}s) ---")


if __name__ == "__main__":
    asyncio.run(main())
    time.sleep(0.1)
