
'use client';

import React from 'react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useIsMobile } from '@/hooks/use-mobile';
import { useSettings } from '@/contexts/settings-context';
import { useLocale } from 'next-intl';
import { cn } from '@/lib/utils';
import { Building } from 'lucide-react';

const AppHeader = () => {
    const isMobile = useIsMobile();
    const { activeBranch } = useSettings();
    const locale = useLocale();

    if (!isMobile) {
        return null; // Don't render the header on desktop
    }
    
    return (
        <header className={cn(
            "sticky top-0 z-40 flex h-14 items-center gap-4 border-b bg-background px-4 md:hidden",
            locale === 'ar' && "flex-row-reverse"
        )}>
            <SidebarTrigger />
            <div className="flex-1">
                 <div className="flex items-center gap-2 font-semibold text-lg text-primary font-headline">
                    <Building className="h-6 w-6" />
                    <h1>{activeBranch?.name || 'Rawnak Sales'}</h1>
                </div>
            </div>
        </header>
    );
};

export default AppHeader;
