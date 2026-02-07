-- Performance indexes for magnetlab Supabase project
-- Applied: 2026-02-08

CREATE INDEX IF NOT EXISTS idx_lead_magnets_user_status ON lead_magnets(user_id, status);
CREATE INDEX IF NOT EXISTS idx_funnel_leads_funnel_page_id ON funnel_leads(funnel_page_id);
CREATE INDEX IF NOT EXISTS idx_funnel_leads_user_id ON funnel_leads(user_id);
CREATE INDEX IF NOT EXISTS idx_funnel_leads_created_at ON funnel_leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_sub_id ON subscriptions(stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;
