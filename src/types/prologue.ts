export type StoryDay = 1 | 2;

export type OpeningEventId =
  | 'D1_E01_NEW_MORNING'
  | 'D1_E02_HOME_SWEET_HOME'
  | 'D1_E03_FRIEND_MESSAGE'
  | 'D1_E04_CITY_MORNING'
  | 'D1_E05_CAFE_MEETING'
  | 'D1_E06_FOUR_FRIENDS'
  | 'D1_E07_PARK'
  | 'D1_E08_STRANGE_NEWS'
  | 'D1_E09_EVENING'
  | 'D1_E10_LAST_NORMAL_NIGHT'
  | 'D2_E11_SOMETHING_WRONG'
  | 'D2_E12_EMERGENCY_BROADCAST'
  | 'D2_E13_FRIENDS_RETURN'
  | 'D2_E14_SKY_CHANGES'
  | 'D2_E15_METEORITE_IMPACT'
  | 'D2_E16_FIRST_INFECTION'
  | 'D2_E17_CITYWIDE_OUTBREAK'
  | 'D2_E18_CITY_ESCAPE'
  | 'D2_E19_FINAL_ROAD'
  | 'D2_E20_STARTER_BASE';

export type ProloguePhase =
  | OpeningEventId
  // The Beginning of the End: 13 Chapters
  | 'intro_cinematic'          // Aerial establishing shot of peaceful city
  | 'ch1_apartment_morning'    // Chapter 1: Day 1 07:00 AM, Wake Up, inspect apartment
  | 'ch2_outside_apartment'    // Chapter 2: Step Outside, explore neighbourhood
  | 'ch3_meet_friends'         // Chapter 3: Meet Marcus, Chloe, Maya at cafe
  | 'ch4_city_alive'           // Chapter 4: Peaceful city exploration (market, cafe, park)
  | 'ch5_return_home'          // Chapter 5: Sunset, return to apartment, sleep in bed (Day 1 Complete)
  | 'ch6_something_is_coming'  // Chapter 6: Day 2 08:00 AM, emergency news, friend messages
  | 'ch7_the_meteorite'        // Chapter 7: Real-time meteorite entry & crater impact
  | 'ch8_first_infection'      // Chapter 8: Sirens, panic, first infected emergence
  | 'ch9_find_friends'         // Chapter 9: Regroup with 3 friends at crossroads
  | 'ch10_the_escape'          // Chapter 10: Playable escape along valley road
  | 'ch11_starter_base'        // Chapter 11: Discover abandoned industrial compound Starter Base
  | 'ch12_establish_base'      // Chapter 12: Generator, medical corner, gate security, storage
  | 'ch13_the_world_awaits'    // Chapter 13: Epic cinematic open-world reveal
  // Legacy phase aliases for save compatibility
  | 'day1_town_explore'
  | 'day1_friends_gathered'
  | 'night1_peaceful'
  | 'day2_morning'
  | 'day2_meteorite_cinematic'
  | 'day2_impact_aftermath'
  | 'day2_first_infection'
  | 'day2_escape_sequence'
  | 'day2_shelter_arrival'
  | 'day2_final_cinematic'
  | 'completed';                // Full survival sandbox unlocked

export interface StoryChapter {
  number: number;
  title: string;
  subtitle: string;
  objective: string;
}

export interface StoryCompanion {
  id: 'marcus' | 'chloe' | 'maya';
  name: string;
  title: string;
  role: 'Leader' | 'Technician' | 'Medic';
  color: number;
  jacketColor: number;
  pantColor: number;
  hairColor: number;
  position: [number, number, number];
  rotationY: number;
  health: number;
  maxHealth: number;
  dialogueState: number;
  isFollowing: boolean;
  station: 'follow' | 'town' | 'shelter_guard' | 'shelter_tech' | 'shelter_med';
  relationshipScore: number;
  isFriend?: boolean;
}

export interface TownCitizen {
  id: string;
  name: string;
  role: string;
  buildingType: string;
  position: [number, number, number];
  rotationY: number;
  shirtColor: number;
  pantColor: number;
  schedule: 'walk' | 'stand' | 'shop' | 'flee' | 'cower' | 'infected';
  patrolPoints?: [number, number][];
  dialogueLines: string[];
  isInfected?: boolean;
  infectionStage?: 'normal' | 'exposed' | 'symptoms' | 'stunned' | 'zombie';
  infectionTimer?: number;
  infectedBy?: string;
}

export interface PrologueSubtitle {
  speaker: string;
  text: string;
  role?: string;
  portraitColor?: string;
  duration?: number;
}

export interface OpeningStoryState {
  schemaVersion: number;
  currentDay: StoryDay;
  currentEventId: OpeningEventId;
  completedEventIds: OpeningEventId[];
  optionalObjectivesCompleted: string[];
  meteoriteImpactTriggered: boolean;
  firstInfectionDiscovered: boolean;
  cityOutbreakStarted: boolean;
  cityEscapeCompleted: boolean;
  starterBaseEstablished: boolean;
  friendStoryFlags: Record<string, string[]>;
  lastSafeCheckpointId: string;
}

export interface PrologueSaveData {
  phase: ProloguePhase;
  isCompleted: boolean;
  day: number;
  chapter?: number;
  currentEventId?: OpeningEventId;
  completedEventIds?: OpeningEventId[];
  optionalObjectivesCompleted?: string[];
  meteoriteImpactTriggered?: boolean;
  firstInfectionDiscovered?: boolean;
  cityOutbreakStarted?: boolean;
  cityEscapeCompleted?: boolean;
  starterBaseEstablished?: boolean;
  craterFormed: boolean;
  friendsMet: {
    marcus: boolean;
    chloe: boolean;
    maya: boolean;
  };
  shelterUnlocked: boolean;
  shelterDoorClosed: boolean;
  generatorOnline: boolean;
  radioInspected: boolean;
  suppliesInspected: boolean;
  apartmentInspected?: {
    phone: boolean;
    fridge: boolean;
    window: boolean;
    armory?: boolean;
    pool?: boolean;
    tv?: boolean;
  };
  cityTasks?: {
    market: boolean;
    cafe: boolean;
    park: boolean;
    broadcast?: boolean;
    escapeHighway?: boolean;
  };
  baseTasks?: {
    generator: boolean;
    medical: boolean;
    gate: boolean;
    storage: boolean;
    friendsTalked: number;
  };
  companions: Record<string, {
    health: number;
    station: string;
    relationshipScore: number;
    isFollowing?: boolean;
    isFriend?: boolean;
    position?: [number, number, number];
    rotationY?: number;
  }>;
}
