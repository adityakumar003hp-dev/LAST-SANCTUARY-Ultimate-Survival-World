import React from 'react';
import { PlacedStructure, InventorySlot } from '../types/game';
import { X, Archive, ArrowRightLeft } from 'lucide-react';
import { soundEngine } from '../utils/audio';

interface StorageChestModalProps {
  isOpen: boolean;
  onClose: () => void;
  structure: PlacedStructure | null;
  playerInventory: (InventorySlot | null)[];
  onTransferToChest: (invIndex: number) => void;
  onTransferToInventory: (chestIndex: number) => void;
}

export const StorageChestModal: React.FC<StorageChestModalProps> = ({
  isOpen,
  onClose,
  structure,
  playerInventory,
  onTransferToChest,
  onTransferToInventory,
}) => {
  if (!isOpen || !structure || !structure.storageItems) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="flex h-[80vh] w-full max-w-4xl flex-col rounded-2xl bg-neutral-950/95 border border-neutral-800 shadow-2xl text-neutral-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 px-6 py-4">
          <div className="flex items-center gap-2">
            <Archive className="h-5 w-5 text-amber-500" />
            <h2 className="text-lg font-bold tracking-wide">Sanctuary Supply Chest</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 hover:bg-neutral-800 transition-colors text-neutral-400 hover:text-white cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 2-Column Split: Chest Storage vs Player Backpack */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-neutral-800">
          {/* Left: Chest Slots */}
          <div className="p-6 flex flex-col overflow-y-auto">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-3">
              Chest Stash (Click item to take to backpack)
            </span>
            <div className="grid grid-cols-4 gap-2.5">
              {structure.storageItems.map((slot, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    if (slot) {
                      soundEngine.playUIClick();
                      onTransferToInventory(idx);
                    }
                  }}
                  className="relative flex h-16 w-full flex-col items-center justify-center rounded-xl border border-neutral-800 bg-neutral-900/60 p-1 hover:border-amber-400 hover:bg-neutral-900 transition-all cursor-pointer"
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

          {/* Right: Player Inventory */}
          <div className="p-6 flex flex-col overflow-y-auto">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-3">
              Player Backpack (Click item to store in chest)
            </span>
            <div className="grid grid-cols-4 gap-2.5">
              {playerInventory.map((slot, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    if (slot) {
                      soundEngine.playUIClick();
                      onTransferToChest(idx);
                    }
                  }}
                  className="relative flex h-16 w-full flex-col items-center justify-center rounded-xl border border-neutral-800/80 bg-neutral-900/40 p-1 hover:border-amber-400 hover:bg-neutral-900 transition-all cursor-pointer"
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

        {/* Footer */}
        <div className="border-t border-neutral-800 bg-neutral-950 px-6 py-3 text-xs text-neutral-400 flex items-center justify-between">
          <span>Stashed items are safely protected from zombie damage.</span>
          <span className="font-mono text-neutral-500">16 Slots Capacity</span>
        </div>
      </div>
    </div>
  );
};
