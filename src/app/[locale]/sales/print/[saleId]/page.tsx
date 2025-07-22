'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { Skeleton } from '@/components/ui/skeleton';

export default function PrintSaleRedirectPage() {
    const locale = useLocale();
    const router = useRouter();
    
    useEffect(() => {
        router.replace(`/${locale}/sales`);
    }, [locale, router]);
      
    return (
        <div className="p-10 text-center">
            <p>Redirecting...</p>
            <Skeleton className="h-20 w-full mt-4" />
            <Skeleton className="h-40 w-full mt-4" />
        </div>
    );
}
