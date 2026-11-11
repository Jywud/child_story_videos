import React, { useEffect } from "react";
import { Composition, Still, continueRender, delayRender } from "remotion";
import { StoryVideo as StoryVideoMa } from "./stories/xiao-ma-guo-he/Video";
import { StoryCover as StoryCoverMa } from "./stories/xiao-ma-guo-he/Cover";
import {
  COVER as COVER_MA,
  STORY as STORY_MA,
} from "./stories/xiao-ma-guo-he/constants";
import { StoryVideo as StoryVideoKe } from "./stories/xiao-ke-dou-zhao-ma-ma/Video";
import { StoryCover as StoryCoverKe } from "./stories/xiao-ke-dou-zhao-ma-ma/Cover";
import {
  COVER as COVER_KE,
  STORY as STORY_KE,
} from "./stories/xiao-ke-dou-zhao-ma-ma/constants";
import { StoryVideo as StoryVideoXue } from "./stories/xue-hai-zi/Video";
import { StoryCover as StoryCoverXue } from "./stories/xue-hai-zi/Cover";
import {
  COVER as COVER_XUE,
  STORY as STORY_XUE,
} from "./stories/xue-hai-zi/constants";
import { StoryVideo as StoryVideoChang } from "./stories/chang-e-ben-yue/Video";
import { StoryCover as StoryCoverChang } from "./stories/chang-e-ben-yue/Cover";
import {
  COVER as COVER_CHANG,
  STORY as STORY_CHANG,
} from "./stories/chang-e-ben-yue/constants";
import { StoryVideo as StoryVideoCao } from "./stories/cao-chong-cheng-xiang/Video";
import { StoryCover as StoryCoverCao } from "./stories/cao-chong-cheng-xiang/Cover";
import {
  COVER as COVER_CAO,
  STORY as STORY_CAO,
} from "./stories/cao-chong-cheng-xiang/constants";
import { StoryVideo as StoryVideoSima } from "./stories/si-ma-guang-za-gang/Video";
import { StoryCover as StoryCoverSima } from "./stories/si-ma-guang-za-gang/Cover";
import {
  COVER as COVER_SIMA,
  STORY as STORY_SIMA,
} from "./stories/si-ma-guang-za-gang/constants";
import { StoryVideo as StoryVideoMoon } from "./stories/wo-ai-ni-yue-liang/Video";
import { StoryCover as StoryCoverMoon } from "./stories/wo-ai-ni-yue-liang/Cover";
import {
  COVER as COVER_MOON,
  STORY as STORY_MOON,
} from "./stories/wo-ai-ni-yue-liang/constants";
import { StoryVideo as StoryVideoHua } from "./stories/qi-cai-hua/Video";
import { StoryCover as StoryCoverHua } from "./stories/qi-cai-hua/Cover";
import {
  COVER as COVER_HUA,
  STORY as STORY_HUA,
} from "./stories/qi-cai-hua/constants";
import { StoryVideo as StoryVideoCi } from "./stories/kou-dai-li-de-ci/Video";
import { StoryCover as StoryCoverCi } from "./stories/kou-dai-li-de-ci/Cover";
import {
  COVER as COVER_CI,
  STORY as STORY_CI,
} from "./stories/kou-dai-li-de-ci/constants";
import { StoryVideo as StoryVideoYu } from "./stories/man-ban-pai-de-xiao-yu-dian/Video";
import { StoryCover as StoryCoverYu } from "./stories/man-ban-pai-de-xiao-yu-dian/Cover";
import {
  COVER as COVER_YU,
  STORY as STORY_YU,
} from "./stories/man-ban-pai-de-xiao-yu-dian/constants";
import { StoryVideo as StoryVideoTun } from "./stories/qi-gu-gu-de-xiao-he-tun/Video";
import { StoryCover as StoryCoverTun } from "./stories/qi-gu-gu-de-xiao-he-tun/Cover";
import {
  COVER as COVER_TUN,
  STORY as STORY_TUN,
} from "./stories/qi-gu-gu-de-xiao-he-tun/constants";
import { StoryVideo as StoryVideoPa } from "./stories/dou-dou-he-pa-pa/Video";
import { StoryCover as StoryCoverPa } from "./stories/dou-dou-he-pa-pa/Cover";
import {
  COVER as COVER_PA,
  STORY as STORY_PA,
} from "./stories/dou-dou-he-pa-pa/constants";
import { StoryVideo as StoryVideoGan } from "./stories/ban-kuai-xiao-bing-gan/Video";
import { StoryCover as StoryCoverGan } from "./stories/ban-kuai-xiao-bing-gan/Cover";
import {
  COVER as COVER_GAN,
  STORY as STORY_GAN,
} from "./stories/ban-kuai-xiao-bing-gan/constants";
import { StoryVideo as StoryVideoGou } from "./stories/la-gou-gou/Video";
import { StoryCover as StoryCoverGou } from "./stories/la-gou-gou/Cover";
import {
  COVER as COVER_GOU,
  STORY as STORY_GOU,
} from "./stories/la-gou-gou/constants";
import { StoryVideo as StoryVideoKai } from "./stories/deng-yi-duo-hua-kai/Video";
import { StoryCover as StoryCoverKai } from "./stories/deng-yi-duo-hua-kai/Cover";
import {
  COVER as COVER_KAI,
  STORY as STORY_KAI,
} from "./stories/deng-yi-duo-hua-kai/constants";
import { StoryVideo as StoryVideoGua } from "./stories/tui-bu-dong-de-da-nan-gua/Video";
import { StoryCover as StoryCoverGua } from "./stories/tui-bu-dong-de-da-nan-gua/Cover";
import {
  COVER as COVER_GUA,
  STORY as STORY_GUA,
} from "./stories/tui-bu-dong-de-da-nan-gua/constants";
import { StoryVideo as StoryVideoDai } from "./stories/kan-bu-jian-de-kou-dai/Video";
import { StoryCover as StoryCoverDai } from "./stories/kan-bu-jian-de-kou-dai/Cover";
import {
  COVER as COVER_DAI,
  STORY as STORY_DAI,
} from "./stories/kan-bu-jian-de-kou-dai/constants";
import { StoryVideo as StoryVideoLiu } from "./stories/lun-liu-de-xiao-qiu-qian/Video";
import { StoryCover as StoryCoverLiu } from "./stories/lun-liu-de-xiao-qiu-qian/Cover";
import {
  COVER as COVER_LIU,
  STORY as STORY_LIU,
} from "./stories/lun-liu-de-xiao-qiu-qian/constants";
import { StoryVideo as StoryVideoMo } from "./stories/hui-mo-fa-de-xiao-zhen-guan/Video";
import { StoryCover as StoryCoverMo } from "./stories/hui-mo-fa-de-xiao-zhen-guan/Cover";
import {
  COVER as COVER_MO,
  STORY as STORY_MO2,
} from "./stories/hui-mo-fa-de-xiao-zhen-guan/constants";
import { StoryVideo as StoryVideoJin } from "./stories/bu-ting-hua-de-xiao-wei-jin/Video";
import { StoryCover as StoryCoverJin } from "./stories/bu-ting-hua-de-xiao-wei-jin/Cover";
import {
  COVER as COVER_JIN,
  STORY as STORY_JIN,
} from "./stories/bu-ting-hua-de-xiao-wei-jin/constants";
import { StoryVideo as StoryVideoYing } from "./stories/duo-duo-he-xiao-ying-zi/Video";
import { StoryCover as StoryCoverYing } from "./stories/duo-duo-he-xiao-ying-zi/Cover";
import {
  COVER as COVER_YING,
  STORY as STORY_YING,
} from "./stories/duo-duo-he-xiao-ying-zi/constants";
import { StoryVideo as StoryVideoXiong } from "./stories/xiang-kan-dong-tian-de-xiao-xiong/Video";
import { StoryCover as StoryCoverXiong } from "./stories/xiang-kan-dong-tian-de-xiao-xiong/Cover";
import {
  COVER as COVER_XIONG,
  STORY as STORY_XIONG,
} from "./stories/xiang-kan-dong-tian-de-xiao-xiong/constants";
import { StoryVideo as StoryVideoWei } from "./stories/duo-zai-shu-hou-de-xiao-ci-wei/Video";
import { StoryCover as StoryCoverWei } from "./stories/duo-zai-shu-hou-de-xiao-ci-wei/Cover";
import {
  COVER as COVER_WEI,
  STORY as STORY_WEI,
} from "./stories/duo-zai-shu-hou-de-xiao-ci-wei/constants";
import { StoryVideo as StoryVideoBa } from "./stories/hui-shuo-xie-xie-de-xiao-la-ba/Video";
import { StoryCover as StoryCoverBa } from "./stories/hui-shuo-xie-xie-de-xiao-la-ba/Cover";
import {
  COVER as COVER_BA,
  STORY as STORY_BA,
} from "./stories/hui-shuo-xie-xie-de-xiao-la-ba/constants";
import { timelineDuration } from "./lib/timeline";
import { loadDisplayFont } from "./lib/fonts";
import { FPS, H, W } from "./theme";

