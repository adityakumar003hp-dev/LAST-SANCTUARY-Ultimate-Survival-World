/**
 * Authored Military Research & Science Complex for Outpost 7.
 * The campus is deliberately built inside the protected military compound so
 * procedural vegetation, loot and hostile spawns cannot overwrite it.
 */
import { RESEARCH_FACILITIES } from './researchFacilities';
import type { ResearchFacilityDefinition } from './researchFacilities';
import { ResearchComplexManager } from '../engine/base/ResearchComplexManager';

export { RESEARCH_FACILITIES };
export type { ResearchFacilityDefinition };
export const RESEARCH_FACILITY_INDEX: ResearchFacilityDefinition[] = RESEARCH_FACILITIES;
export { ResearchComplexManager };

export interface ResearchStoryUnlock {
  mission: number;
  facilityId: string;
  codename: string;
  unlockNote: string;
  clue: string;
}

export const RESEARCH_STORY_UNLOCKS: ResearchStoryUnlock[] = [
  { mission: 65, facilityId: 'research_command', codename: 'Outpost 7 Operations Hub', unlockNote: 'Initial site records and research campus access information', clue: 'A restricted operations file points to the campus research archive.' },
  { mission: 66, facilityId: 'infection_testing', codename: 'Containment Perimeter', unlockNote: 'Safety and access records for the containment zone', clue: 'The perimeter log records an emergency lockdown after the impact.' },
  { mission: 67, facilityId: 'sample_storage', codename: 'Specimen Cryo-Vault', unlockNote: 'Cold storage records for recovered meteor samples', clue: 'Cryogenic canisters contain preserved non-terrestrial samples.' },
  { mission: 68, facilityId: 'medical_research', codename: 'Medical Evidence Wing', unlockNote: 'Medical observations and survivor assessment files', clue: 'Clinical records describe the early progression of the infection.' },
  { mission: 69, facilityId: 'quarantine_ward', codename: 'Bio-Observation Ward', unlockNote: 'Sealed isolation unit and containment observations', clue: 'Quarantine telemetry documents the containment response.' },
  { mission: 70, facilityId: 'meteor_lab', codename: 'Anomalous Materials Lab', unlockNote: 'Spectrometry records from recovered meteor fragments', clue: 'The fragment analysis connects the signal to the impact material.' },
  { mission: 71, facilityId: 'scientist_quarters', codename: 'Researcher Archive', unlockNote: 'The missing researcher’s final records and notes', clue: 'A final log identifies where the researcher went after lockdown.' },
];
