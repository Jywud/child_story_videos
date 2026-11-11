/**
 * 渲染入口：每个集在这里注册 Composition + 封面 Still。
 *
 * 模板里已注册 _template-example（带占位图即可预览流程）。
 * 你的新集按下面的注释块复制注册。
 *
 * 注意：Composition id 不能与 Still id 相同；封面 Still id 用 cover-<slug>。
 */
import { Composition, Still } from "remotion";
import { timelineDuration } from "./lib/timeline";
import { W, H, FPS } from "./theme";

import { StoryVideo as StoryVideoExample } from "./stories/_template-example/Video";
import { StoryCover as StoryCoverExample } from "./stories/_template-example/Cover";
import {
  COVER as COVER_EXAMPLE,
  STORY as STORY_EXAMPLE,
} from "./stories/_template-example/constants";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* ── 示例集（clone 后立即可预览） ── */}
      <Composition
        id={STORY_EXAMPLE.id}
        component={StoryVideoExample}
        durationInFrames={timelineDuration(STORY_EXAMPLE.scenes)}
        fps={FPS}
        width={W}
        height={H}
        defaultProps={{ story: STORY_EXAMPLE }}
      />
      <Still
        id={COVER_EXAMPLE.id}
        component={StoryCoverExample}
        width={W}
        height={H}
        defaultProps={{ cover: COVER_EXAMPLE }}
      />

      {/* ── 你的新集：复制下面的注册块，替换 EXAMPLE 为你的缩写 ──
      <Composition
        id={STORY_XXX.id}
        component={StoryVideoXxx}
        durationInFrames={timelineDuration(STORY_XXX.scenes)}
        fps={FPS}
        width={W}
        height={H}
        defaultProps={{ story: STORY_XXX }}
      />
      <Still
        id={COVER_XXX.id}
        component={StoryCoverXxx}
        width={W}
        height={H}
        defaultProps={{ cover: COVER_XXX }}
      />
      ── */}
    </>
  );
};
