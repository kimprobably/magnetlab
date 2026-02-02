import type { Page, Route } from '@playwright/test';

// ---------------------------------------------------------------------------
// Page helpers
// ---------------------------------------------------------------------------

/** Wait until the page reaches network-idle state. */
export async function waitForPageLoad(page: Page) {
  await page.waitForLoadState('networkidle');
}

// ---------------------------------------------------------------------------
// Supabase mock helpers
// ---------------------------------------------------------------------------

export interface MockSupabaseOptions {
  /** The Supabase table name to intercept (e.g. "lead_magnets"). */
  table: string;
  /** The JSON data to return. */
  data: unknown;
  /** HTTP status code (default 200). */
  status?: number;
}

/**
 * Intercept Supabase PostgREST calls for a given table and return mock data.
 * Works for both the anon-key client and service-role server calls.
 */
export async function mockSupabaseData(page: Page, opts: MockSupabaseOptions) {
  const { table, data, status = 200 } = opts;

  await page.route(`**/rest/v1/${table}*`, (route: Route) =>
    route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify(data),
    }),
  );
}

// ---------------------------------------------------------------------------
// Stripe mock helpers
// ---------------------------------------------------------------------------

export interface MockStripeCheckoutOptions {
  /** The session URL to redirect to (default: a dummy success URL). */
  sessionUrl?: string;
}

/**
 * Intercept the app's Stripe checkout API so tests never hit real Stripe.
 */
export async function mockStripeCheckout(
  page: Page,
  opts: MockStripeCheckoutOptions = {},
) {
  const { sessionUrl = 'http://localhost:3000/settings?session_id=mock_sess' } =
    opts;

  await page.route('**/api/stripe/checkout*', (route: Route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ url: sessionUrl }),
    }),
  );

  // Also mock the Stripe portal endpoint
  await page.route('**/api/stripe/portal*', (route: Route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ url: 'http://localhost:3000/settings' }),
    }),
  );
}

// ---------------------------------------------------------------------------
// AI endpoint mock
// ---------------------------------------------------------------------------

/**
 * Intercept AI content-generation endpoints so tests don't call Claude.
 */
export async function mockAIEndpoints(page: Page) {
  // Lead magnet content generation
  await page.route('**/api/lead-magnet/content*', (route: Route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        content: mockLeadMagnetContent(),
        success: true,
      }),
    }),
  );

  // Polish endpoint
  await page.route('**/api/lead-magnet/polish*', (route: Route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        polished: 'Polished content from AI mock.',
        success: true,
      }),
    }),
  );

  // Funnel content generation
  await page.route('**/api/funnel/content*', (route: Route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        headline: 'Mock Funnel Headline',
        subheadline: 'Mock subheadline for testing',
        success: true,
      }),
    }),
  );

  // Brand kit / style extraction
  await page.route('**/api/brand-kit*', (route: Route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        brandKit: { primaryColor: '#6366f1', tone: 'professional' },
        success: true,
      }),
    }),
  );

  // Ideation endpoint
  await page.route('**/api/lead-magnet/ideation*', (route: Route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ideas: [
          { title: 'Mock Idea 1', description: 'First test idea' },
          { title: 'Mock Idea 2', description: 'Second test idea' },
        ],
        success: true,
      }),
    }),
  );
}

// ---------------------------------------------------------------------------
// NextAuth session mock
// ---------------------------------------------------------------------------

/**
 * Intercept the NextAuth session endpoint with a mock authenticated session.
 */
export async function mockAuthSession(page: Page) {
  await page.route('**/api/auth/session', (route: Route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        user: {
          id: 'test-user-id',
          name: 'Test User',
          email: 'test@magnetlab.io',
          image: null,
        },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      }),
    }),
  );
}

// ---------------------------------------------------------------------------
// Mock data factories
// ---------------------------------------------------------------------------

export function mockLeadMagnet(overrides: Record<string, unknown> = {}) {
  return {
    id: 'lm-test-001',
    user_id: 'test-user-id',
    title: 'The 5-Step LinkedIn Growth Framework',
    archetype: 'single-breakdown',
    status: 'published',
    content_blocks: [
      { type: 'introduction', content: 'Welcome to the framework.' },
      { type: 'step', content: 'Step 1: Define your ICP.' },
      { type: 'step', content: 'Step 2: Craft your hook.' },
      { type: 'step', content: 'Step 3: Build the funnel.' },
      { type: 'step', content: 'Step 4: Drive traffic.' },
      { type: 'step', content: 'Step 5: Nurture leads.' },
    ],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

export function mockFunnel(overrides: Record<string, unknown> = {}) {
  return {
    id: 'funnel-test-001',
    lead_magnet_id: 'lm-test-001',
    user_id: 'test-user-id',
    slug: 'linkedin-growth',
    username: 'testuser',
    is_published: true,
    theme: 'default',
    headline: 'Get the Free LinkedIn Growth Framework',
    subheadline: 'Learn how top creators grow on LinkedIn.',
    cta_text: 'Get Free Access',
    thank_you_headline: 'Check Your Inbox!',
    thank_you_message: 'We just sent the framework to your email.',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

export function mockLead(overrides: Record<string, unknown> = {}) {
  return {
    id: 'lead-test-001',
    funnel_page_id: 'funnel-test-001',
    email: 'lead@example.com',
    name: 'Jane Prospect',
    utm_source: 'linkedin',
    utm_medium: 'social',
    utm_campaign: 'growth-framework',
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

export function mockLeadMagnetContent() {
  return {
    title: 'The 5-Step LinkedIn Growth Framework',
    sections: [
      { heading: 'Introduction', body: 'This is the introduction.' },
      { heading: 'Step 1', body: 'Define your ideal customer profile.' },
      { heading: 'Step 2', body: 'Craft a compelling hook.' },
      { heading: 'Conclusion', body: 'Now go implement these steps.' },
    ],
  };
}

export function mockSwipeFilePost(overrides: Record<string, unknown> = {}) {
  return {
    id: 'swipe-001',
    user_id: 'test-user-id',
    title: 'High-converting LinkedIn carousel template',
    category: 'linkedin',
    content: 'This carousel template converts at 15%...',
    likes: 42,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

export function mockPolishedContent(overrides: Record<string, unknown> = {}) {
  return {
    id: 'polished-001',
    lead_magnet_id: 'lm-test-001',
    sections: [
      { heading: 'Executive Summary', body: 'A polished executive summary.' },
      { heading: 'Key Insights', body: 'Here are the polished insights.' },
    ],
    created_at: new Date().toISOString(),
    ...overrides,
  };
}
