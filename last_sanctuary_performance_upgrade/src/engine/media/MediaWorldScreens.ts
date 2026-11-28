import * as THREE from 'three';
import { getTerrainHeight } from '../Terrain';
import { drawSharedBroadcastCanvas } from './SharedBroadcastRenderer';
import type { GlobalMediaManager } from './GlobalMediaManager';
import type { MediaChannelId } from './MediaTypes';

export interface WorldBroadcastScreenInstance {
  id: string;
  label: string;
  channelId: MediaChannelId;
  worldPos: THREE.Vector3;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  texture: THREE.CanvasTexture;
  mesh: THREE.Group;
}

/**
 * Places synchronized shared-feed broadcast monitors & local reporting kiosks
 * at Oakridge Hospital/Clinic, Town Hall, Police Station, Corner Market/Cafe,
 * Railway Station Forecourt, Military Starter Base (Outpost 7), and Oakridge Local Station.
 */
export class MediaWorldScreens {
  public readonly group: THREE.Group;
  public readonly screens: WorldBroadcastScreenInstance[] = [];
  private refreshTimer = 0;
  private elapsed = 0;

  constructor(scene: THREE.Scene) {
    this.group = new THREE.Group();
    this.group.name = 'global_media_world_screens';
    scene.add(this.group);

    // 1. Oakridge Local Reporting Station Kiosk (near Cross Street & Media Plaza entrance X=48, Z=-12)
    this.createBroadcastKiosk('scr_oakridge_local_station', 'Oakridge Local Station Public Monitor', 48.0, -12.0, -Math.PI / 2, 'oakridge_local', true);
    // 2. Valley Community Clinic Lobby / Entrance Monitor (Clinic at 18, -52)
    this.createBroadcastKiosk('scr_clinic_tv', 'Valley Community Clinic Emergency Display', 10.6, -50.0, -Math.PI / 2, 'oakridge_news_24');
    // 3. Oakridge Town Hall Civic Screen (Town Hall at 38, 18)
    this.createBroadcastKiosk('scr_townhall_tv', 'Oakridge Town Hall Public Broadcast Board', 30.6, 18.0, -Math.PI / 2, 'oakridge_weather');
    // 4. Police Station Dispatch Monitor (Police at 16, -16)
    this.createBroadcastKiosk('scr_police_tv', 'Oakridge Police Dispatch Broadcast Monitor', 9.6, -16.0, -Math.PI / 2, 'oakridge_news_24');
    // 5. Corner Cafe & Fresh Market Street Screen (-14, -54)
    this.createBroadcastKiosk('scr_market_cafe_tv', 'Main Avenue Commercial Strip News Monitor', -9.0, -54.0, Math.PI / 2, 'oakridge_local');
    // 6. Military Outpost 7 Emergency Broadcast Relay & Dish (942, 22)
    this.createBroadcastKiosk('scr_military_base_tv', 'Outpost 7 Emergency Broadcast Relay Terminal', 942.0, 22.0, -Math.PI / 2, 'worldwatch_intl', true);
  }

  private createBroadcastKiosk(
    id: string,
    label: string,
    wx: number,
    wz: number,
    rotY: number,
    channelId: MediaChannelId,
    withSatelliteDish: boolean = false
  ): void {
    const wy = getTerrainHeight(wx, wz);
    const kiosk = new THREE.Group();
    kiosk.name = id;
    kiosk.position.set(wx, wy, wz);
    kiosk.rotation.y = rotY;

    const frameMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.72, roughness: 0.38 });
    const post = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.5, 0.45), frameMat);
    post.position.y = 1.25;
    post.castShadow = true;

    const canvas = document.createElement('canvas');
    canvas.width = 448;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;

    const screenMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(2.1, 1.22),
      new THREE.MeshBasicMaterial({ map: texture })
    );
    screenMesh.position.set(0, 1.55, 0.24);
    kiosk.add(post, screenMesh);

    if (withSatelliteDish) {
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 1.6, 8), frameMat);
      mast.position.set(0.8, 3.1, 0);
      const dish = new THREE.Mesh(
        new THREE.CylinderGeometry(0.55, 0.14, 0.25, 12),
        new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.4 })
      );
      dish.position.set(0.8, 3.85, 0);
      dish.rotation.x = -Math.PI * 0.3;
      kiosk.add(mast, dish);
    }

    this.group.add(kiosk);
    this.screens.push({
      id,
      label,
      channelId,
      worldPos: new THREE.Vector3(wx, wy, wz),
      canvas,
      ctx,
      texture,
      mesh: kiosk,
    });
  }

  public getNearestScreen(pos: THREE.Vector3, maxDist: number = 3.2): WorldBroadcastScreenInstance | null {
    let best: WorldBroadcastScreenInstance | null = null;
    let bestD = maxDist;
    for (const scr of this.screens) {
      if (Math.abs(pos.y - scr.worldPos.y) > 2.8) continue;
      const d = Math.hypot(pos.x - scr.worldPos.x, pos.z - scr.worldPos.z);
      if (d < bestD) {
        bestD = d;
        best = scr;
      }
    }
    return best;
  }

  public update(delta: number, mediaMgr: GlobalMediaManager, playerPos: THREE.Vector3): void {
    this.elapsed += delta;
    this.refreshTimer += delta;
    if (this.refreshTimer < 0.65) return;
    this.refreshTimer = 0;

    for (const scr of this.screens) {
      const dSq =
        (scr.worldPos.x - playerPos.x) * (scr.worldPos.x - playerPos.x) +
        (scr.worldPos.z - playerPos.z) * (scr.worldPos.z - playerPos.z);
      if (dSq > 160 * 160) continue; // Skip off-range canvas repaints
      const feed = mediaMgr.getSharedScreenFeed(scr.channelId);
      drawSharedBroadcastCanvas(scr.ctx, scr.canvas.width, scr.canvas.height, feed, {
        compact: true,
        timePhase: this.elapsed,
      });
      scr.texture.needsUpdate = true;
    }
  }

  public dispose(): void {
    for (const scr of this.screens) {
      scr.texture.dispose();
    }
    this.screens.length = 0;
    this.group.parent?.remove(this.group);
    this.group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry?.dispose?.();
        if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
        else obj.material?.dispose?.();
      }
    });
  }
}
