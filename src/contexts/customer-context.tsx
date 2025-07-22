
'use client';

import type { ReactNode } from 'react';
import React, { createContext, useMemo, useCallback, useState, useEffect, useContext } from 'react';
import { useSettings } from './settings-context';
import { db, isFirebaseConfigured } from '@/lib/firebase';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, setDoc, query, orderBy, writeBatch, runTransaction } from 'firebase/firestore';

// Define the Transaction and Customer interfaces
export interface Transaction {
  id: string;
  date: string;
  description: string;
  type: 'DEBIT' | 'CREDIT';
  amountUSD: number;
  items?: {
    productId: string;
    name: string;
    quantity: number;
    priceUSD: number;
  }[];
}

export interface Customer {
  id: string;
  debtId: string;
  name: string;
  phone?: string;
  totalDebtUSD: number;
  customerSince: string;
  transactions: Transaction[];
  dueDate?: string;
}

const initialCustomers: Customer[] = [
  {
    id: 'C001',
    debtId: 'D001',
    name: 'Ahmed Ali (متأخر جداً)',
    phone: '07712345678',
    totalDebtUSD: 1500,
    customerSince: '2023-01-15T10:00:00.000Z',
    dueDate: '2023-08-01', // Very overdue
    transactions: [
      {
        id: 'T001',
        date: '2023-01-15T10:00:00.000Z',
        description: 'Initial large purchase',
        type: 'DEBIT',
        amountUSD: 1500,
        items: [
            { productId: '1', name: 'Basmati Rice (1kg)', quantity: 100, priceUSD: 2.50 },
            { productId: '5', name: 'Chicken Breast (500g)', quantity: 227.27, priceUSD: 5.50 }
        ]
      }
    ]
  },
  {
    id: 'C002',
    debtId: 'D002',
    name: 'Fatima Kadhim',
    phone: '07809876543',
    totalDebtUSD: 0,
    customerSince: '2024-03-10T14:30:00.000Z',
    transactions: [
        {
            id: 'T002',
            date: '2024-03-10T14:30:00.000Z',
            description: 'Sale #S-240310',
            type: 'DEBIT',
            amountUSD: 150
        },
        {
            id: 'T003',
            date: '2024-04-01T11:00:00.000Z',
            description: 'Cash Payment',
            type: 'CREDIT',
            amountUSD: 150
        }
    ]
  },
  {
    id: 'C003',
    debtId: 'D003',
    name: 'Zainab Mahmoud',
    phone: '07901122334',
    totalDebtUSD: 75.50,
    customerSince: '2024-06-20T09:00:00.000Z',
    dueDate: new Date(new Date().setDate(new Date().getDate() + 15)).toISOString().split('T')[0], // Due in 15 days
    transactions: [
        {
            id: 'T004',
            date: '2024-06-20T09:00:00.000Z',
            description: 'Sale #S-240620',
            type: 'DEBIT',
            amountUSD: 75.50
        }
    ]
  }
];


// --- Context Definitions ---
interface CustomerDataContextType {
  customers: Customer[];
  isLoading: boolean;
}
const CustomerDataContext = createContext<CustomerDataContextType | undefined>(undefined);


interface CustomerActionsContextType {
  addCustomer: (newCustomerData: { name: string; phone: string }) => Promise<Customer>;
  updateCustomer: (customerId: string, data: Partial<Omit<Customer, 'id'>>) => Promise<void>;
  deleteCustomer: (customerId: string) => Promise<void>;
  deleteTransaction: (customer: Customer, transactionId: string) => Promise<void>;
}

const CustomerActionsContext = createContext<CustomerActionsContextType | undefined>(undefined);

