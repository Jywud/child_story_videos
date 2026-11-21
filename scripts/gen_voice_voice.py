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

# 《新年第一片雪花》20 幕 V27（完全原创，元旦 1/1 卡位；善意回音）
KEEP_EXISTING = []
PARTS = [
    {"text": "好运不是抢来的，是帮过你的人悄悄还给你的。", "mood": "warm"},
    {"text": "山羊爷爷说：元旦清晨的第一片雪花，接住它的人一整年都有好运气。", "mood": "setup"},
    {"text": "小兔朵朵天不亮就爬起来，戴上围巾冲进雪地——今天一定要接到它！", "mood": "setup"},
    {"text": "雪花飘下来了！朵朵跳起来伸手——雪花却轻飘飘落在了别人家的院子里。", "mood": "conflict"},
    {"text": "又一片！它追着雪跑过山坡——雪花稳稳落在了老橡树的树杈上。", "mood": "conflict"},
    {"text": "再来！它把手举得高高的——雪花偏偏落在了路过的鹿奶奶的手心里。", "mood": "conflict"},
    {"text": "太阳升起来了，雪停了。朵朵一片也没接到，耳朵都耷拉下来了。", "mood": "conflict"},
    {"text": "它垂着耳朵往家走：我今天帮别人扫了雪、扶了老橡树、给小鸟喂了饭……可是好运呢？", "mood": "conflict"},
    {"text": "到家门口——咦？门把上挂着什么东西，亮晶晶的！", "mood": "climax"},
    {"text": "是一颗大松果！鳞片里冻着一片雪花，在晨光里闪闪发光。", "mood": "climax"},
    {"text": "松果上系着小木牌，是树懒爷爷的笔迹：谢谢小朵朵昨天帮我扫雪——这是给你的新年好运。", "mood": "climax"},
    {"text": "朵朵想起来了——昨天它扫雪时，树懒爷爷就在树枝上看呢！", "mood": "warm"},
    {"text": "原来它帮过的人，都悄悄记着它：老橡树把最暖的树洞借它避过风，小鸟每天都来陪它说话。", "mood": "warm"},
    {"text": "好运不是抢来的，是帮过你的人悄悄还给你的。", "mood": "warm"},
    {"text": "朵朵把松果挂上窗台——雪花在松果里亮亮的，像一颗小星星。", "mood": "warm"},
    {"text": "它趴在窗边想：明年，我要帮更多的人——这样好运就会像雪花一样，一片一片落回我手里。", "mood": "warm"},
    {"text": "你帮过的人，都会悄悄记着你。", "mood": "warm"},
    {"text": "元旦夜里，松果里的雪花在月光下一闪一闪，像在对朵朵眨眼睛。", "mood": "warm"},
    {"text": "善意是会回来的，就像雪花总会落下。", "mood": "warm"},
    {"text": "问问宝贝：你想先帮谁一个小忙呀？如果喜欢，就关注我，明晚继续讲新故事。", "mood": "interact"},
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
