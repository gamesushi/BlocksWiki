import type { EditorJsOutput } from './types';

/**
 * 从 Editor.js 内容里派生一个简短标题：
 * 优先取第一个 header 的文字，否则取第一个 paragraph / quote 的首段；
 * 没有则回退到 fallback（通常是 excerpt）。
 * 仅做 HTML 脱标签 + 空白规整，不做长度硬截断（长度交给展示层 clamp）。
 */
export function deriveTitle(
  content?: EditorJsOutput | null,
  fallback?: string | null,
): string {
  const blocks = content?.blocks ?? [];
  let text = '';

  for (const b of blocks) {
    const d = (b.data ?? {}) as Record<string, unknown>;
    const raw = typeof d.text === 'string' ? d.text : '';
    if (b.type === 'header' && raw.trim()) {
      text = raw;
      break;
    }
    if ((b.type === 'paragraph' || b.type === 'quote') && raw.trim()) {
      text = raw;
      break;
    }
  }

  if (!text && fallback) text = fallback;
  text = stripHtml(text).replace(/\s+/g, ' ').trim();

  return text || 'Untitled';
}

function stripHtml(s: string): string {
  return s
    .replace(/<[^>]+>/g, '')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/&#\d+;/g, ' ')
    .trim();
}

/**
 * 用标题字符串生成一个稳定哈希，用于在固定调色板里挑选渐变，
 * 保证同一个 Block 每次渲染出的题图配色一致。
 */
export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}
