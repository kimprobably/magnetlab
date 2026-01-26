/**
 * Funnel types for opt-in and thank-you page generator
 */

// Funnel page configuration stored in database
export interface FunnelPage {
  id: string;
  leadMagnetId: string;
  userId: string;
  slug: string;

  // Opt-in page config
  optinHeadline: string;
  optinSubline: string | null;
  optinButtonText: string;
  optinTrustText: string;
  optinEnabled: boolean;

  // Thank-you page config
  thankyouHeadline: string;
  thankyouSubline: string | null;
  vslEmbedUrl: string | null;
  calendlyUrl: string | null;
  rejectionMessage: string;
  thankyouEnabled: boolean;

  // Metadata
  published: boolean;
  createdAt: string;
  updatedAt: string;

  // Relations (populated when needed)
  qualificationQuestions?: QualificationQuestion[];
  leadMagnet?: {
    id: string;
    title: string;
    archetype: string;
    concept?: {
      hook?: string;
      painPoint?: string;
    };
  };
  user?: {
    id: string;
    username: string;
  };
}

// Database column name mapping (snake_case to camelCase)
export interface FunnelPageRow {
  id: string;
  lead_magnet_id: string;
  user_id: string;
  slug: string;
  optin_headline: string;
  optin_subline: string | null;
  optin_button_text: string;
  optin_trust_text: string;
  optin_enabled: boolean;
  thankyou_headline: string;
  thankyou_subline: string | null;
  vsl_embed_url: string | null;
  calendly_url: string | null;
  rejection_message: string;
  thankyou_enabled: boolean;
  published: boolean;
  created_at: string;
  updated_at: string;
}

// Qualification question for thank-you page
export interface QualificationQuestion {
  id: string;
  funnelPageId: string;
  questionText: string;
  qualifyingAnswer: boolean; // true = "Yes" qualifies, false = "No" qualifies
  displayOrder: number;
  createdAt: string;
}

export interface QualificationQuestionRow {
  id: string;
  funnel_page_id: string;
  question_text: string;
  qualifying_answer: boolean;
  display_order: number;
  created_at: string;
}

// Lead captured from opt-in form
export interface Lead {
  id: string;
  funnelPageId: string;
  userId: string;
  email: string;
  name: string | null;
  qualified: boolean | null;
  qualificationAnswers: Record<string, boolean> | null;
  sourceUrl: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;

  // Relations
  funnelPage?: FunnelPage;
}

