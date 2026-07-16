/**
 * Editor.js JSON -> React 渲染器（服务端组件可用，零客户端 JS）。
 * Editor.js 的 text 字段是受控的内联 HTML（b/i/a/mark）；
 * 放行 Link 工具后用户可注入任意 <a>，故用 isomorphic-dompurify 净化后再注入，
 * 防 XSS（如 javascript: 伪协议）。仅白名单内标签/属性通过。
 */
import DOMPurify from 'isomorphic-dompurify';
import type { EditorJsBlockNode, EditorJsOutput } from './types';

const ALLOWED_TAGS = [
  'p', 'br', 'h1', 'h2', 'h3', 'h4',
  'ul', 'ol', 'li', 'blockquote',
  'b', 'i', 'em', 'strong', 'mark', 'a', 'span',
];
const ALLOWED_ATTR = ['href', 'target', 'rel', 'class', 'title'];

function Inline({ html }: { html: string }) {
  const clean = DOMPurify.sanitize(html ?? '', {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
  });
  return <span dangerouslySetInnerHTML={{ __html: clean }} />;
}

function renderNode(node: EditorJsBlockNode, i: number) {
  switch (node.type) {
    case 'header': {
      const lvl = Math.min(Math.max(Number(node.data.level) || 2, 1), 4) as 1 | 2 | 3 | 4;
      const Tag = `h${lvl}` as const;
      const sizeCls = {
        1: 'text-2xl font-semibold',
        2: 'text-xl font-semibold',
        3: 'text-lg font-medium',
        4: 'text-base font-medium',
      }[lvl];
      return (
        <Tag key={i} className={`${sizeCls} tracking-tight`}>
          <Inline html={String(node.data.text ?? '')} />
        </Tag>
      );
    }
    case 'paragraph':
      return (
        <p key={i} className="leading-relaxed text-neutral-700">
          <Inline html={String(node.data.text ?? '')} />
        </p>
      );
    case 'list': {
      const Tag = node.data.style === 'ordered' ? 'ol' : 'ul';
      const items: any[] = node.data.items ?? [];
      return (
        <Tag key={i} className="list-inside list-disc space-y-1 text-neutral-700">
          {items.map((item, j) => (
            <li key={j}>
              <Inline html={typeof item === 'string' ? item : String(item?.content ?? '')} />
            </li>
          ))}
        </Tag>
      );
    }
    case 'quote':
      return (
        <blockquote key={i} className="border-l-2 border-neutral-300 pl-3 text-neutral-500">
          <Inline html={String(node.data.text ?? '')} />
        </blockquote>
      );
    case 'image': {
      const url = node.data?.file?.url ?? node.data?.url;
      if (!url) return null;
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={i} src={url} alt={String(node.data.caption ?? '')} className="w-full rounded" />
      );
    }
    default:
      return null; // 未知块类型静默跳过，保证前向兼容
  }
}

export function RenderBlocks({ content }: { content: EditorJsOutput }) {
  return <div className="space-y-3">{content.blocks.map(renderNode)}</div>;
}
