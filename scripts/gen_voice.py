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
RATE = "-25%"
PITCH = "+8Hz"
FPS = 30

# 《再搭一次》20 幕（完全原创，情绪管理·怕失败不敢再试）
# 结构：小狐狸想搭高塔送妈妈 → 塔倒了赌气不搭 → 看小鸟搭窝 → 妈妈默默陪伴递积木
#       → 重新一块块稳稳搭起 → 明白最棒的不是塔多高，是倒了还愿意再来
# ⚠ 版权差异化：市面同名绘本《输了也没关系》是跑步比赛/足球赛/小兔朵朵，
#   本集换成「搭积木塔 + 小狐狸 + 小鸟搭窝启发 + 妈妈不说话只递积木」，角色/情节/寓意全原创
# ⚠ 一图多句：15 张图 20 幕，s5/s6/s8/s10/s14 各由同一张图配 2-3 句
# ⚠ 可数防线：全程不数积木块数，只说「一块一块」「越叠越高」
# ⚠ 多音字：全篇无「影」字（edge-tts 会读成 yìng）
PARTS = [
    "小狐狸辛辛苦苦搭的高塔，哗啦一声倒了。它赌气说，再也不搭了。可这座塔，真的要就这样算了吗？",
    "小狐狸想送妈妈一件礼物，一座搭得高高的积木塔。",
    "它把原木色的小积木，一块一块往上叠。",
    "塔越长越高，快够到窗台了，小狐狸高兴极了。",
    "可就在这时，塔身轻轻晃了晃。",
    "哗啦一声，积木撒了一地，全散开了。",
    "小狐狸蹲在积木堆旁，望着满地的小木块。",
    "它的鼻子酸酸的，眼睛也慢慢红了。",
    "它小声嘀咕：我搭不好，我再也不搭了。",
    "它趴在窗边，看见屋檐下有只小鸟。",
    "小鸟衔来一根小树枝，窝被风吹歪了，又一点点搭回去。",
    "妈妈走过来，没有说一句没关系，也没有讲道理。",
    "她只是轻轻坐到小狐狸身边，陪着它。",
    "过了一会儿，妈妈捡起一块积木，放到它手心里。",
    "小狐狸吸了吸鼻子，慢慢把那块积木接了过去。",
    "这一次，它叠得很慢，一块歪了，就轻轻扶正。",
    "塔，又一点一点立起来了，比刚才还稳。",
    "妈妈看着它，眼睛弯弯的，把它轻轻抱住。",
    "搭得高不高没关系，倒了还愿意再来一次，才是最棒的。",
    "问问宝贝：你有没有一件想放弃的事？再试一次，会怎么样呢？喜欢的话就关注我，明晚继续讲新故事。",
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
