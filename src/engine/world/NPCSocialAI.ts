/**
 * NPC Social AI System Module
 * 
 * Enables independent social interactions between NPCs at the railway station:
 * - Mutual greeting with head-turns and waving gestures
 * - Waiting together in pairs or small groups at platforms/concourse
 * - Sharing double/triple bench seats in waiting halls and platforms
 * - Walking side-by-side as travel companions
 * - Ambient social chatter and cooperative station behaviors
 */

import * as THREE from 'three';
import { RailwayNPC } from './RailwayNPCManager';

export type SocialInteractionType =
  | 'idle_alone'
  | 'greeting'
  | 'waiting_together'
  | 'sharing_seat'
  | 'walking_companion'
  | 'concourse_chat';

export interface SocialPair {
  id: string;
  npcAId: string;
  npcBId: string;
  type: SocialInteractionType;
  timer: number;
  maxDuration: number;
  topic: string;
  gesturePhase: number;
}

export interface AmbientSocialBubble {
  id: string;
  npcId: string;
  speakerName: string;
  text: string;
  worldPos: THREE.Vector3;
  remainingSeconds: number;
}

export class NPCSocialAI {
  private activePairs: Map<string, SocialPair> = new Map();
  private recentInteractions: Map<string, number> = new Map(); // cooldown tracker
  private ambientBubbles: AmbientSocialBubble[] = [];
  private socialLog: Array<{ timestamp: string; text: string }> = [];

  private readonly GREETING_COOLDOWN = 28.0; // seconds before 2 NPCs can re-greet
  private readonly PROXIMITY_THRESHOLD = 3.2; // meters

  private static readonly CONVERSATION_TOPICS = [
    'discussing the on-time schedule of Train 01 Rajdhani Express',
    'admiring the Vande Bharat aerodynamic nose on Platform 2',
    'sharing a cup of hot chai from the station kiosk',
    'checking departure countdown on the overhead FIDS board',
    'comparing AC 3-Tier and Sleeper coach travel accommodations',
    'discussing vaccine transport safety to Northern Apex Stop',
    'talking about mountain weather and catenary power reliability',
    'recommending the dining lounge in Car 3 of the Highland Mail',
    'enjoying the view of the valley from the upper skywalk bridge',
    'waiting patiently for boarding call at Platform 4',
  ];

  private static readonly AMBIENT_CHATS: Record<string, string[]> = {
    greeting: [
      'Good day! Are you catching the Rajdhani Express?',
      'Hello there! Fine weather for a mountain rail journey.',
      'Namaste! Platforms are looking spotless today.',
      'Greetings! Heading down to Riverbend Depot too?',
      'Safe travels! The Vande Bharat departs shortly.',
    ],
    waiting_together: [
      'The countdown says under three minutes now.',
      'I heard the catenary voltage is steady at 25kV today.',
      'The observation lounge at the rear has the best view.',
      'Make sure you check your coach number on the platform display.',
      'These automated turnstiles made entry so fast!',
    ],
    sharing_seat: [
      'Mind if I take this seat? Thanks kindly.',
      'These station benches are quite comfortable.',
      'Just resting my feet before the climb to the skywalk.',
      'Have you tried the chai from the ground floor stall?',
      'The train arrived right on the scheduled minute.',
    ],
    concourse_chat: [
      'Let us take the glass elevator to the food court on Level 1.',
      'The escalators lead straight to the platform skywalk.',
      'Did you get your ticket from the TVM counter?',
      'IRCTC food court is serving fresh meals right now.',
    ],
  };

