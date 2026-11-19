import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import {
  SEO_CONFIG,
  buildNextMetadata,
  buildNextViewport,
  buildStructuredDataJsonLd,
} from '@/config/seo';
import { RerouterSessionProvider } from '@/context/RerouterSessionContext';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = buildNextMetadata(SEO_CONFIG);

export const viewport: Viewport = buildNextViewport(SEO_CONFIG);

export default function RootLayout({ children }: LayoutProps<'/'>) {
  const structuredData = buildStructuredDataJsonLd(SEO_CONFIG);

  return (
    <html
      lang={SEO_CONFIG.language}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData),
          }}
        />
        <RerouterSessionProvider>{children}</RerouterSessionProvider>
      </body>
    </html>
  );
}
