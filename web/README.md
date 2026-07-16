This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Internationalization (i18n)

界面默认 **中文（zh-CN）**，并支持 **English（en）**。多语言基于 [`next-intl`](https://next-intl.dev)，采用**子路径路由**：`/zh/...` 与 `/en/...`。

- **切换语言**：右上角语言切换器（`components/locale-switcher.tsx`）在当前路径下即时切换，URL 始终带 locale 前缀，可分享。
- **文案来源**：所有面向用户的字符串都在 `messages/zh.json` 与 `messages/en.json` 中，代码通过 `t('Namespace.key')` 引用，禁止硬编码语言文案（注释除外）。
- **品牌术语保留英文**：`Block` / `Channel` / `Wiki` / `BlocksWiki`；`Connect` 在中文界面显示为「连结」。
- **相对时间**：统一用 `<TimeAgo date={...} />`，自动跟随当前语言。
- **SEO**：`generateMetadata` 输出 `metadataBase` 与 `alternates.languages`（hreflang）。如需自定义站点域名，设置环境变量 `NEXT_PUBLIC_SITE_URL`（默认 `http://localhost:3000`）。

> 给开发者的完整约定见 [`AGENTS.md`](./AGENTS.md)（含 next-intl v4 的 `redirect` / `router.replace` 对象式签名、根级路由无 locale 上下文的处理等坑）。

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
