import type { Block } from '@/lib/types';
import { deriveTitle, hashString } from '@/lib/block-title';

/**
 * Block 题图（cover）：
 * - 若 block.coverImageUrl 存在 → 直接显示这张真图（用户上传 / 外链）。
 * - 否则 → 根据「标题」哈希，从品牌色板（蓝绿紫马赛克）里挑一对渐变，
 *   叠加美术字标题 + 创作者署名，零后端改动、对所有历史 Block 立刻生效。
 *
 * 纯展示组件（无 hooks / 无状态），可在服务端组件（详情页）与客户端组件（卡片）里通用。
 * 尺寸与裁切由调用方通过 className 控制（如 h-[calc(100%-3px)] / h-52）。
 */
const PALETTES: [string, string][] = [
  ['#1e3a8f', '#0e7490'], // 蓝 → 青
  ['#4f46e5', '#0ea5e9'], // 靛 → 天蓝
  ['#047857', '#0891b2'], // 翠 → 水蓝
  ['#6d28d', '#2563eb'], // 紫 → 蓝
  ['#0f766e', '#7c3aed'], // 松石 → 紫
  ['#1d4ed8', '#9333ea'], // 蓝 → 品红
  ['#155e75', '#4f46e5'], // 青 → 靛
  ['#3730a3', '#0d9488'], // 深蓝 → 青绿
];

export function BlockCover({
  block,
  className = '',
  showCaption = true,
}: {
  block: Pick<
    Block,
    'coverImageUrl' | 'content' | 'excerpt' | 'creatorName' | 'blockType'
  >;
  className?: string;
  showCaption?: boolean;
}) {
  // ① 有真图：直接用
  if (block.coverImageUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={block.coverImageUrl}
        alt=""
        className={`object-cover ${className}`}
      />
    );
  }

  // ② 没有：根据标题哈希生成美术字渐变题图
  const title = deriveTitle(block.content, block.excerpt);
  const [c1, c2] = PALETTES[hashString(title) % PALETTES.length];
  const caption =
    block.creatorName
      ? `by ${block.creatorName}`
      : block.blockType && block.blockType !== 'text'
        ? block.blockType
        : '';

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{
        background: `linear-gradient(135deg, ${c1} 0%, ${c2} 100%)`,
      }}
    >
      {/* 装饰：呼应 Logo 的马赛克圆点 */}
      <svg
        className="absolute inset-0 h-full w-full opacity-25"
        preserveAspectRatio="xMidYMid slice"
        viewBox="0 0 100 100"
        aria-hidden="true"
      >
        <circle cx="78" cy="22" r="16" fill="#ffffff" />
        <circle cx="89" cy="41" r="9" fill="#ffffff" />
        <circle cx="70" cy="60" r="6" fill="#ffffff" />
        <circle cx="18" cy="82" r="13" fill="#ffffff" />
        <circle cx="30" cy="70" r="5" fill="#ffffff" />
      </svg>

      {/* 文字层 */}
      <div className="relative z-10 flex h-full w-full flex-col justify-center px-6 py-5 sm:px-8">
        <p className="line-clamp-3 text-balance text-lg font-semibold leading-snug text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.35)] sm:text-2xl">
          {title}
        </p>
        {showCaption && caption && (
          <p className="mt-2 text-[11px] font-medium uppercase tracking-widest text-white/70">
            {caption}
          </p>
        )}
      </div>
    </div>
  );
}
