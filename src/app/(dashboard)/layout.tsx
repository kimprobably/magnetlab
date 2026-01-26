import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { DashboardNav } from '@/components/dashboard/DashboardNav';
import { createSupabaseAdminClient } from '@/lib/utils/supabase-server';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  // Check if email is verified
  const supabase = createSupabaseAdminClient();
  const { data: user } = await supabase
    .from('users')
    .select('email_verified_at')
    .eq('id', session.user.id)
    .single();

  if (!user?.email_verified_at) {
    redirect('/verification-pending');
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardNav user={session.user} />
      <main>{children}</main>
    </div>
  );
}
