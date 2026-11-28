import {
  ASTEROID_MEDIA_STAGES,
  MEDIA_CHANNELS,
  MEDIA_CHANNEL_MAP,
} from './MediaChannelRegistry';
import { NewsEventGenerator } from './NewsEventGenerator';
import type {
  AsteroidMediaStageId,
  ChannelOperationalStatus,
  GlobalMediaSnapshot,
  LiveReporterEventStage,
  MediaBroadcastRecord,
  MediaChannelId,
  MediaChannelLiveState,
  MediaEmergencyRecording,
  MediaFacilityStatus,
  MediaSaveData,
  MediaVehicleTelemetry,
  MediaWorldInputContext,
  MediaWorldPhase,
  ReporterNPCDescriptor,
  SharedBroadcastScreenFeed,
} from './MediaTypes';

const DEFAULT_REPORTERS: ReporterNPCDescriptor[] = [
  {
    id: 'rep_anchor_01',
    name: 'Elena Vance',
    profession: 'News Anchor',
    channelId: 'oakridge_news_24',
    assignment: 'Studio A Main Anchor Desk',
    locationLabel: 'Oakridge Media Tower · 2F Studio A',
    position: [63.5, 4.1, -29.5],
    status: 'on_air',
    equipment: 'Anchor Teleprompter & IFB Earpiece',
    infectionTimer: 0,
    talkedToPlayer: false,
  },
  {
    id: 'rep_field_01',
    name: 'Marcus Reed',
    profession: 'Field Reporter',
    channelId: 'oakridge_news_24',
    assignment: 'Oakridge Town Square & Perimeter Live Dispatch',
    locationLabel: 'Oakridge Town Park / Cross Street',
    position: [26.0, 0.0, 12.0],
    status: 'field_reporting',
    equipment: 'Wireless Handheld Mic & Press Vest',
    infectionTimer: 0,
    talkedToPlayer: false,
  },
  {
    id: 'rep_invest_01',
    name: 'Nadia Lindqvist',
    profession: 'Investigative Journalist',
    channelId: 'worldwatch_intl',
    assignment: 'Railway & Crater Perimeter Investigation',
    locationLabel: 'Oakridge Railway Plaza / Research Corridor',
    position: [42.0, 0.0, 24.0],
    status: 'field_reporting',
    equipment: 'Encrypted Field Recorder & Press Tablet',
    infectionTimer: 0,
    talkedToPlayer: false,
  },
  {
    id: 'rep_cam_01',
    name: 'Devon Brooks',
    profession: 'Camera Operator',
    channelId: 'oakridge_news_24',
    assignment: 'Live ENG Camera Unit 01',
    locationLabel: 'Oakridge Town Park / Cross Street',
    position: [27.8, 0.0, 13.5],
    status: 'field_reporting',
    equipment: '4K ENG Shoulder Broadcast Camera & Tripod',
    infectionTimer: 0,
    talkedToPlayer: false,
  },
  {
    id: 'rep_photo_01',
    name: 'Kenji Sato',
    profession: 'Photographer',
    channelId: 'oakridge_local',
    assignment: 'Civic Street & Emergency Photo Documentation',
    locationLabel: 'Oakridge Main Avenue',
    position: [12.0, 0.0, -24.0],
    status: 'field_reporting',
    equipment: 'Telephoto DSLR Press Rig',
    infectionTimer: 0,
    talkedToPlayer: false,
  },
  {
    id: 'rep_weather_01',
    name: 'Clara Bennett',
    profession: 'Weather Presenter',
    channelId: 'oakridge_weather',
    assignment: 'Studio B Doppler Weather Wall',
    locationLabel: 'Oakridge Media Tower · 2F Weather Studio',
    position: [70.0, 4.1, -30.5],
    status: 'on_air',
    equipment: 'Doppler Clicker & Studio Lapel Mic',
    infectionTimer: 0,
    talkedToPlayer: false,
  },
  {
    id: 'rep_sci_01',
    name: 'Dr. Aris Thorne',
    profession: 'Scientist',
    channelId: 'discovery_science',
    assignment: 'Discovery Science Observatory & Bio Lab Desk',
    locationLabel: 'Oakridge Media Tower · 2F Science Studio',
    position: [70.0, 4.1, -24.5],
    status: 'on_air',
    equipment: 'Spectrometer Tablet & Studio Headset',
    infectionTimer: 0,
    talkedToPlayer: false,
  },
  {
    id: 'rep_radio_01',
    name: 'Samir Rao',
    profession: 'Radio Presenter',
    channelId: 'oakridge_radio',
    assignment: 'FM 94.7 Emergency Radio Booth',
    locationLabel: 'Oakridge Media Tower · 1F Radio Booth',
    position: [61.5, 0.2, -23.0],
    status: 'on_air',
    equipment: 'Boom Condenser Mic & Broadcast Mixer',
    infectionTimer: 0,
    talkedToPlayer: false,
  },
  {
    id: 'rep_tech_01',
    name: 'hannah Kowalski',
    profession: 'Broadcast Technician',
    channelId: 'oakridge_news_24',
    assignment: 'Master Control & Satellite Uplink Rack',
    locationLabel: 'Oakridge Media Tower · 2F Control Room',
    position: [66.0, 4.1, -21.5],
    status: 'on_air',
    equipment: 'RF Signal Analyzer & Comms Headset',
    infectionTimer: 0,
    talkedToPlayer: false,
  },
  {
    id: 'rep_editor_01',
    name: 'Arthur Pendelton',
    profession: 'Editor',
    channelId: 'worldwatch_intl',
    assignment: 'Newsroom Wire & Verification Desk',
    locationLabel: 'Oakridge Media Tower · 3F Editorial Suite',
    position: [65.0, 8.0, -28.0],
    status: 'on_air',
    equipment: 'Dual-Terminal Verification Console',
    infectionTimer: 0,
    talkedToPlayer: false,
  },
  {
    id: 'rep_sec_01',
    name: 'Sgt. Malik Carter',
    profession: 'Security Personnel',
    channelId: 'oakridge_local',
    assignment: 'Media Tower Lobby & Perimeter Security',
    locationLabel: 'Oakridge Media Tower · 1F Reception Gate',
    position: [66.0, 0.2, -19.0],
    status: 'standby',
    equipment: 'Security Radio & Perimeter Keycard',
    infectionTimer: 0,
    talkedToPlayer: false,
  },
  {
    id: 'rep_driver_01',
    name: 'Luis Morales',
    profession: 'Media Vehicle Driver',
    channelId: 'oakridge_news_24',
    assignment: 'Mobile ENG & Satellite Fleet Dispatch',
    locationLabel: 'Oakridge Media Plaza Apron',
    position: [56.0, 0.2, -19.5],
    status: 'standby',
    equipment: 'ENG Fleet Keys & Mobile Uplink Console',
    infectionTimer: 0,
    talkedToPlayer: false,
  },
];