  public update(delta: number, npcs: RailwayNPC[]): void {
    const activeNpcMap = new Map<string, RailwayNPC>();
    for (const npc of npcs) {
      activeNpcMap.set(npc.profile.id, npc);
    }

    // 1. Update cooldown timers
    for (const [key, cd] of this.recentInteractions) {
      const nextCd = cd - delta;
      if (nextCd <= 0) {
        this.recentInteractions.delete(key);
      } else {
        this.recentInteractions.set(key, nextCd);
      }
    }

    // 2. Update and clean active social pairs
    const pairsToRemove: string[] = [];
    for (const [pairKey, pair] of this.activePairs) {
      const npcA = activeNpcMap.get(pair.npcAId);
      const npcB = activeNpcMap.get(pair.npcBId);

      if (!npcA || !npcB) {
        pairsToRemove.push(pairKey);
        continue;
      }

      pair.timer += delta;
      pair.gesturePhase += delta * 2.2;

      // Calculate distance
      const dist = npcA.group.position.distanceTo(npcB.group.position);

      // Break interaction if NPCs walked far apart or timer expired
      if (dist > this.PROXIMITY_THRESHOLD * 1.8 || pair.timer >= pair.maxDuration) {
        pairsToRemove.push(pairKey);
        continue;
      }

      // Execute social behavior animation & orientation
      this.applySocialBehavior(pair, npcA, npcB, delta);
    }

    for (const key of pairsToRemove) {
      this.activePairs.delete(key);
    }

    // 3. Scan for new social pairings among nearby NPCs
    for (let i = 0; i < npcs.length; i++) {
      for (let j = i + 1; j < npcs.length; j++) {
        const a = npcs[i];
        const b = npcs[j];

        // Skip if already in an active pair
        const pairKey = `${a.profile.id}_${b.profile.id}`;
        const reverseKey = `${b.profile.id}_${a.profile.id}`;
        if (this.activePairs.has(pairKey) || this.activePairs.has(reverseKey)) continue;
        if (this.recentInteractions.has(pairKey) || this.recentInteractions.has(reverseKey)) continue;

        // Skip if either NPC is inside a moving train coach
        if (a.state === 'train_seated' || b.state === 'train_seated') continue;

        const dist = a.group.position.distanceTo(b.group.position);
        if (dist <= this.PROXIMITY_THRESHOLD) {
          // Determine interaction type
          let interactionType: SocialInteractionType = 'greeting';

          if (a.state === 'station_sitting' && b.state === 'station_sitting') {
            interactionType = 'sharing_seat';
          } else if (a.state === 'station_sitting' || b.state === 'station_sitting') {
            interactionType = 'concourse_chat';
          } else if (dist < 2.0 && a.state === 'station_roaming' && b.state === 'station_roaming') {
            interactionType = Math.random() < 0.5 ? 'waiting_together' : 'greeting';
          }

          const duration = interactionType === 'sharing_seat' ? 35 : interactionType === 'waiting_together' ? 18 : 8;
          const randomTopic = NPCSocialAI.CONVERSATION_TOPICS[Math.floor(Math.random() * NPCSocialAI.CONVERSATION_TOPICS.length)];

          const newPair: SocialPair = {
            id: pairKey,
            npcAId: a.profile.id,
            npcBId: b.profile.id,
            type: interactionType,
            timer: 0,
            maxDuration: duration,
            topic: randomTopic,
            gesturePhase: 0,
          };

          this.activePairs.set(pairKey, newPair);
          this.recentInteractions.set(pairKey, this.GREETING_COOLDOWN);

          // Add to social log
          const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          this.socialLog.unshift({
            timestamp: timeStr,
            text: `${a.profile.name} and ${b.profile.name}: ${interactionType.replace('_', ' ')} (${randomTopic})`,
          });
          if (this.socialLog.length > 25) this.socialLog.pop();

          // Spawn ambient chat bubble
          this.triggerSocialBubble(a, b, interactionType);
        }
      }
    }

    // 4. Update ambient chat bubbles
    for (let k = this.ambientBubbles.length - 1; k >= 0; k--) {
      const b = this.ambientBubbles[k];
      b.remainingSeconds -= delta;
      if (b.remainingSeconds <= 0) {
        this.ambientBubbles.splice(k, 1);
      }
    }
  }

