-- Migration: Add funnel pages feature for opt-in and thank-you pages
-- This enables users to create hosted landing pages for their lead magnets

-- Funnel pages configuration (one-to-one with lead_magnets)
CREATE TABLE funnel_pages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_magnet_id UUID REFERENCES lead_magnets(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  slug VARCHAR(100) NOT NULL,

  -- Opt-in page config
  optin_headline TEXT NOT NULL,
  optin_subline TEXT,
  optin_button_text VARCHAR(100) DEFAULT 'Get Instant Access',
  optin_trust_text VARCHAR(200) DEFAULT 'No spam. Unsubscribe anytime.',
  optin_enabled BOOLEAN DEFAULT true,

  -- Thank-you page config
  thankyou_headline TEXT DEFAULT 'You''re In! Check Your Email',
  thankyou_subline TEXT,
  vsl_embed_url TEXT, -- YouTube/Loom URL
  calendly_url TEXT,
  rejection_message TEXT DEFAULT 'Thanks for your interest! Our 1:1 calls are best suited for established businesses. Check out our free resources to get started.',
  thankyou_enabled BOOLEAN DEFAULT true,

  -- Metadata
  published BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, slug)
);

-- Index for faster lookups
CREATE INDEX idx_funnel_pages_user_id ON funnel_pages(user_id);
CREATE INDEX idx_funnel_pages_lead_magnet_id ON funnel_pages(lead_magnet_id);
CREATE INDEX idx_funnel_pages_slug ON funnel_pages(slug);

-- Qualification questions for thank-you pages
CREATE TABLE qualification_questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  funnel_page_id UUID REFERENCES funnel_pages(id) ON DELETE CASCADE NOT NULL,
  question_text TEXT NOT NULL,
  qualifying_answer BOOLEAN NOT NULL, -- true = "Yes" qualifies, false = "No" qualifies
  display_order INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for ordering
CREATE INDEX idx_qualification_questions_funnel_id ON qualification_questions(funnel_page_id);

-- Captured leads from opt-in submissions
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  funnel_page_id UUID REFERENCES funnel_pages(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL, -- page owner
  email VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  qualified BOOLEAN, -- null if questions not answered, true/false after
  qualification_answers JSONB, -- {questionId: answer}
  source_url TEXT,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Prevent duplicate submissions per funnel
  UNIQUE(funnel_page_id, email)
);

-- Indexes for leads
CREATE INDEX idx_leads_user_id ON leads(user_id);
CREATE INDEX idx_leads_funnel_page_id ON leads(funnel_page_id);
CREATE INDEX idx_leads_created_at ON leads(created_at);

-- Webhook configurations for lead export
CREATE TABLE lead_webhooks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(100) NOT NULL,
  webhook_url TEXT NOT NULL,
  enabled BOOLEAN DEFAULT true,
  last_triggered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for webhooks
CREATE INDEX idx_lead_webhooks_user_id ON lead_webhooks(user_id);

-- Add updated_at trigger for funnel_pages
CREATE TRIGGER update_funnel_pages_updated_at
  BEFORE UPDATE ON funnel_pages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add updated_at trigger for lead_webhooks
CREATE TRIGGER update_lead_webhooks_updated_at
  BEFORE UPDATE ON lead_webhooks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies for funnel_pages
ALTER TABLE funnel_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own funnel pages"
  ON funnel_pages FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own funnel pages"
  ON funnel_pages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own funnel pages"
  ON funnel_pages FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own funnel pages"
  ON funnel_pages FOR DELETE
  USING (auth.uid() = user_id);

-- Public read for published pages (for public opt-in pages)
CREATE POLICY "Anyone can view published funnel pages"
  ON funnel_pages FOR SELECT
  USING (published = true);

-- RLS Policies for qualification_questions
ALTER TABLE qualification_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage questions for their funnel pages"
  ON qualification_questions FOR ALL
  USING (
    funnel_page_id IN (
      SELECT id FROM funnel_pages WHERE user_id = auth.uid()
    )
  );

-- Public read for published funnel questions
CREATE POLICY "Anyone can view questions for published funnels"
  ON qualification_questions FOR SELECT
  USING (
    funnel_page_id IN (
      SELECT id FROM funnel_pages WHERE published = true
    )
  );

-- RLS Policies for leads
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own leads"
  ON leads FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Anyone can insert leads"
  ON leads FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can delete their own leads"
  ON leads FOR DELETE
  USING (user_id = auth.uid());

-- RLS Policies for lead_webhooks
ALTER TABLE lead_webhooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own webhooks"
  ON lead_webhooks FOR ALL
  USING (user_id = auth.uid());

-- Add username column to users table for URL structure
ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(50) UNIQUE;

-- Create index for username lookups
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Function to auto-generate username from email
CREATE OR REPLACE FUNCTION generate_username_from_email(email_address TEXT)
RETURNS TEXT AS $$
DECLARE
  base_username TEXT;
  final_username TEXT;
  counter INTEGER := 0;
BEGIN
  -- Extract part before @ and clean it
  base_username := LOWER(REGEXP_REPLACE(SPLIT_PART(email_address, '@', 1), '[^a-z0-9]', '', 'g'));

  -- Ensure minimum length
  IF LENGTH(base_username) < 3 THEN
    base_username := base_username || 'user';
  END IF;

  -- Truncate if too long
  base_username := LEFT(base_username, 40);

  final_username := base_username;

  -- Check for uniqueness and add number if needed
  WHILE EXISTS (SELECT 1 FROM users WHERE username = final_username) LOOP
    counter := counter + 1;
    final_username := base_username || counter::TEXT;
  END LOOP;

  RETURN final_username;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate username on user creation
CREATE OR REPLACE FUNCTION set_default_username()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.username IS NULL THEN
    NEW.username := generate_username_from_email(NEW.email);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_default_username
  BEFORE INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION set_default_username();

-- Update existing users without usernames
UPDATE users
SET username = generate_username_from_email(email)
WHERE username IS NULL;
