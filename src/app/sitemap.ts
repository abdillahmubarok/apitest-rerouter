import type { MetadataRoute } from 'next';
import { SEO_CONFIG } from '@/config/seo';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = SEO_CONFIG.siteUrl.replace(/\/$/, '');

  return [
    {
      url: baseUrl,
      lastModified: SEO_CONFIG.sitemap.lastModified,
      changeFrequency: SEO_CONFIG.sitemap.changeFrequency,
      priority: SEO_CONFIG.sitemap.priority,
    },
  ];
}
