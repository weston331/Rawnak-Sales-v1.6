
'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
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
import { AlertTriangle, CheckCircle, PackageSearch, SlidersHorizontal } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Product } from '@/contexts/product-context';
import { useProductData, useProductActions, initialDefinedCategories } from '@/contexts/product-context';
import { useSaleData } from '@/contexts/sale-context';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';


const InventoryTableRow = React.memo(({ item, index, translateCategory, getStatusBadge, handleOpenAdjustModal, t }: {
    item: Product;
    index: number;
    translateCategory: (category: string) => string;
    getStatusBadge: (item: Product) => React.ReactNode;
    handleOpenAdjustModal: (product: Product) => void;
    t: any;
}) => (
    <TableRow>
        <TableCell className="font-mono">{index + 1}</TableCell>
        <TableCell className="font-medium">{item.name}</TableCell>
        <TableCell>{translateCategory(item.category)}</TableCell>
        <TableCell className="text-right font-semibold">{item.stock}</TableCell>
        <TableCell className="text-right">{item.lowStockThreshold ?? 10}</TableCell>
        <TableCell>{getStatusBadge(item)}</TableCell>
        <TableCell className="text-right">
            <Button variant="outline" size="sm" onClick={() => handleOpenAdjustModal(item)}>
                <SlidersHorizontal className="h-3 w-3" /> {t('actionAdjust')}
            </Button>
        </TableCell>
    </TableRow>
));
InventoryTableRow.displayName = 'InventoryTableRow';


