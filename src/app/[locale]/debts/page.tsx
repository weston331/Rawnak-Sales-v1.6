
'use client';

import * as React from 'react';
import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';
import PageHeader from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { UserSearch, Eye, MoreHorizontal, Printer, MessageSquareText, Calendar, AlertTriangle } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCurrency } from '@/contexts/currency-context';
import type { Customer } from '@/contexts/customer-context';
import { useCustomerData } from '@/contexts/customer-context'; // Import the central data hook
import { format, parseISO, formatDistanceStrict } from 'date-fns';
import { ar } from 'date-fns/locale/ar';
import { enUS } from 'date-fns/locale/en-US';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

const isOverdue = (dueDate: string | undefined): boolean => {
    if (!dueDate) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = parseISO(dueDate);
    return due < today;
};

const DebtTableRow = React.memo(({ customer, index, locale, formatCurrency, getDueDateBadge, handleSendReminder, t }: {
    customer: Customer;
    index: number;
    locale: string;
    formatCurrency: (amount: number) => string;
    getDueDateBadge: (dueDate: string | undefined) => React.ReactNode;
    handleSendReminder: (customer: Customer) => void;
    t: any;
}) => (
    <TableRow
        className={cn(
            isOverdue(customer.dueDate) && "bg-destructive/10 hover:bg-destructive/20"
        )}
    >
        <TableCell className="font-mono">{index + 1}</TableCell>
        <TableCell className="font-medium">
            <Link href={`/${locale}/debts/${customer.debtId}`} className="hover:underline">
                {customer.name}
            </Link>
        </TableCell>
        <TableCell>
            {getDueDateBadge(customer.dueDate)}
        </TableCell>
        <TableCell className="text-right font-semibold">
            {formatCurrency(customer.totalDebtUSD)}
        </TableCell>
        <TableCell className="text-right">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                        <Link href={`/${locale}/debts/${customer.debtId}`}>
                            <Eye className="h-4 w-4" />
                            {t('actionViewHistory')}
                        </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                        onClick={() => handleSendReminder(customer)}
                        disabled={!customer.phone}
                        className="text-green-600 focus:text-green-700 focus:bg-green-100/80"
                    >
                        <MessageSquareText className="h-4 w-4" /> {t('actionSendReminder')}
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </TableCell>
    </TableRow>
));
DebtTableRow.displayName = 'DebtTableRow';


