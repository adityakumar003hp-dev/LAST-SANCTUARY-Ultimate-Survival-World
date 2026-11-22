import React, { useState, useEffect } from 'react';
import { 
  X, 
  ShieldCheck, 
  Crosshair, 
  Droplets, 
  Zap, 
  Warehouse, 
  DoorClosed, 
  DoorOpen,
  Activity, 
  AlertTriangle,
  Radio,
  Compass,
  Layers,
  Battery,
  Flame,
  CheckCircle2,
  Lock,
  Unlock
} from 'lucide-react';

export interface SecurityCommandCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Gate states
  compoundGateOpen: boolean;
  onToggleCompoundGate: () => void;
  garageShutterOpen: boolean;
  onToggleGarageShutter: () => void;
  frontDoorOpen: boolean;
  onToggleFrontDoor: () => void;
  patioDoorOpen?: boolean;
  onTogglePatioDoor?: () => void;
  westPedestrianDoorOpen?: boolean;
  onToggleWestPedestrianDoor?: () => void;
  eastPedestrianDoorOpen?: boolean;
  onToggleEastPedestrianDoor?: () => void;
  // Turret telemetry
  turrets?: Array<{
    id: string;
    name: string;
    ammo: number;
    maxAmmo: number;
    health: number;
    maxHealth: number;
    isReloading: boolean;
    targetType: string | null;
    killsCount: number;
    isLockedOn: boolean;
  }>;
  // Hostile entities within 5km for radar
  radarEntities?: Array<{
    id: string;
    type: 'zombie' | 'creature' | 'player' | 'base';
    name: string;
    distance: number;
    angle: number; // degrees
    dangerLevel: 'high' | 'medium' | 'low';
  }>;
  playerPosition?: [number, number, number];
}

