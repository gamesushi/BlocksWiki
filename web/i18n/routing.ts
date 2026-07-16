import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  // 支持的语言。Block / Channel / Wiki 为品牌术语，不在 UI 翻译。
  locales: ['zh', 'en'],

  // 默认语言（项目原本就是中文界面）
  defaultLocale: 'zh',
});

export type Locale = (typeof routing.locales)[number];
