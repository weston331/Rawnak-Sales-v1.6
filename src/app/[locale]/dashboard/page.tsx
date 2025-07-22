
'use client';

import { useTranslations, useLocale } from 'next-intl';
import PageHeader from '@/components/shared/page-header';
import StatCard from '@/components/dashboard/stat-card';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DollarSign, Package, Users, CreditCard, HandCoins, ShoppingCart, Rocket, Clock, ArchiveX, Eye, AlertTriangle, ListChecks } from 'lucide-react';
import { useCurrency } from '@/contexts/currency-context';
import React from 'react';
import Link from 'next/link';
import type { Product } from '@/contexts/product-context';
import { useProductData, initialDefinedCategories } from '@/contexts/product-context';
import type { Customer } from '@/contexts/customer-context';
import { useCustomerData } from '@/contexts/customer-context';
import type { Sale } from '@/contexts/sale-context';
import { useSaleData } from '@/contexts/sale-context';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale/ar';
import { enUS } from 'date-fns/locale/en-US';
import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';
import { useSettings } from '@/contexts/settings-context';


const SalesChart = dynamic(() => import('@/components/dashboard/sales-chart'), {
  loading: () => (
      <Card className="lg:col-span-2">
          <CardHeader>
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-64 mt-2" />
          </CardHeader>
          <CardContent>
              <Skeleton className="h-[300px] w-full" />
          </CardContent>
      </Card>
  ),
  ssr: false,
});


type RecentActivity = {
    type: 'sale' | 'payment';
    date: Date;
    data: any;
};

type KpiData = {
    fastestMovingProduct: string;
    busiestSellingHour: string;
    deadStockProducts: Product[];
};

type MonthlyTrends = {
    newSalesThisMonthUSD: number;
    newDebtThisMonthUSD: number;
    newProductsThisMonthCount: number;
    newCustomersThisMonthCount: number;
}

