import React from 'react';
import { Activity, BedDouble, ClipboardList, HeartPulse, Package, ShieldCheck, X } from 'lucide-react';

interface MedicalClinicModalProps {
  isOpen: boolean;
  onClose: () => void;
  health: number;
  maxHealth: number;
  firstAidKits: number;
  onUseFirstAid: () => void;
}

export const MedicalClinicModal: React.FC<MedicalClinicModalProps> = ({
  isOpen, onClose, health, maxHealth, firstAidKits, onUseFirstAid,
}) => {
  if (!isOpen) return null;
  const canTreat = firstAidKits > 0 && health < maxHealth;
  const healthPercent = Math.max(0, Math.min(100, (health / Math.max(1, maxHealth)) * 100));

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 backdrop-blur-sm p-3 sm:p-5">
      <section className="flex max-h-[90dvh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-teal-800/60 bg-slate-950 text-slate-100 shadow-2xl">
        <header className="flex items-center justify-between border-b border-slate-800 bg-slate-900/90 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-teal-500/15 p-2 text-teal-300"><HeartPulse className="h-6 w-6" /></div>
            <div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-300">First floor • Sanctuary clinic</p><h2 className="text-lg font-bold sm:text-xl">Medical Section</h2></div>
          </div>
          <button onClick={onClose} aria-label="Close medical clinic" className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"><X className="h-5 w-5" /></button>
        </header>

        <div className="grid gap-3 overflow-y-auto p-4 sm:grid-cols-2 sm:p-6">
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 sm:col-span-2">
            <div className="mb-3 flex items-center justify-between"><span className="flex items-center gap-2 text-sm font-semibold"><Activity className="h-4 w-4 text-teal-300" /> Patient status</span><span className="text-sm font-bold tabular-nums">{Math.round(health)} / {maxHealth} HP</span></div>
            <div className="h-3 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-teal-400 transition-all" style={{ width: `${healthPercent}%` }} /></div>
            <p className="mt-2 text-xs text-slate-400">Basic in-game health assessment. This is a game mechanic, not real medical advice.</p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
            <div className="mb-2 flex items-center gap-2 font-semibold"><ShieldCheck className="h-5 w-5 text-teal-300" /> Treatment station</div>
            <p className="mb-4 text-sm text-slate-400">Use one stocked first-aid kit to restore up to 25 health points.</p>
            <div className="mb-3 flex items-center justify-between text-sm"><span className="text-slate-400">First-aid kits</span><strong className="tabular-nums">{firstAidKits}</strong></div>
            <button disabled={!canTreat} onClick={onUseFirstAid} className="w-full rounded-lg bg-teal-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-teal-500 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400">{health >= maxHealth ? 'Health is already full' : firstAidKits < 1 ? 'No first-aid kits available' : 'Use first-aid kit'}</button>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
            <div className="mb-2 flex items-center gap-2 font-semibold"><BedDouble className="h-5 w-5 text-teal-300" /> Recovery room</div>
            <p className="text-sm leading-relaxed text-slate-400">Two physical recovery beds are placed inside the clinic. Bed interaction and NPC occupancy can be connected to the wider rest and resident systems in a later integration.</p>
            <div className="mt-4 flex items-center gap-2 text-xs text-teal-300"><Package className="h-4 w-4" /> Clinic storage is represented in the room.</div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 sm:col-span-2">
            <div className="mb-2 flex items-center gap-2 font-semibold"><ClipboardList className="h-5 w-5 text-teal-300" /> Clinic facilities</div>
            <div className="grid grid-cols-2 gap-2 text-xs text-slate-300 sm:grid-cols-4">
              {['Reception desk','Examination beds','Medicine cabinet','Medical refrigerator'].map((item) => <div key={item} className="rounded-lg border border-slate-800 bg-slate-950/70 p-3">{item}</div>)}
            </div>
          </div>
        </div>
        <footer className="border-t border-slate-800 px-4 py-3 text-xs text-slate-500 sm:px-6">Medical section remains accessible during free roam. First-aid stock is saved locally with the game session.</footer>
      </section>
    </div>
  );
};
