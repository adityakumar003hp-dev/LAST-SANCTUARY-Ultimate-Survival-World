import React from 'react';
import { 
  X, 
  ShieldCheck, 
  Crosshair, 
  Droplets, 
  Zap, 
  Fan, 
  Warehouse, 
  DoorClosed, 
  Activity, 
  RefreshCw,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Sun,
  BatteryCharging
} from 'lucide-react';

interface ApartmentStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Live states
  compoundGateOpen: boolean;
  onToggleCompoundGate: () => void;
  garageShutterOpen: boolean;
  onToggleGarageShutter: () => void;
  frontDoorOpen: boolean;
  onToggleFrontDoor: () => void;
  fanOn: boolean;
  onToggleFan: () => void;
  acOn: boolean;
  onToggleAC: () => void;
  turretKills?: number;
}

export const ApartmentStatusModal: React.FC<ApartmentStatusModalProps> = ({
  isOpen,
  onClose,
  compoundGateOpen,
  onToggleCompoundGate,
  garageShutterOpen,
  onToggleGarageShutter,
  frontDoorOpen,
  onToggleFrontDoor,
  fanOn,
  onToggleFan,
  acOn,
  onToggleAC,
  turretKills = 0,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-5 select-none">
      <div className="flex h-[92vh] w-full max-w-4xl flex-col rounded-2xl bg-neutral-950/98 border border-neutral-800 shadow-2xl text-neutral-100 overflow-hidden">
        {/* Terminal Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 px-6 py-4 bg-neutral-900/60">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-teal-500/15 p-2 text-teal-400 border border-teal-500/30">
              <Activity className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-[0.25em] text-teal-400">
                  Building Management System • Ground Floor OS
                </span>
                <span className="flex items-center gap-1 rounded bg-emerald-950/80 border border-emerald-800/60 px-2 py-0.5 text-[10px] font-mono font-bold text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  ONLINE
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold tracking-wide text-neutral-100">
                Sanctuary Residence & Defense Command
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-2 hover:bg-neutral-800 transition-colors text-neutral-400 hover:text-white cursor-pointer"
            aria-label="Close terminal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Dashboard Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 grid gap-5 sm:grid-cols-2">
          {/* Card 1: Apartment Health & Structure */}
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="flex items-center gap-2 text-sm font-bold text-neutral-200">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  Structural Integrity & Health
                </span>
                <span className="text-sm font-mono font-bold text-emerald-400">100% NOMINAL</span>
              </div>
              <div className="h-3 w-full rounded-full bg-neutral-800 overflow-hidden border border-neutral-700/60">
                <div className="h-full w-full bg-gradient-to-r from-teal-500 to-emerald-400" />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg bg-neutral-950/70 border border-neutral-800/80 p-2.5">
                  <span className="text-neutral-400 block text-[10px] uppercase">Perimeter Wall</span>
                  <strong className="text-neutral-200">Grade IV Concrete</strong>
                </div>
                <div className="rounded-lg bg-neutral-950/70 border border-neutral-800/80 p-2.5">
                  <span className="text-neutral-400 block text-[10px] uppercase">Glazing</span>
                  <strong className="text-neutral-200">Ballistic Triple-Pane</strong>
                </div>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs text-neutral-400 border-t border-neutral-800/80 pt-3">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
              <span>Zero structural breaches detected across all 5 floors and basement.</span>
            </div>
          </div>

          {/* Card 2: Dual CIWS Sentry Turrets */}
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="flex items-center gap-2 text-sm font-bold text-neutral-200">
                  <Crosshair className="h-4 w-4 text-rose-400" />
                  Gate Defense Sentry Turrets
                </span>
                <span className="text-xs font-mono font-bold text-rose-400 bg-rose-950/60 border border-rose-800/60 px-2 py-0.5 rounded">
                  ARMED • AUTONOMOUS
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg bg-neutral-950/70 border border-neutral-800/80 p-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-400 text-[10px] uppercase">Turret Alpha</span>
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  </div>
                  <strong className="text-neutral-200 block mt-1">30mm CIWS Pod</strong>
                  <span className="text-[11px] font-mono text-emerald-400">500 / 500 Rds</span>
                </div>
                <div className="rounded-lg bg-neutral-950/70 border border-neutral-800/80 p-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-400 text-[10px] uppercase">Turret Bravo</span>
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  </div>
                  <strong className="text-neutral-200 block mt-1">30mm CIWS Pod</strong>
                  <span className="text-[11px] font-mono text-emerald-400">500 / 500 Rds</span>
                </div>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between text-xs text-neutral-400 border-t border-neutral-800/80 pt-3">
              <span>Threat Engagements: <strong className="text-amber-400 font-mono">{turretKills}</strong> Neutralized</span>
              <span className="text-[11px] text-teal-400 font-mono">180° Perimeter Arc</span>
            </div>
          </div>

          {/* Card 3: Water Purifier & Reservoir */}
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="flex items-center gap-2 text-sm font-bold text-neutral-200">
                  <Droplets className="h-4 w-4 text-cyan-400" />
                  Water Purification & Reserves
                </span>
                <span className="text-xs font-mono font-bold text-cyan-400">99.4% PURITY</span>
              </div>
              <div className="space-y-1.5 mb-3">
                <div className="flex justify-between text-xs text-neutral-300">
                  <span>Filtered Storage Tank</span>
                  <span className="font-mono font-bold">850 L / 1,000 L</span>
                </div>
                <div className="h-2.5 w-full rounded-full bg-neutral-800 overflow-hidden border border-neutral-700/60">
                  <div className="h-full w-[85%] bg-gradient-to-r from-sky-500 to-cyan-400" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg bg-neutral-950/70 border border-neutral-800/80 p-2.5">
                  <span className="text-neutral-400 block text-[10px] uppercase">Filter Medium</span>
                  <strong className="text-neutral-200">Reverse Osmosis + UV</strong>
                </div>
                <div className="rounded-lg bg-neutral-950/70 border border-neutral-800/80 p-2.5">
                  <span className="text-neutral-400 block text-[10px] uppercase">Processing Rate</span>
                  <strong className="text-neutral-200">15.0 L / hour</strong>
                </div>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs text-neutral-400 border-t border-neutral-800/80 pt-3">
              <CheckCircle2 className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
              <span>Full plumbing pressure supplied to Kitchen, Med Clinic, Bathrooms & Pool.</span>
            </div>
          </div>

          {/* Card 4: Electricity, Microgrid & Solar */}
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="flex items-center gap-2 text-sm font-bold text-neutral-200">
                  <Zap className="h-4 w-4 text-amber-400" />
                  Electricity & Microgrid Power
                </span>
                <span className="text-xs font-mono font-bold text-amber-400">AUTONOMOUS</span>
              </div>
              <div className="space-y-1.5 mb-3">
                <div className="flex justify-between text-xs text-neutral-300">
                  <span>LiFePO4 Battery Banks</span>
                  <span className="font-mono font-bold">44.2 / 50.0 kWh (88%)</span>
                </div>
                <div className="h-2.5 w-full rounded-full bg-neutral-800 overflow-hidden border border-neutral-700/60">
                  <div className="h-full w-[88%] bg-gradient-to-r from-amber-500 to-emerald-400" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="rounded-lg bg-neutral-950/70 border border-neutral-800/80 p-2">
                  <span className="text-neutral-400 block text-[9px] uppercase">Solar In</span>
                  <strong className="text-emerald-400 font-mono">+5.4 kW</strong>
                </div>
                <div className="rounded-lg bg-neutral-950/70 border border-neutral-800/80 p-2">
                  <span className="text-neutral-400 block text-[9px] uppercase">Current Load</span>
                  <strong className="text-amber-300 font-mono">-2.1 kW</strong>
                </div>
                <div className="rounded-lg bg-neutral-950/70 border border-neutral-800/80 p-2">
                  <span className="text-neutral-400 block text-[9px] uppercase">Generator</span>
                  <strong className="text-sky-300 font-mono">STANDBY</strong>
                </div>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs text-neutral-400 border-t border-neutral-800/80 pt-3">
              <Sun className="h-3.5 w-3.5 text-amber-400 shrink-0" />
              <span>Net energy balance is positive (+3.3 kW surplus charging batteries).</span>
            </div>
          </div>

          {/* Card 5: Security Openings Remote Access */}
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5 sm:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <span className="flex items-center gap-2 text-sm font-bold text-neutral-200">
                <Warehouse className="h-4 w-4 text-teal-400" />
                Access Control & Perimeter Openings
              </span>
              <span className="text-xs text-neutral-400">Remote Overrides</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Compound Main Gate */}
              <div className="rounded-xl border border-neutral-800 bg-neutral-950/80 p-3.5 flex flex-col justify-between">
                <div>
                  <span className="text-xs font-semibold text-neutral-300 block mb-1">Compound Main Gate</span>
                  <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold mb-3 ${
                    compoundGateOpen 
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60' 
                      : 'bg-rose-950 text-rose-400 border border-rose-800/60'
                  }`}>
                    {compoundGateOpen ? 'OPEN (ACCESSIBLE)' : 'CLOSED (SECURED)'}
                  </span>
                </div>
                <button
                  onClick={onToggleCompoundGate}
                  className="w-full py-2 px-3 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs font-bold transition-colors cursor-pointer text-neutral-200"
                >
                  {compoundGateOpen ? 'Close Main Gate' : 'Open Main Gate'}
                </button>
              </div>

              {/* Backyard Garage Shutter */}
              <div className="rounded-xl border border-neutral-800 bg-neutral-950/80 p-3.5 flex flex-col justify-between">
                <div>
                  <span className="text-xs font-semibold text-neutral-300 block mb-1">Backyard Garage Shutter</span>
                  <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold mb-3 ${
                    garageShutterOpen 
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60' 
                      : 'bg-rose-950 text-rose-400 border border-rose-800/60'
                  }`}>
                    {garageShutterOpen ? 'OPEN (VEHICLES ACCESSIBLE)' : 'LOWERED (LOCKED)'}
                  </span>
                </div>
                <button
                  onClick={onToggleGarageShutter}
                  className="w-full py-2 px-3 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs font-bold transition-colors cursor-pointer text-neutral-200"
                >
                  {garageShutterOpen ? 'Lower Garage Shutter' : 'Raise Garage Shutter'}
                </button>
              </div>

              {/* Front Entrance Double Doors */}
              <div className="rounded-xl border border-neutral-800 bg-neutral-950/80 p-3.5 flex flex-col justify-between">
                <div>
                  <span className="text-xs font-semibold text-neutral-300 block mb-1">Front Residence Doors</span>
                  <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold mb-3 ${
                    frontDoorOpen 
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60' 
                      : 'bg-rose-950 text-rose-400 border border-rose-800/60'
                  }`}>
                    {frontDoorOpen ? 'DOORS AJAR (OPEN)' : 'CLOSED (SECURE LOCK)'}
                  </span>
                </div>
                <button
                  onClick={onToggleFrontDoor}
                  className="w-full py-2 px-3 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs font-bold transition-colors cursor-pointer text-neutral-200"
                >
                  {frontDoorOpen ? 'Close Front Doors' : 'Open Front Doors'}
                </button>
              </div>
            </div>
          </div>

          {/* Card 6: Environmental Life Support & Climate */}
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5 sm:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <span className="flex items-center gap-2 text-sm font-bold text-neutral-200">
                <Fan className="h-4 w-4 text-cyan-400" />
                Atmospheric Control & Indoor Climate
              </span>
              <span className="text-xs text-neutral-400">Indoor Temp: 21.5°C • HEPA Level 4 Clean</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-xl border border-neutral-800 bg-neutral-950/80 p-3.5 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-neutral-200 block">Living Room Ceiling Fan</span>
                  <span className="text-[11px] text-neutral-400 font-mono">
                    Status: {fanOn ? 'ACTIVE (AIR ROTATION)' : 'STOPPED'}
                  </span>
                </div>
                <button
                  onClick={onToggleFan}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    fanOn 
                      ? 'bg-cyan-600 text-white hover:bg-cyan-500' 
                      : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                  }`}
                >
                  {fanOn ? 'Turn OFF' : 'Turn ON'}
                </button>
              </div>

              <div className="rounded-xl border border-neutral-800 bg-neutral-950/80 p-3.5 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-neutral-200 block">Wall-Mounted Air Conditioner</span>
                  <span className="text-[11px] text-neutral-400 font-mono">
                    Status: {acOn ? 'COOLING (21.5°C)' : 'STANDBY'}
                  </span>
                </div>
                <button
                  onClick={onToggleAC}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    acOn 
                      ? 'bg-emerald-600 text-white hover:bg-emerald-500' 
                      : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                  }`}
                >
                  {acOn ? 'Turn OFF' : 'Turn ON'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="border-t border-neutral-800 px-6 py-3.5 text-xs text-neutral-500 flex items-center justify-between bg-neutral-950">
          <span>Sanctuary BMS • Firmware v4.2.8 • Ground Floor Master Console</span>
          <span>Press [Esc] or Click Close to Exit Terminal</span>
        </footer>
      </div>
    </div>
  );
};
