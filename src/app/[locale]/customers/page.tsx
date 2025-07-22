
'use client';

import * as React from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import PageHeader from '@/components/shared/page-header';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { UserSearch, Eye, MoreHorizontal, Pencil, Contact, PlusCircle, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useCurrency } from '@/contexts/currency-context';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Label } from '@/components/ui/label';
import type { Customer } from '@/contexts/customer-context';
import { useCustomerData, useCustomerActions } from '@/contexts/customer-context';
import { Skeleton } from '@/components/ui/skeleton';

// Memoized component for Desktop Table Row to prevent unnecessary re-renders
const CustomerTableRow = React.memo(({ customer, index, locale, formatCurrency, onEdit, onDelete, t }: {
  customer: Customer;
  index: number;
  locale: string;
  formatCurrency: (amount: number) => string;
  onEdit: (customer: Customer) => void;
  onDelete: (customer: Customer) => void;
  t: any;
}) => (
  <TableRow>
    <TableCell className="font-mono">{index + 1}</TableCell>
    <TableCell className="font-medium">
      <Link href={`/${locale}/customers/${customer.id}`} className="hover:underline">
        {customer.name}
      </Link>
    </TableCell>
    <TableCell className="text-muted-foreground dir-ltr">{customer.phone || 'N/A'}</TableCell>
    <TableCell className="text-right font-semibold">
      {customer.totalDebtUSD > 0 ? formatCurrency(customer.totalDebtUSD) : '-'}
    </TableCell>
    <TableCell>{new Date(customer.customerSince).toLocaleDateString(locale)}</TableCell>
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
             <Link href={`/${locale}/customers/${customer.id}`}>
              <Eye className="h-4 w-4" />
              {t('actionViewHistory')}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onEdit(customer)}>
            <Pencil className="h-4 w-4" />
            {t('actionEditCustomer')}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10" onClick={() => onDelete(customer)}>
            <Trash2 className="h-4 w-4" />
            {t('actionDeleteCustomer')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </TableCell>
  </TableRow>
));
CustomerTableRow.displayName = 'CustomerTableRow';

// Memoized component for Mobile Card Item to prevent unnecessary re-renders
const CustomerCardItem = React.memo(({ customer, locale, formatCurrency, onEdit, onDelete, t }: {
  customer: Customer;
  locale: string;
  formatCurrency: (amount: number) => string;
  onEdit: (customer: Customer) => void;
  onDelete: (customer: Customer) => void;
  t: any;
}) => (
  <Card>
    <CardHeader className="p-4">
      <div className="flex justify-between items-start">
        <div>
          <CardTitle className="text-lg">
            <Link href={`/${locale}/customers/${customer.id}`} className="hover:underline">
              {customer.name}
            </Link>
          </CardTitle>
          <CardDescription className="dir-ltr pt-1">{customer.phone || 'N/A'}</CardDescription>
        </div>
         <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
               <DropdownMenuItem asChild>
                 <Link href={`/${locale}/customers/${customer.id}`}>
                  <Eye className="h-4 w-4" />
                  {t('actionViewHistory')}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(customer)}>
                <Pencil className="h-4 w-4" />
                {t('actionEditCustomer')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10" onClick={() => onDelete(customer)}>
                <Trash2 className="h-4 w-4" />
                {t('actionDeleteCustomer')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
      </div>
    </CardHeader>
    <CardContent className="p-4 pt-0 space-y-2 text-sm">
        <div className="flex justify-between">
            <span className="text-muted-foreground">{t('tableHeaderTotalDebt', { currencySymbol: '' }).replace(/ *\([^)]*\) */g, "")}</span>
            <span className="font-semibold">{customer.totalDebtUSD > 0 ? formatCurrency(customer.totalDebtUSD) : '-'}</span>
        </div>
        <div className="flex justify-between">
            <span className="text-muted-foreground">{t('tableHeaderCustomerSince')}</span>
            <span>{new Date(customer.customerSince).toLocaleDateString(locale)}</span>
        </div>
    </CardContent>
  </Card>
));
CustomerCardItem.displayName = 'CustomerCardItem';

