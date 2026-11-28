import * as THREE from 'three';

export type ApartmentObjectAction = 'open' | 'close' | 'toggle';

export type ApartmentAnimationMode = 'hinge' | 'slide' | 'lift' | 'rotate';

export interface ApartmentInteractableOptions {
  id: string;
  root: THREE.Object3D;
  mode?: ApartmentAnimationMode;
  /** Local axis used by hinge/rotate modes. Defaults to Y. */
  axis?: THREE.Vector3;
  /** Final angular displacement in radians for hinge/rotate modes. */
  angle?: number;
  /** Local-space displacement for slide/lift modes. */
  distance?: number;
  /** Animation duration in seconds. */
  duration?: number;
  /** Initial open state. */
  initiallyOpen?: boolean;
  /** Optional notification after the state changes. */
  onStateChange?: (isOpen: boolean) => void;
}

interface RegisteredObject {
  options: ApartmentInteractableOptions;
  basePosition: THREE.Vector3;
  baseQuaternion: THREE.Quaternion;
  axis: THREE.Vector3;
  open: boolean;
  from: number;
  to: number;
  progress: number;
  duration: number;
  moving: boolean;
}

export class ApartmentObjectAnimator {
  private readonly objects = new Map<string, RegisteredObject>();

  register(options: ApartmentInteractableOptions): void {
    if (!options?.id || !options.root) {
      throw new Error('Apartment interactables require an id and a THREE.Object3D root.');
    }

    const existing = this.objects.get(options.id);
    if (existing) this.objects.delete(options.id);

    const initiallyOpen = options.initiallyOpen ?? false;
    const record: RegisteredObject = {
      options,
      basePosition: options.root.position.clone(),
      baseQuaternion: options.root.quaternion.clone(),
      axis: (options.axis ?? new THREE.Vector3(0, 1, 0)).clone().normalize(),
      open: initiallyOpen,
      from: initiallyOpen ? 1 : 0,
      to: initiallyOpen ? 1 : 0,
      progress: initiallyOpen ? 1 : 0,
      duration: Math.max(0.05, options.duration ?? 0.35),
      moving: false,
    };

    this.objects.set(options.id, record);
    this.applyTransform(record, record.open ? 1 : 0);
  }

  unregister(id: string): void {
    this.objects.delete(id);
  }

  has(id: string): boolean {
    return this.objects.has(id);
  }

  isOpen(id: string): boolean {
    return this.objects.get(id)?.open ?? false;
  }

  applyAction(id: string, action: ApartmentObjectAction = 'toggle'): boolean {
    const record = this.objects.get(id);
    if (!record) return false;

    const targetOpen = action === 'open'
      ? true
      : action === 'close'
        ? false
        : !record.open;

    if (targetOpen === record.open && !record.moving) return true;

    record.from = record.progress;
    record.to = targetOpen ? 1 : 0;
    record.progress = record.from;
    record.open = targetOpen;
    record.moving = true;
    record.options.onStateChange?.(targetOpen);
    return true;
  }

  update(deltaSeconds: number): void {
    if (!Number.isFinite(deltaSeconds) || deltaSeconds <= 0) return;

    for (const record of this.objects.values()) {
      if (!record.moving) continue;

      const direction = record.to >= record.from ? 1 : -1;
      const step = deltaSeconds / record.duration;
      record.progress += direction * step;

      if ((direction > 0 && record.progress >= record.to) ||
          (direction < 0 && record.progress <= record.to)) {
        record.progress = record.to;
        record.moving = false;
      }

      this.applyTransform(record, this.ease(record.progress));
    }
  }

  save(): Record<string, boolean> {
    const states: Record<string, boolean> = {};
    for (const [id, record] of this.objects) states[id] = record.open;
    return states;
  }

  load(states: Record<string, boolean>): void {
    if (!states || typeof states !== 'object') return;

    for (const [id, isOpen] of Object.entries(states)) {
      const record = this.objects.get(id);
      if (!record || typeof isOpen !== 'boolean') continue;
      record.open = isOpen;
      record.from = isOpen ? 1 : 0;
      record.to = record.from;
      record.progress = record.to;
      record.moving = false;
      this.applyTransform(record, record.to);
    }
  }

  private ease(value: number): number {
    const t = THREE.MathUtils.clamp(value, 0, 1);
    return t * t * (3 - 2 * t);
  }

  private applyTransform(record: RegisteredObject, amount: number): void {
    const { root, mode = 'hinge', angle = Math.PI / 2, distance = 0.6 } = record.options;

    if (mode === 'hinge' || mode === 'rotate') {
      const rotation = new THREE.Quaternion().setFromAxisAngle(record.axis, angle * amount);
      root.quaternion.copy(record.baseQuaternion).multiply(rotation);
      root.position.copy(record.basePosition);
      return;
    }

    const displacement = mode === 'lift'
      ? new THREE.Vector3(0, distance, 0)
      : record.axis.clone().multiplyScalar(distance);

    root.quaternion.copy(record.baseQuaternion);
    root.position.copy(record.basePosition).addScaledVector(displacement, amount);
  }
}
