import { redirect } from 'next/navigation';

// Redirect old /pages route to new /assets route
export default function PagesRedirect() {
  redirect('/assets');
}