export const CustomerProvider = ({ children }: { children: ReactNode }) => {
  const { activeBranch, isInitialized: isSettingsInitialized } = useSettings();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    if (!isSettingsInitialized || !activeBranch) {
      return;
    }

    const branchId = activeBranch.id;
    const cacheKey = `customers_${branchId}`;
    setIsLoading(true);

    let isDataLoadedFromCache = false;
    try {
      const cachedCustomers = localStorage.getItem(cacheKey);
      if (cachedCustomers) {
        setCustomers(JSON.parse(cachedCustomers));
        isDataLoadedFromCache = true;
      }
    } catch (e) {
      console.error("Failed to load customer data from localStorage", e);
    }
    
    if (isDataLoadedFromCache) {
      setIsLoading(false);
    }

    if (!isFirebaseConfigured || !db) {
        console.log("Firebase not configured. Using initial mock data for customers.");
        setCustomers(initialCustomers);
        localStorage.setItem(cacheKey, JSON.stringify(initialCustomers));
        setIsLoading(false);
        return;
    }

    const customersCollectionRef = collection(db, `branches/${branchId}/customers`);
    const q = query(customersCollectionRef, orderBy("customerSince", "desc"));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
        if (branchId === 'main' && snapshot.empty) {
            console.log("Seeding initial customers for 'main' branch...");
            const batch = writeBatch(db);
            initialCustomers.forEach(customer => {
                const { id, ...customerData } = customer;
                const docRef = doc(db, `branches/main/customers`, id);
                batch.set(docRef, customerData);
            });
            batch.commit();
        } else {
            const customersData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Customer));
            setCustomers(customersData);
            localStorage.setItem(cacheKey, JSON.stringify(customersData));
        }
        setIsLoading(false);
    }, (error) => {
        console.error("Error fetching real-time customers:", error);
        setIsLoading(false);
    });

    return () => unsubscribe();
  }, [activeBranch, isSettingsInitialized]);

  const addCustomer = useCallback(async (newCustomerData: { name: string; phone: string }): Promise<Customer> => {
    const branchId = activeBranch?.id;
    if (!branchId || !isFirebaseConfigured || !db) throw new Error("Database not ready");
    
    const newCustomerDbData: Omit<Customer, 'id'> = {
        debtId: `D${Date.now()}`,
        name: newCustomerData.name,
        phone: newCustomerData.phone || '',
        totalDebtUSD: 0,
        customerSince: new Date().toISOString(),
        transactions: [],
    };
    
    const newDocRef = await addDoc(collection(db, `branches/${branchId}/customers`), newCustomerDbData);
    // Return the full customer object for immediate use if needed (like in the sales page modal)
    return { id: newDocRef.id, ...newCustomerDbData };
  }, [activeBranch?.id]);
  
  const updateCustomer = useCallback(async (customerId: string, data: Partial<Omit<Customer, 'id'>>) => {
    const branchId = activeBranch?.id;
    if (!branchId || Object.keys(data).length === 0 || !isFirebaseConfigured || !db) return;

    const customerDocRef = doc(db, `branches/${branchId}/customers`, customerId);
    await updateDoc(customerDocRef, data);
  }, [activeBranch?.id]);

  const deleteCustomer = useCallback(async (customerId: string) => {
    const branchId = activeBranch?.id;
    if (!branchId || !isFirebaseConfigured || !db) return;

    const customerDocRef = doc(db, `branches/${branchId}/customers`, customerId);
    await deleteDoc(customerDocRef);
  }, [activeBranch?.id]);
  
  const deleteTransaction = useCallback(async (customer: Customer, transactionId: string) => {
    if (!customer) return;

    const newTransactions = customer.transactions.filter(tx => tx.id !== transactionId);
    const newTotalDebtUSD = newTransactions.reduce((acc, tx) => {
        return tx.type === 'DEBIT' ? acc + tx.amountUSD : acc - tx.amountUSD;
    }, 0);
    
    const updatedData = {
        transactions: newTransactions,
        totalDebtUSD: parseFloat(newTotalDebtUSD.toFixed(2))
    };

    await updateCustomer(customer.id, updatedData);
  }, [updateCustomer]);

  const dataValue = useMemo(() => ({ customers, isLoading }), [customers, isLoading]);
  const actionsValue = useMemo(() => ({ addCustomer, updateCustomer, deleteCustomer, deleteTransaction }), [addCustomer, updateCustomer, deleteCustomer, deleteTransaction]);

  return (
    <CustomerDataContext.Provider value={dataValue}>
      <CustomerActionsContext.Provider value={actionsValue}>
        {children}
      </CustomerActionsContext.Provider>
    </CustomerDataContext.Provider>
  );
};


// --- Custom Hooks ---
export const useCustomerData = (): CustomerDataContextType => {
  const context = useContext(CustomerDataContext);
  if (context === undefined) {
    throw new Error('useCustomerData must be used within a CustomerProvider');
  }
  return context;
};

export const useCustomerActions = (): CustomerActionsContextType => {
  const context = useContext(CustomerActionsContext);
  if (context === undefined) {
    throw new Error('useCustomerActions must be used within a CustomerProvider');
  }
  return context;
};
