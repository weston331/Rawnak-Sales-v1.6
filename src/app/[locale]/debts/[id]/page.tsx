
'use client';

import * as React from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import PageHeader from '@/components/shared/page-header';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Phone, ShoppingCart, Pencil, MessageSquareText, Printer, Trash2, HandCoins, Calendar as CalendarIcon, Loader2 } from 'lucide-react';
import { useCurrency } from '@/contexts/currency-context';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCustomerActions, useCustomerData } from '@/contexts/customer-context';
import type { Customer, Transaction } from '@/contexts/customer-context';
import { useSettings } from '@/contexts/settings-context';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { format } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';


const PrintableDebtHistory = React.memo(React.forwardRef<HTMLDivElement, { 
  customer: Customer | null; 
  currencyFormatter: (amount: number) => string; 
  t: any; 
  tg: any;
  branchName: string;
}>(({ customer, currencyFormatter, t, tg, branchName }, ref) => {
    
    const transactionsWithBalance = React.useMemo(() => {
        if (!customer) return [];
        let runningBalance = 0;
        return (customer.transactions || [])
          .slice()
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
          .map(tx => {
              if (tx.type === 'DEBIT') {
                  runningBalance += tx.amountUSD;
              } else {
                  runningBalance -= tx.amountUSD;
              }
              return { ...tx, balance: runningBalance };
          });
    }, [customer]);

    if (!customer) {
        return null;
    }

    const totalDebits = (customer.transactions || []).reduce((acc, tx) => tx.type === 'DEBIT' ? acc + tx.amountUSD : acc, 0);
    const totalCredits = (customer.transactions || []).reduce((acc, tx) => tx.type === 'CREDIT' ? acc + tx.amountUSD : acc, 0);


    return (
      <div ref={ref} className="bg-white text-black font-sans p-4 print:!text-black">
        <div className="w-full max-w-2xl mx-auto">
            <div className="text-center mb-6 border-b pb-4">
                <h1 className="text-2xl font-bold print:!text-black">{branchName}</h1>
                <p className="text-sm print:!text-black">{t('transactionHistory')}</p>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                <div>
                    <p><span className="font-bold">{t('customerNameLabel')}:</span> {customer.name}</p>
                    <p><span className="font-bold">{t('phone')}:</span> {customer.phone || 'N/A'}</p>
                </div>
                <div className="text-right">
                    <p><span className="font-bold">{tg('reportDate')}:</span> {new Date().toLocaleDateString()}</p>
                    <p><span className="font-bold">{t('totalDebt')}:</span> <span className="font-semibold">{currencyFormatter(customer.totalDebtUSD)}</span></p>
                </div>
            </div>
            
            <div className="flex text-xs font-bold border-b border-t py-1 mb-2 print:!border-black">
                <div className="w-[15%]">{t('tableHeaderDate')}</div>
                <div className="flex-grow">{t('tableHeaderDetails')}</div>
                <div className="w-[15%] text-right">{t('tableHeaderDebit')}</div>
                <div className="w-[15%] text-right">{t('tableHeaderCredit')}</div>
                <div className="w-[15%] text-right">{t('tableHeaderBalance')}</div>
            </div>

            <div className="text-sm space-y-2">
                {transactionsWithBalance.map((tx) => (
                    <div key={tx.id} className="flex items-start border-b border-dashed pb-2">
                        <div className="w-[15%] font-mono text-xs">{new Date(tx.date).toLocaleDateString()}</div>
                        <div className="flex-grow pr-2">{tx.description}</div>
                        <div className="w-[15%] text-right font-mono text-red-600">{tx.type === 'DEBIT' ? currencyFormatter(tx.amountUSD) : '-'}</div>
                        <div className="w-[15%] text-right font-mono text-green-600">{tx.type === 'CREDIT' ? currencyFormatter(tx.amountUSD) : '-'}</div>
                        <div className="w-[15%] text-right font-mono font-semibold">{currencyFormatter(tx.balance)}</div>
                    </div>
                ))}
                 {transactionsWithBalance.length === 0 && (
                    <div className="text-center py-10 text-gray-500">
                        {t('noTransactionsFound')}
                    </div>
                 )}
            </div>

            <div className="mt-6 pt-4 border-t text-sm space-y-1 print:!border-black">
                <div className="flex justify-between font-medium">
                    <span>{t('totalDebtIncurred')}:</span>
                    <span className="font-mono">{currencyFormatter(totalDebits)}</span>
                </div>
                <div className="flex justify-between font-medium">
                    <span>{t('totalPaid')}:</span>
                    <span className="font-mono">{currencyFormatter(totalCredits)}</span>
                </div>
                <div className="flex justify-between font-bold text-base border-t pt-2 mt-2">
                    <span>{t('totalDebt')}:</span>
                    <span className="font-mono">{currencyFormatter(customer.totalDebtUSD)}</span>
                </div>
            </div>
            
            <div className="text-center text-xs mt-6 pt-4 border-t print:!border-black">
                <p className="print:!text-black">Thank you for your business!</p>
                <p className="print:!text-black">شكراً لتعاملكم معنا!</p>
            </div>
        </div>
      </div>
    );
}));
PrintableDebtHistory.displayName = 'PrintableDebtHistory';


