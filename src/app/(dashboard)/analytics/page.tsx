import { auth } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/utils/supabase-server';
import { BarChart3, Users, MessageCircle, TrendingUp } from 'lucide-react';

export const metadata = {
  title: 'Analytics | MagnetLab',
  description: 'Track your lead magnet performance',
};

export default async function AnalyticsPage() {
  const session = await auth();
  const supabase = await createSupabaseServerClient();

  // Get stats
  const { data: leadMagnets } = await supabase
    .from('lead_magnets')
    .select('id, status')
    .eq('user_id', session?.user?.id);

  const { data: analytics } = await supabase
    .from('lead_magnet_analytics')
    .select('id, lead_magnet_id, linkedin_views, linkedin_likes, linkedin_comments, linkedin_shares, dms_sent, leads_captured, captured_at')
    .in(
      'lead_magnet_id',
      (leadMagnets || []).map((lm) => lm.id)
    );

  const totalLeadMagnets = leadMagnets?.length || 0;
  const publishedCount = leadMagnets?.filter((lm) => lm.status === 'published').length || 0;

  const totalViews = analytics?.reduce((sum, a) => sum + (a.linkedin_views || 0), 0) || 0;
  const totalEngagement =
    analytics?.reduce(
      (sum, a) =>
        sum + (a.linkedin_likes || 0) + (a.linkedin_comments || 0) + (a.linkedin_shares || 0),
      0
    ) || 0;
  const totalDMs = analytics?.reduce((sum, a) => sum + (a.dms_sent || 0), 0) || 0;
  const totalLeads = analytics?.reduce((sum, a) => sum + (a.leads_captured || 0), 0) || 0;

  const stats = [
    {
      label: 'Lead Magnets',
      value: totalLeadMagnets,
      subtext: `${publishedCount} published`,
      icon: BarChart3,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
    },
    {
      label: 'Total Views',
      value: totalViews.toLocaleString(),
      subtext: 'LinkedIn impressions',
      icon: TrendingUp,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      label: 'Engagement',
      value: totalEngagement.toLocaleString(),
      subtext: 'Likes, comments, shares',
      icon: MessageCircle,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    {
      label: 'Leads Captured',
      value: totalLeads.toLocaleString(),
      subtext: `${totalDMs} DMs sent`,
      icon: Users,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
    },
  ];

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Analytics</h1>
        <p className="mt-1 text-muted-foreground">
          Track the performance of your lead magnets
        </p>
      </div>

      {/* Stats Grid */}
      <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border bg-card p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="mt-1 text-3xl font-bold">{stat.value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{stat.subtext}</p>
              </div>
              <div className={`rounded-full p-3 ${stat.bgColor}`}>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty state for detailed analytics */}
      {totalLeadMagnets === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center">
          <BarChart3 className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="mb-2 text-xl font-semibold">No analytics yet</h3>
          <p className="text-muted-foreground">
            Create and publish lead magnets to start tracking performance.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold">Performance Over Time</h2>
          <div className="flex h-64 items-center justify-center text-muted-foreground">
            <p>Detailed analytics charts coming soon...</p>
          </div>
        </div>
      )}
    </div>
  );
}
