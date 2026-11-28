import {
  MEDIA_CHANNELS,
  ASTEROID_MEDIA_STAGES,
  getProgramForHour,
} from './MediaChannelRegistry';
import type {
  ChannelOperationalStatus,
  LiveReporterEventStage,
  MediaChannelId,
  MediaChannelLiveState,
  MediaWorldInputContext,
  MediaWorldPhase,
} from './MediaTypes';

function formatCompactCount(n: number): string {
  if (!Number.isFinite(n)) return '0';
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return `${Math.round(n)}`;
}

function weatherLabel(w: MediaWorldInputContext['weatherType']): string {
  switch (w) {
    case 'thunderstorm':
      return 'Severe Thunderstorm';
    case 'rain':
      return 'Heavy Rainfall';
    case 'blizzard':
      return 'Polar Blizzard';
    case 'sandstorm':
      return 'Dust / Sandstorm';
    case 'toxic_fog':
      return 'Dense Particulate Fog';
    default:
      return 'Clear Atmospheric Skies';
  }
}

export class NewsEventGenerator {
  public static generateAllChannels(
    ctx: MediaWorldInputContext,
    phase: MediaWorldPhase,
    asteroidStageIndex: number,
    liveIncidentStage: LiveReporterEventStage,
    liveIncidentReporterName: string,
    commsHealthPct: number,
    customStatuses: Partial<Record<MediaChannelId, ChannelOperationalStatus>>
  ): MediaChannelLiveState[] {
    const hour = Math.floor(ctx.gameTimeMinutes / 60) % 24;
    const gm = ctx.globalMetrics;
    const pop = ctx.populationState;
    const impactedSites = pop.asteroidImpacts.filter((i) => i.impacted);
    const activeCities = ctx.cityStates;
    const overrunCount = activeCities.filter((c) => c.dangerLevel === 'Overrun' || c.dangerLevel === 'Critical').length;
    const containmentCount = activeCities.filter((c) => c.dangerLevel === 'Containment' || c.dangerLevel === 'Alert').length;
    const worstCity =
      [...activeCities].sort((a, b) => (b.infectedCount + b.transformingCount) - (a.infectedCount + a.transformingCount))[0];
    const gridPct = Math.round(Math.max(0, Math.min(1, ctx.powerGridStability)) * 100);
    const stageSpec = ASTEROID_MEDIA_STAGES[Math.max(0, Math.min(ASTEROID_MEDIA_STAGES.length - 1, asteroidStageIndex))];

    return MEDIA_CHANNELS.map((ch) => {
      const slot = getProgramForHour(ch, hour);
      const isRadio = ch.id === 'oakridge_radio';

      let status: ChannelOperationalStatus = customStatuses[ch.id] ?? 'online';
      if (!customStatuses[ch.id]) {
        if (phase === 'late_stage') {
          status = isRadio ? 'automated_loop' : commsHealthPct < 35 ? 'offline' : 'automated_loop';
        } else if (phase === 'asteroid_impact' && asteroidStageIndex === 5 && !isRadio) {
          status = 'offline';
        } else if (phase === 'outbreak' && commsHealthPct < 55) {
          status = isRadio ? 'eas_override' : 'degraded';
        } else if (phase === 'asteroid_impact' || (phase === 'asteroid_approaching' && asteroidStageIndex >= 3)) {
          status = isRadio ? 'eas_override' : 'degraded';
        }
      }

      const signalBase =
        status === 'offline'
          ? 0
          : status === 'automated_loop'
            ? (isRadio ? 64 : 28)
            : status === 'degraded'
              ? Math.max(32, Math.round(commsHealthPct * 0.85))
              : Math.max(72, Math.round(commsHealthPct));

      let headline = `${ch.name} Live Coverage`;
      let subheadline = slot.programTitle;
      let ticker = 'OAKRIDGE MEDIA NETWORK · LIVE SYNCHRONIZED FEED';
      let bodyLines: string[] = [];
      let priority: MediaChannelLiveState['priority'] = 'normal';
      let isLiveFieldFeed = false;
      const regionTag = ch.id === 'worldwatch_intl' ? 'GLOBAL' : ctx.nearestCityName || 'OAKRIDGE VALLEY';

      // Handle Late-Stage Interrupted / Automated Recordings
      if (phase === 'late_stage') {
        priority = 'emergency';
        if (status === 'offline') {
          headline = `${ch.name.toUpperCase()} — CARRIER LOST`;
          subheadline = 'No studio uplink · Grid power critical';
          ticker = `TRANSMISSION INTERRUPTED · POWER GRID ${gridPct}% · TUNE FM 94.7 FOR AUTOMATED EMERGENCY CARRIER`;
          bodyLines = [
            `SIGNAL STATUS: NO CARRIER (${ch.channelBadge})`,
            `GLOBAL INFECTED: ${formatCompactCount(gm.totalInfected)} · OVERRUN CITIES: ${overrunCount}`,
            `IMPACTED ZONES LOGGED: ${impactedSites.length} · COMMS INTEGRITY: ${commsHealthPct}%`,
            `BACKUP INSTRUCTION: TUNE TO OAKRIDGE RADIO FM 94.7`,
          ];
        } else {
          headline = isRadio
            ? 'OAKRIDGE RADIO FM 94.7 · AUTOMATED SURVIVAL LOOP'
            : `${ch.name.toUpperCase()} · INTERMITTENT BACKUP CARRIER`;
          subheadline = 'Recorded Emergency Civil Defense Broadcast';
          ticker = `AUTOMATED EAS LOOP · DAY ${ctx.dayCount} · ACTIVE SURVIVORS REPORT TO PROTECTED SANCTUARY SECTORS · GRID ${gridPct}%`;
          bodyLines = [
            `[RECORDED BULLETIN · BACKUP DIESEL TRANSMITTER ACTIVE]`,
            `HEALTHY GLOBAL POP: ${formatCompactCount(gm.totalHealthy)} · TRANSFORMING: ${formatCompactCount(gm.totalTransforming)}`,
            `TRAIN CORRIDORS ACTIVE: ${ctx.activeTrainCount}/6 · DELAYED: ${ctx.delayedTrainCount}`,
            `STAY INSIDE FORTIFIED ZONES AFTER NIGHTFALL (10s CONVERSION WINDOW)`,
          ];
        }
        return {
          definition: ch,
          status,
          signalStrengthPct: signalBase,
          currentProgram: slot.programTitle,
          currentPresenter: status === 'automated_loop' ? 'Automated EAS System' : slot.hostName,
          headline,
          subheadline,
          ticker,
          bodyLines,
          regionTag,
          priority,
          isLiveFieldFeed: false,
        };
      }

      // Live Field Reporter Incident Override on News 24 / Local 6 / WorldWatch
      if (
        liveIncidentStage !== 'standby' &&
        (ch.id === 'oakridge_news_24' || ch.id === 'oakridge_local')
      ) {
        isLiveFieldFeed = liveIncidentStage !== 'studio_emergency_bulletin' && liveIncidentStage !== 'feed_lost';
        if (liveIncidentStage === 'normal_report') {
          priority = 'breaking';
          headline = `LIVE FIELD REPORT: ${liveIncidentReporterName} at Oakridge Perimeter`;
          subheadline = 'Live ENG Van Uplink · Emergency Response Cordon';
          ticker = `LIVE: ${liveIncidentReporterName.toUpperCase()} REPORTS ON LOCAL EMERGENCY PERIMETER · UNITS ON SCENE`;
          bodyLines = [
            `REPORTER: "${liveIncidentReporterName} reporting live from the Oakridge response cordon."`,
            `STATUS: Municipal police and fire units securing the roadway.`,
            `CITY TELEMETRY: ${ctx.nearestCityName} grid at ${gridPct}% · Weather: ${weatherLabel(ctx.weatherType)}.`,
            `CAMERA CREW: Audio and satellite link nominal (ENG Unit 01).`,
          ];
        } else if (liveIncidentStage === 'camera_anomaly') {
          priority = 'breaking';
          headline = `ALERT ON LIVE FEED: Crew Observes Unstable Subject Near Cordon`;
          subheadline = `Field Camera 01 · ${liveIncidentReporterName}`;
          ticker = `BREAKING: CAMERA OPERATOR SPOTS ERRATIC MOVEMENT BEHIND CORDON LINE`;
          bodyLines = [
            `CAMERA OPERATOR: "Wait—keep the lens right there behind the barrier!"`,
            `REPORTER (${liveIncidentReporterName}): "An individual inside the cordon is trembling and unresponsive."`,
            `DISPATCH: Medical & security responders moving closer to check vitals.`,
            `STUDIO CONTROL: Hold live feed—monitoring biometric telemetry.`,
          ];
        } else if (liveIncidentStage === 'signal_interference') {
          priority = 'emergency';
          headline = `SIGNAL INTERFERENCE — FIELD AUDIO BREAKING UP`;
          subheadline = `ENG Uplink Unstable · Trying to Maintain Feed`;
          ticker = `WARNING: FIELD LINK DEGRADING · RAPID CROWD DISPERSAL REPORTED ON SCENE`;
          bodyLines = [
            `REPORTER: "People are running back from the perimeter—camera stay wide—"`,
            `AUDIO LINK: [STATIC BURST] ... "Stay behind the vehicle!" ...`,
            `UPLINK TELEMETRY: Packet loss rising (${Math.max(22, signalBase - 35)}% link quality).`,
            `STUDIO ANCHOR: "${liveIncidentReporterName}, do you copy? Stand by for studio cut."`,
          ];
        } else if (liveIncidentStage === 'studio_reconnect') {
          priority = 'emergency';
          headline = `RECONNECTING STUDIO LINK TO FIELD CREW...`;
          subheadline = 'Satellite Uplink Recovery Attempt in Progress';
          ticker = `STUDIO CONTROL: ATTEMPTING BACKUP CARRIER RECONNECT WITH ${liveIncidentReporterName.toUpperCase()}`;
          bodyLines = [
            `ANCHOR (${ch.leadPresenter}): "We are trying to re-establish contact with our crew in Oakridge."`,
            `CONTROL ROOM: Routing backup microwave relay via Media Tower Roof Array.`,
            `SECURITY ALERT: Nearby civilian infection timer triggered under outbreak protocol.`,
            `PLEASE STAND BY FOR EMERGENCY STUDIO VERIFICATION.`,
          ];
        } else if (liveIncidentStage === 'outbreak_conversion') {
          priority = 'emergency';
          headline = `CRITICAL INCIDENT: Field Perimeter Compromised`;
          subheadline = 'Containment Breach Verified · Non-Graphic Telemetry Lock';
          ticker = `EMERGENCY: PERIMETER BREACH CONFIRMED IN OAKRIDGE · ALL CREWS ORDERED TO EVACUATE`;
          bodyLines = [
            `TELEMETRY: Exposed field subject transitioned under active pathogen timer.`,
            `CAMERA FEED CUT TO WIDE TOWER CAM FOR VIEWER SAFETY.`,
            `GLOBAL OUTBREAK TRACKER: ${formatCompactCount(gm.totalInfected)} infected · ${formatCompactCount(gm.totalTransforming)} turning.`,
            `BROADCAST CONTROL: Switching primary output back to Studio A.`,
          ];
        } else if (liveIncidentStage === 'feed_lost') {
          priority = 'emergency';
          headline = `LIVE FIELD FEED LOST — UPLINK TERMINATED`;
          subheadline = `${liveIncidentReporterName} Transponder Offline`;
          ticker = `SIGNAL LOST FROM OAKRIDGE FIELD UNIT · ALL PERSONNEL ORDERED TO LOCK DOORS`;
          bodyLines = [
            `STATUS: ENG FIELD FEED TERMINATED AT PERIMETER`,
            `STUDIO CONTROL: Returning immediately to ${ch.leadPresenter} in Studio A.`,
            `LOCAL DIRECTIVE: Avoid crater & unguarded streets · Monitor FM 94.7.`,
            `EMERGENCY SERVICES: Police & military checkpoints shifting to containment posture.`,
          ];
        } else {
          priority = 'emergency';
          headline = `STUDIO EMERGENCY BULLETIN — CONFIRMED CONTAGION EVENT`;
          subheadline = `Anchored by ${ch.leadPresenter} · Civil Defense Protocol Active`;
          ticker = `EMERGENCY BULLETIN: CONFIRMED BIO-HOSTILE INCIDENT IN OAKRIDGE · SEEK SHELTER IMMEDIATELY`;
          bodyLines = [
            `${ch.leadPresenter.toUpperCase()}: "We must report that live field coverage in Oakridge has been lost."`,
            `OFFICIAL ADVISORY: Exposed individuals show a ${ctx.isNight ? '10s night' : '60s daytime'} conversion window.`,
            `EVACUATION CORRIDORS: Railway lines running (${ctx.activeTrainCount}/6 active); follow official beacons.`,
            `NEXT UPDATE: Continuous rolling coverage across all 6 Media Network channels.`,
          ];
        }

        return {
          definition: ch,
          status: liveIncidentStage === 'signal_interference' ? 'degraded' : 'eas_override',
          signalStrengthPct: liveIncidentStage === 'feed_lost' ? 42 : signalBase,
          currentProgram: 'BREAKING LIVE COVERAGE',
          currentPresenter: isLiveFieldFeed ? liveIncidentReporterName : ch.leadPresenter,
          headline,
          subheadline,
          ticker,
          bodyLines,
          regionTag,
          priority,
          isLiveFieldFeed,
        };
      }

      // Per-Channel Dynamic Content Driven Strictly By Live World State
      switch (ch.id) {
        case 'oakridge_news_24': {
          if (phase === 'normal_world') {
            priority = 'normal';
            headline = `Oakridge Enjoys Calm Morning · Transit & Civic Services Nominal`;
            subheadline = `${slot.programTitle} · Anchor: ${slot.hostName}`;
            ticker = `OAKRIDGE RAILWAYS: ${ctx.activeTrainCount}/6 TRAINS ON SCHEDULE · GRID STABILITY ${gridPct}% · OBSERVATORIES TRACK DISTANT SKY OBJECT`;
            bodyLines = [
              `CIVIC REPORT: All schools, clinics, and municipal offices operating normally.`,
              `RAILWAY NETWORK: ${ctx.activeTrainCount} active express services across Earth corridor (${ctx.delayedTrainCount} delays).`,
              `GLOBAL POPULATION: ${formatCompactCount(gm.totalHealthy)} healthy civilians monitored worldwide.`,
              `SCIENCE NOTE: Deep-sky observatories logged a faint high-altitude object (low risk).`,
            ];
          } else if (phase === 'asteroid_approaching' || phase === 'asteroid_impact') {
            priority = stageSpec.priority;
            headline = stageSpec.title;
            subheadline = stageSpec.summary;
            ticker = `ASTEROID TRACKING: ${stageSpec.title.toUpperCase()} · POWER GRID ${gridPct}% · IMPACTED SITES: ${impactedSites.length}`;
            bodyLines = [
              stageSpec.summary,
              `RAILWAY OPS: ${ctx.activeTrainCount} trains active · ${ctx.delayedTrainCount} held for seismic safety checks.`,
              `CIVIL ADVISORY: Follow Mayor Wilson & Oakridge Emergency Directives.`,
              `COMMS NETWORK: Satellite & terrestrial relay health at ${commsHealthPct}%.`,
            ];
          } else {
            priority = 'emergency';
            headline = `CRISIS DESK: ${overrunCount} Global Cities Overrun · Containment Active`;
            subheadline = `${formatCompactCount(gm.totalInfected)} Confirmed Infected · ${formatCompactCount(gm.totalTransforming)} Turning`;
            ticker = `BREAKING: ${formatCompactCount(gm.totalInfected)} INFECTED WORLDWIDE · ${formatCompactCount(gm.totalEvacuated)} EVACUATED · GRID ${gridPct}%`;
            bodyLines = [
              `WORST AFFECTED HUB: ${worstCity ? `${worstCity.city.name} (${worstCity.dangerLevel})` : 'Monitoring'}`,
              `PATHOGEN TIMELINE: ${ctx.isNight ? '10s night' : '60s day'} biological transition window confirmed.`,
              `RAIL & ESCAPE: ${ctx.activeTrainCount} Sanctuary corridor trains still operating.`,
              `SHELTER GUIDANCE: Fortify doors, keep radios charged, avoid unlit streets.`,
            ];
          }
          break;
        }

        case 'oakridge_weather': {
          const wName = weatherLabel(ctx.weatherType);
          const severeWeather = ctx.weatherType !== 'clear' || phase === 'asteroid_impact' || phase === 'outbreak';
          priority = severeWeather ? 'advisory' : 'normal';
          headline = `${wName} · Visibility ${Math.round(ctx.visibilityPercent)}%`;
          subheadline = `${slot.programTitle} · Meteorologist: ${slot.hostName}`;
          ticker = `WEATHER RADAR: ${wName.toUpperCase()} · VISIBILITY ${Math.round(ctx.visibilityPercent)}% · GRID ${gridPct}%`;
          bodyLines = [
            `CURRENT CONDITION: ${wName} across ${ctx.nearestCityName || 'Oakridge Valley'}.`,
            `VISIBILITY INDEX: ${Math.round(ctx.visibilityPercent)}% · Severity ${(ctx.weatherSeverity * 100).toFixed(0)}%.`,
            phase === 'normal_world'
              ? `OUTLOOK: Mild evening breeze, ideal visibility for Valley Park & rail travel.`
              : `ATMOSPHERIC NOTE: Particulate dust & thermal anomalies detected along Sector 4 ridge.`,
            `SAFETY: Adjust driving & flight speed when visibility falls below 65%.`,
          ];
          break;
        }

        case 'worldwatch_intl': {
          const focusCities = activeCities.slice(0, 4);
          priority = phase === 'outbreak' ? 'emergency' : phase === 'asteroid_approaching' || phase === 'asteroid_impact' ? 'breaking' : 'normal';
          headline =
            phase === 'normal_world'
              ? `Global Metro Corridors Operating Smoothly Across ${activeCities.length} Hubs`
              : `WORLDWATCH ALERT: ${overrunCount} Overrun · ${containmentCount} Containment Zones`;
          subheadline = `${slot.programTitle} · ${slot.hostName}`;
          ticker = focusCities
            .map((c) => `${c.city.name.toUpperCase()}: ${c.dangerLevel.toUpperCase()} (${formatCompactCount(c.healthyCount)} HEALTHY)`)
            .join(' · ');
          bodyLines = focusCities.map(
            (c) =>
              `${c.city.name} (${c.city.country}): ${c.dangerLevel} · Healthy ${formatCompactCount(c.healthyCount)} · Infected ${formatCompactCount(c.infectedCount)}`
          );
          if (bodyLines.length === 0) {
            bodyLines.push('Monitoring international metropolitan nodes via satellite telemetry.');
          }
          break;
        }

        case 'discovery_science': {
          priority = phase === 'normal_world' ? 'normal' : phase === 'outbreak' ? 'breaking' : 'advisory';
          headline =
            phase === 'normal_world'
              ? `Orbital Survey: Uncatalogued Deep-Space Bolide Under Observation`
              : phase === 'asteroid_approaching'
                ? `Dr. Thorne: Atmospheric Entry Vector Converging Near Sector 4`
                : `Meteorite Mineral & Pathogen Telemetry · ${impactedSites.length} Crater Sites`;
          subheadline = `${slot.programTitle} · ${slot.hostName}`;
          ticker = `DISCOVERY SCIENCE: DAY ${ctx.dayCount} · IMPACT SITES ${impactedSites.length} · POP GROWTH 3.0x / ZOMBIE RATE 2.0x TRACKED`;
          bodyLines = [
            phase === 'normal_world'
              ? `TELESCOPE DATA: Object trajectory remains outside inner lunar corridor; monitoring continues.`
              : `SPECTROMETRY: Extraterrestrial mineral resonance linked to rapid cellular shock.`,
            `DEMOGRAPHICS MODEL: ${formatCompactCount(gm.totalPopulation)} tracked across ${activeCities.length} global nodes.`,
            `CONVERSION WINDOW: Observed biological stagger lasts ${gm.activeConversionSeconds}s (${ctx.isNight ? 'night' : 'day'}).`,
            `RESEARCH LABS: Military Outpost 7 bio-containment lab analyzing core fragments.`,
          ];
          break;
        }

        case 'oakridge_radio': {
          priority = phase === 'normal_world' ? 'normal' : 'emergency';
          headline =
            phase === 'normal_world'
              ? `Oakridge Radio 94.7 FM · Traffic, Rail & Valley Community Carrier`
              : `94.7 FM CIVIL EMERGENCY CARRIER · BACKUP GENERATOR ONLINE`;
          subheadline = `${slot.programTitle} · Host: ${slot.hostName}`;
          ticker =
            phase === 'normal_world'
              ? `94.7 FM: MAIN AVENUE TRAFFIC CLEAR · ${ctx.activeTrainCount} TRAINS ACTIVE · WEATHER ${weatherLabel(ctx.weatherType).toUpperCase()}`
              : `94.7 FM EAS: REPORT TO PROTECTED COMPOUNDS · ${ctx.activeTrainCount} TRAINS RUNNING · COMMS ${commsHealthPct}%`;
          bodyLines = [
            `FREQUENCY: 94.7 MHz FM / Shortwave Civil Band 462.5 MHz`,
            `POWER SOURCE: ${gridPct > 65 ? 'Municipal Grid Primary' : 'Tower Diesel Backup Bank'} (${gridPct}%)`,
            `RAILWAY ADVISORY: ${ctx.activeTrainCount} trains circulating; ${ctx.delayedTrainCount} delayed.`,
            phase === 'normal_world'
              ? `COMMUNITY: Valley Community Clinic & Pine Elementary operating normal hours.`
              : `EMERGENCY: Avoid Crater Sector (110, 80); tune here for continuous survivor directives.`,
          ];
          break;
        }

        case 'oakridge_local': {
          priority = phase === 'normal_world' ? 'normal' : 'breaking';
          headline =
            phase === 'normal_world'
              ? `Oakridge Local: Morning Markets Open · Mayor Announces Park Weekend`
              : `OAKRIDGE LOCAL ALERT: Police Cordon & Clinic Triage Active`;
          subheadline = `${slot.programTitle} · ${slot.hostName}`;
          ticker = `OAKRIDGE LOCAL CH 06: CLINIC OPEN · TOWN HALL MONITORING CORRIDORS · VISIBILITY ${Math.round(ctx.visibilityPercent)}%`;
          bodyLines = [
            `LOCAL DISTRICTS: Main Avenue, Corner Cafe, Fresh Market & Pine Elementary.`,
            `PUBLIC SERVICES: Officer Davis & Fire Captain Ray coordinating municipal patrols.`,
            phase === 'normal_world'
              ? `NEIGHBOURHOOD: Quiet Saturday routines across Oakridge Park & Central Square.`
              : `CIVIC DIRECTIVE: Follow Valley Community Clinic triage & police cordon advisories.`,
            `MEDIA HQ: Broadcast live from Oakridge Media Tower Plaza (East Avenue).`,
          ];
          break;
        }
      }

      return {
        definition: ch,
        status,
        signalStrengthPct: signalBase,
        currentProgram: slot.programTitle,
        currentPresenter: slot.hostName,
        headline,
        subheadline,
        ticker,
        bodyLines,
        regionTag,
        priority,
        isLiveFieldFeed,
      };
    });
  }
}