// Clean capitalization fix for Hannah Kowalski
DEFAULT_REPORTERS[8].name = 'Hannah Kowalski';

const DEFAULT_FACILITIES: MediaFacilityStatus[] = [
  {
    id: 'fac_oakridge_tower',
    name: 'Oakridge Media Tower HQ',
    kind: 'hq_tower',
    region: 'Oakridge Valley (Sector 1)',
    coordinates: [66, 0, -28],
    operational: true,
    backupPowerOn: false,
    uplinkStrength: 100,
    staffCount: 12,
  },
  {
    id: 'fac_metro_regional',
    name: 'Metro Corridor Regional Office',
    kind: 'regional_office',
    region: 'North Corridor / Regional Rail Hub',
    coordinates: [260, 0, -140],
    operational: true,
    backupPowerOn: false,
    uplinkStrength: 94,
    staffCount: 8,
  },
  {
    id: 'fac_worldwatch_hub',
    name: 'WorldWatch International Broadcast Centre',
    kind: 'international_center',
    region: 'Global Satellite Exchange',
    coordinates: [-340, 0, -240],
    operational: true,
    backupPowerOn: false,
    uplinkStrength: 92,
    staffCount: 18,
  },
  {
    id: 'fac_oakridge_local_kiosk',
    name: 'Oakridge Town Local Reporting Station',
    kind: 'local_station',
    region: 'Oakridge Main Avenue',
    coordinates: [48, 0, -14],
    operational: true,
    backupPowerOn: false,
    uplinkStrength: 98,
    staffCount: 4,
  },
  {
    id: 'fac_ridge_uplink',
    name: 'East Ridge Satellite Uplink Array',
    kind: 'satellite_uplink',
    region: 'East Ridge Heights',
    coordinates: [420, 0, 120],
    operational: true,
    backupPowerOn: false,
    uplinkStrength: 96,
    staffCount: 3,
  },
  {
    id: 'fac_emergency_center',
    name: 'Outpost 7 Emergency Broadcast Relay',
    kind: 'emergency_center',
    region: 'Military Starter Base Perimeter',
    coordinates: [942, 0, 22],
    operational: true,
    backupPowerOn: true,
    uplinkStrength: 97,
    staffCount: 5,
  },
  {
    id: 'fac_mobile_eng',
    name: 'Mobile News Unit 01–07 Fleet',
    kind: 'mobile_unit',
    region: 'Dynamic Field Deployment',
    coordinates: [56, 0, -16],
    operational: true,
    backupPowerOn: true,
    uplinkStrength: 91,
    staffCount: 4,
  },
];

