import React, { useState } from 'react';
import { Play, Save, Settings as SettingsIcon, HelpCircle, LogOut, X, Volume2, Eye, Smartphone, Keyboard } from 'lucide-react';
import { GameSettings } from '../types/game';
import { soundEngine } from '../utils/audio';

interface PauseMenuProps {
  isOpen: boolean;
  onResume: () => void;
  onSave: () => void;
  onQuitToMenu: () => void;
  settings: GameSettings;
  onUpdateSettings: (newSettings: GameSettings) => void;
  touchControlsMode?: 'auto' | 'always' | 'off';
  onSetTouchControlsMode?: (mode: 'auto' | 'always' | 'off') => void;
}

export const PauseMenu: React.FC<PauseMenuProps> = ({
  isOpen,
  onResume,
  onSave,
  onQuitToMenu,
  settings,
  onUpdateSettings,
  touchControlsMode = 'auto',
  onSetTouchControlsMode,
}) => {
  const [activeTab, setActiveTab] = useState<'main' | 'settings' | 'controls'>('main');
  const [controlsCategory, setControlsCategory] = useState<'mobile' | 'desktop'>('mobile');
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSaveClick = () => {
    onSave();
    soundEngine.playBuildSnap();
    setSaveMessage('Sanctuary world and progression successfully saved!');
    setTimeout(() => setSaveMessage(null), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="flex w-full max-w-lg flex-col rounded-2xl bg-neutral-950/95 border border-neutral-800 shadow-2xl text-neutral-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 px-6 py-4">
          <h2 className="text-lg font-bold tracking-wide">Game Paused</h2>
          <button
            onClick={onResume}
            className="rounded-lg p-1.5 hover:bg-neutral-800 transition-colors text-neutral-400 hover:text-white cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab switcher */}
        {activeTab !== 'main' && (
          <div className="border-b border-neutral-800 px-6 py-2 bg-neutral-900/40">
            <button
              onClick={() => setActiveTab('main')}
              className="text-xs font-semibold text-amber-400 hover:underline cursor-pointer"
            >
              ← Back to Pause Menu
            </button>
          </div>
        )}

        {/* Save confirmation toast */}
        {saveMessage && (
          <div className="bg-emerald-950/80 border-b border-emerald-800/80 px-6 py-2 text-xs font-semibold text-emerald-300 text-center">
            {saveMessage}
          </div>
        )}

        {/* Content Tabs */}
        <div className="p-6">
          {activeTab === 'main' && (
            <div className="flex flex-col gap-3">
              <button
                onClick={onResume}
                className="flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 py-3 text-sm font-bold uppercase tracking-wider text-neutral-950 transition-all cursor-pointer shadow-lg"
              >
                <Play className="h-4 w-4 fill-neutral-950" />
                <span>Resume Simulation</span>
              </button>

              <button
                onClick={handleSaveClick}
                className="flex items-center justify-center gap-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-700/80 py-3 text-sm font-semibold text-neutral-200 transition-all cursor-pointer"
              >
                <Save className="h-4 w-4 text-emerald-400" />
                <span>Save Game</span>
              </button>

              <button
                onClick={() => setActiveTab('settings')}
                className="flex items-center justify-center gap-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-700/80 py-3 text-sm font-semibold text-neutral-200 transition-all cursor-pointer"
              >
                <SettingsIcon className="h-4 w-4 text-sky-400" />
                <span>Audio & Visual Settings</span>
              </button>

              <button
                onClick={() => setActiveTab('controls')}
                className="flex items-center justify-center gap-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-700/80 py-3 text-sm font-semibold text-neutral-200 transition-all cursor-pointer"
              >
                <HelpCircle className="h-4 w-4 text-amber-400" />
                <span>Controls & Keybindings</span>
              </button>

              <div className="my-2 border-t border-neutral-800" />

              <button
                onClick={onQuitToMenu}
                className="flex items-center justify-center gap-2 rounded-xl border border-rose-900/50 bg-rose-950/20 hover:bg-rose-950/40 py-3 text-sm font-semibold text-rose-300 transition-all cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
                <span>Exit to Title Screen</span>
              </button>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="flex flex-col gap-4">
              {/* SFX Volume */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between text-xs font-semibold text-neutral-300">
                  <span className="flex items-center gap-1.5">
                    <Volume2 className="h-3.5 w-3.5 text-neutral-400" />
                    <span>Sound Effects Volume</span>
                  </span>
                  <span className="font-mono">{Math.round(settings.sfxVolume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={settings.sfxVolume}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    const updated = { ...settings, sfxVolume: val };
                    onUpdateSettings(updated);
                    soundEngine.setVolumes(settings.masterVolume, val, settings.musicVolume);
                  }}
                  className="accent-amber-500 cursor-pointer"
                />
              </div>

              {/* Music Volume */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between text-xs font-semibold text-neutral-300">
                  <span>Atmospheric Ambience Volume</span>
                  <span className="font-mono">{Math.round(settings.musicVolume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={settings.musicVolume}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    const updated = { ...settings, musicVolume: val };
                    onUpdateSettings(updated);
                    soundEngine.setVolumes(settings.masterVolume, settings.sfxVolume, val);
                  }}
                  className="accent-amber-500 cursor-pointer"
                />
              </div>

              {/* Mouse Sensitivity */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between text-xs font-semibold text-neutral-300">
                  <span>Mouse Look Sensitivity</span>
                  <span className="font-mono">{settings.mouseSensitivity.toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min="0.4"
                  max="3.0"
                  step="0.1"
                  value={settings.mouseSensitivity}
                  onChange={(e) => {
                    onUpdateSettings({ ...settings, mouseSensitivity: parseFloat(e.target.value) });
                  }}
                  className="accent-amber-500 cursor-pointer"
                />
              </div>

              {/* Field of View */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between text-xs font-semibold text-neutral-300">
                  <span>Camera Field of View (FOV)</span>
                  <span className="font-mono">{settings.fieldOfView}°</span>
                </div>
                <input
                  type="range"
                  min="60"
                  max="95"
                  step="1"
                  value={settings.fieldOfView}
                  onChange={(e) => {
                    onUpdateSettings({ ...settings, fieldOfView: parseInt(e.target.value) });
                  }}
                  className="accent-amber-500 cursor-pointer"
                />
              </div>

              {/* Graphics Quality */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between text-xs font-semibold text-neutral-300">
                  <span className="flex items-center gap-1.5">
                    <Eye className="h-3.5 w-3.5 text-neutral-400" />
                    <span>Graphics & Chunk Stream Quality</span>
                  </span>
                  <span className="font-mono uppercase text-amber-400">{settings.graphicsQuality}</span>
                </div>
                <div className="grid grid-cols-4 gap-2 pt-1">
                  {(['low', 'medium', 'high', 'ultra'] as const).map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => onUpdateSettings({ ...settings, graphicsQuality: q })}
                      className={`py-1.5 rounded-lg text-xs font-bold uppercase transition-all cursor-pointer ${
                        settings.graphicsQuality === q
                          ? 'bg-amber-500 text-neutral-950 shadow-md'
                          : 'bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800'
                      }`}
                    >
                      {q}
                    </button>
                  ))}
                </div>
                <span className="text-[10px] text-neutral-500">
                  {settings.graphicsQuality === 'low'
                    ? '1 Chunk Radius (Max FPS for low-end mobile)'
                    : settings.graphicsQuality === 'medium'
                    ? '2 Chunks (Balanced performance)'
                    : settings.graphicsQuality === 'high'
                    ? '3 Chunks + Full POI & Foliage Shadows'
                    : '4 Chunks (Vast horizon streaming)'}
                </span>
              </div>

              {/* Touch Controls Mode Setting */}
              {onSetTouchControlsMode && (
                <div className="flex flex-col gap-1.5 pt-1 border-t border-neutral-800">
                  <div className="flex justify-between text-xs font-semibold text-neutral-300">
                    <span className="flex items-center gap-1.5">
                      <Smartphone className="h-3.5 w-3.5 text-cyan-400" />
                      <span>On-Screen Touch Controls</span>
                    </span>
                    <span className="font-mono uppercase text-cyan-400">{touchControlsMode}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 pt-1">
                    {(['auto', 'always', 'off'] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => onSetTouchControlsMode(mode)}
                        className={`py-1.5 rounded-lg text-xs font-bold uppercase transition-all cursor-pointer ${
                          touchControlsMode === mode
                            ? 'bg-cyan-600 text-white shadow-md'
                            : 'bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800'
                        }`}
                      >
                        {mode === 'auto' ? 'Auto Detect' : mode === 'always' ? 'Always On' : 'Disabled'}
                      </button>
                    ))}
                  </div>
                  <span className="text-[10px] text-neutral-500">
                    {touchControlsMode === 'auto'
                      ? 'Automatically shows on smartphones, tablets, and touch displays'
                      : touchControlsMode === 'always'
                      ? 'Forced on for all screens, laptops, and hybrid touchbooks'
                      : 'Hidden for pure keyboard & mouse desktop play'}
                  </span>
                </div>
              )}

              {/* Camera Shake Accessibility Toggle */}
              <div className="flex items-center justify-between pt-1 border-t border-neutral-800">
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-neutral-200">Camera Impact Shake</span>
                  <span className="text-[10px] text-neutral-400">Reduce motion for accessibility</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onUpdateSettings({
                      ...settings,
                      firstPersonCamera: !settings.firstPersonCamera,
                    });
                  }}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                    !settings.firstPersonCamera ? 'bg-amber-500' : 'bg-neutral-800'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      !settings.firstPersonCamera ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          )}

          {activeTab === 'controls' && (
            <div className="flex flex-col gap-3">
              {/* Category Tab Selector */}
              <div className="flex rounded-xl bg-neutral-900 p-1 border border-neutral-800">
                <button
                  type="button"
                  onClick={() => setControlsCategory('mobile')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    controlsCategory === 'mobile'
                      ? 'bg-amber-500 text-neutral-950 shadow-md'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  <Smartphone className="h-3.5 w-3.5" />
                  <span>Mobile & Touch Controls</span>
                </button>
                <button
                  type="button"
                  onClick={() => setControlsCategory('desktop')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    controlsCategory === 'desktop'
                      ? 'bg-amber-500 text-neutral-950 shadow-md'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  <Keyboard className="h-3.5 w-3.5" />
                  <span>Desktop Keyboard & Mouse</span>
                </button>
              </div>

              {controlsCategory === 'mobile' ? (
                <div className="flex flex-col gap-2 text-xs max-h-72 overflow-y-auto pr-1">
                  {[
                    { control: 'Left Thumbstick', action: '360° Analog Walk / Run. Drag outward to lock sprint.' },
                    { control: 'Right Screen Drag', action: 'Rotate camera view, aim crosshair, look around 360°.' },
                    { control: 'Two-Finger Pinch', action: 'Pinch screen in/out to adjust camera zoom distance.' },
                    { control: 'ACTION Button (⚔️/🔨)', action: 'Attack predators, chop trees, mine ores, fire crossbow, place blueprints.' },
                    { control: 'INTERACT Button (⚡/🤝)', action: 'Glowing button: Enter Buggy, open chest, loot crates, talk, sleep in bed.' },
                    { control: 'JUMP / SURFACE (⬆)', action: 'Leap over fences/obstacles on land, or surface to breathe when swimming.' },
                    { control: 'SNEAK / CROUCH (👟)', action: 'Silent stealth mode to bypass predators on land, or dive down underwater.' },
                    { control: 'Tap HUD Cards', action: 'Tap Vitals for Stats, tap Coords for Map, tap Quest banner for Journal!' },
                    { control: 'Tap Center Banner', action: 'Directly tap the floating interact prompt on screen to trigger action.' },
                    { control: 'QUICK DRAWER (⚡)', action: 'Opens Backpack, Crafting, Build Catalog, Map Radar, Flashlight & Camera.' },
                    { control: 'Vehicle Horn (📢)', action: 'Honk Buggy horn to alert or distract hostile wildlife in the wild.' },
                    { control: 'Vehicle Lights (💡)', action: 'Toggle ultra-bright twin buggy headlights for night traversal.' },
                    { control: 'Hotbar Slots (1-8)', action: 'Tap any weapon, tool, food, or water bottle along bottom to use.' },
                  ].map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-start justify-between gap-3 rounded-lg bg-neutral-900/60 p-2.5 border border-neutral-800/60"
                    >
                      <span className="font-bold text-amber-400 bg-neutral-800 px-2 py-0.5 rounded text-[11px] shrink-0">
                        {item.control}
                      </span>
                      <span className="text-neutral-300 font-medium text-right text-[11px]">{item.action}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col gap-2 text-xs max-h-72 overflow-y-auto pr-1">
                  {[
                    { key: 'W / A / S / D', action: 'Move Survivor / Steer Buggy' },
                    { key: 'Mouse Look / Touch', action: 'Rotate Camera View & Aim' },
                    { key: 'Left Click', action: 'Attack / Harvest / Fire Crossbow / Build' },
                    { key: 'Space', action: 'Jump / Buggy Handbrake / Swim Surface' },
                    { key: 'Shift (Hold)', action: 'Sprint / Buggy Turbo Boost' },
                    { key: 'C', action: 'Crouch & Sneak / Swim Dive' },
                    { key: 'E', action: 'Interact (Mount Buggy, Gates, Stashes, Terminal)' },
                    { key: 'O', action: 'Open Sanctuary Command Dashboard' },
                    { key: 'B', action: 'Open Sanctuary Building Catalog' },
                    { key: 'I', action: 'Open Backpack & Equipment' },
                    { key: 'M', action: 'Topographical Radar & Coordinates' },
                    { key: 'J', action: 'Mission Journal & Story Log' },
                    { key: 'V', action: 'Toggle First / Third-Person Camera' },
                    { key: 'F', action: 'Toggle Flashlight / Buggy Headlights' },
                    { key: 'Z', action: 'Toggle Biological Ecosystem Scanner' },
                    { key: 'R', action: 'Rotate Placement Ghost (in Build Mode)' },
                    { key: '1 - 8', action: 'Equip Hotbar Slot' },
                    { key: 'Esc', action: 'Pause Menu / Close Modals' },
                  ].map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between rounded-lg bg-neutral-900/60 px-3 py-2 border border-neutral-800/60"
                    >
                      <span className="font-mono font-bold text-amber-400 bg-neutral-800 px-2 py-0.5 rounded">
                        {item.key}
                      </span>
                      <span className="text-neutral-300 font-medium">{item.action}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
