import type { MetadataRoute } from 'next';
import { SEO_CONFIG } from '@/config/seo';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = SEO_CONFIG.siteUrl.replace(/\/$/, '');

  return {
    rules: [
      {
        userAgent: '*',
        allow: SEO_CONFIG.robots.index ? '/' : undefined,
        disallow: SEO_CONFIG.robots.index
          ? SEO_CONFIG.robots.disallowPaths
          : '/',
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
