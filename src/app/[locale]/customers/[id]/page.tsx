
'use client';

import React, { useState, useEffect, useRef, forwardRef, useCallback } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { useParams, useRouter } from 'next/navigation';
import PageHeader from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Phone, User, Calendar, Eye, Printer, Pencil, ShoppingCart } from 'lucide-react';
import { useCurrency } from '@/contexts/currency-context';
import { Badge } from '@/components/ui/badge';
import type { Customer } from '@/contexts/customer-context';
import { useCustomerData, useCustomerActions } from '@/contexts/customer-context';
import type { Sale } from '@/contexts/sale-context';
import { useSaleData } from '@/contexts/sale-context';
import { useSettings } from '@/contexts/settings-context';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';

const PrintableCustomerHistory = React.memo(forwardRef<HTMLDivElement, { 
  customer: Customer | null; 
  sales: Sale[];
  currencyFormatter: (amount: number) => string; 
  t: any; 
  tg: any;
  branchName: string;
}>(({ customer, sales, currencyFormatter, t, tg, branchName }, ref) => {
    if (!customer) {
        return null;
    }

    return (
      <div ref={ref} className="bg-white text-black font-sans p-4 print:!text-black">
        <div className="w-full max-w-4xl mx-auto">
            <div className="text-center mb-6 border-b pb-4">
                <h1 className="text-2xl font-bold print:!text-black">{branchName}</h1>
                <p className="text-sm print:!text-black">{t('title', { customerName: customer.name })}</p>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                <div>
                    <p><span className="font-bold">{t('customerNameLabel')}:</span> {customer.name}</p>
                    <p><span className="font-bold">{t('customerPhone')}:</span> {customer.phone || 'N/A'}</p>
                </div>
                <div className="text-right">
                    <p><span className="font-bold">{tg('reportDate')}:</span> {new Date().toLocaleDateString()}</p>
                    <p><span className="font-bold">{t('memberSince', { date: '' }).replace('{date}','').trim()}:</span> {new Date(customer.customerSince).toLocaleDateString()}</p>
                    <p><span className="font-bold">{t('outstandingDebt')}:</span> <span className="font-semibold">{currencyFormatter(customer.totalDebtUSD)}</span></p>
                </div>
            </div>
            
            <h2 className="text-lg font-bold mt-6 mb-2 border-b pb-2 print:!text-black">{t('purchaseHistoryTitle')}</h2>
            <div className="text-sm space-y-2">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="print:!text-black">{t('tableHeaderInvoiceNo')}</TableHead>
                            <TableHead className="print:!text-black">{t('tableHeaderDate')}</TableHead>
                            <TableHead className="w-[40%] print:!text-black">{t('tableHeaderItems')}</TableHead>
                            <TableHead className="text-right print:!text-black">{t('tableHeaderTotalAmount', { currencySymbol: '' })}</TableHead>
                            <TableHead className="print:!text-black">{t('tableHeaderStatus')}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                         {sales.map(sale => (
                            <TableRow key={sale.id}>
                                <TableCell className="font-mono text-xs align-top print:!text-black">{sale.invoiceNumber || sale.id.substring(0, 8)}</TableCell>
                                <TableCell className="align-top print:!text-black">{new Date(sale.date).toLocaleDateString()}</TableCell>
                                <TableCell className="print:!text-black">
                                    {(sale.items && sale.items.length > 0) ? (
                                        <div className="flex flex-col gap-2">
                                            {sale.items.map((item, index) => (
                                                <div key={item.productId + '_' + index} className="text-sm">
                                                    <div className="flex justify-between items-center gap-2">
                                                        <span className="font-medium print:!text-black">{item.name}</span>
                                                        <span className="font-mono font-semibold text-xs whitespace-nowrap print:!text-black">{currencyFormatter(item.priceUSD * item.quantity)}</span>
                                                    </div>
                                                    <div className="text-xs text-gray-600 print:!text-black">
                                                        {item.quantity} &times; {currencyFormatter(item.priceUSD)}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <span className="text-gray-500 text-sm print:!text-black">({t('noItemsInSale')})</span>
                                    )}
                                </TableCell>
                                <TableCell className="text-right font-semibold align-top print:!text-black">{currencyFormatter(sale.totalUSD)}</TableCell>
                                <TableCell className="align-top print:!text-black">
                                    {sale.status === 'Paid' ? 'Paid' : 'Debt'}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            <div className="text-center text-xs mt-6 pt-4 border-t print:!border-black">
                <p className="print:!text-black">Thank you for your business!</p>
                <p className="print:!text-black">شكراً لتعاملكم معنا!</p>
            </div>
        </div>
      </div>
    );
}));
PrintableCustomerHistory.displayName = 'PrintableCustomerHistory';


export default function CustomerDetailsPage() {
    const t = useTranslations('CustomerDetailsPage');
    const tg = useTranslations('General');
    const tCustomers = useTranslations('CustomersPage');
    const tSales = useTranslations('SalesPage');
    const locale = useLocale();
    const params = useParams();
    const router = useRouter();
    const { formatCurrency, selectedCurrency } = useCurrency();
    const { customers } = useCustomerData();
    const { updateCustomer } = useCustomerActions();
    const { activeBranch } = useSettings();
    const printComponentRef = useRef<HTMLDivElement>(null);

    const customerId = params.id as string;
    const customer = React.useMemo(() => customers.find(c => c.id === customerId), [customers, customerId]);

    const { sales: allSales, isLoading: isLoadingSales } = useSaleData();

    const customerSales = React.useMemo(() => {
        if (!customerId || !allSales) return [];
        return allSales
            .filter(sale => sale.customerId === customerId)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [allSales, customerId]);

    const totalPurchasesUSD = React.useMemo(() => {
        return customerSales.reduce((sum, sale) => sum + sale.totalUSD, 0);
    }, [customerSales]);


    // State for modals
    const [isEditNameModalOpen, setIsEditNameModalOpen] = useState(false);
    const [newCustomerName, setNewCustomerName] = useState('');
    const [isEditPhoneModalOpen, setIsEditPhoneModalOpen] = useState(false);
    const [newPhoneNumber, setNewPhoneNumber] = useState('');
    
    useEffect(() => {
        if (isEditNameModalOpen && customer) {
            setNewCustomerName(customer.name);
        }
    }, [isEditNameModalOpen, customer]);

    useEffect(() => {
        if (isEditPhoneModalOpen && customer) {
            setNewPhoneNumber(customer.phone || '');
        }
    }, [isEditPhoneModalOpen, customer]);

    const handleSaveName = useCallback(() => {
        if (customer) {
            updateCustomer(customer.id, { name: newCustomerName });
        }
        setIsEditNameModalOpen(false);
    }, [customer, newCustomerName, updateCustomer]);

    const handleSavePhone = useCallback(() => {
        if (customer) {
            updateCustomer(customer.id, { phone: newPhoneNumber });
        }
        setIsEditPhoneModalOpen(false);
    }, [customer, newPhoneNumber, updateCustomer]);

    if (!customer) {
        return (
            <div>
                <PageHeader title={t('customerNotFound')} description={t('customerNotFoundDescription')} />
                <Button onClick={() => router.back()}><ArrowLeft className="h-4 w-4" /> {t('backToCustomers')}</Button>
            </div>
        );
    }
    
    const getStatusBadgeVariant = (status: 'Paid' | 'Debt') => {
        return status === 'Paid' ? 'default' : 'destructive';
    };
    const getStatusTranslation = (status: 'Paid' | 'Debt') => {
        if (status === 'Paid') return tSales('paidStatus');
        if (status === 'Debt') return tSales('debtStatus');
        return status;
    }

    const PurchaseHistorySkeleton = () => (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('tableHeaderInvoiceNo')}</TableHead>
            <TableHead>{t('tableHeaderDate')}</TableHead>
            <TableHead className="w-[40%]">{t('tableHeaderItems')}</TableHead>
            <TableHead className="text-right">{t('tableHeaderTotalAmount', { currencySymbol: selectedCurrency.symbol })}</TableHead>
            <TableHead>{t('tableHeaderStatus')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {[...Array(3)].map((_, i) => (
            <TableRow key={i}>
              <TableCell><Skeleton className="h-5 w-20" /></TableCell>
              <TableCell><Skeleton className="h-5 w-24" /></TableCell>
              <TableCell><Skeleton className="h-10 w-full" /></TableCell>
              <TableCell className="text-right"><Skeleton className="h-5 w-16 ml-auto" /></TableCell>
              <TableCell><Skeleton className="h-6 w-16" /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );

    return (
        <>
            <div className="print:hidden">
                <PageHeader
                    title={t('title', { customerName: customer.name })}
                    description={t('description')}
                    actions={
                        <div className="flex gap-2">
                            <Button onClick={() => router.back()} variant="outline">
                                <ArrowLeft className="h-4 w-4" /> {t('backToCustomers')}
                            </Button>
                             <Button onClick={() => window.print()} variant="outline">
                                <Printer className="h-4 w-4" /> {t('printButton')}
                            </Button>
                        </div>
                    }
                />
                
                <Dialog open={isEditNameModalOpen} onOpenChange={setIsEditNameModalOpen}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>{t('editNameModalTitle', {customerName: customer.name})}</DialogTitle>
                            <DialogDescription>{t('editNameModalDescription')}</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div>
                                <Label htmlFor="customer-name">{tCustomers('customerNameLabel')}</Label>
                                <Input 
                                    id="customer-name" 
                                    value={newCustomerName}
                                    onChange={(e) => setNewCustomerName(e.target.value)}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsEditNameModalOpen(false)}>{tg('cancel')}</Button>
                            <Button onClick={handleSaveName}>{tg('save')}</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                <Dialog open={isEditPhoneModalOpen} onOpenChange={setIsEditPhoneModalOpen}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>{t('editPhoneModalTitle', {customerName: customer.name})}</DialogTitle>
                            <DialogDescription>{t('editPhoneModalDescription')}</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div>
                                <Label htmlFor="customer-phone">{tCustomers('phoneLabel')}</Label>
                                <Input 
                                    id="customer-phone"
                                    type="tel"
                                    dir="ltr"
                                    value={newPhoneNumber}
                                    onChange={(e) => setNewPhoneNumber(e.target.value)}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsEditPhoneModalOpen(false)}>{tg('cancel')}</Button>
                            <Button onClick={handleSavePhone}>{tg('save')}</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                    <Card className="lg:col-span-1">
                        <CardHeader>
                            <CardTitle>{t('customerInfo')}</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                             <div className="[&>div]:border-b [&>div:last-child]:border-0">
                                <div className="flex items-center justify-between p-4">
                                    <span className="text-muted-foreground flex items-center gap-2"><User className="h-4 w-4" /> {tCustomers('tableHeaderCustomerName')}</span>
                                    <div className="flex items-center gap-1">
                                        <span className="font-medium">{customer.name}</span>
                                        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => setIsEditNameModalOpen(true)}>
                                            <Pencil className="h-4 w-4 text-muted-foreground" />
                                        </Button>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between p-4">
                                     <span className="text-muted-foreground flex items-center gap-2"><Phone className="h-4 w-4" /> {t('customerPhone')}</span>
                                    <div className="flex items-center gap-1">
                                        <span className="font-medium dir-ltr">{customer.phone || 'N/A'}</span>
                                        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => setIsEditPhoneModalOpen(true)}>
                                            <Pencil className="h-4 w-4 text-muted-foreground" />
                                        </Button>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between p-4">
                                    <span className="text-muted-foreground flex items-center gap-2"><Calendar className="h-4 w-4" /> {t('memberSince', { date: '' }).replace('{date}','').trim()}</span>
                                    <span className="font-medium">{new Date(customer.customerSince).toLocaleDateString(locale)}</span>
                                </div>
                                <div className="flex items-center justify-between p-4">
                                    <span className="text-muted-foreground flex items-center gap-2"><ShoppingCart className="h-4 w-4" /> {t('totalPurchases')}</span>
                                    <Badge variant="default">
                                        {formatCurrency(totalPurchasesUSD)}
                                    </Badge>
                                </div>
                                <div className="flex items-center justify-between p-4">
                                    <span className="text-muted-foreground">{t('outstandingDebt')}</span>
                                    <Badge variant={customer.totalDebtUSD > 0 ? "destructive" : "default"}>
                                        {formatCurrency(customer.totalDebtUSD)}
                                    </Badge>
                                </div>
                             </div>
                             {customer.totalDebtUSD > 0 && (
                                <div className="p-4">
                                     <Button asChild variant="secondary" className="w-full">
                                         <Link href={`/${locale}/debts/${customer.debtId}`}>
                                            <Eye className="h-4 w-4"/>
                                            {t('viewDebtHistory')}
                                         </Link>
                                     </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                    
                    <Card className="lg:col-span-2">
                        <CardHeader>
                            <CardTitle>{t('purchaseHistoryTitle')}</CardTitle>
                            <CardDescription>{t('purchaseHistoryDescription')}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {isLoadingSales ? <PurchaseHistorySkeleton /> : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>{t('tableHeaderInvoiceNo')}</TableHead>
                                            <TableHead>{t('tableHeaderDate')}</TableHead>
                                            <TableHead className="w-[40%]">{t('tableHeaderItems')}</TableHead>
                                            <TableHead className="text-right">{t('tableHeaderTotalAmount', { currencySymbol: selectedCurrency.symbol })}</TableHead>
                                            <TableHead>{t('tableHeaderStatus')}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {customerSales.length > 0 ? customerSales.map(sale => (
                                            <TableRow key={sale.id}>
                                                <TableCell className="font-mono text-xs align-top">{sale.invoiceNumber || sale.id.substring(0, 8)}</TableCell>
                                                <TableCell className="align-top">{new Date(sale.date).toLocaleDateString(locale)}</TableCell>
                                                <TableCell>
                                                    {(sale.items && sale.items.length > 0) ? (
                                                        <div className="flex flex-col gap-2">
                                                            {sale.items.map((item, index) => (
                                                                <div key={item.productId + '_' + index} className="text-sm">
                                                                    <div className="flex justify-between items-center gap-2">
                                                                        <span className="font-medium">{item.name}</span>
                                                                        <span className="font-mono font-semibold text-xs whitespace-nowrap">{formatCurrency(item.priceUSD * item.quantity)}</span>
                                                                    </div>
                                                                    <div className="text-xs text-muted-foreground">
                                                                        {item.quantity} &times; {formatCurrency(item.priceUSD)}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <span className="text-muted-foreground text-sm">({t('noItemsInSale')})</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right font-semibold align-top">{formatCurrency(sale.totalUSD)}</TableCell>
                                                <TableCell className="align-top">
                                                    <Badge variant={getStatusBadgeVariant(sale.status)}>{getStatusTranslation(sale.status)}</Badge>
                                                </TableCell>
                                            </TableRow>
                                        )) : (
                                            <TableRow>
                                                <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">{t('noSalesFound')}</TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
            <div className="hidden print:block">
                <PrintableCustomerHistory
                    ref={printComponentRef}
                    customer={customer}
                    sales={customerSales}
                    currencyFormatter={formatCurrency}
                    t={t}
                    tg={tg}
                    branchName={activeBranch?.name || 'Rawnak Sales'}
                />
            </div>
        </>
    );
}