export const SecurityCommandCenterModal: React.FC<SecurityCommandCenterModalProps> = ({
  isOpen,
  onClose,
  compoundGateOpen,
  onToggleCompoundGate,
  garageShutterOpen,
  onToggleGarageShutter,
  frontDoorOpen,
  onToggleFrontDoor,
  patioDoorOpen = true,
  onTogglePatioDoor,
  westPedestrianDoorOpen = false,
  onToggleWestPedestrianDoor,
  eastPedestrianDoorOpen = false,
  onToggleEastPedestrianDoor,
  turrets = [
    { id: 'turret_left', name: 'West Flank Sentry Alpha', ammo: 485, maxAmmo: 500, health: 1000, maxHealth: 1000, isReloading: false, targetType: null, killsCount: 4, isLockedOn: false },
    { id: 'turret_right', name: 'East Flank Sentry Bravo', ammo: 492, maxAmmo: 500, health: 1000, maxHealth: 1000, isReloading: false, targetType: null, killsCount: 7, isLockedOn: false }
  ],
  radarEntities = [],
  playerPosition = [-26, 0.25, 38]
}) => {
  const [radarZoom, setRadarZoom] = useState<'1km' | '2.5km' | '5km'>('5km');
  const [selectedEntity, setSelectedEntity] = useState<any | null>(null);
  const [sweepAngle, setSweepAngle] = useState(0);

  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      setSweepAngle((prev) => (prev + 3) % 360);
    }, 30);
    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  const maxRangeMeters = radarZoom === '1km' ? 1000 : radarZoom === '2.5km' ? 2500 : 5000;

  // Filter entities within maxRangeMeters
  const visibleEntities = radarEntities.filter((e) => e.distance <= maxRangeMeters);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-2 sm:p-4 select-none">
      <div className="flex h-[95vh] w-full max-w-6xl flex-col rounded-2xl bg-slate-950/98 border border-cyan-800/60 shadow-2xl text-slate-100 overflow-hidden">
        
        {/* Terminal Header */}
        <div className="flex items-center justify-between border-b border-cyan-900/60 px-4 sm:px-6 py-3 bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-cyan-500/15 p-2 text-cyan-400 border border-cyan-500/30">
              <Radio className="h-6 w-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-[0.25em] text-cyan-400">
                  TACTICAL DEFENSE OPERATING SYSTEM • GROUND FLOOR COMMAND
                </span>
                <span className="flex items-center gap-1 rounded bg-emerald-950/80 border border-emerald-800/60 px-2 py-0.5 text-[10px] font-mono font-bold text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                  ONLINE • 5 KM RADAR SYNCHRONIZED
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-bold tracking-wide text-slate-100">
                Oakridge Autonomous Security Command Terminal
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-2 hover:bg-slate-800 transition-colors text-slate-400 hover:text-white cursor-pointer"
            aria-label="Close terminal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Top Panel: Entrances & Gate States */}
        <div className="border-b border-slate-800 bg-slate-900/40 px-4 py-2.5 grid grid-cols-2 sm:grid-cols-6 gap-2 text-xs">
          {/* Compound Main Gate */}
          <div className="flex items-center justify-between rounded-lg bg-slate-950/80 p-2 border border-slate-800">
            <div>
              <div className="text-[10px] font-mono text-slate-400">MAIN GATE</div>
              <div className={`font-bold ${compoundGateOpen ? 'text-amber-400' : 'text-emerald-400'}`}>
                {compoundGateOpen ? 'OPEN' : 'SECURED'}
              </div>
            </div>
            <button
              onClick={onToggleCompoundGate}
              className={`p-1.5 rounded text-xs font-bold ${compoundGateOpen ? 'bg-amber-600/30 text-amber-300 hover:bg-amber-600/50' : 'bg-emerald-600/30 text-emerald-300 hover:bg-emerald-600/50'}`}
            >
              {compoundGateOpen ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* West Pedestrian Door */}
          <div className="flex items-center justify-between rounded-lg bg-slate-950/80 p-2 border border-slate-800">
            <div>
              <div className="text-[10px] font-mono text-slate-400">WEST PED DOOR</div>
              <div className={`font-bold ${westPedestrianDoorOpen ? 'text-amber-400' : 'text-emerald-400'}`}>
                {westPedestrianDoorOpen ? 'OPEN' : 'LOCKED'}
              </div>
            </div>
            <button
              onClick={onToggleWestPedestrianDoor}
              className={`p-1.5 rounded text-xs font-bold ${westPedestrianDoorOpen ? 'bg-amber-600/30 text-amber-300' : 'bg-emerald-600/30 text-emerald-300'}`}
            >
              {westPedestrianDoorOpen ? <DoorOpen className="w-3.5 h-3.5" /> : <DoorClosed className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* East Pedestrian Door */}
          <div className="flex items-center justify-between rounded-lg bg-slate-950/80 p-2 border border-slate-800">
            <div>
              <div className="text-[10px] font-mono text-slate-400">EAST PED DOOR</div>
              <div className={`font-bold ${eastPedestrianDoorOpen ? 'text-amber-400' : 'text-emerald-400'}`}>
                {eastPedestrianDoorOpen ? 'OPEN' : 'LOCKED'}
              </div>
            </div>
            <button
              onClick={onToggleEastPedestrianDoor}
              className={`p-1.5 rounded text-xs font-bold ${eastPedestrianDoorOpen ? 'bg-amber-600/30 text-amber-300' : 'bg-emerald-600/30 text-emerald-300'}`}
            >
              {eastPedestrianDoorOpen ? <DoorOpen className="w-3.5 h-3.5" /> : <DoorClosed className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Garage Shutter */}
          <div className="flex items-center justify-between rounded-lg bg-slate-950/80 p-2 border border-slate-800">
            <div>
              <div className="text-[10px] font-mono text-slate-400">GARAGE SHUTTER</div>
              <div className={`font-bold ${garageShutterOpen ? 'text-cyan-400' : 'text-emerald-400'}`}>
                {garageShutterOpen ? 'RAISED' : 'LOWERED'}
              </div>
            </div>
            <button
              onClick={onToggleGarageShutter}
              className={`p-1.5 rounded text-xs font-bold ${garageShutterOpen ? 'bg-cyan-600/30 text-cyan-300' : 'bg-emerald-600/30 text-emerald-300'}`}
            >
              <Warehouse className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Front Entrance Door */}
          <div className="flex items-center justify-between rounded-lg bg-slate-950/80 p-2 border border-slate-800">
            <div>
              <div className="text-[10px] font-mono text-slate-400">FRONT ENTRANCE</div>
              <div className={`font-bold ${frontDoorOpen ? 'text-amber-400' : 'text-emerald-400'}`}>
                {frontDoorOpen ? 'OPEN' : 'CLOSED'}
              </div>
            </div>
            <button
              onClick={onToggleFrontDoor}
              className={`p-1.5 rounded text-xs font-bold ${frontDoorOpen ? 'bg-amber-600/30 text-amber-300' : 'bg-emerald-600/30 text-emerald-300'}`}
            >
              {frontDoorOpen ? <DoorOpen className="w-3.5 h-3.5" /> : <DoorClosed className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Rear Patio Glass Door */}
          <div className="flex items-center justify-between rounded-lg bg-slate-950/80 p-2 border border-slate-800">
            <div>
              <div className="text-[10px] font-mono text-slate-400">REAR PATIO</div>
              <div className={`font-bold ${patioDoorOpen ? 'text-cyan-400' : 'text-emerald-400'}`}>
                {patioDoorOpen ? 'OPEN' : 'CLOSED'}
              </div>
            </div>
            <button
              onClick={onTogglePatioDoor}
              className={`p-1.5 rounded text-xs font-bold ${patioDoorOpen ? 'bg-cyan-600/30 text-cyan-300' : 'bg-emerald-600/30 text-emerald-300'}`}
            >
              {patioDoorOpen ? <DoorOpen className="w-3.5 h-3.5" /> : <DoorClosed className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Main Dashboard Layout */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4">
          
          {/* LEFT PANEL: House Health & Utility Infrastructure (3 cols) */}
          <div className="lg:col-span-3 flex flex-col gap-3">
            {/* Structural Health */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3.5">
              <div className="flex items-center justify-between mb-2">
                <span className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  House Structure
                </span>
                <span className="text-xs font-mono font-bold text-emerald-400">100% NOMINAL</span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                <div className="h-full w-full bg-emerald-500 rounded-full" />
              </div>
              <div className="mt-2 text-[10px] text-slate-400 flex justify-between">
                <span>Perimeter Barrier</span>
                <span className="text-emerald-400 font-mono">INTECT</span>
              </div>
            </div>

            {/* Electricity & Generator */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3.5">
              <div className="flex items-center justify-between mb-2">
                <span className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
                  <Zap className="h-4 w-4 text-amber-400" />
                  Power Grid & Generator
                </span>
                <span className="text-xs font-mono font-bold text-amber-400">15.0 kW</span>
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-300">
                  <span className="text-[11px] text-slate-400">Supply Voltage</span>
                  <span className="font-mono text-emerald-400">240V AC • 60Hz</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span className="text-[11px] text-slate-400">Backup Diesel Gen</span>
                  <span className="font-mono text-emerald-400">STANDBY [AUTO]</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span className="text-[11px] text-slate-400">Day-Tank Fuel</span>
                  <span className="font-mono text-cyan-400">420 L / 450 L (93%)</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden mt-1">
                  <div className="h-full w-[93%] bg-cyan-500 rounded-full" />
                </div>
              </div>
            </div>

            {/* Water Infrastructure */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3.5">
              <div className="flex items-center justify-between mb-2">
                <span className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
                  <Droplets className="h-4 w-4 text-cyan-400" />
                  Water Utility & Storage
                </span>
                <span className="text-xs font-mono font-bold text-cyan-400">12,500 L</span>
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-300">
                  <span className="text-[11px] text-slate-400">Filtration Plant</span>
                  <span className="font-mono text-emerald-400">REVERSE OSMOSIS OK</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span className="text-[11px] text-slate-400">System Pressure</span>
                  <span className="font-mono text-cyan-400">4.2 BAR (OPTIMAL)</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span className="text-[11px] text-slate-400">Purity Rating</span>
                  <span className="font-mono text-emerald-400">99.8% POTABLE</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden mt-1">
                  <div className="h-full w-full bg-cyan-400 rounded-full" />
                </div>
              </div>
            </div>

            {/* Vehicle Fleet Summary */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3.5">
              <div className="flex items-center justify-between mb-2">
                <span className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
                  <Warehouse className="h-4 w-4 text-purple-400" />
                  Garage Vehicle Fleet
                </span>
                <span className="text-xs font-mono font-bold text-purple-400">5 READY</span>
              </div>
              <div className="space-y-1 text-[11px] text-slate-300">
                <div className="flex justify-between">
                  <span>Aegis Enforcer SUV</span>
                  <span className="text-emerald-400 font-mono">100% FUEL</span>
                </div>
                <div className="flex justify-between">
                  <span>Vanguard GT Sedan</span>
                  <span className="text-emerald-400 font-mono">92% FUEL</span>
                </div>
                <div className="flex justify-between">
                  <span>Predator 450 Quad ATV</span>
                  <span className="text-emerald-400 font-mono">88% FUEL</span>
                </div>
                <div className="flex justify-between">
                  <span>Phantom 650cc Motorbike</span>
                  <span className="text-emerald-400 font-mono">95% FUEL</span>
                </div>
                <div className="flex justify-between">
                  <span>Mountain Expedition Bicycle</span>
                  <span className="text-cyan-400 font-mono">PEDAL DRIVE</span>
                </div>
              </div>
            </div>
          </div>

          {/* CENTRE: LIVE 5 KM SECURITY RADAR (6 cols) */}
          <div className="lg:col-span-6 flex flex-col rounded-xl border border-cyan-900/70 bg-slate-900/50 p-3">
            {/* Radar Controls Header */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Compass className="h-4 w-4 text-cyan-400" />
                <span className="text-xs font-bold font-mono tracking-wider text-cyan-300">
                  5,000 METER PERIMETER RADAR
                </span>
              </div>
              <div className="flex gap-1">
                {(['1km', '2.5km', '5km'] as const).map((z) => (
                  <button
                    key={z}
                    onClick={() => setRadarZoom(z)}
                    className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold transition-colors ${radarZoom === z ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
                  >
                    {z}
                  </button>
                ))}
              </div>
            </div>

            {/* Radar Circular Display */}
            <div className="relative flex-1 min-h-[300px] sm:min-h-[360px] flex items-center justify-center bg-black/60 rounded-xl overflow-hidden border border-cyan-950">
              <svg className="w-full h-full max-h-[360px] aspect-square" viewBox="-120 -120 240 240">
                {/* Background grid circles */}
                <circle cx="0" cy="0" r="100" fill="none" stroke="#0e3a47" strokeWidth="1" strokeDasharray="3 3" />
                <circle cx="0" cy="0" r="70" fill="none" stroke="#0e3a47" strokeWidth="1" strokeDasharray="3 3" />
                <circle cx="0" cy="0" r="35" fill="none" stroke="#0e3a47" strokeWidth="1" strokeDasharray="3 3" />
                
                {/* Range Labels */}
                <text x="5" y="-92" fill="#38bdf8" fontSize="6" fontFamily="monospace">5000m</text>
                <text x="5" y="-63" fill="#38bdf8" fontSize="6" fontFamily="monospace">2500m</text>
                <text x="5" y="-29" fill="#38bdf8" fontSize="6" fontFamily="monospace">1000m</text>

                {/* Crosshairs */}
                <line x1="-105" y1="0" x2="105" y2="0" stroke="#0c4a6e" strokeWidth="0.8" />
                <line x1="0" y1="-105" x2="0" y2="105" stroke="#0c4a6e" strokeWidth="0.8" />

                {/* Radar Sweep Line */}
                <line
                  x1="0"
                  y1="0"
                  x2={100 * Math.cos((sweepAngle * Math.PI) / 180)}
                  y2={100 * Math.sin((sweepAngle * Math.PI) / 180)}
                  stroke="#00ffff"
                  strokeWidth="1.5"
                  strokeOpacity="0.8"
                />

                {/* Center: Sanctuary Apartment Compound */}
                <polygon
                  points="0,-4 4,0 0,4 -4,0"
                  fill="#10b981"
                  stroke="#ffffff"
                  strokeWidth="0.8"
                />
                <text x="-12" y="10" fill="#10b981" fontSize="5" fontFamily="monospace" fontWeight="bold">SANCTUARY</text>

                {/* Player Blip */}
                <circle cx="0" cy="2" r="2.5" fill="#38bdf8" stroke="#ffffff" strokeWidth="0.8" className="animate-ping" />

                {/* Real Tracked Entities */}
                {visibleEntities.map((ent, idx) => {
                  const rNorm = (ent.distance / maxRangeMeters) * 100;
                  const rad = (ent.angle * Math.PI) / 180;
                  const cx = rNorm * Math.sin(rad);
                  const cy = -rNorm * Math.cos(rad);
                  const isHostile = ent.type === 'zombie';

                  return (
                    <g 
                      key={ent.id || idx}
                      className="cursor-pointer transition-transform hover:scale-150"
                      onClick={() => setSelectedEntity(ent)}
                    >
                      <circle
                        cx={cx}
                        cy={cy}
                        r={isHostile ? 3 : 2.5}
                        fill={isHostile ? '#ef4444' : '#f59e0b'}
                        stroke="#ffffff"
                        strokeWidth="0.6"
                      />
                    </g>
                  );
                })}
              </svg>

              {/* Selected Entity Info Overlay */}
              {selectedEntity && (
                <div className="absolute bottom-2 left-2 right-2 bg-slate-900/90 border border-cyan-800 p-2 rounded text-xs flex items-center justify-between">
                  <div>
                    <span className="font-bold text-cyan-300">{selectedEntity.name}</span>
                    <span className="text-slate-400 ml-2">[{selectedEntity.type.toUpperCase()}]</span>
                    <div className="text-[11px] text-slate-300">
                      Distance: {Math.round(selectedEntity.distance)}m • Heading: {Math.round(selectedEntity.angle)}°
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedEntity(null)}
                    className="text-slate-400 hover:text-white px-2 py-1 text-xs"
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>

            {/* Radar Coordinates & Legend */}
            <div className="mt-2 flex items-center justify-between text-[10px] font-mono text-slate-400">
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-emerald-400" /> Sanctuary Origin: [-26, 0, 38]
              </span>
              <span className="flex items-center gap-2">
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-500" /> Infected ({visibleEntities.filter(e => e.type === 'zombie').length})</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500" /> Wildlife ({visibleEntities.filter(e => e.type === 'creature').length})</span>
              </span>
            </div>
          </div>

          {/* RIGHT PANEL: DEFENSIVE TURRETS TELEMETRY (3 cols) */}
          <div className="lg:col-span-3 flex flex-col gap-3">
            <div className="text-xs font-bold font-mono tracking-wider text-cyan-400 flex items-center gap-1.5">
              <Crosshair className="h-4 w-4" /> DUAL 30MM SENTRY TURRETS
            </div>

            {turrets.map((turret) => {
              const ammoPercent = Math.round((turret.ammo / turret.maxAmmo) * 100);
              const healthPercent = Math.round((turret.health / turret.maxHealth) * 100);

              return (
                <div key={turret.id} className="rounded-xl border border-slate-800 bg-slate-900/60 p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-200">{turret.name}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                      ONLINE
                    </span>
                  </div>

                  {/* Ammo Bar */}
                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-slate-400">Ammunition</span>
                      <span className="font-mono font-bold text-amber-400">
                        {turret.isReloading ? 'RELOADING...' : `${turret.ammo} / ${turret.maxAmmo}`}
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all ${turret.isReloading ? 'bg-amber-500 animate-pulse w-full' : 'bg-cyan-500'}`}
                        style={{ width: turret.isReloading ? '100%' : `${ammoPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Health Bar */}
                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-slate-400">Integrity</span>
                      <span className="font-mono text-emerald-400">{healthPercent}%</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${healthPercent}%` }} />
                    </div>
                  </div>

                  {/* Status & Kills */}
                  <div className="pt-1 text-[11px] border-t border-slate-800/80 flex justify-between text-slate-400">
                    <span>Target: <strong className={turret.isLockedOn ? 'text-red-400' : 'text-slate-300'}>{turret.isLockedOn ? 'LOCKED' : 'PATROL SWEEP'}</strong></span>
                    <span>Kills: <strong className="text-cyan-300 font-mono">{turret.killsCount}</strong></span>
                  </div>
                </div>
              );
            })}

            {/* Defense Protocol Summary */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 space-y-1.5 text-xs text-slate-300">
              <div className="text-[10px] font-mono font-bold text-slate-400 uppercase">ENGAGEMENT DIRECTIVE</div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Rules of Engagement: Autonomous lethal interception authorised against all infected entities and feral apex predators within 32m perimeter cone. Zero friendly fire.
              </p>
            </div>
          </div>
        </div>

        {/* BOTTOM PANEL: ACTIVE DANGER & SECURITY ALERTS LOG */}
        <div className="border-t border-slate-800 bg-slate-900/80 px-4 py-2 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2 overflow-x-auto text-[11px] font-mono text-slate-300">
            <span className="text-cyan-400 font-bold">[LOG 08:42:15]</span>
            <span className="text-emerald-400">● Perimeter perimeter secure.</span>
            <span className="text-slate-500">|</span>
            <span className="text-amber-400">▲ Sentry Alpha tracking 0 infected beyond gate.</span>
            <span className="text-slate-500">|</span>
            <span className="text-cyan-300">■ Water plant pressure nominal at 4.2 bar.</span>
          </div>
          <span className="hidden sm:inline text-[10px] font-mono text-slate-500">
            SEC-COMM-REV.4
          </span>
        </div>

      </div>
    </div>
  );
};
