import * as THREE from 'three';
import { StoryCompanion } from '../../types/prologue';
import { getTerrainHeight } from '../Terrain';
import { soundEngine } from '../../utils/audio';
import { UnifiedPhysicsManager } from '../physics/UnifiedPhysicsManager';
import { ApartmentBuilding } from './ApartmentBuilding';

export class StoryCompanionManager {
  public scene: THREE.Scene;
  public group: THREE.Group;
  public companions: Map<'marcus' | 'chloe' | 'maya', StoryCompanion> = new Map();
  public companionMeshes: Map<'marcus' | 'chloe' | 'maya', THREE.Group> = new Map();
  private walkTime: number = 0;
  private ridingWithPlayer = new Set<'marcus' | 'chloe' | 'maya'>();
  private socialPoseTimer = new Map<'marcus' | 'chloe' | 'maya', number>();

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = 'story_companions';
    this.scene.add(this.group);

    this.initCompanions();
  }

  private initCompanions() {
    const friendDefs: StoryCompanion[] = [
      {
        id: 'marcus',
        name: 'Marcus Cole',
        title: 'The Leader',
        role: 'Leader',
        color: 0x1f3b60,
        jacketColor: 0x223a5e,
        pantColor: 0x1c2128,
        hairColor: 0x1a1a1a,
        position: [-10, 0, 16],
        rotationY: Math.PI / 4,
        health: 150,
        maxHealth: 150,
        dialogueState: 0,
        isFollowing: false,
        station: 'town',
        relationshipScore: 80,
      },
      {
        id: 'chloe',
        name: 'Chloe Miller',
        title: 'The Technician',
        role: 'Technician',
        color: 0xd9822b,
        jacketColor: 0xd47a22,
        pantColor: 0x3d434a,
        hairColor: 0x5c2c16,
        position: [-11.5, 0, 17.5],
        rotationY: 0,
        health: 100,
        maxHealth: 100,
        dialogueState: 0,
        isFollowing: false,
        station: 'town',
        relationshipScore: 85,
      },
      {
        id: 'maya',
        name: 'Dr. Maya Lin',
        title: 'The Medic',
        role: 'Medic',
        color: 0x2e8b57,
        jacketColor: 0x2b7a4c,
        pantColor: 0xe6e6e6,
        hairColor: 0x111111,
        position: [-9, 0, 18],
        rotationY: -Math.PI / 3,
        health: 120,
        maxHealth: 120,
        dialogueState: 0,
        isFollowing: false,
        station: 'town',
        relationshipScore: 90,
      },
    ];

    friendDefs.forEach((c) => {
      this.companions.set(c.id, c);
      const mesh = this.createCompanionMesh(c);
      mesh.name = `companion_${c.id}`;
      mesh.position.set(c.position[0], getTerrainHeight(c.position[0], c.position[2]), c.position[2]);
      mesh.rotation.y = c.rotationY;
      this.group.add(mesh);
      this.companionMeshes.set(c.id, mesh);
    });
  }

  private createCompanionMesh(c: StoryCompanion): THREE.Group {
    const g = new THREE.Group();
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xd29d78, roughness: 0.9 });
    const hairMat = new THREE.MeshStandardMaterial({ color: c.hairColor, roughness: 0.85 });
    const jacketMat = new THREE.MeshStandardMaterial({ color: c.jacketColor, roughness: 0.8 });
    const pantMat = new THREE.MeshStandardMaterial({ color: c.pantColor, roughness: 0.88 });

    // Torso with jacket
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.25, 0.52, 4, 8), jacketMat);
    torso.position.y = 1.05;
    torso.castShadow = true;

    // Head
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 8), skinMat);
    head.position.y = 1.52;
    head.castShadow = true;

    // Distinct Hair / Silhouette
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.19, 8, 6), hairMat);
    hair.position.set(0, 1.57, -0.02);
    if (c.id === 'chloe') {
      hair.scale.set(1.05, 1.15, 1.1); // Ponytail / fuller hair
      // Headset
      const headsetMat = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.8 });
      const band = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.02, 6, 12, Math.PI), headsetMat);
      band.position.set(0, 1.55, 0);
      band.rotation.x = Math.PI / 2;
      g.add(band);
    } else if (c.id === 'maya') {
      // Medic Red Cross Badge on shoulder
      const badge = new THREE.Mesh(
        new THREE.PlaneGeometry(0.14, 0.14),
        new THREE.MeshBasicMaterial({ color: 0xee2222 })
      );
      badge.position.set(-0.28, 1.15, 0.05);
      badge.rotation.y = -Math.PI / 2;
      g.add(badge);
    } else if (c.id === 'marcus') {
      // Tactical holster belt
      const belt = new THREE.Mesh(
        new THREE.CylinderGeometry(0.27, 0.27, 0.08, 8),
        new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.5 })
      );
      belt.position.y = 0.78;
      g.add(belt);
    }

    // Limbs
    const lLeg = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.52, 4, 6), pantMat);
    lLeg.name = 'lLeg';
    lLeg.position.set(-0.13, 0.42, 0);
    const rLeg = lLeg.clone();
    rLeg.name = 'rLeg';
    rLeg.position.x = 0.13;

    const lArm = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.48, 4, 6), jacketMat);
    lArm.name = 'lArm';
    lArm.position.set(-0.34, 1.05, 0);
    const rArm = lArm.clone();
    rArm.name = 'rArm';
    rArm.position.x = 0.34;

    // Name / Halo Badge
    const haloMat = new THREE.MeshBasicMaterial({
      color: c.color,
      transparent: true,
      opacity: 0.6,
      wireframe: true,
    });
    const halo = new THREE.Mesh(new THREE.RingGeometry(0.3, 0.38, 16), haloMat);
    halo.rotation.x = -Math.PI / 2;
    halo.position.y = 0.05;

    g.add(torso, head, hair, lLeg, rLeg, lArm, rArm, halo);
    return g;
  }

  public update(delta: number, playerPos: THREE.Vector3, isEscapeOrShelter: boolean, apartment?: ApartmentBuilding, vehicleOccupied = false) {
    this.walkTime += delta;

    // Formation offsets when following player
    const formationOffsets: Record<'marcus' | 'chloe' | 'maya', THREE.Vector3> = {
      marcus: new THREE.Vector3(1.6, 0, 1.8),
      chloe: new THREE.Vector3(-1.6, 0, 1.8),
      maya: new THREE.Vector3(0, 0, 3.2),
    };

    this.companions.forEach((c, id) => {
      const mesh = this.companionMeshes.get(id);
      if (!mesh) return;

      // Friends selected for Drive become passengers while the player is in a vehicle.
      if (this.ridingWithPlayer.has(id)) {
        if (vehicleOccupied) {
          mesh.visible = false;
          mesh.position.set(playerPos.x, playerPos.y, playerPos.z);
          c.position = [playerPos.x, playerPos.y, playerPos.z];
          return;
        }
        mesh.visible = true;
        mesh.position.set(playerPos.x + 1.5, getTerrainHeight(playerPos.x + 1.5, playerPos.z), playerPos.z);
        c.position = [mesh.position.x, mesh.position.y, mesh.position.z];
        this.ridingWithPlayer.delete(id);
        c.isFollowing = false;
      }

      if (c.isFollowing) {
        const offset = formationOffsets[id];
        const targetX = playerPos.x + offset.x;
        const targetZ = playerPos.z + offset.z;

        const formationTarget = new THREE.Vector3(targetX, mesh.position.y, targetZ);
        const legalWaypoint = apartment?.getCompanionNavigationWaypoint(mesh.position, formationTarget) ?? null;
        const navigationTarget = legalWaypoint ?? formationTarget;
        const dx = navigationTarget.x - mesh.position.x;
        const dz = navigationTarget.z - mesh.position.z;
        const dist = Math.hypot(dx, dz);

        const lLeg = mesh.getObjectByName('lLeg');
        const rLeg = mesh.getObjectByName('rLeg');
        const lArm = mesh.getObjectByName('lArm');
        const rArm = mesh.getObjectByName('rArm');

        if (dist > 0.45) {
          const moveSpeed = isEscapeOrShelter ? 6.2 : 4.0;
          const step = Math.min(dist, delta * moveSpeed);
          const angle = Math.atan2(dx, dz);

          const desiredPos = new THREE.Vector3(
            mesh.position.x + Math.sin(angle) * step,
            mesh.position.y,
            mesh.position.z + Math.cos(angle) * step
          );

          const phys = UnifiedPhysicsManager.getInstance();
          if (phys) {
            const resolved = phys.resolveMovement(mesh.position, desiredPos, 0.35, 1.8, `companion_${id}`);
            mesh.position.x = resolved.resolvedPos.x;
            mesh.position.z = resolved.resolvedPos.z;
          } else {
            mesh.position.x = desiredPos.x;
            mesh.position.z = desiredPos.z;
          }
          mesh.rotation.y = angle;

          // Leg swing
          const cycle = Math.sin(this.walkTime * 12 * (moveSpeed / 4));
          if (lLeg && rLeg) {
            lLeg.rotation.x = cycle * 0.6;
            rLeg.rotation.x = -cycle * 0.6;
          }
          if (lArm && rArm) {
            lArm.rotation.x = -cycle * 0.5;
            rArm.rotation.x = cycle * 0.5;
          }
        } else {
          // Idle posture
          if (lLeg && rLeg) {
            lLeg.rotation.x = THREE.MathUtils.damp(lLeg.rotation.x, 0, 10, delta);
            rLeg.rotation.x = THREE.MathUtils.damp(rLeg.rotation.x, 0, 10, delta);
          }
          if (lArm && rArm) {
            lArm.rotation.x = THREE.MathUtils.damp(lArm.rotation.x, 0, 10, delta);
            rArm.rotation.x = THREE.MathUtils.damp(rArm.rotation.x, 0, 10, delta);
          }
        }
      }

      const poseTimer = this.socialPoseTimer.get(id) || 0;
      if (poseTimer > 0) {
        this.socialPoseTimer.set(id, Math.max(0, poseTimer - delta));
        const leftArm = mesh.getObjectByName('lArm');
        const rightArm = mesh.getObjectByName('rArm');
        if (leftArm && rightArm) {
          const target = poseTimer > 0.35 ? 0.85 : 0;
          leftArm.rotation.z = THREE.MathUtils.damp(leftArm.rotation.z, target, 7, delta);
          rightArm.rotation.z = THREE.MathUtils.damp(rightArm.rotation.z, -target, 7, delta);
        }
        if (poseTimer <= delta) this.socialPoseTimer.delete(id);
      }
      mesh.position.y = getTerrainHeight(mesh.position.x, mesh.position.z);
      c.position = [mesh.position.x, mesh.position.y, mesh.position.z];
      c.rotationY = mesh.rotation.y;

      const physMgr = UnifiedPhysicsManager.getInstance();
      if (physMgr) {
        physMgr.updateColliderPosition(`companion_${id}`, mesh.position, mesh.rotation.y);
      }
    });
  }

  public registerColliders(physMgr: UnifiedPhysicsManager) {
    this.companions.forEach((c) => {
      physMgr.registerCylinderCollider(`companion_${c.id}`, 'companion', c.position, 0.45, 1.85);
    });
  }

  public setAllFollowing(following: boolean) {
    this.companions.forEach((c) => {
      c.isFollowing = following;
    });
  }

  public teleportTo(id: 'marcus' | 'chloe' | 'maya', pos: [number, number, number], rotY: number) {
    const c = this.companions.get(id);
    const mesh = this.companionMeshes.get(id);
    if (c && mesh) {
      c.position = [...pos];
      c.rotationY = rotY;
      mesh.position.set(pos[0], pos[1], pos[2]);
      mesh.rotation.y = rotY;
    }
  }

  public toggleCompanionFollowing(id: 'marcus' | 'chloe' | 'maya'): boolean {
    const c = this.companions.get(id);
    if (!c) return false;
    c.isFollowing = !c.isFollowing;
    soundEngine.playUIClick();
    return c.isFollowing;
  }

  public regroupAll(playerPos: THREE.Vector3) {
    this.companions.forEach((c) => {
      c.isFollowing = true;
    });
    soundEngine.playBuildSnap();
  }

  public getNearestCompanion(pos: THREE.Vector3, maxDist = 3.5): StoryCompanion | null {
    let nearest: StoryCompanion | null = null;
    let minDist = maxDist;
    this.companions.forEach((c) => {
      const d = Math.hypot(c.position[0] - pos.x, c.position[2] - pos.z);
      if (d < minDist) {
        minDist = d;
        nearest = c;
      }
    });
    return nearest;
  }

  public performSocialAction(id: 'marcus' | 'chloe' | 'maya', action: string): string {
    const c = this.companions.get(id);
    const mesh = this.companionMeshes.get(id);
    if (!c || !mesh) return 'Your friend is not available right now.';
    soundEngine.playUIClick();
    if (action === 'Follow' || action === 'Unfollow') {
      c.isFollowing = action === 'Follow';
      this.ridingWithPlayer.delete(id);
      return c.isFollowing ? `${c.name} is now following you.` : `${c.name} will stay here.`;
    }
    if (action === 'Drive') {
      this.ridingWithPlayer.add(id);
      c.isFollowing = false;
      return `${c.name} is ready to ride with you. Enter a vehicle to take your friend along.`;
    }
    c.relationshipScore = Math.min(100, c.relationshipScore + 2);
    this.socialPoseTimer.set(id, action === 'Dance' ? 2.2 : 1.25);
    if (action === 'Handshake') return `${c.name} returned your handshake.`;
    if (action === 'Hug') return `${c.name} shared a friendly hug.`;
    if (action === 'Dance') return `${c.name} joined your dance.`;
    return `${c.name} is happy to spend time with you.`;
  }

  public dispose() {
    this.scene.remove(this.group);
    this.group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose());
        else child.material.dispose();
      }
    });
    this.companions.clear();
    this.companionMeshes.clear();
    this.ridingWithPlayer.clear();
    this.socialPoseTimer.clear();
  }
}
