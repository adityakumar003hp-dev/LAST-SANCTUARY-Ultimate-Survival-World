import React, { useState } from 'react';
import { STRUCTURES } from '../data/structures';
import { ITEMS } from '../data/items';
import { StructureCategory, StructureDefinition, InventorySlot } from '../types/game';
import { Shield, Hammer, Wrench, X, Check, Flame, Castle, Lightbulb, Droplets, Archive } from 'lucide-react';

interface BuildMenuProps {
  isOpen: boolean;
  onClose: () => void;
  inventory: (InventorySlot | null)[];
  onSelectStructure: (def: StructureDefinition) => void;
}

export const BuildMenu: React.FC<BuildMenuProps> = ({
  isOpen,
  onClose,
  inventory,
  onSelectStructure,
}) => {
  const [activeCategory, setActiveCategory] = useState<StructureCategory>('defense');

  if (!isOpen) return null;

  // Helper to count items in inventory
  const getItemCount = (itemId: string): number => {
    return inventory.reduce((total, slot) => {
      if (slot && slot.item.id === itemId) {
        return total + slot.count;
      }
      return total;
    }, 0);
  };

  const structuresList = Object.values(STRUCTURES).filter(
    (s) => s.category === activeCategory
  );

  const getCategoryIcon = (cat: StructureCategory) => {
    switch (cat) {
      case 'defense': return <Shield className="h-4 w-4" />;
      case 'structure': return <Hammer className="h-4 w-4" />;
      case 'utility': return <Wrench className="h-4 w-4" />;
      case 'furniture': return <Archive className="h-4 w-4" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4">
      <div className="flex h-[82vh] w-full max-w-4xl flex-col rounded-2xl bg-neutral-950/95 border border-neutral-800 shadow-2xl text-neutral-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 px-6 py-4">
          <div className="flex items-center gap-2">
            <Hammer className="h-5 w-5 text-amber-500" />
            <h2 className="text-lg font-bold tracking-wide">Sanctuary Architecture Catalog</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 hover:bg-neutral-800 transition-colors text-neutral-400 hover:text-white cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Category Tabs */}
        <div className="flex gap-2 border-b border-neutral-800 bg-neutral-900/50 px-6 py-2">
          {(['defense', 'structure', 'utility', 'furniture'] as StructureCategory[]).map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                activeCategory === cat
                  ? 'bg-amber-500 text-neutral-950 shadow-md font-bold'
                  : 'text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200'
              }`}
            >
              {getCategoryIcon(cat)}
              <span>{cat}</span>
            </button>
          ))}
        </div>

        {/* Structures Grid */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {structuresList.map((struct) => {
            // Check affordability
            const canAfford = struct.cost.every(
              (req) => getItemCount(req.itemId) >= req.count
            );

            return (
              <div
                key={struct.id}
                className="flex flex-col justify-between rounded-xl border border-neutral-800 bg-neutral-900/60 p-4 transition-all hover:border-neutral-700 hover:bg-neutral-900"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <h3 className="font-bold text-sm text-neutral-100">{struct.name}</h3>
                    <span className="text-[10px] font-mono font-semibold rounded bg-neutral-800 px-1.5 py-0.5 text-neutral-300">
                      {struct.maxHealth} HP
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-neutral-400 line-clamp-2 leading-relaxed">
                    {struct.description}
                  </p>
                </div>

                {/* Resource Requirements Checklist */}
                <div className="mt-4 pt-3 border-t border-neutral-800/80">
                  <span className="text-[10px] uppercase font-bold text-neutral-400 block mb-1.5">
                    Required Materials
                  </span>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {struct.cost.map((req) => {
                      const owned = getItemCount(req.itemId);
                      const met = owned >= req.count;
                      const itemDef = ITEMS[req.itemId];
                      return (
                        <div
                          key={req.itemId}
                          className={`flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-mono border ${
                            met
                              ? 'border-emerald-800/50 bg-emerald-950/40 text-emerald-300'
                              : 'border-rose-900/50 bg-rose-950/40 text-rose-400'
                          }`}
                        >
                          <span>{itemDef ? itemDef.name.split(' ')[0] : req.itemId}</span>
                          <span className="font-bold">
                            {owned}/{req.count}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <button
                    disabled={!canAfford}
                    onClick={() => {
                      onSelectStructure(struct);
                      onClose();
                    }}
                    className={`w-full rounded-lg py-2 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                      canAfford
                        ? 'bg-amber-500 hover:bg-amber-400 text-neutral-950 shadow-md'
                        : 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                    }`}
                  >
                    {canAfford ? 'Arm Placement Ghost' : 'Insufficient Resources'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer info */}
        <div className="border-t border-neutral-800 px-6 py-3 text-xs text-neutral-400 flex items-center justify-between bg-neutral-950">
          <span>Tip: Press [R] in-world to rotate structures by 45°. Press [Esc] to cancel placement.</span>
          <span className="font-mono text-neutral-400">Total Blueprints: {Object.keys(STRUCTURES).length}</span>
        </div>
      </div>
    </div>
  );
};
