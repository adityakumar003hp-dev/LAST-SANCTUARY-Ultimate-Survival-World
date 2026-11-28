import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Tv,
  Youtube,
  Film,
  Globe,
  Radio,
  Power,
  X,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Upload,
  Search,
  Sparkles,
  Home,
  AlertTriangle,
  MonitorPlay,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  ArrowLeft,
  Plus,
  Check,
  Subtitles,
  SkipBack,
  SkipForward,
  Star,
} from 'lucide-react';
import type { AurelionDashboardSnapshot } from '../engine/aurelion/AurelionSystems';
import type { GlobalMediaSnapshot, MediaChannelId } from '../engine/media/MediaTypes';

export type CinemaTab = 'home' | 'youtube' | 'news' | 'media' | 'ott' | 'estate';
export type StreamingServiceId = 'netflix' | 'disney' | 'prime';

export interface AurelionCinemaModalProps {
  isOpen: boolean;
  snapshot: AurelionDashboardSnapshot | null;
  mediaSnapshot?: GlobalMediaSnapshot | null;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  activeVideoTitle: string | null;
  isWallProjected: boolean;
  onToggleCinemaPower: () => void;
  onSyncWallLabel: (appLabel: string, title: string) => void;
  onSelectMediaChannel?: (channelId: MediaChannelId) => void;
  onOpenGlobalMediaDashboard?: () => void;
  onLoadLocalOrUrlVideo: (src: string, title: string, projectTo3DWall: boolean) => void;
  onToggleWallProjection: (projectTo3DWall: boolean) => void;
  onStopWallVideo: () => void;
  onClose: () => void;
}

interface YouTubePreset {
  id: string;
  title: string;
  channel: string;
  category: string;
  videoId: string;
}

interface StreamingTitleItem {
  id: string;
  title: string;
  year: string;
  rating: string;
  durationSec: number;
  genre: string;
  synopsis: string;
  badge: string;
  episodes?: string[];
  accentGradient: string;
  trailerYtId: string;
}

interface StreamingServiceConfig {
  id: StreamingServiceId;
  name: string;
  tagline: string;
  brandColor: string;
  badgeBg: string;
  borderAccent: string;
  surfaceBg: string;
  hubs?: string[];
  catalog: StreamingTitleItem[];
}

const STREAMING_SERVICES: Record<StreamingServiceId, StreamingServiceConfig> = {
  netflix: {
    id: 'netflix',
    name: 'Netflix',
    tagline: 'N SERIES · 4K DOLBY VISION & ATMOS',
    brandColor: '#E50914',
    badgeBg: 'bg-[#E50914] text-white',
    borderAccent: 'border-[#E50914]/50',
    surfaceBg: 'from-[#1f090b] via-[#141414] to-[#0a0a0a]',
    catalog: [
      {
        id: 'nf_1',
        title: 'Last Sanctuary: Zero Hour',
        year: '2026',
        rating: 'TV-MA',
        durationSec: 3180,
        genre: 'Sci-Fi Survival · Original Series',
        synopsis:
          'Inside an eight-story underground command tower, engineers track an orbital anomaly before global rail lines go dark.',
        badge: 'TOP 10 #1',
        episodes: ['S1:E1 Signal Ridge', 'S1:E2 Compound Protocol', 'S1:E3 Blackout Corridor', 'S1:E4 Crown Frequency'],
        accentGradient: 'from-[#4a0b12] via-[#1b0e16] to-[#0b0d14]',
        trailerYtId: '4xDzrJKXOOY',
      },
      {
        id: 'nf_2',
        title: 'Midnight Express 404',
        year: '2025',
        rating: 'TV-14',
        durationSec: 2740,
        genre: 'Thriller · Action Drama',
        synopsis:
          'An armored transcontinental freight train races across snowbound ridges while autonomous dispatch AI rewrites the tracks.',
        badge: '4K ULTRA HD',
        episodes: ['S1:E1 Departing Bay 1', 'S1:E2 Frozen Viaduct', 'S1:E3 Deadman Switch'],
        accentGradient: 'from-[#3b0c1f] via-[#141422] to-[#0a0d14]',
        trailerYtId: 'aqz-KE-bpKQ',
      },
      {
        id: 'nf_3',
        title: 'Crimson Protocol',
        year: '2026',
        rating: 'R',
        durationSec: 6900,
        genre: 'Feature Film · Cyberpunk',
        synopsis:
          'A deep-grid technician unlocks a hidden subterranean fortress power core to shield the last survivor valley.',
        badge: 'DOLBY ATMOS',
        accentGradient: 'from-[#52120a] via-[#181214] to-[#080a10]',
        trailerYtId: 'eRsGyueVLvQ',
      },
      {
        id: 'nf_4',
        title: 'Blue Orbit: Silent Earth',
        year: '2024',
        rating: 'TV-PG',
        durationSec: 3420,
        genre: 'Documentary · Space',
        synopsis:
          'High-definition orbital telemetry capturing auroras, storm fronts, and twilight horizons across every continent.',
        badge: 'HDR10+',
        accentGradient: 'from-[#1e1b4b] via-[#101628] to-[#070a12]',
        trailerYtId: 'xRPjKQtRXR8',
      },
    ],
  },
  disney: {
    id: 'disney',
    name: 'Disney+',
    tagline: 'DISNEY · PIXAR · MARVEL · STAR WARS · NAT GEO',
    brandColor: '#0063E5',
    badgeBg: 'bg-[#0063E5] text-white',
    borderAccent: 'border-[#0063E5]/55',
    surfaceBg: 'from-[#071535] via-[#040817] to-[#03050d]',
    hubs: ['Disney', 'Pixar', 'Marvel', 'Star Wars', 'National Geographic'],
    catalog: [
      {
        id: 'dp_1',
        title: 'Cosmos: Earth From Orbit',
        year: '2026',
        rating: 'TV-G',
        durationSec: 2940,
        genre: 'National Geographic · 4K IMAX',
        synopsis:
          'Journey above the stratosphere with ultra-crisp 4K telemetry cameras tracking Earth’s oceans, storms, and night lights.',
        badge: 'IMAX ENHANCED',
        episodes: ['E1 Pale Blue Horizon', 'E2 Solar Winds', 'E3 Deep Ocean Currents'],
        accentGradient: 'from-[#0a2a66] via-[#07132e] to-[#040712]',
        trailerYtId: 'xRPjKQtRXR8',
      },
      {
        id: 'dp_2',
        title: 'Guardians of the Ridge',
        year: '2025',
        rating: 'PG-13',
        durationSec: 7320,
        genre: 'Adventure · Fantasy',
        synopsis:
          'Three young explorers discover an ancient skyward sanctuary powered by solar crystals and automated defense beacons.',
        badge: '4K DOLBY VISION',
        accentGradient: 'from-[#16367a] via-[#0c1a3a] to-[#050814]',
        trailerYtId: 'eRsGyueVLvQ',
      },
      {
        id: 'dp_3',
        title: 'Aurelion Animated Tales',
        year: '2026',
        rating: 'G',
        durationSec: 1860,
        genre: 'Animation · Family',
        synopsis:
          'Heartwarming animated short stories celebrating teamwork, rooftop gardens, and cozy evenings by the hearth.',
        badge: 'PIXAR SPARK',
        episodes: ['Part 1 Sky Garden', 'Part 2 The Railway Dog', 'Part 3 Starlight Pool'],
        accentGradient: 'from-[#1e40af] via-[#10204d] to-[#060919]',
        trailerYtId: 'aqz-KE-bpKQ',
      },
      {
        id: 'dp_4',
        title: 'Starlight Sector Nine',
        year: '2026',
        rating: 'TV-14',
        durationSec: 3060,
        genre: 'Sci-Fi · Original Series',
        synopsis:
          'Outpost engineers restore a beacon array on the edge of an uncharted frontier sector.',
        badge: 'DOLBY ATMOS',
        episodes: ['Ch 1 Beacon Ignition', 'Ch 2 Orbital Relay'],
        accentGradient: 'from-[#0f2f5c] via-[#08152b] to-[#040711]',
        trailerYtId: '4xDzrJKXOOY',
      },
    ],
  },
  prime: {
    id: 'prime',
    name: 'Prime Video',
    tagline: 'INCLUDED WITH PRIME · X-RAY · 4K UHD',
    brandColor: '#00A8E1',
    badgeBg: 'bg-[#00A8E1] text-slate-950',
    borderAccent: 'border-[#00A8E1]/50',
    surfaceBg: 'from-[#082233] via-[#0f171e] to-[#090d12]',
    catalog: [
      {
        id: 'pv_1',
        title: 'The Aurelion Blueprint',
        year: '2026',
        rating: '16+',
        durationSec: 3360,
        genre: 'Amazon Original · Engineering',
        synopsis:
          'An architectural deep dive into self-sustaining bunkers, dual-diesel generators, reverse-osmosis water plants, and solar crowns.',
        badge: 'PRIME UHD',
        episodes: ['Ep 1 B2 Bedrock', 'Ep 2 The Atrium Core', 'Ep 3 Sky Palace Solar'],
        accentGradient: 'from-[#0c3a52] via-[#0d1f2d] to-[#080e14]',
        trailerYtId: 'xRPjKQtRXR8',
      },
      {
        id: 'pv_2',
        title: 'Compound Seven',
        year: '2025',
        rating: '18+',
        durationSec: 3120,
        genre: 'Action · Survival Drama',
        synopsis:
          'Twenty automated perimeter sentries hold the canyon line while scouts navigate six armored rail corridors.',
        badge: 'X-RAY ENABLED',
        episodes: ['Ep 1 Perimeter Check', 'Ep 2 Night Watch', 'Ep 3 Supply Run'],
        accentGradient: 'from-[#0b3347] via-[#101c28] to-[#070c12]',
        trailerYtId: '4xDzrJKXOOY',
      },
      {
        id: 'pv_3',
        title: 'Nightwatch Over Oakridge',
        year: '2026',
        rating: '13+',
        durationSec: 6480,
        genre: 'Mystery · Feature Film',
        synopsis:
          'Strange radar echoes over Oakridge Valley connect a quiet lakeside town to a sprawling subterranean rail nexus.',
        badge: 'HDR10+',
        accentGradient: 'from-[#113d4f] via-[#0f1c26] to-[#090d14]',
        trailerYtId: 'eRsGyueVLvQ',
      },
      {
        id: 'pv_4',
        title: 'Hearth & Rain Ambient 4K',
        year: '2025',
        rating: 'ALL',
        durationSec: 5400,
        genre: 'Relaxation · Lounge',
        synopsis:
          'Ultra-high-resolution hearth warmth paired with soothing acoustic rain for Floor 6 theater relaxation.',
        badge: '4K LOUNGE',
        accentGradient: 'from-[#422006] via-[#17120e] to-[#0b0a0a]',
        trailerYtId: 'L_LUpnjgPso',
      },
    ],
  },
};

