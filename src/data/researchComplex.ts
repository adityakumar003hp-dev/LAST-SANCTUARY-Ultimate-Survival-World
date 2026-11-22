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
  { mission: 50, facilityId: 'sample_storage', codename: 'Specimen Cryo-Vault', unlockNote: 'Cold storage containment for meteor samples', clue: 'Cryogenic canisters holding active non-terrestrial spores.' },
  { mission: 51, facilityId: 'scientist_quarters', codename: 'Command Archives', unlockNote: 'Classified operational files and research logs', clue: 'Doctoral logs documenting rapid cellular mutation rates.' },
  { mission: 52, facilityId: 'quarantine_ward', codename: 'Bio-Observation Ward', unlockNote: 'Sealed isolation unit for survivor assessment', clue: 'Quarantine telemetry confirming airborne virulence suppression.' },
  { mission: 53, facilityId: 'research_command', codename: 'Campus Central Hub', unlockNote: 'Campus power grid and automated laboratory monitors', clue: 'Mainframe access keys unlocking encrypted lab sub-networks.' },
  { mission: 54, facilityId: 'biology_lab', codename: 'Virology Suite', unlockNote: 'Cellular pathology and viral strain sequencing', clue: 'Electron microscopy confirming hybrid biological-mineral pathogens.' },
  { mission: 55, facilityId: 'meteor_lab', codename: 'Anomalous Materials', unlockNote: 'Deep spectrometry of meteor fragments and spore radiation', clue: 'Spectrometry revealing crystal structures emitting low-frequency radiation.' },
  { mission: 56, facilityId: 'infection_testing', codename: 'Aerosol Isolation Chambers', unlockNote: 'Environmental virulence testing', clue: 'Aerosol test footage proving rapid neuromuscular takeover in host tissue.' },
  { mission: 57, facilityId: 'genetics_lab', codename: 'Genome Splicing Wing', unlockNote: 'Mutation progression and adaptive countermeasures', clue: 'Synthesized genetic markers revealing accelerated evolutionary adaptation.' },
  { mission: 58, facilityId: 'medical_research', codename: 'Vaccine Synthesis', unlockNote: 'Active antigen stabilization and antibody production', clue: 'A viable neutralizing compound stabilizing infected blood tissue.' },
  { mission: 69, facilityId: 'secret_lab', codename: 'Classified Deep Bunker', unlockNote: 'Sub-level Origin Facility and zero-day pathogen records', clue: 'Operation Black Sky archives revealing pre-impact defense preparations.' },
];
