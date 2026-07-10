import type { EditorJsOutput } from './types';

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
}

/** 纯文本 → Editor.js OutputData（双换行分段）。Wiki 编辑性文字与快速采集共用此契约。 */
export function textToContent(text: string): EditorJsOutput {
  return {
    time: Date.now(),
    version: 'text-1',
    blocks: text
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => ({ type: 'paragraph', data: { text: p } })),
  };
}

/** Editor.js OutputData → 纯文本（编辑器回填用） */
export function contentToText(content?: EditorJsOutput | null): string {
  if (!content?.blocks) return '';
  return content.blocks
    .map((b: any) => stripHtml(String(b.data?.text ?? '')))
    .filter(Boolean)
    .join('\n\n');
}
