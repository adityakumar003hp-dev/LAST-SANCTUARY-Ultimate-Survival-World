import React from 'react';
import { X, FileText, Home, Bed, Archive, Hammer, Droplets, Sprout, ShieldAlert, Sun, Moon } from 'lucide-react';

interface NoticeBoardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NoticeBoardModal: React.FC<NoticeBoardModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="flex h-[82vh] w-full max-w-3xl flex-col rounded-2xl bg-neutral-950/95 border border-neutral-800 shadow-2xl text-neutral-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 px-6 py-4">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-amber-500" />
            <h2 className="text-lg font-bold tracking-wide">
              Sanctuary Outpost 7 — Directives & Facility Guide
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 hover:bg-neutral-800 transition-colors text-neutral-400 hover:text-white cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">
          {/* Welcome Lore Banner */}
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-200/90 leading-relaxed">
            <span className="font-bold text-amber-400 block mb-1 uppercase tracking-wider">
              Survivor Briefing
            </span>
            You have assumed stewardship of Sanctuary Outpost 7. The previous rangers fortified this clearing with a sturdy log cabin, perimeter palisade, water collection cistern, and lookout tower. Maintain and expand this haven against the nocturnal infected.
          </div>

          {/* Base Facilities Grid */}
          <div>
            <h3 className="text-xs uppercase font-bold text-neutral-400 tracking-wider mb-3">
              Base Facilities & Operations
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex items-start gap-3 rounded-xl border border-neutral-800 bg-neutral-900/50 p-3.5">
                <Home className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-neutral-100">Ranger Cabin</h4>
                  <p className="text-xs text-neutral-400 mt-0.5 leading-relaxed">
                    Solid timber shelter with working door, windows, and lantern. Provides shelter from cold exposure and infection.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-xl border border-neutral-800 bg-neutral-900/50 p-3.5">
                <Bed className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-neutral-100">Survivor Bed (Rest Point)</h4>
                  <p className="text-xs text-neutral-400 mt-0.5 leading-relaxed">
                    Interact with the bed to sleep until 06:00 Dawn. Fully restores health, stamina, advances crops, and skips nightly horde peril!
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-xl border border-neutral-800 bg-neutral-900/50 p-3.5">
                <Archive className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-neutral-100">Indoor Storage Stash</h4>
                  <p className="text-xs text-neutral-400 mt-0.5 leading-relaxed">
                    16-slot lockable chest pre-stocked with rations, purified water, bandages, fasteners, and seeds. Stashed items are 100% safe.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-xl border border-neutral-800 bg-neutral-900/50 p-3.5">
                <Hammer className="h-5 w-5 text-sky-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-neutral-100">Artisan Workbench</h4>
                  <p className="text-xs text-neutral-400 mt-0.5 leading-relaxed">
                    Equipped with vices and tools to forge Kinetic Shock Batons, Composite Crossbows, and reinforced metal barricades.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-xl border border-neutral-800 bg-neutral-900/50 p-3.5">
                <Sprout className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-neutral-100">Cultivated Farm Plot</h4>
                  <p className="text-xs text-neutral-400 mt-0.5 leading-relaxed">
                    Plant seed packets here. Sleeping in bed advances crop growth into mature, harvestable wild berry compotes.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-xl border border-neutral-800 bg-neutral-900/50 p-3.5">
                <Droplets className="h-5 w-5 text-sky-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-neutral-100">Rainwater Cistern</h4>
                  <p className="text-xs text-neutral-400 mt-0.5 leading-relaxed">
                    Passively collects filtered, drinkable rainwater. Press E to collect fresh water canteens.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Defense Directives */}
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4">
            <div className="flex items-center gap-2 text-rose-400 text-xs font-bold uppercase tracking-wider mb-2">
              <ShieldAlert className="h-4 w-4" />
              <span>Perimeter Defense Protocol</span>
            </div>
            <ul className="text-xs text-neutral-300 space-y-1.5 list-disc list-inside">
              <li>Always ensure the front Sanctuary Gate is closed and latched before 21:00 Blood Moon.</li>
              <li>Deploy Defensive Spikes traps along external walls to shred approaching infected.</li>
              <li>Equip your Engineer Sledgehammer to repair barricades after nightly assaults.</li>
              <li>Expand your compound into the marked Expansion Zone on the west boundary.</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-neutral-800 bg-neutral-950 px-6 py-3.5 text-xs text-neutral-400 flex items-center justify-between">
          <span>Sanctuary Outpost 7 is permanently registered on your World Map [M].</span>
          <button
            onClick={onClose}
            className="rounded-lg bg-amber-500 hover:bg-amber-400 px-4 py-1.5 text-xs font-bold uppercase text-neutral-950 cursor-pointer"
          >
            Acknowledge & Close
          </button>
        </div>
      </div>
    </div>
  );
};
