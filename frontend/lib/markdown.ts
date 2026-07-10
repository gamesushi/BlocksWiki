import type { EditorJsBlockNode, EditorJsOutput } from './types';

/** 内联 markdown → HTML（Editor.js 的 text 字段就是内联 HTML）。先转义再套标签。 */
function inlineMd(s: string): string {
  let t = s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  t = t.replace(/`([^`]+)`/g, '<code>$1</code>');
  t = t.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
  t = t.replace(/(^|[^*])\*([^*]+)\*/g, '$1<i>$2</i>');
  t = t.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2">$1</a>');
  return t;
}

const SPECIAL = /^(#{1,6}\s|>\s?|[-*]\s+|\d+\.\s+|!\[)/;

/**
 * markdown → Editor.js OutputData（实用子集：标题/段落/列表/引用/图片 + 内联 粗斜体/链接/代码）。
 * 存储层沿用 Editor.js JSON，与既有 RenderBlocks / searchText 反规范化完全兼容。
 */
export function markdownToEditorJs(md: string): EditorJsOutput {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const blocks: EditorJsBlockNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
      continue;
    }

    const img = line.trim().match(/^!\[([^\]]*)\]\(([^)\s]+)\)$/);
    if (img) {
      blocks.push({ type: 'image', data: { file: { url: img[2] }, caption: img[1] } });
      i++;
      continue;
    }

    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      // 忠实 md：# → h1、## → h2、### → h3、#### 及更深 → h4
      blocks.push({ type: 'header', data: { text: inlineMd(h[2]), level: Math.min(h[1].length, 4) } });
      i++;
      continue;
    }

    if (/^>\s?/.test(line)) {
      const text: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        text.push(lines[i].replace(/^>\s?/, ''));
        i++;
      }
      blocks.push({ type: 'quote', data: { text: inlineMd(text.join(' ')), caption: '' } });
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
        items.push(inlineMd(lines[i].replace(/^[-*]\s+/, '')));
        i++;
      }
      blocks.push({ type: 'list', data: { style: 'unordered', items } });
      continue;
    }

    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        items.push(inlineMd(lines[i].replace(/^\d+\.\s+/, '')));
        i++;
      }
      blocks.push({ type: 'list', data: { style: 'ordered', items } });
      continue;
    }

    // 段落：聚合连续的普通行
    const para: string[] = [];
    while (i < lines.length && lines[i].trim() && !SPECIAL.test(lines[i])) {
      para.push(lines[i]);
      i++;
    }
    blocks.push({ type: 'paragraph', data: { text: inlineMd(para.join(' ')) } });
  }

  return { time: Date.now(), version: 'md-1', blocks };
}

/** Editor.js OutputData → HTML（expand 编辑器的「渲染后」预览用；与 RenderBlocks 语义一致）。 */
export function editorJsToHtml(content: EditorJsOutput): string {
  return (content.blocks ?? [])
    .map((b: any) => {
      switch (b.type) {
        case 'header': {
          const lvl = Math.min(Math.max(Number(b.data.level) || 2, 1), 4);
          return `<h${lvl}>${b.data.text ?? ''}</h${lvl}>`;
        }
        case 'paragraph':
          return `<p>${b.data.text ?? ''}</p>`;
        case 'quote':
          return `<blockquote>${b.data.text ?? ''}</blockquote>`;
        case 'list': {
          const tag = b.data.style === 'ordered' ? 'ol' : 'ul';
          const items = (b.data.items ?? [])
            .map((it: any) => `<li>${typeof it === 'string' ? it : it?.content ?? ''}</li>`)
            .join('');
          return `<${tag}>${items}</${tag}>`;
        }
        case 'image': {
          const url = b.data?.file?.url ?? b.data?.url;
          return url ? `<img src="${url}" alt="${b.data.caption ?? ''}" />` : '';
        }
        default:
          return '';
      }
    })
    .join('\n');
}

const IMAGE_EXT = /\.(jpe?g|png|gif|webp|svg|avif)(\?.*)?$/i;
const VIDEO_EXT = /\.(mp4|webm|mov)(\?.*)?$/i;
const VIDEO_HOST = /(youtube\.com|youtu\.be|vimeo\.com|bilibili\.com)/i;

export function isUrl(text: string): boolean {
  return /^https?:\/\/\S+$/i.test(text.trim());
}

/** 粘贴/输入的 URL → 对应类型的 Editor.js 块。图片内嵌，视频/普通链接存为可点链接。 */
export function urlToBlock(url: string): { block: EditorJsBlockNode; blockType: 'image' | 'link' } {
  const u = url.trim();
  if (IMAGE_EXT.test(u)) {
    return { block: { type: 'image', data: { file: { url: u }, caption: '' } }, blockType: 'image' };
  }
  const label = VIDEO_EXT.test(u) || VIDEO_HOST.test(u) ? `🎬 ${u}` : u;
  return { block: { type: 'paragraph', data: { text: `<a href="${u}">${label}</a>` } }, blockType: 'link' };
}
