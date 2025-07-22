
import { redirect } from 'next/navigation';

// This page only redirects to the dashboard for the selected locale.
export default function LocaleRootPage() {
  redirect('/dashboard');
}
