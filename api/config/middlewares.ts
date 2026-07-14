import type { Core } from '@strapi/strapi';

// CORS origins are driven by the CORS_ORIGINS env var (comma-separated).
// Defaults to '*' so local dev keeps working; in production set it to the
// frontend domain(s), e.g. https://blockswiki.yourdomain.com
export default ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Middlewares => {
  // Host of the R2 public bucket, added to the CSP so Media Library thumbnails load.
  const r2Host = (env('R2_PUBLIC_URL', '') as string).replace(/^https?:\/\//, '');
  return [
  'strapi::logger',
  'strapi::errors',
  {
    name: 'strapi::security',
    config: {
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          'img-src': ["'self'", 'data:', 'blob:', ...(r2Host ? [r2Host] : [])],
          'media-src': ["'self'", 'data:', 'blob:', ...(r2Host ? [r2Host] : [])],
        },
      },
    },
  },
  {
    name: 'strapi::cors',
    config: {
      origin: (env('CORS_ORIGINS', '*') as string)
        .split(',')
        .map((o: string) => o.trim())
        .filter(Boolean),
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      headers: ['Content-Type', 'Authorization'],
      keepAlive: true,
    },
  },
  'strapi::poweredBy',
  'strapi::query',
  'strapi::body',
  'strapi::session',
  'strapi::favicon',
  'strapi::public',
  ];
};