export default function DebtsPage() {
  const t = useTranslations('DebtsPage');
  const tg = useTranslations('General');
  const locale = useLocale();
  const { formatCurrency, selectedCurrency } = useCurrency();
  
  // Use the central customer data context as the single source of truth
  const { customers: allCustomers, isLoading } = useCustomerData();

  const [searchTerm, setSearchTerm] = React.useState('');
  const [isClient, setIsClient] = React.useState(false);
  
  const dateFnsLocale = locale === 'ar' ? ar : enUS;

  React.useEffect(() => {
    setIsClient(true);
  }, []);
  
  const filteredCustomers = React.useMemo(() => {
    return allCustomers
      // 1. Get only customers with debt
      .filter(customer => customer.totalDebtUSD > 0)
      // 2. Filter by search term
      .filter(customer => {
        const searchTermLower = searchTerm.toLowerCase();
        if (!searchTermLower) return true;
        const nameMatch = customer.name.toLowerCase().includes(searchTermLower);
        const phoneMatch = customer.phone?.toLowerCase().includes(searchTermLower);
        return nameMatch || phoneMatch;
      })
      // 3. Sort by overdue, then due date
      .sort((a, b) => {
        const aIsOverdue = isOverdue(a.dueDate);
        const bIsOverdue = isOverdue(b.dueDate);

        if (aIsOverdue && !bIsOverdue) return -1;
        if (!aIsOverdue && bIsOverdue) return 1;

        if (a.dueDate && b.dueDate) {
            return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        }
        
        if (a.dueDate && !b.dueDate) return -1;
        if (!a.dueDate && b.dueDate) return 1;

        // Fallback sort by debt amount if dates are not set
        return b.totalDebtUSD - a.totalDebtUSD;
      });
  }, [allCustomers, searchTerm]);

  const handleSendReminder = React.useCallback((customer: Customer) => {
    if (!customer || !customer.phone) {
      alert(t('noPhoneNumber'));
      return;
    }

    const message = t('reminderMessage', {
      customerName: customer.name,
      debtAmount: formatCurrency(customer.totalDebtUSD),
    });

    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${customer.phone}?text=${encodedMessage}`;

    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  }, [t, formatCurrency]);

  const getDueDateBadge = React.useCallback((dueDate: string | undefined) => {
      if (!dueDate) return <Badge variant="outline">{t('noDueDateSet')}</Badge>;
      
      const due = parseISO(dueDate);

      if (isOverdue(dueDate)) {
          if (!isClient) {
              return <Badge variant="destructive" className="items-center gap-1"><AlertTriangle className="h-3 w-3"/>{t('dueDateOverdue')}</Badge>;
          }
          const duration = formatDistanceStrict(new Date(), due, { locale: dateFnsLocale });
          const fullMessage = t('overdueBy', { duration });
          return <Badge variant="destructive" className="items-center gap-1"><AlertTriangle className="h-3 w-3"/>{fullMessage}</Badge>;
      }
      return <Badge variant="secondary" className="items-center gap-1"><Calendar className="h-3 w-3"/> {format(due, 'yyyy-MM-dd')}</Badge>;
  }, [t, isClient, dateFnsLocale]);
  
  const TableSkeleton = () => (
    <div className="rounded-lg border shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{tg('no')}</TableHead>
            <TableHead>{t('tableHeaderCustomerName')}</TableHead>
            <TableHead>{t('tableHeaderDueDate')}</TableHead>
            <TableHead className="text-right">{t('tableHeaderTotalDebt', { currencySymbol: selectedCurrency.symbol })}</TableHead>
            <TableHead className="text-right">{t('tableHeaderActions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {[...Array(5)].map((_, i) => (
            <TableRow key={i}>
              <TableCell><Skeleton className="h-5 w-5" /></TableCell>
              <TableCell><Skeleton className="h-5 w-36" /></TableCell>
              <TableCell><Skeleton className="h-6 w-24" /></TableCell>
              <TableCell className="text-right"><Skeleton className="h-5 w-24 ml-auto" /></TableCell>
              <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <>
      <PageHeader
        title={t('title')}
        description={t('description')}
        actions={
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
             <div className="relative flex-grow">
                <UserSearch className="absolute left-3 rtl:right-3 rtl:left-auto top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                    type="search" 
                    placeholder={t('searchCustomersPlaceholder')} 
                    className="w-full sm:max-w-xs ps-10 rtl:pr-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <Button variant="outline" onClick={() => window.print()} className="w-full sm:w-auto">
              <Printer className="h-4 w-4" /> {t('generateReportButton')}
            </Button>
          </div>
        }
      />

      {isLoading ? (
        <TableSkeleton />
      ) : (
        <div className="rounded-lg border shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{tg('no')}</TableHead>
                <TableHead>{t('tableHeaderCustomerName')}</TableHead>
                <TableHead>{t('tableHeaderDueDate')}</TableHead>
                <TableHead className="text-right">{t('tableHeaderTotalDebt', { currencySymbol: selectedCurrency.symbol })}</TableHead>
                <TableHead className="text-right">{t('tableHeaderActions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCustomers.length > 0 ? (
                filteredCustomers.map((customer, index) => (
                    <DebtTableRow
                      key={customer.id}
                      customer={customer}
                      index={index}
                      locale={locale}
                      formatCurrency={formatCurrency}
                      getDueDateBadge={getDueDateBadge}
                      handleSendReminder={handleSendReminder}
                      t={t}
                    />
                ))
               ) : (
                  <TableRow>
                      <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                          {t('noMatchingDebtsFound')}
                      </TableCell>
                  </TableRow>
               )}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  );
}
