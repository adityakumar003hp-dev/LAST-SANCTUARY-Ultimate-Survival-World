/**
 * LAST SANCTUARY — integrated eight-day / 56-mission campaign catalogue.
 *
 * The original six-day catalogue and its SD_D*_** IDs are imported unchanged
 * to preserve compatibility with any external references. Days 7 and 8 extend
 * that story with the player-mansion transformation and campaign finale.
 *
 * IMPORTANT: This file is campaign DATA only. Runtime objective triggers,
 * campaign-day transitions, quest-journal rendering and save migration must
 * be wired into the existing PrologueManager/GameEngine before these missions
 * can be described as playable in-game.
 */
import { SIX_DAY_CAMPAIGN, type SixDayMission } from './sixDayCampaign';

export type EightDayLocation = SixDayMission['location'] | 'player_mansion' | 'mansion_rooftop' | 'garage';
export type EightDayMission = {
  id: string;
  day: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
  title: string;
  summary: string;
  objectives: string[];
  location: EightDayLocation;
  railwayRequired: boolean;
  unlockAfter?: string;
};

const mansionMissions: EightDayMission[] = [
  {
    id: 'LS_D7_01', day: 7, title: 'The New Home',
    summary: 'Return to the home location and discover the rebuilt four-floor player mansion.',
    objectives: ['Reach the home compound', 'Enter through either functional front entrance', 'Inspect the mansion exterior and grounds'],
    location: 'player_mansion', railwayRequired: false, unlockAfter: 'SD_D6_07',
  },
  {
    id: 'LS_D7_02', day: 7, title: 'Five Accessible Levels',
    summary: 'Explore the ground floor, first floor, second floor, third floor and rooftop.',
    objectives: ['Explore the ground floor', 'Explore the first floor', 'Explore the second and third floors', 'Reach the rooftop terrace'],
    location: 'player_mansion', railwayRequired: false, unlockAfter: 'LS_D7_01',
  },
  {
    id: 'LS_D7_03', day: 7, title: 'Medical Sanctuary',
    summary: 'Inspect and prepare the mansion medical wing while preserving the separate military-base medical division.',
    objectives: ['Enter the mansion medical wing', 'Inspect examination and recovery rooms', 'Organise medical storage'],
    location: 'player_mansion', railwayRequired: false, unlockAfter: 'LS_D7_02',
  },
  {
    id: 'LS_D7_04', day: 7, title: 'Armoury and Equipment',
    summary: 'Discover the secure armoury and protective-equipment storage.',
    objectives: ['Reach the restricted equipment section', 'Inspect protective equipment storage', 'Complete the equipment inventory'],
    location: 'player_mansion', railwayRequired: false, unlockAfter: 'LS_D7_03',
  },
  {
    id: 'LS_D7_05', day: 7, title: 'The Vehicle Collection',
    summary: 'Inspect the expanded garage and verify the available drivable vehicles.',
    objectives: ['Open the garage entrance', 'Inspect cars and ATVs', 'Inspect motorcycles and bicycles', 'Take a vehicle through the driveway and return it to a parking bay'],
    location: 'garage', railwayRequired: false, unlockAfter: 'LS_D7_04',
  },
  {
    id: 'LS_D7_06', day: 7, title: 'A Self-Sufficient Home',
    summary: 'Prepare the mansion utility, food, water and power facilities.',
    objectives: ['Inspect food and cold storage', 'Check water purification and storage', 'Activate or inspect backup power', 'Inspect the workshop and indoor farming area'],
    location: 'player_mansion', railwayRequired: false, unlockAfter: 'LS_D7_05',
  },
  {
    id: 'LS_D7_07', day: 7, title: 'Above the City',
    summary: 'Complete the rooftop terrace inspection and its glass-boundary pool area.',
    objectives: ['Reach the rooftop from the third floor', 'Inspect the continuous glass boundary and safe access gate', 'Inspect the rooftop swimming pool and surrounding deck', 'Complete the terrace safety check'],
    location: 'mansion_rooftop', railwayRequired: false, unlockAfter: 'LS_D7_06',
  },
  {
    id: 'LS_D8_01', day: 8, title: 'A Wider World',
    summary: 'Receive new coordinates and prepare for the final campaign expedition.',
    objectives: ['Read the new transmission', 'Mark the destination on the map', 'Prepare supplies and a vehicle'],
    location: 'player_mansion', railwayRequired: false, unlockAfter: 'LS_D7_07',
  },
  {
    id: 'LS_D8_02', day: 8, title: 'The Forgotten Network',
    summary: 'Investigate a remaining communications relay connected to the railway mystery.',
    objectives: ['Travel to the relay location', 'Inspect the damaged communications equipment', 'Recover the available signal records'],
    location: 'regional', railwayRequired: false, unlockAfter: 'LS_D8_01',
  },
  {
    id: 'LS_D8_03', day: 8, title: 'The Research Connection',
    summary: 'Compare the recovered records with the meteorite and railway evidence.',
    objectives: ['Review the recovered records', 'Identify the matching research reference', 'Record the discovery in the journal'],
    location: 'regional', railwayRequired: false, unlockAfter: 'LS_D8_02',
  },
  {
    id: 'LS_D8_04', day: 8, title: 'The Survivor Network',
    summary: 'Establish contact with the survivor group mentioned in the transmission.',
    objectives: ['Restore the communication link', 'Exchange the sanctuary status report', 'Confirm the survivor group response'],
    location: 'regional', railwayRequired: false, unlockAfter: 'LS_D8_03',
  },
  {
    id: 'LS_D8_05', day: 8, title: 'The Final Journey',
    summary: 'Complete the final major expedition and return with the recovered information.',
    objectives: ['Travel to the final destination', 'Complete the expedition objective', 'Return safely to the player mansion'],
    location: 'regional', railwayRequired: false, unlockAfter: 'LS_D8_04',
  },
  {
    id: 'LS_D8_06', day: 8, title: 'Sanctuary Readiness',
    summary: 'Verify the mansion, military starter base and survivor facilities are ready for long-term use.',
    objectives: ['Check the mansion medical wing and armoury', 'Check the separate military-base medical division', 'Verify food, water, power and vehicle readiness', 'Gather the companions for the final briefing'],
    location: 'player_mansion', railwayRequired: false, unlockAfter: 'LS_D8_05',
  },
  {
    id: 'LS_D8_07', day: 8, title: 'A New Beginning',
    summary: 'Complete the eight-day campaign and unlock permanent unrestricted free exploration.',
    objectives: ['Complete the final briefing', 'Mark the eight-day campaign complete', 'Unlock permanent free exploration without a campaign time limit'],
    location: 'player_mansion', railwayRequired: false, unlockAfter: 'LS_D8_06',
  },
];

