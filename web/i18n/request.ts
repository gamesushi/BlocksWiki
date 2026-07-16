import { getRequestConfig } from 'next-intl/server';
import { hasLocale } from 'next-intl';
import { routing } from './routing';
import zh from '../messages/zh.json';
import en from '../messages/en.json';

const messages: Record<string, typeof zh> = { zh, en };

export default getRequestConfig(async ({ requestLocale }) => {
  // `requestLocale` 通常对应路由里的 [locale] 段
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  return {
    locale,
    messages: messages[locale] ?? zh,
  };
});
