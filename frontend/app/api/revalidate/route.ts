/**
 * 缓存失效端点。两个用途：
 * 1. Strapi Webhook（Settings → Webhooks，entry.update/delete 时 POST 过来）——
 *    覆盖不经过本站 server action 的内容变更（如管理后台编辑、脚本导入）。
 * 2. 开发期手动失效。
 *
 * POST /api/revalidate?tag=channel:xxx
 * Header: x-revalidate-secret: <REVALIDATE_SECRET>
 */
import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';

export async function POST(req: NextRequest) {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret || req.headers.get('x-revalidate-secret') !== secret) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const tag = req.nextUrl.searchParams.get('tag');
  if (!tag) {
    return NextResponse.json({ error: 'tag query param required' }, { status: 400 });
  }

  // Route Handler 里不能用 updateTag（仅限 Server Action）；
  // 'max' = stale-while-revalidate，webhook 场景可接受短暂陈旧
  revalidateTag(tag, 'max');
  return NextResponse.json({ ok: true, tag, revalidatedAt: new Date().toISOString() });
}
