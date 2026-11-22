import React, { useState } from 'react';
import { RECIPES } from '../data/recipes';
import { ITEMS } from '../data/items';
import { CraftingRecipe, InventorySlot } from '../types/game';
import { X, Hammer, Flame, Check } from 'lucide-react';
import { soundEngine } from '../utils/audio';

interface CraftingModalProps {
  isOpen: boolean;
  onClose: () => void;
  stationType?: string; // 'workbench', 'campfire', or undefined for field craft
  inventory: (InventorySlot | null)[];
  onCraftRecipe: (recipe: CraftingRecipe) => void;
}

export const CraftingModal: React.FC<CraftingModalProps> = ({
  isOpen,
  onClose,
  stationType,
  inventory,
  onCraftRecipe,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedRecipe, setSelectedRecipe] = useState<CraftingRecipe | null>(null);

  if (!isOpen) return null;

  // Helper to count item quantity in inventory
  const getItemCount = (itemId: string): number => {
    return inventory.reduce((total, slot) => {
      if (slot && slot.item.id === itemId) {
        return total + slot.count;
      }
      return total;
    }, 0);
  };

  // Filter recipes based on current station
  const availableRecipes = RECIPES.filter((r) => {
    if (!stationType) {
      // Field crafting (no station required)
      return !r.requiredStation;
    }
    // At workbench or campfire
    return !r.requiredStation || r.requiredStation === stationType;
  });

  const filteredRecipes = selectedCategory === 'all'
    ? availableRecipes
    : availableRecipes.filter((r) => r.category === selectedCategory);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="flex h-[82vh] w-full max-w-4xl flex-col rounded-2xl bg-neutral-950/95 border border-neutral-800 shadow-2xl text-neutral-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 px-6 py-4">
          <div className="flex items-center gap-2">
            {stationType === 'campfire' ? (
              <Flame className="h-5 w-5 text-orange-500" />
            ) : (
              <Hammer className="h-5 w-5 text-amber-500" />
            )}
            <h2 className="text-lg font-bold tracking-wide">
              {stationType === 'campfire'
                ? 'Campfire Cooking & Purification'
                : stationType === 'workbench'
                ? 'Master Artisan Workbench'
                : 'Field Crafting Workshop'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 hover:bg-neutral-800 transition-colors text-neutral-400 hover:text-white cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Categories */}
        <div className="flex gap-2 border-b border-neutral-800 bg-neutral-900/50 px-6 py-2">
          {['all', 'tools', 'defense', 'construction', 'medical', 'survival'].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-amber-500 text-neutral-950 font-bold'
                  : 'text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Content split (responsive on mobile) */}
        <div className="flex flex-col md:flex-row flex-1 overflow-y-auto md:overflow-hidden">
          {/* Recipes List */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-3 border-b md:border-b-0 md:border-r border-neutral-800">
            {filteredRecipes.map((recipe) => {
              const resultItem = ITEMS[recipe.resultItemId];
              const canCraft = recipe.ingredients.every(
                (ing) => getItemCount(ing.itemId) >= ing.count
              );
              const isSelected = selectedRecipe?.id === recipe.id;

              return (
                <button
                  key={recipe.id}
                  onClick={() => setSelectedRecipe(recipe)}
                  className={`flex flex-col justify-between rounded-xl border p-3.5 text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'border-amber-400 bg-amber-500/15'
                      : canCraft
                      ? 'border-neutral-800 bg-neutral-900/60 hover:border-neutral-700'
                      : 'border-neutral-800/50 bg-neutral-950/40 opacity-70'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-neutral-100">
                        {resultItem ? resultItem.name : recipe.resultItemId}
                      </h4>
                      <p className="mt-1 text-xs text-neutral-400 line-clamp-1">
                        {recipe.description}
                      </p>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-amber-300 rounded bg-neutral-800 px-1.5 py-0.5">
                      x{recipe.resultCount}
                    </span>
                  </div>

                  {/* Quick ingredient badges */}
                  <div className="mt-3 flex flex-wrap gap-1">
                    {recipe.ingredients.map((ing) => {
                      const owned = getItemCount(ing.itemId);
                      const met = owned >= ing.count;
                      const itemDef = ITEMS[ing.itemId];
                      return (
                        <span
                          key={ing.itemId}
                          className={`rounded px-1.5 py-0.5 text-[10px] font-mono border ${
                            met
                              ? 'border-emerald-800/40 text-emerald-300 bg-emerald-950/30'
                              : 'border-rose-900/40 text-rose-400 bg-rose-950/30'
                          }`}
                        >
                          {itemDef ? itemDef.name.split(' ')[0] : ing.itemId}: {owned}/{ing.count}
                        </span>
                      );
                    })}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Right Inspection & Craft Action (Responsive on mobile) */}
          <div className="w-full md:w-80 p-4 sm:p-6 flex flex-col justify-between bg-neutral-950/70 shrink-0">
            {selectedRecipe ? (
              <div>
                {(() => {
                  const resultItem = ITEMS[selectedRecipe.resultItemId];
                  const canCraft = selectedRecipe.ingredients.every(
                    (ing) => getItemCount(ing.itemId) >= ing.count
                  );

                  return (
                    <>
                      <div>
                        <h3 className="text-base font-bold text-neutral-100">
                          {resultItem?.name} (x{selectedRecipe.resultCount})
                        </h3>
                        <p className="mt-2 text-xs text-neutral-300 leading-relaxed">
                          {selectedRecipe.description}
                        </p>
                      </div>

                      {/* Required Ingredients */}
                      <div className="mt-6">
                        <span className="text-xs uppercase font-bold text-neutral-400 block mb-2">
                          Required Ingredients
                        </span>
                        <div className="flex flex-col gap-2">
                          {selectedRecipe.ingredients.map((ing) => {
                            const owned = getItemCount(ing.itemId);
                            const met = owned >= ing.count;
                            const itemDef = ITEMS[ing.itemId];

                            return (
                              <div
                                key={ing.itemId}
                                className={`flex items-center justify-between rounded-lg p-2.5 border text-xs font-mono ${
                                  met
                                    ? 'border-emerald-800/40 bg-emerald-950/20 text-emerald-200'
                                    : 'border-rose-900/40 bg-rose-950/20 text-rose-300'
                                }`}
                              >
                                <span>{itemDef ? itemDef.name : ing.itemId}</span>
                                <span className="font-bold">
                                  {owned} / {ing.count}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Craft Action Button */}
                      <div className="mt-8">
                        <button
                          disabled={!canCraft}
                          onClick={() => {
                            onCraftRecipe(selectedRecipe);
                            soundEngine.playBuildSnap();
                          }}
                          className={`w-full rounded-xl py-3 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-lg ${
                            canCraft
                              ? 'bg-amber-500 hover:bg-amber-400 text-neutral-950'
                              : 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                          }`}
                        >
                          {canCraft ? 'Assemble / Craft Item' : 'Missing Ingredients'}
                        </button>
                      </div>
                    </>
                  );
                })()}
              </div>
            ) : (
              <div className="flex h-full items-center justify-center text-center text-xs text-neutral-500">
                Select any recipe on the left to review ingredient costs and manufacture items.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
