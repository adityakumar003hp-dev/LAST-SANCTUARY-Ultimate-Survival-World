import React, { useState } from 'react';
import {
  Ticket,
  Train,
  Clock,
  Compass,
  CheckCircle2,
  X,
  CreditCard,
  QrCode,
  MapPin,
  ShieldCheck,
  ChevronRight,
  ArrowRight,
  Sparkles,
  Zap,
} from 'lucide-react';
import { RailwayPassengerClass, RailwayTicket } from '../types/game';
import { STATION_NAMES } from '../engine/world/AITrainManager';
import { soundEngine } from '../utils/audio';

interface RailwayTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerCredits: number;
  activeTicket?: RailwayTicket;
  onPurchaseTicket: (ticket: RailwayTicket, deductCredits: number) => void;
  onBoardTrainDirectly?: (ticket: RailwayTicket) => void;
  onFastTravelToDestination?: (destinationStation: string) => void;
}

const CLASS_OPTIONS: Array<{
  id: RailwayPassengerClass;
  name: string;
  code: string;
  price: number;
  coachPrefix: string;
  description: string;
  features: string[];
  color: string;
}> = [
  {
    id: 'II',
    name: 'General Second Class',
    code: 'GEN (II)',
    price: 15,
    coachPrefix: 'GS',
    description: 'Unreserved coach with cushioned longitudinal benches & overhead racks.',
    features: ['Open seating', 'Wide windows', 'Accessible aisle'],
    color: 'from-amber-700/40 to-amber-900/40 border-amber-500/40 text-amber-300',
  },
  {
    id: 'SL',
    name: 'Sleeper Class',
    code: 'SL',
    price: 35,
    coachPrefix: 'S',
    description: 'Classic 3-tier berths (Lower, Middle, Upper & Side berths).',
    features: ['Reserved berth', 'Foldable table', 'Night lighting'],
    color: 'from-blue-700/40 to-blue-900/40 border-blue-500/40 text-blue-300',
  },
  {
    id: 'CC',
    name: 'AC Chair Car',
    code: 'CC',
    price: 50,
    coachPrefix: 'C',
    description: 'Air-conditioned 3x2 contoured reclining seats with charging sockets.',
    features: ['Climate control', 'Footrest', 'Fold-out tray table'],
    color: 'from-cyan-700/40 to-cyan-900/40 border-cyan-500/40 text-cyan-300',
  },
  {
    id: '3A',
    name: 'AC 3-Tier',
    code: '3A',
    price: 65,
    coachPrefix: 'B',
    description: 'Air-conditioned 3-tier sleeper berths with individual reading lights.',
    features: ['Full AC', 'Fresh bedding pack', 'Individual charging'],
    color: 'from-indigo-700/40 to-indigo-900/40 border-indigo-500/40 text-indigo-300',
  },
  {
    id: '2A',
    name: 'AC 2-Tier',
    code: '2A',
    price: 95,
    coachPrefix: 'A',
    description: 'Spacious 2-tier berths with privacy curtains and wide viewing glass.',
    features: ['Privacy curtain', 'Generous headroom', 'Reading lamp'],
    color: 'from-violet-700/40 to-violet-900/40 border-violet-500/40 text-violet-300',
  },
  {
    id: 'EC',
    name: 'Executive Chair Car',
    code: 'EC',
    price: 85,
    coachPrefix: 'E',
    description: 'Premium 2x2 wide leather reclining armchairs with IRCTC food service.',
    features: ['2x2 leather seats', 'Complimentary snack tray', 'Panoramic window'],
    color: 'from-emerald-700/40 to-emerald-900/40 border-emerald-500/40 text-emerald-300',
  },
  {
    id: '1A',
    name: 'AC First Class',
    code: '1A',
    price: 140,
    coachPrefix: 'H',
    description: 'Exclusive lockable 2-berth coupe / 4-berth cabins with plush carpets.',
    features: ['Lockable sliding doors', 'Velvet upholstery', 'Vanity mirror'],
    color: 'from-yellow-600/40 to-amber-700/40 border-yellow-400/50 text-yellow-300',
  },
  {
    id: 'SALOON',
    name: 'Luxury Saloon / Anubhuti Suite',
    code: 'SALOON',
    price: 220,
    coachPrefix: 'L',
    description: 'Presidential suite with velvet sofa lounge, dining table & rear observation deck.',
    features: ['Private saloon lounge', 'Observation deck view', 'VIP service'],
    color: 'from-fuchsia-700/40 to-purple-900/40 border-fuchsia-400/50 text-fuchsia-300',
  },
  {
    id: 'DIVYANGJAN',
    name: 'Divyangjan / Accessible Coach',
    code: 'DIVYANGJAN',
    price: 25,
    coachPrefix: 'D',
    description: 'Wheelchair-accessible compartment with extra-wide entrance and secure locking bay.',
    features: ['Wheelchair bay', 'Wide sliding entrance', 'Accessible restroom'],
    color: 'from-teal-700/40 to-emerald-900/40 border-teal-400/50 text-teal-300',
  },
];

