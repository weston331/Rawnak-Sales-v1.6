'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PackageSearch } from 'lucide-react';
import type { Product } from '@/contexts/product-context';

export interface ProductSelectionModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSelectProduct: (product: Product) => void;
  products: Product[];
  categories: string[];
  currencyFormatter: (amount: number) => string;
  translateCategory: (category: string) => string;
  t: any; // Translation function
}

const ProductCard = React.memo(({ product, onSelectProduct, currencyFormatter, t }: {
    product: Product;
    onSelectProduct: (product: Product) => void;
    currencyFormatter: (amount: number) => string;
    t: any;
}) => (
    <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => onSelectProduct(product)}>
        <CardContent className="p-3">
            <h4 className="font-semibold truncate text-sm">{product.name}</h4>
            <p className="text-sm text-primary">{currencyFormatter(product.priceUSD)}</p>
            <p className="text-xs text-muted-foreground">{t('stockAvailable', { count: product.stock })}</p>
        </CardContent>
    </Card>
));
ProductCard.displayName = 'ProductCard';


export default function ProductSelectionModal({
  isOpen,
  onOpenChange,
  onSelectProduct,
  products,
  categories,
  currencyFormatter,
  translateCategory,
  t
}: ProductSelectionModalProps) {
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [selectedProductCategory, setSelectedProductCategory] = useState<string | null>(null);

  const filteredProductsForModal = useMemo(() => {
    return products
      .filter(p => p.stock > 0)
      .filter(p => {
        if (!selectedProductCategory) return true;
        return p.category === selectedProductCategory;
      })
      .filter(p => {
        if (!productSearchTerm.trim()) return true;
        return p.name.toLowerCase().includes(productSearchTerm.toLowerCase());
      });
  }, [products, selectedProductCategory, productSearchTerm]);

  // Reset search when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setProductSearchTerm('');
      setSelectedProductCategory(null);
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{t('addProductToCartTitle')}</DialogTitle>
          <div className="relative">
            <PackageSearch className="absolute left-3 rtl:right-3 rtl:left-auto top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('searchProductByNamePlaceholder')}
              className="w-full ps-10 rtl:pr-10"
              value={productSearchTerm}
              onChange={(e) => setProductSearchTerm(e.target.value)}
            />
          </div>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 flex-grow overflow-hidden">
          <div className="md:col-span-1 border-e rtl:border-s rtl:border-e-0 pe-4 rtl:ps-4 rtl:pe-0 h-full overflow-y-auto">
            <h3 className="font-semibold mb-2 text-sm">{t('categoriesTitle')}</h3>
            <div className="flex flex-col gap-1">
              <Button
                variant={!selectedProductCategory ? 'secondary' : 'ghost'}
                onClick={() => setSelectedProductCategory(null)}
                className="justify-start text-sm h-8"
              >
                {t('allCategories')}
              </Button>
              {categories.map(cat => (
                <Button
                  key={cat}
                  variant={selectedProductCategory === cat ? 'secondary' : 'ghost'}
                  onClick={() => setSelectedProductCategory(cat)}
                  className="justify-start text-sm h-8"
                >
                  <span className="truncate">{translateCategory(cat)}</span>
                </Button>
              ))}
            </div>
          </div>
          <div className="md:col-span-3 h-full overflow-y-auto">
            {filteredProductsForModal.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                {t('noProductsFound')}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredProductsForModal.map(product => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onSelectProduct={onSelectProduct}
                    currencyFormatter={currencyFormatter}
                    t={t}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

    
