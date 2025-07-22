
'use client';

import type { ReactNode } from 'react';
import React, { createContext, useMemo, useCallback, useState, useEffect, useContext } from 'react';
import { useSettings } from './settings-context';
import { db, isFirebaseConfigured } from '@/lib/firebase';
import { collection, onSnapshot, addDoc, doc, setDoc, query, orderBy, writeBatch, runTransaction } from 'firebase/firestore';
import type { Customer, Transaction } from './customer-context';
import type { Product } from './product-context';


export interface SaleItem {
  productId: string;
  name: string;
  priceUSD: number; 
  quantity: number;
  purchasePriceUSD?: number; // Cost of the item/service
}

export interface Sale {
  id: string;
  invoiceNumber: string;
  date: string;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  totalUSD: number;
  status: 'Paid' | 'Debt';
  items: SaleItem[];
  discountType?: 'percentage' | 'fixed';
  discountValue?: number;
  discountAmountUSD?: number;
}

// --- Context Definitions ---

interface SaleDataContextType {
    sales: Sale[];
    isLoading: boolean;
}
const SaleDataContext = createContext<SaleDataContextType | undefined>(undefined);


interface RecordSaleTransactionData {
    cart: SaleItem[];
    customer: Customer;
    totalUSD: number;
    paymentMethod: 'paid' | 'debt';
    discountType?: 'percentage' | 'fixed';
    discountValue?: number;
    discountAmountUSD?: number;
}
interface SaleActionsContextType {
  recordNewSaleTransaction: (data: RecordSaleTransactionData) => Promise<Sale>;
}

const SaleActionsContext = React.createContext<SaleActionsContextType | undefined>(undefined);

export const SaleProvider = ({ children }: { children: ReactNode }) => {
  const { activeBranch, isInitialized: isSettingsInitialized } = useSettings();
  const [sales, setSales] = useState<Sale[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isSettingsInitialized || !activeBranch) {
        return;
    }

    const branchId = activeBranch.id;
    const cacheKey = `sales_${branchId}`;
    setIsLoading(true);

    let isDataLoadedFromCache = false;
    try {
      const cachedSales = localStorage.getItem(cacheKey);
      if (cachedSales) {
        setSales(JSON.parse(cachedSales));
        isDataLoadedFromCache = true;
      }
    } catch (e) {
      console.error("Failed to load sales data from localStorage", e);
    }

    if (isDataLoadedFromCache) {
      setIsLoading(false);
    }
    
    if (!isFirebaseConfigured || !db) {
        console.log("Firebase not configured. Using empty data for sales.");
        setSales([]);
        localStorage.setItem(cacheKey, JSON.stringify([]));
        setIsLoading(false);
        return;
    }

    const salesQuery = query(collection(db, `branches/${branchId}/sales`), orderBy('date', 'desc'));

    const unsubscribe = onSnapshot(salesQuery, (snapshot) => {
        const salesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Sale));
        setSales(salesData);
        localStorage.setItem(cacheKey, JSON.stringify(salesData));
        setIsLoading(false);
    }, (error) => {
        console.error("Error fetching real-time sales:", error);
        setIsLoading(false);
    });

    return () => unsubscribe();
  }, [activeBranch, isSettingsInitialized]);


  const recordNewSaleTransaction = useCallback(async (data: RecordSaleTransactionData): Promise<Sale> => {
    if (!activeBranch || !isFirebaseConfigured || !db) throw new Error("Database not ready");

    const { cart, customer, totalUSD, paymentMethod, ...discountInfo } = data;
    const branchId = activeBranch.id;

    const invoiceNumber = `S-${String(Date.now()).slice(-6)}`;
    const newSaleData: Omit<Sale, 'id'> = {
        date: new Date().toISOString(),
        customerId: customer.id,
        customerName: customer.name,
        customerPhone: customer.phone,
        totalUSD: totalUSD,
        status: paymentMethod === 'paid' ? 'Paid' : 'Debt',
        items: cart,
        invoiceNumber,
        ...discountInfo
    };
    
    const newSaleRef = doc(collection(db, `branches/${branchId}/sales`));

    await runTransaction(db, async (transaction) => {
      // --- STAGE 1: READS ---
      // Only read documents for actual products, not custom items
      const productItemsInCart = cart.filter(item => !item.productId.startsWith('custom-'));
      const productRefs = productItemsInCart.map(item => doc(db, `branches/${branchId}/products`, item.productId));
      const productDocs = await Promise.all(productRefs.map(ref => transaction.get(ref)));
      
      let customerDoc: any = null;
      if (paymentMethod === 'debt') {
        const customerRef = doc(db, `branches/${branchId}/customers`, customer.id);
        customerDoc = await transaction.get(customerRef);
      }

      // --- STAGE 2: VALIDATION ---
      for (let i = 0; i < productItemsInCart.length; i++) {
        const productDocSnap = productDocs[i];
        if (!productDocSnap.exists()) {
          throw new Error(`Product ${productItemsInCart[i].name} not found.`);
        }
        if ((productDocSnap.data().stock as number) < productItemsInCart[i].quantity) {
          throw new Error(`Not enough stock for ${productItemsInCart[i].name}.`);
        }
      }
      if (paymentMethod === 'debt' && (customerDoc && !customerDoc.exists())) {
        throw new Error(`Customer with ID ${customer.id} not found!`);
      }

      // --- STAGE 3: WRITES ---
      transaction.set(newSaleRef, newSaleData);

      // Update stock only for actual products
      for (let i = 0; i < productItemsInCart.length; i++) {
        const item = productItemsInCart[i];
        const productRef = productRefs[i];
        const currentStock = productDocs[i].data()?.stock || 0;
        transaction.update(productRef, { stock: currentStock - item.quantity });
      }

      if (paymentMethod === 'debt' && customerDoc?.exists()) {
        const customerRef = doc(db, `branches/${branchId}/customers`, customer.id);
        const newTransactionEntry: Transaction = {
          id: `T${Date.now()}`,
          date: new Date().toISOString(),
          description: `Sale #${invoiceNumber}`,
          type: 'DEBIT',
          amountUSD: totalUSD,
          items: cart,
        };
        const currentDebt = customerDoc.data()?.totalDebtUSD || 0;
        const currentTransactions = customerDoc.data()?.transactions || [];
        transaction.update(customerRef, {
            totalDebtUSD: currentDebt + totalUSD,
            transactions: [...currentTransactions, newTransactionEntry]
        });
      }
    });

    // Return the full sale object for immediate use (e.g., printing)
    return { id: newSaleRef.id, ...newSaleData };
  }, [activeBranch]);
  
  const dataValue = useMemo(() => ({ sales, isLoading }), [sales, isLoading]);
  const actionsValue = React.useMemo(() => ({ recordNewSaleTransaction }), [recordNewSaleTransaction]);


  return (
    <SaleDataContext.Provider value={dataValue}>
      <SaleActionsContext.Provider value={actionsValue}>
        {children}
      </SaleActionsContext.Provider>
    </SaleDataContext.Provider>
  );
};

// --- Custom Hooks ---

export const useSaleData = (): SaleDataContextType => {
    const context = useContext(SaleDataContext);
    if (context === undefined) {
        throw new Error('useSaleData must be used within a SaleProvider');
    }
    return context;
};


export const useSaleActions = (): SaleActionsContextType => {
  const context = React.useContext(SaleActionsContext);
  if (context === undefined) {
    throw new Error('useSaleActions must be used within a SaleProvider');
  }
  return context;
};