const DEFAULT_RECORDINGS: MediaEmergencyRecording[] = [
  {
    id: 'rec_eas_shelter',
    title: 'CD-01 · Civil Defense Shelter & Quarantine Protocol',
    channelId: 'oakridge_radio',
    recordedDay: 2,
    transcript:
      'Automated Civil Emergency Carrier: If regular television uplinks fail, shelter inside fortified structures, secure perimeter doors, and monitor FM 94.7 on the hour for railway evacuation corridor updates.',
    isAutomatedLoop: true,
  },
  {
    id: 'rec_eas_science',
    title: 'SCI-02 · Crater Fragmentation & Pathogen Timer Advisory',
    channelId: 'discovery_science',
    recordedDay: 3,
    transcript:
      'Recorded Briefing by Dr. Aris Thorne: Biological stagger induced by meteorite aerosols transitions within 60 seconds during daylight and 10 seconds at night. Maintain distance from disoriented subjects.',
    isAutomatedLoop: true,
  },
];

export class GlobalMediaManager {
  private activeChannelId: MediaChannelId = 'oakridge_news_24';
  private activeRadioChannelId: MediaChannelId = 'oakridge_radio';
  private worldPhase: MediaWorldPhase = 'normal_world';
  private asteroidStageIndex = 0;

  private liveIncidentStage: LiveReporterEventStage = 'standby';
  private liveIncidentTimer = 0;
  private liveIncidentTriggered = false;
  private liveIncidentReporterId = 'rep_field_01';

  private commsHealthPct = 100;
  private channelStatuses: Partial<Record<MediaChannelId, ChannelOperationalStatus>> = {};
  private channels: MediaChannelLiveState[] = [];
  private facilities: MediaFacilityStatus[] = DEFAULT_FACILITIES.map((f) => ({ ...f, coordinates: [...f.coordinates] }));
  private reporters: ReporterNPCDescriptor[] = DEFAULT_REPORTERS.map((r) => ({ ...r, position: [...r.position] }));
  private vehicles: MediaVehicleTelemetry[] = [];
  private broadcastHistory: MediaBroadcastRecord[] = [];
  private emergencyRecordings: MediaEmergencyRecording[] = DEFAULT_RECORDINGS.map((r) => ({ ...r }));
  private interactedTerminalIds: Set<string> = new Set();
  private inspectedStudioIds: Set<string> = new Set();

  private lastContext: MediaWorldInputContext | null = null;
  private lastLoggedKey = '';
  private refreshAccum = 0;
  private lastUpdatedAt = Date.now();

  constructor(initialSave?: MediaSaveData) {
    if (initialSave) {
      this.importSaveData(initialSave);
    }
  }

  public setActiveChannel(id: MediaChannelId): void {
    if (MEDIA_CHANNEL_MAP[id]) {
      this.activeChannelId = id;
    }
  }

  public cycleActiveChannel(): MediaChannelId {
    const idx = MEDIA_CHANNELS.findIndex((c) => c.id === this.activeChannelId);
    const next = MEDIA_CHANNELS[(idx + 1) % MEDIA_CHANNELS.length].id;
    this.activeChannelId = next;
    return next;
  }

  public setActiveRadioChannel(id: MediaChannelId): void {
    if (MEDIA_CHANNEL_MAP[id]) {
      this.activeRadioChannelId = id;
    }
  }

  public triggerLiveReporterIncident(force: boolean = false): void {
    if (this.liveIncidentTriggered && !force) return;
    this.liveIncidentTriggered = true;
    this.liveIncidentStage = 'normal_report';
    this.liveIncidentTimer = 0;
    const rep = this.reporters.find((r) => r.id === this.liveIncidentReporterId);
    if (rep) {
      rep.status = 'field_reporting';
      rep.locationLabel = 'Oakridge Emergency Cordon (Live ENG)';
    }
    this.appendHistory(
      'oakridge_news_24',
      'breaking',
      `LIVE DISPATCH: ${rep?.name || 'Marcus Reed'} reporting live from Oakridge emergency cordon`,
      'Field unit ENG-01 connected to Studio A while police and emergency units hold the perimeter.'
    );
  }