export default function CustomersPage() {
  const t = useTranslations('CustomersPage');
  const tg = useTranslations('General');
  const locale = useLocale();
  const { formatCurrency, selectedCurrency } = useCurrency();
  const { customers, isLoading } = useCustomerData();
  const { addCustomer, deleteCustomer, updateCustomer } = useCustomerActions();
  
  const [searchTerm, setSearchTerm] = React.useState('');
  
  const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);
  const [newCustomerData, setNewCustomerData] = React.useState({ name: '', phone: ''});
  
  const [isEditModalOpen, setIsEditModalOpen] = React.useState(false);
  const [editingCustomer, setEditingCustomer] = React.useState<Customer | null>(null);

  const [customerToDelete, setCustomerToDelete] = React.useState<Customer | null>(null);

  const handleAddCustomer = React.useCallback(async () => {
    if (!newCustomerData.name) return;
    
    await addCustomer(newCustomerData);

    setIsAddModalOpen(false);
    setNewCustomerData({ name: '', phone: '' });
  }, [addCustomer, newCustomerData]);
  
  const handleOpenEditModal = React.useCallback((customer: Customer) => {
    setEditingCustomer({ ...customer }); // Create a copy to edit
    setIsEditModalOpen(true);
  }, []);

  const handleSaveCustomer = React.useCallback(async () => {
    if (!editingCustomer || !editingCustomer.name) return;
    
    const updatedData = {
      name: editingCustomer.name,
      phone: editingCustomer.phone,
    };

    await updateCustomer(editingCustomer.id, updatedData);
    
    setIsEditModalOpen(false);
    setEditingCustomer(null);
  }, [editingCustomer, updateCustomer]);

  const handleDeleteCustomer = React.useCallback(async () => {
    if (!customerToDelete) return;
    
    await deleteCustomer(customerToDelete.id);
    
    setCustomerToDelete(null);
  }, [customerToDelete, deleteCustomer]);


  const filteredCustomers = React.useMemo(() => {
    if (!searchTerm) return customers;
    return customers.filter(customer => {
      const searchTermLower = searchTerm.toLowerCase();
      const nameMatch = customer.name.toLowerCase().includes(searchTermLower);
      const phoneMatch = customer.phone?.includes(searchTermLower);
      return nameMatch || phoneMatch;
    });
  }, [searchTerm, customers]);

  const DesktopViewSkeleton = () => (
    <div className="hidden md:block rounded-lg border shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{tg('no')}</TableHead>
            <TableHead>{t('tableHeaderCustomerName')}</TableHead>
            <TableHead>{t('tableHeaderPhone')}</TableHead>
            <TableHead className="text-right">{t('tableHeaderTotalDebt', { currencySymbol: selectedCurrency.symbol })}</TableHead>
            <TableHead>{t('tableHeaderCustomerSince')}</TableHead>
            <TableHead className="text-right">{t('tableHeaderActions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {[...Array(5)].map((_, i) => (
            <TableRow key={i}>
              <TableCell><Skeleton className="h-5 w-5 rounded-full" /></TableCell>
              <TableCell><Skeleton className="h-5 w-36" /></TableCell>
              <TableCell><Skeleton className="h-5 w-24" /></TableCell>
              <TableCell className="text-right"><Skeleton className="h-5 w-20 ml-auto" /></TableCell>
              <TableCell><Skeleton className="h-5 w-24" /></TableCell>
              <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  const MobileViewSkeleton = () => (
    <div className="md:hidden space-y-4">
      {[...Array(3)].map((_, i) => (
        <Card key={i}>
          <CardHeader className="p-4">
            <div className="flex justify-between items-start">
              <div>
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-24 mt-2" />
              </div>
              <Skeleton className="h-8 w-8" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-3">
            <div className="flex justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-16" />
            </div>
            <div className="flex justify-between">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-20" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  return (
    <>
      <PageHeader
        title={t('title')}
        description={t('description')}
        actions={
          <div className="flex flex-col sm:flex-row gap-2">
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
            <Button onClick={() => setIsAddModalOpen(true)}>
                <PlusCircle className="h-4 w-4" /> {t('addNewCustomer')}
            </Button>
          </div>
        }
      />
      
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="sm:max-w-md">
            <DialogHeader>
                <DialogTitle>{t('addCustomerModalTitle')}</DialogTitle>
                <DialogDescription>{t('addCustomerModalDescription')}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
                <div>
                    <Label htmlFor="customer-name">{t('customerNameLabel')}</Label>
                    <Input 
                        id="customer-name"
                        value={newCustomerData.name}
                        onChange={(e) => setNewCustomerData({...newCustomerData, name: e.target.value})}
                    />
                </div>
                <div>
                    <Label htmlFor="customer-phone">{t('phoneLabel')}</Label>
                    <Input 
                        id="customer-phone"
                        type="tel"
                        dir="ltr"
                        value={newCustomerData.phone}
                        onChange={(e) => setNewCustomerData({...newCustomerData, phone: e.target.value})}
                    />
                </div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>{tg('cancel')}</Button>
                <Button onClick={handleAddCustomer}>{tg('add')}</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-md">
            <DialogHeader>
                <DialogTitle>{t('editCustomerModalTitle', { customerName: editingCustomer?.name })}</DialogTitle>
                <DialogDescription>{t('editCustomerModalDescription')}</DialogDescription>
            </DialogHeader>
            {editingCustomer && (
              <div className="space-y-4 py-4">
                  <div>
                      <Label htmlFor="edit-customer-name">{t('customerNameLabel')}</Label>
                      <Input 
                          id="edit-customer-name"
                          value={editingCustomer.name}
                          onChange={(e) => setEditingCustomer({...editingCustomer, name: e.target.value})}
                      />
                  </div>
                  <div>
                      <Label htmlFor="edit-customer-phone">{t('phoneLabel')}</Label>
                      <Input 
                          id="edit-customer-phone"
                          type="tel"
                          dir="ltr"
                          value={editingCustomer.phone || ''}
                          onChange={(e) => setEditingCustomer({...editingCustomer, phone: e.target.value})}
                      />
                  </div>
              </div>
            )}
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>{tg('cancel')}</Button>
                <Button onClick={handleSaveCustomer}>{tg('save')}</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!customerToDelete} onOpenChange={(isOpen) => !isOpen && setCustomerToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>{t('deleteCustomerConfirmTitle')}</AlertDialogTitle>
                <AlertDialogDescription>
                    {t('deleteCustomerConfirmDescription', { customerName: customerToDelete?.name })}
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setCustomerToDelete(null)}>{tg('cancel')}</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteCustomer} className={buttonVariants({ variant: "destructive" })}>
                    {tg('delete')}
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {isLoading ? (
        <>
          <MobileViewSkeleton />
          <DesktopViewSkeleton />
        </>
      ) : (
        <>
          {/* Mobile View: Card List */}
          <div className="md:hidden space-y-4">
            {filteredCustomers.map((customer) => (
              <CustomerCardItem
                key={customer.id}
                customer={customer}
                locale={locale}
                formatCurrency={formatCurrency}
                onEdit={handleOpenEditModal}
                onDelete={setCustomerToDelete}
                t={t}
              />
            ))}
             {filteredCustomers.length === 0 && (
                <div className="text-center py-10 text-muted-foreground border rounded-lg">
                    {t('noCustomersFound')}
                </div>
            )}
          </div>

          {/* Desktop View: Table */}
          <div className="hidden md:block rounded-lg border shadow-sm">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{tg('no')}</TableHead>
                  <TableHead>{t('tableHeaderCustomerName')}</TableHead>
                  <TableHead>{t('tableHeaderPhone')}</TableHead>
                  <TableHead className="text-right">{t('tableHeaderTotalDebt', { currencySymbol: selectedCurrency.symbol })}</TableHead>
                  <TableHead>{t('tableHeaderCustomerSince')}</TableHead>
                  <TableHead className="text-right">{t('tableHeaderActions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.map((customer, index) => (
                  <CustomerTableRow
                    key={customer.id}
                    customer={customer}
                    index={index}
                    locale={locale}
                    formatCurrency={formatCurrency}
                    onEdit={handleOpenEditModal}
                    onDelete={setCustomerToDelete}
                    t={t}
                  />
                ))}
                {filteredCustomers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                      {t('noCustomersFound')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </>
  );
}
