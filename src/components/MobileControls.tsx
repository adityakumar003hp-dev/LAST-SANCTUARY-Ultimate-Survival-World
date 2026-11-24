import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  Hammer,
  Backpack,
  Compass,
  BookOpen,
  User,
  Flashlight,
  Eye,
  Menu,
  RotateCw,
  X,
  Check,
  Zap,
  Flame,
  ArrowUp,
  MessageSquare,
  Shield,
  Crosshair,
  Pickaxe,
  Axe,
  ChevronUp,
  ChevronDown,
  Volume2,
  Smartphone,
  Footprints,
} from 'lucide-react';

import { GraphicsQualityMode } from '../types/game';

export interface MobileControlsProps {
  onMoveChange: (move: {
    forward: boolean;
    backward: boolean;
    left: boolean;
    right: boolean;
    analogX?: number;
    analogZ?: number;
    isAnalog?: boolean;
  }) => void;
  onLookDelta: (dx: number, dy: number) => void;
  onZoomDelta?: (delta: number) => void;
  onResetCamera?: () => void;
  onJump: () => void;
  onSprintToggle: (sprint: boolean) => void;
  isSprinting?: boolean;
  onCrouchToggle?: (crouch: boolean) => void;
  isCrouching?: boolean;
  onPrimaryAction: () => void;
  onInteract: () => void;
  interactionPrompt?: string | null;
  // Shortcuts
  onOpenInventory?: () => void;
  onOpenCrafting?: () => void;
  onOpenBuild?: () => void;
  onOpenMap?: () => void;
  onOpenJournal?: () => void;
  onOpenCharacter?: () => void;
  onToggleFlashlight?: () => void;
  isFlashlightOn?: boolean;
  onToggleCameraView?: () => void;
  cameraView?: string;
  onOpenMenu?: () => void;
  // Building mode toolbar
  isBuildingMode?: boolean;
  onRotateBuilding?: () => void;
  onCancelBuilding?: () => void;
  activeItemToolType?: string | null;
  // Swimming & Vehicle modes
  isSwimming?: boolean;
  onDive?: () => void;
  isDriving?: boolean;
  onExitVehicle?: () => void;
  onToggleVehicleLights?: () => void;
  onHonkHorn?: () => void;
  onToggleBioScanner?: () => void;
  isBioScannerActive?: boolean;
  qualityMode?: GraphicsQualityMode | string;
  onCycleQualityMode?: () => void;
  // Universal Device Control Mode
  touchControlsMode?: 'auto' | 'always' | 'off';
  onToggleTouchControlsMode?: () => void;
}

