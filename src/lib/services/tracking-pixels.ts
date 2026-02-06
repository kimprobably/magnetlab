import { getUserIntegration } from '@/lib/utils/encrypted-storage';
import { sendMetaConversionEvent, type MetaPixelConfig, type MetaConversionEvent } from '@/lib/integrations/meta-pixel';
import { sendLinkedInConversionEvent, type LinkedInInsightConfig, type LinkedInConversionEvent } from '@/lib/integrations/linkedin-insight';
import { logError, logInfo } from '@/lib/utils/logger';

interface TrackingPixelLeadData {
  userId: string;
  leadId: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  sourceUrl?: string;
  fbc?: string | null;         // _fbc cookie from client
  fbp?: string | null;         // _fbp cookie from client
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  leadMagnetTitle?: string | null;
}

interface TrackingPixelQualifiedData extends TrackingPixelLeadData {
  isQualified: boolean;
  qualificationAnswers?: Record<string, string> | null;
}

/**
 * Split a full name into first/last. If no space, entire name is firstName.
 */
function splitName(name: string | null | undefined): { firstName: string | null; lastName: string | null } {
  if (!name) return { firstName: null, lastName: null };
  const trimmed = name.trim();
  const spaceIdx = trimmed.indexOf(' ');
  if (spaceIdx === -1) return { firstName: trimmed, lastName: null };
  return {
    firstName: trimmed.slice(0, spaceIdx),
    lastName: trimmed.slice(spaceIdx + 1).trim() || null,
  };
}

export async function fireTrackingPixelLeadEvent(data: TrackingPixelLeadData): Promise<void> {
  const promises: Promise<unknown>[] = [];

  try {
    const { firstName, lastName } = data.lastName
      ? { firstName: data.firstName, lastName: data.lastName }
      : splitName(data.firstName);

    // Fetch Meta pixel integration
    const metaIntegration = await getUserIntegration(data.userId, 'meta_pixel').catch(() => null);
    if (metaIntegration?.is_active && metaIntegration.api_key) {
      const metadata = metaIntegration.metadata as {
        pixel_id?: string;
        enabled_events?: string[];
        default_conversion_value?: number;
        test_event_code?: string;
      };

      if (metadata?.pixel_id && (metadata.enabled_events || []).includes('Lead')) {
        const config: MetaPixelConfig = {
          pixelId: metadata.pixel_id,
          accessToken: metaIntegration.api_key,
          testEventCode: metadata.test_event_code,
        };

        const event: MetaConversionEvent = {
          eventName: 'Lead',
          eventId: data.leadId,
          email: data.email,
          firstName,
          lastName,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
          sourceUrl: data.sourceUrl,
          fbc: data.fbc,
          fbp: data.fbp,
          externalId: data.leadId,
          utmSource: data.utmSource,
          utmMedium: data.utmMedium,
          utmCampaign: data.utmCampaign,
          contentName: data.leadMagnetTitle,
          conversionValue: metadata.default_conversion_value || 0,
        };

        promises.push(
          sendMetaConversionEvent(config, event, data.userId, data.leadId)
        );
      }
    }

    // Fetch LinkedIn insight integration
    const linkedinIntegration = await getUserIntegration(data.userId, 'linkedin_insight').catch(() => null);
    if (linkedinIntegration?.is_active && linkedinIntegration.api_key) {
      const metadata = linkedinIntegration.metadata as {
        partner_id?: string;
        conversion_id?: string;
        enabled_events?: string[];
        default_conversion_value?: number;
      };

      if (metadata?.partner_id && metadata?.conversion_id && (metadata.enabled_events || []).includes('Lead')) {
        const config: LinkedInInsightConfig = {
          partnerId: metadata.partner_id,
          conversionId: metadata.conversion_id,
          accessToken: linkedinIntegration.api_key,
        };

        const event: LinkedInConversionEvent = {
          eventName: 'Lead',
          eventId: data.leadId,
          email: data.email,
          firstName,
          lastName,
          conversionValue: metadata.default_conversion_value || 0,
        };

        promises.push(
          sendLinkedInConversionEvent(config, event, data.userId, data.leadId)
        );
      }
    }

    if (promises.length > 0) {
      await Promise.allSettled(promises);
      logInfo('tracking-pixels/lead', 'Lead events fired', { userId: data.userId, leadId: data.leadId, count: promises.length });
    }
  } catch (error) {
    logError('tracking-pixels/lead', error, { userId: data.userId, leadId: data.leadId });
  }
}

