
'use client'; 

import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import dynamic from 'next/dynamic';
import PageHeader from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, Trash2, Percent, DollarSign, Printer, Eye, MoreHorizontal, PackageSearch, User, Loader2, ConciergeBell } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useCurrency } from '@/contexts/currency-context';
import type { Customer } from '@/contexts/customer-context';
import { useCustomerData } from '@/contexts/customer-context';
import type { Product } from '@/contexts/product-context';
import { useProductData, initialDefinedCategories } from '@/contexts/product-context';
import { useToast } from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/toast';
import type { Sale, SaleItem } from '@/contexts/sale-context';
import { useSaleData, useSaleActions } from '@/contexts/sale-context';
import { useSettings, type InvoiceSettings } from '@/contexts/settings-context';
import { Skeleton } from '@/components/ui/skeleton';
import CustomItemModal from '@/components/sales/custom-item-modal';


const PrintableReceipt = React.forwardRef<HTMLDivElement, { 
  sale: Sale | null; 
  currencyFormatter: (amount: number) => string; 
  t: any; tg: any; 
  branchName: string;
  invoiceSettings: InvoiceSettings;
  locale: string;
}>(({ sale, currencyFormatter, t, tg, branchName, invoiceSettings, locale }, ref) => {
    if (!sale) {
        return null;
    }
    const items = sale.items || [];
    const subtotal = items.reduce((sum, item) => sum + item.priceUSD * item.quantity, 0);
    const discountAmount = sale.discountAmountUSD || 0;
    const total = subtotal - discountAmount;
    const footerText = invoiceSettings.footerText || 'Thank you for your business!';

    if (invoiceSettings.template === 'compact') {
        return (
            <div ref={ref} className="bg-white text-black font-mono p-2 text-xs w-[72mm] mx-auto print:!text-black">
                <div className="text-center mb-2">
                    <h1 className="font-bold text-sm">{branchName}</h1>
                    <p>{t('receiptTitle')}</p>
                </div>
                <hr className="border-dashed border-black my-1"/>
                <div className="text-start text-[10px]">
                    <p>{t('receiptBilledTo')}: {sale.customerName}</p>
                    {sale.customerPhone && <p>{t('receiptCustomerPhone')}: <span dir="ltr" className="inline-block">{sale.customerPhone}</span></p>}
                    <p>{t('receiptInvoiceNo')}: {sale.invoiceNumber || sale.id}</p>
                    <p>{t('receiptDate')}: {new Date(sale.date).toLocaleString()}</p>
                </div>
                <hr className="border-dashed border-black my-1"/>
                {/* Header */}
                <div className="flex font-bold">
                    <div className="flex-grow">{t('tableHeaderProduct')}</div>
                    <div className="w-12 text-center">{t('tableHeaderQuantity')}</div>
                    <div className="w-16 text-end">{t('receiptTotal')}</div>
                </div>
                <hr className="border-dashed border-black my-1"/>
                {/* Items */}
                {items.length > 0 ? items.map((item) => (
                    <div key={item.productId} className="mb-1">
                        <div>{item.name}</div>
                        <div className="flex justify-between">
                            <span className="ps-2">{item.quantity} x {currencyFormatter(item.priceUSD)}</span>
                            <span>{currencyFormatter(item.priceUSD * item.quantity)}</span>
                        </div>
                    </div>
                )) : (
                    <p className="text-center py-2">{t('noItemsInCart')}</p>
                )}
                <hr className="border-dashed border-black my-1"/>
                {/* Totals */}
                 <div className="mt-2 space-y-1">
                    <div className="flex justify-between">
                        <span>{t('subtotalLabel', { amount: '' }).split(':')[0]}:</span>
                        <span className="font-mono">{currencyFormatter(subtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>
                            {t('discountAmountLabel', { amount: '' }).split(':')[0]}
                            {sale.discountType === 'percentage' && ` (${sale.discountValue || 0}%)`}
                        </span>
                        <span className="font-mono">-{currencyFormatter(discountAmount)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-sm border-t pt-1 mt-1 border-black border-dashed">
                        <span>{t('totalAmountLabel', { amount: '' }).split(':')[0]}:</span>
                        <span className="font-mono">{currencyFormatter(total)}</span>
                    </div>
                    <div className="flex justify-between mt-1">
                        <span>{t('receiptPaymentMethod')}:</span>
                        <span className="font-semibold">{sale.status === 'Paid' ? t('paidStatus') : t('debtStatus')}</span>
                    </div>
                </div>

                <div className="text-center mt-4 pt-2 border-t border-black border-dashed">
                    <div className="whitespace-pre-wrap text-[10px]">
                        {footerText}
                    </div>
                </div>
            </div>
        );
    }

    // Standard Template
    return (
      <div ref={ref} className="bg-white text-black font-sans p-4 print:!text-black">
        <div className="w-full max-w-md mx-auto">
            <div className="text-center mb-6">
                <h1 className="text-2xl font-bold">{branchName}</h1>
                <p className="text-sm">{t('receiptTitle')}</p>
            </div>
            <div className="flex justify-between text-sm mb-4 border-b border-dashed pb-2 border-black">
                <div>
                    <p><span className="font-bold">{t('receiptBilledTo')}:</span> {sale.customerName}</p>
                    {sale.customerPhone && <p className="text-xs">{t('receiptCustomerPhone')}: <span dir="ltr" className="inline-block">{sale.customerPhone}</span></p>}
                </div>
                <div className="text-end">
                    <p><span className="font-bold">{t('receiptInvoiceNo')}:</span> {sale.invoiceNumber || sale.id}</p>
                    <p><span className="font-bold">{t('receiptDate')}:</span> {new Date(sale.date).toLocaleString()}</p>
                </div>
            </div>
            
            <table className="w-full text-sm border-collapse border border-black mb-4">
                <thead>
                    <tr className="border-b border-black bg-gray-100">
                        <th className="p-1 border-e border-black text-start font-bold">{t('tableHeaderProduct')}</th>
                        <th className="p-1 border-e border-black text-center font-bold w-16">{t('tableHeaderQuantity')}</th>
                        <th className="p-1 border-e border-black text-end font-bold w-24">{t('receiptUnitPrice')}</th>
                        <th className="p-1 text-end font-bold w-24">{t('receiptTotal')}</th>
                    </tr>
                </thead>
                <tbody>
                    {items.length > 0 ? items.map((item) => (
                        <tr key={item.productId} className="border-b border-black">
                            <td className="p-1 border-e border-black">{item.name}</td>
                            <td className="p-1 border-e border-black text-center font-mono">{item.quantity}</td>
                            <td className="p-1 border-e border-black text-end font-mono">{currencyFormatter(item.priceUSD)}</td>
                            <td className="p-1 text-end font-mono">{currencyFormatter(item.priceUSD * item.quantity)}</td>
                        </tr>
                    )) : (
                        <tr>
                            <td colSpan={4} className="p-4 text-center text-gray-500">{t('noItemsInCart')}</td>
                        </tr>
                    )}
                </tbody>
            </table>

            <div className="mt-4 text-sm space-y-1">
                <div className="flex justify-between">
                    <span>{t('subtotalLabel', { amount: '' }).split(':')[0]}:</span>
                    <span className="font-mono">{currencyFormatter(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                    <span>
                        {t('discountAmountLabel', { amount: '' }).split(':')[0]}
                        {sale.discountType === 'percentage' && ` (${sale.discountValue || 0}%)`}
                    </span>
                    <span className="font-mono text-red-600">-{currencyFormatter(discountAmount)}</span>
                </div>
                <div className="flex justify-between font-bold text-base border-t pt-2 mt-2 border-black">
                    <span>{t('totalAmountLabel', { amount: '' }).split(':')[0]}:</span>
                    <span className="font-mono">{currencyFormatter(total)}</span>
                </div>
                 <div className="flex justify-between mt-2">
                    <span>{t('receiptPaymentMethod')}:</span>
                    <span className="font-semibold">{sale.status === 'Paid' ? t('paidStatus') : t('debtStatus')}</span>
                </div>
            </div>
            
            <div className="text-center text-xs mt-6 pt-4 border-t border-black">
                <div className="whitespace-pre-wrap">{footerText}</div>
            </div>
        </div>
      </div>
    );
});
PrintableReceipt.displayName = 'PrintableReceipt';

const ProductSelectionModal = dynamic(() => import('@/components/sales/product-selection-modal'), {
  ssr: false,
  loading: () => (
    <Dialog open={true}>
      <DialogContent className="max-w-4xl h-[80vh]">
        <DialogHeader>
          <DialogTitle>{'Add Product to Cart'}</DialogTitle>
          <Skeleton className="h-10 w-full mt-2" />
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 flex-grow overflow-hidden">
          <div className="md:col-span-1 space-y-2">
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
          <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <Card key={i}><CardContent className="p-3 space-y-2"><Skeleton className="h-5 w-3/4" /><Skeleton className="h-4 w-1/2" /><Skeleton className="h-4 w-1/3" /></CardContent></Card>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
});

const CustomerSelectionModal = dynamic(() => import('@/components/sales/customer-selection-modal'), {
  ssr: false,
  loading: () => (
    <Dialog open={true}>
      <DialogContent className="max-w-2xl h-[70vh]">
        <DialogHeader>
            <DialogTitle><Skeleton className="h-8 w-1/3" /></DialogTitle>
             <Skeleton className="h-10 w-full mt-2" />
        </DialogHeader>
         <div className="space-y-2 py-4">
            {[...Array(5)].map((_, i) => <Card key={i} className="p-3"><Skeleton className="h-5 w-3/4 mb-2" /><Skeleton className="h-4 w-1/2" /></Card>)}
        </div>
      </DialogContent>
    </Dialog>
  )
});


export default function SalesPage() {
  const t = useTranslations('SalesPage');
  const tg = useTranslations('General');
  const t_products = useTranslations('ProductsPage');
  const t_customers = useTranslations('CustomersPage');
  const locale = useLocale();
  const { formatCurrency, selectedCurrency, convertFromSelectedCurrencyToUSD } = useCurrency();
  const { products, categories } = useProductData();
  const { toast } = useToast();
  const { recordNewSaleTransaction } = useSaleActions();
  const { sales: allSales } = useSaleData();
  const { activeBranch, invoiceSettings } = useSettings();

  const recentSales = useMemo(() => allSales.slice(0, 5), [allSales]);

  const [cart, setCart] = useState<SaleItem[]>([]);
  const [discountValue, setDiscountValue] = useState<string>('');
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'paid' | 'debt'>('paid');
  
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [saleToPrint, setSaleToPrint] = useState<Sale | null>(null);
  const printComponentRef = useRef<HTMLDivElement>(null);
  
  // State for modals
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isCustomItemModalOpen, setIsCustomItemModalOpen] = useState(false);
  
  const handlePrint = (sale: Sale) => {
    setSaleToPrint(sale);
  }

  useEffect(() => {
    if (saleToPrint && printComponentRef.current) {
        window.print();
        setSaleToPrint(null);
    }
  }, [saleToPrint]);

  const translateCategory = useCallback((category: string) => {
      const isPredefined = initialDefinedCategories.some(c => c.toLowerCase() === category.toLowerCase());
      if (isPredefined) {
        const key = `${category.toLowerCase().replace(/\s/g, '')}Category`;
        return t_products(key as any, {}, { defaultValue: category });
      }
      return category;
  }, [t_products]);

  const productFinder = useMemo(() => {
    return products.reduce((acc, p) => {
      acc[p.id] = p;
      return acc;
    }, {} as Record<string, Product>);
  }, [products]);

  const handleRemoveFromCart = (productId: string) => {
    setCart(currentCart => currentCart.filter(item => item.productId !== productId));
  };

  const handleUpdateCartQuantity = (productId: string, newQuantity: number) => {
    // For custom items (not in inventory), there's no stock check
    if (!productId.startsWith('custom-')) {
        const product = productFinder[productId];
        if (!product) return;

        if (newQuantity > product.stock) {
        toast({
            title: t('notEnoughStock'),
            description: t('notEnoughStockDescription', { stock: product.stock, productName: product.name }),
            variant: "destructive",
        });
        // Cap at max stock
        setCart(currentCart => currentCart.map(item => item.productId === productId ? { ...item, quantity: product.stock } : item));
        return;
        }
    }
    
    if (newQuantity <= 0) {
      handleRemoveFromCart(productId);
    } else {
      setCart(currentCart => currentCart.map(item => item.productId === productId ? { ...item, quantity: newQuantity } : item));
    }
  };

  const handleSelectProduct = (product: Product) => {
    const existingItem = cart.find(item => item.productId === product.id);

    if (existingItem) {
      if (existingItem.quantity >= product.stock) {
        toast({
          title: t('notEnoughStock'),
          description: t('notEnoughStockDescription', { stock: product.stock, productName: product.name }),
          variant: 'destructive',
        });
        return;
      }
      // Increment quantity if item already in cart
      handleUpdateCartQuantity(product.id, existingItem.quantity + 1);

    } else {
      // Add new item to cart
      setCart(currentCart => [...currentCart, { 
        productId: product.id, 
        name: product.name, 
        priceUSD: product.priceUSD, 
        purchasePriceUSD: product.purchasePriceUSD,
        quantity: 1 
      }]);
    }
    toast({
      title: t('productAddedToCartTitle'),
      description: t('productAddedToCartDescription', { productName: product.name }),
    });
  };

  const handleAddCustomItem = useCallback((item: {name: string, salePrice: number, purchasePrice: number, quantity: number}) => {
    const salePriceUSD = convertFromSelectedCurrencyToUSD(item.salePrice);
    const purchasePriceUSD = convertFromSelectedCurrencyToUSD(item.purchasePrice);
    
    const customItem: SaleItem = {
      productId: `custom-${Date.now()}`,
      name: item.name,
      priceUSD: salePriceUSD,
      purchasePriceUSD: purchasePriceUSD,
      quantity: item.quantity
    };
    setCart(currentCart => [...currentCart, customItem]);
    setIsCustomItemModalOpen(false);
    toast({
      title: t('customItemAddedTitle'),
      description: t('customItemAddedDescription', { itemName: item.name }),
    });
  }, [convertFromSelectedCurrencyToUSD, t, toast]);


  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsCustomerModalOpen(false);
    toast({
        title: t('customerSelectedTitle'),
        description: t('customerSelectedDescription', {name: customer.name})
    })
  };


  const subtotalUSD = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.priceUSD * item.quantity, 0);
  }, [cart]);

  const discountAmountUSD = useMemo(() => {
    const numericDiscount = parseFloat(discountValue) || 0;
    if (numericDiscount <= 0) return 0;

    if (discountType === 'percentage') {
      if (numericDiscount > 100) return subtotalUSD; // Cap at 100%
      return subtotalUSD * (numericDiscount / 100);
    } else { // 'fixed'
      const fixedDiscountUSD = convertFromSelectedCurrencyToUSD(numericDiscount);
      return Math.min(fixedDiscountUSD, subtotalUSD); // Cannot discount more than subtotal
    }
  }, [subtotalUSD, discountValue, discountType, convertFromSelectedCurrencyToUSD]);

  const totalUSD = useMemo(() => {
    return subtotalUSD - discountAmountUSD;
  }, [subtotalUSD, discountAmountUSD]);

  const resetForm = useCallback(() => {
    setCart([]);
    setDiscountValue('');
    setDiscountType('percentage');
    setSelectedCustomer(null);
    setPaymentMethod('paid');
  }, []);

  const handleRecordSale = () => {
    if (!selectedCustomer) {
      toast({ title: t('customerNotSelectedTitle'), description: t('customerNotSelectedDesc'), variant: "destructive" });
      return;
    }
    if (cart.length === 0) {
      toast({ title: t('cartIsEmptyTitle'), description: t('cartIsEmptyDesc'), variant: "destructive" });
      return;
    }

    setIsProcessing(true);

    recordNewSaleTransaction({
      cart,
      customer: selectedCustomer,
      totalUSD,
      paymentMethod,
      discountType,
      discountValue: parseFloat(discountValue) || 0,
      discountAmountUSD,
    })
    .then((newSale) => {
      toast({
        title: t('saleRecordedSuccessfully'),
        description: t('stockAndRecordsUpdated'),
        action: <ToastAction altText={t('printReceiptButton')} onClick={() => handlePrint(newSale)}>{t('printReceiptButton')}</ToastAction>,
      });
      resetForm();
    })
    .catch((error) => {
      console.error("Failed to record sale:", error);
       toast({
          title: tg('errorTitle'),
          description: (error as Error).message || t('saleRecordError'),
          variant: "destructive"
      });
    })
    .finally(() => {
        setIsProcessing(false);
    });
  }


  return (
    <>
      <div className="print:hidden">
        <PageHeader
          title={t('title')}
          description={t('description')}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="font-headline">{t('newSaleCardTitle')}</CardTitle> 
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="customer">{t('customerLabel')}</Label>
                  <Button variant="outline" className="w-full justify-start text-muted-foreground" onClick={() => setIsCustomerModalOpen(true)}>
                    {selectedCustomer ? (
                        <span className="text-foreground flex items-center gap-2"><User className="h-4 w-4" />{selectedCustomer.name}</span>
                    ) : (
                       <span className="flex items-center gap-2"><User className="h-4 w-4" />{t('selectCustomerPlaceholder')}</span>
                    )}
                  </Button>
                </div>
                <div>
                  <Label htmlFor="sale-date">{t('saleDateLabel')}</Label>
                  <Input id="sale-date" type="date" defaultValue={new Date().toISOString().substring(0, 10)} />
                </div>
              </div>

              <div>
                <Label>{t('addProductLabel')}</Label>
                <div className="flex flex-col sm:flex-row gap-2">
                    <Button variant="outline" className="w-full justify-start gap-2" onClick={() => setIsProductModalOpen(true)}>
                        <PlusCircle className="h-4 w-4" /> {t('browseProductsButton')}
                    </Button>
                     <Button variant="outline" className="w-full justify-start gap-2" onClick={() => setIsCustomItemModalOpen(true)}>
                        <ConciergeBell className="h-4 w-4" /> {t('addCustomItemButton')}
                    </Button>
                </div>
              </div>
              
              <div className="rounded-md border">
                  <Table>
                      <TableHeader>
                          <TableRow>
                          <TableHead>{tg('no')}</TableHead>
                          <TableHead>{t('tableHeaderProduct')}</TableHead>
                          <TableHead className="text-center">{t('tableHeaderQuantity')}</TableHead>
                          <TableHead className="text-end">{t('tableHeaderPrice', { currencySymbol: selectedCurrency.symbol })}</TableHead>
                          <TableHead className="text-end">{t('tableHeaderTotal', { currencySymbol: selectedCurrency.symbol })}</TableHead>
                          <TableHead className="text-center">{t('tableHeaderAction')}</TableHead>
                          </TableRow>
                      </TableHeader>
                      <TableBody>
                          {cart.length === 0 && (
                              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-4">{t('noItemsInCart')}</TableCell></TableRow>
                          )}
                          {cart.map((item, index) => (
                              <TableRow key={item.productId}>
                                  <TableCell className="font-mono">{index + 1}</TableCell>
                                  <TableCell>{item.name}</TableCell>
                                  <TableCell className="w-28 text-center">
                                    <Input
                                      type="number"
                                      value={item.quantity}
                                      onChange={(e) => handleUpdateCartQuantity(item.productId, parseInt(e.target.value, 10))}
                                      className="h-8 text-center"
                                      min="1"
                                      max={!item.productId.startsWith('custom-') ? (productFinder[item.productId]?.stock || item.quantity) : undefined}
                                    />
                                  </TableCell>
                                  <TableCell className="text-end">{formatCurrency(item.priceUSD)}</TableCell>
                                  <TableCell className="text-end">{formatCurrency(item.priceUSD * item.quantity)}</TableCell>
                                  <TableCell className="text-center">
                                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleRemoveFromCart(item.productId)}>
                                          <Trash2 className="h-4 w-4" />
                                      </Button>
                                  </TableCell>
                              </TableRow>
                          ))}
                      </TableBody>
                  </Table>
              </div>


              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                      <Label htmlFor="discount">{t('discountLabel')}</Label>
                      <div className="flex items-center">
                          <Input 
                            id="discount" 
                            type="number" 
                            placeholder="0" 
                            className="rounded-e-none focus:z-10 relative"
                            value={discountValue}
                            onChange={(e) => setDiscountValue(e.target.value)}
                            min="0"
                          />
                          <Select value={discountType} onValueChange={(value) => setDiscountType(value as 'percentage' | 'fixed')}>
                            <SelectTrigger className="w-[80px] rounded-s-none border-s-0">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="percentage">%</SelectItem>
                                <SelectItem value="fixed">{selectedCurrency.symbol}</SelectItem>
                            </SelectContent>
                          </Select>
                      </div>
                  </div>
                  <div>
                      <Label htmlFor="payment-status">{t('paymentStatusLabel')}</Label>
                      <Select value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as 'paid' | 'debt')}>
                          <SelectTrigger id="payment-status">
                          <SelectValue placeholder={t('selectStatusPlaceholder')} />
                          </SelectTrigger>
                          <SelectContent>
                          <SelectItem value="paid">{t('paidStatus')}</SelectItem>
                          <SelectItem value="debt">{t('debtStatus')}</SelectItem>
                          </SelectContent>
                      </Select>
                  </div>
              </div>
            </CardContent>
            <Separator className="my-4" />
            <CardFooter className="flex flex-col items-start rtl:items-end space-y-2">
              <div className="text-lg font-semibold">{t('subtotalLabel', {amount: formatCurrency(subtotalUSD)})}</div>
              <div className="text-muted-foreground">{t('discountAmountLabel', {amount: formatCurrency(discountAmountUSD)})}</div>
              <div className="text-xl font-bold text-primary">{t('totalAmountLabel', {amount: formatCurrency(totalUSD)})}</div>
              <Button size="lg" className="w-full md:w-auto mt-4" onClick={handleRecordSale} disabled={isProcessing}>
                {isProcessing ? <Loader2 className="h-5 w-5 animate-spin" /> : <DollarSign className="h-5 w-5" />}
                {t('recordSaleButton')}
              </Button>
            </CardFooter>
          </Card>

          <Card className="lg:col-span-1">
            <CardHeader>
                <CardTitle className="font-headline">{t('recentSalesCardTitle')}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <div className="divide-y">
                    {recentSales.map(sale => (
                        <div key={sale.id} className="flex items-center justify-between p-3">
                            <div>
                                <p className="font-medium">{sale.customerName}</p>
                                <p className="text-sm text-muted-foreground">{new Date(sale.date).toLocaleDateString(locale)}</p>
                            </div>
                            <div className="text-right">
                                <p className="font-semibold">{formatCurrency(sale.totalUSD)}</p>
                                <Badge variant={sale.status === 'Paid' ? 'default' : 'destructive'} className="text-xs">
                                    {sale.status === 'Paid' ? t('paidStatus') : t('debtStatus')}
                                </Badge>
                            </div>
                        </div>
                    ))}
                    {recentSales.length === 0 && (
                        <p className="p-4 text-center text-muted-foreground">{t('noSalesRecorded')}</p>
                    )}
                </div>
            </CardContent>
          </Card>
        </div>

        {isProductModalOpen && <ProductSelectionModal 
            isOpen={isProductModalOpen}
            onOpenChange={setIsProductModalOpen}
            onSelectProduct={handleSelectProduct}
            products={products}
            categories={categories}
            currencyFormatter={formatCurrency}
            translateCategory={translateCategory}
            t={t}
        />}

        {isCustomerModalOpen && <CustomerSelectionModal 
            isOpen={isCustomerModalOpen}
            onOpenChange={setIsCustomerModalOpen}
            onSelectCustomer={handleSelectCustomer}
            t_sales={t}
            t_customers={t_customers}
            t_general={tg}
        />}

        <CustomItemModal
            isOpen={isCustomItemModalOpen}
            onOpenChange={setIsCustomItemModalOpen}
            onAddItem={handleAddCustomItem}
            t={t}
            tg={tg}
            currencySymbol={selectedCurrency.symbol}
        />
      </div>
      <div className="hidden print:block">
        {saleToPrint && (
            <PrintableReceipt
                ref={printComponentRef}
                sale={saleToPrint}
                currencyFormatter={formatCurrency}
                t={t}
                tg={tg}
                branchName={activeBranch?.name || 'Rawnak Sales'}
                invoiceSettings={invoiceSettings}
                locale={locale}
            />
        )}
      </div>
    </>
  );
}