  public recordTerminalInteraction(terminalId: string): void {
    this.interactedTerminalIds.add(terminalId);
  }

  public recordStudioInspection(studioId: string): void {
    this.inspectedStudioIds.add(studioId);
  }

  public markReporterTalked(reporterId: string): void {
    const rep = this.reporters.find((r) => r.id === reporterId);
    if (rep) rep.talkedToPlayer = true;
  }

  public setFacilityBackupPower(facilityId: string, on: boolean): void {
    const fac = this.facilities.find((f) => f.id === facilityId);
    if (fac) {
      fac.backupPowerOn = on;
      if (on && !fac.operational) fac.operational = true;
    }
  }

  public syncReporterRuntimeStates(updates: Array<{
    id: string;
    position?: [number, number, number];
    status?: ReporterNPCDescriptor['status'];
    locationLabel?: string;
    infectionTimer?: number;
  }>): void {
    for (const u of updates) {
      const rep = this.reporters.find((r) => r.id === u.id);
      if (!rep) continue;
      if (u.position) rep.position = [u.position[0], u.position[1], u.position[2]];
      if (u.status) rep.status = u.status;
      if (u.locationLabel) rep.locationLabel = u.locationLabel;
      if (u.infectionTimer !== undefined) rep.infectionTimer = u.infectionTimer;
    }
  }

  public syncMediaVehicleTelemetry(list: MediaVehicleTelemetry[]): void {
    this.vehicles = list;
  }

