import React, { useState } from 'react';
import { InventorySlot, ItemDefinition } from '../types/game';
import { X, Package, Trash2, ArrowDownToLine } from 'lucide-react';
import { soundEngine } from '../utils/audio';

interface InventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  inventory: (InventorySlot | null)[];
  hotbar: (InventorySlot | null)[];
  onUseItem: (slotIndex: number, isHotbar: boolean) => void;
  onDropItem: (slotIndex: number, isHotbar: boolean) => void;
  onMoveToHotbar: (invIndex: number, hotbarIndex: number) => void;
}

export const InventoryModal: React.FC<InventoryModalProps> = ({
  isOpen,
  onClose,
  inventory,
  hotbar,
  onUseItem,
  onDropItem,
  onMoveToHotbar,
}) => {
  const [selectedItem, setSelectedItem] = useState<{
    slot: InventorySlot;
    index: number;
    isHotbar: boolean;
  } | null>(null);

  if (!isOpen) return null;

  // Calculate total carry weight
  const totalWeight = [...inventory, ...hotbar].reduce((acc, slot) => {
    if (slot) return acc + slot.item.weight * slot.count;
    return acc;
  }, 0);
  const maxCarryWeight = 60.0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="flex h-[82vh] w-full max-w-4xl flex-col rounded-2xl bg-neutral-950/95 border border-neutral-800 shadow-2xl text-neutral-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 px-6 py-4">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-amber-500" />
            <h2 className="text-lg font-bold tracking-wide">Survivor Backpack & Equipment</h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-xs font-mono text-neutral-400">
              Weight: <span className="text-amber-400 font-bold">{totalWeight.toFixed(1)}</span> / {maxCarryWeight} kg
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 hover:bg-neutral-800 transition-colors text-neutral-400 hover:text-white cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content split (responsive for mobile) */}
        <div className="flex flex-col md:flex-row flex-1 overflow-y-auto md:overflow-hidden">
          {/* Left Grid: Hotbar & Main Backpack */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 border-b md:border-b-0 md:border-r border-neutral-800 flex flex-col gap-4 sm:gap-6">
            {/* Quick-Access Hotbar */}
            <div>
              <span className="text-xs uppercase font-bold text-amber-400 tracking-wider block mb-2">
                Equipped Hotbar Slots [1-8]
              </span>
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                {hotbar.map((slot, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      if (slot) setSelectedItem({ slot, index: idx, isHotbar: true });
                    }}
                    className={`relative flex h-16 w-full sm:w-16 flex-col items-center justify-center rounded-xl border p-1 transition-all cursor-pointer ${
                      selectedItem?.isHotbar && selectedItem?.index === idx
                        ? 'border-amber-400 bg-amber-500/20'
                        : 'border-neutral-800 bg-neutral-900/60 hover:border-neutral-700'
                    }`}
                  >
                    <span className="absolute top-1 left-1.5 text-[9px] font-mono text-neutral-400 font-bold">
                      {idx + 1}
                    </span>
                    {slot ? (
                      <>
                        <span className="text-[11px] font-semibold text-neutral-100 text-center truncate w-full px-1">
                          {slot.item.name}
                        </span>
                        {slot.count > 1 && (
                          <span className="absolute bottom-1 right-1.5 font-mono text-[10px] font-bold text-amber-300">
                            x{slot.count}
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-neutral-700 text-xs">-</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Main Backpack Grid */}
            <div className="flex-1">
              <span className="text-xs uppercase font-bold text-neutral-400 tracking-wider block mb-2">
                Backpack Storage
              </span>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2.5">
                {inventory.map((slot, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      if (slot) setSelectedItem({ slot, index: idx, isHotbar: false });
                    }}
                    className={`relative flex h-16 w-full flex-col items-center justify-center rounded-xl border p-1 transition-all cursor-pointer ${
                      !selectedItem?.isHotbar && selectedItem?.index === idx
                        ? 'border-amber-400 bg-amber-500/20'
                        : 'border-neutral-800/80 bg-neutral-900/50 hover:border-neutral-700 hover:bg-neutral-900'
                    }`}
                  >
                    {slot ? (
                      <>
                        <span className="text-[11px] font-semibold text-neutral-100 text-center truncate w-full px-1">
                          {slot.item.name}
                        </span>
                        {slot.count > 1 && (
                          <span className="absolute bottom-1 right-1.5 font-mono text-[10px] font-bold text-amber-300">
                            x{slot.count}
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-neutral-700 text-xs">-</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Inspection Panel (Responsive on mobile) */}
          <div className="w-full md:w-80 p-4 sm:p-6 flex flex-col justify-between bg-neutral-950/70 shrink-0">
            {selectedItem ? (
              <div>
                <div className="flex items-start justify-between">
                  <h3 className="text-base font-bold text-neutral-100">{selectedItem.slot.item.name}</h3>
                  <span className="text-[10px] uppercase font-mono font-bold bg-neutral-800 text-amber-400 px-2 py-0.5 rounded">
                    {selectedItem.slot.item.category}
                  </span>
                </div>
                <p className="mt-2 text-xs text-neutral-300 leading-relaxed">
                  {selectedItem.slot.item.description}
                </p>

                {/* Stats */}
                <div className="mt-4 flex flex-col gap-1.5 rounded-lg bg-neutral-900 p-3 text-xs border border-neutral-800">
                  <div className="flex justify-between text-neutral-400">
                    <span>Stack Quantity:</span>
                    <span className="font-mono text-neutral-200">{selectedItem.slot.count}</span>
                  </div>
                  <div className="flex justify-between text-neutral-400">
                    <span>Weight per unit:</span>
                    <span className="font-mono text-neutral-200">{selectedItem.slot.item.weight} kg</span>
                  </div>
                  {selectedItem.slot.item.hungerRestore && (
                    <div className="flex justify-between text-orange-400">
                      <span>Restores Hunger:</span>
                      <span className="font-mono font-bold">+{selectedItem.slot.item.hungerRestore}%</span>
                    </div>
                  )}
                  {selectedItem.slot.item.thirstRestore && (
                    <div className="flex justify-between text-sky-400">
                      <span>Restores Thirst:</span>
                      <span className="font-mono font-bold">+{selectedItem.slot.item.thirstRestore}%</span>
                    </div>
                  )}
                  {selectedItem.slot.item.healthRestore && (
                    <div className="flex justify-between text-rose-400">
                      <span>Restores Health:</span>
                      <span className="font-mono font-bold">+{selectedItem.slot.item.healthRestore} HP</span>
                    </div>
                  )}
                  {selectedItem.slot.item.damage && (
                    <div className="flex justify-between text-amber-400">
                      <span>Base Damage:</span>
                      <span className="font-mono font-bold">{selectedItem.slot.item.damage}</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="mt-6 flex flex-col gap-2">
                  {(selectedItem.slot.item.category === 'consumable' || selectedItem.slot.item.category === 'medical') && (
                    <button
                      onClick={() => {
                        onUseItem(selectedItem.index, selectedItem.isHotbar);
                        soundEngine.playUIClick();
                        setSelectedItem(null);
                      }}
                      className="w-full rounded-lg bg-emerald-600 hover:bg-emerald-500 py-2.5 text-xs font-bold uppercase tracking-wider text-white transition-all cursor-pointer shadow-md"
                    >
                      Consume / Apply
                    </button>
                  )}

                  {!selectedItem.isHotbar && (
                    <button
                      onClick={() => {
                        onMoveToHotbar(selectedItem.index, 0); // moves to first available or index 0
                        soundEngine.playUIClick();
                        setSelectedItem(null);
                      }}
                      className="flex items-center justify-center gap-1.5 w-full rounded-lg bg-neutral-800 hover:bg-neutral-700 py-2 text-xs font-semibold text-neutral-200 transition-all cursor-pointer"
                    >
                      <ArrowDownToLine className="h-3.5 w-3.5" />
                      <span>Equip to Hotbar</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      onDropItem(selectedItem.index, selectedItem.isHotbar);
                      soundEngine.playUIClick();
                      setSelectedItem(null);
                    }}
                    className="flex items-center justify-center gap-1.5 w-full rounded-lg border border-rose-900/40 bg-rose-950/20 hover:bg-rose-950/40 py-2 text-xs font-semibold text-rose-300 transition-all cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Discard Item</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex h-full items-center justify-center text-center text-xs text-neutral-500">
                Click any item in your backpack or hotbar to inspect properties, consume, or equip.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
