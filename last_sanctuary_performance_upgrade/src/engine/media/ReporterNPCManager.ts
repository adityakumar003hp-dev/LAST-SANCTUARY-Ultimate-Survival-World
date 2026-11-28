import * as THREE from 'three';
import { buildRealisticHumanoid, HumanoidBuildOptions } from '../rendering/RealisticHumanoidBuilder';
import { getTerrainHeight } from '../Terrain';
import { UnifiedPhysicsManager } from '../physics/UnifiedPhysicsManager';
import type { ZombieManager } from '../ZombieManager';
import type { GlobalMediaManager } from './GlobalMediaManager';
import type { MediaWorldPhase, ReporterNPCDescriptor, ReporterProfession } from './MediaTypes';

interface RuntimeReporterInstance {
  descriptor: ReporterNPCDescriptor;
  mesh: THREE.Group;
  homePos: [number, number, number];
  fieldTargetPos?: [number, number, number];
  walkPhase: number;
  baseYaw: number;
}

const PROFESSION_APPEARANCE: Record<
  ReporterProfession,
  {
    jacket: number;
    pants: number;
    hair: NonNullable<HumanoidBuildOptions['hairStyle']>;
    gender: NonNullable<HumanoidBuildOptions['genderPresentation']>;
    prop: 'mic' | 'eng_camera' | 'dslr' | 'tablet' | 'headset' | 'security';
  }
> = {
  'News Anchor': { jacket: 0x1e3a8a, pants: 0x0f172a, hair: 'bun', gender: 'feminine', prop: 'tablet' },
  'Field Reporter': { jacket: 0x0369a1, pants: 0x1e293b, hair: 'parted', gender: 'masculine', prop: 'mic' },
  'Investigative Journalist': { jacket: 0x78350f, pants: 0x27272a, hair: 'ponytail', gender: 'feminine', prop: 'tablet' },
  'Camera Operator': { jacket: 0x334155, pants: 0x18181b, hair: 'beanie', gender: 'masculine', prop: 'eng_camera' },
  'Photographer': { jacket: 0x3f3f46, pants: 0x1e293b, hair: 'short', gender: 'masculine', prop: 'dslr' },
  'Weather Presenter': { jacket: 0x0e7490, pants: 0x1e293b, hair: 'ponytail', gender: 'feminine', prop: 'tablet' },
  'Scientist': { jacket: 0xe2e8f0, pants: 0x334155, hair: 'parted', gender: 'masculine', prop: 'tablet' },
  'Radio Presenter': { jacket: 0x92400e, pants: 0x1c1917, hair: 'short', gender: 'masculine', prop: 'headset' },
  'Broadcast Technician': { jacket: 0x475569, pants: 0x0f172a, hair: 'bun', gender: 'feminine', prop: 'headset' },
  'Editor': { jacket: 0x312e81, pants: 0x1e293b, hair: 'parted', gender: 'masculine', prop: 'tablet' },
  'Security Personnel': { jacket: 0x1e293b, pants: 0x0f172a, hair: 'short', gender: 'masculine', prop: 'security' },
  'Media Vehicle Driver': { jacket: 0x1d4ed8, pants: 0x18181b, hair: 'beanie', gender: 'masculine', prop: 'headset' },
};

export class ReporterNPCManager {
  public readonly group: THREE.Group;
  private instances: Map<string, RuntimeReporterInstance> = new Map();
  private fieldRigGroup: THREE.Group;

