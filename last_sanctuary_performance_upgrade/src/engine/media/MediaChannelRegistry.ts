import type { MediaChannelDefinition, MediaChannelId, AsteroidMediaStageId } from './MediaTypes';

export const MEDIA_CHANNELS: readonly MediaChannelDefinition[] = [
  {
    id: 'oakridge_news_24',
    name: 'Oakridge News 24',
    shortName: 'News 24',
    channelBadge: 'CH 24',
    medium: 'tv',
    scope: 'National / International',
    leadPresenter: 'Elena Vance',
    accentHex: '#38bdf8',
    bannerBgHex: '#0c4a6e',
    description: '24-hour national & international headline network anchored from Oakridge Media Tower Studio A.',
    schedule: [
      { startHour: 0, endHour: 6, programTitle: 'Overnight Desk & Wire Summary', hostName: 'David Park', focus: 'Continuous national bulletins & wire dispatches' },
      { startHour: 6, endHour: 11, programTitle: 'Oakridge Morning Live', hostName: 'Elena Vance', focus: 'Morning briefing, transit status & civic updates' },
      { startHour: 11, endHour: 16, programTitle: 'Midday National Report', hostName: 'Elena Vance & Marcus Reed', focus: 'Live correspondents across regional hubs' },
      { startHour: 16, endHour: 20, programTitle: 'Evening News Hour', hostName: 'Elena Vance', focus: 'Primary daily synthesis & investigative reports' },
      { startHour: 20, endHour: 24, programTitle: 'Nightline Emergency Watch', hostName: 'David Park', focus: 'Late-night radar, civil alerts & observatory relays' },
    ],
  },
  {
    id: 'oakridge_weather',
    name: 'Oakridge Weather',
    shortName: 'Weather',
    channelBadge: 'CH 12',
    medium: 'tv',
    scope: 'Weather & Civil Alerts',
    leadPresenter: 'Clara Bennett',
    accentHex: '#22d3ee',
    bannerBgHex: '#155e75',
    description: 'Real-time meteorological radar, visibility telemetry, storm warnings, and atmospheric fallout advisories.',
    schedule: [
      { startHour: 0, endHour: 7, programTitle: 'Overnight Doppler & Fog Watch', hostName: 'Automated Doppler Desk', focus: 'Thermal & precipitation radar sweeps' },
      { startHour: 7, endHour: 13, programTitle: 'Valley & Coastal Forecast', hostName: 'Clara Bennett', focus: 'Regional temperature, wind & travel conditions' },
      { startHour: 13, endHour: 19, programTitle: 'Atmospheric & Storm Center', hostName: 'Clara Bennett', focus: 'Upper-atmosphere telemetry & storm tracking' },
      { startHour: 19, endHour: 24, programTitle: 'Night Hazard & Fallout Advisory', hostName: 'Clara Bennett', focus: 'Nighttime visibility, seismic dust & fog alerts' },
    ],
  },
  {
    id: 'worldwatch_intl',
    name: 'WorldWatch International',
    shortName: 'WorldWatch',
    channelBadge: 'CH 31',
    medium: 'tv',
    scope: 'Global',
    leadPresenter: 'Tariq Al-Mansoor',
    accentHex: '#818cf8',
    bannerBgHex: '#312e81',
    description: 'Worldwide correspondent network tracking metropolitan corridors, aviation/rail links, and global containment lines.',
    schedule: [
      { startHour: 0, endHour: 8, programTitle: 'Asia-Pacific & Eurasian Desk', hostName: 'Kenji Takahashi', focus: 'Tokyo, Delhi, Seoul & Eurasian regional updates' },
      { startHour: 8, endHour: 16, programTitle: 'European & Atlantic Wire', hostName: 'Tariq Al-Mansoor', focus: 'London, Paris, Berlin & trans-Atlantic reporting' },
      { startHour: 16, endHour: 24, programTitle: 'Global Situation Room', hostName: 'Tariq Al-Mansoor', focus: 'Cross-continental satellite feed & UN/civil bulletins' },
    ],
  },
  {
    id: 'discovery_science',
    name: 'Discovery Science',
    shortName: 'Discovery Sci',
    channelBadge: 'CH 45',
    medium: 'tv',
    scope: 'Science & Environment',
    leadPresenter: 'Dr. Aris Thorne',
    accentHex: '#34d399',
    bannerBgHex: '#065f46',
    description: 'Astronomical telemetry, meteor composition analysis, biological containment briefings, and environmental monitoring.',
    schedule: [
      { startHour: 0, endHour: 9, programTitle: 'Deep Sky Observatory Telemetry', hostName: 'Observatory Relay', focus: 'Orbital tracking & near-Earth object logs' },
      { startHour: 9, endHour: 17, programTitle: 'Earth & Ecology Briefing', hostName: 'Dr. Aris Thorne', focus: 'Atmospheric particulates, radiation & biosphere health' },
      { startHour: 17, endHour: 24, programTitle: 'Scientific Panel Special', hostName: 'Dr. Aris Thorne', focus: 'Expert interviews & biological field findings' },
    ],
  },
  {
    id: 'oakridge_radio',
    name: 'Oakridge Radio',
    shortName: 'FM 94.7',
    channelBadge: 'FM 94.7',
    medium: 'radio',
    scope: 'Emergency Audio',
    leadPresenter: 'Samir Rao',
    accentHex: '#fbbf24',
    bannerBgHex: '#78350f',
    description: '24/7 FM & shortwave civil emergency broadcast carrier operating on diesel backup even during city grid failures.',
    schedule: [
      { startHour: 0, endHour: 6, programTitle: 'Night Watch AM/FM Carrier', hostName: 'Samir Rao', focus: 'Low-bandwidth civil & highway road advisories' },
      { startHour: 6, endHour: 12, programTitle: 'Oakridge Drive & Rail', hostName: 'Samir Rao', focus: 'Main Avenue traffic, railway schedule & community notices' },
      { startHour: 12, endHour: 18, programTitle: 'Town Pulse Afternoon', hostName: 'Nora Hayes', focus: 'Local interviews, clinic updates & weather cut-ins' },
      { startHour: 18, endHour: 24, programTitle: 'Emergency Relay & Civil Band', hostName: 'Samir Rao', focus: 'Backup power bulletins & survival corridor frequencies' },
    ],
  },
  {
    id: 'oakridge_local',
    name: 'Oakridge Local',
    shortName: 'Local 6',
    channelBadge: 'CH 06',
    medium: 'tv',
    scope: 'City & Neighbourhood',
    leadPresenter: 'Maya Brooks',
    accentHex: '#fb7185',
    bannerBgHex: '#881337',
    description: 'Neighbourhood reporting covering Oakridge Town Hall, Pine Elementary, Valley Community Clinic, Railway Station & streets.',
    schedule: [
      { startHour: 0, endHour: 8, programTitle: 'Oakridge Community Bulletin Board', hostName: 'Automated Civic Loop', focus: 'Public clinic hours, school notices & civic calendar' },
      { startHour: 8, endHour: 15, programTitle: 'Main Avenue Live', hostName: 'Maya Brooks', focus: 'Street-level Oakridge shops, transit & park updates' },
      { startHour: 15, endHour: 24, programTitle: 'Oakridge Tonight', hostName: 'Maya Brooks', focus: 'Neighbourhood emergency readiness & mayor briefings' },
    ],
  },
];

