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

# 《手心的小太阳》20 幕（完全原创，情绪管理·分离焦虑）
# 结构：妈妈出门 → 小栗独自在家害怕 → 攥手心攥出暖 → 把暖分给小松鼠 → 放学手心一直暖着
# ⚠ 版权差异化：不是「妈妈给掌心魔法」（魔法亲亲），而是孩子自己攥出暖、还能传给别人
# ⚠ 可数防线：全程不数光点个数，只说「一点暖暖的光」
# ⚠ 多音字：全篇无「影」字（edge-tts 会读成 yìng）
PARTS = [
    "小兔把小獾撞了一个跟头，小獾的浆果滚了一地。对不起之后，一定要马上原谅吗？",
    "春天的草地上，小兔跑得太快，撞翻了小獾的浆果篮。",
    "紫红的浆果滚进草丛，小獾愣在原地。",
    "小兔连忙说：对不起，我不是故意的！",
    "小獾张了张嘴，那句没关系，卡在嗓子眼。",
    "小兔等着，可是等了好一会儿。",
    "它有点着急：我都道歉了，你怎么还不原谅我？",
    "小獾小声说：我还没准备好说没关系。",
    "说完，小獾转过身，一个人走到大树下。",
    "小兔愣住了，蹲下来，把浆果一颗一颗捡回篮子。",
    "它摘了一朵小粉花，轻轻放在小獾脚边。",
    "小兔没有催它，悄悄走开了。",
    "小獾低头看着那朵花，气鼓鼓地坐下。",
    "风一吹，花瓣轻轻晃了晃。",
    "小獾想起小兔慌张的样子，其实它也不是故意的。",
    "等呀等，那团气，自己慢慢走掉了。",
    "小獾拿起那朵花，朝小兔走去。",
    "它把花递过去：我气完了，我们和好吧。",
    "原谅可以慢慢来，你说了，就是真的。",
    "问问宝贝：你生气的时候，希望别人怎么等你呀？喜欢的话就关注我，明晚继续讲新故事。",
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
