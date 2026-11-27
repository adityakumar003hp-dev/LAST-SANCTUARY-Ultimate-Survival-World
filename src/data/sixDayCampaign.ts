/**
 * Compatibility bridge for older imports. The active campaign is the canonical
 * 12-day / 96-mission LAST SANCTUARY: REBIRTH catalogue.
 */
import {
  LAST_SANCTUARY_CAMPAIGN,
  CAMPAIGN_TITLE,
  CAMPAIGN_DAY_COUNT,
  CAMPAIGN_EVENTS_PER_DAY,
  CAMPAIGN_EVENT_COUNT,
  validateCampaign,
  type CampaignLocation,
} from './lastSanctuaryCampaign';

export type SixDayMission = {
  id: string;
  day: number;
  title: string;
  summary: string;
  objectives: string[];
  location: CampaignLocation;
  railwayRequired: boolean;
  unlockAfter?: string;
};

export const SIX_DAY_CAMPAIGN_TITLE = CAMPAIGN_TITLE;
export const SIX_DAY_CAMPAIGN_TAGLINE = 'Twelve days. Four friends. One world to save.';
export const SIX_DAY_CAMPAIGN: SixDayMission[] = LAST_SANCTUARY_CAMPAIGN.map((event) => ({
  id: event.id,
  day: event.day,
  title: event.title,
  summary: event.summary,
  objectives: event.objectives,
  location: event.location,
  railwayRequired: event.railwayControl === 'AI-only',
  unlockAfter: event.unlocksAfter ?? undefined,
}));
export const SIX_DAY_CAMPAIGN_TOTAL_DAYS = CAMPAIGN_DAY_COUNT;
export const SIX_DAY_CAMPAIGN_MISSIONS_PER_DAY = CAMPAIGN_EVENTS_PER_DAY;
export const SIX_DAY_CAMPAIGN_TOTAL_MISSIONS = CAMPAIGN_EVENT_COUNT;
export const validateSixDayCampaign = validateCampaign;