export default function DashboardPage() {
  const t = useTranslations('DashboardPage');
  const t_products = useTranslations('ProductsPage');
  const tg = useTranslations('General');
  const locale = useLocale();
  const { formatCurrency } = useCurrency();
  const { activeBranch } = useSettings();

  const { products, isLoading: isLoadingProducts } = useProductData();
  const { customers, isLoading: isLoadingCustomers } = useCustomerData();
  const { sales, isLoading: isLoadingSales } = useSaleData();

  const [isClient, setIsClient] = React.useState(false);
  
  // State for deferred calculations
  const [recentActivities, setRecentActivities] = React.useState<RecentActivity[] | 'loading'>('loading');
  const [kpiData, setKpiData] = React.useState<KpiData | 'loading'>('loading');
  
  React.useEffect(() => {
    setIsClient(true);
  }, []);
  
  const isLoading = isLoadingProducts || isLoadingCustomers || isLoadingSales;
  const dateFnsLocale = locale === 'ar' ? ar : enUS;

  const translateCategory = React.useCallback((category: string) => {
      const isPredefined = initialDefinedCategories.some(c => c.toLowerCase() === category.toLowerCase());
      if (isPredefined) {
        const key = `${category.toLowerCase().replace(/\s/g, '')}Category`;
        return t_products(key as any, {}, { defaultValue: category });
      }
      return category;
  }, [t_products]);

  // --- Main Stat Calculations (these are fast) ---
  const totalSalesUSD = React.useMemo(() => sales.reduce((sum, sale) => sum + sale.totalUSD, 0), [sales]);
  const outstandingDebtsUSD = React.useMemo(() => customers.reduce((sum, customer) => sum + customer.totalDebtUSD, 0), [customers]);
  const activeProductsCount = products.length;
  const customersCount = customers.length;
  const monthlyTrends = React.useMemo<MonthlyTrends | null>(() => {
    if (isLoading) return null;
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    return {
        newSalesThisMonthUSD: sales
          .filter(sale => new Date(sale.date) >= startOfMonth)
          .reduce((sum, sale) => sum + sale.totalUSD, 0),
        newDebtThisMonthUSD: sales
          .filter(sale => sale.status === 'Debt' && new Date(sale.date) >= startOfMonth)
          .reduce((sum, sale) => sum + sale.totalUSD, 0),
        newProductsThisMonthCount: products.filter(product => new Date(product.createdAt) >= startOfMonth).length,
        newCustomersThisMonthCount: customers.filter(customer => new Date(customer.customerSince) >= startOfMonth).length,
      };
  }, [isLoading, sales, products, customers]);


  // --- Cheaper calculations can remain in useMemo ---
  const lowStockProducts = React.useMemo(() => {
    if (isLoading) return [];
    return products.filter(p => p.stock > 0 && p.stock < (p.lowStockThreshold ?? 10));
  }, [products, isLoading]);
  
  // --- Defer heavy calculations to a useEffect hook to avoid UI blocking ---
  React.useEffect(() => {
    if (isLoading) return;

    // Use a small timeout to ensure the main thread is not blocked during initial render,
    // allowing the UI to become responsive faster.
    const timer = setTimeout(() => {
      // 1. Calculate Recent Activities
      const saleActivities = sales.map(sale => ({
        type: 'sale' as const,
        date: new Date(sale.date),
        data: sale
      }));
      const paymentActivities = customers.flatMap(customer => 
          (customer.transactions || [])
              .filter(tx => tx.type === 'CREDIT')
              .map(tx => ({
                  type: 'payment' as const,
                  date: new Date(tx.date),
                  data: { ...tx, customerName: customer.name }
              }))
      );
      setRecentActivities(
          [...saleActivities, ...paymentActivities]
            .sort((a, b) => b.date.getTime() - a.date.getTime())
            .slice(0, 3)
      );

      // 2. Calculate KPIs
      // KPI: Fastest Moving Product
      let fastestMoving = t('noSalesYet');
      if (sales.length > 0) {
        const productQuantities = sales.flatMap(s => s.items).reduce((acc, item) => {
            acc[item.productId] = (acc[item.productId] || 0) + item.quantity;
            return acc;
        }, {} as Record<string, number>);

        if (Object.keys(productQuantities).length > 0) {
            const topProductId = Object.keys(productQuantities).reduce((a, b) => productQuantities[a] > productQuantities[b] ? a : b);
            const product = products.find(p => p.id === topProductId);
            fastestMoving = product ? product.name : t('noData');
        } else {
             fastestMoving = t('noData');
        }
      }

      // KPI: Busiest Selling Hour
      let busiestHour = t('noSalesYet');
      if (sales.length > 0) {
        const salesByHour = Array(24).fill(0);
        sales.forEach(sale => {
          try {
            const hour = new Date(sale.date).getHours();
            if (typeof hour === 'number') salesByHour[hour]++;
          } catch(e) {/* ignore invalid dates */}
        });
        const maxSales = Math.max(...salesByHour);
        if (maxSales > 0) {
          const busiestHourIndex = salesByHour.indexOf(maxSales);
          const formatHour = (hour: number) => new Intl.DateTimeFormat(locale, { hour: 'numeric', hour12: true }).format(new Date(0,0,0,hour));
          busiestHour = `${formatHour(busiestHourIndex)} - ${formatHour(busiestHourIndex + 1)}`;
        } else {
            busiestHour = t('noData');
        }
      }

      // KPI: Dead Stock Products
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      const productsSoldRecently = new Set(
          sales.filter(s => new Date(s.date) > ninetyDaysAgo).flatMap(s => s.items.map(i => i.productId))
      );
      const deadStock = products.filter(p => !productsSoldRecently.has(p.id) && new Date(p.createdAt) < ninetyDaysAgo);

      setKpiData({
        fastestMovingProduct: fastestMoving,
        busiestSellingHour: busiestHour,
        deadStockProducts: deadStock,
      });

    }, 50); // Small delay to unblock the main thread

    return () => clearTimeout(timer);

  }, [sales, customers, products, t, locale, isLoading]);

  
  const formatRelativeTime = React.useCallback((date: Date) => {
    if (!isClient) return ''; // Avoid hydration mismatch
    try {
      return formatDistanceToNow(date, { addSuffix: true, locale: dateFnsLocale });
    } catch (e) {
      return date.toLocaleDateString();
    }
  }, [isClient, dateFnsLocale]);

  const StatCardsSkeleton = () => (
    [...Array(4)].map((_, i) => (
      <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-6 w-6" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-7 w-32" />
            <Skeleton className="h-3 w-40 mt-2" />
          </CardContent>
      </Card>
    ))
  );

  const LowStockSkeleton = () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{tg('no')}</TableHead>
          <TableHead>{t('tableHeaderProduct')}</TableHead>
          <TableHead>{t('tableHeaderCategory')}</TableHead>
          <TableHead className="text-right">{t('tableHeaderStock')}</TableHead>
          <TableHead className="text-right">{t('tableHeaderAction')}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {[...Array(3)].map((_, i) => (
          <TableRow key={i}>
            <TableCell><Skeleton className="h-5 w-5 rounded-full" /></TableCell>
            <TableCell><Skeleton className="h-5 w-32" /></TableCell>
            <TableCell><Skeleton className="h-5 w-24" /></TableCell>
            <TableCell className="text-right"><Skeleton className="h-5 w-16 ml-auto" /></TableCell>
            <TableCell className="text-right"><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );


  return (
    <>
      <PageHeader
        title={t('title')}
        description={t('description')}
        actions={
          <div className="flex gap-2">
            <Button asChild>
              <Link href={`/${locale}/products`}>
                <Package className="h-4 w-4" /> {t('addProduct')}
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/${locale}/sales`}>
                <DollarSign className="h-4 w-4" /> {t('newSale')}
              </Link>
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        {isLoading || !monthlyTrends ? <StatCardsSkeleton /> : (
          <>
            <StatCard 
                title={t('totalSales')} 
                value={formatCurrency(totalSalesUSD)} 
                icon={<DollarSign className="text-primary" />}
                trend={t('totalSalesTrend', { amount: formatCurrency(monthlyTrends.newSalesThisMonthUSD)})}
            />
            <StatCard 
                title={t('outstandingDebts')} 
                value={formatCurrency(outstandingDebtsUSD)} 
                icon={<CreditCard className="text-destructive" />} 
                trend={t('outstandingDebtsTrend', { amount: formatCurrency(monthlyTrends.newDebtThisMonthUSD)})}
            />
            <StatCard 
                title={t('activeProducts')} 
                value={activeProductsCount.toString()} 
                icon={<Package className="text-green-500" />} 
                trend={t('activeProductsTrend', { count: monthlyTrends.newProductsThisMonthCount })}
            />
            <StatCard 
                title={t('customers')} 
                value={customersCount.toString()} 
                icon={<Users className="text-blue-500" />} 
                trend={t('customersTrend', { count: monthlyTrends.newCustomersThisMonthCount })}
            />
          </>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <SalesChart sales={sales} products={products} />

        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="font-headline flex items-center gap-2">
              <ListChecks className="h-5 w-5 text-accent" /> {t('recentActivityTitle')}
            </CardTitle>
            <CardDescription>{t('recentActivityDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="flex-grow p-0">
             {recentActivities === 'loading' ? (
                <div className="p-4 space-y-4">
                    <div className="flex items-center gap-3"><Skeleton className="h-10 w-10 rounded-full" /><div className="flex-grow space-y-2"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-3 w-1/2" /></div></div>
                    <div className="flex items-center gap-3"><Skeleton className="h-10 w-10 rounded-full" /><div className="flex-grow space-y-2"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-3 w-1/2" /></div></div>
                    <div className="flex items-center gap-3"><Skeleton className="h-10 w-10 rounded-full" /><div className="flex-grow space-y-2"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-3 w-1/2" /></div></div>
                </div>
             ) : (recentActivities as RecentActivity[]).length > 0 ? (
                <div className="divide-y divide-border">
                    {(recentActivities as RecentActivity[]).map((activity, index) => (
                        <div key={index} className="flex items-center gap-3 p-4">
                            <div className="p-2 bg-muted rounded-full">
                            {activity.type === 'sale' ? <ShoppingCart className="h-4 w-4 text-primary" /> : <HandCoins className="h-4 w-4 text-green-600" />}
                            </div>
                            <div className="flex-grow">
                            {activity.type === 'sale' && (
                                <>
                                <div className="font-medium">{t('newSaleRecorded')}</div>
                                <div className="text-sm text-muted-foreground">{activity.data.customerName} - {formatCurrency(activity.data.totalUSD)}</div>
                                </>
                            )}
                            {activity.type === 'payment' && (
                                <>
                                <div className="font-medium">{t('debtPaymentReceived')}</div>
                                <div className="text-sm text-muted-foreground">{activity.data.customerName} - {formatCurrency(activity.data.amountUSD)}</div>
                                </>
                            )}
                            </div>
                            <div className="text-right text-xs text-muted-foreground whitespace-nowrap">{formatRelativeTime(activity.date)}</div>
                        </div>
                    ))}
                </div>
                ) : (
                <div className="text-center text-muted-foreground p-4 h-full flex items-center justify-center">
                    {t('noRecentActivity')}
                </div>
                )}
          </CardContent>
        </Card>
      </div>
      
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="font-headline flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" /> {t('lowStockAlertsTitle')}
          </CardTitle>
          <CardDescription>{t('lowStockAlertsDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? <LowStockSkeleton /> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{tg('no')}</TableHead>
                  <TableHead>{t('tableHeaderProduct')}</TableHead>
                  <TableHead>{t('tableHeaderCategory')}</TableHead>
                  <TableHead className="text-right">{t('tableHeaderStock')}</TableHead>
                  <TableHead className="text-right">{t('tableHeaderAction')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lowStockProducts.length > 0 ? lowStockProducts.map((product, index) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-mono">{index + 1}</TableCell>
                    <TableCell>{product.name}</TableCell>
                    <TableCell>{translateCategory(product.category)}</TableCell>
                    <TableCell className="text-right text-destructive font-medium">{t('stockUnit', {count: product.stock})}</TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/${locale}/inventory`}>
                          {t('restockButton')}
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-10">
                      {t('noLowStockProducts')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="mt-6">
        <PageHeader title={t('smartKpiTitle')} description={t('smartKpiDescription')} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="h-full">
                <CardHeader>
                    <CardTitle>{t('fastestMovingProduct')}</CardTitle>
                    <CardDescription>{t('fastestMovingProductDesc')}</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center gap-4">
                    <Rocket className="w-10 h-10 text-primary shrink-0"/>
                    {kpiData === 'loading' ? (
                        <Skeleton className="h-7 w-48" />
                    ) : (
                        <div className="text-2xl font-bold">{(kpiData as KpiData).fastestMovingProduct}</div>
                    )}
                </CardContent>
            </Card>
            <Card className="h-full">
                <CardHeader>
                    <CardTitle>{t('busiestSellingHour')}</CardTitle>
                    <CardDescription>{t('busiestSellingHourDesc')}</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center gap-4">
                    <Clock className="w-10 h-10 text-primary shrink-0"/>
                    {kpiData === 'loading' ? (
                        <Skeleton className="h-7 w-32" />
                    ) : (
                        <div className="text-2xl font-bold">{(kpiData as KpiData).busiestSellingHour}</div>
                    )}
                </CardContent>
            </Card>
        </div>
        <div className="mt-6">
          <Link href={`/${locale}/inventory?filter=dead_stock`} className="block h-full">
              <Card className="h-full hover:shadow-lg transition-shadow flex flex-col">
                  <CardHeader>
                      <CardTitle>{t('deadStock')}</CardTitle>
                      <CardDescription>{t('deadStockDesc')}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-2 flex-grow">
                      {kpiData === 'loading' ? (
                          <div className="space-y-2"><Skeleton className="h-5 w-3/4" /><Skeleton className="h-4 w-1/2" /><Skeleton className="h-4 w-1/2" /></div>
                      ) : (kpiData as KpiData).deadStockProducts.length > 0 ? (
                          <>
                              <div className="flex items-center gap-2 text-muted-foreground">
                                  <ArchiveX className="w-5 h-5 shrink-0"/>
                                  <p className="text-sm font-semibold">{t('deadStockCount', { count: (kpiData as KpiData).deadStockProducts.length })}</p>
                              </div>
                              <ul className="space-y-1 text-sm ps-2">
                                  {(kpiData as KpiData).deadStockProducts.slice(0, 3).map(p => (
                                      <li key={p.id} className="font-medium text-foreground truncate">
                                          - {p.name}
                                      </li>
                                  ))}
                                  {(kpiData as KpiData).deadStockProducts.length > 3 && (
                                      <li className="text-muted-foreground">
                                          {t('andMoreCount', { count: (kpiData as KpiData).deadStockProducts.length - 3 })}
                                      </li>
                                  )}
                              </ul>
                          </>
                      ) : (
                          <div className="text-center text-muted-foreground flex-grow flex items-center justify-center flex-col gap-2">
                              <ArchiveX className="w-10 h-10"/>
                              <p>{t('noDeadStock')}</p> 
                          </div>
                      )}
                  </CardContent>
                  <CardFooter>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 w-full">
                          <Eye className="h-4 w-4" />
                          <span>{t('viewProducts')}</span>
                      </p>
                  </CardFooter>
              </Card>
          </Link>
        </div>
      </div>
    </>
  );
}