export interface LeadRow {
  id: string;
  funnel_page_id: string;
  user_id: string;
  email: string;
  name: string | null;
  qualified: boolean | null;
  qualification_answers: Record<string, boolean> | null;
  source_url: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

// Webhook configuration for lead export
export interface LeadWebhook {
  id: string;
  userId: string;
  name: string;
  webhookUrl: string;
  enabled: boolean;
  lastTriggeredAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LeadWebhookRow {
  id: string;
  user_id: string;
  name: string;
  webhook_url: string;
  enabled: boolean;
  last_triggered_at: string | null;
  created_at: string;
  updated_at: string;
}

// API request/response types
export interface CreateFunnelPageRequest {
  leadMagnetId: string;
  slug?: string;
  optinHeadline: string;
  optinSubline?: string;
  optinButtonText?: string;
  optinTrustText?: string;
  thankyouHeadline?: string;
  thankyouSubline?: string;
  vslEmbedUrl?: string;
  calendlyUrl?: string;
  rejectionMessage?: string;
  qualificationQuestions?: Array<{
    questionText: string;
    qualifyingAnswer: boolean;
    displayOrder: number;
  }>;
}

export interface UpdateFunnelPageRequest {
  slug?: string;
  optinHeadline?: string;
  optinSubline?: string;
  optinButtonText?: string;
  optinTrustText?: string;
  optinEnabled?: boolean;
  thankyouHeadline?: string;
  thankyouSubline?: string;
  vslEmbedUrl?: string;
  calendlyUrl?: string;
  rejectionMessage?: string;
  thankyouEnabled?: boolean;
  published?: boolean;
  qualificationQuestions?: Array<{
    id?: string;
    questionText: string;
    qualifyingAnswer: boolean;
    displayOrder: number;
  }>;
}

export interface CaptureLeadRequest {
  email: string;
  name?: string;
}

export interface SubmitQualificationRequest {
  answers: Record<string, boolean>;
}

export interface GenerateFunnelContentRequest {
  leadMagnetId: string;
}

export interface GenerateFunnelContentResponse {
  optinHeadline: string;
  optinSubline: string;
  optinButtonText: string;
  thankyouHeadline: string;
  thankyouSubline: string;
  suggestedQuestions: Array<{
    questionText: string;
    qualifyingAnswer: boolean;
  }>;
}

// Webhook payload sent when a lead is captured
export interface LeadWebhookPayload {
  event: 'lead.captured' | 'lead.qualified';
  timestamp: string;
  lead: {
    email: string;
    name: string | null;
    qualified: boolean | null;
    qualificationAnswers: Record<string, boolean> | null;
  };
  funnelPage: {
    id: string;
    slug: string;
  };
  leadMagnet: {
    id: string;
    title: string;
  };
}

// Helper functions to convert between row and interface formats
export function funnelPageFromRow(row: FunnelPageRow): FunnelPage {
  return {
    id: row.id,
    leadMagnetId: row.lead_magnet_id,
    userId: row.user_id,
    slug: row.slug,
    optinHeadline: row.optin_headline,
    optinSubline: row.optin_subline,
    optinButtonText: row.optin_button_text,
    optinTrustText: row.optin_trust_text,
    optinEnabled: row.optin_enabled,
    thankyouHeadline: row.thankyou_headline,
    thankyouSubline: row.thankyou_subline,
    vslEmbedUrl: row.vsl_embed_url,
    calendlyUrl: row.calendly_url,
    rejectionMessage: row.rejection_message,
    thankyouEnabled: row.thankyou_enabled,
    published: row.published,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function qualificationQuestionFromRow(
  row: QualificationQuestionRow
): QualificationQuestion {
  return {
    id: row.id,
    funnelPageId: row.funnel_page_id,
    questionText: row.question_text,
    qualifyingAnswer: row.qualifying_answer,
    displayOrder: row.display_order,
    createdAt: row.created_at,
  };
}

export function leadFromRow(row: LeadRow): Lead {
  return {
    id: row.id,
    funnelPageId: row.funnel_page_id,
    userId: row.user_id,
    email: row.email,
    name: row.name,
    qualified: row.qualified,
    qualificationAnswers: row.qualification_answers,
    sourceUrl: row.source_url,
    ipAddress: row.ip_address,
    userAgent: row.user_agent,
    createdAt: row.created_at,
  };
}

export function leadWebhookFromRow(row: LeadWebhookRow): LeadWebhook {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    webhookUrl: row.webhook_url,
    enabled: row.enabled,
    lastTriggeredAt: row.last_triggered_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Video embed URL parsing utilities
export type VideoProvider = 'youtube' | 'loom' | 'vimeo' | 'wistia' | 'unknown';

export interface ParsedVideoUrl {
  provider: VideoProvider;
  videoId: string | null;
  embedUrl: string | null;
}

export function parseVideoUrl(url: string): ParsedVideoUrl {
  if (!url) {
    return { provider: 'unknown', videoId: null, embedUrl: null };
  }

  // YouTube
  const youtubeMatch = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  if (youtubeMatch) {
    return {
      provider: 'youtube',
      videoId: youtubeMatch[1],
      embedUrl: `https://www.youtube.com/embed/${youtubeMatch[1]}`,
    };
  }

  // Loom
  const loomMatch = url.match(/loom\.com\/(?:share|embed)\/([a-zA-Z0-9]+)/);
  if (loomMatch) {
    return {
      provider: 'loom',
      videoId: loomMatch[1],
      embedUrl: `https://www.loom.com/embed/${loomMatch[1]}`,
    };
  }

  // Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeoMatch) {
    return {
      provider: 'vimeo',
      videoId: vimeoMatch[1],
      embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}`,
    };
  }

  // Wistia
  const wistiaMatch = url.match(/wistia\.com\/(?:medias|embed)\/([a-zA-Z0-9]+)/);
  if (wistiaMatch) {
    return {
      provider: 'wistia',
      videoId: wistiaMatch[1],
      embedUrl: `https://fast.wistia.net/embed/iframe/${wistiaMatch[1]}`,
    };
  }

  return { provider: 'unknown', videoId: null, embedUrl: url };
}
