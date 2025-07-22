
'use client';

import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { Currency, currencies, placeholderExchangeRates } from '@/lib/currencies';

interface CurrencyContextType {
  selectedCurrency: Currency;
  exchangeRates: Record<string, number>;
  changeCurrency: (currencyCode: string) => void;
  formatCurrency: (amountInUSD: number) => string;
  convertToSelectedCurrency: (amountInUSD: number) => number;
  convertFromSelectedCurrencyToUSD: (amountInSelectedCurrency: number) => number;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export const CurrencyProvider = ({ children }: { children: ReactNode }) => {
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>(currencies[0]); // Default to USD
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>(placeholderExchangeRates);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // This effect runs only on the client, after the initial render.
    try {
      const item = window.localStorage.getItem('selectedCurrency');
      if (item) {
        const foundCurrency = currencies.find(c => c.code === item);
        if (foundCurrency) {
          setSelectedCurrency(foundCurrency);
        }
      }
    } catch (error) {
      console.error(error);
    }
    // In a real app, fetch exchange rates here if they are dynamic
    // For now, we use placeholder rates
    setIsInitialized(true);
  }, []);

  const changeCurrency = useCallback((currencyCode: string) => {
    const newCurrency = currencies.find(c => c.code === currencyCode);
    if (newCurrency) {
      setSelectedCurrency(newCurrency);
      localStorage.setItem('selectedCurrency', currencyCode);
    }
  }, []);

  const convertToSelectedCurrency = useCallback((amountInUSD: number): number => {
    const rate = exchangeRates[selectedCurrency.code];
    if (rate === undefined) {
      console.warn(`Exchange rate not found for ${selectedCurrency.code}, returning amount in USD`);
      return amountInUSD; // Fallback to USD if rate is missing
    }
    return amountInUSD * rate;
  }, [selectedCurrency.code, exchangeRates]);

  const convertFromSelectedCurrencyToUSD = useCallback((amountInSelectedCurrency: number): number => {
    const rate = exchangeRates[selectedCurrency.code];
    if (rate === undefined || rate === 0) {
      console.warn(`Exchange rate not found or zero for ${selectedCurrency.code}, returning amount as is`);
      return amountInSelectedCurrency; // Fallback
    }
    return amountInSelectedCurrency / rate;
  }, [selectedCurrency.code, exchangeRates]);
  

  const formatCurrency = useCallback((amountInBaseCurrency: number): string => {
    const convertedAmount = convertToSelectedCurrency(amountInBaseCurrency);
    const { symbol, code } = selectedCurrency;

    const minimumFractionDigits = code === 'IQD' ? 0 : 2;
    const maximumFractionDigits = code === 'IQD' ? 0 : 2;

    const formattedAmount = convertedAmount.toLocaleString('en-US', { minimumFractionDigits, maximumFractionDigits });

    if (code === 'IQD') {
      return `${formattedAmount} ${symbol}`;
    }
    return `${symbol}${formattedAmount}`;
  }, [selectedCurrency, convertToSelectedCurrency]);

  const value = useMemo(() => ({
    selectedCurrency,
    exchangeRates,
    changeCurrency,
    formatCurrency,
    convertToSelectedCurrency,
    convertFromSelectedCurrencyToUSD
  }), [
    selectedCurrency, 
    exchangeRates, 
    changeCurrency, 
    formatCurrency, 
    convertToSelectedCurrency, 
    convertFromSelectedCurrencyToUSD
  ]);
  
  if (!isInitialized) {
    // Return a default/loading state on the server or before client-side hydration
    // To prevent hydration errors, the server-rendered output must match the first client render.
    // We can provide a default value that doesn't depend on localStorage.
    const defaultValue = {
        ...value,
        selectedCurrency: currencies[0], // Always USD on server
    };
    return (
      <CurrencyContext.Provider value={defaultValue}>
        {children}
      </CurrencyContext.Provider>
    );
  }


  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = (): CurrencyContextType => {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
};