const YOUTUBE_PRESETS: YouTubePreset[] = [
  {
    id: 'lofi',
    title: 'Lofi Hip Hop Beats — Sanctuary Lounge Radio',
    channel: 'Lofi Girl',
    category: 'Music & Chill',
    videoId: 'jfKfPfyJRdk',
  },
  {
    id: 'earth',
    title: '4K Earth From Space — Relaxing Orbit Stream',
    channel: 'Space Ambient',
    category: '4K Nature',
    videoId: 'xRPjKQtRXR8',
  },
  {
    id: 'bbb',
    title: 'Big Buck Bunny 4K 60fps (Blender Open Movie)',
    channel: 'Blender Foundation',
    category: 'Open Cinema',
    videoId: 'aqz-KE-bpKQ',
  },
  {
    id: 'sintel',
    title: 'Sintel — Fantasy Short Film (Blender Foundation)',
    channel: 'Blender Foundation',
    category: 'Open Cinema',
    videoId: 'eRsGyueVLvQ',
  },
  {
    id: 'fireplace',
    title: '4K Cozy Fireplace & Rain Sounds',
    channel: 'Ambient Lounge',
    category: 'Ambiance',
    videoId: 'L_LUpnjgPso',
  },
  {
    id: 'cyberpunk',
    title: 'Dark Synthwave / Blade Runner Ambient Mix',
    channel: 'Night City Radio',
    category: 'Synthwave',
    videoId: '4xDzrJKXOOY',
  },
];

interface WikiSearchResult {
  title: string;
  snippet: string;
  url: string;
}

interface SmartTvGridTile {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  accentClass: string;
  badgeClass: string;
  action: () => void;
}

function parseYouTubeInput(rawInput: string): { type: 'video' | 'playlist'; id: string } | null {
  const input = rawInput.trim();
  if (!input) return null;

  if (/^[a-zA-Z0-9_-]{11}$/.test(input)) {
    return { type: 'video', id: input };
  }

  try {
    const normalized = input.startsWith('http') ? input : `https://${input}`;
    const url = new URL(normalized);
    const host = url.hostname.replace(/^www\./, '');

    if (host === 'youtu.be') {
      const id = url.pathname.split('/').filter(Boolean)[0];
      if (id && /^[a-zA-Z0-9_-]{11}$/.test(id)) return { type: 'video', id };
    }

    if (host.includes('youtube.com') || host.includes('youtube-nocookie.com')) {
      const v = url.searchParams.get('v');
      if (v && /^[a-zA-Z0-9_-]{11}$/.test(v)) return { type: 'video', id: v };

      const list = url.searchParams.get('list');
      if (list && url.pathname.includes('playlist')) {
        return { type: 'playlist', id: list };
      }

      const parts = url.pathname.split('/').filter(Boolean);
      if (parts.length >= 2 && ['embed', 'shorts', 'live', 'v'].includes(parts[0])) {
        const candidate = parts[1];
        if (/^[a-zA-Z0-9_-]{11}$/.test(candidate)) return { type: 'video', id: candidate };
      }
    }
  } catch {
    // Invalid URL
  }
  return null;
}

