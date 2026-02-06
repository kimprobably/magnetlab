import { createHash } from 'crypto';
import { createSupabaseAdminClient } from '@/lib/utils/supabase-server';
import { logError, logInfo } from '@/lib/utils/logger';

export interface MetaPixelConfig {
  pixelId: string;
  accessToken: string;
  testEventCode?: string;
}

export interface MetaConversionEvent {
  eventName: 'Lead' | 'CompleteRegistration';
  eventId: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  sourceUrl?: string;
  fbc?: string | null;       // _fbc cookie — Facebook click ID
  fbp?: string | null;       // _fbp cookie — Facebook browser ID
  externalId?: string | null; // Stable user identifier (lead UUID)
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  contentName?: string | null; // Lead magnet title
  conversionValue?: number;
  currency?: string;
  customData?: Record<string, unknown>;
}

function sha256Hash(value: string): string {
  return createHash('sha256').update(value.trim().toLowerCase()).digest('hex');
}

export async function sendMetaConversionEvent(
  config: MetaPixelConfig,
  event: MetaConversionEvent,
  userId: string,
  leadId?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createSupabaseAdminClient();
  const eventId = event.eventId;

  try {
    // Build user_data with all available signals for maximum match rate
    const userData: Record<string, unknown> = {};

    if (event.email) {
      userData.em = [sha256Hash(event.email)];
    }
    if (event.firstName) {
      userData.fn = [sha256Hash(event.firstName)];
    }
    if (event.lastName) {
      userData.ln = [sha256Hash(event.lastName)];
    }
    if (event.ipAddress) {
      userData.client_ip_address = event.ipAddress;
    }
    if (event.userAgent) {
      userData.client_user_agent = event.userAgent;
    }
    // fbc/fbp are critical for matching — pass as-is (not hashed)
    if (event.fbc) {
      userData.fbc = event.fbc;
    }
    if (event.fbp) {
      userData.fbp = event.fbp;
    }
    if (event.externalId) {
      userData.external_id = [sha256Hash(event.externalId)];
    }

    const eventData: Record<string, unknown> = {
      event_name: event.eventName,
      event_time: Math.floor(Date.now() / 1000),
      event_id: eventId,
      action_source: 'website',
      user_data: userData,
    };

    if (event.sourceUrl) {
      eventData.event_source_url = event.sourceUrl;
    }

    const customData: Record<string, unknown> = { ...event.customData };
    if (event.conversionValue && event.conversionValue > 0) {
      customData.value = event.conversionValue;
      customData.currency = event.currency || 'USD';
    }
    if (event.contentName) {
      customData.content_name = event.contentName;
    }
    // Include UTM params for attribution
    if (event.utmSource) customData.utm_source = event.utmSource;
    if (event.utmMedium) customData.utm_medium = event.utmMedium;
    if (event.utmCampaign) customData.utm_campaign = event.utmCampaign;

    if (Object.keys(customData).length > 0) {
      eventData.custom_data = customData;
    }

    const body: Record<string, unknown> = {
      data: [eventData],
    };
    if (config.testEventCode) {
      body.test_event_code = config.testEventCode;
    }

    const response = await fetch(
      `https://graph.facebook.com/v21.0/${config.pixelId}/events?access_token=${config.accessToken}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      const errorMsg = result?.error?.message || `HTTP ${response.status}`;
      await supabase.from('tracking_pixel_events').insert({
        user_id: userId,
        lead_id: leadId || null,
        provider: 'meta',
        event_name: event.eventName,
        event_id: eventId,
        status: 'failed',
        error_message: errorMsg,
      });
      logError('meta-pixel/send', new Error(errorMsg), { pixelId: config.pixelId, eventName: event.eventName });
      return { success: false, error: errorMsg };
    }

    await supabase.from('tracking_pixel_events').insert({
      user_id: userId,
      lead_id: leadId || null,
      provider: 'meta',
      event_name: event.eventName,
      event_id: eventId,
      status: 'sent',
    });

    logInfo('meta-pixel/send', 'Event sent', { pixelId: config.pixelId, eventName: event.eventName });
    return { success: true };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    await supabase.from('tracking_pixel_events').insert({
      user_id: userId,
      lead_id: leadId || null,
      provider: 'meta',
      event_name: event.eventName,
      event_id: eventId,
      status: 'failed',
      error_message: errorMsg,
    }).then(() => {});
    logError('meta-pixel/send', error, { pixelId: config.pixelId });
    return { success: false, error: errorMsg };
  }
}
