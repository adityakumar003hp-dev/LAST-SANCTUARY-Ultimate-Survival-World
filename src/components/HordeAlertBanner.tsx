import React from 'react';
import { AlertTriangle, Moon, Sun, ShieldAlert, Award } from 'lucide-react';

interface HordeAlertBannerProps {
  event: 'dusk_warning' | 'night_horde_start' | 'dawn_victory' | null;
  onDismiss: () => void;
}

export const HordeAlertBanner: React.FC<HordeAlertBannerProps> = ({ event, onDismiss }) => {
  if (!event) return null;

  let title = '';
  let subtitle = '';
  let borderColor = '';
  let bgColor = '';
  let textColor = '';
  let icon = null;

  if (event === 'dusk_warning') {
    title = 'DUSK APPROACHING • FORTIFY COMPOUND';
    subtitle = 'Sunset at 21:00 will awaken the Night Horde. Retreat to your fortified perimeter!';
    borderColor = 'border-amber-500/80';
    bgColor = 'bg-amber-950/90';
    textColor = 'text-amber-300';
    icon = <AlertTriangle className="h-6 w-6 text-amber-400 shrink-0" />;
  } else if (event === 'night_horde_start') {
    title = 'BLOOD MOON RISES • NIGHT HORDE ENGAGED';
    subtitle = 'Infected are converging on your sanctuary! Defend the gates and survive until dawn!';
    borderColor = 'border-rose-600/90';
    bgColor = 'bg-rose-950/90';
    textColor = 'text-rose-200';
    icon = <Moon className="h-6 w-6 text-rose-500 shrink-0" />;
  } else if (event === 'dawn_victory') {
    title = 'DAWN HAS ARRIVED • SANCTUARY DEFENDED!';
    subtitle = 'The sunrise burns away the infected horde. Victory awarded +150 XP and scavenging bonus!';
    borderColor = 'border-emerald-500/80';
    bgColor = 'bg-emerald-950/90';
    textColor = 'text-emerald-200';
    icon = <Sun className="h-6 w-6 text-yellow-400 shrink-0" />;
  }

  return (
    <div
      onClick={onDismiss}
      className="pointer-events-auto absolute top-20 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 rounded-2xl border-2 px-6 py-3.5 shadow-2xl cursor-pointer transition-all duration-300 hover:scale-[1.02] max-w-xl text-left"
      style={{ borderColor, backgroundColor: bgColor }}
    >
      {icon}
      <div>
        <h3 className={`text-sm md:text-base font-black tracking-wider uppercase ${textColor}`}>
          {title}
        </h3>
        <p className="text-xs text-neutral-300 mt-0.5 leading-snug">
          {subtitle}
        </p>
      </div>
    </div>
  );
};
