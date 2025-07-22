
'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import PageHeader from '@/components/shared/page-header';
import { Button, buttonVariants } from '@/components/ui/button';
import { PlusCircle, Edit, Trash2, MoreHorizontal, FolderPlus, Pencil, Check, X, ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCurrency } from '@/contexts/currency-context';
import { useToast } from "@/hooks/use-toast";
import type { Product } from '@/contexts/product-context';
import { useProductData, useProductActions, initialDefinedCategories } from '@/contexts/product-context';
import { Skeleton } from '@/components/ui/skeleton';


// Default form state for the product modal
const defaultProductFormState = {
  name: '',
  category: '',
  description: '',
  purchasePrice: '',
  salePrice: '',
  stock: '0',
  lowStockThreshold: '10',
};


export default function ProductsPage() {
  const t = useTranslations('ProductsPage');
  const tg = useTranslations('General');
  const { formatCurrency, selectedCurrency, convertToSelectedCurrency, convertFromSelectedCurrencyToUSD } = useCurrency();
  const { products, categories, isLoading } = useProductData();
  const { addProduct, updateProduct, deleteProduct, addCategory, updateCategory, deleteCategory } = useProductActions();
  const { toast } = useToast();
  
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingProduct, setEditingProduct] = React.useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = React.useState<Product | null>(null);
  const [modalProductData, setModalProductData] = React.useState(defaultProductFormState);

  const [isCategoryModalOpen, setIsCategoryModalOpen] = React.useState(false);
  const [newCategoryName, setNewCategoryName] = React.useState('');
  const [editingCategory, setEditingCategory] = React.useState<{ currentName: string; newName: string } | null>(null);
  const [categoryToDelete, setCategoryToDelete] = React.useState<string | null>(null);

  const [selectedCategory, setSelectedCategory] = React.useState<string | null>(null);

  const productsByCategory = React.useMemo(() => {
    return products.reduce((acc, product) => {
      const category = product.category;
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(product);
      return acc;
    }, {} as Record<string, Product[]>);
  }, [products]);
  
  const handleFormInputChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setModalProductData(prev => ({ ...prev, [id]: value }));
  }, []);
  
  const handleFormSelectChange = React.useCallback((value: string) => {
    setModalProductData(prev => ({ ...prev, category: value }));
  }, []);

  const handleOpenModal = React.useCallback((product?: Product) => {
    const formatForInput = (amount: number) => {
        const minimumFractionDigits = selectedCurrency.code === 'IQD' ? 0 : 2;
        return amount.toFixed(minimumFractionDigits);
    };

    if (product) {
        setEditingProduct(product);
        setModalProductData({
            name: product.name,
            category: product.category,
            description: product.description || '',
            purchasePrice: formatForInput(convertToSelectedCurrency(product.purchasePriceUSD)),
            salePrice: formatForInput(convertToSelectedCurrency(product.priceUSD)),
            stock: product.stock.toString(),
            lowStockThreshold: (product.lowStockThreshold || 10).toString(),
        });
    } else {
        setEditingProduct(null);
        setModalProductData({ ...defaultProductFormState, category: selectedCategory || ''});
    }
    setIsModalOpen(true);
  }, [selectedCategory, selectedCurrency, convertToSelectedCurrency]);
  
  const handleCloseModal = React.useCallback(() => {
    setIsModalOpen(false);
    setEditingProduct(null);
    setModalProductData(defaultProductFormState);
  }, []);
  
  const handleSaveProduct = React.useCallback(async () => {
    const { name, category, stock, salePrice, purchasePrice, lowStockThreshold } = modalProductData;
    if (!name || !category || !salePrice || !purchasePrice) {
      toast({ title: "Missing Information", description: "Please fill out all required fields.", variant: "destructive" });
      return;
    }
    
    try {
        const purchasePriceUSD = convertFromSelectedCurrencyToUSD(parseFloat(purchasePrice));
        const salePriceUSD = convertFromSelectedCurrencyToUSD(parseFloat(salePrice));

        const productData = {
            name: modalProductData.name,
            category: modalProductData.category,
            description: modalProductData.description,
            priceUSD: salePriceUSD,
            purchasePriceUSD: purchasePriceUSD,
            stock: parseInt(modalProductData.stock, 10),
            lowStockThreshold: parseInt(modalProductData.lowStockThreshold, 10) || 10,
        };

        if (editingProduct) {
            await updateProduct(editingProduct.id, productData);
        } else {
            await addProduct(productData);
        }
        handleCloseModal();
    } catch(error) {
        console.error("Failed to save product:", error);
        toast({ title: "Operation Failed", description: "Could not save the product. Please try again.", variant: "destructive" });
    }
  }, [modalProductData, editingProduct, addProduct, updateProduct, convertFromSelectedCurrencyToUSD, handleCloseModal, toast]);

  const handleConfirmDeleteProduct = React.useCallback(async () => {
    if (productToDelete) {
        try {
            await deleteProduct(productToDelete.id);
            setProductToDelete(null);
        } catch(error) {
            console.error("Failed to delete product:", error);
            toast({ title: "Operation Failed", description: "Could not delete the product. Please try again.", variant: "destructive" });
        }
    }
  }, [productToDelete, deleteProduct, toast]);

  const handleAddNewCategory = React.useCallback(async () => {
    if (!newCategoryName.trim()) return;
    try {
        await addCategory(newCategoryName);
        setNewCategoryName('');
    } catch(error) {
        console.error("Failed to add category:", error);
        toast({ title: "Operation Failed", description: "Could not add the category. Please try again.", variant: "destructive" });
    }
  }, [addCategory, newCategoryName, toast]);

  const handleStartEditCategory = React.useCallback((categoryName: string) => {
    setEditingCategory({ currentName: categoryName, newName: categoryName });
  }, []);

  const handleCancelEditCategory = React.useCallback(() => {
    setEditingCategory(null);
  }, []);

  const handleSaveCategory = React.useCallback(async () => {
    if (!editingCategory || !editingCategory.newName.trim()) {
      setEditingCategory(null);
      return;
    }
    
    const trimmedNewName = editingCategory.newName.trim();
    if (trimmedNewName.toLowerCase() === editingCategory.currentName.toLowerCase()) {
       setEditingCategory(null);
       return;
    }
    
    if (categories.find(c => c.toLowerCase() === trimmedNewName.toLowerCase())) {
        toast({
            title: t('deleteCategoryInUseTitle'),
            description: "A category with this name already exists.",
            variant: "destructive",
        });
        return;
    }

    try {
        await updateCategory(editingCategory.currentName, trimmedNewName);
        if (selectedCategory === editingCategory.currentName) {
            setSelectedCategory(trimmedNewName);
        }
        setEditingCategory(null);
    } catch(error) {
        console.error("Failed to update category:", error);
        toast({ title: "Operation Failed", description: "Could not update the category. Please try again.", variant: "destructive" });
    }
  }, [editingCategory, categories, updateCategory, selectedCategory, toast, t]);

  const handleOpenDeleteDialog = React.useCallback((categoryName: string) => {
    setCategoryToDelete(categoryName);
  }, []);
  
  const handleConfirmDeleteCategory = React.useCallback(async () => {
    if (!categoryToDelete) return;

    try {
        await deleteCategory(categoryToDelete);
        setCategoryToDelete(null);
    } catch (error: any) {
        if (error.message === 'CATEGORY_IN_USE') {
            toast({
                title: t('deleteCategoryInUseTitle'),
                description: t('deleteCategoryInUseDescription'),
                variant: "destructive",
            });
        } else {
            console.error("Failed to delete category:", error);
            toast({ title: "Operation Failed", description: "Could not delete the category. Please try again.", variant: "destructive" });
        }
        setCategoryToDelete(null);
    }
  }, [categoryToDelete, deleteCategory, toast, t]);
  
  const getProductStatus = React.useCallback((product: Product): { text: string; variant: "default" | "secondary" | "destructive" } => {
    const threshold = product.lowStockThreshold ?? 10;
    if (product.stock === 0) return { text: t('statusOutOfStock'), variant: 'destructive' };
    if (product.stock < threshold) return { text: t('statusLowStock'), variant: 'secondary' };
    return { text: t('statusInStock'), variant: 'default' };
  }, [t]);

  const translateCategory = React.useCallback((category: string) => {
      const isPredefined = initialDefinedCategories.some(c => c.toLowerCase() === category.toLowerCase());
      if (isPredefined) {
        const key = `${category.toLowerCase().replace(/\s/g, '')}Category`;
        return t(key as any, {}, { defaultValue: category });
      }
      return category;
  }, [t]);

  const filteredProducts = React.useMemo(() => {
    if (!selectedCategory) return [];
    return products.filter(p => p.category === selectedCategory);
  }, [products, selectedCategory]);

  const CategoryViewSkeleton = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {[...Array(8)].map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-6 w-3/4" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-4 w-1/2" />
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const ProductViewSkeleton = () => (
     <div className="rounded-lg border shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{tg('no')}</TableHead>
              <TableHead>{t('tableHeaderName')}</TableHead>
              <TableHead className="text-right">{t('tableHeaderPrice', { currencySymbol: selectedCurrency.symbol })}</TableHead>
              <TableHead className="text-right">{t('tableHeaderStock')}</TableHead>
              <TableHead>{t('tableHeaderStatus')}</TableHead>
              <TableHead className="text-right">{t('tableHeaderActions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(5)].map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-5 w-5" /></TableCell>
                <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                <TableCell className="text-right"><Skeleton className="h-5 w-20 ml-auto" /></TableCell>
                <TableCell className="text-right"><Skeleton className="h-5 w-16 ml-auto" /></TableCell>
                <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
  );

  return (
    <>
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle className="font-headline">{editingProduct ? t('editProductTitle') : t('addProductTitle')}</DialogTitle> 
            <DialogDescription>
              {editingProduct ? t('editProductDescription') : t('addProductDescription')}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">{t('nameLabel')}</Label>
              <Input id="name" value={modalProductData.name} onChange={handleFormInputChange} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="category" className="text-right">{t('categoryLabel')}</Label>
              <Select value={modalProductData.category} onValueChange={handleFormSelectChange}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder={t('selectCategoryPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {translateCategory(category)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">{t('descriptionLabel')}</Label>
              <Textarea id="description" value={modalProductData.description} onChange={handleFormInputChange} placeholder={t('optionalProductDescription')} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="purchasePrice" className="text-right">{t('purchasePriceLabel', { currencySymbol: selectedCurrency.symbol })}</Label>
              <Input id="purchasePrice" type="number" value={modalProductData.purchasePrice} onChange={handleFormInputChange} className="col-span-3" placeholder="0.00"/>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="salePrice" className="text-right">{t('salePriceLabel', { currencySymbol: selectedCurrency.symbol })}</Label>
              <Input id="salePrice" type="number" value={modalProductData.salePrice} onChange={handleFormInputChange} className="col-span-3" placeholder="0.00"/>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="stock" className="text-right">{t('initialStockLabel')}</Label>
              <Input id="stock" type="number" value={modalProductData.stock} onChange={handleFormInputChange} className="col-span-3" placeholder="0"/>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="lowStockThreshold" className="text-right">{t('lowStockThresholdLabel')}</Label>
              <Input id="lowStockThreshold" type="number" value={modalProductData.lowStockThreshold} onChange={handleFormInputChange} className="col-span-3" placeholder="10"/>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseModal}>{tg('cancel')}</Button> 
            <Button type="submit" onClick={handleSaveProduct}>{editingProduct ? t('saveChangesButton') : t('addProductButton')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={!!productToDelete} onOpenChange={(isOpen) => !isOpen && setProductToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>{tg('delete')} {productToDelete?.name}?</AlertDialogTitle>
                <AlertDialogDescription>
                    This action cannot be undone and will permanently remove the product.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setProductToDelete(null)}>{tg('cancel')}</AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirmDeleteProduct} className={buttonVariants({ variant: "destructive" })}>
                    {t('confirmDeleteButton')}
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isCategoryModalOpen} onOpenChange={(isOpen) => { setIsCategoryModalOpen(isOpen); if (!isOpen) handleCancelEditCategory(); }}>
        <DialogContent className="sm:max-w-md">
            <DialogHeader>
                <DialogTitle>{t('manageCategoriesTitle')}</DialogTitle>
                <DialogDescription>{t('manageCategoriesDescription')}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
                <div className="space-y-2">
                    <Label htmlFor="new-category-name">{t('newCategoryNameLabel')}</Label>
                    <div className="flex gap-2">
                      <Input 
                          id="new-category-name" 
                          value={newCategoryName} 
                          onChange={(e) => setNewCategoryName(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') handleAddNewCategory(); }}
                          placeholder={t('trucksCategory')}
                      />
                      <Button onClick={handleAddNewCategory}>{t('addCategoryButton')}</Button>
                    </div>
                </div>

                <div className="space-y-2">
                    <Label>{t('existingCategoriesLabel')}</Label>
                    <div className="flex flex-col gap-2 rounded-md border p-3 bg-muted/50 max-h-60 overflow-y-auto">
                        {categories.length > 0 ? categories.map(category => (
                            <div key={category} className="flex items-center justify-between gap-2 p-1 rounded-md hover:bg-background/50 group">
                                {editingCategory?.currentName === category ? (
                                    <>
                                        <Input 
                                            value={editingCategory.newName} 
                                            onChange={(e) => setEditingCategory({ ...editingCategory, newName: e.target.value })}
                                            onKeyDown={(e) => { if (e.key === 'Enter') handleSaveCategory(); if (e.key === 'Escape') handleCancelEditCategory(); }}
                                            className="h-8"
                                            autoFocus
                                        />
                                        <div className="flex gap-1">
                                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleSaveCategory}><Check className="h-4 w-4 text-green-600" /></Button>
                                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleCancelEditCategory}><X className="h-4 w-4 text-destructive" /></Button>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <span className="text-sm font-medium">{translateCategory(category)}</span>
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button size="icon" variant="ghost" className="h-7 w-7" title={t('editCategory')} onClick={() => handleStartEditCategory(category)}>
                                                <Pencil className="h-4 w-4 text-muted-foreground" />
                                            </Button>
                                            <Button size="icon" variant="ghost" className="h-7 w-7" title={t('deleteCategory')} onClick={() => handleOpenDeleteDialog(category)}>
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                        </div>
                                    </>
                                )}
                            </div>
                        )) : <p className="text-sm text-muted-foreground p-4 text-center w-full">{t('noCategoriesYet')}</p>}
                    </div>
                </div>
            </div>
             <DialogFooter>
                <Button variant="outline" onClick={() => setIsCategoryModalOpen(false)}>{tg('close')}</Button>
             </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!categoryToDelete} onOpenChange={(isOpen) => !isOpen && setCategoryToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>{t('deleteCategoryConfirmTitle')}</AlertDialogTitle>
                <AlertDialogDescription>
                    {t('deleteCategoryConfirmDescription', { categoryName: categoryToDelete })}
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setCategoryToDelete(null)}>{tg('cancel')}</AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirmDeleteCategory} className={buttonVariants({ variant: "destructive" })}>
                    {t('confirmDeleteButton')}
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {!selectedCategory ? (
        <>
          <PageHeader
            title={t('title')}
            description={t('description')}
            actions={
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setIsCategoryModalOpen(true)}>
                    <FolderPlus className="h-4 w-4" /> {t('manageCategories')}
                </Button>
                <Button onClick={() => handleOpenModal()} disabled={categories.length === 0}>
                    <PlusCircle className="h-4 w-4" /> {t('addNewProduct')}
                </Button>
              </div>
            }
          />
          {isLoading ? (
            <CategoryViewSkeleton />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {categories.map((category) => (
                <Card 
                  key={category} 
                  className="cursor-pointer hover:shadow-lg hover:border-primary transition-all group"
                  onClick={() => setSelectedCategory(category)}
                >
                  <CardHeader>
                    <CardTitle className="group-hover:text-primary transition-colors">{translateCategory(category)}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {t('productCount', { count: productsByCategory[category]?.length || 0 })}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          {!isLoading && categories.length === 0 && (
            <div className="text-center py-20 text-muted-foreground border rounded-lg shadow-sm">
                <h3 className="text-lg font-semibold">{t('noCategoriesYet')}</h3>
            </div>
          )}
        </>
      ) : (
        <>
          <PageHeader
            title={t('productsInCategoryTitle', { categoryName: translateCategory(selectedCategory) })}
            description={t('description')}
            actions={
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setSelectedCategory(null)}>
                    <ArrowLeft className="h-4 w-4" /> {t('backToCategories')}
                </Button>
                <Button onClick={() => handleOpenModal()}>
                    <PlusCircle className="h-4 w-4" /> {t('addNewProduct')}
                </Button>
              </div>
            }
          />
          {isLoading ? (
            <ProductViewSkeleton />
          ) : (
            <div className="rounded-lg border shadow-sm">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{tg('no')}</TableHead>
                    <TableHead>{t('tableHeaderName')}</TableHead>
                    <TableHead className="text-right">{t('tableHeaderPrice', { currencySymbol: selectedCurrency.symbol })}</TableHead>
                    <TableHead className="text-right">{t('tableHeaderStock')}</TableHead>
                    <TableHead>{t('tableHeaderStatus')}</TableHead>
                    <TableHead className="text-right">{t('tableHeaderActions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((product, index) => {
                    const status = getProductStatus(product);
                    return (
                      <TableRow key={product.id}>
                        <TableCell className="font-mono">{index + 1}</TableCell>
                        <TableCell className="font-medium">{product.name}</TableCell>
                        <TableCell className="text-right">{formatCurrency(product.priceUSD)}</TableCell>
                        <TableCell className="text-right">{product.stock}</TableCell>
                        <TableCell>
                          <Badge variant={status.variant}>
                            {status.text}
                          </Badge>
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
                              <DropdownMenuItem onClick={() => handleOpenModal(product)}>
                                <Edit className="h-4 w-4" /> {t('editAction')}
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10" onClick={() => setProductToDelete(product)}>
                                <Trash2 className="h-4 w-4" /> {t('deleteAction')}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
          {!isLoading && filteredProducts.length === 0 && (
            <div className="text-center py-20 text-muted-foreground border rounded-lg shadow-sm">
                <h3 className="text-lg font-semibold">{t('noProductsInCategory')}</h3>
            </div>
          )}
        </>
      )}
    </>
  );
}
