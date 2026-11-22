import * as THREE from 'three';

export type ColliderShapeType = 'box' | 'cylinder' | 'sphere';

export type ColliderCategory =
  | 'building'
  | 'wall'
  | 'door'
  | 'prop'
  | 'vehicle'
  | 'npc'
  | 'companion'
  | 'zombie'
  | 'wildlife'
  | 'dinosaur'
  | 'foliage'
  | 'trigger';

export interface SolidCollider {
  id: string;
  category: ColliderCategory;
  shape: ColliderShapeType;
  // Center in world coordinates
  position: THREE.Vector3;
  // Box half-extents (dx, dy, dz)
  halfExtents?: THREE.Vector3;
  // Cylinder radius and height
  radius?: number;
  height?: number;
  rotationY?: number;
  isSolid: boolean;
  isOpen?: boolean; // For doors/gates
  entityRef?: any;
  onImpact?: (force: number, normal: THREE.Vector3) => void;
}

export type SurfaceMaterialType =
  | 'concrete'
  | 'asphalt'
  | 'grass'
  | 'dirt'
  | 'mud'
  | 'sand'
  | 'gravel'
  | 'snow'
  | 'ice'
  | 'wood'
  | 'metal'
  | 'shallow_water'
  | 'deep_water';

export interface SurfacePhysicsProfile {
  friction: number;
  traction: number;
  dragFactor: number;
  slidingTendency: number;
  footstepSound: 'footstep_concrete' | 'footstep_grass' | 'footstep_snow' | 'footstep_wood' | 'footstep_water';
}

export interface NavigationObjective {
  id: string;
  title: string;
  instruction: string;
  destinationName: string;
  position: [number, number, number];
  arrivalRadius: number;
  icon?: string;
  stepDescription?: string;
  routeWaypoints?: [number, number][]; // [x, z] path
  completed?: boolean;
}

export interface ObjectiveNavigationState {
  activeObjective: NavigationObjective | null;
  distanceMeters: number;
  bearingAngleDegrees: number; // -180 to +180 relative to player view yaw
  isNearDestination: boolean;
  isAtDestination: boolean;
  routeWaypoints: [number, number][];
}

export type DynamicPropType =
  | 'crate'
  | 'barrel'
  | 'barricade'
  | 'chair'
  | 'stool'
  | 'toolbox'
  | 'gas_can'
  | 'sawhorse_barrier'
  | 'debris_brick';

export interface DynamicProp {
  id: string;
  name: string;
  type: DynamicPropType;
  mesh: THREE.Group;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  angularVelocity: THREE.Vector3;
  mass: number; // kg
  restitution: number; // 0.1 - 0.4
  friction: number; // 0.8 - 0.95
  size: THREE.Vector3; // half or full extent
  radius: number;
  height: number;
  isInsideHouse?: boolean;
  canBePushed: boolean;
  isSleeping: boolean;
  lastMovedTime: number;
}