  constructor(scene: THREE.Scene, mediaMgr: GlobalMediaManager) {
    this.group = new THREE.Group();
    this.group.name = 'global_media_reporter_npcs';
    scene.add(this.group);

    this.fieldRigGroup = new THREE.Group();
    this.fieldRigGroup.name = 'field_broadcast_tripod_rigs';
    this.group.add(this.fieldRigGroup);
    this.buildFieldTripodRig(27.2, 11.4);
    this.buildFieldTripodRig(86.0, 56.0); // Crater perimeter staging rig

    const list = mediaMgr.getReporters();
    for (const rep of list) {
      const style = PROFESSION_APPEARANCE[rep.profession];
      const rig = buildRealisticHumanoid({
        facing: '+Z',
        armAliasStyle: 'short',
        jacketColor: style.jacket,
        pantsColor: style.pants,
        skinColor: 0xd9a173,
        hairColor: 0x261a14,
        hairStyle: style.hair,
        genderPresentation: style.gender,
        fabricStyle: rep.profession === 'Security Personnel' ? 'tactical' : 'uniform',
        hasHolster: style.prop === 'security',
        name: `media_npc_${rep.id}`,
      });

      this.attachEquipmentProp(rig.group, style.prop);
      const y = rep.position[1] > 0.5 ? rep.position[1] : getTerrainHeight(rep.position[0], rep.position[2]);
      rig.group.position.set(rep.position[0], y, rep.position[2]);
      this.group.add(rig.group);

      this.instances.set(rep.id, {
        descriptor: rep,
        mesh: rig.group,
        homePos: [rep.position[0], y, rep.position[2]],
        walkPhase: Math.random() * Math.PI * 2,
        baseYaw: Math.PI * 0.25,
      });
    }
  }

