
export interface Currency {
  code: string;
  name: string;
  symbol: string;
}

export const currencies: Currency[] = [
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'IQD', name: 'Iraqi Dinar', symbol: 'ع.د' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
];

// Placeholder exchange rates relative to USD
export const placeholderExchangeRates: Record<string, number> = {
  USD: 1,
  EUR: 0.92, // 1 USD = 0.92 EUR (example)
  IQD: 1310, // 1 USD = 1310 IQD (example)
  JPY: 157,  // 1 USD = 157 JPY (example)
};
