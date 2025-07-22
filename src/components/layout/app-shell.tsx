
'use client';

import React from 'react';
import { useUser } from '@/contexts/user-context';
import LoginPage from '@/components/auth/login-page';
import { SidebarProvider } from '@/components/ui/sidebar';
import AppSidebar from '@/components/layout/app-sidebar';
import AppHeader from '@/components/layout/app-header';
import { Skeleton } from '../ui/skeleton';
import { isFirebaseConfigured } from '@/lib/firebase';
import { useLocale, useTranslations } from 'next-intl';
import { AlertTriangle } from 'lucide-react';
import { SettingsProvider } from '@/contexts/settings-context';
import { CurrencyProvider } from '@/contexts/currency-context';
import { ProductProvider } from '@/contexts/product-context';
import { CustomerProvider } from '@/contexts/customer-context';
import { SaleProvider } from '@/contexts/sale-context';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';


// This is the inner component that assumes all providers are available.
// It decides whether to show the LoginPage or the main application layout.
const AuthBoundary = ({ children }: { children: React.ReactNode }) => {
  const { currentUser, isInitialized } = useUser();
  const t = useTranslations('General');
  const locale = useLocale();
  const isMobile = useIsMobile();

  if (!isInitialized || isMobile === undefined) {
    // Show a loading skeleton while checking auth state or determining device type
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-[250px]" />
            <Skeleton className="h-4 w-[200px]" />
          </div>
        </div>
      </div>
    );
  }

  const FirebaseWarningBanner = () => {
    if (isFirebaseConfigured) return null;
    return (
      <a 
        href="https://console.firebase.google.com/" 
        target="_blank" 
        rel="noopener noreferrer" 
        className="bg-destructive text-destructive-foreground p-2 text-center text-sm flex items-center justify-center gap-2 hover:bg-destructive/90 transition-colors"
        title={t('firebaseNotConfiguredTooltip')}
      >
        <AlertTriangle className="h-4 w-4" />
        {t('firebaseNotConfigured')}
      </a>
    );
  };

  if (!currentUser) {
    // Since AuthBoundary is inside all providers, LoginPage can now safely use their hooks.
    return (
      <>
        <FirebaseWarningBanner />
        <LoginPage />
      </>
    );
  }

  // User is logged in, show the main app shell.
  return (
    <React.Fragment key={currentUser.id}>
      <SidebarProvider defaultOpen={true} collapsible="icon">
         <div className={cn("flex min-h-screen w-full")}>
            <AppSidebar />
            <div className="flex flex-col flex-1 min-w-0">
              <AppHeader />
              <main className="flex-1">
                <FirebaseWarningBanner />
                <div className="p-4 md:p-6 lg:p-8">
                  {children}
                </div>
              </main>
            </div>
        </div>
      </SidebarProvider>
    </React.Fragment>
  );
};


// AppShell's only job is to set up all the providers in the correct order.
export default function AppShell({ children }: { children: React.ReactNode }) {
  // UserProvider is already wrapping AppShell in the root layout.
  // We set up the rest of the providers here.
  return (
    <SettingsProvider>
      <CurrencyProvider>
        <ProductProvider>
          <CustomerProvider>
            <SaleProvider>
              <AuthBoundary>{children}</AuthBoundary>
            </SaleProvider>
          </CustomerProvider>
        </ProductProvider>
      </CurrencyProvider>
    </SettingsProvider>
  );
}
