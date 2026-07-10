/**
 * 极速采集端点 —— iOS 快捷指令（Shortcuts）的入口。
 *
 * POST /api/capture
 * Header: Authorization: Bearer <strapi-jwt>   （快捷指令里配置一次，长期复用）
 * Body:   { text?: string; url?: string; imageBase64?: string; filename?: string }
 *
 * 职责：把碎片输入（分享的文字/链接/照片）组装成 Editor.js OutputData，
 * 写入 Strapi Blocks。这是"地铁上 10 秒采集"的服务端一半。
 */
import { NextRequest, NextResponse } from 'next/server';
import type { EditorJsOutput } from '@/lib/types';

const STRAPI_URL = process.env.STRAPI_URL ?? 'http://localhost:1337';

async function uploadImage(jwt: string, base64: string, filename: string): Promise<string | null> {
  const buffer = Buffer.from(base64, 'base64');
  const form = new FormData();
  form.append('files', new Blob([buffer]), filename);

  const res = await fetch(`${STRAPI_URL}/api/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${jwt}` },
    body: form,
  });
  if (!res.ok) return null;
  const [uploaded] = await res.json();
  return uploaded?.url ?? null;
}

export async function POST(req: NextRequest) {
  const jwt = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!jwt) {
    return NextResponse.json({ error: 'missing bearer token' }, { status: 401 });
  }

  const { text, url, imageBase64, filename } = await req.json().catch(() => ({}));
  if (!text && !url && !imageBase64) {
    return NextResponse.json({ error: 'text / url / imageBase64 至少一项' }, { status: 400 });
  }

  const blocks: EditorJsOutput['blocks'] = [];

  if (imageBase64) {
    const imageUrl = await uploadImage(jwt, imageBase64, filename ?? `capture-${Date.now()}.jpg`);
    if (!imageUrl) {
      return NextResponse.json({ error: '图片上传失败' }, { status: 502 });
    }
    blocks.push({ type: 'image', data: { file: { url: imageUrl }, caption: text ?? '' } });
  } else if (text) {
    for (const para of String(text).split(/\n{2,}/).filter(Boolean)) {
      blocks.push({ type: 'paragraph', data: { text: para.trim() } });
    }
  }
  if (url) {
    blocks.push({
      type: 'paragraph',
      data: { text: `<a href="${String(url)}">${String(url)}</a>` },
    });
  }

  const content: EditorJsOutput = { time: Date.now(), version: 'capture-1', blocks };
  const blockType = imageBase64 ? 'image' : url && !text ? 'link' : 'text';

  const res = await fetch(`${STRAPI_URL}/api/blocks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${jwt}`,
    },
    body: JSON.stringify({ data: { content, blockType } }),
  });

  if (!res.ok) {
    const detail = await res.json().catch(() => null);
    return NextResponse.json(
      { error: detail?.error?.message ?? 'Strapi 写入失败' },
      { status: res.status }
    );
  }

  const { data } = await res.json();
  return NextResponse.json(
    { ok: true, documentId: data.documentId, excerpt: data.excerpt },
    { status: 201 }
  );
}
