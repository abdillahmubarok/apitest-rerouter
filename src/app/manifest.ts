import type { MetadataRoute } from 'next';
import { SEO_CONFIG } from '@/config/seo';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SEO_CONFIG.siteName,
    short_name: SEO_CONFIG.shortName,
    description: SEO_CONFIG.description,
    start_url: SEO_CONFIG.canonicalPath,
    display: 'standalone',
    background_color: SEO_CONFIG.viewport.backgroundColor,
    theme_color: SEO_CONFIG.viewport.themeColorDark,
    icons: [
      {
        src: SEO_CONFIG.branding.faviconPngPath,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: SEO_CONFIG.branding.faviconPngPath,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: SEO_CONFIG.branding.logoSvgPath,
        sizes: 'any',
        type: 'image/svg+xml',
      },
    ],
  };
}
