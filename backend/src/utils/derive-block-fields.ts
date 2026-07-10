/**
 * Editor.js JSON -> 反规范化平面字段。lifecycle（写时）与 bootstrap（回填）共用。
 * excerpt: 卡片预览；coverImageUrl: 网格封面；searchText: 全文搜索语料（$containsi / LIKE）。
 */

type EditorJsBlock = { type: string; data: Record<string, any> };

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
}

export function deriveBlockFields(content: { blocks?: EditorJsBlock[] }) {
  const blocks = content?.blocks ?? [];

  const firstText = blocks.find((b) => ['paragraph', 'header', 'quote'].includes(b.type));
  const excerpt = firstText ? stripHtml(String(firstText.data.text ?? '')).slice(0, 240) : '';

  const firstImage = blocks.find((b) => b.type === 'image');
  const coverImageUrl = firstImage
    ? String(firstImage.data?.file?.url ?? firstImage.data?.url ?? '')
    : '';

  const texts: string[] = [];
  for (const b of blocks) {
    if (typeof b.data?.text === 'string') texts.push(stripHtml(b.data.text));
    if (typeof b.data?.caption === 'string') texts.push(stripHtml(b.data.caption));
    if (Array.isArray(b.data?.items)) {
      for (const item of b.data.items) {
        texts.push(stripHtml(typeof item === 'string' ? item : String(item?.content ?? '')));
      }
    }
  }
  const searchText = texts.filter(Boolean).join(' ').slice(0, 5000);

  return { excerpt, coverImageUrl, searchText };
}
