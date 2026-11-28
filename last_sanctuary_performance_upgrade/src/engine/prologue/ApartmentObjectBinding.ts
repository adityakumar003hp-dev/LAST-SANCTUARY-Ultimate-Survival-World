import * as THREE from 'three';

/**
 * Keeps every apartment dependency in the coordinate space of the object it belongs to.
 * Put movable visuals, animation pivots, VFX, audio emitters and interaction anchors under
 * the same object root. Physics/navigation are world-space systems, so their sync callbacks
 * are refreshed from the root transform rather than relying on stale construction-time data.
 */
export type ApartmentDependencySlot = 'visual' | 'animation' | 'effects' | 'audio' | 'interaction' | 'navigation';

export interface ApartmentObjectBindingOptions {
  id: string;
  root: THREE.Object3D;
  interactionOffset?: THREE.Vector3;
  interactionRadius?: number;
  interactionHeight?: number;
  colliderId?: string;
  colliderOffset?: THREE.Vector3;
  onPhysicsSync?: (worldPosition: THREE.Vector3, worldYaw: number) => void;
  onTransformSync?: (worldMatrix: THREE.Matrix4) => void;
}

export class ApartmentObjectBinding {
  public readonly id: string;
  public readonly root: THREE.Object3D;
  public readonly interactionAnchor: THREE.Object3D;
  public readonly colliderAnchor: THREE.Object3D;
  public interactionRadius: number;
  public interactionHeight: number;
  public enabled = true;

  private readonly onPhysicsSync?: ApartmentObjectBindingOptions['onPhysicsSync'];
  private readonly onTransformSync?: ApartmentObjectBindingOptions['onTransformSync'];
  private readonly worldPosition = new THREE.Vector3();
  private readonly worldQuaternion = new THREE.Quaternion();
  private readonly worldEuler = new THREE.Euler();
  private readonly worldMatrix = new THREE.Matrix4();
  private lastMatrix = new THREE.Matrix4();
  private hasLastMatrix = false;

  constructor(options: ApartmentObjectBindingOptions) {
    this.id = options.id;
    this.root = options.root;
    this.interactionRadius = Math.max(0, options.interactionRadius ?? 2.0);
    this.interactionHeight = Math.max(0, options.interactionHeight ?? 2.5);
    this.onPhysicsSync = options.onPhysicsSync;
    this.onTransformSync = options.onTransformSync;

    this.interactionAnchor = new THREE.Group();
    this.interactionAnchor.name = `${this.id}:interaction-anchor`;
    this.interactionAnchor.position.copy(options.interactionOffset ?? new THREE.Vector3());
    this.root.add(this.interactionAnchor);

    this.colliderAnchor = new THREE.Group();
    this.colliderAnchor.name = `${this.id}:collider-anchor`;
    this.colliderAnchor.position.copy(options.colliderOffset ?? new THREE.Vector3());
    this.root.add(this.colliderAnchor);
    this.sync(true);
  }

  /** Attach any dependent mesh, pivot, emitter or helper to the same movable root. */
  public attach<T extends THREE.Object3D>(object: T, slot: ApartmentDependencySlot): T {
    object.userData.apartmentBindingId = this.id;
    object.userData.apartmentDependencySlot = slot;
    this.root.add(object);
    return object;
  }

  public getInteractionPosition(target = new THREE.Vector3()): THREE.Vector3 {
    this.root.updateWorldMatrix(true, false);
    this.interactionAnchor.getWorldPosition(target);
    return target;
  }

  public contains(position: THREE.Vector3): boolean {
    if (!this.enabled || !this.root.visible) return false;
    const anchor = this.getInteractionPosition(this.worldPosition);
    const dx = position.x - anchor.x;
    const dz = position.z - anchor.z;
    return Math.hypot(dx, dz) <= this.interactionRadius && Math.abs(position.y - anchor.y) <= this.interactionHeight;
  }

  /** Refresh world-space systems after an object is translated, rotated or re-parented. */
  public sync(force = false): void {
    if (!this.enabled) return;
    this.root.updateWorldMatrix(true, false);
    this.root.matrixWorld.decompose(this.worldPosition, this.worldQuaternion, new THREE.Vector3());
    this.worldEuler.setFromQuaternion(this.worldQuaternion, 'YXZ');
    this.colliderAnchor.getWorldPosition(this.worldPosition);
    this.worldMatrix.copy(this.root.matrixWorld);
    const changed = force || !this.hasLastMatrix || !this.lastMatrix.equals(this.worldMatrix);
    // Physics colliders may be registered after the binding is constructed; refresh their
    // world transform every frame, while heavier dependent callbacks run only on change.
    this.onPhysicsSync?.(this.worldPosition, this.worldEuler.y);
    if (changed) this.onTransformSync?.(this.worldMatrix);
    this.lastMatrix.copy(this.worldMatrix);
    this.hasLastMatrix = true;
  }

  public dispose(): void {
    this.enabled = false;
    this.interactionAnchor.removeFromParent();
    this.colliderAnchor.removeFromParent();
  }
}
