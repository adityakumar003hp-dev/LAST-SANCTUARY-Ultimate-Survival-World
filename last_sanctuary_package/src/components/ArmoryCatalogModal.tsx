import React, { useState, useMemo } from 'react';
import { ARMORY_CATALOG, ArmoryCatalogItem } from '../data/armoryCatalog';
import { Crosshair, Zap, Shield, Sparkles, Package, Search, X, Check, ArrowRight } from 'lucide-react';
import { soundEngine } from '../utils/audio';

interface ArmoryCatalogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCollectItem: (item: ArmoryCatalogItem) => void;
}

export const ArmoryCatalogModal: React.FC<ArmoryCatalogModalProps> = ({
  isOpen,
  onClose,
  onCollectItem,
}) => {
  const [activeCategory, setActiveCategory] = useState<'all' | 'weapon' | 'ammo' | 'gear' | 'relic'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<ArmoryCatalogItem | null>(null);
  const [collectedMap, setCollectedMap] = useState<Record<string, boolean>>({});

  const filteredItems = useMemo(() => {
    return ARMORY_CATALOG.filter((item) => {
      const matchesCat = activeCategory === 'all' || item.armoryCategory === activeCategory;
      const matchesQuery =
        searchQuery.trim() === '' ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCat && matchesQuery;
    });
  }, [activeCategory, searchQuery]);

  if (!isOpen) return null;

  const handleTakeItem = (item: ArmoryCatalogItem) => {
    soundEngine.playBuildSnap();
    onCollectItem(item);
    setCollectedMap((prev) => ({ ...prev, [item.id]: true }));
  };

  const getRarityBadge = (rarity: string) => {
    switch (rarity) {
      case 'common':
        return 'bg-gray-700/80 text-gray-300 border-gray-600';
      case 'uncommon':
        return 'bg-emerald-900/80 text-emerald-300 border-emerald-600';
      case 'rare':
        return 'bg-blue-900/80 text-blue-300 border-blue-500';
      case 'epic':
        return 'bg-purple-900/80 text-purple-300 border-purple-500';
      case 'legendary':
        return 'bg-amber-900/80 text-amber-300 border-amber-500';
      case 'prototype':
        return 'bg-cyan-900/80 text-cyan-300 border-cyan-400 animate-pulse';
      default:
        return 'bg-gray-800 text-gray-400 border-gray-700';
    }
  };

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'weapon':
        return <Crosshair className="w-4 h-4 text-rose-400" />;
      case 'ammo':
        return <Zap className="w-4 h-4 text-amber-400" />;
      case 'gear':
        return <Shield className="w-4 h-4 text-emerald-400" />;
      case 'relic':
        return <Sparkles className="w-4 h-4 text-purple-400" />;
      default:
        return <Package className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm pointer-events-auto">
      <div className="flex flex-col w-full max-w-5xl h-[88vh] bg-slate-900/95 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-cyan-950 border border-cyan-500/40 rounded-xl">
              <Crosshair className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold tracking-wider text-slate-100 uppercase">
                  Floor 3 — Sector Armory & Vault
                </h2>
                <span className="px-2 py-0.5 text-xs font-semibold bg-cyan-900/60 text-cyan-300 border border-cyan-500/30 rounded-full">
                  100 Archetypes
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Fictional survival weaponry, energy cells, protective suits, and collectible artifacts.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              soundEngine.playUIClick();
              onClose();
            }}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Filters and Search Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3 bg-slate-900/80 border-b border-slate-800">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setActiveCategory('all')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                activeCategory === 'all'
                  ? 'bg-cyan-600 text-white border-cyan-400 shadow-md'
                  : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-750'
              }`}
            >
              All (100)
            </button>
            <button
              onClick={() => setActiveCategory('weapon')}
              className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                activeCategory === 'weapon'
                  ? 'bg-rose-600 text-white border-rose-400 shadow-md'
                  : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-750'
              }`}
            >
              <Crosshair className="w-3.5 h-3.5" />
              Weapons (1–30)
            </button>
            <button
              onClick={() => setActiveCategory('ammo')}
              className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                activeCategory === 'ammo'
                  ? 'bg-amber-600 text-white border-amber-400 shadow-md'
                  : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-750'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              Energy & Ammo (31–60)
            </button>
            <button
              onClick={() => setActiveCategory('gear')}
              className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                activeCategory === 'gear'
                  ? 'bg-emerald-600 text-white border-emerald-400 shadow-md'
                  : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-750'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              Gear & Utility (61–80)
            </button>
            <button
              onClick={() => setActiveCategory('relic')}
              className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                activeCategory === 'relic'
                  ? 'bg-purple-600 text-white border-purple-400 shadow-md'
                  : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-750'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Relics & Cores (81–100)
            </button>
          </div>

          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search 100 entries..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-950 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400"
            />
          </div>
        </div>

        {/* Content Body */}
        <div className="flex flex-1 overflow-hidden">
          {/* Scrollable Item Grid */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {filteredItems.map((item) => {
              const isSelected = selectedItem?.id === item.id;
              const isCollected = !!collectedMap[item.id];

              return (
                <div
                  key={item.id}
                  onClick={() => {
                    soundEngine.playUIClick();
                    setSelectedItem(item);
                  }}
                  className={`group relative flex flex-col p-3 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-slate-800/90 border-cyan-400 shadow-lg shadow-cyan-950/40'
                      : 'bg-slate-850/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-[10px] font-mono text-slate-400">
                      #{String(item.displaySlot).padStart(3, '0')}
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold uppercase tracking-wider ${getRarityBadge(
                        item.rarity
                      )}`}
                    >
                      {item.rarity}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-2 bg-slate-900 border border-slate-750 rounded-lg">
                      {getCategoryIcon(item.armoryCategory)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-slate-100 truncate group-hover:text-cyan-300 transition-colors">
                        {item.name}
                      </h4>
                      <span className="text-[11px] text-slate-400 capitalize">
                        {item.armoryCategory}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-400 line-clamp-2 mb-3 flex-1">
                    {item.description}
                  </p>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[11px] text-slate-400">
                    <span>
                      {item.damage ? `DMG: ${item.damage}` : `Stack: ${item.maxStack || 1}`}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTakeItem(item);
                      }}
                      className={`px-2.5 py-1 text-xs font-medium rounded-lg flex items-center gap-1 transition-all ${
                        isCollected
                          ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-600/50'
                          : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow'
                      }`}
                    >
                      {isCollected ? (
                        <>
                          <Check className="w-3 h-3" /> In Pack
                        </>
                      ) : (
                        <>
                          Take <ArrowRight className="w-3 h-3" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Sidebar Detail Panel */}
          {selectedItem && (
            <div className="hidden lg:flex flex-col w-80 p-5 bg-slate-950/80 border-l border-slate-800">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-mono text-cyan-400 font-semibold">
                  VAULT SPEC: {selectedItem.id.toUpperCase()}
                </span>
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full border font-bold uppercase tracking-wider ${getRarityBadge(
                    selectedItem.rarity
                  )}`}
                >
                  {selectedItem.rarity}
                </span>
              </div>

              <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl mb-4 text-center">
                <div className="w-16 h-16 mx-auto mb-3 flex items-center justify-center bg-slate-950 border border-cyan-500/30 rounded-2xl">
                  {getCategoryIcon(selectedItem.armoryCategory)}
                </div>
                <h3 className="text-lg font-bold text-slate-100">{selectedItem.name}</h3>
                <p className="text-xs text-cyan-400 font-mono mt-0.5">
                  Slot #{String(selectedItem.displaySlot).padStart(3, '0')} · {selectedItem.armoryCategory.toUpperCase()}
                </p>
              </div>

              <div className="space-y-3 mb-6 flex-1 text-xs text-slate-300">
                <div>
                  <span className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Design & Description
                  </span>
                  <p className="p-3 bg-slate-900/60 border border-slate-800/80 rounded-lg text-slate-300 leading-relaxed">
                    {selectedItem.description}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2">
                  <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg">
                    <span className="block text-[10px] text-slate-400">Weight</span>
                    <span className="text-sm font-semibold text-slate-100">
                      {selectedItem.weight || 0.5} kg
                    </span>
                  </div>
                  <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg">
                    <span className="block text-[10px] text-slate-400">Max Stack</span>
                    <span className="text-sm font-semibold text-slate-100">
                      {selectedItem.maxStack || 1}
                    </span>
                  </div>
                  {selectedItem.damage && (
                    <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg">
                      <span className="block text-[10px] text-slate-400">Output Rating</span>
                      <span className="text-sm font-semibold text-rose-400">
                        {selectedItem.damage} PTS
                      </span>
                    </div>
                  )}
                  {selectedItem.durability && (
                    <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg">
                      <span className="block text-[10px] text-slate-400">Integrity</span>
                      <span className="text-sm font-semibold text-emerald-400">
                        {selectedItem.durability} / {selectedItem.maxDurability}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={() => handleTakeItem(selectedItem)}
                className="w-full py-2.5 text-xs font-bold uppercase tracking-wider bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl shadow-lg shadow-cyan-900/30 transition-all flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" />
                Add to Survivor Pack
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-800 bg-slate-950/70 text-xs text-slate-400">
          <span>Showing {filteredItems.length} of 100 Armory Inventory Entries</span>
          <span>Press [ESC] or Close to return to Apartment Floor 3</span>
        </div>
      </div>
    </div>
  );
};
