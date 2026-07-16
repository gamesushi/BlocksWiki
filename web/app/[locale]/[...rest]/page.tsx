import { notFound } from 'next/navigation';

// 兜底未知的嵌套路径，交给 [locale]/not-found.tsx 渲染。
export default function CatchAll() {
  notFound();
}
