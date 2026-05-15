import type { Metadata, Viewport } from 'next';
import { Barlow_Condensed, Inter } from 'next/font/google';
import './globals.css';
import { SwRegister } from './sw-register';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-body',
  weight: ['400', '500', '600', '700'],
});

const barlowCondensed = Barlow_Condensed({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-display',
  weight: ['600', '700', '800'],
});

export const metadata: Metadata = {
  title: {
    default: 'RachãoApp — Gestão de peladas amadoras',
    template: '%s · RachãoApp',
  },
  description:
    'Plataforma SaaS para organizar peladas, controlar boleiros, escalar times, registrar partidas e gerenciar a vaquinha.',
  applicationName: 'RachãoApp',
  authors: [{ name: 'RachãoApp' }],
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'Rachão',
    statusBarStyle: 'black-translucent',
  },
  icons: {
    icon: [
      { url: '/icons/icon.svg', sizes: 'any', type: 'image/svg+xml' },
    ],
    apple: [{ url: '/icons/icon.svg' }],
  },
};

export const viewport: Viewport = {
  themeColor: '#0f1b2d',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="pt-BR"
      className={`${inter.variable} ${barlowCondensed.variable} dark`}
      suppressHydrationWarning
    >
      <body className="min-h-dvh bg-background text-foreground antialiased">
        <SwRegister />
        {children}
      </body>
    </html>
  );
}
