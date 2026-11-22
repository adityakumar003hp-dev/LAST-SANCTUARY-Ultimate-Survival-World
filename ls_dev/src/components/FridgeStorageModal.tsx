import React, { useState } from 'react';
import { X, Utensils, Droplets, Check, Plus } from 'lucide-react';
import { soundEngine } from '../utils/audio';

export interface FridgeItem {
  id: string;
  name: string;
  count: number;
  hungerRestore: number;
  thirstRestore: number;
  icon: string;
  description: string;
}

interface FridgeStorageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTakeItem: (itemId: string, count: number) => void;
  onConsumeDirectly: (hungerRestore: number, thirstRestore: number, name: string) => void;
}

const DEFAULT_FRIDGE_ITEMS: FridgeItem[] = [
  {
    id: 'clean_water',
    name: 'Chilled Spring Water',
    count: 4,
    hungerRestore: 0,
    thirstRestore: 40,
    icon: 'Droplets',
    description: 'Chilled purified drinking water from the refrigerator door dispenser.',
  },
  {
    id: 'canned_beans',
    name: 'Pork & Beans Can',
    count: 3,
    hungerRestore: 35,
    thirstRestore: 5,
    icon: 'Utensils',
    description: 'Hearty cooked beans in savoury tomato sauce.',
  },
  {
    id: 'fresh_oj',
    name: 'Fresh Orange Juice',
    count: 2,
    hungerRestore: 15,
    thirstRestore: 45,
    icon: 'Droplets',
    description: 'Crisp cold citrus juice rich in Vitamin C.',
  },
  {
    id: 'breakfast_sandwich',
    name: 'Deli Breakfast Sub',
    count: 2,
    hungerRestore: 50,
    thirstRestore: 0,
    icon: 'Utensils',
    description: 'Toasted sub with smoked turkey, cheddar cheese, and fresh lettuce.',
  },
  {
    id: 'bandage',
    name: 'First Aid Ice Pack & Dressing',
    count: 2,
    hungerRestore: 0,
    thirstRestore: 0,
    icon: 'Shield',
    description: 'Cold compresses and sterile dressing kept in the crisper drawer.',
  },
];

export const FridgeStorageModal: React.FC<FridgeStorageModalProps> = ({
  isOpen,
  onClose,
  onTakeItem,
  onConsumeDirectly,
}) => {
  const [items, setItems] = useState<FridgeItem[]>(DEFAULT_FRIDGE_ITEMS);

  if (!isOpen) return null;

  const handleTake = (item: FridgeItem) => {
    if (item.count <= 0) return;
    soundEngine.playBuildSnap();
    onTakeItem(item.id, 1);
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, count: Math.max(0, i.count - 1) } : i))
    );
  };

  const handleConsume = (item: FridgeItem) => {
    if (item.count <= 0) return;
    soundEngine.playDawnVictoryChime();
    onConsumeDirectly(item.hungerRestore, item.thirstRestore, item.name);
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, count: Math.max(0, i.count - 1) } : i))
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm pointer-events-auto">
      <div className="flex flex-col w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-cyan-950 border border-cyan-500/40 rounded-xl text-cyan-400">
              <Utensils className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">
                Floor 1 — Apartment Refrigerator
              </h3>
              <p className="text-xs text-slate-400">
                Fresh provisions, beverages, and cold storage
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              soundEngine.playUIClick();
              onClose();
            }}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stored Food Items List */}
        <div className="p-6 space-y-3 max-h-[60vh] overflow-y-auto">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl hover:border-slate-700 transition-colors"
            >
              <div className="flex-1 pr-3">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="text-sm font-semibold text-slate-100">{item.name}</h4>
                  <span className="text-xs font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800">
                    x{item.count}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mb-1.5">{item.description}</p>
                <div className="flex items-center gap-3 text-[11px] text-slate-400">
                  {item.hungerRestore > 0 && (
                    <span className="flex items-center gap-1 text-amber-400 font-medium">
                      <Utensils className="w-3 h-3" /> +{item.hungerRestore} Hunger
                    </span>
                  )}
                  {item.thirstRestore > 0 && (
                    <span className="flex items-center gap-1 text-cyan-400 font-medium">
                      <Droplets className="w-3 h-3" /> +{item.thirstRestore} Thirst
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <button
                  disabled={item.count <= 0}
                  onClick={() => handleConsume(item)}
                  className="px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-lg shadow transition-all"
                >
                  Eat / Drink
                </button>
                <button
                  disabled={item.count <= 0}
                  onClick={() => handleTake(item)}
                  className="px-3 py-1 text-xs font-medium bg-slate-800 hover:bg-slate-700 disabled:bg-slate-850 disabled:text-slate-600 text-slate-200 border border-slate-700 rounded-lg transition-colors flex items-center justify-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Pack
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-800 bg-slate-950/80 text-xs text-slate-400">
          <span>Total Provisions: {items.reduce((acc, i) => acc + i.count, 0)} items</span>
          <button
            onClick={() => {
              soundEngine.playUIClick();
              onClose();
            }}
            className="px-4 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700"
          >
            Close Door
          </button>
        </div>
      </div>
    </div>
  );
};
