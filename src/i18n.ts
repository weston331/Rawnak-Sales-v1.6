import {getRequestConfig} from 'next-intl/server';
import {notFound} from 'next/navigation';

// Using static imports to avoid issues with dynamic imports in some environments.
import enMessages from './messages/en.json';
import arMessages from './messages/ar.json';

const locales = ['en', 'ar'];

const allMessages: Record<string, any> = {
  en: enMessages,
  ar: arMessages
};

export default getRequestConfig(async ({locale}) => {
  // Validate that the incoming `locale` parameter is valid
  if (!locales.includes(locale as any)) {
    notFound();
  }

  return {
    locale, // This was missing
    messages: allMessages[locale]
  };
});