  private applySocialBehavior(pair: SocialPair, a: RailwayNPC, b: RailwayNPC, delta: number): void {
    const dirAB = new THREE.Vector3().subVectors(b.group.position, a.group.position).normalize();
    const dirBA = new THREE.Vector3().subVectors(a.group.position, b.group.position).normalize();

    const targetYawA = Math.atan2(dirAB.x, dirAB.z);
    const targetYawB = Math.atan2(dirBA.x, dirBA.z);

    if (pair.type === 'greeting') {
      // Rotate slightly toward each other
      a.targetYaw = targetYawA;
      b.targetYaw = targetYawB;

      // Friendly wave gesture with right arm
      if (pair.timer < 3.5 && a.rightArm) {
        const wave = Math.sin(pair.gesturePhase * 3.5) * 0.45;
        a.rightArm.rotation.x = -1.2 + wave;
        a.rightArm.rotation.z = -0.3;
      }
      if (pair.timer > 1.2 && pair.timer < 4.2 && b.rightArm) {
        const wave = Math.sin(pair.gesturePhase * 3.5) * 0.45;
        b.rightArm.rotation.x = -1.2 + wave;
        b.rightArm.rotation.z = -0.3;
      }

      // Slight head nod
      if (a.headMesh) {
        a.headMesh.rotation.x = Math.sin(pair.gesturePhase * 1.5) * 0.12;
      }
      if (b.headMesh) {
        b.headMesh.rotation.x = Math.cos(pair.gesturePhase * 1.5) * 0.12;
      }
    } else if (pair.type === 'sharing_seat') {
      // Sitting together on bench: subtle casual head tilt towards each other
      if (a.headMesh) a.headMesh.rotation.y = 0.28;
      if (b.headMesh) b.headMesh.rotation.y = -0.28;

      // Conversational hand gestures
      if (a.leftArm && Math.sin(pair.gesturePhase) > 0.3) {
        a.leftArm.rotation.x = -0.6 + Math.sin(pair.gesturePhase * 2.0) * 0.15;
      }
    } else if (pair.type === 'waiting_together' || pair.type === 'concourse_chat') {
      a.targetYaw = THREE.MathUtils.lerp(a.yaw, targetYawA, 0.05);
      b.targetYaw = THREE.MathUtils.lerp(b.yaw, targetYawB, 0.05);

      // Alternating speaking gesture
      const speakerIsA = Math.floor(pair.timer / 4.0) % 2 === 0;
      const speaker = speakerIsA ? a : b;
      if (speaker.rightArm) {
        speaker.rightArm.rotation.x = -0.8 + Math.sin(pair.gesturePhase * 2.5) * 0.2;
      }
      if (speaker.headMesh) {
        speaker.headMesh.rotation.x = Math.sin(pair.gesturePhase * 3.0) * 0.08;
      }
    }
  }

  private triggerSocialBubble(a: RailwayNPC, b: RailwayNPC, type: SocialInteractionType): void {
    const chats = NPCSocialAI.AMBIENT_CHATS[type] || NPCSocialAI.AMBIENT_CHATS.greeting;
    const text = chats[Math.floor(Math.random() * chats.length)];
    const speaker = Math.random() < 0.5 ? a : b;

    const pos = speaker.group.position.clone();
    pos.y += 2.1; // Float above head

    this.ambientBubbles.push({
      id: `bubble_${Date.now()}_${Math.random()}`,
      npcId: speaker.profile.id,
      speakerName: speaker.profile.name,
      text,
      worldPos: pos,
      remainingSeconds: 5.5,
    });

    if (this.ambientBubbles.length > 6) {
      this.ambientBubbles.shift();
    }
  }

  public getActivePairsCount(): number {
    return this.activePairs.size;
  }

  public getSocialLog(): Array<{ timestamp: string; text: string }> {
    return this.socialLog;
  }

  public getAmbientBubbles(): AmbientSocialBubble[] {
    return this.ambientBubbles;
  }
}