export const AurelionCinemaModal: React.FC<AurelionCinemaModalProps> = ({
  isOpen,
  snapshot,
  mediaSnapshot,
  videoRef,
  activeVideoTitle,
  isWallProjected,
  onToggleCinemaPower,
  onSyncWallLabel,
  onSelectMediaChannel,
  onOpenGlobalMediaDashboard,
  onLoadLocalOrUrlVideo,
  onToggleWallProjection,
  onStopWallVideo,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<CinemaTab>('home');
  const [activeStreamingService, setActiveStreamingService] = useState<StreamingServiceId | null>(null);
  const [focusedTileIndex, setFocusedTileIndex] = useState<number>(0);

  // Streaming Service Player Overlay state
  const [selectedStreamItemId, setSelectedStreamItemId] = useState<string>('nf_1');
  const [selectedEpisodeIndex, setSelectedEpisodeIndex] = useState<number>(0);
  const [streamPlaying, setStreamPlaying] = useState<boolean>(true);
  const [streamMuted, setStreamMuted] = useState<boolean>(false);
  const [streamProgressSec, setStreamProgressSec] = useState<number>(420);
  const [streamSubtitlesOn, setStreamSubtitlesOn] = useState<boolean>(true);
  const [watchlistIds, setWatchlistIds] = useState<Record<string, boolean>>({ nf_1: true, dp_1: true });
  const [selectedDisneyHub, setSelectedDisneyHub] = useState<string>('All');

  // YouTube Player state
  const [ytInput, setYtInput] = useState('');
  const [ytError, setYtError] = useState<string | null>(null);
  const [ytEmbed, setYtEmbed] = useState<{ type: 'video' | 'playlist'; id: string; title: string }>({
    type: 'video',
    id: YOUTUBE_PRESETS[0].videoId,
    title: YOUTUBE_PRESETS[0].title,
  });
  const [ytPrivacyDomain, setYtPrivacyDomain] = useState(false);

  // 3D Wall Projector state
  const [mediaUrlInput, setMediaUrlInput] = useState('');
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [videoProgress, setVideoProgress] = useState({ current: 0, duration: 0 });
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Knowledge search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<WikiSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchStatus, setSearchStatus] = useState<string | null>(null);

  const cinemaPowered = Boolean(snapshot?.climate.cinemaOn);
  const tier3Online = Boolean(snapshot?.power.tier3LuxuryPowered);

  const selectTab = useCallback(
    (tab: CinemaTab) => {
      setActiveStreamingService(null);
      setActiveTab(tab);
      if (tab === 'youtube') {
        onSyncWallLabel('YOUTUBE TV', ytEmbed.title);
      } else if (tab === 'media') {
        onSyncWallLabel('3D WALL PROJECTOR', activeVideoTitle || 'LOCAL / STREAM VIDEO');
      } else if (tab === 'ott') {
        onSyncWallLabel('ANDROID TV APPS', 'OTT STREAMING & KNOWLEDGE BROWSER');
      } else if (tab === 'news') {
        const ch = mediaSnapshot?.channels.find((c) => c.definition.id === mediaSnapshot.activeChannelId);
        onSyncWallLabel(ch?.definition.name.toUpperCase() || 'OAKRIDGE NEWS 24', ch?.headline || 'LIVE GLOBAL BROADCAST');
      } else if (tab === 'estate') {
        onSyncWallLabel('AURELION CHANNELS', 'LIVE COMPOUND & ESTATE TELEMETRY');
      } else {
        onSyncWallLabel('ANDROID TV OS', 'SMART TV HOME · 4K DOLBY CINEMA');
      }
    },
    [activeVideoTitle, mediaSnapshot, onSyncWallLabel, ytEmbed.title]
  );

  const openStreamingService = useCallback(
    (serviceId: StreamingServiceId) => {
      const cfg = STREAMING_SERVICES[serviceId];
      const firstItem = cfg.catalog[0];
      setActiveTab('home');
      setActiveStreamingService(serviceId);
      setSelectedStreamItemId(firstItem.id);
      setSelectedEpisodeIndex(0);
      setStreamProgressSec(315);
      setStreamPlaying(true);
      setSelectedDisneyHub('All');
      onSyncWallLabel(cfg.name.toUpperCase(), `${firstItem.title} · 4K HDR`);
    },
    [onSyncWallLabel]
  );

  const smartTvTiles: SmartTvGridTile[] = useMemo(
    () => [
      {
        id: 'tile_youtube',
        title: 'YouTube',
        subtitle: 'Live videos, music streams & any YouTube link',
        badge: 'LIVE EMBED',
        accentClass: 'border-red-500/45 bg-gradient-to-br from-red-950/65 to-[#160b0d]',
        badgeClass: 'bg-[#FF0000] text-white',
        action: () => selectTab('youtube'),
      },
      {
        id: 'tile_netflix',
        title: 'Netflix',
        subtitle: 'Top 10 Originals, Dolby Vision & Series Player',
        badge: '4K HDR',
        accentClass: 'border-[#E50914]/50 bg-gradient-to-br from-[#32080c] to-[#120b0c]',
        badgeClass: 'bg-[#E50914] text-white',
        action: () => openStreamingService('netflix'),
      },
      {
        id: 'tile_disney',
        title: 'Disney+',
        subtitle: 'Disney, Pixar, Marvel, Star Wars & Nat Geo',
        badge: 'IMAX',
        accentClass: 'border-[#0063E5]/55 bg-gradient-to-br from-[#071f4d] to-[#060d20]',
        badgeClass: 'bg-[#0063E5] text-white',
        action: () => openStreamingService('disney'),
      },
      {
        id: 'tile_prime',
        title: 'Prime Video',
        subtitle: 'Amazon Originals, X-Ray Trivia & UHD Lounge',
        badge: 'PRIME',
        accentClass: 'border-[#00A8E1]/50 bg-gradient-to-br from-[#072b3d] to-[#09131c]',
        badgeClass: 'bg-[#00A8E1] text-slate-950',
        action: () => openStreamingService('prime'),
      },
      {
        id: 'tile_projector',
        title: '3D Wall Projector',
        subtitle: 'Play .mp4/.webm directly on Floor 6 3D Wall',
        badge: 'VIDEO TEX',
        accentClass: 'border-purple-500/45 bg-gradient-to-br from-purple-950/60 to-[#110b1c]',
        badgeClass: 'bg-purple-600 text-white',
        action: () => selectTab('media'),
      },
      {
        id: 'tile_web',
        title: 'Smart Web Browser',
        subtitle: 'Open Knowledge Search & OTT Streaming Hub',
        badge: 'WIKI LIVE',
        accentClass: 'border-sky-500/45 bg-gradient-to-br from-sky-950/60 to-[#0a1320]',
        badgeClass: 'bg-sky-500 text-slate-950',
        action: () => selectTab('ott'),
      },
      {
        id: 'tile_estate',
        title: 'Estate Live TV',
        subtitle: 'B2 Power Grid, Pump, Turrets & Sky Hydroponics',
        badge: 'TELEMETRY',
        accentClass: 'border-emerald-500/45 bg-gradient-to-br from-emerald-950/60 to-[#091712]',
        badgeClass: 'bg-emerald-500 text-slate-950',
        action: () => selectTab('estate'),
      },
      {
        id: 'tile_earth',
        title: '4K Earth Orbit Live',
        subtitle: 'Instant 4K Space Feed inside Theater Screen',
        badge: 'QUICK PLAY',
        accentClass: 'border-amber-500/45 bg-gradient-to-br from-amber-950/55 to-[#171209]',
        badgeClass: 'bg-amber-400 text-slate-950',
        action: () => {
          const preset = YOUTUBE_PRESETS[1];
          setYtEmbed({ type: 'video', id: preset.videoId, title: preset.title });
          setActiveStreamingService(null);
          setActiveTab('youtube');
          onSyncWallLabel('YOUTUBE TV', preset.title);
        },
      },
      {
        id: 'tile_global_news',
        title: 'Global News TV',
        subtitle: '6 Live Oakridge & WorldWatch Broadcast Channels',
        badge: 'LIVE TV',
        accentClass: 'border-cyan-500/45 bg-gradient-to-br from-cyan-950/60 to-[#081523]',
        badgeClass: 'bg-cyan-500 text-slate-950',
        action: () => selectTab('news'),
      },
    ],
    [onSyncWallLabel, openStreamingService, selectTab]
  );

  const activeServiceConfig = activeStreamingService ? STREAMING_SERVICES[activeStreamingService] : null;
  const activeStreamItem = useMemo(() => {
    if (!activeServiceConfig) return null;
    return (
      activeServiceConfig.catalog.find((item) => item.id === selectedStreamItemId) ??
      activeServiceConfig.catalog[0]
    );
  }, [activeServiceConfig, selectedStreamItemId]);

  // Advance simulated streaming playback scrubber smoothly when streaming overlay is open
  useEffect(() => {
    if (!isOpen || !activeStreamingService || !streamPlaying || !activeStreamItem) return;
    const timer = window.setInterval(() => {
      setStreamProgressSec((prev) => (prev + 1 >= activeStreamItem.durationSec ? 0 : prev + 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isOpen, activeStreamingService, streamPlaying, activeStreamItem]);

  // Remote D-Pad navigation handler
  const moveRemoteFocus = useCallback(
    (dir: 'up' | 'down' | 'left' | 'right') => {
      if (activeStreamingService && activeServiceConfig) {
        const list = activeServiceConfig.catalog;
        const curIdx = Math.max(
          0,
          list.findIndex((i) => i.id === selectedStreamItemId)
        );
        const delta = dir === 'right' || dir === 'down' ? 1 : -1;
        const nextIdx = (curIdx + delta + list.length) % list.length;
        const nextItem = list[nextIdx];
        setSelectedStreamItemId(nextItem.id);
        setSelectedEpisodeIndex(0);
        setStreamProgressSec(120);
        onSyncWallLabel(activeServiceConfig.name.toUpperCase(), `${nextItem.title} · 4K HDR`);
        return;
      }

      if (activeTab !== 'home') {
        setActiveTab('home');
        return;
      }

      const cols = 4;
      const total = smartTvTiles.length;
      setFocusedTileIndex((prev) => {
        if (dir === 'left') return (prev - 1 + total) % total;
        if (dir === 'right') return (prev + 1) % total;
        if (dir === 'down') return Math.min(total - 1, prev + cols);
        return Math.max(0, prev - cols);
      });
    },
    [
      activeServiceConfig,
      activeStreamingService,
      activeTab,
      onSyncWallLabel,
      selectedStreamItemId,
      smartTvTiles.length,
    ]
  );

  const pressRemoteOk = useCallback(() => {
    if (activeStreamingService) {
      setStreamPlaying((p) => !p);
      return;
    }
    if (activeTab === 'home') {
      const tile = smartTvTiles[focusedTileIndex];
      tile?.action();
    }
  }, [activeStreamingService, activeTab, focusedTileIndex, smartTvTiles]);

  const pressRemoteBack = useCallback(() => {
    if (activeStreamingService) {
      setActiveStreamingService(null);
      onSyncWallLabel('ANDROID TV OS', 'SMART TV HOME · 4K DOLBY CINEMA');
      return;
    }
    if (activeTab !== 'home') {
      selectTab('home');
      return;
    }
    onClose();
  }, [activeStreamingService, activeTab, onClose, onSyncWallLabel, selectTab]);

  // Keyboard TV Remote Navigation (Arrow Keys, Enter, Backspace, Escape)
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTyping =
        target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);

      if (e.key === 'Escape') {
        e.preventDefault();
        if (activeStreamingService) {
          setActiveStreamingService(null);
        } else {
          onClose();
        }
        return;
      }

      if (isTyping) return;

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        moveRemoteFocus('left');
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        moveRemoteFocus('right');
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        moveRemoteFocus('up');
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        moveRemoteFocus('down');
      } else if (e.key === 'Enter') {
        e.preventDefault();
        pressRemoteOk();
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        pressRemoteBack();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [activeStreamingService, isOpen, moveRemoteFocus, onClose, pressRemoteBack, pressRemoteOk]);

  // Keep local UI playback state and preview canvas in sync with persistent App <video> element
  useEffect(() => {
    if (!isOpen) return;
    let rafId = 0;
    const syncFrame = () => {
      const vid = videoRef.current;
      if (vid) {
        setIsVideoPlaying(!vid.paused && !vid.ended);
        setIsVideoMuted(vid.muted);
        setVideoProgress({
          current: Number.isFinite(vid.currentTime) ? vid.currentTime : 0,
          duration: Number.isFinite(vid.duration) ? vid.duration : 0,
        });
        const canvas = previewCanvasRef.current;
        if (canvas && vid.readyState >= 2) {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(vid, 0, 0, canvas.width, canvas.height);
          }
        }
      }
      rafId = requestAnimationFrame(syncFrame);
    };
    rafId = requestAnimationFrame(syncFrame);
    return () => cancelAnimationFrame(rafId);
  }, [isOpen, videoRef]);

  if (!isOpen) return null;

  const handleLoadYouTube = (e?: React.FormEvent) => {
    e?.preventDefault();
    const parsed = parseYouTubeInput(ytInput);
    if (!parsed) {
      setYtError('Paste a valid YouTube link (watch?v=..., youtu.be/..., shorts/...) or 11-character Video ID.');
      return;
    }
    setYtError(null);
    const labelTitle = `YouTube ${parsed.type === 'playlist' ? 'Playlist' : 'Stream'} (${parsed.id})`;
    setYtEmbed({ ...parsed, title: labelTitle });
    onSyncWallLabel('YOUTUBE TV', labelTitle);
  };

  const handleFilePicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const objUrl = URL.createObjectURL(file);
    onLoadLocalOrUrlVideo(objUrl, file.name, true);
    setActiveStreamingService(null);
    setActiveTab('media');
  };

  const handleLoadDirectVideoUrl = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = mediaUrlInput.trim();
    if (!trimmed) return;
    onLoadLocalOrUrlVideo(trimmed, trimmed.split('/').pop() || 'Direct Video Stream', true);
  };

  const handleTogglePlayPause = () => {
    const vid = videoRef.current;
    if (!vid || !vid.src) return;
    if (vid.paused) {
      vid.play().catch(() => {});
    } else {
      vid.pause();
    }
  };

  const handleToggleMute = () => {
    const vid = videoRef.current;
    if (!vid) return;
    vid.muted = !vid.muted;
    setIsVideoMuted(vid.muted);
  };

  const handleWikiSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;
    setSearchLoading(true);
    setSearchStatus(null);
    try {
      const url = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
        q
      )}&srlimit=6&format=json&origin=*`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const hits = (data?.query?.search || []).map((item: any) => ({
        title: String(item.title || 'Article'),
        snippet: String(item.snippet || '').replace(/<[^>]+>/g, ''),
        url: `https://en.wikipedia.org/wiki/${encodeURIComponent(String(item.title || '').replace(/ /g, '_'))}`,
      }));
      setSearchResults(hits);
      if (hits.length === 0) setSearchStatus('No articles matched your search.');
    } catch {
      setSearchStatus('Unable to reach online knowledge index (offline or blocked by network).');
    } finally {
      setSearchLoading(false);
    }
  };

  const ytDomain = ytPrivacyDomain ? 'https://www.youtube-nocookie.com' : 'https://www.youtube.com';
  const ytIframeSrc =
    ytEmbed.type === 'playlist'
      ? `${ytDomain}/embed/videoseries?list=${encodeURIComponent(ytEmbed.id)}&autoplay=1&rel=0`
      : `${ytDomain}/embed/${encodeURIComponent(ytEmbed.id)}?autoplay=1&rel=0&modestbranding=1`;

  const formatSec = (s: number) => {
    const hrs = Math.floor(s / 3600);
    const mins = Math.floor((s % 3600) / 60);
    const secs = Math.floor(s % 60);
    if (hrs > 0) return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-2 sm:p-4 select-none">
      <div className="flex flex-col w-full max-w-6xl h-[92vh] rounded-2xl border border-amber-500/40 bg-[#080c15] text-neutral-100 shadow-2xl overflow-hidden">
        {/* Top Android TV OS Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-800 bg-[#0d1320] px-5 py-3">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-amber-500/15 p-2 text-amber-300 border border-amber-500/35">
              <Tv className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-amber-400">
                  THE AURELION · FLOOR 6 SMART CINEMA
                </span>
                <span className="rounded px-1.5 py-0.5 text-[10px] font-mono bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                  ANDROID TV 14
                </span>
              </div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Private 4K Dolby Vision Theater &amp; Smart TV Center
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden lg:flex items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-xs font-mono">
              <span className={tier3Online ? 'text-emerald-400' : 'text-rose-400'}>
                {tier3Online ? 'TIER 3 LUXURY: ONLINE (1.4 kW)' : 'TIER 3 POWER SHED'}
              </span>
            </div>
            <button
              onClick={onToggleCinemaPower}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold border cursor-pointer transition-colors ${
                cinemaPowered
                  ? 'bg-emerald-600/20 border-emerald-500/50 text-emerald-300 hover:bg-emerald-600/30'
                  : 'bg-neutral-800 border-neutral-700 text-neutral-300 hover:bg-neutral-700'
              }`}
            >
              <Power className="h-3.5 w-3.5" />
              {cinemaPowered ? 'SCREEN ON' : 'STANDBY'}
            </button>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-800 hover:text-white cursor-pointer"
              aria-label="Close cinema"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Tier 3 Power Shedding Warning Banner */}
        {!tier3Online && (
          <div className="flex items-center justify-between gap-3 bg-rose-950/70 border-b border-rose-800/70 px-5 py-2 text-xs text-rose-200">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
              <span>
                Floor 6 Tier 3 Luxury Power is currently shed. Start the B2 Diesel Generator or switch Power Priority to
                Balanced/Luxury to illuminate the physical 3D wall screen.
              </span>
            </div>
          </div>
        )}

        {/* Main Android TV Workspace */}
        <div className="flex flex-1 min-h-0 flex-col md:flex-row">
          {/* Left Android TV Navigation Rail + Interactive Smart TV Remote */}
          <aside className="flex md:flex-col justify-between gap-2 border-b md:border-b-0 md:border-r border-neutral-800 bg-[#0b101b] p-3 md:w-60 overflow-x-auto shrink-0">
            <div className="flex md:flex-col gap-1.5">
              {[
                { id: 'home' as const, label: 'Smart TV Grid', icon: Home },
                { id: 'news' as const, label: 'Global News TV', icon: Tv },
                { id: 'youtube' as const, label: 'YouTube Player', icon: Youtube },
                { id: 'media' as const, label: '3D Wall Projector', icon: Film },
                { id: 'ott' as const, label: 'Web Search & OTT', icon: Globe },
                { id: 'estate' as const, label: 'Estate Live TV', icon: Radio },
              ].map((item) => {
                const Icon = item.icon;
                const active = !activeStreamingService && activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => selectTab(item.id)}
                    className={`flex items-center gap-2.5 rounded-xl px-3.5 py-2 text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                      active
                        ? 'bg-amber-500 text-neutral-950 shadow-md'
                        : 'text-neutral-300 hover:bg-neutral-800/80 hover:text-white'
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Interactive Android TV Remote D-Pad */}
            <div className="hidden md:flex flex-col items-center rounded-2xl border border-neutral-800 bg-[#0f1626] p-3 space-y-2.5">
              <div className="w-full flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-neutral-400">
                <span>TV REMOTE</span>
                <span className="text-amber-400">D-PAD</span>
              </div>

              {/* Circular D-Pad Grid */}
              <div className="grid grid-cols-3 gap-1.5 w-32 h-32 items-center justify-items-center bg-[#090e18] rounded-full p-2 border border-neutral-700/80 shadow-inner">
                <div />
                <button
                  onClick={() => moveRemoteFocus('up')}
                  className="w-8 h-8 rounded-lg bg-neutral-800 hover:bg-neutral-700 active:bg-amber-500 active:text-black flex items-center justify-center text-neutral-200 cursor-pointer"
                  title="Remote Up (ArrowUp)"
                  aria-label="Remote Up"
                >
                  <ChevronUp className="h-4 w-4" />
                </button>
                <div />

                <button
                  onClick={() => moveRemoteFocus('left')}
                  className="w-8 h-8 rounded-lg bg-neutral-800 hover:bg-neutral-700 active:bg-amber-500 active:text-black flex items-center justify-center text-neutral-200 cursor-pointer"
                  title="Remote Left (ArrowLeft)"
                  aria-label="Remote Left"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={pressRemoteOk}
                  className="w-9 h-9 rounded-full bg-amber-500 hover:bg-amber-400 active:scale-95 flex items-center justify-center text-[11px] font-extrabold text-neutral-950 shadow cursor-pointer"
                  title="Remote Select / OK (Enter)"
                  aria-label="Remote OK"
                >
                  OK
                </button>
                <button
                  onClick={() => moveRemoteFocus('right')}
                  className="w-8 h-8 rounded-lg bg-neutral-800 hover:bg-neutral-700 active:bg-amber-500 active:text-black flex items-center justify-center text-neutral-200 cursor-pointer"
                  title="Remote Right (ArrowRight)"
                  aria-label="Remote Right"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>

                <div />
                <button
                  onClick={() => moveRemoteFocus('down')}
                  className="w-8 h-8 rounded-lg bg-neutral-800 hover:bg-neutral-700 active:bg-amber-500 active:text-black flex items-center justify-center text-neutral-200 cursor-pointer"
                  title="Remote Down (ArrowDown)"
                  aria-label="Remote Down"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
                <div />
              </div>

              {/* Back & Home Remote Buttons */}
              <div className="grid grid-cols-2 gap-1.5 w-full">
                <button
                  onClick={pressRemoteBack}
                  className="flex items-center justify-center gap-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 py-1.5 text-[11px] font-semibold text-neutral-200 cursor-pointer"
                  title="Back (Backspace)"
                >
                  <RotateCcw className="h-3 w-3" />
                  Back
                </button>
                <button
                  onClick={() => selectTab('home')}
                  className="flex items-center justify-center gap-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 py-1.5 text-[11px] font-semibold text-neutral-200 cursor-pointer"
                  title="Android TV Home"
                >
                  <Home className="h-3 w-3" />
                  Home
                </button>
              </div>

              <div className="text-[10px] text-neutral-500 text-center leading-tight">
                Use Arrow Keys + Enter or click D-Pad
              </div>
            </div>

            <div className="hidden md:block pt-2 border-t border-neutral-800/80 text-[11px] text-neutral-400 space-y-1 px-1">
              <div className="font-mono text-neutral-300 font-semibold">3D WALL STATUS</div>
              <div className="text-[11px] leading-snug text-cyan-300 line-clamp-2">
                {isWallProjected && activeVideoTitle
                  ? `Playing on 3D Wall: ${activeVideoTitle}`
                  : activeServiceConfig
                    ? `${activeServiceConfig.name}: ${activeStreamItem?.title ?? 'Browsing'}`
                    : cinemaPowered
                      ? 'Floor 6 Wall Screen Synced'
                      : 'Wall Screen Standby'}
              </div>
            </div>
          </aside>

          {/* Main Smart TV Content Viewport */}
          <main className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6">
            {/* STREAMING SERVICE MEDIA PLAYER OVERLAY (NETFLIX / DISNEY+ / PRIME VIDEO) */}
            {activeServiceConfig && activeStreamItem ? (
              <div
                className={`rounded-2xl border ${activeServiceConfig.borderAccent} bg-gradient-to-br ${activeServiceConfig.surfaceBg} p-4 sm:p-5 space-y-5 shadow-2xl`}
              >
                {/* Streaming App Top Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        setActiveStreamingService(null);
                        onSyncWallLabel('ANDROID TV OS', 'SMART TV HOME · 4K DOLBY CINEMA');
                      }}
                      className="flex items-center gap-1.5 rounded-lg bg-white/10 hover:bg-white/20 px-3 py-1.5 text-xs font-semibold text-white cursor-pointer"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                      TV Home
                    </button>
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded px-2 py-0.5 text-xs font-extrabold tracking-wide ${activeServiceConfig.badgeBg}`}
                        >
                          {activeServiceConfig.name.toUpperCase()}
                        </span>
                        <span className="text-[11px] font-mono text-neutral-300">{activeServiceConfig.tagline}</span>
                      </div>
                    </div>
                  </div>

                  {/* Quick Switch Between Streaming Services */}
                  <div className="flex items-center gap-1.5">
                    {(['youtube', 'netflix', 'disney', 'prime'] as const).map((svc) => (
                      <button
                        key={svc}
                        onClick={() => (svc === 'youtube' ? selectTab('youtube') : openStreamingService(svc))}
                        className={`rounded-lg px-2.5 py-1 text-[11px] font-bold border cursor-pointer transition-colors ${
                          activeStreamingService === svc
                            ? 'border-white bg-white text-neutral-950'
                            : 'border-white/15 bg-black/40 text-neutral-300 hover:bg-white/10'
                        }`}
                      >
                        {svc === 'youtube'
                          ? 'YouTube'
                          : svc === 'netflix'
                            ? 'Netflix'
                            : svc === 'disney'
                              ? 'Disney+'
                              : 'Prime Video'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Disney+ Brand Hubs Row (if Disney+ active) */}
                {activeServiceConfig.hubs && (
                  <div className="flex flex-wrap gap-2">
                    {['All', ...activeServiceConfig.hubs].map((hub) => (
                      <button
                        key={hub}
                        onClick={() => setSelectedDisneyHub(hub)}
                        className={`rounded-xl px-3.5 py-2 text-xs font-bold border transition-colors cursor-pointer ${
                          selectedDisneyHub === hub
                            ? 'border-[#0063E5] bg-[#0063E5] text-white'
                            : 'border-white/15 bg-[#0a142c] text-blue-100 hover:border-blue-400/50'
                        }`}
                      >
                        {hub}
                      </button>
                    ))}
                  </div>
                )}

                {/* Simulated Smart TV Media Player Stage */}
                <div className="rounded-2xl border border-white/15 bg-black overflow-hidden shadow-xl">
                  <div
                    className={`relative aspect-video w-full bg-gradient-to-br ${activeStreamItem.accentGradient} p-5 sm:p-7 flex flex-col justify-between`}
                  >
                    {/* Top Player HUD */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded px-2 py-0.5 text-[10px] font-extrabold ${activeServiceConfig.badgeBg}`}>
                          {activeStreamItem.badge}
                        </span>
                        <span className="rounded bg-black/60 border border-white/15 px-2 py-0.5 text-[10px] font-mono text-neutral-200">
                          {activeStreamItem.rating} · {activeStreamItem.year}
                        </span>
                        <span className="rounded bg-black/60 border border-white/15 px-2 py-0.5 text-[10px] font-mono text-emerald-300">
                          {streamPlaying ? '● STREAMING 4K HDR' : '❚❚ PAUSED'}
                        </span>
                      </div>

                      <button
                        onClick={() => {
                          setYtEmbed({
                            type: 'video',
                            id: activeStreamItem.trailerYtId,
                            title: `${activeStreamItem.title} — Open Cinema Preview`,
                          });
                          setActiveStreamingService(null);
                          setActiveTab('youtube');
                          onSyncWallLabel('YOUTUBE TV', `${activeStreamItem.title} Preview`);
                        }}
                        className="flex items-center gap-1.5 rounded-lg bg-red-600 hover:bg-red-500 px-3 py-1.5 text-[11px] font-bold text-white cursor-pointer"
                      >
                        <Youtube className="h-3.5 w-3.5" />
                        Watch Live Trailer
                      </button>
                    </div>

                    {/* Center Cinematic Artwork & Title */}
                    <div className="my-auto max-w-2xl space-y-2.5">
                      <div className="text-[11px] font-mono uppercase tracking-widest text-neutral-300">
                        {activeStreamItem.genre}
                        {activeStreamItem.episodes
                          ? ` · ${activeStreamItem.episodes[selectedEpisodeIndex] || activeStreamItem.episodes[0]}`
                          : ''}
                      </div>
                      <h3 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
                        {activeStreamItem.title}
                      </h3>
                      <p className="text-xs sm:text-sm text-neutral-200 leading-relaxed max-w-xl">
                        {activeStreamItem.synopsis}
                      </p>

                      {streamSubtitlesOn && streamPlaying && (
                        <div className="inline-block rounded bg-black/75 px-3 py-1 text-xs font-medium text-amber-100 border border-white/10">
                          [CC] &ldquo;All sectors nominal. Sanctuary defense perimeter holding at 100%.&rdquo;
                        </div>
                      )}
                    </div>

                    {/* Bottom Scrubber & Transport Controls */}
                    <div className="space-y-2.5 bg-black/65 rounded-xl p-3 border border-white/10">
                      {/* Progress Bar */}
                      <div className="flex items-center gap-3 text-[11px] font-mono text-neutral-300">
                        <span>{formatSec(streamProgressSec)}</span>
                        <input
                          type="range"
                          min={0}
                          max={activeStreamItem.durationSec}
                          value={streamProgressSec}
                          onChange={(e) => setStreamProgressSec(Number(e.target.value))}
                          className="flex-1 accent-amber-400 cursor-pointer"
                          aria-label="Playback timeline"
                        />
                        <span>{formatSec(activeStreamItem.durationSec)}</span>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setStreamPlaying((p) => !p)}
                            className="flex items-center gap-1.5 rounded-lg bg-white text-neutral-950 hover:bg-neutral-200 px-3.5 py-1.5 text-xs font-extrabold cursor-pointer"
                          >
                            {streamPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                            {streamPlaying ? 'Pause' : 'Play'}
                          </button>
                          <button
                            onClick={() => setStreamProgressSec((p) => Math.max(0, p - 10))}
                            className="rounded-lg bg-white/10 hover:bg-white/20 p-1.5 text-white cursor-pointer"
                            title="Rewind 10s"
                          >
                            <SkipBack className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() =>
                              setStreamProgressSec((p) => Math.min(activeStreamItem.durationSec, p + 10))
                            }
                            className="rounded-lg bg-white/10 hover:bg-white/20 p-1.5 text-white cursor-pointer"
                            title="Forward 10s"
                          >
                            <SkipForward className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setStreamMuted((m) => !m)}
                            className="rounded-lg bg-white/10 hover:bg-white/20 p-1.5 text-white cursor-pointer"
                            title={streamMuted ? 'Unmute' : 'Mute'}
                          >
                            {streamMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                          </button>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setStreamSubtitlesOn((s) => !s)}
                            className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold border cursor-pointer ${
                              streamSubtitlesOn
                                ? 'border-amber-400/60 bg-amber-500/20 text-amber-200'
                                : 'border-white/15 bg-white/5 text-neutral-300'
                            }`}
                          >
                            <Subtitles className="h-3.5 w-3.5" />
                            CC {streamSubtitlesOn ? 'ON' : 'OFF'}
                          </button>
                          <button
                            onClick={() =>
                              setWatchlistIds((prev) => ({
                                ...prev,
                                [activeStreamItem.id]: !prev[activeStreamItem.id],
                              }))
                            }
                            className="flex items-center gap-1 rounded-lg border border-white/15 bg-white/10 hover:bg-white/20 px-2.5 py-1.5 text-[11px] font-semibold text-white cursor-pointer"
                          >
                            {watchlistIds[activeStreamItem.id] ? (
                              <>
                                <Check className="h-3.5 w-3.5 text-emerald-400" />
                                In Watchlist
                              </>
                            ) : (
                              <>
                                <Plus className="h-3.5 w-3.5" />
                                My List
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Episode Selector (if series) */}
                {activeStreamItem.episodes && (
                  <div className="space-y-2">
                    <div className="text-xs font-mono uppercase tracking-wider text-neutral-300">
                      Episodes &amp; Chapters
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {activeStreamItem.episodes.map((ep, idx) => (
                        <button
                          key={ep}
                          onClick={() => {
                            setSelectedEpisodeIndex(idx);
                            setStreamProgressSec(45);
                            setStreamPlaying(true);
                          }}
                          className={`rounded-xl border p-2.5 text-left text-xs font-semibold cursor-pointer transition-colors ${
                            selectedEpisodeIndex === idx
                              ? 'border-amber-400 bg-white/15 text-white'
                              : 'border-white/10 bg-black/40 text-neutral-300 hover:bg-white/10'
                          }`}
                        >
                          {ep}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Smart TV Browse Row inside Service */}
                <div className="space-y-2.5">
                  <div className="text-xs font-mono uppercase tracking-wider text-neutral-300">
                    Browse {activeServiceConfig.name} Catalog (Remote Left / Right)
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {activeServiceConfig.catalog.map((item) => {
                      const selected = item.id === activeStreamItem.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            setSelectedStreamItemId(item.id);
                            setSelectedEpisodeIndex(0);
                            setStreamProgressSec(120);
                            setStreamPlaying(true);
                            onSyncWallLabel(activeServiceConfig.name.toUpperCase(), `${item.title} · 4K HDR`);
                          }}
                          className={`rounded-xl border p-3.5 text-left transition-all cursor-pointer bg-gradient-to-br ${
                            item.accentGradient
                          } ${
                            selected
                              ? 'ring-2 ring-amber-400 border-white scale-[1.01]'
                              : 'border-white/15 hover:border-white/40'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className={`rounded px-1.5 py-0.5 text-[9px] font-extrabold ${activeServiceConfig.badgeBg}`}>
                              {item.badge}
                            </span>
                            <span className="text-[10px] font-mono text-neutral-300">{item.rating}</span>
                          </div>
                          <div className="text-sm font-bold text-white mt-2 line-clamp-1">{item.title}</div>
                          <div className="text-[11px] text-neutral-300 mt-0.5 line-clamp-1">{item.genre}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* TAB 1: ANDROID TV SMART TV GRID HOME */}
                {activeTab === 'home' && (
                  <div className="space-y-6">
                    {/* Featured Hero Banner */}
                    <div className="rounded-2xl border border-amber-500/35 bg-gradient-to-r from-[#171226] via-[#111a2f] to-[#0b1323] p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="space-y-1.5 max-w-xl">
                        <div className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-widest text-amber-300">
                          <Sparkles className="h-3.5 w-3.5" />
                          Android TV Smart Grid · Floor 6 Resort Cinema
                        </div>
                        <h3 className="text-xl sm:text-2xl font-bold text-white">
                          Streaming Apps, YouTube &amp; 3D Wall Cinema
                        </h3>
                        <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed">
                          Navigate apps with your keyboard Arrow keys or the on-screen TV Remote D-Pad. Launch YouTube,
                          browse Netflix / Disney+ / Prime Video Smart TV overlays, or project `.mp4` videos onto the 3D wall.
                        </p>
                      </div>

                      {/* Streaming Service Quick Launch Buttons */}
                      <div className="flex flex-wrap gap-2 shrink-0">
                        <button
                          onClick={() => selectTab('youtube')}
                          className="flex items-center gap-1.5 rounded-xl bg-[#FF0000] hover:bg-red-500 px-3.5 py-2 text-xs font-extrabold text-white cursor-pointer"
                        >
                          <Youtube className="h-4 w-4" />
                          YouTube
                        </button>
                        <button
                          onClick={() => openStreamingService('netflix')}
                          className="rounded-xl bg-[#E50914] hover:bg-red-600 px-3.5 py-2 text-xs font-extrabold text-white cursor-pointer"
                        >
                          Netflix
                        </button>
                        <button
                          onClick={() => openStreamingService('disney')}
                          className="rounded-xl bg-[#0063E5] hover:bg-blue-500 px-3.5 py-2 text-xs font-extrabold text-white cursor-pointer"
                        >
                          Disney+
                        </button>
                        <button
                          onClick={() => openStreamingService('prime')}
                          className="rounded-xl bg-[#00A8E1] hover:bg-sky-400 px-3.5 py-2 text-xs font-extrabold text-slate-950 cursor-pointer"
                        >
                          Prime Video
                        </button>
                      </div>
                    </div>

                    {/* Smart TV D-Pad Navigable App Grid */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-xs font-mono uppercase tracking-wider text-neutral-400">
                          Smart TV Apps Grid (Focused: {smartTvTiles[focusedTileIndex]?.title})
                        </h4>
                        <span className="text-[11px] font-mono text-amber-400">
                          ARROWS / D-PAD TO FOCUS · ENTER / OK TO LAUNCH
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                        {smartTvTiles.map((tile, idx) => {
                          const isFocused = focusedTileIndex === idx;
                          return (
                            <button
                              key={tile.id}
                              onMouseEnter={() => setFocusedTileIndex(idx)}
                              onClick={() => {
                                setFocusedTileIndex(idx);
                                tile.action();
                              }}
                              className={`group rounded-2xl border p-4 text-left transition-all cursor-pointer ${
                                tile.accentClass
                              } ${
                                isFocused
                                  ? 'ring-2 ring-amber-400 border-white scale-[1.02] shadow-lg'
                                  : 'hover:border-white/50'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2 mb-3">
                                <span className={`rounded px-2 py-0.5 text-[10px] font-extrabold ${tile.badgeClass}`}>
                                  {tile.badge}
                                </span>
                                {isFocused && (
                                  <span className="text-[10px] font-mono text-amber-300">● SELECTED</span>
                                )}
                              </div>
                              <div className="font-bold text-base text-white tracking-tight">{tile.title}</div>
                              <div className="text-xs text-neutral-300 mt-1 leading-snug">{tile.subtitle}</div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Quick Pick YouTube Channels */}
                    <div>
                      <h4 className="text-xs font-mono uppercase tracking-wider text-neutral-400 mb-3">
                        Continue Watching · Live YouTube Channels
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {YOUTUBE_PRESETS.slice(0, 3).map((preset) => (
                          <button
                            key={preset.id}
                            onClick={() => {
                              setYtEmbed({ type: 'video', id: preset.videoId, title: preset.title });
                              setActiveTab('youtube');
                              onSyncWallLabel('YOUTUBE TV', preset.title);
                            }}
                            className="rounded-xl border border-neutral-800 bg-neutral-900/75 hover:border-amber-400/60 hover:bg-neutral-900 p-3.5 text-left cursor-pointer transition-colors"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-mono uppercase text-amber-400">{preset.category}</span>
                              <Star className="h-3.5 w-3.5 text-amber-400/80" />
                            </div>
                            <div className="text-sm font-semibold text-white mt-1 line-clamp-1">{preset.title}</div>
                            <div className="text-xs text-neutral-400 mt-0.5">{preset.channel}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 2: YOUTUBE PLAYER */}
                {activeTab === 'youtube' && (
                  <div className="space-y-4">
                    <form onSubmit={handleLoadYouTube} className="flex flex-col sm:flex-row gap-2">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                        <input
                          type="text"
                          value={ytInput}
                          onChange={(e) => setYtInput(e.target.value)}
                          placeholder="Paste any YouTube URL (watch?v=..., youtu.be/..., shorts/...) or Video ID"
                          className="w-full rounded-xl border border-neutral-700 bg-neutral-900 pl-9 pr-3 py-2.5 text-xs sm:text-sm text-white placeholder:text-neutral-500 focus:border-red-500 focus:outline-none"
                        />
                      </div>
                      <button
                        type="submit"
                        className="rounded-xl bg-red-600 hover:bg-red-500 px-5 py-2.5 text-xs font-bold text-white cursor-pointer shrink-0"
                      >
                        Play Video
                      </button>
                      <button
                        type="button"
                        onClick={() => setYtPrivacyDomain((prev) => !prev)}
                        className="rounded-xl border border-neutral-700 bg-neutral-900 hover:bg-neutral-800 px-3 py-2.5 text-[11px] font-mono text-neutral-300 cursor-pointer shrink-0"
                      >
                        {ytPrivacyDomain ? 'NoCookie: ON' : 'Standard YT'}
                      </button>
                    </form>

                    {ytError && (
                      <div className="rounded-xl border border-amber-700/60 bg-amber-950/40 px-3.5 py-2 text-xs text-amber-200">
                        {ytError}
                      </div>
                    )}

                    <div className="relative w-full aspect-video rounded-2xl overflow-hidden border border-neutral-800 bg-black shadow-xl">
                      <iframe
                        key={ytIframeSrc}
                        src={ytIframeSrc}
                        title={ytEmbed.title}
                        className="w-full h-full border-0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                      />
                    </div>

                    <div>
                      <div className="text-xs font-mono uppercase tracking-wider text-neutral-400 mb-2.5">
                        Curated Theater Channels
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                        {YOUTUBE_PRESETS.map((preset) => {
                          const active = ytEmbed.id === preset.videoId;
                          return (
                            <button
                              key={preset.id}
                              onClick={() => {
                                setYtError(null);
                                setYtEmbed({ type: 'video', id: preset.videoId, title: preset.title });
                                onSyncWallLabel('YOUTUBE TV', preset.title);
                              }}
                              className={`rounded-xl border p-3 text-left transition-colors cursor-pointer ${
                                active
                                  ? 'border-red-500 bg-red-950/35 text-white'
                                  : 'border-neutral-800 bg-neutral-900/70 hover:border-neutral-700 text-neutral-200'
                              }`}
                            >
                              <div className="text-[10px] font-mono uppercase text-red-400">{preset.category}</div>
                              <div className="text-xs font-bold mt-0.5 line-clamp-1">{preset.title}</div>
                              <div className="text-[11px] text-neutral-400">{preset.channel}</div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 3: 3D WALL MEDIA PROJECTOR */}
                {activeTab === 'media' && (
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-purple-500/35 bg-purple-950/20 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-bold text-white">
                          3D Cinema Wall Live Projector (THREE.VideoTexture)
                        </h3>
                        <p className="text-xs text-neutral-300 mt-0.5">
                          Pick a video file from your device or enter a direct `.mp4`/`.webm` stream to project live onto
                          Floor 6&rsquo;s 3D cinema wall.
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="video/*"
                          onChange={handleFilePicked}
                          className="hidden"
                        />
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="flex items-center gap-2 rounded-xl bg-purple-600 hover:bg-purple-500 px-4 py-2 text-xs font-bold text-white cursor-pointer"
                        >
                          <Upload className="h-4 w-4" />
                          Choose Local Video
                        </button>
                      </div>
                    </div>

                    <form onSubmit={handleLoadDirectVideoUrl} className="flex gap-2">
                      <input
                        type="text"
                        value={mediaUrlInput}
                        onChange={(e) => setMediaUrlInput(e.target.value)}
                        placeholder="Direct CORS-enabled .mp4 / .webm URL..."
                        className="flex-1 rounded-xl border border-neutral-700 bg-neutral-900 px-3.5 py-2 text-xs sm:text-sm text-white placeholder:text-neutral-500 focus:border-purple-500 focus:outline-none"
                      />
                      <button
                        type="submit"
                        className="rounded-xl bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 px-4 py-2 text-xs font-bold text-white cursor-pointer"
                      >
                        Load Stream
                      </button>
                    </form>

                    <div className="rounded-2xl border border-neutral-800 bg-black overflow-hidden">
                      <div className="relative aspect-video w-full bg-neutral-950 flex items-center justify-center">
                        <canvas
                          ref={previewCanvasRef}
                          width={640}
                          height={360}
                          className={`w-full h-full object-contain ${activeVideoTitle ? 'block' : 'hidden'}`}
                        />
                        {!activeVideoTitle && (
                          <div className="text-center p-6 space-y-2">
                            <MonitorPlay className="h-10 w-10 text-neutral-600 mx-auto" />
                            <div className="text-sm font-semibold text-neutral-300">No Local Video Loaded</div>
                            <div className="text-xs text-neutral-500 max-w-sm">
                              Click &ldquo;Choose Local Video&rdquo; above to project any movie file directly onto your
                              mansion&rsquo;s 3D cinema screen.
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-800 bg-neutral-900/90 px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            disabled={!activeVideoTitle}
                            onClick={handleTogglePlayPause}
                            className="rounded-lg bg-purple-600 disabled:bg-neutral-800 disabled:text-neutral-600 hover:bg-purple-500 p-2 text-white cursor-pointer"
                            aria-label={isVideoPlaying ? 'Pause' : 'Play'}
                          >
                            {isVideoPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                          </button>
                          <button
                            disabled={!activeVideoTitle}
                            onClick={handleToggleMute}
                            className="rounded-lg bg-neutral-800 disabled:text-neutral-600 hover:bg-neutral-700 p-2 text-neutral-200 cursor-pointer"
                            aria-label={isVideoMuted ? 'Unmute' : 'Mute'}
                          >
                            {isVideoMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                          </button>
                          <span className="text-xs font-mono text-neutral-300 ml-1">
                            {formatSec(videoProgress.current)} / {formatSec(videoProgress.duration)}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            disabled={!activeVideoTitle}
                            onClick={() => onToggleWallProjection(!isWallProjected)}
                            className={`rounded-lg px-3 py-1.5 text-xs font-bold border cursor-pointer ${
                              isWallProjected
                                ? 'bg-emerald-600/20 border-emerald-500/50 text-emerald-300'
                                : 'bg-neutral-800 border-neutral-700 text-neutral-300'
                            }`}
                          >
                            {isWallProjected ? '3D Wall Projection: ON' : 'Project to 3D Wall'}
                          </button>
                          {activeVideoTitle && (
                            <button
                              onClick={onStopWallVideo}
                              className="rounded-lg bg-rose-950/60 border border-rose-800/70 hover:bg-rose-900/60 px-3 py-1.5 text-xs font-semibold text-rose-200 cursor-pointer"
                            >
                              Stop
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 4: OTT LAUNCHER & LIVE WEB SEARCH */}
                {activeTab === 'ott' && (
                  <div className="space-y-5">
                    <div className="rounded-2xl border border-neutral-800 bg-neutral-900/70 p-4 space-y-3">
                      <div className="text-xs font-mono uppercase tracking-wider text-sky-400">
                        Smart TV Open Knowledge Browser (Live Search)
                      </div>
                      <form onSubmit={handleWikiSearch} className="flex gap-2">
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search movies, science, survival topics, cities..."
                          className="flex-1 rounded-xl border border-neutral-700 bg-neutral-950 px-3.5 py-2 text-xs sm:text-sm text-white placeholder:text-neutral-500 focus:border-sky-500 focus:outline-none"
                        />
                        <button
                          type="submit"
                          disabled={searchLoading}
                          className="rounded-xl bg-sky-600 hover:bg-sky-500 disabled:bg-neutral-700 px-4 py-2 text-xs font-bold text-white cursor-pointer"
                        >
                          {searchLoading ? 'Searching...' : 'Search Web Index'}
                        </button>
                      </form>
                      {searchStatus && <div className="text-xs text-amber-300">{searchStatus}</div>}
                      {searchResults.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                          {searchResults.map((hit) => (
                            <div
                              key={hit.title}
                              className="rounded-xl border border-neutral-800 bg-neutral-950 p-3 space-y-1"
                            >
                              <div className="text-xs font-bold text-sky-300">{hit.title}</div>
                              <p className="text-[11px] text-neutral-300 line-clamp-3">{hit.snippet}...</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="text-xs font-mono uppercase tracking-wider text-neutral-400 mb-2.5">
                        OTT Streaming Services (Interactive Smart TV Overlays)
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        <button
                          onClick={() => selectTab('youtube')}
                          className="rounded-xl border border-red-500/45 bg-red-950/30 hover:bg-red-950/55 p-4 text-left cursor-pointer"
                        >
                          <div className="font-bold text-sm text-white">YouTube</div>
                          <div className="text-[11px] text-neutral-300 mt-1">Real Embedded Video &amp; URL Player</div>
                        </button>
                        <button
                          onClick={() => openStreamingService('netflix')}
                          className="rounded-xl border border-[#E50914]/50 bg-[#2b090d] hover:bg-[#3f0d13] p-4 text-left cursor-pointer"
                        >
                          <div className="font-bold text-sm text-white">Netflix</div>
                          <div className="text-[11px] text-neutral-300 mt-1">Open Smart TV Catalog &amp; Player</div>
                        </button>
                        <button
                          onClick={() => openStreamingService('disney')}
                          className="rounded-xl border border-[#0063E5]/50 bg-[#081a40] hover:bg-[#0d275c] p-4 text-left cursor-pointer"
                        >
                          <div className="font-bold text-sm text-white">Disney+</div>
                          <div className="text-[11px] text-neutral-300 mt-1">Open Disney/Marvel/NatGeo TV</div>
                        </button>
                        <button
                          onClick={() => openStreamingService('prime')}
                          className="rounded-xl border border-[#00A8E1]/50 bg-[#082433] hover:bg-[#0c354b] p-4 text-left cursor-pointer"
                        >
                          <div className="font-bold text-sm text-white">Prime Video</div>
                          <div className="text-[11px] text-neutral-300 mt-1">Open Amazon Originals &amp; X-Ray</div>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 5: AURELION LIVE ESTATE TELEMETRY CHANNELS */}
                {activeTab === 'estate' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="rounded-2xl border border-amber-500/30 bg-neutral-900/80 p-4 space-y-2">
                        <div className="text-xs font-mono uppercase text-amber-400">CH-01 · Power &amp; Solar Grid</div>
                        <div className="text-2xl font-bold text-white">
                          +{snapshot?.power.totalGenerationKw.toFixed(1) ?? '0.0'} kW
                          <span className="text-xs font-normal text-neutral-400 ml-2">
                            / {snapshot?.power.totalDemandKw.toFixed(1) ?? '0.0'} kW Load
                          </span>
                        </div>
                        <div className="text-xs text-neutral-300 font-mono">
                          Battery: {snapshot?.power.batteryPercent ?? 0}% · Generator:{' '}
                          {snapshot?.power.generatorRunning ? 'RUNNING' : 'STANDBY'} · Solar: +
                          {snapshot?.power.solarKw.toFixed(1) ?? '0.0'} kW
                        </div>
                      </div>

                      <div className="rounded-2xl border border-cyan-500/30 bg-neutral-900/80 p-4 space-y-2">
                        <div className="text-xs font-mono uppercase text-cyan-400">
                          CH-02 · B2 Water &amp; Pump Telemetry
                        </div>
                        <div className="text-2xl font-bold text-white">
                          {snapshot?.water.treatedLiters ?? 0} L
                          <span className="text-xs font-normal text-cyan-300 ml-2">
                            @ {snapshot?.water.waterPressureBar?.toFixed(1) ?? '0.0'} BAR
                          </span>
                        </div>
                        <div className="text-xs text-neutral-300 font-mono">
                          Booster Pump: {snapshot?.water.waterPumpActive ? 'PRESSURIZED' : 'IDLE'} · RO/UV:{' '}
                          {snapshot?.water.purifierActive ? `${snapshot.water.purificationLitersPerHour} L/h` : 'PAUSED'}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-emerald-500/30 bg-neutral-900/80 p-4 space-y-2">
                        <div className="text-xs font-mono uppercase text-emerald-400">CH-03 · Compound Defense Matrix</div>
                        <div className="text-2xl font-bold text-white">
                          {snapshot?.security.turretsOnline ?? 0} Turrets Online
                        </div>
                        <div className="text-xs text-neutral-300 font-mono">
                          Neutralized: {snapshot?.security.turretKills ?? 0} · Open Gates:{' '}
                          {snapshot?.security.gatesOpenCount ?? 0}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-purple-500/30 bg-neutral-900/80 p-4 space-y-2">
                        <div className="text-xs font-mono uppercase text-purple-400">
                          CH-04 · Sky &amp; B2 Hydroponics
                        </div>
                        <div className="text-2xl font-bold text-white">
                          {snapshot?.agriculture.ripeCount ?? 0} / 12 Floor 5 Ripe
                        </div>
                        <div className="text-xs text-neutral-300 font-mono">
                          Total Harvested: {snapshot?.agriculture.totalHarvestedCrops ?? 0} · Grow Lights:{' '}
                          {snapshot?.agriculture.growLightsPowered ? 'ON' : 'OFF'}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {/* TAB 6: GLOBAL MEDIA NETWORK LIVE CHANNELS */}
                {activeTab === 'news' && (
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h3 className="text-base font-bold text-white">Global Media Network · Live Broadcast Tuner</h3>
                        <p className="text-xs text-neutral-400">
                          Synchronized with Oakridge Media Tower, living-room TVs, and world screens
                        </p>
                      </div>
                      {onOpenGlobalMediaDashboard && (
                        <button
                          onClick={onOpenGlobalMediaDashboard}
                          className="rounded-lg bg-sky-600 hover:bg-sky-500 px-3 py-1.5 text-xs font-bold text-white cursor-pointer"
                        >
                          Open Full Media Control
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {(mediaSnapshot?.channels ?? []).map((ch) => {
                        const isActive = mediaSnapshot?.activeChannelId === ch.definition.id;
                        const isEmergency = ch.priority === 'emergency' || ch.status === 'eas_override';
                        return (
                          <button
                            key={ch.definition.id}
                            onClick={() => {
                              onSelectMediaChannel?.(ch.definition.id);
                              onSyncWallLabel(ch.definition.name.toUpperCase(), ch.headline);
                            }}
                            className={`rounded-xl border p-3.5 text-left cursor-pointer transition-colors ${
                              isActive
                                ? 'border-amber-400 bg-sky-950/50'
                                : 'border-neutral-800 bg-neutral-900/70 hover:border-neutral-600'
                            }`}
                          >
                            <div className="flex items-center justify-between text-xs font-mono">
                              <span style={{ color: ch.definition.accentHex }}>{ch.definition.channelBadge}</span>
                              <span className={isEmergency ? 'text-rose-400' : 'text-emerald-400'}>
                                {isActive ? 'ON AIR' : ch.status.replace('_', ' ')}
                              </span>
                            </div>
                            <div className="mt-1 text-sm font-bold text-white">{ch.definition.name}</div>
                            <div className="mt-1 text-xs text-neutral-300 line-clamp-2">{ch.headline}</div>
                            <div className="mt-2 text-[11px] text-neutral-400">{ch.definition.leadPresenter}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};
