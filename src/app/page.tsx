
import { redirect } from 'next/navigation';

export default function RootPage() {
  // Redirect to the default locale's root.
  // The middleware will then handle the rest.
  redirect('/en');
}
