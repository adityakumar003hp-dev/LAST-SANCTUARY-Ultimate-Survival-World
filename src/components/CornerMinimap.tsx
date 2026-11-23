import React, { useEffect, useRef } from 'react';
import { Radar, X } from 'lucide-react';
import type { GameEngine } from '../engine/GameEngine';

interface CornerMinimapProps {
  engineRef: React.MutableRefObject<GameEngine | null>;
  isVisible: boolean;
  onClose: () => void;
  onOpenFullMap: () => void;
}

export const CornerMinimap: React.FC<CornerMinimapProps> = ({
  engineRef,
  isVisible,
  onClose,
  onOpenFullMap,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!isVisible) return;

    const draw = () => {
      const canvas = canvasRef.current;
      const engine = engineRef.current;
      if (!canvas || !engine || !engine.player) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const size = canvas.width;
      const center = size / 2;
      const rangeMeters = 90;
      const scale = center / rangeMeters;

      const px = engine.player.position.x;
      const pz = engine.player.position.z;
      const yaw = engine.player.yaw;

      ctx.clearRect(0, 0, size, size);

      // Dark radar disc
      ctx.fillStyle = 'rgba(8, 12, 18, 0.92)';
      ctx.beginPath();
      ctx.arc(center, center, center - 2, 0, Math.PI * 2);
      ctx.fill();

      // Concentric range rings
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.16)';
      ctx.lineWidth = 1;
      [0.33, 0.66, 0.96].forEach((r) => {
        ctx.beginPath();
        ctx.arc(center, center, center * r, 0, Math.PI * 2);
        ctx.stroke();
      });

      // Crosshairs
      ctx.beginPath();
      ctx.moveTo(center, 4);
      ctx.lineTo(center, size - 4);
      ctx.moveTo(4, center);
      ctx.lineTo(size - 4, center);
      ctx.stroke();

      // Clip interior
      ctx.save();
      ctx.beginPath();
      ctx.arc(center, center, center - 3, 0, Math.PI * 2);
      ctx.clip();

      // Safe zone circle
      const sx = center + (engine.buildingMgr.safeZoneCenter.x - px) * scale;
      const sz = center + (engine.buildingMgr.safeZoneCenter.z - pz) * scale;
      const sr = engine.buildingMgr.safeZoneRadius * scale;
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.45)';
      ctx.fillStyle = 'rgba(16, 185, 129, 0.08)';
      ctx.beginPath();
      ctx.arc(sx, sz, sr, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Placed base structures
      ctx.fillStyle = '#38bdf8';
      for (const s of engine.buildingMgr.structures) {
        const dx = (s.position[0] - px) * scale;
        const dz = (s.position[2] - pz) * scale;
        if (Math.hypot(dx, dz) > center) continue;
        ctx.fillRect(center + dx - 1.5, center + dz - 1.5, 3, 3);
      }

      // Wildlife dots (emerald/amber)
      if (engine.wildlifeManager?.creatures) {
        for (const c of engine.wildlifeManager.creatures) {
          if (c.state === 'dead') continue;
          const dx = (c.group.position.x - px) * scale;
          const dz = (c.group.position.z - pz) * scale;
          if (Math.hypot(dx, dz) > center - 3) continue;
          ctx.fillStyle = c.species.diet === 'carnivore' ? '#f59e0b' : '#34d399';
          ctx.beginPath();
          ctx.arc(center + dx, center + dz, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Zombie blips (crimson)
      if (engine.zombieMgr?.zombies) {
        ctx.fillStyle = '#fb7185';
        for (const z of engine.zombieMgr.zombies) {
          if (z.state === 'dead') continue;
          const dx = (z.position[0] - px) * scale;
          const dz = (z.position[2] - pz) * scale;
          if (Math.hypot(dx, dz) > center - 3) continue;
          ctx.beginPath();
          ctx.arc(center + dx, center + dz, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Active Objective ping
      const activeObj = engine.objectiveNavigator?.activeObjective;
      if (activeObj) {
        const dx = (activeObj.position[0] - px) * scale;
        const dz = (activeObj.position[2] - pz) * scale;
        const dist = Math.hypot(dx, dz);
        const clampedX = dist > center - 6 ? (dx / dist) * (center - 6) : dx;
        const clampedZ = dist > center - 6 ? (dz / dist) * (center - 6) : dz;
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(center + clampedX, center + clampedZ, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();

      // Player heading cone at center
      ctx.save();
      ctx.translate(center, center);
      ctx.rotate(-yaw);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(0, -6);
      ctx.lineTo(4, 4);
      ctx.lineTo(-4, 4);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // Outer bezel ring
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.55)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(center, center, center - 2, 0, Math.PI * 2);
      ctx.stroke();
    };

    draw();
    const timer = setInterval(draw, 120);
    return () => clearInterval(timer);
  }, [engineRef, isVisible]);

  if (!isVisible) return null;

  return (
    <div className="pointer-events-auto absolute top-[4.65rem] sm:top-[5.35rem] right-[max(0.5rem,var(--sar))] z-20 flex flex-col items-center rounded-2xl border border-neutral-800/90 bg-neutral-950/88 p-1.5 shadow-2xl">
      <div className="mb-1 flex w-full items-center justify-between px-1">
        <span className="flex items-center gap-1 text-[9px] font-mono font-bold uppercase tracking-wider text-amber-400">
          <Radar className="h-2.5 w-2.5" />
          <span>90m [N]</span>
        </span>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-0.5 text-neutral-500 hover:text-neutral-200 cursor-pointer"
          title="Hide Minimap [N]"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
      <button
        type="button"
        onClick={onOpenFullMap}
        className="cursor-pointer rounded-full focus:outline-none"
        title="Click to open Full Map [M]"
      >
        <canvas ref={canvasRef} width={116} height={116} className="block h-[92px] w-[92px] sm:h-[116px] sm:w-[116px]" />
      </button>
      <span className="mt-1 text-[8px] font-mono text-neutral-400">N ↑ · Click for Map</span>
    </div>
  );
};