export const EIGHT_DAY_CAMPAIGN_TITLE = 'LAST SANCTUARY';
export const EIGHT_DAY_CAMPAIGN_TAGLINE = 'From ordinary life, through the outbreak, to a permanent sanctuary.';
const integratedOriginalSixDays: EightDayMission[] = SIX_DAY_CAMPAIGN.map((mission) => {
  // The player's former apartment is replaced by the mansion. Keep the original
  // story beats and IDs, but point home interactions at the new player mansion.
  const isHomeMission = mission.location === 'apartment';
  const replaceHomeText = (value: string) => value
    .replace(/apartment/gi, 'mansion')
    .replace(/the mansion medical room/gi, 'the mansion medical wing');
  const base: EightDayMission = {
    ...mission,
    title: replaceHomeText(mission.title),
    summary: replaceHomeText(mission.summary),
    objectives: mission.objectives.map(replaceHomeText),
    location: isHomeMission ? 'player_mansion' : mission.location,
  };

  // Day 6 remains the original Last Sanctuary/rescue climax, but the full
  // campaign-complete/free-roam unlock moves to Day 8's final mission.
  if (mission.id === 'SD_D6_07') {
    return {
      ...base,
      title: 'Beyond the Last Line',
      summary: 'Complete the original six-day story arc and prepare for the mansion transformation and final chapter.',
      objectives: ['Gather the survivors for the final briefing', 'Confirm the military starter base is operational', 'Receive the lead that begins the next chapter'],
    };
  }
  return base;
});

export const EIGHT_DAY_CAMPAIGN: EightDayMission[] = [
  ...integratedOriginalSixDays,
  ...mansionMissions,
];

export const EIGHT_DAY_CAMPAIGN_TOTAL_DAYS = 8;
export const EIGHT_DAY_CAMPAIGN_MISSIONS_PER_DAY = 7;
export const EIGHT_DAY_CAMPAIGN_TOTAL_MISSIONS = 56;

/** Basic data integrity check for build-time/tests and future runtime wiring. */
export function validateEightDayCampaign(): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  for (const mission of EIGHT_DAY_CAMPAIGN) {
    if (ids.has(mission.id)) errors.push(`Duplicate mission id: ${mission.id}`);
    ids.add(mission.id);
    if (!mission.objectives.length) errors.push(`Mission has no objectives: ${mission.id}`);
    if (mission.day < 1 || mission.day > 8) errors.push(`Invalid campaign day: ${mission.id}`);
  }
  if (EIGHT_DAY_CAMPAIGN.length !== EIGHT_DAY_CAMPAIGN_TOTAL_MISSIONS) {
    errors.push(`Expected 56 missions, found ${EIGHT_DAY_CAMPAIGN.length}`);
  }
  for (let day = 1; day <= 8; day += 1) {
    const count = EIGHT_DAY_CAMPAIGN.filter((mission) => mission.day === day).length;
    if (count !== EIGHT_DAY_CAMPAIGN_MISSIONS_PER_DAY) errors.push(`Day ${day} has ${count} missions, expected 7`);
  }
  return errors;
}
