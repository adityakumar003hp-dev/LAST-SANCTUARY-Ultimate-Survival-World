/**
 * Compatibility bridge for older imports. The canonical campaign is the
 * 12-day / 96-mission LAST SANCTUARY: REBIRTH catalogue.
 */
import { LAST_SANCTUARY_CAMPAIGN, CAMPAIGN_DAY_COUNT, CAMPAIGN_EVENT_COUNT, CampaignLocation } from './lastSanctuaryCampaign';

export type EightDayLocation = CampaignLocation;
export type EightDayMission = {
  id: string;
  day: number;
  title: string;
  summary: string;
  objectives: string[];
  location: EightDayLocation;
  railwayRequired: boolean;
  unlockAfter?: string;
};

export const TWELVE_DAY_CAMPAIGN_TITLE = 'LAST SANCTUARY: REBIRTH';
export const TWELVE_DAY_CAMPAIGN_TAGLINE = 'Twelve days to rebuild humanity. Infinite exploration beyond Mission 96.';
export const TWELVE_DAY_CAMPAIGN: EightDayMission[] = LAST_SANCTUARY_CAMPAIGN.map((event) => ({
  id: event.id,
  day: event.day,
  title: event.title,
  summary: event.summary,
  objectives: event.objectives,
  location: event.location,
  railwayRequired: event.railwayControl === 'AI-only',
  unlockAfter: event.unlocksAfter ?? undefined,
}));
export const TWELVE_DAY_CAMPAIGN_TOTAL_DAYS = CAMPAIGN_DAY_COUNT;
export const TWELVE_DAY_CAMPAIGN_MISSIONS_PER_DAY = 8;
export const TWELVE_DAY_CAMPAIGN_TOTAL_MISSIONS = CAMPAIGN_EVENT_COUNT;

/** Legacy export names remain available to avoid breaking older integrations. */
export const TEN_DAY_CAMPAIGN_TITLE = TWELVE_DAY_CAMPAIGN_TITLE;
export const TEN_DAY_CAMPAIGN_TAGLINE = TWELVE_DAY_CAMPAIGN_TAGLINE;
export const TEN_DAY_CAMPAIGN = TWELVE_DAY_CAMPAIGN;
export const TEN_DAY_CAMPAIGN_TOTAL_DAYS = TWELVE_DAY_CAMPAIGN_TOTAL_DAYS;
export const TEN_DAY_CAMPAIGN_MISSIONS_PER_DAY = TWELVE_DAY_CAMPAIGN_MISSIONS_PER_DAY;
export const TEN_DAY_CAMPAIGN_TOTAL_MISSIONS = TWELVE_DAY_CAMPAIGN_TOTAL_MISSIONS;
export const EIGHT_DAY_CAMPAIGN_TITLE = TWELVE_DAY_CAMPAIGN_TITLE;
export const EIGHT_DAY_CAMPAIGN_TAGLINE = TWELVE_DAY_CAMPAIGN_TAGLINE;
export const EIGHT_DAY_CAMPAIGN = TWELVE_DAY_CAMPAIGN;
export const EIGHT_DAY_CAMPAIGN_TOTAL_DAYS = TWELVE_DAY_CAMPAIGN_TOTAL_DAYS;
export const EIGHT_DAY_CAMPAIGN_MISSIONS_PER_DAY = TWELVE_DAY_CAMPAIGN_MISSIONS_PER_DAY;
export const EIGHT_DAY_CAMPAIGN_TOTAL_MISSIONS = TWELVE_DAY_CAMPAIGN_TOTAL_MISSIONS;

export function validateTwelveDayCampaign(): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  for (const mission of TWELVE_DAY_CAMPAIGN) {
    if (ids.has(mission.id)) errors.push(`Duplicate mission id: ${mission.id}`);
    ids.add(mission.id);
    if (!mission.objectives.length) errors.push(`Mission has no objectives: ${mission.id}`);
    if (mission.day < 1 || mission.day > 12) errors.push(`Invalid campaign day: ${mission.id}`);
  }
  if (TWELVE_DAY_CAMPAIGN.length !== 96) errors.push(`Expected 96 missions, found ${TWELVE_DAY_CAMPAIGN.length}`);
  for (let day = 1; day <= 12; day += 1) {
    const count = TWELVE_DAY_CAMPAIGN.filter((mission) => mission.day === day).length;
    if (count !== 8) errors.push(`Day ${day} has ${count} missions, expected 8`);
  }
  return errors;
}

export const validateEightDayCampaign = validateTwelveDayCampaign;