  public update(delta: number, ctx: MediaWorldInputContext): void {
    this.lastContext = ctx;
    this.lastUpdatedAt = Date.now();

    // 1. Derive World Phase strictly from real game simulation state
    const effectiveDay = Math.max(ctx.dayCount, ctx.campaignDay);
    const sev = ctx.globalMetrics.apocalypticSeverity;
    const hour = ctx.gameTimeMinutes / 60;

    let nextPhase: MediaWorldPhase = 'normal_world';
    if (effectiveDay >= 5 || sev >= 0.72 || ctx.powerGridStability <= 0.35) {
      nextPhase = 'late_stage';
    } else if (ctx.isOutbreakActive || ctx.cityOutbreakStarted || sev >= 0.14 || effectiveDay >= 3) {
      nextPhase = 'outbreak';
    } else if (ctx.meteorImpacted) {
      nextPhase = 'asteroid_impact';
    } else if (ctx.meteorInFlight || effectiveDay === 2 || (effectiveDay === 1 && hour >= 18)) {
      nextPhase = 'asteroid_approaching';
    }
    this.worldPhase = nextPhase;

    // 2. Compute 9-stage Asteroid Media Sequence index strictly from timeline/impact state
    let stageIdx = 0;
    if (ctx.isOutbreakActive || effectiveDay >= 3 || sev >= 0.14) {
      stageIdx = 8; // city_impact_reports / emergency_response_comms
    } else if (ctx.meteorImpacted) {
      stageIdx = this.liveIncidentStage === 'studio_reconnect' ? 6 : 7;
    } else if (ctx.meteorInFlight) {
      stageIdx = 4; // live_impact_coverage
    } else if (effectiveDay >= 2) {
      if (hour >= 14) stageIdx = 3; // emergency_announcements
      else if (hour >= 10.5) stageIdx = 2; // scientist_interviews
      else stageIdx = 1; // astronomical_warnings
    } else if (hour >= 14) {
      stageIdx = 0; // early_observation
    }
    this.asteroidStageIndex = Math.max(this.asteroidStageIndex, stageIdx);

    // 3. Auto-trigger & progress cinematic non-graphic Live Reporter Incident during outbreak onset
    if (
      !this.liveIncidentTriggered &&
      (ctx.cityOutbreakStarted || ctx.isOutbreakActive || ctx.prologueEventId === 'D2_E16_FIRST_INFECTION' || ctx.prologueEventId === 'D2_E17_CITYWIDE_OUTBREAK')
    ) {
      this.triggerLiveReporterIncident();
    }

    if (this.liveIncidentStage !== 'standby' && this.liveIncidentStage !== 'studio_emergency_bulletin') {
      this.liveIncidentTimer += delta;
      const transition = (nextStage: LiveReporterEventStage, headline: string, summary: string, priority: MediaBroadcastRecord['priority'] = 'emergency') => {
        this.liveIncidentStage = nextStage;
        this.liveIncidentTimer = 0;
        this.appendHistory('oakridge_news_24', priority, headline, summary);
      };

      const rep = this.reporters.find((r) => r.id === this.liveIncidentReporterId);
      if (this.liveIncidentStage === 'normal_report' && this.liveIncidentTimer >= 7.0) {
        transition(
          'camera_anomaly',
          'CAMERA CREW ALERT: Erratic individual sighted behind Oakridge cordon',
          'Camera operator zooms toward perimeter barricade as medical team moves to assess unresponsive bystander.',
          'breaking'
        );
      } else if (this.liveIncidentStage === 'camera_anomaly' && this.liveIncidentTimer >= 6.5) {
        transition(
          'signal_interference',
          'LIVE FEED DEGRADING: Field crew retreating to ENG truck',
          'Microwave audio drops intermittently as crowd disperses across Oakridge Avenue.'
        );
      } else if (this.liveIncidentStage === 'signal_interference' && this.liveIncidentTimer >= 5.5) {
        transition(
          'studio_reconnect',
          'STUDIO RECONNECT: Attempting backup carrier to Oakridge field crew',
          'Master Control routes satellite relay via Media Tower Roof Array.'
        );
      } else if (this.liveIncidentStage === 'studio_reconnect' && this.liveIncidentTimer >= 5.0) {
        // Check if outbreak is actually active (never convert on Day 1 peaceful life)
        if (ctx.isOutbreakActive || ctx.cityOutbreakStarted || ctx.meteorImpacted) {
          if (rep && rep.status !== 'infected') {
            rep.status = 'stunned';
            rep.infectionTimer = ctx.isNight ? 10 : 60;
          }
          transition(
            'outbreak_conversion',
            'PERIMETER COMPROMISED: Containment breach confirmed at field unit',
            'Wide tower safety feed confirms pathogen transition protocol active; field unit retreating.'
          );
        } else {
          transition(
            'studio_emergency_bulletin',
            'STUDIO UPDATE: Field perimeter secured under civil advisory',
            'Control room confirms units stabilized and emergency lines remain open.'
          );
        }
      } else if (this.liveIncidentStage === 'outbreak_conversion' && this.liveIncidentTimer >= 5.5) {
        if (rep && rep.status !== 'infected') {
          rep.status = 'evacuated';
        }
        transition(
          'feed_lost',
          'SIGNAL LOST: Oakridge Field ENG-01 transponder offline',
          'Satellite telemetry dropped during cordon withdrawal; broadcast switches back to Studio A.'
        );
      } else if (this.liveIncidentStage === 'feed_lost' && this.liveIncidentTimer >= 4.5) {
        transition(
          'studio_emergency_bulletin',
          'EMERGENCY BULLETIN: Confirmed outbreak contagion in Oakridge sector',
          'Studio A issues official shelter, rail evacuation, and FM 94.7 backup directives.'
        );
      }
    }

    // 4. Update Facilities & Global Comms Network Health from PowerGridStability & Overrun Cities
    const overrunRatio = ctx.cityStates.length > 0
      ? ctx.cityStates.filter((c) => c.dangerLevel === 'Overrun' || c.dangerLevel === 'Critical').length / ctx.cityStates.length
      : 0;
    const rawComms = Math.round(
      Math.max(18, Math.min(100, ctx.powerGridStability * 82 + (1 - overrunRatio) * 18))
    );
    this.commsHealthPct = rawComms;

    for (const fac of this.facilities) {
      if (fac.kind === 'emergency_center' || fac.kind === 'hq_tower') {
        fac.backupPowerOn = ctx.powerGridStability < 0.72 || fac.backupPowerOn;
        fac.operational = fac.backupPowerOn || ctx.powerGridStability > 0.25;
        fac.uplinkStrength = fac.operational ? Math.max(45, Math.min(100, rawComms + (fac.backupPowerOn ? 18 : 0))) : 12;
      } else {
        fac.operational = rawComms >= 35 || fac.backupPowerOn;
        fac.uplinkStrength = fac.operational ? Math.max(24, rawComms - (fac.kind === 'international_center' ? 12 : 4)) : 0;
      }
    }

    // 5. Recompute live channel outputs every ~0.5s (or immediately on first tick)
    this.refreshAccum += delta;
    if (this.channels.length === 0 || this.refreshAccum >= 0.5) {
      this.refreshAccum = 0;
      const repName = this.reporters.find((r) => r.id === this.liveIncidentReporterId)?.name || 'Marcus Reed';
      this.channels = NewsEventGenerator.generateAllChannels(
        ctx,
        this.worldPhase,
        this.asteroidStageIndex,
        this.liveIncidentStage,
        repName,
        this.commsHealthPct,
        this.channelStatuses
      );

      // Log milestone headline changes cleanly to persistent Broadcast History (deduped)
      const lead = this.channels[0];
      if (lead) {
        const key = `${this.worldPhase}:${this.asteroidStageIndex}:${this.liveIncidentStage}:${lead.headline}`;
        if (key !== this.lastLoggedKey) {
          this.lastLoggedKey = key;
          this.appendHistory(lead.definition.id, lead.priority, lead.headline, lead.bodyLines[0] || lead.subheadline);
        }
      }
    }
  }

