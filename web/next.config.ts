import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const STRAPI_URL = process.env.STRAPI_URL ?? 'http://localhost:1337';

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      // Strapi upload 返回相对路径 /uploads/...，代理过去让 <img src> 直接可用，
      // 数据库里不落绝对域名（换 CDN / 换域零迁移）
      { source: '/uploads/:path*', destination: `${STRAPI_URL}/uploads/:path*` },
    ];
  },
};

const withNextIntl = createNextIntlPlugin();

export default withNextIntl(nextConfig);
