import { KeybindAction, KeybindConfig } from '../types/game';

const STORAGE_KEY = 'lsr_keybinds_v1';

export const DEFAULT_KEYBINDS: KeybindConfig = {
  moveForward: 'KeyW',
  moveBackward: 'KeyS',
  moveLeft: 'KeyA',
  moveRight: 'KeyD',
  sprint: 'ShiftLeft',
  jump: 'Space',
  crouch: 'ControlLeft',
  interact: 'KeyE',
  flashlight: 'KeyF',
  reload: 'KeyR',
  quickSwap: 'Tab',
  throwable: 'KeyG',
  buildMode: 'KeyB',
  character: 'KeyC',
  inventory: 'KeyI',
  crafting: 'KeyK',
  map: 'KeyM',
  cameraToggle: 'KeyV',
  radio: 'BracketLeft',
  fish: 'KeyU',
};

export const KEYBIND_LABELS: Record<KeybindAction, string> = {
  moveForward: 'Move Forward',
  moveBackward: 'Move Backward',
  moveLeft: 'Strafe Left',
  moveRight: 'Strafe Right',
  sprint: 'Sprint',
  jump: 'Jump / Swim Up',
  crouch: 'Crouch / Stealth',
  interact: 'Interact / Loot / Board',
  flashlight: 'Toggle Flashlight',
  reload: 'Reload Weapon',
  quickSwap: 'Quick-Swap Weapon',
  throwable: 'Throw Flare / Molotov',
  buildMode: 'Build Blueprint Menu',
  character: 'Survivor Stats & Perks',
  inventory: 'Backpack Inventory',
  crafting: 'Field Crafting Menu',
  map: 'Tactical World Map',
  cameraToggle: 'Camera Perspective',
  radio: 'Emergency Ham Radio',
  fish: 'Cast Fishing Rod',
};

export function loadKeybinds(): KeybindConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_KEYBINDS };
    const parsed = JSON.parse(raw) as Partial<KeybindConfig>;
    return { ...DEFAULT_KEYBINDS, ...parsed };
  } catch {
    return { ...DEFAULT_KEYBINDS };
  }
}

export function saveKeybinds(config: KeybindConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    // ignore storage quota errors
  }
}

export function resetKeybinds(): KeybindConfig {
  const fresh = { ...DEFAULT_KEYBINDS };
  saveKeybinds(fresh);
  return fresh;
}

export function formatKeyCode(code: string): string {
  if (!code) return 'Unbound';
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  const map: Record<string, string> = {
    Space: 'Space',
    ShiftLeft: 'L-Shift',
    ShiftRight: 'R-Shift',
    ControlLeft: 'L-Ctrl',
    ControlRight: 'R-Ctrl',
    AltLeft: 'L-Alt',
    Tab: 'Tab',
    BracketLeft: '[',
    BracketRight: ']',
    Backquote: '`',
  };
  return map[code] || code;
}
