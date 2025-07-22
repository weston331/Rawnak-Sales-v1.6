
'use client';

import type { ReactNode } from 'react';
import React, { createContext, useMemo, useCallback, useState, useEffect, useContext } from 'react';
import { useSettings } from './settings-context';
import { db, isFirebaseConfigured } from '@/lib/firebase';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy, writeBatch, getDocs, setDoc } from 'firebase/firestore';

// Define the Product interface
export interface Product {
  id: string;
  name: string;
  category: string;
  priceUSD: number; 
  purchasePriceUSD: number;
  stock: number;
  description?: string;
  lowStockThreshold?: number;
  createdAt: string;
}

// Seed data for demo/offline mode
export const initialProducts: Product[] = [
  { id: '1', name: 'Basmati Rice (1kg)', category: 'Grains', priceUSD: 2.50, purchasePriceUSD: 2.00, stock: 150, lowStockThreshold: 10, createdAt: '2024-05-01T12:00:00.000Z' },
  { id: '2', name: 'Organic Apples', category: 'Fruits', priceUSD: 3.00, purchasePriceUSD: 2.40, stock: 8, lowStockThreshold: 10, createdAt: '2024-05-05T12:00:00.000Z' },
  { id: '3', name: 'Fresh Milk (1L)', category: 'Dairy', priceUSD: 1.20, purchasePriceUSD: 0.96, stock: 75, lowStockThreshold: 20, createdAt: '2024-06-10T12:00:00.000Z' },
  { id: '4', name: 'Whole Wheat Bread', category: 'Bakery', priceUSD: 2.00, purchasePriceUSD: 1.60, stock: 0, lowStockThreshold: 5, createdAt: '2024-07-01T12:00:00.000Z' },
  { id: '5', name: 'Chicken Breast (500g)', category: 'Meat', priceUSD: 5.50, purchasePriceUSD: 4.40, stock: 40, lowStockThreshold: 15, createdAt: '2024-07-15T12:00:00.000Z' },
];
export const initialDefinedCategories = [ 'Grains', 'Fruits', 'Dairy', 'Bakery', 'Meat', 'Beverages', 'Trucks' ];


// --- Context Definitions ---

interface ProductDataContextType {
  products: Product[];
  categories: string[];
  isLoading: boolean;
}
const ProductDataContext = createContext<ProductDataContextType | undefined>(undefined);


interface ProductActionsContextType {
  addProduct: (productData: Omit<Product, 'id' | 'createdAt'>) => Promise<void>;
  updateProduct: (productId: string, productData: Partial<Omit<Product, 'id' | 'createdAt'>>) => Promise<void>;
  deleteProduct: (productId: string) => Promise<void>;
  addCategory: (categoryName: string) => Promise<void>;
  updateCategory: (oldName: string, newName: string) => Promise<void>;
  deleteCategory: (categoryName: string) => Promise<void>;
}

const ProductActionsContext = createContext<ProductActionsContextType | undefined>(undefined);