/**
 * 字体必须在**组件 useEffect 里**注册 delayRender 才能被渲染器记到账上。
 * 曾经写在 lib/fonts.ts 的模块作用域，continueRender 变成空操作，
 * 整片渲染跑到第 800 多帧时抛
 * `delayRender() "加载站酷快乐体" was called but not cleared after 28000ms`。
 * 单帧 still 看不出问题（在超时前就渲染完了）。
 */
const useDisplayFont = () => {
  useEffect(() => {
    const handle = delayRender("加载站酷快乐体");
    loadDisplayFont().finally(() => continueRender(handle));
  }, []);
};

export const RemotionRoot: React.FC = () => {
  useDisplayFont();

  return (
    <>
      <Composition
        id={STORY_MA.id}
        component={StoryVideoMa}
        durationInFrames={timelineDuration(STORY_MA.scenes)}
        fps={FPS}
        width={W}
        height={H}
        defaultProps={{ story: STORY_MA }}
      />
      <Still
        id={COVER_MA.id}
        component={StoryCoverMa}
        width={W}
        height={H}
        defaultProps={{ cover: COVER_MA }}
      />

      <Composition
        id={STORY_KE.id}
        component={StoryVideoKe}
        durationInFrames={timelineDuration(STORY_KE.scenes)}
        fps={FPS}
        width={W}
        height={H}
        defaultProps={{ story: STORY_KE }}
      />
      <Still
        id={COVER_KE.id}
        component={StoryCoverKe}
        width={W}
        height={H}
        defaultProps={{ cover: COVER_KE }}
      />

      <Composition
        id={STORY_XUE.id}
        component={StoryVideoXue}
        durationInFrames={timelineDuration(STORY_XUE.scenes)}
        fps={FPS}
        width={W}
        height={H}
        defaultProps={{ story: STORY_XUE }}
      />
      <Still
        id={COVER_XUE.id}
        component={StoryCoverXue}
        width={W}
        height={H}
        defaultProps={{ cover: COVER_XUE }}
      />

      <Composition
        id={STORY_CHANG.id}
        component={StoryVideoChang}
        durationInFrames={timelineDuration(STORY_CHANG.scenes)}
        fps={FPS}
        width={W}
        height={H}
        defaultProps={{ story: STORY_CHANG }}
      />
      <Still
        id={COVER_CHANG.id}
        component={StoryCoverChang}
        width={W}
        height={H}
        defaultProps={{ cover: COVER_CHANG }}
      />

      <Composition
        id={STORY_CAO.id}
        component={StoryVideoCao}
        durationInFrames={timelineDuration(STORY_CAO.scenes)}
        fps={FPS}
        width={W}
        height={H}
        defaultProps={{ story: STORY_CAO }}
      />
      <Still
        id={COVER_CAO.id}
        component={StoryCoverCao}
        width={W}
        height={H}
        defaultProps={{ cover: COVER_CAO }}
      />

      <Composition
        id={STORY_SIMA.id}
        component={StoryVideoSima}
        durationInFrames={timelineDuration(STORY_SIMA.scenes)}
        fps={FPS}
        width={W}
        height={H}
        defaultProps={{ story: STORY_SIMA }}
      />
      <Still
        id={COVER_SIMA.id}
        component={StoryCoverSima}
        width={W}
        height={H}
        defaultProps={{ cover: COVER_SIMA }}
      />

      <Composition
        id={STORY_MOON.id}
        component={StoryVideoMoon}
        durationInFrames={timelineDuration(STORY_MOON.scenes)}
        fps={FPS}
        width={W}
        height={H}
        defaultProps={{ story: STORY_MOON }}
      />
      <Still
        id={COVER_MOON.id}
        component={StoryCoverMoon}
        width={W}
        height={H}
        defaultProps={{ cover: COVER_MOON }}
      />

      <Composition
        id={STORY_HUA.id}
        component={StoryVideoHua}
        durationInFrames={timelineDuration(STORY_HUA.scenes)}
        fps={FPS}
        width={W}
        height={H}
        defaultProps={{ story: STORY_HUA }}
      />
      <Still
        id={COVER_HUA.id}
        component={StoryCoverHua}
        width={W}
        height={H}
        defaultProps={{ cover: COVER_HUA }}
      />

      <Composition
        id={STORY_CI.id}
        component={StoryVideoCi}
        durationInFrames={timelineDuration(STORY_CI.scenes)}
        fps={FPS}
        width={W}
        height={H}
        defaultProps={{ story: STORY_CI }}
      />
      <Still
        id={COVER_CI.id}
        component={StoryCoverCi}
        width={W}
        height={H}
        defaultProps={{ cover: COVER_CI }}
      />

      <Composition
        id={STORY_YU.id}
        component={StoryVideoYu}
        durationInFrames={timelineDuration(STORY_YU.scenes)}
        fps={FPS}
        width={W}
        height={H}
        defaultProps={{ story: STORY_YU }}
      />
      <Still
        id={COVER_YU.id}
        component={StoryCoverYu}
        width={W}
        height={H}
        defaultProps={{ cover: COVER_YU }}
      />

      <Composition
        id={STORY_TUN.id}
        component={StoryVideoTun}
        durationInFrames={timelineDuration(STORY_TUN.scenes)}
        fps={FPS}
        width={W}
        height={H}
        defaultProps={{ story: STORY_TUN }}
      />
      <Still
        id={COVER_TUN.id}
        component={StoryCoverTun}
        width={W}
        height={H}
        defaultProps={{ cover: COVER_TUN }}
      />

      <Composition
        id={STORY_PA.id}
        component={StoryVideoPa}
        durationInFrames={timelineDuration(STORY_PA.scenes)}
        fps={FPS}
        width={W}
        height={H}
        defaultProps={{ story: STORY_PA }}
      />
      <Still
        id={COVER_PA.id}
        component={StoryCoverPa}
        width={W}
        height={H}
        defaultProps={{ cover: COVER_PA }}
      />

      <Composition
        id={STORY_GAN.id}
        component={StoryVideoGan}
        durationInFrames={timelineDuration(STORY_GAN.scenes)}
        fps={FPS}
        width={W}
        height={H}
        defaultProps={{ story: STORY_GAN }}
      />
      <Still
        id={COVER_GAN.id}
        component={StoryCoverGan}
        width={W}
        height={H}
        defaultProps={{ cover: COVER_GAN }}
      />

      <Composition
        id={STORY_GOU.id}
        component={StoryVideoGou}
        durationInFrames={timelineDuration(STORY_GOU.scenes)}
        fps={FPS}
        width={W}
        height={H}
        defaultProps={{ story: STORY_GOU }}
      />
      <Still
        id={COVER_GOU.id}
        component={StoryCoverGou}
        width={W}
        height={H}
        defaultProps={{ cover: COVER_GOU }}
      />

      <Composition
        id={STORY_KAI.id}
        component={StoryVideoKai}
        durationInFrames={timelineDuration(STORY_KAI.scenes)}
        fps={FPS}
        width={W}
        height={H}
        defaultProps={{ story: STORY_KAI }}
      />
      <Still
        id={COVER_KAI.id}
        component={StoryCoverKai}
        width={W}
        height={H}
        defaultProps={{ cover: COVER_KAI }}
      />

      <Composition
        id={STORY_GUA.id}
        component={StoryVideoGua}
        durationInFrames={timelineDuration(STORY_GUA.scenes)}
        fps={FPS}
        width={W}
        height={H}
        defaultProps={{ story: STORY_GUA }}
      />
      <Still
        id={COVER_GUA.id}
        component={StoryCoverGua}
        width={W}
        height={H}
        defaultProps={{ cover: COVER_GUA }}
      />

      <Composition
        id={STORY_DAI.id}
        component={StoryVideoDai}
        durationInFrames={timelineDuration(STORY_DAI.scenes)}
        fps={FPS}
        width={W}
        height={H}
        defaultProps={{ story: STORY_DAI }}
      />
      <Still
        id={COVER_DAI.id}
        component={StoryCoverDai}
        width={W}
        height={H}
        defaultProps={{ cover: COVER_DAI }}
      />

      <Composition
        id={STORY_LIU.id}
        component={StoryVideoLiu}
        durationInFrames={timelineDuration(STORY_LIU.scenes)}
        fps={FPS}
        width={W}
        height={H}
        defaultProps={{ story: STORY_LIU }}
      />
      <Still
        id={COVER_LIU.id}
        component={StoryCoverLiu}
        width={W}
        height={H}
        defaultProps={{ cover: COVER_LIU }}
      />

      <Composition
        id={STORY_MO2.id}
        component={StoryVideoMo}
        durationInFrames={timelineDuration(STORY_MO2.scenes)}
        fps={FPS}
        width={W}
        height={H}
        defaultProps={{ story: STORY_MO2 }}
      />
      <Still
        id={COVER_MO.id}
        component={StoryCoverMo}
        width={W}
        height={H}
        defaultProps={{ cover: COVER_MO }}
      />

      <Composition
        id={STORY_JIN.id}
        component={StoryVideoJin}
        durationInFrames={timelineDuration(STORY_JIN.scenes)}
        fps={FPS}
        width={W}
        height={H}
        defaultProps={{ story: STORY_JIN }}
      />
      <Still
        id={COVER_JIN.id}
        component={StoryCoverJin}
        width={W}
        height={H}
        defaultProps={{ cover: COVER_JIN }}
      />

      <Composition
        id={STORY_YING.id}
        component={StoryVideoYing}
        durationInFrames={timelineDuration(STORY_YING.scenes)}
        fps={FPS}
        width={W}
        height={H}
        defaultProps={{ story: STORY_YING }}
      />
      <Still
        id={COVER_YING.id}
        component={StoryCoverYing}
        width={W}
        height={H}
        defaultProps={{ cover: COVER_YING }}
      />

      <Composition
        id={STORY_XIONG.id}
        component={StoryVideoXiong}
        durationInFrames={timelineDuration(STORY_XIONG.scenes)}
        fps={FPS}
        width={W}
        height={H}
        defaultProps={{ story: STORY_XIONG }}
      />
      <Still
        id={COVER_XIONG.id}
        component={StoryCoverXiong}
        width={W}
        height={H}
        defaultProps={{ cover: COVER_XIONG }}
      />

      <Composition
        id={STORY_WEI.id}
        component={StoryVideoWei}
        durationInFrames={timelineDuration(STORY_WEI.scenes)}
        fps={FPS}
        width={W}
        height={H}
        defaultProps={{ story: STORY_WEI }}
      />
      <Still
        id={COVER_WEI.id}
        component={StoryCoverWei}
        width={W}
        height={H}
        defaultProps={{ cover: COVER_WEI }}
      />

      <Composition
        id={STORY_BA.id}
        component={StoryVideoBa}
        durationInFrames={timelineDuration(STORY_BA.scenes)}
        fps={FPS}
        width={W}
        height={H}
        defaultProps={{ story: STORY_BA }}
      />
      <Still
        id={COVER_BA.id}
        component={StoryCoverBa}
        width={W}
        height={H}
        defaultProps={{ cover: COVER_BA }}
      />
    </>
  );
};
