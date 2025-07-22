
import type { Metadata, Viewport } from 'next';
import { Inter, Noto_Sans_Arabic } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import '../globals.css';
import { UserProvider } from '@/contexts/user-context';
import AppShell from '@/components/layout/app-shell';
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({ 
  subsets: ['latin'], 
  display: 'swap',
  variable: '--font-inter',
});

const noto_sans_arabic = Noto_Sans_Arabic({
  subsets: ['arabic'],
  display: 'swap',
  variable: '--font-noto-sans-arabic',
});

// Using generateMetadata for dynamic metadata
export async function generateMetadata({ params: { locale } }: { params: { locale: string } }): Promise<Metadata> {
  const SaIconSvg = `<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><circle cx=%2250%22 cy=%2250%22 r=%2250%22 fill=%22%2329ABE2%22/><text x=%2250%22 y=%2255%22 font-size=%2250%22 fill=%22white%22 text-anchor=%22middle%22 dominant-baseline=%22middle%22 font-family=%22Arial, sans-serif%22 font-weight=%22bold%22>Sa</text></svg>`;
  const SaIconDataUri = `data:image/svg+xml,${SaIconSvg}`;

  return {
    title: 'Rawnak Sales',
    description: 'Smart sales management system for store owners in Iraq.',
    manifest: '/manifest.webmanifest',
    icons: {
      icon: SaIconDataUri,
      shortcut: SaIconDataUri,
      apple: '/icons/icon-192x192.png',
    },
  };
}

export const viewport: Viewport = {
  themeColor: '#29ABE2',
};


interface RootLayoutProps {
  children: React.ReactNode;
  params: { locale: string };
}

export default async function LocaleLayout({
  children,
  params: { locale },
}: Readonly<RootLayoutProps>) {
  
  const messages = await getMessages();
  const dir = locale === 'ar' ? 'rtl' : 'ltr';

  return (
    <html lang={locale} dir={dir}>
      <body className={`${inter.variable} ${noto_sans_arabic.variable} font-body antialiased`}>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <UserProvider>
            <AppShell>{children}</AppShell>
          </UserProvider>
          <Toaster />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