export const ProductProvider = ({ children }: { children: ReactNode }) => {
  const { activeBranch, isInitialized: isSettingsInitialized } = useSettings();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isSettingsInitialized || !activeBranch) {
      return;
    }

    const branchId = activeBranch.id;
    const productsCacheKey = `products_${branchId}`;
    const categoriesCacheKey = `categories_${branchId}`;
    
    setIsLoading(true);

    // Immediately try to load data from localStorage to make the UI responsive.
    let isDataLoadedFromCache = false;
    try {
      const cachedProducts = localStorage.getItem(productsCacheKey);
      const cachedCategories = localStorage.getItem(categoriesCacheKey);
      if (cachedProducts && cachedCategories) {
        setProducts(JSON.parse(cachedProducts));
        setCategories(JSON.parse(cachedCategories));
        isDataLoadedFromCache = true;
      }
    } catch (e) {
      console.error("Failed to load product data from localStorage", e);
    }
    
    // If we loaded from cache, we can show the UI immediately.
    // The snapshot listener will then update it with any fresh data from the server.
    if (isDataLoadedFromCache) {
      setIsLoading(false);
    }

    if (!isFirebaseConfigured || !db) {
        console.log("Firebase not configured. Using initial mock data for products.");
        setProducts(initialProducts);
        setCategories(initialDefinedCategories);
        localStorage.setItem(productsCacheKey, JSON.stringify(initialProducts));
        localStorage.setItem(categoriesCacheKey, JSON.stringify(initialDefinedCategories));
        setIsLoading(false);
        return;
    }
    
    // Listener for products
    const productsQuery = query(collection(db, `branches/${branchId}/products`), orderBy("createdAt", "desc"));
    const unsubscribeProducts = onSnapshot(productsQuery, (snapshot) => {
        const productsData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Product));
        setProducts(productsData);
        localStorage.setItem(productsCacheKey, JSON.stringify(productsData));
        setIsLoading(false); // Data has been loaded from Firebase
    }, (error) => {
        console.error("Error fetching real-time products:", error);
        setIsLoading(false);
    });

    // Listener for categories
    const categoriesDocRef = doc(db, `branches/${branchId}/data`, 'categories');
    const unsubscribeCategories = onSnapshot(categoriesDocRef, (docSnap) => {
        if (docSnap.exists()) {
            const categoryList = docSnap.data().list || [];
            setCategories(categoryList);
            localStorage.setItem(categoriesCacheKey, JSON.stringify(categoryList));
        } else {
             if (branchId === 'main') { // Seeding logic for main branch on first run
                const productsCollectionRef = collection(db, 'branches/main/products');
                getDocs(productsCollectionRef).then(productSnapshot => {
                    if (productSnapshot.empty) {
                        console.log("Seeding initial products and categories for 'main' branch...");
                        const batch = writeBatch(db);
                        initialProducts.forEach(p => {
                            const { id, ...productData } = p;
                            batch.set(doc(productsCollectionRef, id), productData);
                        });
                        batch.set(categoriesDocRef, { list: initialDefinedCategories });
                        batch.commit();
                    }
                });
             } else {
                setCategories([]);
                localStorage.setItem(categoriesCacheKey, JSON.stringify([]));
             }
        }
    }, (error) => {
        console.error("Error fetching categories:", error);
    });

    return () => {
      unsubscribeProducts();
      unsubscribeCategories();
    };
  }, [activeBranch, isSettingsInitialized]);

  
  const addProduct = useCallback(async (productData: Omit<Product, 'id' | 'createdAt'>) => {
    if (!activeBranch || !isFirebaseConfigured || !db) return;
    const createdAt = new Date().toISOString();
    const productsCollectionRef = collection(db, `branches/${activeBranch.id}/products`);
    await addDoc(productsCollectionRef, { ...productData, createdAt });
  }, [activeBranch]);
  
  const updateProduct = useCallback(async (productId: string, productData: Partial<Omit<Product, 'id' | 'createdAt'>>) => {
    if (!activeBranch || !isFirebaseConfigured || !db) return;
    const productDocRef = doc(db, `branches/${activeBranch.id}/products`, productId);
    await updateDoc(productDocRef, productData);
  }, [activeBranch]);

  const deleteProduct = useCallback(async (productId: string) => {
    if (!activeBranch || !isFirebaseConfigured || !db) return;
    const productDocRef = doc(db, `branches/${activeBranch.id}/products`, productId);
    await deleteDoc(productDocRef);
  }, [activeBranch]);
  
  const addCategory = useCallback(async (categoryName: string) => {
    const trimmedName = categoryName.trim();
    if (!trimmedName || categories.some(c => c.toLowerCase() === trimmedName.toLowerCase())) return;
    if (!activeBranch || !isFirebaseConfigured || !db) return;

    const newCategories = [...categories, trimmedName].sort();
    const categoriesDocRef = doc(db, `branches/${activeBranch.id}/data`, 'categories');
    await setDoc(categoriesDocRef, { list: newCategories });
  }, [activeBranch, categories]);

  const updateCategory = useCallback(async (oldName: string, newName: string) => {
    const trimmedNewName = newName.trim();
    if (!trimmedNewName || oldName === trimmedNewName || !activeBranch || !isFirebaseConfigured || !db) return;
    
    const newCategories = categories.map(c => c === oldName ? trimmedNewName : c);
    const batch = writeBatch(db);
    
    const categoriesDocRef = doc(db, `branches/${activeBranch.id}/data`, 'categories');
    batch.set(categoriesDocRef, { list: newCategories });

    const productsToUpdate = products.filter(p => p.category === oldName);
    productsToUpdate.forEach(product => {
        const productRef = doc(db, `branches/${activeBranch.id}/products`, product.id);
        batch.update(productRef, { category: trimmedNewName });
    });

    await batch.commit();
  }, [activeBranch, categories, products]);

  const deleteCategory = useCallback(async (categoryName: string) => {
    if (!activeBranch || !isFirebaseConfigured || !db) return;

    const isCategoryInUse = products.some(p => p.category === categoryName);
    if (isCategoryInUse) {
        throw new Error("CATEGORY_IN_USE");
    }

    const newCategories = categories.filter(c => c !== categoryName);
    const categoriesDocRef = doc(db, `branches/${activeBranch.id}/data`, 'categories');
    await setDoc(categoriesDocRef, { list: newCategories });
  }, [activeBranch, products, categories]);
  
  const dataValue = useMemo(() => ({ products, categories, isLoading }), [products, categories, isLoading]);
  const actionsValue = React.useMemo(() => ({ addProduct, updateProduct, deleteProduct, addCategory, updateCategory, deleteCategory }), [addProduct, updateProduct, deleteProduct, addCategory, updateCategory, deleteCategory]);

  return (
    <ProductDataContext.Provider value={dataValue}>
        <ProductActionsContext.Provider value={actionsValue}>
            {children}
        </ProductActionsContext.Provider>
    </ProductDataContext.Provider>
  );
};


// --- Custom Hooks ---

export const useProductData = (): ProductDataContextType => {
  const context = useContext(ProductDataContext);
  if (context === undefined) {
    throw new Error('useProductData must be used within a ProductProvider');
  }
  return context;
};

export const useProductActions = (): ProductActionsContextType => {
  const context = React.useContext(ProductActionsContext);
  if (context === undefined) {
    throw new Error('useProductActions must be used within a ProductProvider');
  }
  return context;
};
