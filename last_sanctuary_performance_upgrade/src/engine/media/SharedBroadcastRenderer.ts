import type { SharedBroadcastScreenFeed } from './MediaTypes';

/**
 * Shared Canvas2D Broadcast Feed Renderer used across all 3D screens in the world:
 * - Oakridge Media Tower studio backdrops & broadcast control video wall
 * - Oakridge Town civic/clinic/shop/cafe public monitors
 * - Aurelion Floor 1 / Floor 6 / Basement TVs (when tuned to live news)
 * - Military Outpost 7 command monitor & Railway Command screens
 */
export function drawSharedBroadcastCanvas(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  feed: SharedBroadcastScreenFeed,
  options?: { compact?: boolean; timePhase?: number }
): void {
  const compact = Boolean(options?.compact);
  const t = options?.timePhase ?? 0;
  const isEmergency = feed.priority === 'emergency' || feed.priority === 'breaking';
  const isOffline = feed.status === 'offline';

  // Background
  ctx.fillStyle = isOffline ? '#0b0e14' : isEmergency ? '#16070a' : '#071321';
  ctx.fillRect(0, 0, w, h);

  if (isOffline) {
    // SMPTE/static diagnostic bars with outage message
    const barColors = ['#1e293b', '#334155', '#0f172a', '#475569', '#1e293b', '#0f172a'];
    const bw = w / barColors.length;
    ctx.globalAlpha = 0.35;
    barColors.forEach((c, i) => {
      ctx.fillStyle = c;
      ctx.fillRect(i * bw, 0, bw, h);
    });
    ctx.globalAlpha = 1;

    ctx.fillStyle = '#dc2626';
    ctx.fillRect(0, 0, w, Math.max(28, h * 0.16));
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${compact ? 14 : 18}px monospace`;
    ctx.fillText(`${feed.channelName.toUpperCase()} · SIGNAL LOST`, 12, compact ? 22 : 30);

    ctx.fillStyle = '#f87171';
    ctx.font = `bold ${compact ? 12 : 16}px monospace`;
    ctx.fillText(feed.headline.slice(0, 44), 14, h * 0.48);
    ctx.fillStyle = '#cbd5e1';
    ctx.font = `${compact ? 11 : 13}px monospace`;
    ctx.fillText('TUNE OAKRIDGE RADIO FM 94.7 FOR EMERGENCY CARRIER', 14, h * 0.65);
    return;
  }

  // Header Banner
  const headerH = compact ? 30 : 46;
  ctx.fillStyle = isEmergency ? '#b91c1c' : feed.bannerBgHex;
  ctx.fillRect(0, 0, w, headerH);

  // Live indicator + Channel badge
  const pulseOn = Math.sin(t * 5.0) > -0.2;
  ctx.fillStyle = pulseOn ? (isEmergency ? '#fef08a' : '#22c55e') : '#64748b';
  ctx.beginPath();
  ctx.arc(14, headerH * 0.5, compact ? 4 : 5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${compact ? 12 : 18}px sans-serif`;
  ctx.fillText(`${feed.channelName.toUpperCase()} [${feed.badge}]`, 26, compact ? 20 : 29);

  ctx.fillStyle = '#e2e8f0';
  ctx.font = `bold ${compact ? 10 : 13}px monospace`;
  const rightStamp = `DAY ${feed.dayCount} · ${feed.timeString} · SIG ${feed.signalStrengthPct}%`;
  const stampW = ctx.measureText(rightStamp).width;
  ctx.fillText(rightStamp, Math.max(180, w - stampW - 12), compact ? 20 : 28);

  // Headline Card
  let cy = headerH + (compact ? 18 : 28);
  ctx.fillStyle = isEmergency ? '#fde047' : feed.accentHex;
  ctx.font = `bold ${compact ? 12 : 16}px sans-serif`;
  ctx.fillText(feed.headline.slice(0, compact ? 42 : 58), 14, cy);

  cy += compact ? 16 : 22;
  ctx.fillStyle = '#cbd5e1';
  ctx.font = `${compact ? 10 : 13}px monospace`;
  ctx.fillText(feed.subheadline.slice(0, compact ? 46 : 64), 14, cy);

  // Body telemetry lines
  cy += compact ? 18 : 26;
  const maxLines = compact ? 2 : 4;
  ctx.font = `${compact ? 10 : 13}px monospace`;
  for (let i = 0; i < Math.min(maxLines, feed.lines.length); i++) {
    ctx.fillStyle = i === 0 ? '#f1f5f9' : '#94a3b8';
    ctx.fillText(feed.lines[i].slice(0, compact ? 46 : 64), 14, cy);
    cy += compact ? 15 : 22;
  }

  // Live Reporter Incident Callout if active
  if (feed.liveIncidentBanner && !compact) {
    ctx.fillStyle = '#7f1d1d';
    ctx.fillRect(12, h - 74, w - 24, 24);
    ctx.fillStyle = '#fef08a';
    ctx.font = 'bold 12px monospace';
    ctx.fillText(feed.liveIncidentBanner.slice(0, 62), 18, h - 57);
  }

  // Bottom Ticker Ribbon
  const tickerH = compact ? 24 : 38;
  ctx.fillStyle = isEmergency ? '#7f1d1d' : '#0f172a';
  ctx.fillRect(0, h - tickerH, w, tickerH);
  ctx.strokeStyle = isEmergency ? '#ef4444' : feed.accentHex;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, h - tickerH);
  ctx.lineTo(w, h - tickerH);
  ctx.stroke();

  ctx.fillStyle = isEmergency ? '#fef08a' : '#e2e8f0';
  ctx.font = `bold ${compact ? 10 : 13}px monospace`;
  ctx.fillText(feed.ticker.slice(0, compact ? 46 : 68), 12, h - (compact ? 8 : 13));
}