export async function fireTrackingPixelQualifiedEvent(data: TrackingPixelQualifiedData): Promise<void> {
  const promises: Promise<unknown>[] = [];

  try {
    const { firstName, lastName } = data.lastName
      ? { firstName: data.firstName, lastName: data.lastName }
      : splitName(data.firstName);

    // Fetch Meta pixel integration
    const metaIntegration = await getUserIntegration(data.userId, 'meta_pixel').catch(() => null);
    if (metaIntegration?.is_active && metaIntegration.api_key) {
      const metadata = metaIntegration.metadata as {
        pixel_id?: string;
        enabled_events?: string[];
        default_conversion_value?: number;
        test_event_code?: string;
      };

      if (metadata?.pixel_id && (metadata.enabled_events || []).includes('Lead')) {
        const config: MetaPixelConfig = {
          pixelId: metadata.pixel_id,
          accessToken: metaIntegration.api_key,
          testEventCode: metadata.test_event_code,
        };

        const qualifiedMultiplier = data.isQualified ? 1.5 : 1;
        const baseValue = metadata.default_conversion_value || 0;

        const event: MetaConversionEvent = {
          eventName: 'CompleteRegistration',
          eventId: `${data.leadId}-qualified`,
          email: data.email,
          firstName,
          lastName,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
          sourceUrl: data.sourceUrl,
          fbc: data.fbc,
          fbp: data.fbp,
          externalId: data.leadId,
          utmSource: data.utmSource,
          utmMedium: data.utmMedium,
          utmCampaign: data.utmCampaign,
          contentName: data.leadMagnetTitle,
          conversionValue: baseValue > 0 ? baseValue * qualifiedMultiplier : 0,
          customData: {
            is_qualified: data.isQualified,
            qualification_answers: data.qualificationAnswers,
          },
        };

        promises.push(
          sendMetaConversionEvent(config, event, data.userId, data.leadId)
        );
      }
    }

    // Fetch LinkedIn insight integration
    const linkedinIntegration = await getUserIntegration(data.userId, 'linkedin_insight').catch(() => null);
    if (linkedinIntegration?.is_active && linkedinIntegration.api_key) {
      const metadata = linkedinIntegration.metadata as {
        partner_id?: string;
        conversion_id?: string;
        enabled_events?: string[];
        default_conversion_value?: number;
      };

      if (metadata?.partner_id && metadata?.conversion_id && (metadata.enabled_events || []).includes('Lead')) {
        const config: LinkedInInsightConfig = {
          partnerId: metadata.partner_id,
          conversionId: metadata.conversion_id,
          accessToken: linkedinIntegration.api_key,
        };

        const qualifiedMultiplier = data.isQualified ? 1.5 : 1;
        const baseValue = metadata.default_conversion_value || 0;

        const event: LinkedInConversionEvent = {
          eventName: 'Qualified',
          eventId: `${data.leadId}-qualified`,
          email: data.email,
          firstName,
          lastName,
          conversionValue: baseValue > 0 ? baseValue * qualifiedMultiplier : 0,
          customData: {
            is_qualified: data.isQualified,
          },
        };

        promises.push(
          sendLinkedInConversionEvent(config, event, data.userId, data.leadId)
        );
      }
    }

    if (promises.length > 0) {
      await Promise.allSettled(promises);
      logInfo('tracking-pixels/qualified', 'Qualified events fired', { userId: data.userId, leadId: data.leadId, count: promises.length });
    }
  } catch (error) {
    logError('tracking-pixels/qualified', error, { userId: data.userId, leadId: data.leadId });
  }
}
