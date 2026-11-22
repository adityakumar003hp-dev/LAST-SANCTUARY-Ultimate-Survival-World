import * as THREE from 'three';
import { NavigationObjective, ObjectiveNavigationState } from '../../types/physics';

export class ObjectiveNavigator {
  private scene: THREE.Scene;
  public activeObjective: NavigationObjective | null = null;
  public state: ObjectiveNavigationState = {
    activeObjective: null,
    distanceMeters: 0,
    bearingAngleDegrees: 0,
    isNearDestination: false,
    isAtDestination: false,
    routeWaypoints: [],
  };

  // 3D In-World Waypoint Beacon Meshes
  private beaconGroup: THREE.Group | null = null;
  private beaconDiamond: THREE.Mesh | null = null;
  private beaconRing: THREE.Mesh | null = null;
  private beaconBeam: THREE.Mesh | null = null;
  private beaconTimer: number = 0;

  // Town Nav Graph Waypoint Nodes (Intersections, street centers, sidewalks)
  private readonly navNodes: Array<{ x: number; z: number }> = [
    { x: 0, z: -40 },
    { x: 0, z: -20 },
    { x: 0, z: 0 },
    { x: 0, z: 20 },
    { x: 0, z: 35 },
    // West Sidewalk
    { x: -4.8, z: -35 },
    { x: -4.8, z: -18 },
    { x: -4.8, z: 0 },
    { x: -4.8, z: 12 },
    { x: -4.8, z: 22 }, // Outside Cafe
    { x: -4.8, z: 38 }, // Outside Apartment street
    // East Sidewalk
    { x: 4.8, z: -35 },
    { x: 4.8, z: -18 },
    { x: 4.8, z: 0 },
    { x: 4.8, z: 18 }, // Outside Park
    { x: 4.8, z: 35 },
    // Cross Street
    { x: -14, z: 0 },
    { x: -26, z: 0 },
    { x: 16, z: 0 },
    { x: 28, z: 0 },
    { x: 38, z: 0 },
    // Direct destination connectors
    { x: -14, z: 22 }, // Central Cafe
    { x: -14, z: 10 }, // Fresh Market
    { x: -26, z: 31 }, // Apartment Entrance
    // Highway corridor leading 1 km to Relocated Starter Base (1000m from bunker at -46, 22)
    { x: 45, z: 12 },
    { x: 120, z: 16 },
    { x: 250, z: 20 },
    { x: 420, z: 22 },
    { x: 600, z: 22 },
    { x: 780, z: 22 },
    { x: 900, z: 26 },
    { x: 954, z: 34 }, // Relocated Starter Base Gate (1000m from bunker)
    { x: 954, z: 22 }, // Relocated Starter Base Courtyard
  ];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.initBeaconMeshes();
  }

  private initBeaconMeshes() {
    this.beaconGroup = new THREE.Group();
    this.beaconGroup.name = 'objective_waypoint_beacon';
    this.beaconGroup.visible = false;

    // 1. Floating Diamond / Marker
    const diamondGeo = new THREE.OctahedronGeometry(0.55, 0);
    const diamondMat = new THREE.MeshBasicMaterial({
      color: 0xffaa00,
      wireframe: false,
    });
    this.beaconDiamond = new THREE.Mesh(diamondGeo, diamondMat);
    this.beaconDiamond.position.y = 2.4;
    this.beaconGroup.add(this.beaconDiamond);

    // 2. Ground Pulsing Concentric Ripple Ring
    const ringGeo = new THREE.RingGeometry(0.8, 1.4, 24);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xffaa00,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.6,
    });
    this.beaconRing = new THREE.Mesh(ringGeo, ringMat);
    this.beaconRing.rotation.x = -Math.PI / 2;
    this.beaconRing.position.y = 0.08;
    this.beaconGroup.add(this.beaconRing);

    // 3. Vertical Radiant Light Pillar
    const beamGeo = new THREE.CylinderGeometry(0.12, 0.28, 16, 12, 1, true);
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0xffbb22,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
    });
    this.beaconBeam = new THREE.Mesh(beamGeo, beamMat);
    this.beaconBeam.position.y = 8.0;
    this.beaconGroup.add(this.beaconBeam);

    this.scene.add(this.beaconGroup);
  }

  public setObjective(obj: NavigationObjective | null) {
    this.activeObjective = obj;
    if (!obj) {
      if (this.beaconGroup) this.beaconGroup.visible = false;
      this.state = {
        activeObjective: null,
        distanceMeters: 0,
        bearingAngleDegrees: 0,
        isNearDestination: false,
        isAtDestination: false,
        routeWaypoints: [],
      };
      return;
    }

    if (this.beaconGroup) {
      this.beaconGroup.visible = true;
      this.beaconGroup.position.set(obj.position[0], obj.position[1], obj.position[2]);
    }
  }

  // --- Calculate Street-Safe Navigable Route ---
  public calculateRoute(startX: number, startZ: number, targetX: number, targetZ: number): [number, number][] {
    const route: [number, number][] = [[startX, startZ]];

    // Find closest node to player
    let closestStartIdx = 0;
    let minStartDist = Infinity;
    this.navNodes.forEach((node, idx) => {
      const d = Math.hypot(node.x - startX, node.z - startZ);
      if (d < minStartDist) {
        minStartDist = d;
        closestStartIdx = idx;
      }
    });

    // Find closest node to target
    let closestTargetIdx = 0;
    let minTargetDist = Infinity;
    this.navNodes.forEach((node, idx) => {
      const d = Math.hypot(node.x - targetX, node.z - targetZ);
      if (d < minTargetDist) {
        minTargetDist = d;
        closestTargetIdx = idx;
      }
    });

    const startNode = this.navNodes[closestStartIdx];
    const targetNode = this.navNodes[closestTargetIdx];

    // If far enough, route via the sidewalk / avenue nodes
    if (minStartDist > 2.5 && startNode) {
      route.push([startNode.x, startNode.z]);
    }

    // Intermediate street corner if different axes
    if (startNode && targetNode && (startNode.x !== targetNode.x || startNode.z !== targetNode.z)) {
      // Route via Main Avenue if travelling along North-South
      if (Math.abs(startNode.z - targetNode.z) > 10) {
        const midZ = (startNode.z + targetNode.z) * 0.5;
        route.push([-4.8, midZ]);
      }
      route.push([targetNode.x, targetNode.z]);
    }

    route.push([targetX, targetZ]);
    return route;
  }

  // --- Update Navigation & Compass Bearing Every Frame ---
  public update(delta: number, playerPos: THREE.Vector3, playerYaw: number): ObjectiveNavigationState {
    if (!this.activeObjective) {
      if (this.beaconGroup) this.beaconGroup.visible = false;
      return this.state;
    }

    this.beaconTimer += delta;

    // Animate 3D in-world beacon
    if (this.beaconGroup && this.beaconGroup.visible) {
      if (this.beaconDiamond) {
        this.beaconDiamond.position.y = 2.4 + Math.sin(this.beaconTimer * 3.5) * 0.25;
        this.beaconDiamond.rotation.y += delta * 1.8;
      }
      if (this.beaconRing) {
        const pulse = 1.0 + Math.sin(this.beaconTimer * 4.0) * 0.25;
        this.beaconRing.scale.set(pulse, pulse, 1);
      }
    }

    const tx = this.activeObjective.position[0];
    const tz = this.activeObjective.position[2];

    const dx = tx - playerPos.x;
    const dz = tz - playerPos.z;
    const dist = Math.hypot(dx, dz);

    // World bearing angle to target (0 = -Z forward, 90 = +X right, etc.)
    const worldAngleToTarget = Math.atan2(dx, -dz);

    // Relative angle against player camera yaw
    let relativeAngle = worldAngleToTarget - playerYaw;

    // Normalize to -PI .. +PI
    while (relativeAngle > Math.PI) relativeAngle -= Math.PI * 2;
    while (relativeAngle < -Math.PI) relativeAngle += Math.PI * 2;

    const bearingDegrees = THREE.MathUtils.radToDeg(relativeAngle);
    const arrivalRadius = this.activeObjective.arrivalRadius || 3.0;

    const isNear = dist <= 7.5;
    const isAt = dist <= arrivalRadius;

    // Periodic route recalculation (or once at start)
    if (!this.state.routeWaypoints || this.state.routeWaypoints.length === 0) {
      this.state.routeWaypoints = this.calculateRoute(playerPos.x, playerPos.z, tx, tz);
    }

    this.state = {
      activeObjective: this.activeObjective,
      distanceMeters: Math.round(dist),
      bearingAngleDegrees: Math.round(bearingDegrees),
      isNearDestination: isNear,
      isAtDestination: isAt,
      routeWaypoints: this.state.routeWaypoints,
    };

    return this.state;
  }

  public dispose() {
    if (this.beaconGroup) {
      this.scene.remove(this.beaconGroup);
      this.beaconGroup.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.geometry.dispose();
          if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose());
          else o.material.dispose();
        }
      });
      this.beaconGroup = null;
    }
  }
}
