
'use client';

import React from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, BarChart as RechartsBarChart } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent, type ChartConfig } from '@/components/ui/chart';
import { useCurrency } from '@/contexts/currency-context';
import type { Product } from '@/contexts/product-context';
import type { Sale } from '@/contexts/sale-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';

interface SalesChartProps {
    sales: Sale[];
    products: Product[];
}

export default function SalesChart({ sales, products }: SalesChartProps) {
    const t = useTranslations('DashboardPage');
    const locale = useLocale();
    const { convertToSelectedCurrency, selectedCurrency } = useCurrency();
    
    const productMap = React.useMemo(() => 
        products.reduce((acc, p) => {
            acc[p.id] = p;
            return acc;
        }, {} as Record<string, Product>), 
    [products]);


    const chartData = React.useMemo(() => {
        const dataByMonth: Record<string, { sales: number; profit: number }> = {};

        sales.forEach(sale => {
            try {
                const month = new Date(sale.date).toLocaleString('default', { month: 'short' });
                if (!dataByMonth[month]) {
                dataByMonth[month] = { sales: 0, profit: 0 };
                }

                const subtotal = sale.items.reduce((sum, item) => sum + item.priceUSD * item.quantity, 0);
                
                const costOfGoods = sale.items.reduce((cogs, item) => {
                    // If the item itself has a purchase price (e.g., custom item), use it.
                    if (typeof item.purchasePriceUSD === 'number') {
                        return cogs + item.purchasePriceUSD * item.quantity;
                    }
                    // Otherwise, find the product in our map to get its cost.
                    const product = productMap[item.productId];
                    const purchasePrice = product ? product.purchasePriceUSD : 0;
                    return cogs + purchasePrice * item.quantity;
                }, 0);

                const discount = sale.discountAmountUSD || 0;
                const saleProfit = subtotal - costOfGoods - discount;
                
                dataByMonth[month].sales += sale.totalUSD;
                dataByMonth[month].profit += saleProfit;

            } catch (e) {
                // Ignore invalid dates in data
            }
        });

        const last6Months: string[] = [];
        const today = new Date();
        for (let i = 5; i >= 0; i--) {
            const monthDate = new Date(today.getFullYear(), today.getMonth() - i, 1);
            last6Months.push(monthDate.toLocaleString('default', { month: 'short' }));
        }

        return last6Months.map(monthName => ({
            month: monthName,
            sales: convertToSelectedCurrency(dataByMonth[monthName]?.sales || 0),
            profit: convertToSelectedCurrency(dataByMonth[monthName]?.profit || 0),
        }));
    }, [sales, productMap, convertToSelectedCurrency]);

    const chartConfig = React.useMemo(() => ({
        sales: {
          label: t('salesLabel', { currencySymbol: selectedCurrency.symbol }),
          color: "hsl(var(--chart-1))",
        },
        profit: {
          label: t('profitLabel', { currencySymbol: selectedCurrency.symbol }),
          color: "hsl(var(--chart-2))",
        }
    }) satisfies ChartConfig, [t, selectedCurrency.symbol]);

    return (
        <Card className="lg:col-span-2">
            <CardHeader>
                <CardTitle className="font-headline flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" /> {t('salesTrendTitle')}
                </CardTitle>
                <CardDescription>{t('salesTrendDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="ps-2">
                <ChartContainer config={chartConfig} className="h-[300px] w-full">
                <RechartsBarChart data={chartData} accessibilityLayer>
                    <CartesianGrid vertical={false} />
                    <XAxis
                    dataKey="month"
                    tickLine={false}
                    tickMargin={10}
                    axisLine={false}
                    tickFormatter={(value) => value}
                    reversed={locale === 'ar'}
                    />
                    <YAxis 
                    tickLine={false} 
                    axisLine={false} 
                    tickMargin={10} 
                    tickFormatter={(value) => Number(value).toLocaleString()}
                    orientation={locale === 'ar' ? 'right' : 'left'}
                    />
                    <ChartTooltip 
                    cursor={false}
                    content={<ChartTooltipContent indicator="dot" />} 
                    />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Bar dataKey="sales" fill="var(--color-sales)" radius={4} />
                    <Bar dataKey="profit" fill="var(--color-profit)" radius={4} />
                </RechartsBarChart>
                </ChartContainer>
            </CardContent>
        </Card>
    );
}
