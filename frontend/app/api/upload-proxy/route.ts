/**
 * Editor.js 图片上传代理：浏览器 -> Next -> Strapi /api/upload。
 * 目的：JWT 留在 httpOnly cookie 里，前端 JS 永远接触不到 token。
 */
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const STRAPI_URL = process.env.STRAPI_URL ?? 'http://localhost:1337';

export async function POST(req: NextRequest) {
  const jwt = (await cookies()).get('jwt')?.value;
  if (!jwt) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const form = await req.formData();
  const res = await fetch(`${STRAPI_URL}/api/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${jwt}` },
    body: form,
  });

  const payload = await res.json();
  return NextResponse.json(payload, { status: res.status });
}
