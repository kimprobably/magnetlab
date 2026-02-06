-- Add user_agent to funnel_leads for server-side conversion tracking
ALTER TABLE funnel_leads ADD COLUMN IF NOT EXISTS user_agent TEXT;

-- Event log for tracking pixel fires (Meta CAPI, LinkedIn CAPI)
CREATE TABLE IF NOT EXISTS tracking_pixel_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES funnel_leads(id) ON DELETE SET NULL,
  provider TEXT NOT NULL,        -- 'meta' | 'linkedin'
  event_name TEXT NOT NULL,      -- 'Lead' | 'PageView' | 'Qualified'
  event_id TEXT,                 -- UUID for deduplication
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'sent' | 'failed'
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for querying events by user
CREATE INDEX IF NOT EXISTS idx_tracking_pixel_events_user_id ON tracking_pixel_events(user_id);

-- Index for querying events by lead
CREATE INDEX IF NOT EXISTS idx_tracking_pixel_events_lead_id ON tracking_pixel_events(lead_id);

-- RLS policies
ALTER TABLE tracking_pixel_events ENABLE ROW LEVEL SECURITY;

-- Users can view their own tracking events
CREATE POLICY "Users can view own tracking events"
  ON tracking_pixel_events FOR SELECT
  USING (user_id = auth.uid());

-- Service role can insert (server-side only)
CREATE POLICY "Service role can insert tracking events"
  ON tracking_pixel_events FOR INSERT
  WITH CHECK (TRUE);
