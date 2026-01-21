// Integration exports for MagnetLab

export { BaseApiClient, type ApiClientConfig, type ApiResponse } from './base-client';

export {
  LeadSharkClient,
  getLeadSharkClient,
  type LeadSharkConfig,
  type CreateAutomationRequest,
  type SchedulePostRequest,
} from './leadshark';

export {
  NotionClient,
  getNotionOAuthUrl,
  exchangeNotionCode,
  type NotionConfig,
  type NotionPage,
  type NotionSearchResult,
} from './notion';

export {
  createCustomer,
  getCustomer,
  getOrCreateCustomer,
  createCheckoutSession,
  getSubscription,
  cancelSubscription,
  reactivateSubscription,
  changeSubscriptionPlan,
  createBillingPortalSession,
  constructWebhookEvent,
  getPlanFromPriceId,
  parseSubscriptionEvent,
  STRIPE_PRICE_IDS,
  type CreateCheckoutOptions,
  type SubscriptionWebhookData,
} from './stripe';
