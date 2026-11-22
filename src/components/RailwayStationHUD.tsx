import React, { useState, useEffect } from 'react';
import { soundEngine } from '../utils/audio';
import { stationAnnouncementSystem, StationAnnouncement } from '../engine/world/MultilingualAnnouncementSystem';

interface RailwayStationHUDProps {
  isVisible: boolean;
  activeTrainInfo?: {
    trainNumber: string;
    trainName: string;
    route: string;
    status: string;
    platform: number;
    countdownSeconds?: number;
  } | null;
  currentFloor: number; // 0, 1, 2, 3, 4
  onSelectFloor: (floor: 0 | 1 | 2 | 3 | 4) => void;
  onNavigateToFacility: (facilityType: 'restaurant' | 'shops' | 'medical' | 'police' | 'toilets' | 'lifts' | 'escalators') => void;
  onOpenTickets: () => void;
  onOpenOperations: () => void;
  onOpenMap: () => void;
  onOpenJourney: () => void;
  onOpenPause?: () => void;
  activeFacilityWaypoint?: { label: string; distanceMeters: number } | null;
}

export const RailwayStationHUD: React.FC<RailwayStationHUDProps> = ({
  isVisible,
  activeTrainInfo,
  currentFloor,
  onSelectFloor,
  onNavigateToFacility,
  onOpenTickets,
  onOpenOperations,
  onOpenMap,
  onOpenJourney,
  onOpenPause,
  activeFacilityWaypoint,
}) => {
  const [announcement, setAnnouncement] = useState<StationAnnouncement | null>(null);
  const [isLanguageHindi, setIsLanguageHindi] = useState(false);

  useEffect(() => {
    const unsubscribe = stationAnnouncementSystem.subscribe((anno) => {
      setAnnouncement(anno);
    });
    return unsubscribe;
  }, []);

  // Alternate announcement language between Hindi and English every 4 seconds
  useEffect(() => {
    if (!announcement) return;
    const timer = setInterval(() => {
      setIsLanguageHindi((prev) => !prev);
    }, 4000);
    return () => clearInterval(timer);
  }, [announcement]);

  if (!isVisible) return null;

  const floorCards = [
    {
      level: 4,
      title: 'Level 4',
      sub: 'Helipad & Solar',
      elevation: '14.50m',
      icon: (
        <svg className="w-6 h-6 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 3v3m0 12v3m9-9h-3M6 12H3m15.364 6.364l-2.121-2.121M8.757 8.757L6.636 6.636m12.728 0l-2.121 2.121M8.757 15.243l-2.121 2.121M12 8a4 4 0 100 8 4 4 0 000-8z" />
        </svg>
      ),
      bgGradient: 'from-violet-950/70 to-slate-900/80',
    },
    {
      level: 3,
      title: 'Level 3',
      sub: 'Skywalks & Bridge',
      elevation: '9.80m',
      icon: (
        <svg className="w-6 h-6 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 10h18M3 14h18m-9-4v8m-6-4h12" />
        </svg>
      ),
      bgGradient: 'from-sky-950/70 to-slate-900/80',
    },
    {
      level: 2,
      title: 'Level 2',
      sub: 'Lounge Area',
      elevation: '4.70m',
      icon: (
        <svg className="w-6 h-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
        </svg>
      ),
      bgGradient: 'from-amber-950/70 to-slate-900/80',
    },
    {
      level: 1,
      title: 'Level 1',
      sub: 'Waiting Hall',
      elevation: '4.70m',
      icon: (
        <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
      bgGradient: 'from-emerald-950/70 to-slate-900/80',
    },
    {
      level: 0,
      title: 'Level 0',
      sub: 'Main Entrance',
      elevation: '0.27m',
      icon: (
        <svg className="w-6 h-6 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
        </svg>
      ),
      bgGradient: 'from-rose-950/70 to-slate-900/80',
    },
  ] as const;

  return (
    <div className="pointer-events-none fixed inset-0 z-20 flex flex-col justify-between p-2 sm:p-3 select-none overflow-hidden">
      {/* ========================================================================= */}
      {/* 1. TOP HEADER: Safe Center Band Clear of HUD Top-Left Vitals & Top-Right Clock */}
      {/* ========================================================================= */}
      <div className="flex flex-col items-center gap-1.5 pt-[calc(max(0.5rem,var(--sat))+7.8rem)] [@media(orientation:landscape)]:pt-[max(0.25rem,var(--sat))] [@media(orientation:landscape)]:px-36 md:pt-2 md:px-60">
        <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 bg-slate-950/85 border border-amber-500/40 rounded-xl px-2.5 py-1.5 sm:px-3.5 sm:py-2 shadow-2xl max-w-full">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
            <h1 className="text-white text-[11px] sm:text-xs font-bold tracking-wider uppercase font-mono">
              Mega Railway Station
            </h1>
          </div>
          <span className="hidden md:inline text-[10px] text-slate-400 font-mono">
            4 Levels • 8 Platforms
          </span>
          <div className="flex items-center gap-1.5 text-[10px] sm:text-xs font-mono font-bold">
            <span className="px-1.5 py-0.5 bg-amber-500/10 border border-amber-500/30 rounded text-amber-300">
              🪙 12,580
            </span>
            <span className="px-1.5 py-0.5 bg-sky-500/10 border border-sky-500/30 rounded text-sky-300">
              💎 250
            </span>
            <span className="px-1.5 py-0.5 bg-slate-800 text-slate-200 rounded">
              Lv.42
            </span>
            {onOpenPause && (
              <button
                onClick={() => {
                  soundEngine.playUIClick();
                  onOpenPause();
                }}
                className="h-6 w-6 sm:h-7 sm:w-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white flex items-center justify-center border border-slate-700 transition-all active:scale-95 cursor-pointer"
                title="Pause"
              >
                ⏸
              </button>
            )}
          </div>
        </div>

        {/* Multilingual Station Announcement Ticker */}
        {announcement && (
          <div className="pointer-events-auto max-w-[92vw] [@media(orientation:landscape)]:max-w-md md:max-w-xl bg-gradient-to-r from-red-950/90 via-slate-950/95 to-red-950/90 border border-amber-500/50 rounded-xl px-2.5 py-1.5 sm:p-2 shadow-2xl flex items-center gap-2 sm:gap-3 animate-fade-in">
            <div className="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-lg bg-red-600/30 border border-red-500/40 text-amber-400">
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0 overflow-hidden">
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] sm:text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {isLanguageHindi ? 'सार्वजनिक घोषणा' : 'Announcement'}
                </span>
                {announcement.platformNumber && (
                  <span className="text-[9px] sm:text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    PF {announcement.platformNumber}
                  </span>
                )}
              </div>
              <p className="text-[11px] sm:text-xs font-medium text-white tracking-wide mt-0.5 truncate">
                {isLanguageHindi ? announcement.hindiText : announcement.englishText}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 2. MIDDLE ROW: Left Stacked Level Cards & Right Action Bar */}
      {/* ========================================================================= */}
      <div className="flex items-center justify-between flex-1 my-auto pointer-events-none gap-2 min-h-0">
        {/* Left Side: Floating Level Selector Stack */}
        <div className="pointer-events-auto flex flex-col gap-1 sm:gap-1.5 max-h-[38dvh] [@media(orientation:landscape)]:max-h-[48dvh] md:max-h-none overflow-y-auto pr-1">
          {floorCards.map((fl) => {
            const isActive = currentFloor === fl.level;
            return (
              <button
                key={fl.level}
                onClick={() => {
                  soundEngine.playUIClick();
                  onSelectFloor(fl.level as 0 | 1 | 2 | 3 | 4);
                }}
                className={`relative flex items-center gap-2 sm:gap-3 w-32 sm:w-44 md:w-48 p-1.5 sm:p-2 rounded-xl transition-all active:scale-95 text-left border shrink-0 ${
                  isActive
                    ? 'bg-gradient-to-r from-amber-950/90 via-slate-900/90 to-amber-950/70 border-amber-500 text-white shadow-[0_0_15px_rgba(245,158,11,0.4)]'
                    : 'bg-slate-950/80 hover:bg-slate-900/90 border-slate-800 text-slate-300 hover:text-white hover:border-slate-700'
                }`}
              >
                {/* Thumbnail Icon Preview */}
                <div
                  className={`h-8 w-8 sm:h-10 sm:w-10 md:h-11 md:w-11 rounded-lg flex items-center justify-center border shrink-0 bg-gradient-to-br ${fl.bgGradient} ${
                    isActive ? 'border-amber-400 shadow-md' : 'border-slate-700'
                  }`}
                >
                  {fl.icon}
                </div>

                {/* Card Text */}
                <div className="flex-1 overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] sm:text-xs font-black tracking-wide font-mono text-white">
                      {fl.title}
                    </span>
                    {isActive && (
                      <span className="h-2 w-2 rounded-full bg-amber-400" />
                    )}
                  </div>
                  <div className="text-[9px] sm:text-[11px] text-slate-300 font-medium truncate">
                    {fl.sub}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Right Side: Station Action Rail */}
        <div className="pointer-events-auto flex flex-col max-h-[42dvh] [@media(orientation:landscape)]:max-h-[48dvh] md:max-h-none overflow-y-auto">
          <div className="bg-slate-950/85 border border-slate-800 rounded-2xl p-1.5 sm:p-2 flex flex-col gap-1.5 sm:gap-2 shadow-2xl">
            <button
              onClick={() => { soundEngine.playUIClick(); onOpenJourney(); }}
              className="flex flex-col items-center justify-center w-11 h-11 sm:w-13 sm:h-13 md:w-14 md:h-14 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700 hover:border-amber-500/60 transition-all active:scale-95 shrink-0"
            >
              <span className="text-sm sm:text-lg">🏭</span>
              <span className="text-[8px] sm:text-[10px] font-bold font-mono tracking-wide">Journey</span>
            </button>

            <button
              onClick={() => { soundEngine.playUIClick(); onOpenMap(); }}
              className="flex flex-col items-center justify-center w-11 h-11 sm:w-13 sm:h-13 md:w-14 md:h-14 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700 hover:border-sky-500/60 transition-all active:scale-95 shrink-0"
            >
              <span className="text-sm sm:text-lg">🗺️</span>
              <span className="text-[8px] sm:text-[10px] font-bold font-mono tracking-wide">Map</span>
            </button>

            <button
              onClick={() => { soundEngine.playUIClick(); onOpenTickets(); }}
              className="flex flex-col items-center justify-center w-11 h-11 sm:w-13 sm:h-13 md:w-14 md:h-14 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700 hover:border-amber-500/60 transition-all active:scale-95 shrink-0"
            >
              <span className="text-sm sm:text-lg">🎫</span>
              <span className="text-[8px] sm:text-[10px] font-bold font-mono tracking-wide">Tickets</span>
            </button>

            <button
              onClick={() => { soundEngine.playUIClick(); onOpenOperations(); }}
              className="flex flex-col items-center justify-center w-11 h-11 sm:w-13 sm:h-13 md:w-14 md:h-14 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700 hover:border-emerald-500/60 transition-all active:scale-95 shrink-0"
            >
              <span className="text-sm sm:text-lg">🛡️</span>
              <span className="text-[8px] sm:text-[10px] font-bold font-mono tracking-wide">Security</span>
            </button>

            <button
              onClick={() => { soundEngine.playUIClick(); onOpenOperations(); }}
              className="flex flex-col items-center justify-center w-11 h-11 sm:w-13 sm:h-13 md:w-14 md:h-14 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700 hover:border-purple-500/60 transition-all active:scale-95 shrink-0"
            >
              <span className="text-sm sm:text-lg">⚙️</span>
              <span className="text-[8px] sm:text-[10px] font-bold font-mono tracking-wide">Facilities</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. WAYPOINT BEACON INDICATOR (if active) */}
      {/* ========================================================================= */}
      {activeFacilityWaypoint && (
        <div className="self-center pointer-events-auto bg-amber-950/90 border border-amber-500/60 rounded-full px-3 sm:px-4 py-1 shadow-2xl flex items-center gap-2 text-[11px] sm:text-xs font-semibold text-amber-200 mb-1.5">
          <span>📍</span>
          <span className="truncate max-w-[180px] sm:max-w-xs">Target: {activeFacilityWaypoint.label}</span>
          <span className="text-amber-400 font-mono">({Math.round(activeFacilityWaypoint.distanceMeters)}m)</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. BOTTOM BAR: Clears HUD Hotbar & Mobile Controls across orientations */}
      {/* ========================================================================= */}
      <div className="flex flex-col lg:flex-row items-center justify-between gap-2 pointer-events-auto mb-36 [@media(orientation:landscape)]:mb-14 lg:mb-0 [@media(max-height:460px)]:hidden">
        {/* Bottom Left: Live Train Status Pill */}
        <div className="bg-slate-950/90 border border-slate-700/80 rounded-full px-3 sm:px-4 py-1.5 sm:py-2 flex items-center gap-2 sm:gap-3 shadow-2xl max-w-[92vw]">
          <div className="flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 text-sm sm:text-base shrink-0">
            🚆
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs truncate">
            <span className="font-bold text-white font-mono truncate">
              {activeTrainInfo?.trainName || 'Vande Bharat Express'}
            </span>
            <span className="text-slate-400 hidden sm:inline">•</span>
            <span className="text-slate-300 font-sans hidden sm:inline truncate">
              {activeTrainInfo?.route || 'Delhi ➔ Mumbai'}
            </span>
            <span className="text-slate-400">•</span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[9px] sm:text-[10px] font-bold font-mono border border-emerald-500/30 shrink-0">
              {activeTrainInfo?.status ? (activeTrainInfo.status.includes('Doors Open') ? 'Doors Open' : 'On Time') : 'On Time'}
            </span>
          </div>
        </div>

        {/* Bottom Right: Quick Facility Navigation Bar */}
        <div className="bg-slate-950/90 border border-slate-800 rounded-full px-2 py-1 sm:px-2.5 sm:py-1.5 flex items-center gap-1 sm:gap-1.5 shadow-2xl overflow-x-auto max-w-[92vw] [@media(orientation:landscape)]:max-w-[calc(100vw-20rem)] lg:max-w-full">
          {[
            { id: 'restaurant', label: 'Restaurant', icon: '🍽️' },
            { id: 'shops', label: 'Shops', icon: '🛍️' },
            { id: 'medical', label: 'Medical', icon: '➕' },
            { id: 'police', label: 'Police', icon: '👮' },
            { id: 'toilets', label: 'Toilets', icon: '🚻' },
            { id: 'lifts', label: 'Lifts', icon: '🛗' },
            { id: 'escalators', label: 'Escalators', icon: '🪜' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => {
                soundEngine.playUIClick();
                onNavigateToFacility(item.id as any);
              }}
              className="flex items-center gap-1 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full bg-slate-900/85 hover:bg-slate-800 text-slate-300 hover:text-white text-xs border border-slate-700/60 transition-all active:scale-95 whitespace-nowrap cursor-pointer"
            >
              <span>{item.icon}</span>
              <span className="font-semibold text-[10px] sm:text-[11px]">{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
