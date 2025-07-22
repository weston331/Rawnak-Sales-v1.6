
import { redirect } from 'next/navigation';

/**
 * This component only exists to redirect to the correct internationalized route.
 * The `next-intl` middleware will intercept this and add the default locale.
 * The actual page content is in /src/app/[locale]/customers/[id]/page.tsx
 */
export default function CustomerDetailRedirectPage({ params }: { params: { id: string } }) {
  // The middleware will add the locale prefix.
  redirect(`/customers/${params.id}`);
}
