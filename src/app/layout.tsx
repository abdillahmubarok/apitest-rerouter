import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
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

export const metadata: Metadata = {
  title: 'ReRouter API Playground — Live Verification & Endpoint Testing',
  description:
    'Public Bring Your Own API Key (BYOK) developer playground, model catalog explorer, SSE stream inspector, and error schema verifier for ReRouter by Mubarokah Digital.',
  icons: {
    icon: [
      {
        url: 'https://storage-mubarokah.s3.ap-southeast-3.amazonaws.com/rerouter/rerouter_mark.svg',
        type: 'image/svg+xml',
      },
    ],
    shortcut:
      'https://storage-mubarokah.s3.ap-southeast-3.amazonaws.com/rerouter/rerouter_mark.svg',
  },
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <RerouterSessionProvider>{children}</RerouterSessionProvider>
      </body>
    </html>
  );
}
