'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { useCurrency } from '@/contexts/currency-context';
import { useSettings } from '@/contexts/settings-context';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { FileText, CloudUpload, RefreshCw, Loader2, Upload } from 'lucide-react';

import { db, isFirebaseConfigured } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import type { Product } from '@/contexts/product-context';
import type { Sale } from '@/contexts/sale-context';
import type { Customer } from '@/contexts/customer-context';

interface DataManagementCardProps {
    onSuccess: () => void;
}

export default function DataManagementCard({ onSuccess }: DataManagementCardProps) {
    const t = useTranslations('SettingsPage');
    const { toast } = useToast();
    const { activeBranch } = useSettings();
    const { selectedCurrency, convertToSelectedCurrency } = useCurrency();
    const [isExporting, setIsExporting] = React.useState<string | null>(null);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const downloadJSON = (data: unknown, filename: string) => {
        const jsonStr = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };
    
    const downloadCSV = (data: any[], filename: string) => {
        if (data.length === 0) {
            toast({ title: 'No Data', description: 'There is no data to export for this branch.', variant: 'default'});
            return;
        }
        const replacer = (key: string, value: any) => value === null ? '' : value;
        const header = Object.keys(data[0]);
        let csv = data.map(row => header.map(fieldName => JSON.stringify(row[fieldName], replacer)).join(','));
        csv.unshift(header.join(','));
        const csvStr = csv.join('\r\n');
        
        const blob = new Blob([csvStr], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };
    
    const handleExport = async (dataType: 'products' | 'sales' | 'customers' | 'debts') => {
        if (!activeBranch || !isFirebaseConfigured || !db) {
            toast({ title: t('errorTitle'), description: 'Cannot connect to database.', variant: 'destructive'});
            return;
        }

        setIsExporting(dataType);
        
        try {
            let data: any[] = [];
            let flattenedData: any[] = [];
            let collectionName = '';

            switch (dataType) {
                case 'products':
                    collectionName = 'products';
                    break;
                case 'sales':
                    collectionName = 'sales';
                    break;
                case 'customers':
                case 'debts':
                    collectionName = 'customers'; // Debts are derived from customers
                    break;
            }

            const dataCollectionRef = collection(db, `branches/${activeBranch.id}/${collectionName}`);
            const snapshot = await getDocs(dataCollectionRef);
            data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            if (data.length === 0) {
                toast({ title: 'No Data', description: `There are no ${dataType} to export for this branch.`, variant: 'default'});
                setIsExporting(null);
                return;
            }

            switch(dataType) {
                case 'products':
                    flattenedData = data as Product[];
                    break;
                case 'sales':
                    flattenedData = (data as Sale[]).map(sale => ({
                        id: sale.id,
                        date: sale.date,
                        customerId: sale.customerId,
                        customerName: sale.customerName,
                        totalUSD: sale.totalUSD,
                        status: sale.status,
                        discountType: sale.discountType,
                        discountValue: sale.discountValue,
                        discountAmountUSD: sale.discountAmountUSD,
                        itemCount: sale.items?.length || 0
                    }));
                    break;
                case 'customers':
                    flattenedData = (data as Customer[]).map(customer => ({
                        id: customer.id,
                        debtId: customer.debtId,
                        name: customer.name,
                        phone: customer.phone || '',
                        totalDebtUSD: customer.totalDebtUSD,
                        customerSince: customer.customerSince,
                        dueDate: customer.dueDate || '',
                    }));
                    break;
                case 'debts':
                    const customersWithDebt = (data as Customer[]).filter(c => c.totalDebtUSD > 0);
                    if (customersWithDebt.length === 0) {
                        toast({ title: 'No Data', description: `There are no ${dataType} to export for this branch.`, variant: 'default'});
                        setIsExporting(null);
                        return;
                    }
                    flattenedData = customersWithDebt.map(customer => ({
                      customerName: customer.name,
                      customerPhone: customer.phone || '',
                      totalDebt: Number(convertToSelectedCurrency(customer.totalDebtUSD).toFixed(selectedCurrency.code === 'IQD' ? 0 : 2)),
                      currency: selectedCurrency.code,
                      dueDate: customer.dueDate || ''
                    }));
                    break;
            }
            
            downloadCSV(flattenedData, `${dataType}-export-${activeBranch?.id}.csv`);

        } catch (error) {
            console.error(`Export for ${dataType} failed:`, error);
            toast({ title: t('errorTitle'), description: `Failed to export ${dataType} data.`, variant: 'destructive'});
        } finally {
            setIsExporting(null);
        }
    };

    const handleBackupAllData = () => {
        const backupData = {
            branches: localStorage.getItem('branches'),
            activeBranchId: localStorage.getItem('activeBranchId'),
            notificationSettings: localStorage.getItem('notificationSettings'),
            users: localStorage.getItem('users'),
            allData: Object.keys(localStorage).reduce((obj, key) => {
                obj[key] = localStorage.getItem(key);
                return obj;
            }, {} as Record<string, string | null>),
            timestamp: new Date().toISOString(),
        };
        downloadJSON(backupData, `rawnak-sales-full-backup-${new Date().toISOString().split('T')[0]}.json`);
        toast({
            title: t('backupDownloadedTitle'),
            description: t('backupDownloadedDescription'),
        });
    };

    const handleRestoreClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target?.result as string;
                const data = JSON.parse(text);

                if (!data.allData || typeof data.allData !== 'object') {
                    throw new Error("Invalid backup file format.");
                }

                // Clear existing localStorage before importing
                localStorage.clear();

                // Restore all data
                for (const key in data.allData) {
                    if (data.allData[key] !== null) {
                        localStorage.setItem(key, data.allData[key]);
                    }
                }
                
                toast({
                    title: t('importSuccessTitle'),
                    description: t('importSuccessDescription'),
                });

                // Trigger reload via parent component
                setTimeout(() => {
                    onSuccess();
                }, 1500);

            } catch (error) {
                console.error("Failed to import data:", error);
                toast({
                    title: t('errorTitle'),
                    description: (error as Error).message || 'Failed to parse or import the backup file.',
                    variant: 'destructive',
                });
            } finally {
                // Reset file input to allow re-uploading the same file
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
            }
        };
        reader.readAsText(file);
    };

    const createExportButton = (type: 'products' | 'sales' | 'customers' | 'debts', labelKey: string) => (
        <Button variant="outline" className="w-full justify-between" onClick={() => handleExport(type)} disabled={!!isExporting}>
            <span>{t(labelKey as any)}</span>
            {isExporting === type ? <Loader2 className="h-4 w-4 animate-spin" /> : <Badge variant="secondary">CSV</Badge>}
        </Button>
    );

    return (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline flex items-center gap-2"><FileText className="h-5 w-5 text-primary" /> {t('dataManagementTitle')}</CardTitle>
                <CardDescription>{t('dataManagementDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <Button className="w-full justify-start gap-2" onClick={() => window.location.reload()}>
                    <RefreshCw className="h-4 w-4" />
                    <span>{t('syncDataButton')}</span>
                </Button>

                <Separator className="my-2" />
                
                <h3 className="text-sm font-medium text-muted-foreground !mt-6">{t('dataExportTitle')}</h3>

                {createExportButton('products', 'exportProductsButton')}
                {createExportButton('sales', 'exportSalesButton')}
                {createExportButton('customers', 'exportCustomersButton')}
                {createExportButton('debts', 'exportDebtsButton')}

                <Separator className="my-2" />

                <Button className="w-full justify-between" onClick={handleBackupAllData}>
                    <div className="flex items-center gap-2">
                        <CloudUpload className="h-4 w-4" />
                        <span>{t('backupAllDataButton')}</span>
                    </div>
                    <Badge>JSON</Badge>
                </Button>
                
                <Button variant="outline" className="w-full justify-between" onClick={handleRestoreClick}>
                    <div className="flex items-center gap-2">
                        <Upload className="h-4 w-4" />
                        <span>{t('importAllDataButton')}</span>
                    </div>
                    <Badge variant="secondary">JSON</Badge>
                </Button>
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileImport}
                    accept=".json"
                    className="hidden"
                />
            </CardContent>
        </Card>
    );
}
