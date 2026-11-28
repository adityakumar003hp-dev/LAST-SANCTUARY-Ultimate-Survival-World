/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  X,
  Zap,
  Droplet,
  Apple,
  Shield,
  Users,
  Cpu,
  Car,
  Activity,
  BatteryCharging,
  Sun,
  Video,
  Lock,
  Unlock,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Radio,
  Sliders,
  ChevronRight,
  Flame
} from 'lucide-react';
import { BaseState, NPCRole } from '../types/game';
import { soundEngine } from '../utils/audio';

interface BaseManagementDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  baseState: BaseState;
  onToggleGenerator: () => void;
  onToggleGateLock: () => void;
  onToggleAlarm: () => void;
  onAssignNpcRole: (npcId: string, role: NPCRole) => void;
  onUnlockResearch: (techId: string) => void;
  onUpgradeBaseLevel: () => void;
  onDrawCleanWater: () => void;
  onWithdrawRation: () => void;
}

export const BaseManagementDashboardModal: React.FC<BaseManagementDashboardModalProps> = ({
  isOpen,
  onClose,
  baseState,
  onToggleGenerator,
  onToggleGateLock,
  onToggleAlarm,
  onAssignNpcRole,
  onUnlockResearch,
  onUpgradeBaseLevel,
  onDrawCleanWater,
  onWithdrawRation,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'power' | 'water_food' | 'security' | 'npcs' | 'research' | 'progression'>('overview');
  const [activeCameraId, setActiveCameraId] = useState<number>(1);

  if (!isOpen) return null;

  const { power, water, food, security, npcs, research, vehicle, level } = baseState;
  const batteryPct = Math.round((power.batteryCurrentKwh / power.batteryCapacityKwh) * 100);
  const waterPct = Math.round((water.cleanWaterLiters / water.maxCapacityLiters) * 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-2 sm:p-4 font-sans select-none">
      <div className="flex h-[90vh] w-full max-w-5xl flex-col rounded-2xl bg-neutral-950 border border-neutral-800 shadow-2xl text-neutral-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 px-6 py-4 bg-neutral-900/40">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-emerald-500/10 p-2 border border-emerald-500/20 text-emerald-400">
              <Sliders className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold tracking-wide">Apex Sanctuary Central Terminal</h2>
                <span className="rounded-md bg-emerald-950/80 px-2 py-0.5 text-xs font-mono font-bold text-emerald-400 border border-emerald-800/80">
                  LEVEL {level} ESTATE
                </span>
                <span className={`rounded-md px-2 py-0.5 text-xs font-mono font-bold border ${power.isPowered ? 'bg-sky-950/80 text-sky-400 border-sky-800/80' : 'bg-rose-950/80 text-rose-400 border-rose-800/80'}`}>
                  {power.isPowered ? 'GRID ONLINE' : 'GRID OFFLINE'}
                </span>
              </div>
              <p className="text-xs text-neutral-400">Autonomous Compound Facilities & Survivor Settlement OS</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 hover:bg-neutral-800 transition-colors text-neutral-400 hover:text-white cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 border-b border-neutral-800 px-6 py-2 bg-neutral-900/20 overflow-x-auto">
          {[
            { id: 'overview', label: 'Overview', icon: Activity },
            { id: 'power', label: 'Power Grid', icon: Zap },
            { id: 'water_food', label: 'Water & Food', icon: Droplet },
            { id: 'security', label: 'Security & CCTV', icon: Shield },
            { id: 'npcs', label: 'Survivor Roster', icon: Users },
            { id: 'research', label: 'Research Tech', icon: Cpu },
            { id: 'progression', label: 'Base Upgrades', icon: TrendingUp },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  soundEngine.playUIClick();
                  setActiveTab(tab.id as typeof activeTab);
                }}
                className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  active
                    ? 'bg-neutral-800 text-amber-400 shadow-md border border-neutral-700'
                    : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/60'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-6 bg-neutral-950/60">
          {/* TAB: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="flex flex-col gap-6">
              {/* Quick Metric Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-4">
                  <div className="flex items-center justify-between text-neutral-400 mb-2">
                    <span className="text-xs font-medium">Electricity Grid</span>
                    <Zap className="h-4 w-4 text-amber-400" />
                  </div>
                  <div className="text-xl font-bold font-mono text-amber-300">
                    {power.totalProductionKw} <span className="text-xs font-normal text-neutral-400">kW</span>
                  </div>
                  <div className="text-xs text-neutral-400 mt-1">Battery: {batteryPct}% ({Math.round(power.batteryCurrentKwh)} kWh)</div>
                </div>

                <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-4">
                  <div className="flex items-center justify-between text-neutral-400 mb-2">
                    <span className="text-xs font-medium">Potable Water</span>
                    <Droplet className="h-4 w-4 text-sky-400" />
                  </div>
                  <div className="text-xl font-bold font-mono text-sky-300">
                    {Math.round(water.cleanWaterLiters)} <span className="text-xs font-normal text-neutral-400">Liters</span>
                  </div>
                  <div className="text-xs text-neutral-400 mt-1">Filtration: {water.purificationRate} L/hr</div>
                </div>

                <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-4">
                  <div className="flex items-center justify-between text-neutral-400 mb-2">
                    <span className="text-xs font-medium">Food Reserve</span>
                    <Apple className="h-4 w-4 text-emerald-400" />
                  </div>
                  <div className="text-xl font-bold font-mono text-emerald-300">
                    {food.daysOfFoodRemaining} <span className="text-xs font-normal text-neutral-400">Days</span>
                  </div>
                  <div className="text-xs text-neutral-400 mt-1">Fridge: {Math.round(food.refrigeratorRations)} rations</div>
                </div>

                <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-4">
                  <div className="flex items-center justify-between text-neutral-400 mb-2">
                    <span className="text-xs font-medium">Security Perimeter</span>
                    <Shield className="h-4 w-4 text-emerald-400" />
                  </div>
                  <div className="text-xl font-bold text-neutral-100 flex items-center gap-1.5">
                    {security.nearbyZombiesDetected > 0 ? (
                      <span className="text-rose-400 flex items-center gap-1">
                        <AlertTriangle className="h-5 w-5 text-rose-500 animate-pulse" />
                        ALERT
                      </span>
                    ) : (
                      <span className="text-emerald-400 flex items-center gap-1">
                        <CheckCircle className="h-5 w-5 text-emerald-500" />
                        SECURE
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-neutral-400 mt-1">Horde Radar: {security.nearbyZombiesDetected} nearby</div>
                </div>
              </div>

              {/* Settlement Community Snapshot */}
              <div className="rounded-xl border border-neutral-800 bg-neutral-900/30 p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-neutral-200 flex items-center gap-2">
                    <Users className="h-4 w-4 text-sky-400" />
                    Survivor Residents ({npcs.length} Citizens)
                  </h3>
                  <button
                    onClick={() => setActiveTab('npcs')}
                    className="text-xs text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    Manage Roles <ChevronRight className="h-3 w-3" />
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {npcs.map((npc) => (
                    <div key={npc.id} className="rounded-lg border border-neutral-800 bg-neutral-950/70 p-3 flex flex-col gap-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm text-neutral-100">{npc.name}</span>
                        <span className="text-[10px] font-mono uppercase rounded bg-neutral-800 px-1.5 py-0.5 text-neutral-300">
                          {npc.role}
                        </span>
                      </div>
                      <span className="text-xs text-neutral-400">{npc.currentTask}</span>
                      <div className="flex items-center justify-between text-[11px] text-neutral-400 mt-1">
                        <span>Morale: <span className="text-emerald-400 font-semibold">{Math.round(npc.morale)}%</span></span>
                        <span>Location: {npc.assignedRoom}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Vehicle Status */}
              <div className="rounded-xl border border-neutral-800 bg-neutral-900/30 p-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-amber-500/10 p-3 border border-amber-500/20 text-amber-400">
                    <Car className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-neutral-100">{vehicle.name}</h3>
                    <p className="text-xs text-neutral-400">Parked at Estate Garage Bay • High-Performance All-Terrain</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-right">
                  <div>
                    <div className="text-sm font-bold text-amber-300 font-mono">{vehicle.batteryPercent}%</div>
                    <div className="text-[10px] text-neutral-400">EV Battery</div>
                  </div>
                  <div className="text-xs font-mono text-emerald-400 bg-emerald-950/80 px-2.5 py-1 rounded-md border border-emerald-800">
                    READY FOR EXPEDITION
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: POWER GRID */}
          {activeTab === 'power' && (
            <div className="flex flex-col gap-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Solar Status */}
                <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-semibold text-neutral-200 flex items-center gap-2">
                      <Sun className="h-4 w-4 text-amber-400" /> Rooftop Solar Arrays
                    </span>
                    <span className="text-xs font-mono text-amber-400">{power.solarProductionKw} kW</span>
                  </div>
                  <p className="text-xs text-neutral-400 leading-relaxed mb-4">
                    Monocrystalline high-efficiency panels mounted on the villa roof. Peak daylight generation reaches ~14.5 kW.
                  </p>
                  <div className="h-2 w-full bg-neutral-800 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-400 transition-all duration-300" style={{ width: `${Math.min(100, (power.solarProductionKw / 15) * 100)}%` }} />
                  </div>
                </div>

                {/* Generator Status */}
                <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-semibold text-neutral-200 flex items-center gap-2">
                      <Flame className="h-4 w-4 text-orange-500" /> Backup Fuel Generator
                    </span>
                    <span className="text-xs font-mono text-orange-400">{power.generatorProductionKw} kW</span>
                  </div>
                  <p className="text-xs text-neutral-400 leading-relaxed mb-4">
                    Heavy industrial diesel backup unit. Provides emergency baseline power for night horde defense.
                  </p>
                  <div className="flex items-center justify-between mb-3 text-xs text-neutral-300">
                    <span>Fuel Level:</span>
                    <span className="font-mono text-amber-400 font-bold">{Math.round(power.generatorFuel)}%</span>
                  </div>
                  <button
                    onClick={() => {
                      soundEngine.playBuildSnap();
                      onToggleGenerator();
                    }}
                    className={`w-full py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                      power.isGeneratorRunning
                        ? 'bg-rose-600 hover:bg-rose-500 text-white'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    }`}
                  >
                    {power.isGeneratorRunning ? 'SHUT DOWN GENERATOR' : 'START BACKUP GENERATOR'}
                  </button>
                </div>

                {/* Battery Bank */}
                <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-semibold text-neutral-200 flex items-center gap-2">
                      <BatteryCharging className="h-4 w-4 text-emerald-400" /> Lithium Storage Bank
                    </span>
                    <span className="text-xs font-mono text-emerald-400">{batteryPct}%</span>
                  </div>
                  <p className="text-xs text-neutral-400 leading-relaxed mb-4">
                    Stores excess solar energy during daytime to maintain lighting, food cooling, and security overnight.
                  </p>
                  <div className="flex items-center justify-between mb-2 text-xs text-neutral-300 font-mono">
                    <span>Capacity: {Math.round(power.batteryCurrentKwh)} / {power.batteryCapacityKwh} kWh</span>
                  </div>
                  <div className="h-2.5 w-full bg-neutral-800 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 transition-all duration-300" style={{ width: `${batteryPct}%` }} />
                  </div>
                </div>
              </div>

              {/* Facility Power Breakdown */}
              <div className="rounded-xl border border-neutral-800 bg-neutral-900/30 p-5">
                <h4 className="font-semibold text-neutral-200 text-sm mb-4">Connected Facility Load Breakdown</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 bg-neutral-950/60 rounded-lg border border-neutral-800">
                    <div className="text-neutral-400">Villa Architectural Lighting</div>
                    <div className="font-mono text-sm font-bold text-neutral-100 mt-1">1.2 kW</div>
                  </div>
                  <div className="p-3 bg-neutral-950/60 rounded-lg border border-neutral-800">
                    <div className="text-neutral-400">Cold-Storage Refrigerator</div>
                    <div className="font-mono text-sm font-bold text-neutral-100 mt-1">0.8 kW</div>
                  </div>
                  <div className="p-3 bg-neutral-950/60 rounded-lg border border-neutral-800">
                    <div className="text-neutral-400">Automated Gate & CCTV</div>
                    <div className="font-mono text-sm font-bold text-neutral-100 mt-1">1.5 kW</div>
                  </div>
                  <div className="p-3 bg-neutral-950/60 rounded-lg border border-neutral-800">
                    <div className="text-neutral-400">Research & Medical Bay</div>
                    <div className="font-mono text-sm font-bold text-neutral-100 mt-1">1.3 kW</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: WATER & FOOD */}
          {activeTab === 'water_food' && (
            <div className="flex flex-col gap-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Water System */}
                <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-5 flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-neutral-100 flex items-center gap-2">
                      <Droplet className="h-5 w-5 text-sky-400" /> Potable Water Infrastructure
                    </h3>
                    <span className="text-xs font-mono text-sky-400">{waterPct}% Stored</span>
                  </div>
                  <div className="text-xs text-neutral-400 leading-relaxed">
                    Automated rainwater collection cistern paired with multi-stage UV water purification for clean drinking and crops.
                  </div>
                  <div className="flex items-center justify-between text-xs text-neutral-300 font-mono">
                    <span>Clean Water: {Math.round(water.cleanWaterLiters)} L</span>
                    <span>Max Tank: {water.maxCapacityLiters} L</span>
                  </div>
                  <div className="h-3 w-full bg-neutral-800 rounded-full overflow-hidden">
                    <div className="h-full bg-sky-500 transition-all duration-300" style={{ width: `${waterPct}%` }} />
                  </div>
                  <button
                    onClick={() => {
                      soundEngine.playUIClick();
                      onDrawCleanWater();
                    }}
                    className="mt-2 py-2 px-4 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs transition-colors cursor-pointer"
                  >
                    DRAW CLEAN WATER BOTTLE (+1 RATION)
                  </button>
                </div>

                {/* Food Storage */}
                <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-5 flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-neutral-100 flex items-center gap-2">
                      <Apple className="h-5 w-5 text-emerald-400" /> Modern Refrigerator & Pantry
                    </h3>
                    <span className="text-xs font-mono text-emerald-400">
                      {food.isRefrigerated ? 'ACTIVE COOLING' : 'UNPOWERED'}
                    </span>
                  </div>
                  <div className="text-xs text-neutral-400 leading-relaxed">
                    Preserves perishable wild berries, harvested crops, and canned survivor rations. Stored supply supports the compound community.
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-3 bg-neutral-950/60 rounded-lg border border-neutral-800">
                      <span className="text-neutral-400">Chilled Rations</span>
                      <div className="font-mono text-base font-bold text-neutral-100 mt-1">{Math.round(food.refrigeratorRations)}</div>
                    </div>
                    <div className="p-3 bg-neutral-950/60 rounded-lg border border-neutral-800">
                      <span className="text-neutral-400">Dry Pantry Goods</span>
                      <div className="font-mono text-base font-bold text-neutral-100 mt-1">{Math.round(food.pantryRations)}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      soundEngine.playUIClick();
                      onWithdrawRation();
                    }}
                    className="mt-2 py-2 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors cursor-pointer"
                  >
                    TAKE PREPARED SURVIVOR RATION
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB: SECURITY & CCTV */}
          {activeTab === 'security' && (
            <div className="flex flex-col gap-6">
              {/* Security Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-4 flex items-center justify-between">
                  <div>
                    <div className="text-xs text-neutral-400">Automated Gate Access</div>
                    <div className="font-bold text-sm text-neutral-100 mt-1">
                      {security.activeGateLocked ? 'DEADBOLT LOCKED' : 'REMOTE UNLOCKED'}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      soundEngine.playBuildSnap();
                      onToggleGateLock();
                    }}
                    className={`p-2.5 rounded-lg border cursor-pointer ${
                      security.activeGateLocked
                        ? 'bg-rose-950/80 border-rose-800 text-rose-400'
                        : 'bg-emerald-950/80 border-emerald-800 text-emerald-400'
                    }`}
                  >
                    {security.activeGateLocked ? <Lock className="h-5 w-5" /> : <Unlock className="h-5 w-5" />}
                  </button>
                </div>

                <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-4 flex items-center justify-between">
                  <div>
                    <div className="text-xs text-neutral-400">Perimeter Intrusion Siren</div>
                    <div className="font-bold text-sm text-neutral-100 mt-1">
                      {security.isAlarmArmed ? 'ARMED (ACTIVE)' : 'DISARMED'}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      soundEngine.playBuildSnap();
                      onToggleAlarm();
                    }}
                    className={`p-2.5 rounded-lg border cursor-pointer ${
                      security.isAlarmArmed
                        ? 'bg-amber-950/80 border-amber-800 text-amber-400'
                        : 'bg-neutral-800 border-neutral-700 text-neutral-400'
                    }`}
                  >
                    <Radio className="h-5 w-5" />
                  </button>
                </div>

                <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-4 flex items-center justify-between">
                  <div>
                    <div className="text-xs text-neutral-400">Radar Motion Sensors</div>
                    <div className="font-bold text-sm text-neutral-100 mt-1 font-mono">
                      {security.nearbyZombiesDetected} Targets Detected
                    </div>
                  </div>
                  <div className={`h-3 w-3 rounded-full ${security.nearbyZombiesDetected > 0 ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                </div>
              </div>

              {/* CCTV Quad View / Feeds */}
              <div className="rounded-xl border border-neutral-800 bg-neutral-900/30 p-5 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm text-neutral-200 flex items-center gap-2">
                    <Video className="h-4 w-4 text-sky-400" />
                    Compound CCTV Video Surveillance Grid
                  </h4>
                  <div className="flex items-center gap-1.5">
                    {security.cctvChannels.map((cam) => (
                      <button
                        key={cam.id}
                        onClick={() => setActiveCameraId(cam.id)}
                        className={`px-3 py-1 text-xs font-mono font-bold rounded-md border cursor-pointer ${
                          activeCameraId === cam.id
                            ? 'bg-sky-600 text-white border-sky-500'
                            : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-neutral-200'
                        }`}
                      >
                        CAM {cam.id}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Selected Camera View Simulated Monitor */}
                <div className="relative h-64 w-full rounded-xl bg-black border-2 border-neutral-800 overflow-hidden flex items-center justify-center">
                  <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_50%,rgba(0,0,0,0.6)_51%)] bg-[size:100%_4px] opacity-40 pointer-events-none" />
                  <div className="absolute top-3 left-4 flex items-center gap-2 text-xs font-mono text-emerald-400">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span>REC • {security.cctvChannels.find((c) => c.id === activeCameraId)?.name}</span>
                  </div>
                  <div className="absolute top-3 right-4 text-xs font-mono text-neutral-400">
                    FPS: 30 • HD OPTICAL SENSOR
                  </div>

                  <div className="text-center text-neutral-500 text-xs">
                    <Shield className="h-10 w-10 mx-auto text-neutral-700 mb-2" />
                    LIVE SURVEILLANCE FEED ACTIVE
                    <div className="text-[10px] text-neutral-600 mt-1 font-mono">
                      SECTOR PERIMETER CLEAR • MOTION DETECTORS ARMED
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: SURVIVOR ROSTER */}
          {activeTab === 'npcs' && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="font-bold text-neutral-100">Settlement Citizens & Work Allocations</h3>
                  <p className="text-xs text-neutral-400">Assign survivors to roles that boost compound defenses, farming yields, and maintenance.</p>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                {npcs.map((npc) => (
                  <div key={npc.id} className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full flex items-center justify-center font-bold text-sm text-neutral-900" style={{ backgroundColor: npc.avatarColor }}>
                        {npc.name[0]}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-neutral-100">{npc.name}</span>
                          <span className="text-[10px] uppercase font-bold rounded bg-neutral-800 px-2 py-0.5 text-neutral-300">
                            {npc.role}
                          </span>
                        </div>
                        <p className="text-xs text-neutral-400 mt-0.5">{npc.currentTask}</p>
                        <div className="text-[11px] text-neutral-500 mt-1">
                          Health: {npc.health}% • Morale: {Math.round(npc.morale)}% • Quarters: {npc.assignedRoom}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 self-end sm:self-center">
                      {(['scout', 'engineer', 'botanist', 'medic'] as NPCRole[]).map((r) => (
                        <button
                          key={r}
                          onClick={() => {
                            soundEngine.playUIClick();
                            onAssignNpcRole(npc.id, r);
                          }}
                          className={`px-2.5 py-1 text-xs font-semibold rounded-md border capitalize cursor-pointer transition-colors ${
                            npc.role === r
                              ? 'bg-amber-600 text-white border-amber-500'
                              : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-neutral-200'
                          }`}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB: RESEARCH */}
          {activeTab === 'research' && (
            <div className="flex flex-col gap-4">
              <div className="mb-2">
                <h3 className="font-bold text-neutral-100">Technology Progression & Blueprints</h3>
                <p className="text-xs text-neutral-400">Unlock advanced energy storage, ballistic defenses, and vehicle modifications.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {research.map((tech) => (
                  <div key={tech.id} className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-4 flex flex-col justify-between gap-3">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-bold text-sm text-neutral-100">{tech.name}</span>
                        {tech.unlocked ? (
                          <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 font-mono">
                            <CheckCircle className="h-3.5 w-3.5" /> UNLOCKED
                          </span>
                        ) : (
                          <span className="text-[11px] font-mono text-neutral-400">
                            {tech.costComponents} Components • {tech.costMetal} Metal
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-neutral-400 leading-relaxed">{tech.description}</p>
                    </div>

                    {!tech.unlocked && (
                      <button
                        onClick={() => {
                          soundEngine.playBuildSnap();
                          onUnlockResearch(tech.id);
                        }}
                        className="py-1.5 px-3 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs transition-colors cursor-pointer self-start"
                      >
                        RESEARCH TECHNOLOGY
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB: PROGRESSION */}
          {activeTab === 'progression' && (
            <div className="flex flex-col gap-5">
              <div className="mb-1">
                <h3 className="font-bold text-neutral-100">Sanctuary Estate Development Tiers</h3>
                <p className="text-xs text-neutral-400">Progress through 4 development levels to expand survivor population, storage, and automated defenses.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  {
                    lvl: 1,
                    title: 'Level 1 — Starter Shelter',
                    desc: 'Ranger cabin with basic perimeter palisade, simple wood storage, and campfire.',
                  },
                  {
                    lvl: 2,
                    title: 'Level 2 — Modern Sanctuary (Current)',
                    desc: 'Furnished luxury villa with rooftop solar array, battery bank, modern fridge, and security gate.',
                  },
                  {
                    lvl: 3,
                    title: 'Level 3 — Advanced Compound',
                    desc: 'Swimming pool, research lab, medical recovery room, automated ballistics turrets, and survivor community.',
                  },
                  {
                    lvl: 4,
                    title: 'Level 4 — Ultimate Sanctuary',
                    desc: 'Multi-villa estate, expanded energy network, high-torque electric buggy tuning, and maximum morale.',
                  },
                ].map((tier) => (
                  <div
                    key={tier.lvl}
                    className={`rounded-xl border p-4 flex flex-col justify-between gap-3 ${
                      level >= tier.lvl
                        ? 'border-emerald-800/80 bg-emerald-950/20'
                        : 'border-neutral-800 bg-neutral-900/40 opacity-70'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-bold text-sm text-neutral-100">{tier.title}</span>
                        {level >= tier.lvl && (
                          <span className="text-[10px] font-bold text-emerald-400 font-mono bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                            ACTIVE
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-neutral-400 leading-relaxed">{tier.desc}</p>
                    </div>

                    {level === tier.lvl - 1 && (
                      <button
                        onClick={() => {
                          soundEngine.playDawnVictoryChime();
                          onUpgradeBaseLevel();
                        }}
                        className="py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors cursor-pointer self-start"
                      >
                        UPGRADE SANCTUARY TO LEVEL {tier.lvl}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
