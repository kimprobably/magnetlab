import { auth } from '@/lib/auth';
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/utils/supabase-server';
import { SettingsContent } from '@/components/dashboard/SettingsContent';

export const metadata = {
  title: 'Settings | MagnetLab',
  description: 'Manage your account and integrations',
};

export default async function SettingsPage() {
  const session = await auth();
  const supabase = await createSupabaseServerClient();

  // Get subscription
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', session?.user?.id)
    .single();

  // Get brand kit
  const { data: brandKit } = await supabase
    .from('brand_kits')
    .select('*')
    .eq('user_id', session?.user?.id)
    .single();

  // Get usage
  const monthYear = new Date().toISOString().slice(0, 7);
  const { data: usage } = await supabase
    .from('usage_tracking')
    .select('*')
    .eq('user_id', session?.user?.id)
    .eq('month_year', monthYear)
    .single();

  // Get integrations (use admin client to bypass RLS since we verify auth via NextAuth)
  const adminClient = createSupabaseAdminClient();
  const { data: integrations } = await adminClient
    .from('user_integrations')
    .select('service, is_active, last_verified_at')
    .eq('user_id', session?.user?.id);

  // Get username
  const { data: userData } = await supabase
    .from('users')
    .select('username')
    .eq('id', session?.user?.id)
    .single();

  return (
    <SettingsContent
      user={session?.user || null}
      username={userData?.username || null}
      subscription={subscription}
      brandKit={brandKit}
      usage={usage}
      integrations={integrations || []}
    />
  );
}
