import { createHash } from 'crypto';
import { createSupabaseAdminClient } from '@/lib/utils/supabase-server';
import { logError, logInfo } from '@/lib/utils/logger';

export interface LinkedInInsightConfig {
  partnerId: string;
  conversionId: string;
  accessToken: string;
}

export interface LinkedInConversionEvent {
  eventName: 'Lead' | 'Qualified';
  eventId: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  companyName?: string | null;
  title?: string | null;
  countryCode?: string | null;
  conversionValue?: number;
  currency?: string;
  customData?: Record<string, unknown>;
}

function sha256Hash(value: string): string {
  return createHash('sha256').update(value.trim().toLowerCase()).digest('hex');
}

export async function sendLinkedInConversionEvent(
  config: LinkedInInsightConfig,
  event: LinkedInConversionEvent,
  userId: string,
  leadId?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createSupabaseAdminClient();
  const eventId = event.eventId;

  try {
    // Build user identifiers — SHA256 email is required, add all available info
    const userIds: { idType: string; idValue: string }[] = [
      { idType: 'SHA256_EMAIL', idValue: sha256Hash(event.email) },
    ];

    // Build userInfo with available PII for better matching
    const userInfo: Record<string, string> = {};
    if (event.firstName) userInfo.firstName = event.firstName;
    if (event.lastName) userInfo.lastName = event.lastName;
    if (event.companyName) userInfo.companyName = event.companyName;
    if (event.title) userInfo.title = event.title;
    if (event.countryCode) userInfo.countryCode = event.countryCode;

    const user: Record<string, unknown> = { userIds };
    if (Object.keys(userInfo).length > 0) {
      user.userInfo = userInfo;
    }

    const conversionEvent: Record<string, unknown> = {
      conversion: `urn:lla:llaPartnerConversion:${config.conversionId}`,
      conversionHappenedAt: Date.now(),
      eventId,
      user,
    };

    if (event.conversionValue && event.conversionValue > 0) {
      conversionEvent.conversionValue = {
        currencyCode: event.currency || 'USD',
        amount: String(event.conversionValue),
      };
    }

    const response = await fetch('https://api.linkedin.com/rest/conversionEvents', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.accessToken}`,
        'LinkedIn-Version': '202409',
        'X-Restli-Protocol-Version': '2.0.0',
      },
      body: JSON.stringify({
        elements: [conversionEvent],
      }),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      const errorMsg = `HTTP ${response.status}: ${text.slice(0, 200)}`;
      await supabase.from('tracking_pixel_events').insert({
        user_id: userId,
        lead_id: leadId || null,
        provider: 'linkedin',
        event_name: event.eventName,
        event_id: eventId,
        status: 'failed',
        error_message: errorMsg,
      });
      logError('linkedin-insight/send', new Error(errorMsg), { conversionId: config.conversionId });
      return { success: false, error: errorMsg };
    }

    await supabase.from('tracking_pixel_events').insert({
      user_id: userId,
      lead_id: leadId || null,
      provider: 'linkedin',
      event_name: event.eventName,
      event_id: eventId,
      status: 'sent',
    });

    logInfo('linkedin-insight/send', 'Event sent', { conversionId: config.conversionId, eventName: event.eventName });
    return { success: true };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    await supabase.from('tracking_pixel_events').insert({
      user_id: userId,
      lead_id: leadId || null,
      provider: 'linkedin',
      event_name: event.eventName,
      event_id: eventId,
      status: 'failed',
      error_message: errorMsg,
    }).then(() => {});
    logError('linkedin-insight/send', error, { conversionId: config.conversionId });
    return { success: false, error: errorMsg };
  }
}
