import React, { useMemo, useState } from 'react';
import { X, Wrench, Layers, Crosshair, Copy, Check, Hammer } from 'lucide-react';
import { InventorySlot, PlacedStructure, WeaponModId } from '../types/game';
import { BUILTIN_BLUEPRINTS, encodeBlueprint, decodeBlueprint } from '../utils/blueprintShare';
import { soundEngine } from '../utils/audio';

interface BlueprintManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  structures: PlacedStructure[];
  playerPos: [number, number, number];
  inventory: (InventorySlot | null)[];
  hotbar: (InventorySlot | null)[];
  weaponMods: Record<string, WeaponModId[]>;
  onDeployBlueprint: (items: { typeId: string; dx: number; dy: number; dz: number; rotationY: number }[], name: string) => void;
  onSalvageItem: (slotIndex: number, isHotbar: boolean) => void;
  onRepairItem: (slotIndex: number, isHotbar: boolean) => void;
  onAttachWeaponMod: (weaponId: string, modId: WeaponModId) => void;
}

export const BlueprintManagerModal: React.FC<BlueprintManagerModalProps> = ({
  isOpen,
  onClose,
  structures,
  playerPos,
  inventory,
  hotbar,
  weaponMods,
  onDeployBlueprint,
  onSalvageItem,
  onRepairItem,
  onAttachWeaponMod,
}) => {
  const [activeTab, setActiveTab] = useState<'blueprints' | 'salvage' | 'mods'>('blueprints');
  const [blueprintName, setBlueprintName] = useState('Outpost Defense Layout');
  const [importCode, setImportCode] = useState('');
  const [statusText, setStatusText] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const exportedCode = useMemo(() => {
    if (!isOpen) return '';
    return encodeBlueprint(blueprintName, structures, playerPos, 35);
  }, [isOpen, blueprintName, structures, playerPos]);

  if (!isOpen) return null;

  const gearSlots = [
    ...hotbar.map((slot, index) => ({ slot, index, isHotbar: true })),
    ...inventory.map((slot, index) => ({ slot, index, isHotbar: false })),
  ].filter(
    (entry): entry is { slot: InventorySlot; index: number; isHotbar: boolean } =>
      Boolean(entry.slot && (entry.slot.item.category === 'tool' || entry.slot.item.category === 'weapon'))
  );

  const ownedMods = [
    ...hotbar,
    ...inventory,
  ].filter((s): s is InventorySlot => Boolean(s && (s.item.id === 'suppressor_mod' || s.item.id === 'extended_mag_mod' || s.item.id === 'reflex_sight_mod')));

  const modifiableWeapons = gearSlots.filter(
    (g) => g.slot.item.toolType === 'ranged' || g.slot.item.toolType === 'weapon'
  );

  const metalCount = [...hotbar, ...inventory].reduce(
    (acc, s) => (s?.item.id === 'metal_scrap' ? acc + s.count : acc),
    0
  );

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(exportedCode);
      setCopied(true);
      soundEngine.playUIClick();
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setStatusText('Clipboard unavailable — select and copy code manually.');
    }
  };

  const handleImportSubmit = (rawCode: string) => {
    const parsed = decodeBlueprint(rawCode);
    if (!parsed || parsed.structures.length === 0) {
      setStatusText('Invalid blueprint string. Ensure it begins with LSR-BP1:.');
      return;
    }
    onDeployBlueprint(parsed.structures, parsed.name);
    soundEngine.playBuildSnap();
    setStatusText(`Deployed "${parsed.name}" (${parsed.structures.length} structures) around your position.`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4">
      <div className="flex h-[84vh] w-full max-w-4xl flex-col rounded-2xl border border-neutral-800 bg-neutral-950/95 text-neutral-100 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 px-6 py-4">
          <div className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-amber-400" />
            <h2 className="text-lg font-bold tracking-wide">Salvage Bench, Weapon Mods &amp; Blueprints</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-800 hover:text-white cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Segmented Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-neutral-800 bg-neutral-900/50 px-6 py-2.5 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('blueprints')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === 'blueprints' ? 'bg-amber-500 text-neutral-950 font-bold' : 'text-neutral-300 hover:bg-neutral-800'
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Base Blueprints</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('salvage')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === 'salvage' ? 'bg-amber-500 text-neutral-950 font-bold' : 'text-neutral-300 hover:bg-neutral-800'
            }`}
          >
            <Hammer className="h-3.5 w-3.5" />
            <span>Salvage &amp; Repair</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('mods')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === 'mods' ? 'bg-amber-500 text-neutral-950 font-bold' : 'text-neutral-300 hover:bg-neutral-800'
            }`}
          >
            <Crosshair className="h-3.5 w-3.5" />
            <span>Weapon Attachments</span>
          </button>
        </div>

        {statusText && (
          <div className="border-b border-emerald-800/60 bg-emerald-950/60 px-6 py-2 text-xs font-medium text-emerald-300">
            {statusText}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'blueprints' && (
            <div className="flex flex-col gap-6">
              {/* Export Nearby Base Layout */}
              <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-4">
                <h3 className="text-sm font-bold text-neutral-100">Export Local Base Blueprint (35m radius)</h3>
                <p className="mt-1 text-xs text-neutral-400">
                  Encodes your nearby walls, turrets, and workstations into an offline portable code.
                </p>
                <div className="mt-3 flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={blueprintName}
                    onChange={(e) => setBlueprintName(e.target.value)}
                    placeholder="Blueprint Name"
                    className="flex-1 rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-xs text-neutral-100 focus:border-amber-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="flex items-center justify-center gap-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 px-4 py-2 text-xs font-bold text-neutral-950 cursor-pointer whitespace-nowrap shrink-0"
                  >
                    {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{copied ? 'Copied Code' : 'Copy Code'}</span>
                  </button>
                </div>
                <textarea
                  readOnly
                  value={exportedCode}
                  rows={2}
                  className="mt-2.5 w-full rounded-lg border border-neutral-800 bg-neutral-950 p-2 font-mono text-[11px] text-neutral-400"
                />
              </div>

              {/* Import Blueprint String */}
              <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-4">
                <h3 className="text-sm font-bold text-neutral-100">Deploy From Blueprint Code</h3>
                <p className="mt-1 text-xs text-neutral-400">
                  Paste any shared <span className="font-mono text-amber-300">LSR-BP1:...</span> layout string to construct it centered on your location.
                </p>
                <div className="mt-3 flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={importCode}
                    onChange={(e) => setImportCode(e.target.value)}
                    placeholder="Paste LSR-BP1:... code"
                    className="flex-1 rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 font-mono text-xs text-neutral-100 focus:border-amber-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleImportSubmit(importCode)}
                    className="rounded-lg bg-emerald-600 hover:bg-emerald-500 px-4 py-2 text-xs font-bold text-white cursor-pointer whitespace-nowrap shrink-0"
                  >
                    Deploy Blueprint
                  </button>
                </div>
              </div>

              {/* Built-in Tactical Presets */}
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-3">
                  Built-In Tactical Presets
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {BUILTIN_BLUEPRINTS.map((bp) => (
                    <div
                      key={bp.id}
                      className="flex flex-col justify-between rounded-xl border border-neutral-800 bg-neutral-900/50 p-4"
                    >
                      <div>
                        <h4 className="text-sm font-bold text-neutral-100">{bp.name}</h4>
                        <p className="mt-1 text-xs text-neutral-400 leading-relaxed">{bp.summary}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleImportSubmit(bp.code)}
                        className="mt-4 w-full rounded-lg border border-amber-500/40 bg-amber-500/15 hover:bg-amber-500 hover:text-neutral-950 py-2 px-3 text-xs font-bold text-amber-300 transition-colors cursor-pointer whitespace-nowrap"
                      >
                        Deploy Preset Here
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'salvage' && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between text-xs text-neutral-400 pb-2 border-b border-neutral-800">
                <span>Dismantle excess gear for metal &amp; circuits, or spend 2 Salvaged Metal to repair tools.</span>
                <span className="font-mono text-amber-300 tabular-nums">Metal Available: {metalCount}</span>
              </div>

              {gearSlots.length === 0 ? (
                <div className="py-10 text-center text-xs text-neutral-500">
                  No tools or weapons available in hotbar or backpack.
                </div>
              ) : (
                gearSlots.map(({ slot, index, isHotbar }) => {
                  const maxDur = slot.item.maxDurability || 100;
                  const curDur = slot.durability ?? slot.item.durability ?? maxDur;
                  const needsRepair = curDur < maxDur && metalCount >= 2;
                  return (
                    <div
                      key={`${isHotbar ? 'hb' : 'inv'}_${index}`}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-neutral-800 bg-neutral-900/50 p-3.5"
                    >
                      <div>
                        <div className="flex items-center gap-2 text-sm font-bold text-neutral-100">
                          <span>{slot.item.name}</span>
                          <span className="text-xs font-mono font-normal text-neutral-400 tabular-nums">
                            · {isHotbar ? `Hotbar ${index + 1}` : 'Backpack'} · {Math.round(curDur)}/{maxDur} DUR
                          </span>
                        </div>
                        <p className="text-xs text-neutral-400 mt-0.5">{slot.item.description}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          disabled={!needsRepair}
                          onClick={() => {
                            onRepairItem(index, isHotbar);
                            soundEngine.playBuildSnap();
                            setStatusText(`Repaired ${slot.item.name} (-2 Metal Scrap).`);
                          }}
                          className={`rounded-lg px-3 py-1.5 text-xs font-bold whitespace-nowrap ${
                            needsRepair
                              ? 'bg-sky-600 hover:bg-sky-500 text-white cursor-pointer'
                              : 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                          }`}
                        >
                          Repair (2 Metal)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onSalvageItem(index, isHotbar);
                            soundEngine.playBuildSnap();
                            setStatusText(`Salvaged ${slot.item.name} into Metal Scrap & Circuits.`);
                          }}
                          className="rounded-lg border border-rose-800/60 bg-rose-950/30 hover:bg-rose-900/50 px-3 py-1.5 text-xs font-semibold text-rose-300 cursor-pointer whitespace-nowrap"
                        >
                          Salvage
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {activeTab === 'mods' && (
            <div className="flex flex-col gap-4">
              <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-3.5 text-xs text-neutral-300">
                <span className="font-semibold text-neutral-100">Owned Attachment Kits: </span>
                {ownedMods.length > 0 ? (
                  ownedMods.map((m, i) => (
                    <span key={m.item.id} className="font-mono text-amber-300">
                      {i > 0 ? ' · ' : ''}
                      {m.item.name.replace('Mod: ', '')} (x{m.count})
                    </span>
                  ))
                ) : (
                  <span className="text-neutral-500">Craft attachment kits at an Artisan Workbench first.</span>
                )}
              </div>

              {modifiableWeapons.length === 0 ? (
                <div className="py-10 text-center text-xs text-neutral-500">
                  Equip or carry a Combat Weapon or Crossbow to attach weapon modifications.
                </div>
              ) : (
                modifiableWeapons.map(({ slot, index, isHotbar }) => {
                  const installed = weaponMods[slot.item.id] || [];
                  const modList: { id: WeaponModId; label: string }[] = [
                    { id: 'suppressor_mod', label: 'Suppressor' },
                    { id: 'extended_mag_mod', label: 'Extended Mag' },
                    { id: 'reflex_sight_mod', label: 'Reflex Sight' },
                  ];
                  return (
                    <div
                      key={`${isHotbar ? 'hb' : 'inv'}_${index}_${slot.item.id}`}
                      className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h4 className="text-sm font-bold text-neutral-100">{slot.item.name}</h4>
                        <span className="text-xs font-mono text-neutral-400">
                          {installed.length > 0
                            ? `Installed: ${installed.map((m) => m.replace('_mod', '').replace('_', ' ')).join(', ')}`
                            : 'No attachments installed'}
                        </span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {modList.map((m) => {
                          const hasInstalled = installed.includes(m.id);
                          const hasKit = ownedMods.some((k) => k.item.id === m.id && k.count > 0);
                          return (
                            <button
                              key={m.id}
                              type="button"
                              disabled={hasInstalled || !hasKit}
                              onClick={() => {
                                onAttachWeaponMod(slot.item.id, m.id);
                                setStatusText(`Attached ${m.label} to ${slot.item.name}.`);
                              }}
                              className={`rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap ${
                                hasInstalled
                                  ? 'bg-emerald-950/60 border border-emerald-700/60 text-emerald-300 cursor-default'
                                  : hasKit
                                  ? 'bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold cursor-pointer'
                                  : 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                              }`}
                            >
                              {hasInstalled ? `${m.label} Installed` : `Attach ${m.label}`}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