  private appendHistory(
    channelId: MediaChannelId,
    priority: MediaBroadcastRecord['priority'],
    headline: string,
    summary: string
  ): void {
    const ch = MEDIA_CHANNEL_MAP[channelId];
    const day = this.lastContext ? Math.max(this.lastContext.dayCount, this.lastContext.campaignDay) : 1;
    const timeMinutes = this.lastContext?.gameTimeMinutes ?? 480;
    const h = Math.floor(timeMinutes / 60) % 24;
    const m = Math.floor(timeMinutes % 60);
    const timeString = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

    const duplicate = this.broadcastHistory[0]?.headline === headline && this.broadcastHistory[0]?.day === day;
    if (duplicate) return;

    this.broadcastHistory.unshift({
      id: `brk_${day}_${h}_${m}_${this.broadcastHistory.length + 1}`,
      channelId,
      channelName: ch?.name || 'Oakridge Media Network',
      day,
      timeString,
      phase: this.worldPhase,
      priority,
      headline,
      summary,
      presenter: ch?.leadPresenter || 'Studio Desk',
      region: this.lastContext?.nearestCityName || 'Oakridge Valley',
    });
    if (this.broadcastHistory.length > 60) {
      this.broadcastHistory.length = 60;
    }
  }

  public getWorldPhase(): MediaWorldPhase {
    return this.worldPhase;
  }

  public getLiveIncidentStage(): LiveReporterEventStage {
    return this.liveIncidentStage;
  }

  public getActiveChannelId(): MediaChannelId {
    return this.activeChannelId;
  }

  public getReporters(): ReporterNPCDescriptor[] {
    return this.reporters;
  }

  public getFacilities(): MediaFacilityStatus[] {
    return this.facilities;
  }

  public getSharedScreenFeed(channelId?: MediaChannelId): SharedBroadcastScreenFeed {
    const targetId = channelId ?? this.activeChannelId;
    const found =
      this.channels.find((c) => c.definition.id === targetId) ||
      this.channels[0];
    const chDef = MEDIA_CHANNEL_MAP[targetId] || MEDIA_CHANNELS[0];
    const mins = this.lastContext?.gameTimeMinutes ?? 480;
    const h = Math.floor(mins / 60) % 24;
    const m = Math.floor(mins % 60);
    const timeString = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    const dayCount = this.lastContext ? Math.max(this.lastContext.dayCount, this.lastContext.campaignDay) : 1;

    const liveIncidentBanner =
      this.liveIncidentStage !== 'standby'
        ? `LIVE INCIDENT: ${this.liveIncidentStage.replace(/_/g, ' ').toUpperCase()}`
        : null;

    if (!found) {
      return {
        channelId: chDef.id,
        channelName: chDef.name,
        badge: chDef.channelBadge,
        status: 'online',
        priority: 'normal',
        accentHex: chDef.accentHex,
        bannerBgHex: chDef.bannerBgHex,
        headline: `${chDef.name} Live Signal Ready`,
        subheadline: `Lead: ${chDef.leadPresenter}`,
        ticker: 'OAKRIDGE MEDIA NETWORK · SYNCHRONIZED CARRIER',
        lines: [chDef.description],
        signalStrengthPct: 100,
        worldPhase: this.worldPhase,
        liveIncidentStage: this.liveIncidentStage,
        liveIncidentBanner,
        timeString,
        dayCount,
      };
    }

    return {
      channelId: found.definition.id,
      channelName: found.definition.name,
      badge: found.definition.channelBadge,
      status: found.status,
      priority: found.priority,
      accentHex: found.definition.accentHex,
      bannerBgHex: found.definition.bannerBgHex,
      headline: found.headline,
      subheadline: found.subheadline,
      ticker: found.ticker,
      lines: found.bodyLines,
      signalStrengthPct: found.signalStrengthPct,
      worldPhase: this.worldPhase,
      liveIncidentStage: this.liveIncidentStage,
      liveIncidentBanner,
      timeString,
      dayCount,
    };
  }

