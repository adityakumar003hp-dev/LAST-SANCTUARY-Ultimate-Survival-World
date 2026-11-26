import React, { useState, useEffect } from 'react';
import {
  X,
  UserCheck,
  ShieldCheck,
  Building2,
  MapPin,
  Lock,
  Unlock,
  CheckCircle2,
} from 'lucide-react';
import {
  NEXUS_ELEVATORS,
  NEXUS_FLOORS,
  NEXUS_FLOOR_ORDER,
  NEXUS_SCREENS_BY_FLOOR,
  type NexusClearanceLevel,
  type NexusElevatorId,
  type NexusFloorNumber,
} from '../../engine/nexus/NexusConfig';
import type { NexusDashboardSnapshot } from '../../engine/nexus/NexusSystems';

export type NexusFloor1Tab = 'visitor' | 'staff' | 'directory' | 'building' | 'security';

interface NexusFloor1ModalProps {
  initialTab: NexusFloor1Tab | null;
  snapshot: NexusDashboardSnapshot | null;
  onRegisterVisitor: (name: string, purpose: string) => void;
  onVerifyStaff: (badgeId: string, clearance: NexusClearanceLevel) => void;
  onSetClearance: (clearance: NexusClearanceLevel) => void;
  onCallElevator: (elevatorId: NexusElevatorId, floor: NexusFloorNumber) => void;
  onOpenFloorDepartment: (floor: NexusFloorNumber) => void;
  onClose: () => void;
}

const TABS: Array<{ id: NexusFloor1Tab; label: string }> = [
  { id: 'visitor', label: 'Visitor Registration' },
  { id: 'staff', label: 'Staff ID & Access' },
  { id: 'directory', label: '8-Floor Directory' },
  { id: 'security', label: 'Security & Gates' },
  { id: 'building', label: 'F1 Zones & Architecture' },
];

