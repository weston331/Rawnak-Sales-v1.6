
'use client';

import type { ReactNode } from 'react';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { db, isFirebaseConfigured } from '@/lib/firebase';
import { collection, onSnapshot, doc, getDocs, writeBatch, updateDoc, setDoc, deleteDoc } from 'firebase/firestore';

// Define the User interface
export interface User {
  id: string;
  name: string;
  username: string;
  password?: string; // This is insecure and for prototype purposes only.
  role: 'Admin' | 'Employee';
  status: 'Active' | 'Inactive';
  avatarUrl?: string;
  permissions: {
    manageSales: boolean;
    manageProducts: boolean;
    manageInventory: boolean;
    manageDebts: boolean;
    manageUsers: boolean;
  };
}

// Initial mock data for users
const initialUsers: User[] = [
  { 
    id: 'U001', 
    name: 'Ali Hassan', 
    username: 'admin',
    password: 'admin',
    role: 'Admin', 
    status: 'Active',
    avatarUrl: 'https://placehold.co/100x100.png',
    permissions: { manageSales: true, manageProducts: true, manageInventory: true, manageDebts: true, manageUsers: true }
  },
  { 
    id: 'U002', 
    name: 'Sara Ibrahim', 
    username: 'sara',
    password: 'password',
    role: 'Employee', 
    status: 'Active',
    avatarUrl: 'https://placehold.co/100x100.png',
    permissions: { manageSales: true, manageProducts: true, manageInventory: false, manageDebts: false, manageUsers: false }
  },
];

interface UserContextType {
  users: User[];
  currentUser: User | null;
  isInitialized: boolean;
  addUser: (userData: Omit<User, 'id'>) => Promise<void>;
  updateUser: (userId: string, userData: Partial<Omit<User, 'id'>>) => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
  changePassword: (userId: string, oldPass: string, newPass: string) => Promise<{ success: boolean; message: string }>;
  login: (username: string, password: string) => { success: boolean; message?: string };
  logout: () => void;
}

const UserContext = React.createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [users, setUsers] = React.useState<User[]>([]);
  const [currentUser, setCurrentUser] = React.useState<User | null>(null);
  const [isInitialized, setIsInitialized] = React.useState(false);

  useEffect(() => {
    let unsubscribe = () => {};

    if (!isFirebaseConfigured || !db) {
        setUsers(initialUsers);
        try {
            const currentUserItem = window.localStorage.getItem('currentUser');
            if (currentUserItem) {
                const storedUser = JSON.parse(currentUserItem);
                if (initialUsers.some(u => u.id === storedUser.id)) {
                    setCurrentUser(storedUser);
                }
            }
        } catch (error) {
            console.error("Failed to load current user from localStorage", error);
        }
        setIsInitialized(true);
    } else {
        const usersCollectionRef = collection(db, 'users');
        unsubscribe = onSnapshot(usersCollectionRef, (snapshot) => {
            if (snapshot.empty) {
                const batch = writeBatch(db);
                initialUsers.forEach(user => {
                    const { id, ...userData } = user;
                    const docRef = doc(db, 'users', id);
                    batch.set(docRef, userData);
                });
                batch.commit().then(() => {
                    // The listener will pick up the newly seeded data automatically.
                    if (!isInitialized) setIsInitialized(true);
                });
            } else {
                const usersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
                setUsers(usersData);
                if (!isInitialized) setIsInitialized(true);
            }
        }, (error) => {
            console.error("Firebase listener error:", error);
            setIsInitialized(true);
        });

        try {
            const currentUserItem = window.localStorage.getItem('currentUser');
            if (currentUserItem) {
                setCurrentUser(JSON.parse(currentUserItem));
            }
        } catch (error) {
            console.error("Failed to load current user from localStorage", error);
        }
    }

    return () => unsubscribe();
  }, [isInitialized]);


  useEffect(() => {
    if (isInitialized) {
        try {
            if (currentUser) {
                window.localStorage.setItem('currentUser', JSON.stringify(currentUser));
            } else {
                window.localStorage.removeItem('currentUser');
            }
        } catch (error) {
            console.error(error);
        }
    }
  }, [currentUser, isInitialized]);

  const addUser = useCallback(async (userData: Omit<User, 'id'>) => {
    if (!isFirebaseConfigured || !db) {
        const newUser: User = { id: `local-${Date.now()}`, ...userData };
        setUsers(prev => [newUser, ...prev].sort((a,b) => a.name.localeCompare(b.name)));
        return;
    }
    const newUserRef = doc(collection(db, 'users'));
    await setDoc(newUserRef, userData);
  }, []);
  
  const updateUser = useCallback(async (userId: string, userData: Partial<Omit<User, 'id'>>) => {
    if (!isFirebaseConfigured || !db) {
        setUsers(prev => prev.map(u => u.id === userId ? {...u, ...userData} as User : u));
        if (currentUser?.id === userId) {
            setCurrentUser(prev => prev ? {...prev, ...userData} as User : null);
        }
        return;
    }
    const userDocRef = doc(db, 'users', userId);
    await updateDoc(userDocRef, userData);
    if (currentUser?.id === userId) {
        setCurrentUser(prev => prev ? {...prev, ...userData} as User : null);
    }
  }, [currentUser?.id]);

  const deleteUser = useCallback(async (userId: string) => {
    if (!isFirebaseConfigured || !db) {
        setUsers(prev => prev.filter(u => u.id !== userId));
        return;
    }
    const userDocRef = doc(db, 'users', userId);
    await deleteDoc(userDocRef);
  }, []);
  
  const changePassword = useCallback(async (userId: string, oldPass: string, newPass: string): Promise<{ success: boolean, message: string }> => {
    const user = users.find(u => u.id === userId);
    if (!user) return { success: false, message: 'adminUserNotFoundError' };
    if (user.password !== oldPass) return { success: false, message: 'incorrectCurrentPasswordError' };

    if (!isFirebaseConfigured || !db) {
        const updatedUser = { ...user, password: newPass };
        setUsers(prev => prev.map(u => (u.id === userId ? updatedUser : u)));
        if (currentUser?.id === userId) setCurrentUser(updatedUser);
        return { success: true, message: 'passwordChangedSuccess' };
    }
    
    const userDocRef = doc(db, 'users', userId);
    await updateDoc(userDocRef, { password: newPass });
    if (currentUser?.id === userId) {
        setCurrentUser(prev => prev ? {...prev, password: newPass} : null);
    }
    
    return { success: true, message: 'passwordChangedSuccess' };
  }, [users, currentUser?.id]);
  
  const login = useCallback((username: string, password: string): { success: boolean, message?: string } => {
      const userToLogin = users.find(u => u.username.toLowerCase() === username.toLowerCase());

      if (!userToLogin) return { success: false, message: 'userNotFound' };
      if (userToLogin.password !== password) return { success: false, message: 'incorrectPassword' };
      if (userToLogin.status === 'Inactive') return { success: false, message: 'userInactive' };

      setCurrentUser(userToLogin);
      return { success: true };
  }, [users]);
  
  const logout = useCallback(() => {
      setCurrentUser(null);
  }, []);

  const value = useMemo(() => ({ 
      users, 
      currentUser, 
      isInitialized, 
      addUser, 
      updateUser, 
      deleteUser, 
      changePassword, 
      login, 
      logout 
  }), [
      users,
      currentUser,
      isInitialized,
      addUser,
      updateUser,
      deleteUser,
      changePassword,
      login,
      logout
  ]);

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = (): UserContextType => {
  const context = React.useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
