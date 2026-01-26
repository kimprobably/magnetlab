import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/utils/supabase-server';
import { LeadsTable } from '@/components/funnel/LeadsTable';

export const metadata: Metadata = {
  title: 'Leads | MagnetLab',
  description: 'Manage your captured leads',
};

export default async function LeadsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const supabase = await createSupabaseServerClient();

  // Get initial leads
  const { data: leads } = await supabase
    .from('leads')
    .select(
      `
      id,
      email,
      name,
      qualified,
      qualification_answers,
      created_at,
      funnel_pages!inner (
        id,
        slug,
        optin_headline,
        lead_magnets!inner (
          id,
          title
        )
      )
    `
    )
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false })
    .limit(50);

  // Get total count
  const { count } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', session.user.id);

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Leads</h1>
        <p className="mt-1 text-muted-foreground">
          Manage and export leads captured from your funnel pages
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-card rounded-lg border border-border p-4">
          <p className="text-sm text-muted-foreground">Total Leads</p>
          <p className="text-2xl font-semibold text-foreground">{count || 0}</p>
        </div>
        <div className="bg-card rounded-lg border border-border p-4">
          <p className="text-sm text-muted-foreground">Qualified</p>
          <p className="text-2xl font-semibold text-foreground">
            {leads?.filter((l) => l.qualified === true).length || 0}
          </p>
        </div>
        <div className="bg-card rounded-lg border border-border p-4">
          <p className="text-sm text-muted-foreground">Pending Qualification</p>
          <p className="text-2xl font-semibold text-foreground">
            {leads?.filter((l) => l.qualified === null).length || 0}
          </p>
        </div>
      </div>

      <LeadsTable initialLeads={leads || []} />
    </div>
  );
}