export const NexusFloor1Modal: React.FC<NexusFloor1ModalProps> = ({
  initialTab,
  snapshot,
  onRegisterVisitor,
  onVerifyStaff,
  onSetClearance,
  onCallElevator,
  onOpenFloorDepartment,
  onClose,
}) => {
  const [tab, setTab] = useState<NexusFloor1Tab>(initialTab || 'visitor');
  const [visitorName, setVisitorName] = useState('');
  const [visitorPurpose, setVisitorPurpose] = useState('');
  const [badgeId, setBadgeId] = useState('');
  const [requestedClearance, setRequestedClearance] = useState<NexusClearanceLevel>('executive');
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (initialTab) setTab(initialTab);
    if (snapshot) {
      setVisitorName(snapshot.systems.visitorName);
      setVisitorPurpose(snapshot.systems.visitorPurpose);
      setBadgeId(snapshot.systems.staffBadgeId);
      setRequestedClearance(snapshot.systems.clearanceLevel);
    }
  }, [initialTab]);

  if (!initialTab || !snapshot) return null;

  const sys = snapshot.systems;
  const f1Rooms = NEXUS_FLOORS[1].rooms;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 select-none">
      <div className="w-full max-w-4xl rounded-xl border border-amber-500/40 bg-neutral-950 text-neutral-100 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 bg-neutral-900 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-amber-500/15 p-2.5 text-amber-300 border border-amber-500/35">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[11px] font-mono text-amber-300/90">
                THE NEXUS · Floor 1 Grand Terminal Atrium
              </div>
              <h2 className="text-base font-semibold text-white">
                Reception, Clearance & 8-Floor Operations Directory
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-neutral-400 hover:bg-neutral-800 hover:text-white cursor-pointer"
            aria-label="Close Floor 1 reception terminal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto border-b border-neutral-800 bg-neutral-950 px-6 py-2.5">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setTab(t.id);
                setFeedback(null);
              }}
              className={`px-3.5 py-1.5 rounded-md text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                tab === t.id
                  ? 'bg-amber-500 text-neutral-950 font-semibold'
                  : 'text-neutral-300 hover:bg-neutral-800 hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {feedback && (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-700 bg-emerald-950/60 px-4 py-2.5 text-xs text-emerald-200">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>{feedback}</span>
            </div>
          )}

          {tab === 'visitor' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-white">Visitor Check-In & Logbook</h3>
                  <p className="text-xs text-neutral-400 mt-1">
                    Register your entry at THE NEXUS Southwest Visitor Bay. Check-in grants lobby and F2 Railway
                    Network Observatory entry.
                  </p>
                </div>

                <label className="block space-y-1.5">
                  <span className="text-xs font-medium text-neutral-300">Full Name / Callsign</span>
                  <input
                    type="text"
                    value={visitorName}
                    onChange={(e) => setVisitorName(e.target.value)}
                    placeholder="Enter visitor name"
                    className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white focus:border-amber-400 focus:outline-none"
                  />
                </label>

                <label className="block space-y-1.5">
                  <span className="text-xs font-medium text-neutral-300">Purpose of Visit</span>
                  <input
                    type="text"
                    value={visitorPurpose}
                    onChange={(e) => setVisitorPurpose(e.target.value)}
                    placeholder="Railway audit, radar inspection, dispatch"
                    className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white focus:border-amber-400 focus:outline-none"
                  />
                </label>

                <button
                  onClick={() => {
                    onRegisterVisitor(visitorName, visitorPurpose);
                    setFeedback(`Registered ${visitorName || 'Guest Inspector'} in THE NEXUS reception ledger.`);
                  }}
                  className="inline-flex items-center gap-2 rounded-lg bg-amber-500 hover:bg-amber-400 px-4 py-2 text-xs font-semibold text-neutral-950 cursor-pointer"
                >
                  <UserCheck className="h-4 w-4" />
                  Confirm Visitor Registration
                </button>
              </div>

              <div className="rounded-lg border border-neutral-800 bg-neutral-900/70 p-4 space-y-3 text-xs">
                <div className="font-semibold text-white">Current Atrium Pass Status</div>
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <div className="text-neutral-400">Registration</div>
                    <div className="text-neutral-100 font-medium mt-0.5">
                      {sys.visitorRegistered ? 'Checked In' : 'Pending Check-In'}
                    </div>
                  </div>
                  <div>
                    <div className="text-neutral-400">Visitor</div>
                    <div className="text-neutral-100 font-medium mt-0.5 truncate">{sys.visitorName}</div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-neutral-400">Recorded Purpose</div>
                    <div className="text-neutral-200 mt-0.5">{sys.visitorPurpose}</div>
                  </div>
                  <div>
                    <div className="text-neutral-400">Current Clearance</div>
                    <div className="text-amber-300 font-semibold capitalize mt-0.5">{sys.clearanceLevel}</div>
                  </div>
                  <div>
                    <div className="text-neutral-400">Restricted Gate</div>
                    <div className="text-neutral-100 font-medium mt-0.5">
                      {sys.restrictedRoomsUnlocked ? 'Unlocked' : 'Locked (Staff+)'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === 'staff' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-white">Staff Identification & Access Clearance</h3>
                  <p className="text-xs text-neutral-400 mt-1">
                    Verify your command credential to unlock the Floor 1 Staff Turnstile barrier and grant clearance for
                    Floors 3–8 consoles and both F7/F8 Radar Observatories.
                  </p>
                </div>

                <label className="block space-y-1.5">
                  <span className="text-xs font-medium text-neutral-300">Badge Credential ID</span>
                  <input
                    type="text"
                    value={badgeId}
                    onChange={(e) => setBadgeId(e.target.value)}
                    placeholder="NX-CMD-001"
                    className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm font-mono text-white focus:border-cyan-400 focus:outline-none"
                  />
                </label>

                <div className="space-y-1.5">
                  <span className="text-xs font-medium text-neutral-300 block">Select Active Clearance Tier</span>
                  <div className="grid grid-cols-2 gap-2">
                    {(['visitor', 'staff', 'security', 'executive'] as NexusClearanceLevel[]).map((lvl) => (
                      <button
                        key={lvl}
                        onClick={() => setRequestedClearance(lvl)}
                        className={`px-3 py-2 rounded-lg border text-xs font-medium capitalize text-left cursor-pointer ${
                          requestedClearance === lvl
                            ? 'border-cyan-400 bg-cyan-500/15 text-cyan-100'
                            : 'border-neutral-800 bg-neutral-900 text-neutral-300 hover:border-neutral-700'
                        }`}
                      >
                        {lvl}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => {
                      onVerifyStaff(badgeId, requestedClearance);
                      setFeedback(
                        `Badge ${badgeId.toUpperCase()} verified at ${requestedClearance.toUpperCase()} tier.`
                      );
                    }}
                    className="inline-flex items-center gap-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 px-4 py-2 text-xs font-semibold text-neutral-950 cursor-pointer"
                  >
                    <ShieldCheck className="h-4 w-4" />
                    Verify Badge & Update Gate
                  </button>
                </div>
              </div>

              <div className="rounded-lg border border-neutral-800 bg-neutral-900/70 p-4 space-y-3 text-xs">
                <div className="font-semibold text-white">Clearance Tier Matrix</div>
                <div className="space-y-2 text-neutral-300">
                  <div className="flex justify-between border-b border-neutral-800 pb-1.5">
                    <span>Visitor</span>
                    <span className="text-neutral-400">F1 Atrium & F2 Network Observatory</span>
                  </div>
                  <div className="flex justify-between border-b border-neutral-800 pb-1.5">
                    <span>Staff</span>
                    <span className="text-neutral-400">Unlocks F1 Gate · F3–F5 Rail & Tech</span>
                  </div>
                  <div className="flex justify-between border-b border-neutral-800 pb-1.5">
                    <span>Security</span>
                    <span className="text-neutral-400">Unlocks F7 Compound & F8 Outbreak Radars</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Executive</span>
                    <span className="text-amber-300">Full Access · F1–F8 Including F6 Sky Command</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-neutral-800 flex items-center justify-between">
                  <span className="text-neutral-400">Physical F1 Turnstile Gate</span>
                  <span className="inline-flex items-center gap-1.5 font-medium text-white">
                    {sys.restrictedRoomsUnlocked ? (
                      <>
                        <Unlock className="h-3.5 w-3.5 text-emerald-400" />
                        Open
                      </>
                    ) : (
                      <>
                        <Lock className="h-3.5 w-3.5 text-amber-400" />
                        Locked
                      </>
                    )}
                  </span>
                </div>
              </div>
            </div>
          )}

          {tab === 'directory' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-white">Complete 8-Floor Building Directory</h3>
                  <p className="text-xs text-neutral-400">
                    Dispatch either Lift A or Lift B directly to any floor, or inspect that floor&apos;s interactive
                    display matrix.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2">
                {NEXUS_FLOOR_ORDER.map((fl) => {
                  const spec = NEXUS_FLOORS[fl];
                  const screensCount = fl === 1 ? 0 : NEXUS_SCREENS_BY_FLOOR[fl].length;
                  return (
                    <div
                      key={fl}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-neutral-800 bg-neutral-900/70 px-4 py-3"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="font-mono font-bold text-amber-300 tabular-nums">{spec.code}</span>
                          <span className="font-semibold text-white truncate">{spec.title}</span>
                          <span className="text-neutral-500">·</span>
                          <span className="text-neutral-400 capitalize">{spec.requiredClearance}</span>
                          <span className="text-neutral-500">·</span>
                          <span className="font-mono tabular-nums text-neutral-400">
                            {fl === 1 ? '15 Zones' : `${screensCount} Screens`}
                          </span>
                        </div>
                        <div className="text-xs text-neutral-400 mt-0.5 truncate">{spec.department}</div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => {
                            onCallElevator('liftA', fl);
                            onClose();
                          }}
                          className="px-2.5 py-1.5 rounded-md border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-[11px] font-medium text-amber-200 cursor-pointer whitespace-nowrap"
                        >
                          Call Lift A
                        </button>
                        <button
                          onClick={() => {
                            onCallElevator('liftB', fl);
                            onClose();
                          }}
                          className="px-2.5 py-1.5 rounded-md border border-cyan-500/40 bg-cyan-500/10 hover:bg-cyan-500/20 text-[11px] font-medium text-cyan-200 cursor-pointer whitespace-nowrap"
                        >
                          Call Lift B
                        </button>
                        {fl >= 2 && (
                          <button
                            onClick={() => {
                              onClose();
                              onOpenFloorDepartment(fl);
                            }}
                            className="px-2.5 py-1.5 rounded-md border border-neutral-700 bg-neutral-800 hover:bg-neutral-700 text-[11px] font-medium text-white cursor-pointer whitespace-nowrap"
                          >
                            Inspect Consoles
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {tab === 'security' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-lg border border-neutral-800 bg-neutral-900/70 p-4 space-y-3">
                  <div className="text-sm font-semibold text-white">Atrium Access Control</div>
                  <p className="text-xs text-neutral-400">
                    The physical barrier between the Grand Terminal Atrium and the Northwest Staff Reception Office
                    responds immediately to active clearance.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {(['visitor', 'staff', 'security', 'executive'] as NexusClearanceLevel[]).map((lvl) => (
                      <button
                        key={lvl}
                        onClick={() => {
                          onSetClearance(lvl);
                          setFeedback(`Clearance changed to ${lvl.toUpperCase()}.`);
                        }}
                        className={`px-3 py-1.5 rounded-md border text-xs font-medium capitalize cursor-pointer ${
                          sys.clearanceLevel === lvl
                            ? 'border-amber-400 bg-amber-500/15 text-amber-200'
                            : 'border-neutral-700 bg-neutral-900 text-neutral-300 hover:bg-neutral-800'
                        }`}
                      >
                        {lvl}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-lg border border-neutral-800 bg-neutral-900/70 p-4 space-y-2 text-xs font-mono tabular-nums">
                  <div className="font-sans text-sm font-semibold text-white">Live Elevator Positions</div>
                  {(['liftA', 'liftB'] as NexusElevatorId[]).map((id) => {
                    const st = sys.elevators[id];
                    return (
                      <div key={id} className="flex items-center justify-between border-b border-neutral-800 py-1.5">
                        <span className="font-sans text-neutral-300">{NEXUS_ELEVATORS[id].name}</span>
                        <span className="text-cyan-300">
                          F{st.currentFloor} ({st.moving ? `→ F${st.targetFloor}` : 'Ready'})
                        </span>
                      </div>
                    );
                  })}
                  <div className="flex items-center justify-between pt-1">
                    <span className="font-sans text-neutral-300">6-Train Corridor Sync</span>
                    <span className="text-emerald-300">{snapshot.live.trains.length} Active Trains</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === 'building' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-white">
                  Floor 1 · All 15 Architectural & Functional Zones
                </h3>
                <p className="text-xs text-neutral-400 mt-1">
                  Structure 2 footprint strictly preserved inside compound west corridor (22.4m × 18.4m · Unified
                  8-Floor Graphite, Titanium & Champagne-Gold Tower).
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {f1Rooms.map((room, idx) => (
                  <div
                    key={room.id}
                    className="rounded-lg border border-neutral-800 bg-neutral-900/70 px-3.5 py-2.5 text-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[11px] text-amber-300 tabular-nums">
                        {String(idx + 1).padStart(2, '0')}
                      </span>
                      {room.restricted && (
                        <span className="text-[10px] font-mono text-rose-300">Staff Clearance</span>
                      )}
                    </div>
                    <div className="font-semibold text-white mt-0.5">{room.name}</div>
                    <div className="text-[11px] text-neutral-400 flex items-center gap-1 mt-0.5">
                      <MapPin className="h-3 w-3 shrink-0" />
                      <span>{room.zone}</span>
                    </div>
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
