import type { Metadata, Viewport } from 'next';

/**
 * ============================================================================
 * KONFIGURASI SEO & BRANDING TERPUSAT (CENTRALIZED SEO & BRANDING CONFIG)
 * ============================================================================
 * Ubah nilai-nilai di dalam objek `SEO_CONFIG` di bawah ini untuk mengganti
 * judul halaman, deskripsi meta, kata kunci (keywords), Open Graph, Twitter Card,
 * logo SVG, favicon, warna tema, maupun informasi organisasi tanpa perlu
 * mengubah kode komponen atau layout.
 */

export interface SeoConfig {
  /** Identitas utama situs */
  siteName: string;
  shortName: string;
  applicationName: string;
  siteUrl: string;
  canonicalPath: string;
  locale: string;
  alternateLocales: string[];
  language: string;
  category: string;

  /** Judul halaman (Default & Template) */
  title: {
    default: string;
    template: string;
  };

  /** Deskripsi utama untuk mesin pencari (Google, Bing, dll.) */
  description: string;

  /** Daftar kata kunci (keywords) SEO */
  keywords: string[];

  /** Aset Logo & Favicon dari folder public/ */
  branding: {
    /** Path logo utama SVG (public/rerouter_mark.svg) */
    logoSvgPath: string;
    /** Path favicon utama PNG 512x512 (public/rerouter_favicon_512.png) */
    faviconPngPath: string;
    /** Gambar preview saat link dibagikan di sosial media / chat (OpenGraph / Twitter) */
    ogImagePath: string;
    ogImageWidth: number;
    ogImageHeight: number;
    logoAlt: string;
    brandName: string;
    sidebarSubtitle: string;
    modalSubtitle: string;
  };

  /** Informasi Pembuat / Organisasi */
  organization: {
    name: string;
    url: string;
    docsUrl: string;
    billingUrl: string;
    apiBaseUrl: string;
    logoPath: string;
  };

  /** Konfigurasi Open Graph (WhatsApp, LinkedIn, Facebook, Discord, Telegram) */
  openGraph: {
    type: 'website';
    title: string;
    description: string;
    siteName: string;
    locale: string;
  };

  /** Konfigurasi Twitter / X Card */
  twitter: {
    card: 'summary' | 'summary_large_image';
    title: string;
    description: string;
    creator: string;
    site: string;
  };

  /** Warna tema browser & viewport */
  viewport: {
    themeColorLight: string;
    themeColorDark: string;
    backgroundColor: string;
    colorScheme: 'dark' | 'light' | 'dark light';
  };

  /** Pengaturan crawler mesin pencari (Robots) */
  robots: {
    index: boolean;
    follow: boolean;
    disallowPaths: string[];
  };

  /** Kode verifikasi Webmaster (opsional, isi jika diperlukan) */
  verification: {
    google?: string;
    yandex?: string;
    bing?: string;
  };

  /** Konfigurasi Sitemap */
  sitemap: {
    lastModified: string;
    changeFrequency:
      | 'always'
      | 'hourly'
      | 'daily'
      | 'weekly'
      | 'monthly'
      | 'yearly'
      | 'never';
    priority: number;
  };
}

export const SEO_CONFIG: SeoConfig = {
  siteName: 'ReRouter API Playground',
  shortName: 'ReRouter Playground',
  applicationName: 'ReRouter API Playground',
  siteUrl:
    process.env.NEXT_PUBLIC_SITE_URL || 'https://apitest-rerouter.mubarokah.com',
  canonicalPath: '/',
  locale: 'en_US',
  alternateLocales: ['id_ID'],
  language: 'en',
  category: 'Developer Tools',

  title: {
    default:
      'ReRouter API Playground — Public BYOK Live Verification & Endpoint Testing',
    template: '%s | ReRouter API Playground',
  },

  description:
    'Public Bring Your Own API Key (BYOK) developer playground, live model catalog explorer, SSE stream inspector, token counter, and error schema verifier for ReRouter AI Gateway by Mubarokah Digital.',

  keywords: [
    'ReRouter',
    'ReRouter API',
    'ReRouter API Playground',
    'Mubarokah Digital',
    'AI API Gateway',
    'LLM Router',
    'BYOK API Playground',
    'OpenAI Compatible API Tester',
    'Anthropic Messages API Inspector',
    'Responses API Playground',
    'SSE Stream Inspector',
    'AI Model Catalog Explorer',
    'Token Counter API',
    'Embeddings Vector Inspector',
    'API Error Schema Verifier',
  ],

  branding: {
    logoSvgPath: '/rerouter_mark.svg',
    faviconPngPath: '/rerouter_favicon_512.png',
    ogImagePath: '/rerouter_favicon_512.png',
    ogImageWidth: 512,
    ogImageHeight: 512,
    logoAlt: 'ReRouter Official Brand Logo',
    brandName: 'ReRouter',
    sidebarSubtitle: 'API Playground',
    modalSubtitle: 'Public BYOK API Playground',
  },

  organization: {
    name: 'Mubarokah Digital',
    url: 'https://rerouter.mubarokah.com',
    docsUrl: 'https://rerouter.mubarokah.com/docs',
    billingUrl: 'https://rerouter.mubarokah.com/billing',
    apiBaseUrl: 'https://rerouter.mubarokah.com/v1',
    logoPath: '/rerouter_mark.svg',
  },

  openGraph: {
    type: 'website',
    title:
      'ReRouter API Playground — Public BYOK Live Verification & Endpoint Testing',
    description:
      'Test ReRouter AI Gateway endpoints live in your browser with your own API key (BYOK). Inspect Chat Completions, Responses API, Anthropic Messages, SSE streams, Embeddings, and model catalog schemas with zero server-side key storage.',
    siteName: 'ReRouter API Playground',
    locale: 'en_US',
  },

  twitter: {
    card: 'summary',
    title: 'ReRouter API Playground — Public BYOK Live API Inspector',
    description:
      'Interactive BYOK developer playground, model catalog explorer, SSE stream inspector, and error schema verifier for ReRouter AI Gateway.',
    creator: '@mubarokah',
    site: '@mubarokah',
  },

  viewport: {
    themeColorLight: '#5B4CE6',
    themeColorDark: '#09090B',
    backgroundColor: '#09090B',
    colorScheme: 'dark',
  },

  robots: {
    index: true,
    follow: true,
    disallowPaths: ['/api/'],
  },

  verification: {
    google: undefined,
    yandex: undefined,
    bing: undefined,
  },

  sitemap: {
    lastModified: '2026-11-19',
    changeFrequency: 'weekly',
    priority: 1.0,
  },
};

