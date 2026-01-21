// Integration Types for MagnetLab

// ============================================
// LEADSHARK TYPES
// ============================================

export interface LeadSharkAutomation {
  id: string;
  name: string;
  post_id: string;
  linkedin_post_url: string;
  keywords: string[];
  dm_template: string;
  auto_connect: boolean;
  auto_like: boolean;
  comment_reply_template?: string;
  non_first_degree_reply_template?: string;
  enable_follow_up: boolean;
  follow_up_template?: string;
  follow_up_delay_minutes?: number;
  status: 'Draft' | 'Running' | 'Paused';
  leads_captured?: number;
  created_at: string;
  updated_at: string;
}

export interface LeadSharkScheduledPost {
  id: string;
  content: string;
  scheduled_time: string;
  is_public: boolean;
  automation?: Partial<LeadSharkAutomation>;
  status: 'scheduled' | 'published' | 'failed';
  created_at: string;
}

export interface LeadSharkEnrichmentResult {
  linkedin_url: string;
  first_name: string;
  last_name: string;
  headline: string;
  location: string;
  profile_picture_url?: string;
  experience: Array<{
    title: string;
    company: string;
    start_date: string;
    end_date?: string;
    is_current: boolean;
  }>;
  education: Array<{
    school: string;
    degree?: string;
    field_of_study?: string;
  }>;
  skills: string[];
}

// ============================================
// NOTION TYPES
// ============================================

export interface NotionConnection {
  id: string;
  userId: string;
  accessToken: string;
  workspaceId: string | null;
  workspaceName: string | null;
  workspaceIcon: string | null;
  botId: string | null;
  defaultParentPageId: string | null;
  defaultParentPageName: string | null;
  tokenExpiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NotionPage {
  id: string;
  title: string;
  icon?: string;
  url: string;
  parentId?: string;
}

export interface NotionPublishRequest {
  title: string;
  content: ExtractedContentForNotion;
  parentPageId?: string;
  icon?: string;
}

export interface ExtractedContentForNotion {
  title: string;
  format: string;
  structure: Array<{
    sectionName: string;
    contents: string[];
  }>;
  nonObviousInsight: string;
  personalExperience: string;
  proof: string;
  commonMistakes: string[];
  differentiation: string;
}

// ============================================
// STRIPE TYPES
// ============================================

export type SubscriptionPlan = 'free' | 'pro' | 'unlimited';
export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'trialing';

export interface Subscription {
  id: string;
  userId: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PricingPlan {
  id: SubscriptionPlan;
  name: string;
  price: number;
  priceId: string | null;
  features: string[];
  limits: {
    leadMagnets: number;
    scheduling: boolean;
    automation: boolean;
    analytics: boolean;
  };
}

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    priceId: null,
    features: [
      '2 lead magnets per month',
      'Basic AI generation',
      'Notion publishing',
      'Community support',
    ],
    limits: {
      leadMagnets: 2,
      scheduling: false,
      automation: false,
      analytics: false,
    },
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 49,
    priceId: process.env.STRIPE_PRO_PRICE_ID || null,
    features: [
      '15 lead magnets per month',
      'Advanced AI with variations',
      'LinkedIn scheduling',
      'Basic automation',
      'Thumbnail generation',
      'Email support',
    ],
    limits: {
      leadMagnets: 15,
      scheduling: true,
      automation: true,
      analytics: true,
    },
  },
  {
    id: 'unlimited',
    name: 'Unlimited',
    price: 149,
    priceId: process.env.STRIPE_UNLIMITED_PRICE_ID || null,
    features: [
      'Unlimited lead magnets',
      'Premium AI (Opus 4.5)',
      'Advanced automation',
      'Priority scheduling',
      'Advanced analytics',
      'Priority support',
      'Custom brand kit',
    ],
    limits: {
      leadMagnets: 999999,
      scheduling: true,
      automation: true,
      analytics: true,
    },
  },
];

// ============================================
// USAGE TRACKING
// ============================================

export interface UsageTracking {
  id: string;
  userId: string;
  monthYear: string;
  leadMagnetsCreated: number;
  postsScheduled: number;
  createdAt: string;
  updatedAt: string;
}
