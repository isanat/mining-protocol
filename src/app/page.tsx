import { redirect } from 'next/navigation';
import { routing } from '@/i18n/routing';

// Redirect root to default locale landing page
export default function RootPage() {
  redirect(`/${routing.defaultLocale}`);
}