export const MobileControls: React.FC<MobileControlsProps> = ({
  onMoveChange,
  onLookDelta,
  onZoomDelta,
  onResetCamera,
  onJump,
  onSprintToggle,
  isSprinting = false,
  onCrouchToggle,
  isCrouching = false,
  onPrimaryAction,
  onInteract,
  interactionPrompt,
  onOpenInventory,
  onOpenCrafting,
  onOpenBuild,
  onOpenMap,
  onOpenJournal,
  onOpenCharacter,
  onToggleFlashlight,
  isFlashlightOn = false,
  onToggleCameraView,
  cameraView = 'third',
  onOpenMenu,
  isBuildingMode = false,
  onRotateBuilding,
  onCancelBuilding,
  activeItemToolType = null,
  isSwimming = false,
  onDive,
  isDriving = false,
  onExitVehicle,
  onToggleVehicleLights,
  onHonkHorn,
  onToggleBioScanner,
  isBioScannerActive = false,
  qualityMode = 'balanced',
  onCycleQualityMode,
  touchControlsMode = 'auto',
  onToggleTouchControlsMode,
}) => {
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [autoSprintLocked, setAutoSprintLocked] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);

  // Joystick state
  const joystickBaseRef = useRef<HTMLDivElement>(null);
  const joystickRadiusRef = useRef<number>(40);
  const [stickPos, setStickPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDraggingStick, setIsDraggingStick] = useState(false);
  const joystickTouchId = useRef<number | null>(null);

  // Camera touch tracking (1-finger orbit, 2-finger pinch zoom, double tap)
  const lookTouchId = useRef<number | null>(null);
  const pinchTouchId2 = useRef<number | null>(null);
  const lastLookPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const lastPinchDist = useRef<number | null>(null);
  const lastTapTime = useRef<number>(0);

  // Touch device detection
  useEffect(() => {
    const detect = () => {
      const touchable =
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        window.matchMedia('(pointer: coarse)').matches;
      setIsTouchDevice(touchable);
    };
    detect();
    window.addEventListener('resize', detect);
    window.addEventListener('orientationchange', detect);
    return () => {
      window.removeEventListener('resize', detect);
      window.removeEventListener('orientationchange', detect);
    };
  }, []);

  // Joystick touch handlers
  const handleJoystickTouchStart = (e: React.TouchEvent) => {
    e.stopPropagation();
    const touch = e.changedTouches[0];
    joystickTouchId.current = touch.identifier;
    setIsDraggingStick(true);
    updateJoystick(touch.clientX, touch.clientY);
  };

  const handleJoystickTouchMove = (e: React.TouchEvent) => {
    e.stopPropagation();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === joystickTouchId.current) {
        updateJoystick(touch.clientX, touch.clientY);
        break;
      }
    }
  };

  const handleJoystickTouchEnd = (e: React.TouchEvent) => {
    e.stopPropagation();
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === joystickTouchId.current) {
        joystickTouchId.current = null;
        setIsDraggingStick(false);
        const sprintLockThreshold = -(joystickRadiusRef.current * 0.8);

        // Check if released in auto-sprint lock zone (top edge of joystick)
        if (stickPos.y <= sprintLockThreshold) {
          setAutoSprintLocked(true);
          onSprintToggle(true);
          onMoveChange({
            forward: true,
            backward: false,
            left: false,
            right: false,
            analogX: 0,
            analogZ: 1.0,
            isAnalog: true,
          });
          setStickPos({ x: 0, y: -Math.round(joystickRadiusRef.current * 0.85) });
        } else {
          setAutoSprintLocked(false);
          setStickPos({ x: 0, y: 0 });
          onMoveChange({
            forward: false,
            backward: false,
            left: false,
            right: false,
            analogX: 0,
            analogZ: 0,
            isAnalog: false,
          });
        }
        break;
      }
    }
  };

  const updateJoystick = (clientX: number, clientY: number) => {
    if (!joystickBaseRef.current) return;
    const rect = joystickBaseRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    let dx = clientX - centerX;
    let dy = clientY - centerY;
    const maxRadius = Math.max(28, rect.width * 0.4);
    joystickRadiusRef.current = maxRadius;
    const dist = Math.hypot(dx, dy);

    if (dist > maxRadius) {
      dx = (dx / dist) * maxRadius;
      dy = (dy / dist) * maxRadius;
    }

    setStickPos({ x: dx, y: dy });

    // Normalized analog values: -1 to 1
    // In our player space: -dy is forward, +dy is backward, +dx is right, -dx is left
    const analogX = dx / maxRadius;
    const analogZ = -dy / maxRadius; // Up is forward (positive Z)

    const threshold = 0.15;
    onMoveChange({
      forward: analogZ > threshold,
      backward: analogZ < -threshold,
      left: analogX < -threshold,
      right: analogX > threshold,
      analogX,
      analogZ,
      isAnalog: true,
    });
  };

  // Cancel auto-sprint lock on tap
  const cancelAutoSprint = () => {
    setAutoSprintLocked(false);
    setStickPos({ x: 0, y: 0 });
    onMoveChange({
      forward: false,
      backward: false,
      left: false,
      right: false,
      analogX: 0,
      analogZ: 0,
      isAnalog: false,
    });
  };

  // Camera touchpad handlers (Right half of screen)
  const handleLookTouchStart = (e: React.TouchEvent) => {
    const lookStartRatio = window.innerHeight > window.innerWidth ? 0.25 : 0.35;
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === joystickTouchId.current) continue;

      if (lookTouchId.current === null && touch.clientX > window.innerWidth * lookStartRatio) {
        lookTouchId.current = touch.identifier;
        lastLookPos.current = { x: touch.clientX, y: touch.clientY };

        // Double-tap to re-center camera
        const now = Date.now();
        if (now - lastTapTime.current < 280) {
          onResetCamera?.();
        }
        lastTapTime.current = now;
      } else if (lookTouchId.current !== null && pinchTouchId2.current === null) {
        // Second finger down for pinch-zoom
        pinchTouchId2.current = touch.identifier;
        const dist = Math.hypot(
          touch.clientX - lastLookPos.current.x,
          touch.clientY - lastLookPos.current.y
        );
        lastPinchDist.current = dist;
      }
    }
  };

  const handleLookTouchMove = (e: React.TouchEvent) => {
    // 2-finger pinch zoom
    if (lookTouchId.current !== null && pinchTouchId2.current !== null) {
      let t1: React.Touch | null = null;
      let t2: React.Touch | null = null;
      for (let i = 0; i < e.touches.length; i++) {
        if (e.touches[i].identifier === lookTouchId.current) t1 = e.touches[i];
        if (e.touches[i].identifier === pinchTouchId2.current) t2 = e.touches[i];
      }
      if (t1 && t2 && lastPinchDist.current !== null) {
        const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
        const delta = (lastPinchDist.current - dist) * 0.015;
        onZoomDelta?.(delta);
        lastPinchDist.current = dist;
        return;
      }
    }

    // 1-finger orbit
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === lookTouchId.current) {
        const dx = touch.clientX - lastLookPos.current.x;
        const dy = touch.clientY - lastLookPos.current.y;
        lastLookPos.current = { x: touch.clientX, y: touch.clientY };
        onLookDelta(dx, dy);
        break;
      }
    }
  };

  const handleLookTouchEnd = (e: React.TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const id = e.changedTouches[i].identifier;
      if (id === lookTouchId.current) {
        lookTouchId.current = null;
        lastPinchDist.current = null;
      }
      if (id === pinchTouchId2.current) {
        pinchTouchId2.current = null;
        lastPinchDist.current = null;
      }
    }
  };

  // Derive contextual interact button label
  const getInteractLabel = useCallback((): { title: string; subtitle: string; icon: React.ReactNode } => {
    if (!interactionPrompt) {
      return { title: 'USE', subtitle: 'TAP', icon: <Zap className="w-5 h-5 text-amber-400" /> };
    }
    const p = interactionPrompt.toLowerCase();
    if (p.includes('push') || p.includes('kick')) {
      return { title: 'KICK', subtitle: 'TAP', icon: <Zap className="w-5 h-5 text-amber-300" /> };
    }
    if (p.includes('buggy') || p.includes('drive')) {
      return { title: 'DRIVE', subtitle: 'Buggy', icon: <Compass className="w-5 h-5 text-amber-300" /> };
    }
    if (p.includes('tame')) {
      return { title: 'TAME', subtitle: 'Creature', icon: <Shield className="w-5 h-5 text-emerald-400" /> };
    }
    if (p.includes('companion')) {
      return { title: 'ORDER', subtitle: 'Companion', icon: <Shield className="w-5 h-5 text-amber-400" /> };
    }
    if (p.includes('talk') || p.includes('survivor')) {
      return { title: 'TALK', subtitle: 'Survivor', icon: <MessageSquare className="w-5 h-5 text-emerald-400" /> };
    }
    if (p.includes('gate') || p.includes('door')) {
      const action = p.includes('close') ? 'CLOSE' : 'OPEN';
      return { title: action, subtitle: 'Gate', icon: <Shield className="w-5 h-5 text-amber-400" /> };
    }
    if (p.includes('bed') || p.includes('sleep')) {
      return { title: 'SLEEP', subtitle: 'Until Dawn', icon: <Flame className="w-5 h-5 text-blue-400" /> };
    }
    if (p.includes('notice') || p.includes('board')) {
      return { title: 'BOARD', subtitle: 'Directives', icon: <BookOpen className="w-5 h-5 text-amber-300" /> };
    }
    if (p.includes('farm') || p.includes('plant') || p.includes('harvest')) {
      return { title: 'FARM', subtitle: 'Plot', icon: <Flame className="w-5 h-5 text-emerald-400" /> };
    }
    if (p.includes('water')) {
      return { title: 'DRAW', subtitle: 'Water', icon: <Zap className="w-5 h-5 text-cyan-400" /> };
    }
    if (p.includes('storage') || p.includes('chest')) {
      return { title: 'OPEN', subtitle: 'Stash', icon: <Backpack className="w-5 h-5 text-amber-400" /> };
    }
    if (p.includes('workbench')) {
      return { title: 'CRAFT', subtitle: 'Workbench', icon: <Hammer className="w-5 h-5 text-emerald-400" /> };
    }
    if (p.includes('campfire')) {
      return { title: 'COOK', subtitle: 'Campfire', icon: <Flame className="w-5 h-5 text-orange-400" /> };
    }
    if (p.includes('crate') || p.includes('scavenge')) {
      return { title: 'LOOT', subtitle: 'Supply Crate', icon: <Backpack className="w-5 h-5 text-amber-400" /> };
    }
    return { title: 'USE', subtitle: 'TAP', icon: <Zap className="w-5 h-5 text-amber-400" /> };
  }, [interactionPrompt]);

  // Primary Action Button styling & icon
  const getActionConfig = () => {
    if (isBuildingMode) {
      return { label: 'PLACE', icon: <Check className="w-6 h-6 text-emerald-300" />, color: 'from-emerald-600 to-teal-700' };
    }
    if (activeItemToolType === 'axe') {
      return { label: 'CHOP', icon: <Axe className="w-6 h-6 text-amber-300" />, color: 'from-amber-600 to-orange-700' };
    }
    if (activeItemToolType === 'pickaxe') {
      return { label: 'MINE', icon: <Pickaxe className="w-6 h-6 text-sky-300" />, color: 'from-sky-600 to-blue-700' };
    }
    if (activeItemToolType === 'hammer') {
      return { label: 'REPAIR', icon: <Hammer className="w-6 h-6 text-yellow-300" />, color: 'from-yellow-600 to-amber-700' };
    }
    return { label: 'ACTION', icon: <Crosshair className="w-6 h-6 text-white" />, color: 'from-red-600 to-rose-800' };
  };

  const actionConfig = getActionConfig();
  const interactConfig = getInteractLabel();
  const hasInteractPrompt = !!interactionPrompt && interactionPrompt.length > 0;

  // Universal device render check: ALWAYS show on mobile/tablet or when forced/auto
  const isMobileUA =
    typeof navigator !== 'undefined' &&
    (/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || navigator.maxTouchPoints > 0);

  const shouldShow =
    touchControlsMode === 'always' ||
    (touchControlsMode !== 'off' &&
      (isTouchDevice || isMobileUA || (typeof window !== 'undefined' && window.innerWidth <= 1024)));

  if (!shouldShow) {
    return null;
  }

  const qualityBadgeLabel =
    qualityMode === 'ultra_5x'
      ? 'ULTRA 5X'
      : qualityMode === 'quality'
      ? 'ULTRA 4K'
      : qualityMode === 'balanced'
      ? '4K BAL'
      : 'PERF';

  return (
    <div className="fixed inset-0 pointer-events-none layer-mobile-controls select-none overflow-hidden touch-none">
      {/* 0. Full-screen Camera Look Touchpad (Captures dragging across screen without being blocked by pointer-events-none) */}
      <div
        className="absolute inset-0 pointer-events-auto z-10 touch-none"
        onTouchStart={handleLookTouchStart}
        onTouchMove={handleLookTouchMove}
        onTouchEnd={handleLookTouchEnd}
        onTouchCancel={handleLookTouchEnd}
      />

      {/* 1. TOP MOBILE CONTROLS & QUICK ACTIONS DRAWER */}
      {/* 1A. Quick Actions Pill (Positioned safely below Survivor Vitals on top-left across portrait & landscape) */}
      <div className="absolute top-[calc(max(0.5rem,var(--sat))+7.6rem)] sm:top-[calc(max(0.5rem,var(--sat))+9.0rem)] [@media(max-height:500px)]:top-[calc(max(0.35rem,var(--sat))+6.2rem)] left-[max(0.5rem,var(--sal))] pointer-events-auto z-40">
        <button
          onClick={() => setShowDrawer((prev) => !prev)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border shadow-xl transition-all active:scale-95 text-xs font-bold ${
            showDrawer
              ? 'bg-amber-500 text-neutral-950 border-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.5)]'
              : 'bg-neutral-950/85 text-neutral-200 border-white/20 hover:border-amber-400/60'
          }`}
          title="Open Action Shortcuts"
        >
          <Menu className="w-3.5 h-3.5" />
          <span className="tracking-wide">ACTIONS</span>
        </button>
      </div>

      {/* 1B. Quick Camera & Menu Utility (Positioned safely below Clock/Day counter on top-right) */}
      <div className="absolute top-[calc(max(0.5rem,var(--sat))+4.3rem)] sm:top-[calc(max(0.5rem,var(--sat))+4.8rem)] [@media(max-height:500px)]:top-[calc(max(0.35rem,var(--sat))+3.8rem)] right-[max(0.5rem,var(--sar))] flex items-center gap-1.5 pointer-events-auto z-40">
        <button
          onClick={() => onToggleCameraView?.()}
          className="flex items-center justify-center w-8 h-8 rounded-full bg-neutral-950/80 border border-white/20 text-neutral-200 active:scale-90 active:bg-neutral-800 transition-all shadow-lg"
          title={`Cycle Camera (${cameraView})`}
          aria-label="Cycle Camera View"
        >
          <Eye className="w-4 h-4" />
        </button>
        <button
          onClick={() => onOpenMenu?.()}
          className="flex items-center justify-center w-8 h-8 rounded-full bg-neutral-950/80 border border-white/20 text-neutral-200 active:scale-90 active:bg-neutral-800 transition-all shadow-lg"
          title="Open Menu [Esc]"
          aria-label="System Menu"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* 1C. Collapsible Quick Actions Drawer Modal */}
      {showDrawer && (
        <div
          className="fixed inset-0 bg-neutral-950/85 pointer-events-auto z-50 flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setShowDrawer(false)}
        >
          <div
            className="w-full max-w-sm max-h-[88dvh] overflow-y-auto rounded-3xl bg-neutral-950/95 border border-white/15 p-5 shadow-2xl flex flex-col gap-4 animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <span className="text-xs font-black uppercase tracking-widest text-amber-400">SURVIVOR QUICK DRAWER</span>
              <button
                onClick={() => setShowDrawer(false)}
                className="w-7 h-7 rounded-full bg-neutral-900 flex items-center justify-center text-neutral-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 3x3 Action Grid with WCAG 44px+ tap targets */}
            <div className="grid grid-cols-3 gap-2.5">
              <button
                onClick={() => { onOpenInventory?.(); setShowDrawer(false); }}
                className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white/5 active:bg-amber-600/30 active:scale-95 border border-white/10 text-neutral-200"
              >
                <Backpack className="w-5 h-5 text-amber-400 mb-1" />
                <span className="text-[10px] font-bold">BAG [I]</span>
              </button>

              <button
                onClick={() => { onOpenBuild?.(); setShowDrawer(false); }}
                className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white/5 active:bg-emerald-600/30 active:scale-95 border border-white/10 text-neutral-200"
              >
                <Hammer className="w-5 h-5 text-emerald-400 mb-1" />
                <span className="text-[10px] font-bold">BUILD [B]</span>
              </button>

              <button
                onClick={() => { onOpenMap?.(); setShowDrawer(false); }}
                className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white/5 active:bg-sky-600/30 active:scale-95 border border-white/10 text-neutral-200"
              >
                <Compass className="w-5 h-5 text-sky-400 mb-1" />
                <span className="text-[10px] font-bold">MAP [M]</span>
              </button>

              <button
                onClick={() => { onOpenJournal?.(); setShowDrawer(false); }}
                className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white/5 active:bg-purple-600/30 active:scale-95 border border-white/10 text-neutral-200"
              >
                <BookOpen className="w-5 h-5 text-purple-400 mb-1" />
                <span className="text-[10px] font-bold">LOG [J]</span>
              </button>

              <button
                onClick={() => { onOpenCharacter?.(); setShowDrawer(false); }}
                className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white/5 active:bg-rose-600/30 active:scale-95 border border-white/10 text-neutral-200"
              >
                <User className="w-5 h-5 text-rose-400 mb-1" />
                <span className="text-[10px] font-bold">HERO [C]</span>
              </button>

              <button
                onClick={() => { onToggleBioScanner?.(); setShowDrawer(false); }}
                className={`flex flex-col items-center justify-center p-3 rounded-2xl active:scale-95 border ${
                  isBioScannerActive
                    ? 'bg-emerald-950/60 border-emerald-400 text-emerald-300'
                    : 'bg-white/5 border-white/10 text-neutral-200'
                }`}
              >
                <Compass className="w-5 h-5 text-emerald-400 mb-1" />
                <span className="text-[10px] font-bold">SCAN [Z]</span>
              </button>

              <button
                onClick={() => { onToggleFlashlight?.(); setShowDrawer(false); }}
                className={`flex flex-col items-center justify-center p-3 rounded-2xl active:scale-95 border ${
                  isFlashlightOn
                    ? 'bg-amber-950/60 border-amber-400 text-amber-300'
                    : 'bg-white/5 border-white/10 text-neutral-200'
                }`}
              >
                <Flashlight className="w-5 h-5 text-amber-400 mb-1" />
                <span className="text-[10px] font-bold">LIGHT [F]</span>
              </button>

              <button
                onClick={() => { onToggleCameraView?.(); }}
                className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white/5 active:bg-cyan-600/30 active:scale-95 border border-white/10 text-neutral-200"
              >
                <Eye className="w-5 h-5 text-cyan-400 mb-1" />
                <span className="text-[10px] font-bold uppercase">{cameraView} VIEW</span>
              </button>

              {onCycleQualityMode && (
                <button
                  onClick={() => {
                    onCycleQualityMode();
                    setShowDrawer(false);
                  }}
                  className="flex flex-col items-center justify-center p-3 rounded-2xl bg-emerald-950/40 active:bg-emerald-600/40 active:scale-95 border border-emerald-500/30 text-emerald-300 font-mono"
                >
                  <Zap className="w-5 h-5 text-emerald-400 mb-1" />
                  <span className="text-[10px] font-bold uppercase">GFX: {qualityBadgeLabel}</span>
                </button>
              )}

              <button
                onClick={() => { onOpenMenu?.(); setShowDrawer(false); }}
                className="flex flex-col items-center justify-center p-3 rounded-2xl bg-red-950/40 active:bg-red-600/40 active:scale-95 border border-red-500/30 text-red-300"
              >
                <Menu className="w-5 h-5 text-red-400 mb-1" />
                <span className="text-[10px] font-bold">PAUSE [ESC]</span>
              </button>
            </div>

            {/* Quick Control Mode & Help Footer */}
            {onToggleTouchControlsMode && (
              <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs">
                <span className="text-neutral-300 font-medium flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-amber-400" />
                  <span>Touch Controls:</span>
                </span>
                <button
                  onClick={() => onToggleTouchControlsMode()}
                  className="px-2.5 py-1 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-300 font-mono text-[10px] font-bold active:scale-95 transition-all uppercase"
                >
                  {touchControlsMode === 'always' ? 'Always Active' : 'Auto Detect'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. BUILDING MODE FLOATING TOOLBAR (Visible when actively building) */}
      {isBuildingMode && (
        <div className="absolute top-18 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-neutral-950/90 px-4 py-2 rounded-2xl border border-emerald-500/50 shadow-2xl pointer-events-auto z-40 animate-in fade-in slide-in-from-top-3">
          <button
            onClick={() => onRotateBuilding?.()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-950/60 border border-emerald-600/50 text-emerald-300 text-xs font-bold active:scale-95 active:bg-emerald-900 transition-all shadow-md"
          >
            <RotateCw className="w-4 h-4" />
            <span>ROTATE [R]</span>
          </button>

          <button
            onClick={() => onPrimaryAction()}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 text-neutral-950 text-xs font-black active:scale-95 active:bg-emerald-500 transition-all shadow-lg"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>PLACE</span>
          </button>

          <button
            onClick={() => onCancelBuilding?.()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-950/60 border border-red-600/50 text-red-300 text-xs font-bold active:scale-95 active:bg-red-900 transition-all shadow-md"
          >
            <X className="w-4 h-4" />
            <span>CANCEL</span>
          </button>
        </div>
      )}

      {/* 3. AUTO-SPRINT ACTIVE PILL */}
      {autoSprintLocked && (
        <button
          onClick={cancelAutoSprint}
          className="absolute bottom-[calc(max(1rem,var(--sab))+7.8rem)] left-[max(0.75rem,var(--sal))] pointer-events-auto flex items-center gap-2 px-3 py-1.5 bg-emerald-500/25 border border-emerald-400/50 rounded-full text-emerald-300 text-[11px] font-black shadow-lg animate-pulse"
        >
          <Zap className="w-3.5 h-3.5 fill-current" />
          <span>AUTO-RUN (TAP TO STOP)</span>
        </button>
      )}

      {/* 4. BOTTOM-LEFT: 360° ANALOG JOYSTICK */}
      <div className="absolute bottom-[max(0.75rem,var(--sab))] left-[max(0.75rem,var(--sal))] pointer-events-auto z-30 flex flex-col items-center">
        {/* Sprint Lock Ring Indicator */}
        <div className="text-[8px] sm:text-[9px] font-bold text-neutral-400 tracking-wider mb-1 uppercase flex items-center gap-1 opacity-75 [@media(max-height:440px)]:hidden">
          <ChevronUp className="w-3 h-3 text-emerald-400" />
          <span>DRAG UP TO LOCK SPRINT</span>
        </div>

        <div
          ref={joystickBaseRef}
          onTouchStart={handleJoystickTouchStart}
          onTouchMove={handleJoystickTouchMove}
          onTouchEnd={handleJoystickTouchEnd}
          onTouchCancel={handleJoystickTouchEnd}
          onPointerDown={(e) => {
            if (e.pointerType === 'mouse' && e.button !== 0) return;
            e.stopPropagation();
            try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch {}
            setIsDraggingStick(true);
            updateJoystick(e.clientX, e.clientY);
          }}
          onPointerMove={(e) => {
            if (!isDraggingStick) return;
            e.stopPropagation();
            updateJoystick(e.clientX, e.clientY);
          }}
          onPointerUp={(e) => {
            if (!isDraggingStick) return;
            e.stopPropagation();
            try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
            setIsDraggingStick(false);
            const sprintLockThreshold = -(joystickRadiusRef.current * 0.8);
            if (stickPos.y <= sprintLockThreshold) {
              setAutoSprintLocked(true);
              onSprintToggle(true);
              onMoveChange({ forward: true, backward: false, left: false, right: false, analogX: 0, analogZ: 1.0, isAnalog: true });
              setStickPos({ x: 0, y: -Math.round(joystickRadiusRef.current * 0.85) });
            } else {
              setAutoSprintLocked(false);
              setStickPos({ x: 0, y: 0 });
              onMoveChange({ forward: false, backward: false, left: false, right: false, analogX: 0, analogZ: 0, isAnalog: false });
            }
          }}
          className="relative w-24 h-24 sm:w-28 sm:h-28 [@media(max-height:500px)]:w-22 [@media(max-height:500px)]:h-22 rounded-full bg-neutral-950/85 border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.6)] flex items-center justify-center touch-none cursor-grab active:cursor-grabbing"
        >
          {/* Outer Ring Accent */}
          <div className="absolute inset-1.5 rounded-full border border-dashed border-white/10" />

          {/* Top Sprint-Lock Zone Marker */}
          <div
            className={`absolute top-1 w-6 h-2 rounded-full transition-colors ${
              stickPos.y <= -(joystickRadiusRef.current * 0.72) ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-white/20'
            }`}
          />

          {/* Thumb Stick Knob */}
          <div
            style={{
              transform: `translate(${stickPos.x}px, ${stickPos.y}px)`,
              transition: isDraggingStick ? 'none' : 'transform 0.15s cubic-bezier(0.2, 0.9, 0.3, 1)',
            }}
            className={`w-10 h-10 sm:w-12 sm:h-12 [@media(max-height:500px)]:w-9 [@media(max-height:500px)]:h-9 rounded-full shadow-2xl flex items-center justify-center border transition-colors ${
              isDraggingStick
                ? 'bg-neutral-200 border-white text-neutral-950 shadow-[0_0_20px_rgba(255,255,255,0.4)]'
                : 'bg-neutral-800/90 border-white/30 text-white'
            }`}
          >
            <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-white/40" />
          </div>
        </div>
      </div>

      {/* 5. BOTTOM-RIGHT: ACTION & INTERACTION CONTROLS */}
      <div className="absolute bottom-[max(0.75rem,var(--sab))] right-[max(0.75rem,var(--sar))] pointer-events-auto z-30 flex items-end gap-1.5 sm:gap-3">
        {/* Secondary Column: Sprint, Jump, Crouch OR Vehicle Horn/Lights OR Swimming Surface/Dive */}
        <div className="flex flex-col gap-1.5 sm:gap-2">
          {isDriving ? (
            <>
              {/* Buggy Horn */}
              <button
                onClick={() => onHonkHorn?.()}
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-amber-500/25 border border-amber-400 text-amber-300 flex flex-col items-center justify-center shadow-lg active:scale-90 transition-all font-bold"
                title="Honk Horn"
                aria-label="Honk Horn"
              >
                <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="text-[6px] sm:text-[7px] mt-0.5">HORN</span>
              </button>

              {/* Vehicle Headlights */}
              <button
                onClick={() => onToggleVehicleLights?.()}
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-neutral-950/80 border border-amber-400/60 text-amber-300 flex flex-col items-center justify-center shadow-lg active:scale-90 transition-all font-bold"
                title="Headlights"
                aria-label="Toggle Headlights"
              >
                <Flashlight className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current" />
                <span className="text-[6px] sm:text-[7px] mt-0.5">LIGHTS</span>
              </button>

              {/* Vehicle Exit */}
              <button
                onClick={() => onExitVehicle?.()}
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-rose-600 border border-rose-400 text-white flex flex-col items-center justify-center shadow-lg active:scale-90 transition-all font-black"
                title="Exit Buggy"
                aria-label="Exit Vehicle"
              >
                <X className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
                <span className="text-[6px] sm:text-[7px] mt-0.5">EXIT</span>
              </button>
            </>
          ) : isSwimming ? (
            <>
              {/* Swim Surface */}
              <button
                onClick={() => onJump()}
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-cyan-600/80 border border-cyan-400 text-white flex flex-col items-center justify-center shadow-lg active:scale-90 transition-all font-bold"
                title="Swim Up / Surface"
                aria-label="Surface"
              >
                <ArrowUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
                <span className="text-[6px] sm:text-[7px] mt-0.5">SURFACE</span>
              </button>

              {/* Dive Down */}
              <button
                onClick={() => onDive?.()}
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-blue-900/80 border border-blue-400 text-cyan-200 flex flex-col items-center justify-center shadow-lg active:scale-90 transition-all font-bold"
                title="Dive Down"
                aria-label="Dive Underwater"
              >
                <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
                <span className="text-[6px] sm:text-[7px] mt-0.5">DIVE</span>
              </button>
            </>
          ) : (
            <>
              {/* Sprint Toggle */}
              <button
                onClick={() => onSprintToggle(!isSprinting)}
                className={`w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex flex-col items-center justify-center shadow-lg active:scale-90 transition-all border ${
                  isSprinting
                    ? 'bg-gradient-to-br from-amber-500 to-orange-600 border-amber-300 text-neutral-950 font-black shadow-[0_0_14px_rgba(245,158,11,0.5)]'
                    : 'bg-neutral-950/80 border-white/15 text-neutral-300 font-bold'
                }`}
                title="Sprint / Run"
                aria-label="Toggle Sprint"
              >
                <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current" />
                <span className="text-[6px] sm:text-[7px] mt-0.5">SPRINT</span>
              </button>

              {/* Jump Button */}
              <button
                onClick={() => onJump()}
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-neutral-950/80 border border-white/20 text-white flex flex-col items-center justify-center shadow-lg active:scale-90 active:bg-white/20 transition-all"
                title="Jump"
                aria-label="Jump"
              >
                <ArrowUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
                <span className="text-[6px] sm:text-[7px] font-bold mt-0.5">JUMP</span>
              </button>

              {/* Crouch / Sneak Toggle */}
              <button
                onClick={() => onCrouchToggle?.(!isCrouching)}
                className={`w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex flex-col items-center justify-center shadow-lg active:scale-90 transition-all border ${
                  isCrouching
                    ? 'bg-amber-600/30 border-amber-400 text-amber-300 font-black'
                    : 'bg-neutral-950/80 border-white/15 text-neutral-400 font-bold'
                }`}
                title="Sneak / Crouch"
                aria-label="Toggle Sneak Crouch"
              >
                <Footprints className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="text-[6px] sm:text-[7px] mt-0.5">SNEAK</span>
              </button>
            </>
          )}
        </div>

        {/* Primary Action Button (Attack / Chop / Mine / Place) */}
        <button
          onClick={() => onPrimaryAction()}
          className={`w-14 h-14 sm:w-18 sm:h-18 [@media(max-height:500px)]:w-14 [@media(max-height:500px)]:h-14 rounded-3xl bg-gradient-to-br ${actionConfig.color} border-2 border-white/30 text-white flex flex-col items-center justify-center shadow-[0_10px_28px_rgba(0,0,0,0.8)] active:scale-90 transition-all cursor-pointer`}
          title="Primary Action"
          aria-label="Primary Action"
        >
          {actionConfig.icon}
          <span className="text-[7px] sm:text-[9px] font-black tracking-wider uppercase mt-0.5 sm:mt-1 drop-shadow-md">
            {actionConfig.label}
          </span>
        </button>

        {/* Contextual Interact Button (Always visible on mobile; pulses when in range) */}
        <button
          onClick={() => onInteract()}
          className={`w-13 h-13 sm:w-16 sm:h-16 [@media(max-height:500px)]:w-12 [@media(max-height:500px)]:h-12 rounded-2xl flex flex-col items-center justify-center shadow-xl transition-all cursor-pointer ${
            hasInteractPrompt
              ? 'bg-gradient-to-br from-amber-500 to-yellow-600 border-2 border-amber-300 text-white shadow-[0_0_20px_rgba(245,158,11,0.6)] active:scale-90 animate-bounce'
              : 'bg-neutral-950/85 border border-white/20 text-neutral-200 active:scale-95'
          }`}
          title="Interact / Use [Tap]"
          aria-label="Interact"
        >
          {interactConfig.icon}
          <span className="text-[7px] sm:text-[9px] font-black uppercase tracking-tight mt-0.5">
            {interactConfig.title}
          </span>
          <span className="text-[6px] sm:text-[7px] font-mono text-amber-300/80 -mt-0.5">
            {interactConfig.subtitle}
          </span>
        </button>
      </div>

      {/* 6. CAMERA TOUCHPAD HINT (subtle watermark) */}
      <div className="hidden sm:block [@media(max-height:460px)]:hidden absolute bottom-28 right-24 pointer-events-none text-neutral-500/40 text-[9px] font-mono tracking-widest uppercase">
        Drag to Look · Pinch to Zoom
      </div>
    </div>
  );
};
