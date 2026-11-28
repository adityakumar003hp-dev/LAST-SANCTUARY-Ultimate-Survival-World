import React from 'react';
import { X, ArrowUpDown, FileText, AlertTriangle } from 'lucide-react';
import { AURELION_LEVELS, type AurelionDocument, type AurelionLevelId } from '../engine/aurelion/AurelionConfig';
import type { AurelionDashboardSnapshot, ElevatorId } from '../engine/aurelion/AurelionSystems';

interface AurelionElevatorModalProps {
  elevatorId: ElevatorId | null;
  snapshot: AurelionDashboardSnapshot | null;
  onSelectFloor: (elevatorId: ElevatorId, floor: AurelionLevelId) => void;
  onClose: () => void;
}

export const AurelionElevatorModal: React.FC<AurelionElevatorModalProps> = ({
  elevatorId,
  snapshot,
  onSelectFloor,
  onClose,
}) => {
  if (!elevatorId || !snapshot) return null;
  const elev = snapshot.elevators[elevatorId];
  if (!elev) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 select-none">
      <div className="w-full max-w-lg rounded-2xl border border-amber-500/40 bg-neutral-950 text-neutral-100 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-neutral-800 bg-neutral-900 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-amber-500/15 p-2 text-amber-300 border border-amber-500/35">
              <ArrowUpDown className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-amber-400 block">
                THE AURELION · Vertical Transit
              </span>
              <h3 className="text-base font-bold text-white">{elev.name}</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-800 hover:text-white cursor-pointer"
            aria-label="Close elevator panel"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-xs font-mono">
            <span>
              Cab Position:{' '}
              <strong className="text-amber-300">
                {elev.currentFloor} — {AURELION_LEVELS[elev.currentFloor].subtitle}
              </strong>
            </span>
            <span className="text-cyan-400">{elev.moving ? `MOVING → ${elev.targetFloor}` : 'READY'}</span>
          </div>

          {elev.lockedByLoadShedding && (
            <div className="flex items-center gap-2 rounded-xl border border-rose-800 bg-rose-950/60 px-4 py-3 text-xs text-rose-300">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>
                Shaft offline due to Power Shedding ({snapshot.power.priorityMode.toUpperCase()} mode or low battery). Switch
                to Balanced Priority or start B2 Generators.
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 gap-2 max-h-[52vh] overflow-y-auto pr-1">
            {[...elev.stops].reverse().map((stopId) => {
              const spec = AURELION_LEVELS[stopId];
              const isCurrent = elev.currentFloor === stopId && !elev.moving;
              const isTarget = elev.moving && elev.targetFloor === stopId;
              return (
                <button
                  key={stopId}
                  disabled={elev.lockedByLoadShedding}
                  onClick={() => {
                    onSelectFloor(elev.id, stopId);
                    onClose();
                  }}
                  className={`flex items-center justify-between rounded-xl border px-4 py-2.5 text-left transition-colors ${
                    elev.lockedByLoadShedding
                      ? 'border-neutral-800 bg-neutral-900/40 text-neutral-600 cursor-not-allowed'
                      : isCurrent
                        ? 'border-amber-400 bg-amber-500/15 text-amber-200 cursor-pointer'
                        : isTarget
                          ? 'border-cyan-500 bg-cyan-500/15 text-cyan-200 cursor-pointer'
                          : 'border-neutral-800 bg-neutral-900 hover:border-amber-500/50 hover:bg-neutral-800 text-neutral-200 cursor-pointer'
                  }`}
                >
                  <div>
                    <span className="font-mono font-bold text-sm mr-2">{spec.id}</span>
                    <span className="text-xs font-semibold">{spec.title}</span>
                    <span className="block text-[11px] text-neutral-400">{spec.subtitle}</span>
                  </div>
                  <span className="text-[11px] font-mono uppercase">
                    {isCurrent ? 'AT FLOOR' : isTarget ? 'EN ROUTE' : 'SELECT'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

interface AurelionDocumentModalProps {
  doc: AurelionDocument | null;
  onClose: () => void;
}

export const AurelionDocumentModal: React.FC<AurelionDocumentModalProps> = ({ doc, onClose }) => {
  if (!doc) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 select-none">
      <div className="w-full max-w-xl rounded-2xl border border-amber-500/35 bg-neutral-950 text-neutral-100 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-neutral-800 bg-neutral-900 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-amber-500/15 p-2 text-amber-300 border border-amber-500/35">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-[0.22em] text-amber-400 block">
                {doc.location} · {doc.author} · {doc.timestamp}
              </span>
              <h3 className="text-base font-bold text-white">{doc.title}</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-800 hover:text-white cursor-pointer"
            aria-label="Close document"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 space-y-3 text-sm text-neutral-200 leading-relaxed max-h-[65vh] overflow-y-auto">
          {doc.paragraphs.map((para, idx) => (
            <p key={idx} className="rounded-xl border border-neutral-800/80 bg-neutral-900/60 p-3.5 text-xs sm:text-sm">
              {para}
            </p>
          ))}
        </div>

        <div className="border-t border-neutral-800 px-5 py-3 flex justify-end bg-neutral-950">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-xs font-bold text-neutral-950 cursor-pointer"
          >
            Close Dossier
          </button>
        </div>
      </div>
    </div>
  );
};
