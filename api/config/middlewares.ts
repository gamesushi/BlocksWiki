import type { Core } from '@strapi/strapi';

// CORS origins are driven by the CORS_ORIGINS env var (comma-separated).
// Defaults to '*' so local dev keeps working; in production set it to the
// frontend domain(s), e.g. https://blockwiki.yourdomain.com
export default ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Middlewares => [
  'strapi::logger',
  'strapi::errors',
  'strapi::security',
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
