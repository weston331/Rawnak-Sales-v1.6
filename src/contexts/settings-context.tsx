
'use client';

import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { db, isFirebaseConfigured } from '@/lib/firebase';
import { collection, doc, onSnapshot, updateDoc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { useUser } from './user-context';


export interface Branch {
  id: string;
  name: string;
  contact: string;
}

export interface NotificationSettings {
  lowStockAlerts: boolean;
  debtReminders: boolean;
  updatesEmail: string;
}

export interface InvoiceSettings {
  template: 'standard' | 'compact';
  footerText: string;
}

const defaultMainBranch: Branch = { id: 'main', name: 'Rawnak Sales - Main Branch', contact: '+964 770 123 4567' };

const defaultNotificationSettings: NotificationSettings = {
  lowStockAlerts: true,
  debtReminders: false,
  updatesEmail: 'owner@rawnak.com',
};

const defaultInvoiceSettings: InvoiceSettings = {
  template: 'standard',
  footerText: 'Thank you for your business!\nشكراً لتعاملكم معنا!',
};

interface SettingsContextType {
  activeBranch: Branch | null;
  branches: Branch[];
  notificationSettings: NotificationSettings;
  invoiceSettings: InvoiceSettings;
  isInitialized: boolean;
  switchBranch: (branchId: string) => void;
  addBranch: (branchName: string) => Promise<Branch>;
  updateActiveBranchInfo: (newInfo: Partial<Omit<Branch, 'id'>>) => Promise<void>;
  updateNotificationSettings: (newSettings: Partial<NotificationSettings>) => Promise<void>;
  updateInvoiceSettings: (newSettings: Partial<InvoiceSettings>) => Promise<void>;
  deleteBranch: (branchId: string) => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const { currentUser } = useUser();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [activeBranchId, setActiveBranchId] = useState<string>('main');
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>(defaultNotificationSettings);
  const [invoiceSettings, setInvoiceSettings] = useState<InvoiceSettings>(defaultInvoiceSettings);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Load last active branch from localStorage to persist selection
    const lastActiveBranchId = localStorage.getItem('activeBranchId');
    if (lastActiveBranchId) {
        try {
            setActiveBranchId(JSON.parse(lastActiveBranchId));
        } catch(e) {
            setActiveBranchId('main');
        }
    }
    
    if (!isFirebaseConfigured || !db) {
        setBranches([defaultMainBranch]);
        setIsInitialized(true);
        return;
    }

    // Listen to branches collection
    const branchesCollectionRef = collection(db, 'branches');
    const unsubscribe = onSnapshot(branchesCollectionRef, (snapshot) => {
        if (snapshot.empty) {
            // If no branches exist, create the main one
            setDoc(doc(db, 'branches', 'main'), defaultMainBranch);
            setBranches([defaultMainBranch]);
        } else {
            const branchesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Branch));
            setBranches(branchesData);
        }
        setIsInitialized(true);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!activeBranchId || !isInitialized) return;
    
    if (!isFirebaseConfigured || !db) {
        setNotificationSettings(defaultNotificationSettings);
        setInvoiceSettings(defaultInvoiceSettings);
        return;
    }

    // Listen to settings for the active branch
    const settingsDocRef = doc(db, `branches/${activeBranchId}/data`, 'settings');
    const unsubscribe = onSnapshot(settingsDocRef, (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            setNotificationSettings(data.notificationSettings || defaultNotificationSettings);
            setInvoiceSettings(data.invoiceSettings || defaultInvoiceSettings);
        } else {
            // Create default settings if they don't exist for this branch
            setDoc(settingsDocRef, { 
                notificationSettings: defaultNotificationSettings,
                invoiceSettings: defaultInvoiceSettings
            });
            setNotificationSettings(defaultNotificationSettings);
            setInvoiceSettings(defaultInvoiceSettings);
        }
    });

    return () => unsubscribe();
  }, [activeBranchId, isInitialized]);
  
  const switchBranch = useCallback((branchId: string) => {
    setActiveBranchId(branchId);
    localStorage.setItem('activeBranchId', JSON.stringify(branchId));
  }, []);

  const addBranch = useCallback(async (branchName: string): Promise<Branch> => {
    const trimmedName = branchName.trim();
    if (!trimmedName) {
        throw new Error("Branch name cannot be empty.");
    }

    if (!isFirebaseConfigured || !db) {
        const newBranch: Branch = { id: `local-${Date.now()}`, name: trimmedName, contact: '' };
        setBranches(prevBranches => [...prevBranches, newBranch]);
        switchBranch(newBranch.id);
        return newBranch;
    }

    const newBranchRef = doc(collection(db, 'branches'));
    const newBranch: Branch = { id: newBranchRef.id, name: trimmedName, contact: '' };
    await setDoc(newBranchRef, newBranch);
    switchBranch(newBranch.id);
    return newBranch;
  }, [switchBranch]);
  
  const updateActiveBranchInfo = useCallback(async (newInfo: Partial<Omit<Branch, 'id'>>) => {
     if (!activeBranchId) return;

    if (!isFirebaseConfigured || !db) {
        setBranches(prevBranches => prevBranches.map(b => b.id === activeBranchId ? { ...b, ...newInfo } as Branch : b));
        return;
    }
    
    const branchDocRef = doc(db, 'branches', activeBranchId);
    await updateDoc(branchDocRef, newInfo);
  }, [activeBranchId]);


  const updateNotificationSettings = useCallback(async (newSettings: Partial<NotificationSettings>) => {
    if (!activeBranchId) return;
    
    if (!isFirebaseConfigured || !db) {
        setNotificationSettings(prevSettings => ({...prevSettings, ...newSettings}));
        return;
    }
    
    const settingsDocRef = doc(db, `branches/${activeBranchId}/data`, 'settings');
    const newSettingsData = { ...notificationSettings, ...newSettings };
    await setDoc(settingsDocRef, { notificationSettings: newSettingsData }, { merge: true });
  }, [activeBranchId, notificationSettings]);
  
  const updateInvoiceSettings = useCallback(async (newSettings: Partial<InvoiceSettings>) => {
    if (!activeBranchId) return;

    if (!isFirebaseConfigured || !db) {
        setInvoiceSettings(prevSettings => ({ ...prevSettings, ...newSettings }));
        return;
    }
    
    const settingsDocRef = doc(db, `branches/${activeBranchId}/data`, 'settings');
    const newSettingsData = { ...invoiceSettings, ...newSettings };
    await setDoc(settingsDocRef, { invoiceSettings: newSettingsData }, { merge: true });
  }, [activeBranchId, invoiceSettings]);
  
  const deleteBranch = useCallback(async (branchId: string): Promise<void> => {
    if (currentUser?.role !== 'Admin') throw new Error("permission_denied");
    if (branchId === 'main') throw new Error("cannot_delete_main");

    if (!isFirebaseConfigured || !db) {
        setBranches(prev => prev.filter(b => b.id !== branchId));
        if (activeBranchId === branchId) {
            switchBranch('main');
        }
        return;
    }
    
    const branchDocRef = doc(db, 'branches', branchId);
    await deleteDoc(branchDocRef);
    
    if (activeBranchId === branchId) {
      switchBranch('main');
    }
  }, [currentUser, activeBranchId, switchBranch]);

  const activeBranch = useMemo(() => branches.find(b => b.id === activeBranchId) || null, [branches, activeBranchId]);

  const value = useMemo(() => ({
    activeBranch,
    branches,
    notificationSettings,
    invoiceSettings,
    isInitialized,
    switchBranch,
    addBranch,
    updateActiveBranchInfo,
    updateNotificationSettings,
    updateInvoiceSettings,
    deleteBranch,
  }), [
    activeBranch,
    branches,
    notificationSettings,
    invoiceSettings,
    isInitialized,
    switchBranch,
    addBranch,
    updateActiveBranchInfo,
    updateNotificationSettings,
    updateInvoiceSettings,
    deleteBranch,
  ]);

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = (): SettingsContextType => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
