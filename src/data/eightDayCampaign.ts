/**
 * Compatibility bridge for older imports. The canonical campaign is now the
 * 10-day / 70-mission LAST SANCTUARY: REBIRTH catalogue.
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

export const TEN_DAY_CAMPAIGN_TITLE = 'LAST SANCTUARY: REBIRTH';
export const TEN_DAY_CAMPAIGN_TAGLINE = 'Ten days to rebuild humanity. Infinite exploration beyond Mission 70.';
export const TEN_DAY_CAMPAIGN: EightDayMission[] = LAST_SANCTUARY_CAMPAIGN.map((event) => ({
  id: event.id,
  day: event.day,
  title: event.title,
  summary: event.summary,
  objectives: event.objectives,
  location: event.location,
  railwayRequired: event.railwayControl === 'AI-only',
  unlockAfter: event.unlocksAfter ?? undefined,
}));
export const TEN_DAY_CAMPAIGN_TOTAL_DAYS = CAMPAIGN_DAY_COUNT;
export const TEN_DAY_CAMPAIGN_MISSIONS_PER_DAY = 7;
export const TEN_DAY_CAMPAIGN_TOTAL_MISSIONS = CAMPAIGN_EVENT_COUNT;

/** Legacy export names remain available to avoid breaking older integrations. */
export const EIGHT_DAY_CAMPAIGN_TITLE = TEN_DAY_CAMPAIGN_TITLE;
export const EIGHT_DAY_CAMPAIGN_TAGLINE = TEN_DAY_CAMPAIGN_TAGLINE;
export const EIGHT_DAY_CAMPAIGN = TEN_DAY_CAMPAIGN;
export const EIGHT_DAY_CAMPAIGN_TOTAL_DAYS = TEN_DAY_CAMPAIGN_TOTAL_DAYS;
export const EIGHT_DAY_CAMPAIGN_MISSIONS_PER_DAY = TEN_DAY_CAMPAIGN_MISSIONS_PER_DAY;
export const EIGHT_DAY_CAMPAIGN_TOTAL_MISSIONS = TEN_DAY_CAMPAIGN_TOTAL_MISSIONS;

export function validateTenDayCampaign(): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  for (const mission of TEN_DAY_CAMPAIGN) {
    if (ids.has(mission.id)) errors.push(`Duplicate mission id: ${mission.id}`);
    ids.add(mission.id);
    if (!mission.objectives.length) errors.push(`Mission has no objectives: ${mission.id}`);
    if (mission.day < 1 || mission.day > 10) errors.push(`Invalid campaign day: ${mission.id}`);
  }
  if (TEN_DAY_CAMPAIGN.length !== 70) errors.push(`Expected 70 missions, found ${TEN_DAY_CAMPAIGN.length}`);
  for (let day = 1; day <= 10; day += 1) {
    const count = TEN_DAY_CAMPAIGN.filter((mission) => mission.day === day).length;
    if (count !== 7) errors.push(`Day ${day} has ${count} missions, expected 7`);
  }
  return errors;
}

export const validateEightDayCampaign = validateTenDayCampaign;
