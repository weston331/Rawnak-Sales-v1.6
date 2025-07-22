'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { UserSearch, PlusCircle, Loader2 } from 'lucide-react';
import type { Customer } from '@/contexts/customer-context';
import { useCustomerData, useCustomerActions } from '@/contexts/customer-context';
import { Label } from '../ui/label';
import { Skeleton } from '../ui/skeleton';

export interface CustomerSelectionModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSelectCustomer: (customer: Customer) => void;
  t_sales: any; 
  t_customers: any;
  t_general: any; 
}

const CustomerCard = React.memo(({ customer, onSelectCustomer }: {
    customer: Customer;
    onSelectCustomer: (customer: Customer) => void;
}) => (
    <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => onSelectCustomer(customer)}>
        <CardContent className="p-3">
            <h4 className="font-semibold truncate">{customer.name}</h4>
            <p className="text-sm text-muted-foreground dir-ltr">{customer.phone || 'N/A'}</p>
        </CardContent>
    </Card>
));
CustomerCard.displayName = 'CustomerCard';


export default function CustomerSelectionModal({
  isOpen,
  onOpenChange,
  onSelectCustomer,
  t_sales,
  t_customers,
  t_general
}: CustomerSelectionModalProps) {
    const { addCustomer } = useCustomerActions();
    const { customers: allCustomers, isLoading } = useCustomerData();
    
    const [searchTerm, setSearchTerm] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newCustomerData, setNewCustomerData] = useState({ name: '', phone: ''});
    const [isAddingCustomer, setIsAddingCustomer] = useState(false);
    
    const filteredCustomers = useMemo(() => {
        if (!allCustomers) return [];
        if (!searchTerm) return allCustomers;

        const lowercasedFilter = searchTerm.toLowerCase();
        return allCustomers.filter(customer =>
            customer.name.toLowerCase().includes(lowercasedFilter) ||
            customer.phone?.includes(lowercasedFilter)
        );
    }, [allCustomers, searchTerm]);

    const handleAddCustomer = useCallback(async () => {
        if (!newCustomerData.name) return;
        
        setIsAddingCustomer(true);
        try {
            const newCustomer = await addCustomer(newCustomerData);
            onSelectCustomer(newCustomer);
            
            setIsAddModalOpen(false);
            onOpenChange(false);
            setNewCustomerData({ name: '', phone: '' });
        } catch (error) {
            console.error("Failed to add customer from modal:", error);
            // In a real app, you might show a toast notification here
        } finally {
            setIsAddingCustomer(false);
        }
    }, [addCustomer, newCustomerData, onOpenChange, onSelectCustomer]);

  return (
    <>
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl h-[70vh] flex flex-col">
            <DialogHeader>
                <DialogTitle>{t_sales('selectCustomerPlaceholder')}</DialogTitle>
                <div className="flex gap-2 items-center">
                    <div className="relative flex-grow">
                        <UserSearch className="absolute left-3 rtl:right-3 rtl:left-auto top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                        placeholder={t_customers('searchCustomersPlaceholder')}
                        className="w-full ps-10 rtl:pr-10"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Button variant="outline" onClick={() => setIsAddModalOpen(true)}>
                        <PlusCircle className="h-4 w-4" /> {t_sales('addNewCustomerOption')}
                    </Button>
                </div>
            </DialogHeader>
            <div className="flex-grow overflow-y-auto pr-2">
                {isLoading ? (
                    <div className="space-y-2">
                        {[...Array(5)].map((_, i) => <Card key={i} className="p-3"><Skeleton className="h-5 w-3/4 mb-2" /><Skeleton className="h-4 w-1/2" /></Card>)}
                    </div>
                ) : filteredCustomers.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                    {searchTerm ? t_customers('noCustomersFound') : t_general('searchToBegin')}
                </div>
                ) : (
                <div className="space-y-2">
                    {filteredCustomers.map(customer => (
                        <CustomerCard
                            key={customer.id}
                            customer={customer}
                            onSelectCustomer={onSelectCustomer}
                        />
                    ))}
                </div>
                )}
            </div>
        </DialogContent>
        </Dialog>

        <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{t_customers('addCustomerModalTitle')}</DialogTitle>
                    <DialogDescription>{t_customers('addCustomerModalDescription')}</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div>
                        <Label htmlFor="customer-name">{t_customers('customerNameLabel')}</Label>
                        <Input 
                            id="customer-name"
                            value={newCustomerData.name}
                            onChange={(e) => setNewCustomerData({...newCustomerData, name: e.target.value})}
                        />
                    </div>
                    <div>
                        <Label htmlFor="customer-phone">{t_customers('phoneLabel')}</Label>
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
                    <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>{t_general('cancel')}</Button>
                    <Button onClick={handleAddCustomer} disabled={isAddingCustomer}>
                        {isAddingCustomer && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {t_general('add')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </>
  );
}

    