export default function DebtHistoryPage() {
  const t = useTranslations('DebtHistoryPage');
  const tDebts = useTranslations('DebtsPage');
  const tg = useTranslations('General');
  const locale = useLocale();
  const params = useParams();
  const { formatCurrency, selectedCurrency, convertFromSelectedCurrencyToUSD } = useCurrency();
  const { customers, isLoading } = useCustomerData();
  const { updateCustomer, deleteTransaction } = useCustomerActions();
  const { activeBranch } = useSettings();
  const { toast } = useToast();
  
  const debtId = params.id as string;
  const printComponentRef = React.useRef<HTMLDivElement>(null);

  const customer = React.useMemo(() => {
    if (isLoading) return undefined; // Use undefined to signify not-yet-loaded state
    return customers.find(c => c.debtId === debtId) || null;
  }, [customers, debtId, isLoading]);


  // State for phone edit modal
  const [isEditModalOpen, setIsEditModalOpen] = React.useState(false);
  const [newPhoneNumber, setNewPhoneNumber] = React.useState('');
  
  // State for name edit modal
  const [isEditNameModalOpen, setIsEditNameModalOpen] = React.useState(false);
  const [newCustomerName, setNewCustomerName] = React.useState('');

  // State for transaction deletion
  const [transactionToDelete, setTransactionToDelete] = React.useState<Transaction | null>(null);
  
  // State for payment modal
  const [isPaymentModalOpen, setIsPaymentModalOpen] = React.useState(false);
  const [paymentAmount, setPaymentAmount] = React.useState('');
  const [paymentNotes, setPaymentNotes] = React.useState('');
  
  // State for due date popover
  const [isDueDatePopoverOpen, setIsDueDatePopoverOpen] = React.useState(false);

  React.useEffect(() => {
    if (isEditModalOpen && customer?.phone) {
        setNewPhoneNumber(customer.phone);
    } else if (isEditModalOpen) {
        setNewPhoneNumber('');
    }
  }, [isEditModalOpen, customer]);

  React.useEffect(() => {
    if (isEditNameModalOpen && customer) {
        setNewCustomerName(customer.name);
    }
  }, [isEditNameModalOpen, customer]);

  const handleSavePhone = React.useCallback(() => {
    if (customer) {
        updateCustomer(customer.id, { phone: newPhoneNumber });
    }
    setIsEditModalOpen(false);
  }, [customer, newPhoneNumber, updateCustomer]);

  const handleSaveName = React.useCallback(() => {
    if (customer) {
        updateCustomer(customer.id, { name: newCustomerName });
    }
    setIsEditNameModalOpen(false);
  }, [customer, newCustomerName, updateCustomer]);
  
  const handleSendReminder = React.useCallback(() => {
    if (!customer?.phone) {
      alert(tDebts('noPhoneNumber'));
      return;
    }

    const message = tDebts('reminderMessage', {
      customerName: customer.name,
      debtAmount: formatCurrency(customer.totalDebtUSD),
    });

    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${customer.phone}?text=${encodedMessage}`;

    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  }, [customer, formatCurrency, tDebts]);

  const handleDeleteTransaction = React.useCallback(() => {
    if (!customer || !transactionToDelete) return;
    deleteTransaction(customer, transactionToDelete.id);
    setTransactionToDelete(null);
  }, [customer, transactionToDelete, deleteTransaction]);

  const handleOpenPaymentModal = React.useCallback(() => {
    if (!customer) return;
    const debtAmountInSelectedCurrency = customer.totalDebtUSD > 0 ? customer.totalDebtUSD * (selectedCurrency.code === 'IQD' ? 1310 : 1) : 0;
    setPaymentAmount(debtAmountInSelectedCurrency > 0 ? debtAmountInSelectedCurrency.toFixed(selectedCurrency.code === 'IQD' ? 0 : 2) : '');
    setPaymentNotes('');
    setIsPaymentModalOpen(true);
  }, [customer, selectedCurrency]);

  const handleRecordPayment = React.useCallback(() => {
    if (!customer || !paymentAmount) return;

    const paymentAmountNumber = parseFloat(paymentAmount);
    if (isNaN(paymentAmountNumber) || paymentAmountNumber <= 0) {
        toast({ title: t('invalidAmountTitle'), description: t('invalidAmountDescription'), variant: 'destructive' });
        return;
    }
    
    const paymentAmountUSD = convertFromSelectedCurrencyToUSD(paymentAmountNumber);

    const newTransaction: Transaction = {
      id: `T${Date.now()}`,
      date: new Date().toISOString(),
      description: paymentNotes || tDebts('paymentNotesPlaceholder'),
      type: 'CREDIT',
      amountUSD: paymentAmountUSD,
    };
    
    updateCustomer(customer.id, {
      totalDebtUSD: customer.totalDebtUSD - paymentAmountUSD,
      transactions: [...(customer.transactions || []), newTransaction],
    });
    
    toast({ title: tDebts('recordPaymentButton'), description: t('paymentRecordedDescription', { amount: formatCurrency(paymentAmountUSD), customerName: customer.name })});
    setIsPaymentModalOpen(false);
  }, [customer, paymentAmount, paymentNotes, convertFromSelectedCurrencyToUSD, updateCustomer, toast, t, tDebts, formatCurrency]);

  const handleDueDateChange = React.useCallback((date: Date | undefined) => {
    if (customer && date) {
        const formattedDate = format(date, 'yyyy-MM-dd');
        updateCustomer(customer.id, { dueDate: formattedDate });
        toast({
            title: t('dueDateUpdated'),
            description: t('dueDateUpdatedDescription', {
                customerName: customer.name,
                date: format(date, 'yyyy-MM-dd'),
            })
        });
        setIsDueDatePopoverOpen(false);
    }
  }, [customer, updateCustomer, toast, t]);

  // --- Analytics Data Calculation ---
  const { totalDebits, totalCredits } = React.useMemo(() => {
    if (!customer) return { totalDebits: 0, totalCredits: 0 };
    return (customer.transactions || []).reduce((acc, tx) => {
        if (tx.type === 'DEBIT') acc.totalDebits += tx.amountUSD;
        if (tx.type === 'CREDIT') acc.totalCredits += tx.amountUSD;
        return acc;
    }, { totalDebits: 0, totalCredits: 0 });
  }, [customer]);

  const paymentRatio = totalDebits > 0 ? Math.min(Math.round((totalCredits / totalDebits) * 100), 100) : (customer?.totalDebtUSD <= 0 && customer?.transactions?.length > 0 ? 100 : 0);

  const customerStatus = React.useMemo(() => {
    if (!customer || !(customer.transactions || []).length) {
        return { text: t('customerStatusNew'), variant: 'outline' as const };
    }

    // Check if the debt is overdue. Today at midnight is the reference.
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isOverdue = customer.dueDate && new Date(customer.dueDate) < today;

    // Case 1: The debt is paid off. This is the best status.
    if (customer.totalDebtUSD <= 0) {
        return { text: t('customerStatusGood'), variant: 'default' as const };
    }

    // Case 2: The debt is overdue. This is the worst status, regardless of how much is paid.
    if (isOverdue) {
        return { text: t('customerStatusPoor'), variant: 'destructive' as const };
    }

    // Case 3: The debt is not overdue. Status depends on payment ratio.
    if (paymentRatio >= 70) {
        return { text: t('customerStatusGood'), variant: 'default' as const };
    }
    
    if (paymentRatio >= 30) {
        return { text: t('customerStatusAverage'), variant: 'secondary' as const };
    }

    // Case 4: Low payment ratio (<30%) but not yet overdue.
    // We consider them 'Average' as they haven't missed the deadline yet.
    return { text: t('customerStatusAverage'), variant: 'secondary' as const };
  }, [customer, t, paymentRatio]);
  
  const transactionsWithBalance = React.useMemo(() => {
    if (!customer) return [];
    let runningBalance = 0;
    // The transaction array from the customer object needs to be sorted to calculate the running balance correctly.
    return (customer.transactions || [])
      .slice() // Create a copy to avoid mutating the original array
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()) // Sort chronologically
      .map(tx => {
          if (tx.type === 'DEBIT') {
              runningBalance += tx.amountUSD;
          } else {
              runningBalance -= tx.amountUSD;
          }
          return { ...tx, balance: runningBalance };
      }).reverse(); // Reverse at the end to show the most recent first
  }, [customer]);


  if (isLoading || customer === undefined) {
    return (
        <div className="p-4 space-y-4">
            <div className="flex justify-between items-center">
                <div className="space-y-2">
                    <Skeleton className="h-8 w-64" />
                    <Skeleton className="h-4 w-80" />
                </div>
                <div className="flex gap-2">
                    <Skeleton className="h-10 w-24" />
                    <Skeleton className="h-10 w-24" />
                </div>
            </div>
            <Skeleton className="h-96 w-full" />
        </div>
    );
  }

  if (!customer) {
    return (
      <div className="print:hidden">
        <PageHeader title={t('customerNotFound')} description={t('customerNotFoundDescription')} />
        <Button asChild>
          <Link href={`/${locale}/debts`}><ArrowLeft className="h-4 w-4" /> {t('backToDebts')}</Link>
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="print:hidden">
        <PageHeader
            title={t('title', { customerName: customer.name })}
            description={t('description')}
            actions={
            <div className="flex flex-col sm:flex-row gap-2">
                <Button asChild variant="outline">
                <Link href={`/${locale}/debts`}><ArrowLeft className="h-4 w-4" /> {t('backToDebts')}</Link>
                </Button>
                <Button variant="outline" onClick={() => window.print()}>
                <Printer className="h-4 w-4" /> {t('printHistoryButton')}
                </Button>
                <Button onClick={handleOpenPaymentModal}>
                    <HandCoins className="h-4 w-4" /> {tDebts('actionRecordPayment')}
                </Button>
                <Button asChild>
                {/* This would ideally pre-fill the customer on the sales page */}
                <Link href={`/${locale}/sales`}><ShoppingCart className="h-4 w-4" /> {t('recordNewSale')}</Link>
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
                <Label htmlFor="customer-name">{t('newCustomerNameLabel')}</Label>
                <Input 
                    id="customer-name" 
                    type="text"
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

        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
            <DialogContent className="sm:max-w-md">
            <DialogHeader>
                <DialogTitle>{t('editPhoneModalTitle', {customerName: customer.name})}</DialogTitle>
                <DialogDescription>{t('editPhoneModalDescription')}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
                <div>
                <Label htmlFor="phone-number">{t('newPhoneNumberLabel')}</Label>
                <Input 
                    id="phone-number" 
                    type="tel"
                    dir="ltr" 
                    value={newPhoneNumber}
                    onChange={(e) => setNewPhoneNumber(e.target.value)}
                />
                </div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>{tg('cancel')}</Button>
                <Button onClick={handleSavePhone}>{tg('save')}</Button>
            </DialogFooter>
            </DialogContent>
        </Dialog>

        <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
            <DialogContent className="sm:max-w-md">
            <DialogHeader>
                <DialogTitle className="font-headline">{tDebts('recordPaymentModalTitle', {customerName: customer.name})}</DialogTitle>
                <DialogDescription>
                {tDebts('recordPaymentModalDescription', {debtAmount: formatCurrency(customer.totalDebtUSD)})}
                </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
                <div>
                <Label htmlFor="payment-amount">{tDebts('paymentAmountLabel', {currencySymbol: selectedCurrency.symbol})}</Label>
                <Input 
                    id="payment-amount" 
                    type="number" 
                    placeholder="0.00" 
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                />
                </div>
                <div>
                <Label htmlFor="payment-notes">{tDebts('paymentNotesLabel')}</Label>
                <Input 
                    id="payment-notes" 
                    placeholder={tDebts('paymentNotesPlaceholder')}
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                />
                </div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsPaymentModalOpen(false)}>{tg('cancel')}</Button>
                <Button type="submit" onClick={handleRecordPayment}>{tDebts('recordPaymentButton')}</Button>
            </DialogFooter>
            </DialogContent>
        </Dialog>
        
        <AlertDialog open={!!transactionToDelete} onOpenChange={(isOpen) => !isOpen && setTransactionToDelete(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{t('deleteTransactionConfirmTitle')}</AlertDialogTitle>
                    <AlertDialogDescription>
                        {t('deleteTransactionConfirmDescription')}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setTransactionToDelete(null)}>{tg('cancel')}</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteTransaction} className={buttonVariants({ variant: "destructive" })}>
                        {tg('delete')}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <Card className="lg:col-span-1">
            <CardHeader>
                <CardTitle>{t('customerDetails')}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <div className="[&>div]:border-b [&>div:last-child]:border-0">
                    {/* Customer Name */}
                    <div className="flex items-center justify-between p-4">
                        <span className="text-muted-foreground">{t('customerNameLabel')}</span>
                        <div className="flex items-center gap-1">
                            <span className="font-medium">{customer.name}</span>
                            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => setIsEditNameModalOpen(true)}>
                                <Pencil className="h-4 w-4 text-muted-foreground" />
                            </Button>
                        </div>
                    </div>

                    {/* Phone */}
                    <div className="flex items-center justify-between p-4">
                        <span className="text-muted-foreground">{t('phone')}</span>
                        <div className="flex items-center gap-1">
                            <span className="font-medium dir-ltr">{customer.phone || 'N/A'}</span>
                            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => setIsEditModalOpen(true)}>
                                <Pencil className="h-4 w-4 text-muted-foreground" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-green-600 hover:text-green-700 shrink-0" onClick={handleSendReminder} disabled={!customer.phone}>
                                <MessageSquareText className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                    
                    {/* Total Debt */}
                    <div className="flex items-center justify-between p-4">
                        <span className="text-muted-foreground">{t('totalDebt')}</span>
                        <Badge variant={customer.totalDebtUSD > 0 ? "destructive" : "default"} className="text-lg">
                        {formatCurrency(customer.totalDebtUSD)}
                        </Badge>
                    </div>

                    {/* Due Date */}
                    <div className="flex items-center justify-between p-4">
                        <span className="text-muted-foreground">{t('dueDateLabel')}</span>
                        <div>
                        <Popover open={isDueDatePopoverOpen} onOpenChange={setIsDueDatePopoverOpen}>
                            <PopoverTrigger asChild>
                            <Button
                                variant={"outline"}
                                className={cn(
                                "w-[200px] justify-start text-left font-normal",
                                !customer.dueDate && "text-muted-foreground"
                                )}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {customer.dueDate ? format(new Date(customer.dueDate), "yyyy-MM-dd") : <span>{t('setDueDate')}</span>}
                            </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="end">
                            <Calendar
                                mode="single"
                                selected={customer.dueDate ? new Date(customer.dueDate) : undefined}
                                onSelect={handleDueDateChange}
                                initialFocus
                            />
                            </PopoverContent>
                        </Popover>
                        </div>
                    </div>
                </div>
            </CardContent>
            </Card>

            <Card className="lg:col-span-2">
                <CardHeader>
                    <CardTitle className="font-headline">{t('analyticalViewTitle')}</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                    <div>
                        <h3 className="font-semibold text-sm mb-2">{t('paymentRatioTitle')}</h3>
                        <Progress value={paymentRatio} aria-label={`${paymentRatio}% paid`} className="h-2" />
                        <p className="text-xs text-muted-foreground mt-2">
                            {t('paymentRatioDescription', { ratio: paymentRatio })}
                        </p>
                        <div className="flex justify-between text-xs mt-1 text-muted-foreground">
                            <span>{t('totalPaid')}: {formatCurrency(totalCredits)}</span>
                            <span>{t('totalDebtIncurred')}: {formatCurrency(totalDebits)}</span>
                        </div>
                    </div>
                    <div>
                        <h3 className="font-semibold text-sm mb-2">{t('customerStatusTitle')}</h3>
                        <Badge variant={customerStatus.variant}>{customerStatus.text}</Badge>
                    </div>
                </CardContent>
            </Card>
        </div>

        <Card>
            <CardHeader>
            <CardTitle>{t('transactionHistory')}</CardTitle>
            </CardHeader>
            <CardContent>
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead>{tg('no')}</TableHead>
                    <TableHead>{t('tableHeaderDate')}</TableHead>
                    <TableHead>{t('tableHeaderDetails')}</TableHead>
                    <TableHead className="text-right">{t('tableHeaderDebit')}</TableHead>
                    <TableHead className="text-right">{t('tableHeaderCredit')}</TableHead>
                    <TableHead className="text-right">{t('tableHeaderBalance')}</TableHead>
                    <TableHead className="text-right">{t('tableHeaderActions')}</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {transactionsWithBalance.map((tx, index) => (
                    <TableRow key={tx.id}>
                    <TableCell className="font-mono">{index + 1}</TableCell>
                    <TableCell className="font-mono text-sm">{new Date(tx.date).toLocaleDateString(locale)}</TableCell>
                    <TableCell>
                        {tx.type === 'DEBIT' && tx.items && tx.items.length > 0 ? (
                        <div className="flex flex-col gap-2">
                            {tx.items.map((item, i) => (
                            <div key={item.productId + '_' + i} className="text-sm">
                                <div className="flex justify-between">
                                <span className="font-medium">{item.name}</span>
                                <span className="font-mono font-semibold">{formatCurrency(item.priceUSD * item.quantity)}</span>
                                </div>
                                <div className="text-xs text-muted-foreground">
                                {item.quantity} &times; {formatCurrency(item.priceUSD)}
                                </div>
                            </div>
                            ))}
                        </div>
                        ) : (
                        tx.description
                        )}
                    </TableCell>
                    <TableCell className="text-right font-medium text-destructive">
                        {tx.type === 'DEBIT' ? formatCurrency(tx.amountUSD) : '-'}
                    </TableCell>
                    <TableCell className="text-right font-medium text-green-600">
                        {tx.type === 'CREDIT' ? formatCurrency(tx.amountUSD) : '-'}
                    </TableCell>
                    <TableCell className="text-right font-semibold">{formatCurrency(tx.balance)}</TableCell>
                    <TableCell className="text-right">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => setTransactionToDelete(tx)}>
                        <span className="sr-only">Delete Transaction</span>
                        <Trash2 className="h-4 w-4" />
                        </Button>
                    </TableCell>
                    </TableRow>
                ))}
                {transactionsWithBalance.length === 0 && (
                    <TableRow>
                        <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                            {t('noTransactionsFound')}
                        </TableCell>
                    </TableRow>
                )}
                </TableBody>
            </Table>
            </CardContent>
        </Card>
      </div>
      <div className="hidden print:block">
        <PrintableDebtHistory
            ref={printComponentRef}
            customer={customer}
            currencyFormatter={formatCurrency}
            t={t}
            tg={tg}
            branchName={activeBranch?.name || 'Rawnak Sales'}
        />
      </div>
    </>
  );
}
