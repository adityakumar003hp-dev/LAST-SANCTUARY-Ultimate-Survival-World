import { useEffect, useRef, useState } from 'react';
import type { GameEngine } from '../engine/GameEngine';

interface UseGamepadOptions {
  engineRef: React.MutableRefObject<GameEngine | null>;
  enabled: boolean;
  mouseSensitivity: number;
  onPrimaryAction: () => void;
  onInteract: () => void;
  onToggleCamera: () => void;
  onToggleFlashlight: () => void;
  onCycleHotbar: (delta: -1 | 1) => void;
  onTogglePause: () => void;
}

export function useGamepad({
  engineRef,
  enabled,
  mouseSensitivity,
  onPrimaryAction,
  onInteract,
  onToggleCamera,
  onToggleFlashlight,
  onCycleHotbar,
  onTogglePause,
}: UseGamepadOptions) {
  const [connectedGamepad, setConnectedGamepad] = useState<string | null>(null);
  const actionsRef = useRef({
    onPrimaryAction,
    onInteract,
    onToggleCamera,
    onToggleFlashlight,
    onCycleHotbar,
    onTogglePause,
  });
  actionsRef.current = {
    onPrimaryAction,
    onInteract,
    onToggleCamera,
    onToggleFlashlight,
    onCycleHotbar,
    onTogglePause,
  };

  useEffect(() => {
    if (typeof window === 'undefined' || typeof navigator.getGamepads !== 'function') return;

    const refreshConnected = () => {
      try {
        const pads = navigator.getGamepads();
        const active = pads ? Array.from(pads).find((p) => p && p.connected) : null;
        setConnectedGamepad(active ? active.id : null);
      } catch {
        setConnectedGamepad(null);
      }
    };

    refreshConnected();
    window.addEventListener('gamepadconnected', refreshConnected);
    window.addEventListener('gamepaddisconnected', refreshConnected);
    return () => {
      window.removeEventListener('gamepadconnected', refreshConnected);
      window.removeEventListener('gamepaddisconnected', refreshConnected);
    };
  }, []);

  useEffect(() => {
    if (!enabled || typeof navigator.getGamepads !== 'function') return;

    let rafId = 0;
    let lastTime = performance.now();
    let wasAnalogActive = false;
    let wasJumpHeld = false;
    let wasSprintHeld = false;
    const prevButtons: Record<number, boolean> = {};

    const justPressed = (pad: Gamepad, idx: number): boolean => {
      const pressed = !!pad.buttons[idx]?.pressed;
      const wasPressed = !!prevButtons[idx];
      prevButtons[idx] = pressed;
      return pressed && !wasPressed;
    };

    const tick = (now: number) => {
      const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
      lastTime = now;

      const engine = engineRef.current;
      const pads = navigator.getGamepads();
      const pad = pads ? Array.from(pads).find((p) => p && p.connected) : null;

      if (engine && pad) {
        // Left stick movement
        const lx = pad.axes[0] ?? 0;
        const ly = pad.axes[1] ?? 0;
        const deadzone = 0.18;
        const mag = Math.hypot(lx, ly);

        if (mag > deadzone) {
          engine.inputState.analogX = lx;
          engine.inputState.analogZ = ly;
          engine.inputState.isAnalog = true;
          wasAnalogActive = true;
        } else if (wasAnalogActive) {
          engine.inputState.analogX = 0;
          engine.inputState.analogZ = 0;
          engine.inputState.isAnalog = false;
          wasAnalogActive = false;
        }

        // Right stick camera look
        const rx = pad.axes[2] ?? 0;
        const ry = pad.axes[3] ?? 0;
        if (Math.abs(rx) > 0.16) {
          engine.player.yaw -= rx * dt * 2.4 * (mouseSensitivity || 1.0);
        }
        if (Math.abs(ry) > 0.16) {
          engine.player.pitch = Math.max(
            -Math.PI / 2.3,
            Math.min(Math.PI / 2.3, engine.player.pitch - ry * dt * 1.9 * (mouseSensitivity || 1.0))
          );
        }

        // Held triggers/buttons: Jump (A / 0), Sprint (L2 / 6 or L3 / 10)
        const jumpDown = !!pad.buttons[0]?.pressed;
        if (jumpDown || wasJumpHeld) {
          engine.inputState.jump = jumpDown;
          wasJumpHeld = jumpDown;
        }

        const sprintDown = !!pad.buttons[6]?.pressed || (pad.buttons[6]?.value ?? 0) > 0.35;
        if (sprintDown || wasSprintHeld) {
          engine.inputState.sprint = sprintDown;
          wasSprintHeld = sprintDown;
        }

        // Discrete edge-triggered actions
        if (justPressed(pad, 1)) {
          engine.inputState.crouch = !engine.inputState.crouch;
        }
        if (justPressed(pad, 2)) {
          actionsRef.current.onInteract();
        }
        if (justPressed(pad, 3)) {
          actionsRef.current.onToggleCamera();
        }
        if (justPressed(pad, 4) || justPressed(pad, 14)) {
          actionsRef.current.onCycleHotbar(-1);
        }
        if (justPressed(pad, 5) || justPressed(pad, 15)) {
          actionsRef.current.onCycleHotbar(1);
        }
        if (justPressed(pad, 7)) {
          actionsRef.current.onPrimaryAction();
        }
        if (justPressed(pad, 12)) {
          actionsRef.current.onToggleFlashlight();
        }
        if (justPressed(pad, 9)) {
          actionsRef.current.onTogglePause();
        }
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafId);
      const engine = engineRef.current;
      if (engine && wasAnalogActive) {
        engine.inputState.analogX = 0;
        engine.inputState.analogZ = 0;
        engine.inputState.isAnalog = false;
      }
      if (engine && wasJumpHeld) engine.inputState.jump = false;
      if (engine && wasSprintHeld) engine.inputState.sprint = false;
    };
  }, [enabled, engineRef, mouseSensitivity]);

  return {
    isGamepadConnected: !!connectedGamepad,
    gamepadName: connectedGamepad,
  };
}