export const MEDIA_CHANNEL_MAP: Record<MediaChannelId, MediaChannelDefinition> = MEDIA_CHANNELS.reduce(
  (acc, ch) => {
    acc[ch.id] = ch;
    return acc;
  },
  {} as Record<MediaChannelId, MediaChannelDefinition>
);

export interface AsteroidMediaStageSpec {
  id: AsteroidMediaStageId;
  title: string;
  summary: string;
  priority: 'normal' | 'advisory' | 'breaking' | 'emergency';
}

export const ASTEROID_MEDIA_STAGES: readonly AsteroidMediaStageSpec[] = [
  {
    id: 'early_observation',
    title: 'Stage 1 · Deep-Space Optical Observation',
    summary: 'Observatories log an uncatalogued high-albedo object crossing the inner orbital plane.',
    priority: 'normal',
  },
  {
    id: 'astronomical_warnings',
    title: 'Stage 2 · Trajectory Warning Bulletins',
    summary: 'Discovery Science & Oakridge News 24 issue orbital deflection uncertainty notices for Sector 4.',
    priority: 'advisory',
  },
  {
    id: 'scientist_interviews',
    title: 'Stage 3 · Live Astrophysicist & Medical Panel',
    summary: 'Dr. Aris Thorne and civil observatory leads appear live from Studio B analyzing atmospheric entry angles.',
    priority: 'advisory',
  },
  {
    id: 'emergency_announcements',
    title: 'Stage 4 · Civil Defense Shelter Advisory',
    summary: 'EAS override broadcasts advise Oakridge residents to clear windows and prepare shelter kits.',
    priority: 'breaking',
  },
  {
    id: 'live_impact_coverage',
    title: 'Stage 5 · Live Bolide Entry Coverage',
    summary: 'Field crews along East Ridge capture thermal reentry streaks before atmospheric shockwave.',
    priority: 'emergency',
  },
  {
    id: 'impact_interruption',
    title: 'Stage 6 · Impact Signal Loss & Blackout',
    summary: 'Electromagnetic burst & ground tremor knock regional TV uplink offline; backup diesel generator engages.',
    priority: 'emergency',
  },
  {
    id: 'studio_reconnect',
    title: 'Stage 7 · Studio Reconnection on Backup Carrier',
    summary: 'Oakridge Media Tower restores Studio A anchor desk and FM 94.7 radio carrier on emergency power.',
    priority: 'breaking',
  },
  {
    id: 'city_impact_reports',
    title: 'Stage 8 · Multi-City Crater & Impact Dispatches',
    summary: 'WorldWatch International and Oakridge Local verify crater sites and biological anomaly alerts.',
    priority: 'emergency',
  },
  {
    id: 'emergency_response_comms',
    title: 'Stage 9 · Emergency Response & Comms Disruption',
    summary: 'Military & hospital relays coordinate evacuation corridors while global satellite bandwidth degrades.',
    priority: 'emergency',
  },
];

export function getProgramForHour(ch: MediaChannelDefinition, hour: number): { programTitle: string; hostName: string } {
  const h = ((hour % 24) + 24) % 24;
  for (const slot of ch.schedule) {
    if (h >= slot.startHour && h < slot.endHour) {
      return { programTitle: slot.programTitle, hostName: slot.hostName };
    }
  }
  const fallback = ch.schedule[0];
  return { programTitle: fallback.programTitle, hostName: fallback.hostName };
}