export default function InventoryPage() {
  const t = useTranslations('InventoryPage');
  const tg = useTranslations('General');
  const t_products = useTranslations('ProductsPage');
  const { products, isLoading: isLoadingProducts } = useProductData();
  const { updateProduct } = useProductActions();
  const { toast } = useToast();
  const searchParams = useSearchParams();

  const { sales, isLoading: isLoadingSales } = useSaleData();

  const [isAdjustModalOpen, setIsAdjustModalOpen] = React.useState(false);
  const [selectedProduct, setSelectedProduct] = React.useState<Product | null>(null);

  // State for adjustment form
  const [adjustmentType, setAdjustmentType] = React.useState('add');
  const [adjustmentQuantity, setAdjustmentQuantity] = React.useState('');
  const [adjustmentNotes, setAdjustmentNotes] = React.useState('');

  // State for filtering
  const [searchTerm, setSearchTerm] = React.useState('');
  const initialFilterFromUrl = searchParams.get('filter');
  const [statusFilter, setStatusFilter] = React.useState(initialFilterFromUrl || 'all');

  const handleOpenAdjustModal = React.useCallback((product: Product) => {
    setSelectedProduct(product);
    setAdjustmentType('add');
    setAdjustmentQuantity('');
    setAdjustmentNotes('');
    setIsAdjustModalOpen(true);
  }, []);
  
  const handleCloseAdjustModal = React.useCallback(() => {
    setIsAdjustModalOpen(false);
    setSelectedProduct(null);
  }, []);

  const handleConfirmAdjustStock = React.useCallback(() => {
    if (!selectedProduct || !adjustmentQuantity) {
        toast({ title: t('errorTitle'), description: t('enterQuantityError'), variant: "destructive"});
        return;
    }

    const quantity = parseInt(adjustmentQuantity, 10);
    if (isNaN(quantity) || quantity < 0) {
        toast({ title: t('errorTitle'), description: t('validNumberError'), variant: "destructive"});
        return;
    }

    let newStock;
    switch (adjustmentType) {
        case 'add':
            newStock = selectedProduct.stock + quantity;
            break;
        case 'remove':
            newStock = selectedProduct.stock - quantity;
            if (newStock < 0) {
              toast({ title: t('errorTitle'), description: t('negativeStockError'), variant: "destructive"});
              return;
            }
            break;
        case 'set':
            newStock = quantity;
            break;
        default:
            return;
    }
    
    updateProduct(selectedProduct.id, { stock: newStock });
    toast({ title: t('stockAdjustedTitle'), description: t('stockAdjustedDescription', { productName: selectedProduct.name, stockCount: newStock })});
    handleCloseAdjustModal();
  }, [selectedProduct, adjustmentQuantity, adjustmentType, updateProduct, toast, handleCloseAdjustModal, t]);
  
  const translateCategory = React.useCallback((category: string) => {
      const isPredefined = initialDefinedCategories.some(c => c.toLowerCase() === category.toLowerCase());
      if (isPredefined) {
        const key = `${category.toLowerCase().replace(/\s/g, '')}Category`;
        return t_products(key as any, {}, { defaultValue: category });
      }
      return category;
  }, [t_products]);

  const getStatusBadge = React.useCallback((item: Product) => {
    const lowStockThreshold = item.lowStockThreshold ?? 10;
    if (item.stock === 0) return <Badge variant="destructive" className="items-center gap-1"><AlertTriangle className="h-3 w-3"/>{t('statusOutOfStock')}</Badge>;
    if (item.stock < lowStockThreshold) return <Badge variant="secondary" className="items-center gap-1 bg-yellow-400/20 text-yellow-700 hover:bg-yellow-400/30 border-yellow-400/50"><AlertTriangle className="h-3 w-3"/>{t('statusLowStock')}</Badge>;
    return <Badge variant="default" className="items-center gap-1 bg-green-500/20 text-green-700 hover:bg-green-500/30 border-green-500/50"><CheckCircle className="h-3 w-3"/>{t('statusInStock')}</Badge>;
  }, [t]);
  
  const getProductStatus = (product: Product): 'in_stock' | 'low_stock' | 'out_of_stock' => {
    const lowStockThreshold = product.lowStockThreshold ?? 10;
    if (product.stock === 0) return 'out_of_stock';
    if (product.stock < lowStockThreshold) return 'low_stock';
    return 'in_stock';
  };

  const deadStockProductIds = React.useMemo(() => {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const productsSoldRecently = new Set(
        sales.filter(s => new Date(s.date) > ninetyDaysAgo).flatMap(s => s.items.map(i => i.productId))
    );

    return new Set(products
        .filter(p => !productsSoldRecently.has(p.id) && new Date(p.createdAt) < ninetyDaysAgo)
        .map(p => p.id)
    );
  }, [products, sales]);

  const filteredProducts = React.useMemo(() => {
    return products
      .filter(product => {
        const searchTermLower = searchTerm.toLowerCase();
        if (!searchTermLower) return true;
        const nameMatch = product.name.toLowerCase().includes(searchTermLower);
        const categoryMatch = translateCategory(product.category).toLowerCase().includes(searchTermLower);
        return nameMatch || categoryMatch;
      })
      .filter(product => {
        if (statusFilter === 'all') return true;
        if (statusFilter === 'dead_stock') {
            return deadStockProductIds.has(product.id);
        }
        return getProductStatus(product) === statusFilter;
      });
  }, [products, searchTerm, statusFilter, translateCategory, deadStockProductIds]);

  const isLoading = isLoadingProducts || isLoadingSales;

  const TableSkeleton = () => (
     <div className="rounded-lg border shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{tg('no')}</TableHead>
            <TableHead>{t('tableHeaderProductName')}</TableHead>
            <TableHead>{t('tableHeaderCategory')}</TableHead>
            <TableHead className="text-right">{t('tableHeaderCurrentStock')}</TableHead>
            <TableHead className="text-right">{t('tableHeaderLowStockThreshold')}</TableHead>
            <TableHead>{t('tableHeaderStatus')}</TableHead>
            <TableHead className="text-right">{t('tableHeaderActions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {[...Array(8)].map((_, i) => (
            <TableRow key={i}>
              <TableCell><Skeleton className="h-5 w-5" /></TableCell>
              <TableCell><Skeleton className="h-5 w-40" /></TableCell>
              <TableCell><Skeleton className="h-5 w-24" /></TableCell>
              <TableCell className="text-right"><Skeleton className="h-5 w-16 ml-auto" /></TableCell>
              <TableCell className="text-right"><Skeleton className="h-5 w-16 ml-auto" /></TableCell>
              <TableCell><Skeleton className="h-6 w-24" /></TableCell>
              <TableCell className="text-right"><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
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
                <PackageSearch className="absolute left-3 rtl:right-3 rtl:left-auto top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                    type="search" 
                    placeholder={t('searchProductPlaceholder')} 
                    className="w-full sm:max-w-xs ps-10 rtl:pr-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder={t('filterByStatusPlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('statusAll')}</SelectItem>
                <SelectItem value="in_stock">{t('statusInStock')}</SelectItem>
                <SelectItem value="low_stock">{t('statusLowStock')}</SelectItem>
                <SelectItem value="out_of_stock">{t('statusOutOfStock')}</SelectItem>
                <SelectItem value="dead_stock">{t('statusDeadStock')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        }
      />

      <Dialog open={isAdjustModalOpen} onOpenChange={setIsAdjustModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-headline">{t('adjustStockModalTitle', {productName: selectedProduct?.name})}</DialogTitle>
            <DialogDescription>
              {t('adjustStockModalDescription', {stockCount: selectedProduct?.stock})}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="adjustment-type">{t('adjustmentTypeLabel')}</Label>
              <Select value={adjustmentType} onValueChange={setAdjustmentType}>
                <SelectTrigger id="adjustment-type">
                  <SelectValue placeholder={t('selectTypePlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="add">{t('addStockOption')}</SelectItem>
                  <SelectItem value="remove">{t('removeStockOption')}</SelectItem>
                  <SelectItem value="set">{t('setQuantityOption')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="quantity">{t('quantityLabel')}</Label>
              <Input 
                id="quantity" 
                type="number" 
                placeholder="0"
                value={adjustmentQuantity}
                onChange={(e) => setAdjustmentQuantity(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="notes">{t('notesLabel')}</Label>
              <Input 
                id="notes" 
                placeholder={t('notesPlaceholder')} 
                value={adjustmentNotes}
                onChange={(e) => setAdjustmentNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseAdjustModal}>{tg('cancel')}</Button>
            <Button type="submit" onClick={handleConfirmAdjustStock}>{t('adjustStockButton')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      {isLoading ? (
        <TableSkeleton />
      ) : (
        <div className="rounded-lg border shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{tg('no')}</TableHead>
                <TableHead>{t('tableHeaderProductName')}</TableHead>
                <TableHead>{t('tableHeaderCategory')}</TableHead>
                <TableHead className="text-right">{t('tableHeaderCurrentStock')}</TableHead>
                <TableHead className="text-right">{t('tableHeaderLowStockThreshold')}</TableHead>
                <TableHead>{t('tableHeaderStatus')}</TableHead>
                <TableHead className="text-right">{t('tableHeaderActions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.length > 0 ? (
                  filteredProducts.map((item, index) => (
                    <InventoryTableRow
                      key={item.id}
                      item={item}
                      index={index}
                      translateCategory={translateCategory}
                      getStatusBadge={getStatusBadge}
                      handleOpenAdjustModal={handleOpenAdjustModal}
                      t={t}
                    />
                  ))
                ) : (
                  <TableRow>
                      <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                          {products.length === 0 ? t('noInventoryItems') : t('noMatchingProducts')}
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
