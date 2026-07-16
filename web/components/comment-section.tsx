'use client';

/**
 * Block 下的评论区：列表 + 发布表单。
 * 服务端渲染初始列表，客户端追加新评论（不整页刷新）；删除走单击 ✕（低风险动作，无需二次确认）。
 */
import Link from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { postComment, deleteComment } from '@/app/actions/comments';
import type { Comment } from '@/lib/types';
import { TimeAgo } from '@/components/time-ago';

export function CommentSection({
  blockId,
  initialComments,
  me,
}: {
  blockId: string;
  initialComments: Comment[];
  me: string | null;
}) {
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const t = useTranslations('Comment');
  const tErr = useTranslations('Errors');

  const submit = () => {
    const value = text.trim();
    if (!value) return;
    setError(null);
    startTransition(async () => {
      const result = await postComment(blockId, value);
      if (result.ok && result.comment) {
        setComments((prev) => [...prev, result.comment!]);
        setText('');
      } else {
        setError(result.error ?? tErr('publishFailedShort'));
      }
    });
  };

  const remove = (documentId: string) => {
    setComments((prev) => prev.filter((c) => c.documentId !== documentId));
    startTransition(async () => {
      const result = await deleteComment(documentId, blockId);
      if (!result.ok) {
        setError(result.error ?? tErr('deleteFailedShort'));
        // 失败回滚：从最初列表里找回（简化处理，重新拉取更稳妥但成本更高，评论量小可接受）
        setComments((prev) => (prev.some((c) => c.documentId === documentId) ? prev : initialComments));
      }
    });
  };

  return (
    <section>
      <h2 className="bw-sep">
        {t('heading')} · {comments.length}
      </h2>

      {comments.length > 0 && (
        <ul className="mb-4 space-y-3">
          {comments.map((c) => (
            <li key={c.documentId} className="group flex items-start justify-between gap-2 rounded-lg border border-base-300/60 bg-base-100 px-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="text-sm leading-relaxed text-base-content/80">
                  <Link href={`/user/${c.authorName}`} className="font-medium text-base-content hover:text-primary">
                    {c.authorName}
                  </Link>{' '}
                  {c.body}
                </p>
                <p className="mt-0.5 text-[11px] bw-muted"><TimeAgo date={c.createdAt} /></p>
              </div>
              {me === c.authorName && (
                <button
                  type="button"
                  onClick={() => remove(c.documentId)}
                  title={t('deleteCommentTitle')}
                  className="shrink-0 rounded-full px-1.5 py-0.5 text-xs text-base-content/40 hover:bg-base-200 hover:text-base-content"
                >
                  ✕
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {me ? (
        <div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t('placeholder')}
            rows={2}
            className="bw-textarea"
          />
          {error && <p className="mt-1 text-xs text-error">{error}</p>}
          <button
            type="button"
            onClick={submit}
            disabled={isPending || !text.trim()}
            className="bw-btn mt-2"
          >
            {isPending ? t('posting') : t('post')}
          </button>
        </div>
      ) : (
        <p className="text-xs bw-muted">
          <Link href="/login" className="text-base-content underline">{t('login')}</Link> {t('loginHint')}
        </p>
      )}
    </section>
  );
}