  public getSnapshot(): GlobalMediaSnapshot {
    const stage = ASTEROID_MEDIA_STAGES[Math.max(0, Math.min(ASTEROID_MEDIA_STAGES.length - 1, this.asteroidStageIndex))];
    const repName = this.reporters.find((r) => r.id === this.liveIncidentReporterId)?.name || 'Marcus Reed';
    const mins = this.lastContext?.gameTimeMinutes ?? 480;
    const h = Math.floor(mins / 60) % 24;
    const m = Math.floor(mins % 60);

    return {
      worldPhase: this.worldPhase,
      activeChannelId: this.activeChannelId,
      activeRadioChannelId: this.activeRadioChannelId,
      asteroidStageIndex: this.asteroidStageIndex,
      asteroidStageId: stage.id as AsteroidMediaStageId,
      asteroidStageTitle: stage.title,
      asteroidStageSummary: stage.summary,
      liveIncidentStage: this.liveIncidentStage,
      liveIncidentTimer: this.liveIncidentTimer,
      liveIncidentReporterName: repName,
      liveIncidentHeadline:
        this.liveIncidentStage === 'standby'
          ? null
          : this.channels.find((c) => c.definition.id === 'oakridge_news_24')?.headline ?? null,
      commsHealthPct: this.commsHealthPct,
      dayCount: this.lastContext ? Math.max(this.lastContext.dayCount, this.lastContext.campaignDay) : 1,
      timeString: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`,
      channels: this.channels.map((c) => ({ ...c, bodyLines: [...c.bodyLines] })),
      facilities: this.facilities.map((f) => ({ ...f, coordinates: [...f.coordinates] })),
      reporters: this.reporters.map((r) => ({ ...r, position: [...r.position] })),
      vehicles: this.vehicles.map((v) => ({ ...v, position: [...v.position], crewNames: [...v.crewNames] })),
      broadcastHistory: this.broadcastHistory.map((hItem) => ({ ...hItem })),
      emergencyRecordings: this.emergencyRecordings.map((rec) => ({ ...rec })),
      interactedTerminalIds: Array.from(this.interactedTerminalIds),
      inspectedStudioIds: Array.from(this.inspectedStudioIds),
    };
  }

  public exportSaveData(): MediaSaveData {
    const channelStatuses: MediaSaveData['channelStatuses'] = {};
    for (const ch of this.channels) {
      channelStatuses[ch.definition.id] = ch.status;
    }
    const facilityStates: MediaSaveData['facilityStates'] = {};
    for (const fac of this.facilities) {
      facilityStates[fac.id] = {
        operational: fac.operational,
        backupPowerOn: fac.backupPowerOn,
        uplinkStrength: fac.uplinkStrength,
      };
    }
    const reporterStates: MediaSaveData['reporterStates'] = {};
    for (const rep of this.reporters) {
      reporterStates[rep.id] = {
        assignment: rep.assignment,
        locationLabel: rep.locationLabel,
        position: [...rep.position],
        status: rep.status,
        infectionTimer: rep.infectionTimer,
        talkedToPlayer: rep.talkedToPlayer,
      };
    }

    return {
      version: 1,
      activeChannelId: this.activeChannelId,
      activeRadioChannelId: this.activeRadioChannelId,
      worldPhase: this.worldPhase,
      asteroidStageIndex: this.asteroidStageIndex,
      liveIncidentStage: this.liveIncidentStage,
      liveIncidentTimer: this.liveIncidentTimer,
      liveIncidentReporterId: this.liveIncidentReporterId,
      channelStatuses,
      facilityStates,
      reporterStates,
      broadcastHistory: this.broadcastHistory.map((b) => ({ ...b })),
      emergencyRecordings: this.emergencyRecordings.map((r) => ({ ...r })),
      interactedTerminalIds: Array.from(this.interactedTerminalIds),
      inspectedStudioIds: Array.from(this.inspectedStudioIds),
      commsHealthPct: this.commsHealthPct,
      lastUpdatedAt: this.lastUpdatedAt,
    };
  }

  public importSaveData(saved?: MediaSaveData | null): void {
    if (!saved) return;
    if (saved.activeChannelId && MEDIA_CHANNEL_MAP[saved.activeChannelId as MediaChannelId]) {
      this.activeChannelId = saved.activeChannelId as MediaChannelId;
    }
    if (saved.activeRadioChannelId && MEDIA_CHANNEL_MAP[saved.activeRadioChannelId as MediaChannelId]) {
      this.activeRadioChannelId = saved.activeRadioChannelId as MediaChannelId;
    }
    if (saved.worldPhase) {
      this.worldPhase = saved.worldPhase;
    }
    if (Number.isFinite(saved.asteroidStageIndex)) {
      this.asteroidStageIndex = Math.max(0, Math.min(ASTEROID_MEDIA_STAGES.length - 1, saved.asteroidStageIndex));
    }
    if (saved.liveIncidentStage) {
      this.liveIncidentStage = saved.liveIncidentStage as LiveReporterEventStage;
      this.liveIncidentTriggered = saved.liveIncidentStage !== 'standby';
    }
    if (Number.isFinite(saved.liveIncidentTimer)) {
      this.liveIncidentTimer = saved.liveIncidentTimer;
    }
    if (saved.liveIncidentReporterId) {
      this.liveIncidentReporterId = saved.liveIncidentReporterId;
    }
    if (saved.facilityStates) {
      for (const fac of this.facilities) {
        const fs = saved.facilityStates[fac.id];
        if (fs) {
          fac.operational = Boolean(fs.operational);
          fac.backupPowerOn = Boolean(fs.backupPowerOn);
          fac.uplinkStrength = Number.isFinite(fs.uplinkStrength) ? fs.uplinkStrength : fac.uplinkStrength;
        }
      }
    }
    if (saved.reporterStates) {
      for (const rep of this.reporters) {
        const rs = saved.reporterStates[rep.id];
        if (rs) {
          rep.assignment = rs.assignment || rep.assignment;
          rep.locationLabel = rs.locationLabel || rep.locationLabel;
          if (Array.isArray(rs.position) && rs.position.length === 3) {
            rep.position = [rs.position[0], rs.position[1], rs.position[2]];
          }
          rep.status = rs.status || rep.status;
          rep.infectionTimer = Number.isFinite(rs.infectionTimer) ? rs.infectionTimer : 0;
          rep.talkedToPlayer = Boolean(rs.talkedToPlayer);
        }
      }
    }
    if (Array.isArray(saved.broadcastHistory)) {
      this.broadcastHistory = saved.broadcastHistory.map((b) => ({
        ...b,
        channelId: (b.channelId as MediaChannelId) || 'oakridge_news_24',
        phase: (b.phase as MediaWorldPhase) || 'normal_world',
      }));
    }
    if (Array.isArray(saved.emergencyRecordings) && saved.emergencyRecordings.length > 0) {
      this.emergencyRecordings = saved.emergencyRecordings.map((r) => ({
        ...r,
        channelId: (r.channelId as MediaChannelId) || 'oakridge_radio',
      }));
    }
    this.interactedTerminalIds = new Set(saved.interactedTerminalIds || []);
    this.inspectedStudioIds = new Set(saved.inspectedStudioIds || []);
    if (Number.isFinite(saved.commsHealthPct)) {
      this.commsHealthPct = saved.commsHealthPct;
    }
  }

  public reset(dayCount: number = 1): void {
    this.worldPhase = dayCount >= 5 ? 'late_stage' : dayCount >= 3 ? 'outbreak' : dayCount === 2 ? 'asteroid_approaching' : 'normal_world';
    this.asteroidStageIndex = dayCount >= 3 ? 8 : dayCount === 2 ? 2 : 0;
    this.liveIncidentStage = 'standby';
    this.liveIncidentTimer = 0;
    this.liveIncidentTriggered = false;
    this.broadcastHistory = [];
    this.lastLoggedKey = '';
    this.refreshAccum = 1.0;
    this.reporters = DEFAULT_REPORTERS.map((r) => ({ ...r, position: [...r.position] }));
    this.facilities = DEFAULT_FACILITIES.map((f) => ({ ...f, coordinates: [...f.coordinates] }));
    if (this.lastContext) {
      this.lastContext = {
        ...this.lastContext,
        dayCount,
        campaignDay: dayCount,
        isOutbreakActive: dayCount >= 3,
        cityOutbreakStarted: dayCount >= 3,
        meteorImpacted: dayCount >= 3,
        meteorInFlight: dayCount === 2,
      };
      this.channels = NewsEventGenerator.generateAllChannels(
        this.lastContext,
        this.worldPhase,
        this.asteroidStageIndex,
        this.liveIncidentStage,
        'Marcus Reed',
        this.commsHealthPct,
        this.channelStatuses
      );
    } else {
      this.channels = [];
    }
  }
}
