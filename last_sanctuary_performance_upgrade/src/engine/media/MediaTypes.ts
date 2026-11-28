import type { CityOutbreakTelemetry, GlobalOutbreakMetrics, GlobalPopulationStateSnapshot } from '../world/GlobalOutbreakSimulator';
import type { WeatherType, MediaSaveData } from '../../types/game';

export type MediaChannelId =
  | 'oakridge_news_24'
  | 'oakridge_weather'
  | 'worldwatch_intl'
  | 'discovery_science'
  | 'oakridge_radio'
  | 'oakridge_local';

export type MediaWorldPhase =
  | 'normal_world'
  | 'asteroid_approaching'
  | 'asteroid_impact'
  | 'outbreak'
  | 'late_stage';

export type ChannelOperationalStatus =
  | 'online'
  | 'degraded'
  | 'eas_override'
  | 'automated_loop'
  | 'offline';

export type ReporterProfession =
  | 'News Anchor'
  | 'Field Reporter'
  | 'Investigative Journalist'
  | 'Camera Operator'
  | 'Photographer'
  | 'Weather Presenter'
  | 'Scientist'
  | 'Radio Presenter'
  | 'Broadcast Technician'
  | 'Editor'
  | 'Security Personnel'
  | 'Media Vehicle Driver';

export type LiveReporterEventStage =
  | 'standby'
  | 'normal_report'
  | 'camera_anomaly'
  | 'signal_interference'
  | 'studio_reconnect'
  | 'outbreak_conversion'
  | 'feed_lost'
  | 'studio_emergency_bulletin';

export type AsteroidMediaStageId =
  | 'early_observation'
  | 'astronomical_warnings'
  | 'scientist_interviews'
  | 'emergency_announcements'
  | 'live_impact_coverage'
  | 'impact_interruption'
  | 'studio_reconnect'
  | 'city_impact_reports'
  | 'emergency_response_comms';

export interface MediaScheduleSlot {
  startHour: number;
  endHour: number;
  programTitle: string;
  hostName: string;
  focus: string;
}

export interface MediaChannelDefinition {
  id: MediaChannelId;
  name: string;
  shortName: string;
  channelBadge: string; // e.g. 'CH 24', 'FM 94.7'
  medium: 'tv' | 'radio' | 'hybrid';
  scope: 'National / International' | 'Weather & Civil Alerts' | 'Global' | 'Science & Environment' | 'Emergency Audio' | 'City & Neighbourhood';
  leadPresenter: string;
  accentHex: string;
  bannerBgHex: string;
  description: string;
  schedule: MediaScheduleSlot[];
}

export interface MediaChannelLiveState {
  definition: MediaChannelDefinition;
  status: ChannelOperationalStatus;
  signalStrengthPct: number;
  currentProgram: string;
  currentPresenter: string;
  headline: string;
  subheadline: string;
  ticker: string;
  bodyLines: string[];
  regionTag: string;
  priority: 'normal' | 'advisory' | 'breaking' | 'emergency';
  isLiveFieldFeed: boolean;
}

export interface MediaBroadcastRecord {
  id: string;
  channelId: MediaChannelId;
  channelName: string;
  day: number;
  timeString: string;
  phase: MediaWorldPhase;
  priority: 'normal' | 'advisory' | 'breaking' | 'emergency';
  headline: string;
  summary: string;
  presenter: string;
  region: string;
}

export interface MediaEmergencyRecording {
  id: string;
  title: string;
  channelId: MediaChannelId;
  recordedDay: number;
  transcript: string;
  isAutomatedLoop: boolean;
}

export interface MediaFacilityStatus {
  id: string;
  name: string;
  kind: 'hq_tower' | 'regional_office' | 'international_center' | 'local_station' | 'satellite_uplink' | 'emergency_center' | 'mobile_unit';
  region: string;
  coordinates: [number, number, number];
  operational: boolean;
  backupPowerOn: boolean;
  uplinkStrength: number; // 0..100
  staffCount: number;
}

export interface ReporterNPCDescriptor {
  id: string;
  name: string;
  profession: ReporterProfession;
  channelId: MediaChannelId;
  assignment: string;
  locationLabel: string;
  position: [number, number, number];
  status: 'on_air' | 'field_reporting' | 'transit' | 'standby' | 'stunned' | 'infected' | 'evacuated';
  equipment: string;
  infectionTimer: number;
  talkedToPlayer: boolean;
}

export interface MediaVehicleTelemetry {
  id: string;
  name: string;
  kind: 'news_van' | 'satellite_truck' | 'reporter_suv' | 'camera_crew_van' | 'radio_van' | 'news_helicopter' | 'emergency_broadcast_truck';
  channelId: MediaChannelId;
  position: [number, number, number];
  uplinkActive: boolean;
  crewNames: string[];
  statusText: string;
}

export interface SharedBroadcastScreenFeed {
  channelId: MediaChannelId;
  channelName: string;
  badge: string;
  status: ChannelOperationalStatus;
  priority: 'normal' | 'advisory' | 'breaking' | 'emergency';
  accentHex: string;
  bannerBgHex: string;
  headline: string;
  subheadline: string;
  ticker: string;
  lines: string[];
  signalStrengthPct: number;
  worldPhase: MediaWorldPhase;
  liveIncidentStage: LiveReporterEventStage;
  liveIncidentBanner: string | null;
  timeString: string;
  dayCount: number;
}

export interface MediaWorldInputContext {
  dayCount: number;
  campaignDay: number;
  gameTimeMinutes: number;
  isNight: boolean;
  weatherType: WeatherType;
  weatherSeverity: number;
  visibilityPercent: number;
  meteorInFlight: boolean;
  meteorImpacted: boolean;
  cityOutbreakStarted: boolean;
  isOutbreakActive: boolean;
  prologueEventId?: string;
  globalMetrics: GlobalOutbreakMetrics;
  cityStates: CityOutbreakTelemetry[];
  populationState: GlobalPopulationStateSnapshot;
  activeTrainCount: number;
  delayedTrainCount: number;
  powerStatePowered: boolean;
  powerGridStability: number;
  nearestCityName: string;
}

export interface GlobalMediaSnapshot {
  worldPhase: MediaWorldPhase;
  activeChannelId: MediaChannelId;
  activeRadioChannelId: MediaChannelId;
  asteroidStageIndex: number;
  asteroidStageId: AsteroidMediaStageId;
  asteroidStageTitle: string;
  asteroidStageSummary: string;
  liveIncidentStage: LiveReporterEventStage;
  liveIncidentTimer: number;
  liveIncidentReporterName: string;
  liveIncidentHeadline: string | null;
  commsHealthPct: number;
  dayCount: number;
  timeString: string;
  channels: MediaChannelLiveState[];
  facilities: MediaFacilityStatus[];
  reporters: ReporterNPCDescriptor[];
  vehicles: MediaVehicleTelemetry[];
  broadcastHistory: MediaBroadcastRecord[];
  emergencyRecordings: MediaEmergencyRecording[];
  interactedTerminalIds: string[];
  inspectedStudioIds: string[];
}

export type { MediaSaveData };
