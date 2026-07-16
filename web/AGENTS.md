<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:i18n-rules -->
# i18n 约定（next-intl，子路径路由）

本项目已接入多语言：**默认 zh-CN，另支持 en**。所有面向用户的文案必须进翻译词典，禁止在代码里硬编码任何语言（注释除外）。

## 路由与文件位置
- 所有页面在 `app/[locale]/...` 下；`app/api/*`、`app/manifest.ts`、`app/robots.ts` 等**根级路由在 `[locale]` 之外**（无请求级 locale 上下文）。
- locales 定义在 `i18n/routing.ts`（`locales: ['zh','en']`，`defaultLocale: 'zh'`）。
- 词典：`messages/zh.json` 与 `messages/en.json`（两个文件**键必须一一对应**）。

## 取译文
- **Server Component / Server Action**：`import {getTranslations} from 'next-intl/server'`，用 `const t = await getTranslations({locale, namespace})`（显式 locale，安全）或 `await getTranslations('Namespace')`（依赖请求上下文，只能在 `[locale]` 内用）。
- **Client Component**：`import {useTranslations} from 'next-intl'`，`const t = useTranslations('Namespace')`。
- 占位符用 ICU：`t('key', {count: 3})`，词典里写 `"{count} 项"`。

## 导航（关键坑）
- 一律从 `@/i18n/navigation` 导入 `Link` / `usePathname` / `useRouter` / `redirect` / `getPathname`，**不要**从 `next/link` 或 `next/navigation` 直接导入，否则会丢掉 locale 前缀。
- 切换语言：`router.replace(pathname, {locale: next})`（next-intl v4 的对象式，不是 `{pathname, params}`）。
- `redirect` 从 `@/i18n/navigation` 导入时是对象式 `redirect({href, locale})`；若只需跳默认语言可用原生 `next/navigation` 的 `redirect('/')`（proxy 会自动补 locale）。

## 品牌术语表（中英都保留英文原样，勿译）
`Block` / `Channel` / `Wiki` / `BlocksWiki`；`Connect` 在中文界面显示为 **「连结」**（词典 `Connect.connect` = `连结` / `Connect`）。
UI 短语里为可读性可用中文（如「我的频道」），但裸实体名词保持英文。

## 相对时间
- 用 `<TimeAgo date={date} />`（`components/time-ago.tsx`，基于 `useFormatter().relativeTime`，自动跟随 locale）。
- **禁止**自己写 `刚刚/分钟前/天前` 或 `toLocaleDateString('zh-CN')`。
- `relativeTime` 需要一个 `now`：本项目在 `app/[locale]/layout.tsx` 的 `<NextIntlClientProvider now={new Date()}>` 统一注入请求级 `now`（序列化到客户端，避免 hydration 不一致）。**不要在 `time-ago.tsx` 里单独给 `relativeTime` 传 `now`**——否则会丢全局默认、dev 日志刷 `ENVIRONMENT_FALLBACK` 警告。

## 根级路由（无 locale 上下文）的特殊处理
- `app/manifest.ts` 等静态生成时**拿不到请求 locale**，不能调用请求上下文的 `getTranslations(...)`（会报 "Couldn't find next-intl config file"）。
- 正确做法：直接 `import zh from '../messages/zh.json'` 读默认语言词条，或用静态字符串。
- `generateMetadata` 里请设置 `metadataBase`（`process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'`）并用 `getPathname({href, locale})` 输出 `alternates.languages`（hreflang）。

## 运行时才能暴露的坑（构建绿灯 ≠ 运行绿灯）
- `next build` 对 `[locale]` 下的**动态页**不会在构建期执行 `generateMetadata` 与组件渲染（它们标 `ƒ` 按需渲染）。因此下面两个运行时错误**构建会假装通过**，只有 `next dev` / `next start` 真正访问路由时才爆：
  1. **漏接 `createNextIntlPlugin()`**：`next.config.ts` 必须用 `createNextIntlPlugin()` 包裹 `nextConfig`（默认自动找 `./i18n/request.ts`）。否则运行时所有 `getTranslations` / `getRequestConfig` 报 `Couldn't find next-intl config file`。
  2. **async 服务端组件里用 `useTranslations`**：`useTranslations` 是 hook，只能在**同步**服务端组件或客户端组件里用。凡是 `async function` 的 Server Component（如 `SiteHeader` 因 `await getSession()` 而 async）必须改成 `const t = await getTranslations('Ns')`（从 `next-intl/server` 导入）。否则报 `useTranslations is not callable within an async component`。
  3. **`relativeTime` 缺全局 `now`**：dev 日志若出现 `ENVIRONMENT_FALLBACK: The 'now' parameter wasn't provided to relativeTime...`，说明 Provider 没注入 `now`。在根 `layout.tsx` 的 `<NextIntlClientProvider now={new Date()}>` 统一注入即可（不要在每个 `relativeTime` 调用点单独传 `now`）。
- 验证 i18n 是否真的接好：起 `next dev`，至少访问 `/`（应 307→`/zh`）、`/zh/publish`（应 200 且 `<html lang="zh-CN">` 并含 `<link rel="alternate" hrefLang=...>`）、`/manifest.webmanifest`（200）。数据页（feed/channel/block）需要后端，后端没起会 `ECONNREFUSED` 而 500——那是环境问题，不是 i18n 缺陷。

## 新增一条文案的步骤
1. 在 `messages/zh.json` 和 `messages/en.json` **同时**加 key（保持键一致）。
2. 代码里用 `t('Namespace.key')` 引用。
3. （可选）跑键对齐校验，确保两文件 key 数相同、占位符一致。

## 语言切换器
`components/locale-switcher.tsx` 放在 `SiteHeader`，切换时保持当前路径（基于 next-intl 的 `usePathname`）。
<!-- END:i18n-rules -->