const TRAIN_CHOICES = [
  { number: 'Train 01', name: 'Sanctuary Rajdhani Express', type: 'Superfast Express', platform: 2, line: 'F1', direction: 'Forward (+X)' },
  { number: 'Train 02', name: 'Sanctuary Vande Bharat', type: 'Semi-High-Speed', platform: 3, line: 'F2', direction: 'Forward (+X)' },
  { number: 'Train 03', name: 'Highland Express Mail', type: 'Superfast Sleeper Mail', platform: 4, line: 'F3', direction: 'Forward (+X)' },
  { number: 'Train 04', name: 'Redwood Crossway Intercity', type: 'Intercity Express', platform: 5, line: 'B3', direction: 'Backward (-X)' },
  { number: 'Train 05', name: 'Sanctuary Metro Commuter', type: 'Suburban Metro', platform: 6, line: 'B2', direction: 'Backward (-X)' },
  { number: 'Train 06', name: 'Northern Apex Shield Express', type: 'Tactical / Medical Transport', platform: 7, line: 'B1', direction: 'Backward (-X)' },
];

export const RailwayTicketModal: React.FC<RailwayTicketModalProps> = ({
  isOpen,
  onClose,
  playerCredits,
  activeTicket,
  onPurchaseTicket,
  onBoardTrainDirectly,
  onFastTravelToDestination,
}) => {
  const [sourceStation, setSourceStation] = useState<string>('Sanctuary Central Terminal');
  const [destinationStation, setDestinationStation] = useState<string>('Pine Valley Junction');
  const [selectedClassId, setSelectedClassId] = useState<RailwayPassengerClass>('3A');
  const [selectedTrainIdx, setSelectedTrainIdx] = useState<number>(0);
  const [issuedTicket, setIssuedTicket] = useState<RailwayTicket | null>(activeTicket || null);
  const [showSuccessBadge, setShowSuccessBadge] = useState<boolean>(false);

  if (!isOpen) return null;

  const currentClass = CLASS_OPTIONS.find((c) => c.id === selectedClassId) || CLASS_OPTIONS[3];
  const currentTrain = TRAIN_CHOICES[selectedTrainIdx];
  const canAfford = playerCredits >= currentClass.price;

  const handleIssueTicket = () => {
    if (!canAfford) {
      soundEngine.playUIClick();
      return;
    }

    const randomPNR = `LS-${Math.floor(1000000 + Math.random() * 9000000)}`;
    const randomCoachNum = Math.floor(1 + Math.random() * 4);
    const coachName = `${currentClass.coachPrefix}${randomCoachNum}`;
    const berthSeatNum =
      currentClass.id === 'CC' || currentClass.id === 'EC' || currentClass.id === 'II'
        ? `Seat ${Math.floor(1 + Math.random() * 64)} (Window)`
        : `Berth ${Math.floor(1 + Math.random() * 54)} (${['Lower', 'Middle', 'Upper', 'Side Lower'][Math.floor(Math.random() * 4)]})`;

    const newTicket: RailwayTicket = {
      pnr: randomPNR,
      trainNumber: currentTrain.number,
      trainName: currentTrain.name,
      sourceStation,
      destinationStation,
      travelClass: currentClass.id,
      coach: coachName,
      berthSeat: berthSeatNum,
      platform: currentTrain.platform,
      departureTime: '14:30',
      fareCredits: currentClass.price,
      timestamp: Date.now(),
    };

    setIssuedTicket(newTicket);
    setShowSuccessBadge(true);
    soundEngine.playDawnVictoryChime();
    onPurchaseTicket(newTicket, currentClass.price);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 select-none">
      <div className="relative flex flex-col w-full max-w-4xl max-h-[92vh] rounded-3xl border border-cyan-500/50 bg-neutral-950/95 text-neutral-100 shadow-2xl overflow-hidden font-sans">
        {/* Terminal Header Bar */}
        <div className="flex items-center justify-between border-b border-cyan-500/30 bg-gradient-to-r from-neutral-900 via-neutral-900 to-cyan-950/50 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/20">
              <Ticket className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black tracking-wide text-white uppercase">
                  SANCTUARY CENTRAL TERMINAL · AUTOMATED TVM
                </h2>
                <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/30">
                  SMART SCAN ONLINE
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                Official Passenger Ticketing & Fast-Travel Boarding Portal
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 rounded-xl bg-neutral-900 border border-neutral-800 px-3 py-1.5 text-xs font-mono">
              <CreditCard className="h-4 w-4 text-cyan-400" />
              <span className="text-neutral-400">CREDITS:</span>
              <span className="font-bold text-amber-400">{playerCredits} CR</span>
            </div>

            <button
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-neutral-800 bg-neutral-900 text-neutral-400 hover:bg-neutral-800 hover:text-white transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Modal Main Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {issuedTicket ? (
            /* =========================================================================
               ISSUED BOARDING PASS / TICKET DISPLAY
               ========================================================================= */
            <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
              {showSuccessBadge && (
                <div className="flex items-center justify-between rounded-2xl border border-emerald-500/40 bg-emerald-950/40 p-4 text-emerald-200">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-6 w-6 text-emerald-400 shrink-0" />
                    <div>
                      <p className="font-bold text-sm text-emerald-100">
                        Ticket Issued & QR Gate Access Validated!
                      </p>
                      <p className="text-xs text-emerald-300/80">
                        Scan at turnstiles to enter. Proceed to Platform {issuedTicket.platform} via elevators or skywalk.
                      </p>
                    </div>
                  </div>
                  <span className="font-mono text-xs font-bold text-emerald-400 bg-emerald-900/60 px-3 py-1 rounded-lg">
                    PAID {issuedTicket.fareCredits} CR
                  </span>
                </div>
              )}

              {/* Indian Railways Style Passenger Ticket Card */}
              <div className="relative rounded-3xl border-2 border-cyan-400/50 bg-gradient-to-br from-neutral-900 via-neutral-950 to-cyan-950/30 p-6 shadow-2xl text-white">
                <div className="absolute top-4 right-6 flex items-center gap-2">
                  <span className="text-[11px] font-bold text-cyan-400 font-mono">PNR: {issuedTicket.pnr}</span>
                  <QrCode className="h-8 w-8 text-cyan-300" />
                </div>

                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-400 mb-1">
                  <Train className="h-4 w-4" />
                  <span>{issuedTicket.trainNumber} · {issuedTicket.trainName}</span>
                </div>

                <h3 className="text-xl font-black text-white tracking-wide">
                  INDIAN RAILWAY PASSENGER TICKET & BOARDING PASS
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 my-5 p-4 rounded-2xl bg-neutral-900/80 border border-neutral-800 text-xs">
                  <div>
                    <span className="text-neutral-400 block text-[10px]">DEPARTURE FROM</span>
                    <span className="font-bold text-white text-sm">{issuedTicket.sourceStation}</span>
                  </div>
                  <div>
                    <span className="text-neutral-400 block text-[10px]">DESTINATION</span>
                    <span className="font-bold text-cyan-300 text-sm">{issuedTicket.destinationStation}</span>
                  </div>
                  <div>
                    <span className="text-neutral-400 block text-[10px]">CLASS & COACH</span>
                    <span className="font-bold text-amber-300 text-sm">{issuedTicket.travelClass} · {issuedTicket.coach}</span>
                  </div>
                  <div>
                    <span className="text-neutral-400 block text-[10px]">SEAT / BERTH</span>
                    <span className="font-bold text-emerald-300 text-sm">{issuedTicket.berthSeat}</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-neutral-800 text-xs">
                  <div className="flex items-center gap-4 text-neutral-300">
                    <div>
                      <span className="text-neutral-400 text-[10px] block">PLATFORM</span>
                      <span className="font-black text-amber-400 text-sm">PLATFORM {issuedTicket.platform}</span>
                    </div>
                    <div>
                      <span className="text-neutral-400 text-[10px] block">DEPARTURE</span>
                      <span className="font-bold text-white text-sm">{issuedTicket.departureTime}</span>
                    </div>
                    <div>
                      <span className="text-neutral-400 text-[10px] block">SECURITY CLEARANCE</span>
                      <span className="font-bold text-emerald-400 text-sm flex items-center gap-1">
                        <ShieldCheck className="h-3.5 w-3.5" /> AUTHORIZED
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {onBoardTrainDirectly && (
                      <button
                        onClick={() => {
                          onBoardTrainDirectly(issuedTicket);
                          onClose();
                        }}
                        className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-cyan-500/20 hover:brightness-110 transition-all cursor-pointer"
                      >
                        <Train className="h-4 w-4" />
                        <span>BOARD THIS TRAIN</span>
                      </button>
                    )}

                    {onFastTravelToDestination && (
                      <button
                        onClick={() => {
                          onFastTravelToDestination(issuedTicket.destinationStation);
                          onClose();
                        }}
                        className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-emerald-500/20 hover:brightness-110 transition-all cursor-pointer"
                      >
                        <Zap className="h-4 w-4" />
                        <span>TRAVEL TO {issuedTicket.destinationStation}</span>
                      </button>
                    )}

                    <button
                      onClick={() => setIssuedTicket(null)}
                      className="rounded-xl border border-neutral-700 bg-neutral-800 px-3 py-2 text-xs font-bold text-neutral-300 hover:bg-neutral-700 transition-colors cursor-pointer"
                    >
                      Book Another Ticket
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* =========================================================================
               TICKET BOOKING FORM
               ========================================================================= */
            <div className="space-y-6">
              {/* Route Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-4 space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-cyan-400" />
                    <span>ORIGIN TERMINAL</span>
                  </label>
                  <select
                    value={sourceStation}
                    onChange={(e) => setSourceStation(e.target.value)}
                    className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm font-bold text-white focus:outline-none focus:border-cyan-400"
                  >
                    {STATION_NAMES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-4 space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-2">
                    <Compass className="h-4 w-4 text-amber-400" />
                    <span>DESTINATION STATION</span>
                  </label>
                  <select
                    value={destinationStation}
                    onChange={(e) => setDestinationStation(e.target.value)}
                    className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm font-bold text-white focus:outline-none focus:border-cyan-400"
                  >
                    {STATION_NAMES.filter((st) => st !== sourceStation).map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Service & Train Selection */}
              <div className="space-y-3">
                <label className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-2">
                  <Train className="h-4 w-4 text-cyan-400" />
                  <span>SELECT PREFERRED AI TRAIN SERVICE</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {TRAIN_CHOICES.map((train, idx) => {
                    const isSelected = selectedTrainIdx === idx;
                    return (
                      <div
                        key={train.number}
                        onClick={() => {
                          setSelectedTrainIdx(idx);
                          soundEngine.playUIClick();
                        }}
                        className={`rounded-2xl border p-3.5 cursor-pointer transition-all ${
                          isSelected
                            ? 'border-cyan-400 bg-cyan-950/40 shadow-lg shadow-cyan-500/10'
                            : 'border-neutral-800 bg-neutral-900/50 hover:border-neutral-700'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-black text-amber-400 text-xs font-mono">{train.number}</span>
                          <span className="rounded bg-neutral-800 px-2 py-0.5 text-[10px] font-bold text-neutral-300">
                            PLT {train.platform}
                          </span>
                        </div>
                        <h4 className="font-bold text-sm text-white">{train.name}</h4>
                        <div className="flex items-center justify-between text-[11px] text-neutral-400 mt-2">
                          <span>{train.type}</span>
                          <span className="text-cyan-300">{train.direction}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Travel Class Selection (9 Classes) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-amber-400" />
                    <span>SELECT TRAVEL CLASS (9 RAILWAY COACH TIERS)</span>
                  </label>
                  <span className="text-xs text-neutral-400 font-mono">
                    CHOSEN: <span className="font-bold text-white">{currentClass.name}</span>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {CLASS_OPTIONS.map((cls) => {
                    const isSelected = selectedClassId === cls.id;
                    return (
                      <div
                        key={cls.id}
                        onClick={() => {
                          setSelectedClassId(cls.id);
                          soundEngine.playUIClick();
                        }}
                        className={`rounded-2xl border p-3.5 cursor-pointer transition-all flex flex-col justify-between ${
                          isSelected
                            ? `border-cyan-400 bg-gradient-to-br ${cls.color} shadow-lg shadow-cyan-500/20`
                            : 'border-neutral-800 bg-neutral-900/40 hover:border-neutral-700'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-black text-xs font-mono px-2 py-0.5 rounded bg-neutral-900/90 text-white border border-neutral-700">
                              {cls.code}
                            </span>
                            <span className="font-black text-amber-400 text-xs font-mono">
                              {cls.price} CR
                            </span>
                          </div>
                          <h4 className="font-bold text-sm text-white">{cls.name}</h4>
                          <p className="text-[11px] text-neutral-300/90 mt-1 line-clamp-2">
                            {cls.description}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-1 mt-3 pt-2 border-t border-white/10">
                          {cls.features.map((feat) => (
                            <span
                              key={feat}
                              className="rounded bg-black/40 px-1.5 py-0.5 text-[9px] text-neutral-300 font-medium"
                            >
                              ✓ {feat}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Purchase Action Bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-neutral-800">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
                    <Ticket className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-neutral-400">TOTAL FARE:</span>
                      <span className="text-lg font-black text-amber-400 font-mono">
                        {currentClass.price} CR
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-400">
                      Departs Platform {currentTrain.platform} · {currentTrain.name}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <button
                    onClick={onClose}
                    className="flex-1 sm:flex-none rounded-xl border border-neutral-700 bg-neutral-800 px-5 py-2.5 text-xs font-bold text-neutral-300 hover:bg-neutral-700 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    onClick={handleIssueTicket}
                    disabled={!canAfford}
                    className={`flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-xl px-6 py-2.5 text-xs font-bold text-white shadow-xl transition-all cursor-pointer ${
                      canAfford
                        ? 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:brightness-110 shadow-cyan-500/25'
                        : 'bg-neutral-800 text-neutral-500 cursor-not-allowed border border-neutral-700'
                    }`}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>{canAfford ? 'PURCHASE & ISSUE TICKET' : 'INSUFFICIENT CREDITS'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