/**
 * Menghasilkan objek Next.js `Metadata` dari `SEO_CONFIG`.
 */
export function buildNextMetadata(config: SeoConfig = SEO_CONFIG): Metadata {
  const metadataBase = new URL(config.siteUrl);

  return {
    metadataBase,
    title: {
      default: config.title.default,
      template: config.title.template,
    },
    description: config.description,
    applicationName: config.applicationName,
    keywords: config.keywords,
    authors: [
      {
        name: config.organization.name,
        url: config.organization.url,
      },
    ],
    creator: config.organization.name,
    publisher: config.organization.name,
    category: config.category,
    alternates: {
      canonical: config.canonicalPath,
    },
    icons: {
      icon: [
        {
          url: config.branding.faviconPngPath,
          sizes: '512x512',
          type: 'image/png',
        },
        {
          url: config.branding.logoSvgPath,
          sizes: 'any',
          type: 'image/svg+xml',
        },
      ],
      shortcut: [
        {
          url: config.branding.faviconPngPath,
          type: 'image/png',
        },
      ],
      apple: [
        {
          url: config.branding.faviconPngPath,
          sizes: '512x512',
          type: 'image/png',
        },
      ],
    },
    manifest: '/manifest.webmanifest',
    openGraph: {
      type: config.openGraph.type,
      url: config.canonicalPath,
      title: config.openGraph.title,
      description: config.openGraph.description,
      siteName: config.openGraph.siteName,
      locale: config.openGraph.locale,
      alternateLocale: config.alternateLocales,
      images: [
        {
          url: config.branding.ogImagePath,
          width: config.branding.ogImageWidth,
          height: config.branding.ogImageHeight,
          alt: config.branding.logoAlt,
          type: 'image/png',
        },
      ],
    },
    twitter: {
      card: config.twitter.card,
      title: config.twitter.title,
      description: config.twitter.description,
      creator: config.twitter.creator,
      site: config.twitter.site,
      images: [config.branding.ogImagePath],
    },
    robots: {
      index: config.robots.index,
      follow: config.robots.follow,
      googleBot: {
        index: config.robots.index,
        follow: config.robots.follow,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    verification: {
      google: config.verification.google,
      yandex: config.verification.yandex,
      other: config.verification.bing
        ? { 'msvalidate.01': config.verification.bing }
        : undefined,
    },
    appleWebApp: {
      capable: true,
      title: config.shortName,
      statusBarStyle: 'black-translucent',
    },
    formatDetection: {
      telephone: false,
      email: false,
      address: false,
    },
  };
}

/**
 * Menghasilkan objek Next.js `Viewport` dari `SEO_CONFIG`.
 */
export function buildNextViewport(config: SeoConfig = SEO_CONFIG): Viewport {
  return {
    width: 'device-width',
    initialScale: 1,
    colorScheme: config.viewport.colorScheme,
    themeColor: [
      {
        media: '(prefers-color-scheme: light)',
        color: config.viewport.themeColorLight,
      },
      {
        media: '(prefers-color-scheme: dark)',
        color: config.viewport.themeColorDark,
      },
    ],
  };
}

/**
 * Menghasilkan Schema.org JSON-LD Structured Data untuk optimasi SEO mesin pencari.
 */
export function buildStructuredDataJsonLd(config: SeoConfig = SEO_CONFIG) {
  const baseUrl = config.siteUrl.replace(/\/$/, '');
  const logoSvgUrl = `${baseUrl}${config.branding.logoSvgPath}`;
  const faviconPngUrl = `${baseUrl}${config.branding.faviconPngPath}`;

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${baseUrl}/#organization`,
        name: config.organization.name,
        url: config.organization.url,
        logo: {
          '@type': 'ImageObject',
          url: logoSvgUrl,
          contentUrl: logoSvgUrl,
        },
        image: faviconPngUrl,
      },
      {
        '@type': 'WebSite',
        '@id': `${baseUrl}/#website`,
        url: baseUrl,
        name: config.siteName,
        description: config.description,
        inLanguage: config.language,
        publisher: {
          '@id': `${baseUrl}/#organization`,
        },
      },
      {
        '@type': 'WebApplication',
        '@id': `${baseUrl}/#webapp`,
        name: config.siteName,
        alternateName: config.shortName,
        url: baseUrl,
        description: config.description,
        applicationCategory: 'DeveloperApplication',
        operatingSystem: 'All',
        browserRequirements: 'Requires JavaScript and a modern web browser',
        image: faviconPngUrl,
        logo: logoSvgUrl,
        creator: {
          '@id': `${baseUrl}/#organization`,
        },
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'USD',
          description:
            'Free public Bring Your Own API Key (BYOK) testing and verification playground for ReRouter API.',
        },
      },
    ],
  };
}