  private buildFieldTripodRig(wx: number, wz: number): void {
    const wy = getTerrainHeight(wx, wz);
    const rig = new THREE.Group();
    rig.position.set(wx, wy, wz);
    const legMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.75, roughness: 0.35 });
    const lightMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, emissive: 0xfff7ed, emissiveIntensity: 1.4 });
    const camBody = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.24, 0.52), legMat);
    camBody.position.y = 1.45;
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 0.25, 10), legMat);
    lens.rotation.x = Math.PI / 2;
    lens.position.set(0, 1.45, 0.34);
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, 1.45, 8), legMat);
    mast.position.y = 0.72;
    const lightPanel = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.28, 0.06), lightMat);
    lightPanel.position.set(0.55, 1.85, 0);
    const lightStand = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 1.85, 6), legMat);
    lightStand.position.set(0.55, 0.92, 0);
    rig.add(mast, camBody, lens, lightStand, lightPanel);
    this.fieldRigGroup.add(rig);
  }

  private attachEquipmentProp(npcMesh: THREE.Group, prop: 'mic' | 'eng_camera' | 'dslr' | 'tablet' | 'headset' | 'security'): void {
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.4, metalness: 0.75 });
    const accentMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });

    if (prop === 'mic') {
      const rArm = npcMesh.getObjectByName('rArm') || npcMesh;
      const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.022, 0.22, 8), darkMat);
      handle.position.set(0, -0.45, 0.12);
      handle.rotation.x = -Math.PI * 0.35;
      const cube = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.08), accentMat);
      cube.position.set(0, -0.37, 0.21);
      rArm.add(handle, cube);
    } else if (prop === 'eng_camera') {
      const cam = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.22, 0.56), darkMat);
      cam.position.set(0.24, 1.48, 0.08);
      const redRec = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 6), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
      redRec.position.set(0.24, 1.62, 0.28);
      npcMesh.add(cam, redRec);
    } else if (prop === 'dslr') {
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.12, 0.12), darkMat);
      body.position.set(0, 1.25, 0.26);
      const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.2, 8), darkMat);
      lens.rotation.x = Math.PI / 2;
      lens.position.set(0, 1.25, 0.36);
      npcMesh.add(body, lens);
    } else if (prop === 'headset') {
      const band = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.02, 6, 12, Math.PI), darkMat);
      band.position.set(0, 1.64, 0);
      npcMesh.add(band);
    } else if (prop === 'tablet') {
      const tab = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.02, 0.28), darkMat);
      tab.position.set(0.18, 1.05, 0.25);
      tab.rotation.x = 0.4;
      npcMesh.add(tab);
    }
  }

  public registerColliders(physMgr: UnifiedPhysicsManager): void {
    this.instances.forEach((inst) => {
      if (inst.descriptor.status !== 'infected') {
        physMgr.registerCylinderCollider(
          `media_npc_${inst.descriptor.id}`,
          'npc',
          [inst.mesh.position.x, inst.mesh.position.y, inst.mesh.position.z],
          0.42,
          1.78
        );
      }
    });
  }

  public getNearestReporter(pos: THREE.Vector3, maxDist: number = 3.2): ReporterNPCDescriptor | null {
    let best: ReporterNPCDescriptor | null = null;
    let bestDist = maxDist;
    for (const inst of this.instances.values()) {
      if (!inst.mesh.visible || inst.descriptor.status === 'infected') continue;
      if (Math.abs(pos.y - inst.mesh.position.y) > 2.2) continue;
      const d = Math.hypot(pos.x - inst.mesh.position.x, pos.z - inst.mesh.position.z);
      if (d < bestDist) {
        bestDist = d;
        best = inst.descriptor;
      }
    }
    return best;
  }

  public getDialogueForReporter(rep: ReporterNPCDescriptor, phase: MediaWorldPhase): string {
    if (rep.status === 'stunned') {
      return `${rep.name}: "Something... hit the perimeter air—I can't feel my hands... get back!"`;
    }
    if (phase === 'normal_world') {
      switch (rep.profession) {
        case 'News Anchor':
          return `${rep.name} (${rep.profession}): "Morning! Oakridge News 24 is tracking calm skies, smooth rail service, and a faint deep-sky telescope contact."`;
        case 'Weather Presenter':
          return `${rep.name} (${rep.profession}): "Clear radar across the Valley today. Watch Oakridge Weather CH 12 for evening barometric updates."`;
        case 'Scientist':
          return `${rep.name} (${rep.profession}): "Observatories spotted an uncatalogued asteroid fragment beyond lunar orbit. We're keeping an eye on telemetry."`;
        case 'Radio Presenter':
          return `${rep.name} (${rep.profession}): "You're tuned to 94.7 FM Oakridge Radio! Backup transmitter arrays tested 100% ready."`;
        case 'Field Reporter':
        case 'Camera Operator':
        case 'Photographer':
          return `${rep.name} (${rep.profession}): "Covering today's Town Square showcase for Oakridge News 24. Quiet mornings like this are rare."`;
        default:
          return `${rep.name} (${rep.profession}): "Media Tower operations are running at full capacity. Feel free to inspect any studio floor!"`;
      }
    }
    if (phase === 'asteroid_approaching' || phase === 'asteroid_impact') {
      return `${rep.name} (${rep.profession}): "All 6 channels are running live emergency updates! Stay clear of Sector 4 ridge and keep FM 94.7 close."`;
    }
    if (phase === 'outbreak') {
      return `${rep.name} (${rep.profession}): "We lost contact with several regional units during the outbreak surge. Oakridge Media Tower is running on backup power!"`;
    }
    return `${rep.name} (${rep.profession}): "Automated emergency broadcasts are looping over 94.7 FM. Protect the sanctuary corridors and stay indoors after nightfall."`;
  }

  public update(
    delta: number,
    mediaMgr: GlobalMediaManager,
    zombieMgr: ZombieManager,
    isNight: boolean,
    isOutbreakActive: boolean
  ): void {
    const phase = mediaMgr.getWorldPhase();
    const updates: Array<{
      id: string;
      position?: [number, number, number];
      status?: ReporterNPCDescriptor['status'];
      locationLabel?: string;
      infectionTimer?: number;
    }> = [];

    const physMgr = UnifiedPhysicsManager.getInstance();

    this.instances.forEach((inst) => {
      const rep = inst.descriptor;
      if (rep.status === 'infected') {
        inst.mesh.visible = false;
        return;
      }

      // Field crews reposition toward crater perimeter once impact/outbreak begins
      const isFieldCrew =
        rep.profession === 'Field Reporter' ||
        rep.profession === 'Camera Operator' ||
        rep.profession === 'Investigative Journalist';

      if (isFieldCrew && (phase === 'asteroid_impact' || phase === 'outbreak') && rep.status !== 'stunned' && rep.status !== 'evacuated') {
        const targetX = rep.id === 'rep_cam_01' ? 85.2 : rep.id === 'rep_invest_01' ? 88.5 : 84.0;
        const targetZ = rep.id === 'rep_cam_01' ? 54.5 : rep.id === 'rep_invest_01' ? 58.0 : 56.0;
        const dx = targetX - inst.mesh.position.x;
        const dz = targetZ - inst.mesh.position.z;
        const dist = Math.hypot(dx, dz);
        if (dist > 1.2) {
          const step = Math.min(dist, delta * 3.4);
          inst.mesh.position.x += (dx / dist) * step;
          inst.mesh.position.z += (dz / dist) * step;
          inst.mesh.position.y = getTerrainHeight(inst.mesh.position.x, inst.mesh.position.z);
          inst.mesh.rotation.y = Math.atan2(dx, dz);
          rep.status = 'transit';
          rep.locationLabel = 'En route · Crater Sector Perimeter';
        } else {
          rep.status = 'field_reporting';
          rep.locationLabel = 'Crater Sector Live Perimeter';
          inst.mesh.rotation.y = Math.atan2(110 - inst.mesh.position.x, 80 - inst.mesh.position.z);
        }
      }

      // Sync stun/infection countdown strictly under active outbreak rules (never in Day 1 normal world)
      if (rep.status === 'stunned') {
        if (!isOutbreakActive) {
          rep.status = 'field_reporting';
          rep.infectionTimer = 0;
        } else {
          rep.infectionTimer = Math.max(0, rep.infectionTimer - delta);
          const shiver = Math.sin(inst.walkPhase * 12) * 0.08;
          inst.mesh.rotation.z = shiver;
          if (rep.infectionTimer <= 0) {
            // Convert using existing ZombieManager rules
            const spawned = zombieMgr.spawnZombie(
              'walker',
              [inst.mesh.position.x, inst.mesh.position.y, inst.mesh.position.z],
              true,
              {
                name: rep.name,
                role: rep.profession,
                clothHex: PROFESSION_APPEARANCE[rep.profession].jacket,
                pantsHex: PROFESSION_APPEARANCE[rep.profession].pants,
                victimScale: 1.0,
              }
            );
            if (spawned) {
              spawned.state = 'chase';
            }
            rep.status = 'infected';
            inst.mesh.visible = false;
            physMgr?.unregisterCollider(`media_npc_${rep.id}`);
          }
        }
      } else {
        inst.mesh.rotation.z = 0;
        inst.walkPhase += delta * (isNight ? 2.4 : 1.7);
        const lArm = inst.mesh.getObjectByName('lArm');
        const rArm = inst.mesh.getObjectByName('rArm');
        const head = inst.mesh.getObjectByName('head');
        if (lArm) lArm.rotation.x = Math.sin(inst.walkPhase) * 0.07;
        if (rArm) rArm.rotation.x = -Math.sin(inst.walkPhase) * 0.07;
        if (head) head.rotation.y = Math.sin(inst.walkPhase * 0.45) * 0.18;
      }

      if (physMgr && rep.status !== 'infected') {
        physMgr.updateColliderPosition(`media_npc_${rep.id}`, [
          inst.mesh.position.x,
          inst.mesh.position.y,
          inst.mesh.position.z,
        ]);
      }

      updates.push({
        id: rep.id,
        position: [inst.mesh.position.x, inst.mesh.position.y, inst.mesh.position.z],
        status: rep.status,
        locationLabel: rep.locationLabel,
        infectionTimer: rep.infectionTimer,
      });
    });

    mediaMgr.syncReporterRuntimeStates(updates);
  }

  public dispose(): void {
    const physMgr = UnifiedPhysicsManager.getInstance();
    this.instances.forEach((inst) => {
      physMgr?.unregisterCollider(`media_npc_${inst.descriptor.id}`);
    });
    this.instances.clear();
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
