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
    "妈妈今天要翻山去采果子，一整天都不在家。小栗的手心，凉凉的。",
    "天刚亮，狐狸妈妈挎起小篮子。今天，小栗要一个人待在家。",
    "小栗抱住妈妈的腿：带我去嘛，我不要你走。",
    "妈妈蹲下来，拉起它的小手：攥紧试试，像我这样。",
    "小栗攥紧了。手心里，真的亮起一点暖暖的光。",
    "妈妈的背影翻过山坡，不见了。小栗站在门口挥手。",
    "屋子里好安静。小栗抱着大尾巴，坐在窗边想妈妈。",
    "它又攥紧小手——那点暖，慢慢又回来了。",
    "眼泪收住了。手心里的小太阳，亮亮的。",
    "吃午饭时，小栗把小手摊在桌上。手心还是暖的。",
    "下午，它一个人搭积木，攥着小手，搭了一座高高的塔。",
    "忽然，草丛里传来哭声。小松鼠的橡果找不到了。",
    "小栗低头看看自己的手心，又看看小松鼠。",
    "它轻轻握住小松鼠的手，把那点暖，悄悄分了过去。",
    "小松鼠不哭了。两个小家伙，笑成了一团。",
    "傍晚，妈妈终于回来了。小栗扑进妈妈怀里。",
    "它摊开小手：妈妈你看，我的手心一直暖着呢！",
    "害怕的时候，攥一攥小手心。",
    "睡前，小栗和妈妈手拉着手，手心暖暖的，像揣着小太阳。",
    "问问宝贝：你害怕的时候，有什么让自己暖起来的好办法？喜欢的话就关注我，明晚继续讲新故事。",
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
