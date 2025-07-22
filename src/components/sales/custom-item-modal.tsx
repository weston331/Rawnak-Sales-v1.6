
'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

interface CustomItemModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onAddItem: (item: { name: string; salePrice: number; purchasePrice: number; quantity: number }) => void;
  t: any; // SalesPage translations
  tg: any; // General translations
  currencySymbol: string;
}

export default function CustomItemModal({
  isOpen,
  onOpenChange,
  onAddItem,
  t,
  tg,
  currencySymbol,
}: CustomItemModalProps) {
  const [name, setName] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [quantity, setQuantity] = useState('1');
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      setName('');
      setSalePrice('');
      setPurchasePrice('');
      setQuantity('1');
    }
  }, [isOpen]);

  const handleAddItemClick = () => {
    const salePriceNumber = parseFloat(salePrice);
    const purchasePriceNumber = parseFloat(purchasePrice) || 0;
    const quantityNumber = parseInt(quantity, 10);

    if (!name.trim()) {
      toast({
        title: tg('errorTitle'),
        description: t('itemNameRequiredError'),
        variant: 'destructive',
      });
      return;
    }

    if (isNaN(salePriceNumber) || salePriceNumber < 0) {
      toast({
        title: tg('errorTitle'),
        description: t('itemPriceRequiredError'),
        variant: 'destructive',
      });
      return;
    }
    
    if (isNaN(purchasePriceNumber) || purchasePriceNumber < 0) {
      toast({
        title: tg('errorTitle'),
        description: t('itemCostRequiredError'),
        variant: 'destructive',
      });
      return;
    }

    if (isNaN(quantityNumber) || quantityNumber <= 0) {
      toast({
        title: tg('errorTitle'),
        description: t('itemQuantityRequiredError'),
        variant: 'destructive',
      });
      return;
    }

    onAddItem({ 
      name: name.trim(), 
      salePrice: salePriceNumber, 
      purchasePrice: purchasePriceNumber, 
      quantity: quantityNumber 
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('addCustomItemTitle')}</DialogTitle>
          <DialogDescription>{t('addCustomItemDescription')}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="item-name">{t('itemNameLabel')}</Label>
            <Input
              id="item-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('itemNamePlaceholder')}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
             <div>
              <Label htmlFor="item-purchase-price">{t('itemCostLabel', { currencySymbol })}</Label>
              <Input
                id="item-purchase-price"
                type="number"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label htmlFor="item-sale-price">{t('itemPriceLabel', { currencySymbol })}</Label>
              <Input
                id="item-sale-price"
                type="number"
                value={salePrice}
                onChange={(e) => setSalePrice(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>
          <div>
              <Label htmlFor="item-quantity">{t('itemQuantityLabel')}</Label>
              <Input
                id="item-quantity"
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                min="1"
              />
            </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{tg('cancel')}</Button>
          <Button onClick={handleAddItemClick}>{t('addItemToCartButton')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
