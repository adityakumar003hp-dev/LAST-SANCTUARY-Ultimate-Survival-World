import * as THREE from 'three';
import { GameEngine } from '../GameEngine';
import { TownLifeManager } from './TownLifeManager';
import { StoryCompanionManager } from './StoryCompanionManager';
import { MeteoriteImpactManager } from './MeteoriteImpactManager';
import { InfectionOutbreakManager } from './InfectionOutbreakManager';
import { ShelterManager } from './ShelterManager';
import { CinematicCameraManager } from './CinematicCameraManager';
import {
  ProloguePhase,
  PrologueSubtitle,
  PrologueSaveData,
  OpeningEventId,
  StoryDay,
  OpeningStoryState,
} from '../../types/prologue';
import { soundEngine } from '../../utils/audio';
import { getTerrainHeight } from '../Terrain';
import { ResearchComplexManager } from '../base/ResearchComplexManager';

export interface PrologueCallbacks {
  onSubtitleChange: (subtitle: PrologueSubtitle | null) => void;
  onPhaseChange: (phase: ProloguePhase) => void;
  onTitleBanner: (banner: { title: string; subtitle: string; day: string } | null) => void;
  onObjectiveUpdate: (objective: string | null) => void;
}

export class PrologueManager {
  public engine: GameEngine;
  public phase: ProloguePhase = 'D1_E01_NEW_MORNING';
  public isCompleted: boolean = false;
  public callbacks: PrologueCallbacks;

  // Sub-managers
  public townMgr: TownLifeManager;
  public companionMgr: StoryCompanionManager;
  public meteorMgr: MeteoriteImpactManager;
  public outbreakMgr: InfectionOutbreakManager;
  public shelterMgr: ShelterManager;
  public cinematicCam: CinematicCameraManager;
  public researchComplex: ResearchComplexManager;

  // Canonical 20 Opening Events State Machine
  public currentEventId: OpeningEventId = 'D1_E01_NEW_MORNING';
  public completedEventIds: OpeningEventId[] = [];
  public currentDay: StoryDay = 1;
  public optionalObjectivesCompleted: string[] = [];
  public meteoriteImpactTriggered: boolean = false;
  public firstInfectionDiscovered: boolean = false;
  public cityOutbreakStarted: boolean = false;
  public cityEscapeCompleted: boolean = false;
  public starterBaseEstablished: boolean = false;
  public friendStoryFlags: Record<string, string[]> = {
    marcus: [],
    chloe: [],
    maya: [],
    rohan: [],
  };
  public lastSafeCheckpointId: string = 'D1_E01_NEW_MORNING';

  // Timers & Subtitle State
  private phaseTimer: number = 0;
  private dialogueStep: number = 0;
  private currentSubtitle: PrologueSubtitle | null = null;
  private currentSubtitleTimer: number = 0;

  // Backward compatibility with legacy 13 chapters and task objects
  public chapter: number = 1;
  public day: number = 1;
  public friendsMet = { marcus: false, chloe: false, maya: false, rohan: false };
  public apartmentInspected = { phone: false, fridge: false, window: false, armory: false, pool: false, tv: false };
  public cityTasks = { market: false, cafe: false, park: false, broadcast: false, escapeHighway: false };
  public baseTasks = {
    generator: false,
    medical: false,
    gate: false,
    storage: false,
    friendsTalked: 0,
  };

  // Base Compound Positions (Starter Base 1km east along ridge at 954, 22)
  public readonly baseCompoundCenter = new THREE.Vector3(954, 0, 22);
  public readonly baseGatePos = new THREE.Vector3(954, 0, 34);

  constructor(engine: GameEngine, callbacks: PrologueCallbacks, initialData?: PrologueSaveData) {
    this.engine = engine;
    this.callbacks = callbacks;

    // Instantiate sub-managers
    this.townMgr = new TownLifeManager(engine.scene);
    this.companionMgr = new StoryCompanionManager(engine.scene);
    this.meteorMgr = new MeteoriteImpactManager(engine.scene);
    this.outbreakMgr = new InfectionOutbreakManager(engine.zombieMgr, this.townMgr);
    this.shelterMgr = new ShelterManager(engine.scene);
    this.cinematicCam = new CinematicCameraManager(engine.camera);
    // Authored science campus inside the protected Outpost 7 military compound.
    this.researchComplex = new ResearchComplexManager(engine.scene, 974, 1);

    if (initialData && initialData.isCompleted) {
      this.restoreCompletedState(initialData);
    } else if (initialData && (initialData.currentEventId || initialData.chapter)) {
      this.restoreStoryState(initialData);
    } else {
      this.initNewStory();
    }
  }

  // ==========================================
  // STORY INITIALIZATION (DAY 1 - EVENT 01)
  // ==========================================
  private initNewStory() {
    this.currentDay = 1;
    this.day = 1;
    this.chapter = 1;
    this.isCompleted = false;
    this.completedEventIds = [];
    this.currentEventId = 'D1_E01_NEW_MORNING';
    this.phase = 'D1_E01_NEW_MORNING';

    this.engine.gameTimeMinutes = 420; // 07:00 AM sunny morning
    this.engine.dayCount = 1;

    // Optimize chunk radius during urban events
    this.engine.chunkManager.setStreamingRadius(1);

    // The game begins with the player sleeping in bed in Floor 1 bedroom (-31.5, 0.65, 41.8)
    const bedMattressPos = new THREE.Vector3(-31.5, 0.65, 41.8);
    const wakeUpStandPos = new THREE.Vector3(-29.8, 0.245, 41.8);
    this.engine.player.position.copy(bedMattressPos);
    this.engine.player.avatarGroup.position.copy(bedMattressPos);
    this.engine.player.velocity?.set(0, 0, 0);
    this.engine.player.yaw = Math.PI / 2;
    this.engine.player.isGrounded = true;

    // Player begins the game sleeping peacefully in bed
    this.engine.player.startSleeping(7.0, wakeUpStandPos);

    // Initial camera focuses on the player sleeping in bed inside Floor 1 bedroom
    this.engine.camera.position.set(-29.8, 2.15, 44.0);
    this.engine.camera.lookAt(-31.5, 0.7, 41.8);

    // Friends start waiting at café table
    this.companionMgr.teleportTo('marcus', [-10, 0, 16], Math.PI / 4);
    this.companionMgr.teleportTo('chloe', [-11.5, 0, 17.5], 0);
    this.companionMgr.teleportTo('maya', [-9, 0, 18], -Math.PI / 3);
    this.companionMgr.teleportTo('rohan', [-7.2, 0, 19.4], Math.PI / 2);
    this.companionMgr.setAllFollowing(false);

    // Initial cinematic sweep and banner
    this.cinematicCam.playTrack('town_establishing', 5.5);
    this.callbacks.onTitleBanner({
      title: 'THE BEGINNING OF THE END',
      subtitle: 'DAY 1: THE LAST NORMAL DAY',
      day: 'DAY 1 — 07:00 AM',
    });
    this.setSubtitle({
      speaker: 'Narrator',
      text: 'Oakridge Valley. Day 1, 07:00 AM. A quiet summer morning in the city.',
      duration: 5.0,
    });
    this.callbacks.onPhaseChange(this.phase);
    this.callbacks.onObjectiveUpdate('Mission: WAKE UP — Get ready for the day and check your phone [E]');

    // Objective beacon on bedroom table / phone
    this.engine.objectiveNavigator.setObjective({
      id: 'story_d1_e01_wake',
      title: 'A NEW MORNING',
      instruction: 'Get out of bed and check your phone on the coffee table.',
      destinationName: 'Living Room Table',
      position: [-26, 0.4, 36.8],
      arrivalRadius: 2.5,
    });
  }

  // ==========================================
  // MAIN UPDATE LOOP FOR ALL 20 EVENTS
  // ==========================================
  public update(delta: number) {
    // Subtitle decay timer
    if (this.currentSubtitle) {
      this.currentSubtitleTimer -= delta;
      if (this.currentSubtitleTimer <= 0) {
        this.currentSubtitle = null;
        this.callbacks.onSubtitleChange(null);
      }
    }

    // Continuously animate science facilities (e.g. meteor rotation and warning lights)
    this.researchComplex?.update(delta);

    if (this.isCompleted) {
      this.shelterMgr.update(delta);
      this.townMgr.update(delta, this.engine.isNight, this.outbreakMgr.isOutbreakActive, this.engine.player.position, this.engine.camera.position);
      this.companionMgr.update(delta, this.engine.player.position, false, this.townMgr.apartmentBuilding);
      // Keep the outbreak simulation alive after the campaign unlocks free roam.
      if (this.outbreakMgr.isOutbreakActive) this.outbreakMgr.update(delta, this.engine.player.position);
      return;
    }

    this.phaseTimer += delta;

    // Update sub-managers
    const isNight = this.engine.isNight;
    const isPanic =
      this.currentEventId === 'D2_E15_METEORITE_IMPACT' ||
      this.currentEventId === 'D2_E16_FIRST_INFECTION' ||
      this.currentEventId === 'D2_E17_CITYWIDE_OUTBREAK' ||
      this.currentEventId === 'D2_E18_CITY_ESCAPE';

    this.townMgr.update(
      delta,
      isNight,
      isPanic,
      this.engine.player.position,
      this.engine.camera.position,
      this.engine.zombieMgr,
      this.engine.wildlifeManager,
      this.engine.aiTrainManager
    );
    this.companionMgr.update(delta, this.engine.player.position, this.currentEventId === 'D2_E18_CITY_ESCAPE', this.townMgr.apartmentBuilding);
    this.shelterMgr.update(delta);

    // Meteor bolide simulation update
    const { impactJustOccurred, screenShake } = this.meteorMgr.update(delta);
    if (screenShake > 0) {
      this.engine.player.shakeCamera(screenShake);
    }
    if (impactJustOccurred) {
      this.onMeteorImpacted();
    }

    if (this.outbreakMgr.isOutbreakActive) {
      this.outbreakMgr.update(delta, this.engine.player.position);
    }

    this.cinematicCam.update(delta);

    // ------------------------------------------
    // THE 20 CANONICAL STORYLINE EVENTS DISPATCHER
    // ------------------------------------------
    switch (this.currentEventId) {
      // EVENT 01: A NEW MORNING
      case 'D1_E01_NEW_MORNING': {
        if (this.phaseTimer > 5.5 && this.dialogueStep === 0) {
          this.dialogueStep = 1;
          this.cinematicCam.playTrack('apartment_approach', 3.5);
        } else if (this.phaseTimer > 9.0 && this.dialogueStep === 1) {
          this.dialogueStep = 2;
          this.cinematicCam.endCinematic();
          this.callbacks.onTitleBanner(null);
          this.setSubtitle({
            speaker: 'Player',
            text: '7:00 AM. Sunlight feels warm. Let’s get ready and explore the place before meeting up.',
            duration: 4.5,
          });
          this.startEvent('D1_E02_HOME_SWEET_HOME');
        }
        break;
      }

      // EVENT 02: HOME SWEET HOME (Explore 5-floor apartment)
      case 'D1_E02_HOME_SWEET_HOME': {
        // If player explores rooms, inspects fridge or steps toward coffee table / door
        const dPhone = Math.hypot(this.engine.player.position.x - (-26), this.engine.player.position.z - 36.8);
        const dDoor = Math.hypot(this.engine.player.position.x - (-26), this.engine.player.position.z - 31);
        if (dPhone < 2.0 || dDoor < 2.5 || this.phaseTimer > 35.0) {
          this.startEvent('D1_E03_FRIEND_MESSAGE');
        }
        break;
      }

      // EVENT 03: A MESSAGE FROM FRIENDS
      case 'D1_E03_FRIEND_MESSAGE': {
        // Player steps out the apartment front door
        const dOutside = Math.hypot(this.engine.player.position.x - (-26), this.engine.player.position.z - 30);
        if (dOutside < 2.8) {
          this.startEvent('D1_E04_CITY_MORNING');
        }
        break;
      }

      // EVENT 04: MORNING IN THE CITY
      case 'D1_E04_CITY_MORNING': {
        // Approaching Corner Roast Café at (-14, 0, -60)
        const distToCafe = Math.hypot(
          this.engine.player.position.x - (-14),
          this.engine.player.position.z - (-60)
        );
        if (distToCafe < 6.5) {
          this.startEvent('D1_E05_CAFE_MEETING');
        }
        break;
      }

      // EVENT 05: THE MEETING POINT
      case 'D1_E05_CAFE_MEETING': {
        if (this.dialogueStep === 0 && this.phaseTimer > 0.5) {
          this.dialogueStep = 1;
          this.setSubtitle({
            speaker: 'Marcus Cole',
            role: 'Saviour',
            text: 'Finally! I thought you were going to sleep through the whole morning.',
            duration: 4.0,
          });
        } else if (this.dialogueStep === 1 && this.phaseTimer > 4.5) {
          this.dialogueStep = 2;
          this.setSubtitle({
            speaker: 'Player',
            text: 'Traffic was crawling on Main Avenue. Good to see you all.',
            duration: 3.5,
          });
        } else if (this.dialogueStep === 2 && this.phaseTimer > 8.0) {
          this.startEvent('D1_E06_FOUR_FRIENDS');
        }
        break;
      }

      // EVENT 06: FOUR FRIENDS TOGETHER
      case 'D1_E06_FOUR_FRIENDS': {
        if (this.dialogueStep === 0 && this.phaseTimer > 0.5) {
          this.dialogueStep = 1;
          this.setSubtitle({
            speaker: 'Chloe Miller',
            role: 'Explorer',
            text: 'I tested the Pine Ridge ham repeater this morning. Power was jumpy, but signal holds.',
            duration: 4.5,
          });
        } else if (this.dialogueStep === 1 && this.phaseTimer > 5.0) {
          this.dialogueStep = 2;
          this.setSubtitle({
            speaker: 'Dr. Maya Lin',
            role: 'Doctor',
            text: 'Can we just enjoy one peaceful, normal weekend? The clinic was delightfully quiet all week.',
            duration: 4.5,
          });
        } else if (this.dialogueStep === 2 && this.phaseTimer > 9.5) {
          this.dialogueStep = 3;
          this.setSubtitle({
            speaker: 'Marcus Cole',
            role: 'Saviour',
            text: 'Agreed! Let’s finish coffee and take a walk over to Town Square Park.',
            duration: 4.0,
          });
        } else if (this.dialogueStep === 3 && this.phaseTimer > 13.5) {
          this.startEvent('D1_E07_PARK');
        }
        break;
      }

      // EVENT 07: A DAY AT THE PARK
      case 'D1_E07_PARK': {
        const dParkFountain = Math.hypot(
          this.engine.player.position.x - 20,
          this.engine.player.position.z - 18
        );
        if (dParkFountain < 5.5) {
          this.startEvent('D1_E08_STRANGE_NEWS');
        }
        break;
      }

      // EVENT 08: STRANGE NEWS
      case 'D1_E08_STRANGE_NEWS': {
        if (this.dialogueStep === 0 && this.phaseTimer > 1.0) {
          this.dialogueStep = 1;
          soundEngine.playRadioStatic(2.0);
          this.setSubtitle({
            speaker: 'Public Display Broadcast',
            text: '“...Astronomical observatories confirm an unidentified celestial object passing near inner solar orbit. Agencies are monitoring...”',
            duration: 5.5,
          });
        } else if (this.dialogueStep === 1 && this.phaseTimer > 7.0) {
          this.dialogueStep = 2;
          this.setSubtitle({
            speaker: 'Chloe Miller',
            role: 'Explorer',
            text: 'Unidentified celestial body? That explains the electromagnetic interference on my receiver.',
            duration: 4.5,
          });
        } else if (this.dialogueStep === 2 && this.phaseTimer > 12.0) {
          this.dialogueStep = 3;
          this.setSubtitle({
            speaker: 'Marcus Cole',
            role: 'Saviour',
            text: 'Scientists said it’s harmless. The sun is starting to set—let’s head back to the apartment.',
            duration: 4.5,
          });
        } else if (this.dialogueStep === 3 && this.phaseTimer > 16.5) {
          this.startEvent('D1_E09_EVENING');
        }
        break;
      }

      // EVENT 09: EVENING TOGETHER
      case 'D1_E09_EVENING': {
        // Return to apartment living room at (-26, 0, 38)
        const dLivingRoom = Math.hypot(
          this.engine.player.position.x - (-26),
          this.engine.player.position.z - 38
        );
        if (dLivingRoom < 4.0) {
          this.startEvent('D1_E10_LAST_NORMAL_NIGHT');
        }
        break;
      }

      // EVENT 10: ONE LAST PEACEFUL NIGHT
      case 'D1_E10_LAST_NORMAL_NIGHT': {
        // Player approaches bed in F1 bedroom (-30, 0, 41)
        const dBed = Math.hypot(
          this.engine.player.position.x - (-30),
          this.engine.player.position.z - 41
        );
        if (dBed < 3.0) {
          this.callbacks.onObjectiveUpdate('Mission: GET SOME REST — Press [E] on your bed to sleep for Day 2');
        }
        break;
      }

      // EVENT 11: SOMETHING IS WRONG (DAY 2)
      case 'D2_E11_SOMETHING_WRONG': {
        if (this.dialogueStep === 0 && this.phaseTimer > 2.0) {
          this.dialogueStep = 1;
          soundEngine.playRadioStatic(2.0);
          this.setSubtitle({
            speaker: 'Phone Notification',
            text: 'Marcus: "Turn on the TV right now! Emergency services are broadcasting on all frequencies!"',
            duration: 4.5,
          });
        } else if (this.dialogueStep === 1 && this.phaseTimer > 7.0) {
          this.startEvent('D2_E12_EMERGENCY_BROADCAST');
        }
        break;
      }

      // EVENT 12: EMERGENCY BROADCAST
      case 'D2_E12_EMERGENCY_BROADCAST': {
        if (this.dialogueStep === 0 && this.phaseTimer > 1.0) {
          this.dialogueStep = 1;
          this.townMgr.apartmentBuilding.toggleTV();
          soundEngine.playRadioStatic(2.5);
          this.setSubtitle({
            speaker: 'Oakridge Emergency Broadcast',
            text: '“URGENT CIVILIAN ALERT: A massive high-density bolide has entered upper atmospheric descent. Impact corridor projected near Sector 4.”',
            duration: 6.0,
          });
        } else if (this.dialogueStep === 1 && this.phaseTimer > 7.5) {
          this.dialogueStep = 2;
          this.setSubtitle({
            speaker: 'Player',
            text: 'That sound at the door—Marcus and the others must be here!',
            duration: 3.5,
          });
          this.startEvent('D2_E13_FRIENDS_RETURN');
        }
        break;
      }

      // EVENT 13: THE FRIENDS RETURN
      case 'D2_E13_FRIENDS_RETURN': {
        // Wait for player to approach door or talk with Marcus
        const dDoor = Math.hypot(
          this.engine.player.position.x - (-26),
          this.engine.player.position.z - 31
        );
        if (dDoor < 3.2 || this.phaseTimer > 8.0) {
          if (this.dialogueStep === 0) {
            this.dialogueStep = 1;
            this.setSubtitle({
              speaker: 'Marcus Cole',
              role: 'Saviour',
              text: 'We have to get up to the Floor 7 Crown Rooftop to see where it’s coming from!',
              duration: 4.5,
            });
            this.startEvent('D2_E14_SKY_CHANGES');
          }
        }
        break;
      }

      // EVENT 14: THE SKY CHANGES
      case 'D2_E14_SKY_CHANGES': {
        // Player climbs staircase or takes elevator to Floor 7 Crown Sky Palace (y >= 22.0)
        const dRooftop = Math.hypot(
          this.engine.player.position.x - (-26),
          this.engine.player.position.z - 38
        );
        if (this.engine.player.position.y >= 20.5 && dRooftop < 12.5) {
          this.startEvent('D2_E15_METEORITE_IMPACT');
        }
        break;
      }

      // EVENT 15: METEORITE IMPACT CINEMATIC
      case 'D2_E15_METEORITE_IMPACT': {
        if (this.dialogueStep === 0 && this.phaseTimer > 1.2) {
          this.dialogueStep = 1;
          this.cinematicCam.playTrack('sky_observation', 5.0);
          this.meteorMgr.launchMeteorFlight();
          this.setSubtitle({
            speaker: 'Marcus Cole',
            role: 'Saviour',
            text: 'LOOK AT THE SKY! Something is tearing through the clouds right over the eastern ridge!',
            duration: 5.0,
          });
        } else if (this.dialogueStep === 1 && this.phaseTimer > 4.5) {
          this.dialogueStep = 2;
          this.cinematicCam.playTrack('meteor_track', 4.5);
        }
        break;
      }

      // EVENT 16: THE FIRST INFECTION
      case 'D2_E16_FIRST_INFECTION': {
        // Down on street level near sidewalk intersection
        const dStreet = Math.hypot(
          this.engine.player.position.x - 0,
          this.engine.player.position.z - 20
        );
        if (dStreet < 12.0 || this.phaseTimer > 12.0) {
          if (this.dialogueStep === 0) {
            this.dialogueStep = 1;
            this.setSubtitle({
              speaker: 'Dr. Maya Lin',
              role: 'Doctor',
              text: 'Careful! Look at how they’re stumbling... the impact fallout is causing acute neurological seizure. Keep your distance!',
              duration: 5.5,
            });
          } else if (this.dialogueStep === 1 && this.phaseTimer > 6.0) {
            this.startEvent('D2_E17_CITYWIDE_OUTBREAK');
          }
        }
        break;
      }

      // EVENT 17: CITYWIDE OUTBREAK
      case 'D2_E17_CITYWIDE_OUTBREAK': {
        // Head towards East cross street to find route
        const dCrossEast = Math.hypot(
          this.engine.player.position.x - 16,
          this.engine.player.position.z - 0
        );
        if (dCrossEast < 8.0 || this.phaseTimer > 18.0) {
          this.startEvent('D2_E18_CITY_ESCAPE');
        }
        break;
      }

      // EVENT 18: ESCAPE FROM THE CITY
      case 'D2_E18_CITY_ESCAPE': {
        // Escort along highway leading east. Progress checkpoints:
        if (this.engine.player.position.x >= 420 || this.phaseTimer > 45.0) {
          this.startEvent('D2_E19_FINAL_ROAD');
        }
        break;
      }

      // EVENT 19: THE FINAL ROAD
      case 'D2_E19_FINAL_ROAD': {
        // Overlook at (600, 22)
        const dOverlook = Math.hypot(
          this.engine.player.position.x - 600,
          this.engine.player.position.z - 22
        );
        if (dOverlook < 12.0 && this.dialogueStep === 0) {
          this.dialogueStep = 1;
          this.cinematicCam.playTrack('highway_overlook', 6.0);
          this.setSubtitle({
            speaker: 'Marcus Cole',
            role: 'Saviour',
            text: 'Look at the skyline behind us... in less than an hour, the world we knew is gone.',
            duration: 4.5,
          });
        } else if (this.dialogueStep === 1 && this.phaseTimer > 5.0) {
          this.dialogueStep = 2;
          this.setSubtitle({
            speaker: 'Chloe Miller',
            role: 'Explorer',
            text: 'The railway station is our next lead. But first we need to regroup at the apartment compound and make sure everyone is safe.',
            duration: 4.5,
          });
        } else if (this.dialogueStep === 2 && this.phaseTimer > 9.5) {
          this.dialogueStep = 3;
          this.cinematicCam.endCinematic();
          this.setSubtitle({
            speaker: 'Dr. Maya Lin',
            role: 'Doctor',
            text: 'Then that’s where we go. We survive this together.',
            duration: 4.0,
          });
          this.callbacks.onObjectiveUpdate('Mission: RETURN HOME — regroup with all four friends at the apartment compound');
          this.engine.objectiveNavigator.setObjective({
            id: 'story_d2_e19_home',
            title: 'RETURN TO THE COMPOUND',
            instruction: 'Return to your protected apartment compound before nightfall.',
            destinationName: 'Apartment Compound',
            position: [-26, 0.2, 31],
            arrivalRadius: 8.0,
          });
        }

        // Return to the existing apartment compound for the first night. The military installation is a later Day 4 destination.
        const dHome = Math.hypot(
          this.engine.player.position.x - (-26),
          this.engine.player.position.z - 31
        );
        if (dHome < 10.0) {
          this.startEvent('D2_E20_STARTER_BASE');
        }
        break;
      }

      // EVENT 20: FIRST NIGHT TOGETHER — regroup at the existing apartment compound.
      case 'D2_E20_STARTER_BASE': {
        if (this.dialogueStep === 0 && this.phaseTimer > 1.0) {
          this.dialogueStep = 1;
          this.cinematicCam.playCampaignOrbit(this.engine.player.position, 6.0);
          soundEngine.playDawnVictoryChime();
          this.callbacks.onTitleBanner({
            title: 'EVENT 20: FIRST NIGHT TOGETHER',
            subtitle: 'THE APARTMENT COMPOUND — SAFE FOR TONIGHT',
            day: 'DAY 2 — 09:30 AM',
          });
          this.setSubtitle({
            speaker: 'Marcus Cole',
            role: 'Saviour',
            text: 'We made it back together. This compound will keep us safe tonight. Tomorrow we follow Chloe’s railway signal and find out who is still out there.',
            duration: 6.5,
          });
          this.callbacks.onObjectiveUpdate('Mission: FIRST NIGHT TOGETHER — regroup with all four friends and secure the existing apartment compound');
          this.engine.objectiveNavigator.setObjective({
            id: 'story_d2_e20_homecoming',
            title: 'FIRST NIGHT TOGETHER',
            instruction: 'Regroup with Marcus, Chloe, Maya and Rohan inside the apartment compound.',
            destinationName: 'Apartment Compound Courtyard',
            position: [-10, 0.2, 17],
            arrivalRadius: 5.0,
          });
        } else if (this.dialogueStep === 1 && this.phaseTimer > 8.0) {
          this.dialogueStep = 2;
          this.completeCampaign();
        }
        break;
      }
    }
  }

  // ==========================================
  // EVENT LIFECYCLE & TRANSITION CONTROLLER
  // ==========================================
  public startEvent(nextEventId: OpeningEventId) {
    if (this.completedEventIds.includes(nextEventId) && this.currentEventId === nextEventId) {
      return;
    }

    if (!this.completedEventIds.includes(this.currentEventId)) {
      this.completedEventIds.push(this.currentEventId);
    }

    this.currentEventId = nextEventId;
    this.phase = nextEventId;
    this.phaseTimer = 0;
    this.dialogueStep = 0;
    this.lastSafeCheckpointId = nextEventId;
    this.callbacks.onPhaseChange(this.phase);

    // Synchronize event-specific setups
    switch (nextEventId) {
      // --- DAY 1 ---
      case 'D1_E02_HOME_SWEET_HOME': {
        this.chapter = 1;
        this.callbacks.onObjectiveUpdate('Mission: EXPLORE APARTMENT — Inspect fridge, phone, 100-item armory on F3, rooftop pool on F5');
        this.engine.objectiveNavigator.setObjective({
          id: 'story_d1_e02_explore',
          title: 'HOME SWEET HOME',
          instruction: 'Explore your 5-floor modern apartment.',
          destinationName: 'Apartment Living Room',
          position: [-26, 0.4, 38],
          arrivalRadius: 3.5,
        });
        break;
      }

      case 'D1_E03_FRIEND_MESSAGE': {
        this.chapter = 1;
        soundEngine.playUIClick();
        this.callbacks.onTitleBanner({
          title: 'EVENT 03: A MESSAGE FROM FRIENDS',
          subtitle: 'INCOMING TEXT NOTIFICATION',
          day: 'DAY 1 — 07:45 AM',
        });
        setTimeout(() => this.callbacks.onTitleBanner(null), 3500);

        this.setSubtitle({
          speaker: 'Marcus Cole',
          role: 'Saviour',
          text: '“Hey! Don’t sleep in. Chloe and Maya are meeting us at Corner Roast Café at 9 sharp.”',
          duration: 4.5,
        });
        this.callbacks.onObjectiveUpdate('Mission: MEET FRIENDS — Meet Marcus, Chloe, Maya, and Rohan at Corner Roast Café');
        this.engine.objectiveNavigator.setObjective({
          id: 'story_d1_e03_cafe',
          title: 'MEETING THE CREW',
          instruction: 'Leave the apartment and meet all four friends at Corner Roast Café.',
          destinationName: 'Corner Roast Café',
          position: [-14, 0.2, -60],
          arrivalRadius: 5.5,
        });
        break;
      }

      case 'D1_E04_CITY_MORNING': {
        this.chapter = 2;
        this.callbacks.onTitleBanner({
          title: 'EVENT 04: MORNING IN THE CITY',
          subtitle: 'A PEACEFUL NEIGHBOURHOOD',
          day: 'DAY 1 — 08:30 AM',
        });
        setTimeout(() => this.callbacks.onTitleBanner(null), 3500);

        this.setSubtitle({
          speaker: 'Player',
          text: 'Fresh air. Cars moving along Main Avenue and birds singing in the trees. Let’s head to the café.',
          duration: 4.5,
        });
        this.callbacks.onObjectiveUpdate('Mission: EXPLORE NEIGHBOURHOOD — Walk down Main Avenue to Corner Roast Café');
        this.engine.objectiveNavigator.setObjective({
          id: 'story_d1_e04_walk_cafe',
          title: 'TO THE CAFÉ',
          instruction: 'Walk down Main Avenue to Corner Roast Café.',
          destinationName: 'Corner Roast Café',
          position: [-14, 0.2, -60],
          arrivalRadius: 4.5,
        });
        break;
      }

      case 'D1_E05_CAFE_MEETING': {
        this.chapter = 3;
        this.friendsMet.marcus = true;
        this.friendsMet.chloe = true;
        this.friendsMet.maya = true;
        this.friendsMet.rohan = true;
        this.callbacks.onTitleBanner({
          title: 'EVENT 05: THE MEETING POINT',
          subtitle: 'CORNER ROAST CAFÉ',
          day: 'DAY 1 — 09:15 AM',
        });
        setTimeout(() => this.callbacks.onTitleBanner(null), 3500);
        this.callbacks.onObjectiveUpdate('Mission: CAFÉ REUNION — Talk to Marcus Cole at the café table');
        this.engine.objectiveNavigator.setObjective({
          id: 'story_d1_e05_talk',
          title: 'TALK TO MARCUS',
          instruction: 'Join your friends at the outdoor patio table.',
          destinationName: 'Café Patio Table',
          position: [-9.2, 0.2, -57],
          arrivalRadius: 3.5,
        });
        break;
      }

      case 'D1_E06_FOUR_FRIENDS': {
        this.chapter = 3;
        this.callbacks.onObjectiveUpdate('Mission: SPEND TIME TOGETHER — Chat with all four friends at the café');
        break;
      }

      case 'D1_E07_PARK': {
        this.chapter = 4;
        this.companionMgr.setAllFollowing(true);
        this.callbacks.onTitleBanner({
          title: 'EVENT 07: A DAY AT THE PARK',
          subtitle: 'TOWN SQUARE FOUNTAIN',
          day: 'DAY 1 — 11:00 AM',
        });
        setTimeout(() => this.callbacks.onTitleBanner(null), 3500);
        this.callbacks.onObjectiveUpdate('Mission: VISIT PARK — Walk with your friends to Town Square Park fountain');
        this.engine.objectiveNavigator.setObjective({
          id: 'story_d1_e07_fountain',
          title: 'TOWN SQUARE PARK',
          instruction: 'Visit the central park fountain with Marcus, Chloe, Maya, and Rohan.',
          destinationName: 'Park Fountain',
          position: [20, 0.2, 18],
          arrivalRadius: 4.5,
        });
        break;
      }

      case 'D1_E08_STRANGE_NEWS': {
        this.chapter = 4;
        this.cityTasks.park = true;
        this.cityTasks.broadcast = true;
        this.callbacks.onTitleBanner({
          title: 'EVENT 08: STRANGE NEWS',
          subtitle: 'DEEP SPACE ANOMALY REPORTED',
          day: 'DAY 1 — 02:00 PM',
        });
        setTimeout(() => this.callbacks.onTitleBanner(null), 3500);
        this.callbacks.onObjectiveUpdate('Mission: WATCH NEWS — Listen to the public broadcast report with your friends');
        break;
      }

      case 'D1_E09_EVENING': {
        this.chapter = 5;
        this.engine.gameTimeMinutes = 1110; // 06:30 PM Sunset golden hour
        this.callbacks.onTitleBanner({
          title: 'EVENT 09: EVENING TOGETHER',
          subtitle: 'GOLDEN HOUR OVER OAKRIDGE',
          day: 'DAY 1 — 06:30 PM',
        });
        setTimeout(() => this.callbacks.onTitleBanner(null), 3500);
        this.callbacks.onObjectiveUpdate('Mission: RETURN HOME — Head back to your apartment living room with your friends');
        this.engine.objectiveNavigator.setObjective({
          id: 'story_d1_e09_return',
          title: 'RETURN TO APARTMENT',
          instruction: 'Walk back to your apartment living room with your friends.',
          destinationName: 'Apartment Living Room',
          position: [-26, 0.2, 38],
          arrivalRadius: 3.8,
        });
        break;
      }

      case 'D1_E10_LAST_NORMAL_NIGHT': {
        this.chapter = 5;
        this.engine.gameTimeMinutes = 1260; // 09:00 PM
        this.companionMgr.setAllFollowing(false);
        this.callbacks.onTitleBanner({
          title: 'EVENT 10: ONE LAST PEACEFUL NIGHT',
          subtitle: 'TIME TO REST',
          day: 'DAY 1 — 09:00 PM',
        });
        setTimeout(() => this.callbacks.onTitleBanner(null), 3500);
        this.setSubtitle({
          speaker: 'Marcus Cole',
          role: 'Saviour',
          text: 'Great day today. Get some rest tonight in your bed—we have that ridge hike tomorrow.',
          duration: 4.5,
        });
        this.callbacks.onObjectiveUpdate('Mission: SLEEP IN BED — Interact with your bed [E] on Floor 1 to rest');
        this.engine.objectiveNavigator.setObjective({
          id: 'story_d1_e10_bed',
          title: 'REST IN BED',
          instruction: 'Sleep in your bed on Floor 1 to wake up for Day 2.',
          destinationName: 'Bedroom Bed',
          position: [-30, 0.4, 41],
          arrivalRadius: 2.5,
        });
        break;
      }

      // --- DAY 2 ---
      case 'D2_E11_SOMETHING_WRONG': {
        this.currentDay = 2;
        this.day = 2;
        this.chapter = 6;
        this.engine.dayCount = 2;
        this.engine.gameTimeMinutes = 480; // 08:00 AM
        soundEngine.playDawnVictoryChime();
        this.callbacks.onTitleBanner({
          title: 'DAY 2 — THE BEGINNING OF THE END',
          subtitle: 'EVENT 11: SOMETHING IS WRONG',
          day: 'DAY 2 — 08:00 AM',
        });
        setTimeout(() => this.callbacks.onTitleBanner(null), 4000);

        // Wake in the clear bedroom aisle, away from the bed and TV colliders.
        this.engine.player.position.set(-32.5, 0.20, 36.7);
        this.engine.player.avatarGroup.position.copy(this.engine.player.position);
        this.engine.player.velocity?.set(0, 0, 0);
        this.engine.player.yaw = 0;

        this.callbacks.onObjectiveUpdate('Mission: CHECK PHONE — Unusual emergency sirens heard outside. Check your phone or TV [E]');
        this.engine.objectiveNavigator.setObjective({
          id: 'story_d2_e11_tv',
          title: 'CHECK LIVING ROOM TV',
          instruction: 'Go to the living room and turn on the television [E].',
          destinationName: 'Living Room TV',
          position: [-31.5, 1.5, 38],
          arrivalRadius: 2.8,
        });
        break;
      }

      case 'D2_E12_EMERGENCY_BROADCAST': {
        this.chapter = 6;
        this.callbacks.onObjectiveUpdate('Mission: EMERGENCY BROADCAST — Watch the emergency alert on your TV');
        break;
      }

      case 'D2_E13_FRIENDS_RETURN': {
        this.chapter = 6;
        // Friends enter through the property front entrance gate (-26, 0, 16) and travel up the walkway
        this.companionMgr.teleportTo('marcus', [-26, 0, 16], 0);
        this.companionMgr.teleportTo('chloe', [-24.8, 0, 15], 0);
        this.companionMgr.teleportTo('maya', [-27.2, 0, 15], 0);
        this.companionMgr.setAllFollowing(true);

        this.callbacks.onTitleBanner({
          title: 'EVENT 13: THE FRIENDS RETURN',
          subtitle: 'PANIC IN THE STREETS',
          day: 'DAY 2 — 08:10 AM',
        });
        setTimeout(() => this.callbacks.onTitleBanner(null), 3500);
        this.callbacks.onObjectiveUpdate('Mission: REGROUP — Meet Marcus, Chloe, Maya, and Rohan at the apartment front door');
        this.engine.objectiveNavigator.setObjective({
          id: 'story_d2_e13_door',
          title: 'MEET AT FRONT DOOR',
          instruction: 'Open the front entrance door [E] to let your friends inside.',
          destinationName: 'Apartment Front Door',
          position: [-26, 0.2, 31],
          arrivalRadius: 3.2,
        });
        break;
      }

      case 'D2_E14_SKY_CHANGES': {
        this.chapter = 7;
        this.companionMgr.setAllFollowing(true);
        this.callbacks.onTitleBanner({
          title: 'EVENT 14: THE SKY CHANGES',
          subtitle: 'ROOFTOP OBSERVATION',
          day: 'DAY 2 — 08:15 AM',
        });
        setTimeout(() => this.callbacks.onTitleBanner(null), 3500);
        this.callbacks.onObjectiveUpdate('Mission: CLIMB TO CROWN ROOFTOP — Take the staircase or elevator up to Floor 7 Crown Sky Palace');
        this.engine.objectiveNavigator.setObjective({
          id: 'story_d2_e14_rooftop',
          title: 'FLOOR 7 CROWN ROOFTOP',
          instruction: 'Take the staircase or main elevator to Floor 7 Crown Sky Palace with your friends.',
          destinationName: 'Crown Sky Palace Deck',
          position: [-26, 22.1, 38],
          arrivalRadius: 5.5,
        });
        break;
      }

      case 'D2_E15_METEORITE_IMPACT': {
        this.chapter = 7;
        this.meteoriteImpactTriggered = true;
        this.callbacks.onTitleBanner({
          title: 'EVENT 15: METEORITE IMPACT',
          subtitle: 'SECTOR 4 GROUND ZERO',
          day: 'DAY 2 — 08:18 AM',
        });
        setTimeout(() => this.callbacks.onTitleBanner(null), 4500);
        break;
      }

      case 'D2_E16_FIRST_INFECTION': {
        this.chapter = 8;
        this.cinematicCam.endCinematic();
        if (this.engine.player) {
          this.engine.player.avatarGroup.visible = this.engine.player.cameraView !== 'first';
        }
        this.firstInfectionDiscovered = true;
        this.companionMgr.setAllFollowing(true);
        this.callbacks.onTitleBanner({
          title: 'EVENT 16: THE FIRST INFECTION',
          subtitle: 'UNUSUAL BEHAVIOR OBSERVED',
          day: 'DAY 2 — 08:25 AM',
        });
        setTimeout(() => this.callbacks.onTitleBanner(null), 3500);
        this.callbacks.onObjectiveUpdate('Mission: DESCEND TO STREET — Go down the stairs to street level and investigate cautiously');
        this.engine.objectiveNavigator.setObjective({
          id: 'story_d2_e16_street',
          title: 'STREET LEVEL',
          instruction: 'Descend to the street level with your friends.',
          destinationName: 'Sidewalk Intersection',
          position: [0, 0.2, 20],
          arrivalRadius: 5.5,
        });
        break;
      }

      case 'D2_E17_CITYWIDE_OUTBREAK': {
        this.chapter = 8;
        this.cityOutbreakStarted = true;
        this.outbreakMgr.triggerOutbreak(this.meteorMgr.craterCenter);
        this.callbacks.onTitleBanner({
          title: 'EVENT 17: CITYWIDE OUTBREAK',
          subtitle: 'FIND A SAFE ROUTE',
          day: 'DAY 2 — 08:35 AM',
        });
        setTimeout(() => this.callbacks.onTitleBanner(null), 3500);
        this.callbacks.onObjectiveUpdate('Mission: AVOID BLOCKED AVENUES — Cut through the East Cross Street toward the highway');
        this.engine.objectiveNavigator.setObjective({
          id: 'story_d2_e17_bypass',
          title: 'EAST CROSS STREET',
          instruction: 'Cut through East Cross Street toward the highway corridor.',
          destinationName: 'East Cross Street',
          position: [16, 0.2, 0],
          arrivalRadius: 5.5,
        });
        break;
      }

      case 'D2_E18_CITY_ESCAPE': {
        this.chapter = 10;
        this.companionMgr.setAllFollowing(true);
        this.callbacks.onTitleBanner({
          title: 'EVENT 18: ESCAPE FROM THE CITY',
          subtitle: 'FOLLOW THE HIGHWAY EAST',
          day: 'DAY 2 — 08:45 AM',
        });
        setTimeout(() => this.callbacks.onTitleBanner(null), 3500);
        this.setSubtitle({
          speaker: 'Marcus Cole',
          role: 'Saviour',
          text: 'Stay together! Follow the highway east out of the valley—keep moving!',
          duration: 4.5,
        });
        this.callbacks.onObjectiveUpdate('Mission: ESCAPE THE CITY — Escort all four friends along the eastern highway corridor');
        this.engine.objectiveNavigator.setObjective({
          id: 'story_d2_e18_highway',
          title: 'EASTERN HIGHWAY',
          instruction: 'Follow the highway east with your friends.',
          destinationName: 'Highway Ridge',
          position: [250, 0.2, 20],
          arrivalRadius: 8.0,
        });
        break;
      }

      case 'D2_E19_FINAL_ROAD': {
        this.chapter = 10;
        this.cityEscapeCompleted = true;
        this.callbacks.onTitleBanner({
          title: 'EVENT 19: THE FINAL ROAD',
          subtitle: 'CITY OUTSKIRTS OVERLOOK',
          day: 'DAY 2 — 09:10 AM',
        });
        setTimeout(() => this.callbacks.onTitleBanner(null), 3500);
        this.callbacks.onObjectiveUpdate('Mission: REACH OVERLOOK — Regroup with Marcus, Chloe, Maya, and Rohan on the highway overlook');
        this.engine.objectiveNavigator.setObjective({
          id: 'story_d2_e19_overlook',
          title: 'HIGHWAY OVERLOOK',
          instruction: 'Regroup on the elevated highway overlook at (600, 22).',
          destinationName: 'Highway Overlook',
          position: [600, 0.2, 22],
          arrivalRadius: 6.5,
        });
        break;
      }

      case 'D2_E20_STARTER_BASE': {
        this.chapter = 11;
        this.starterBaseEstablished = false;
        this.companionMgr.teleportTo('marcus', [-10, 0, 16], Math.PI / 4);
        this.companionMgr.teleportTo('chloe', [-11.5, 0, 17.5], 0);
        this.companionMgr.teleportTo('maya', [-9, 0, 18], -Math.PI / 3);
        this.companionMgr.teleportTo('rohan', [-7.2, 0, 19.4], Math.PI / 2);
        this.companionMgr.setAllFollowing(false);
        this.callbacks.onTitleBanner({
          title: 'EVENT 20: FIRST NIGHT TOGETHER',
          subtitle: 'THE APARTMENT COMPOUND — SAFE FOR TONIGHT',
          day: 'DAY 2 — 09:30 AM',
        });
        setTimeout(() => this.callbacks.onTitleBanner(null), 4000);
        this.setSubtitle({
          speaker: 'Dr. Maya Lin',
          role: 'Doctor',
          text: 'Everyone is accounted for. Let’s secure the home, check our medical supplies and rest before following the railway signal tomorrow.',
          duration: 5.5,
        });
        this.callbacks.onObjectiveUpdate('Mission: FIRST NIGHT TOGETHER — regroup at the apartment compound');
        this.engine.objectiveNavigator.setObjective({
          id: 'story_d2_e20_homecoming',
          title: 'FIRST NIGHT TOGETHER',
          instruction: 'Regroup with all four friends at the apartment compound.',
          destinationName: 'Apartment Compound Courtyard',
          position: [-10, 0.2, 17],
          arrivalRadius: 5.0,
        });
        break;
      }
    }

    this.engine.triggerAutoSave();
  }

  // ==========================================
  // IMPACT & SLEEP HOOKS
  // ==========================================
  public sleepToDay2() {
    this.startEvent('D2_E11_SOMETHING_WRONG');
  }

  /** The existing military-base generator is restored during campaign Day 4, not at the railway station. */
  public activateMilitaryBaseGenerator(): boolean {
    if (this.baseTasks.generator) return false;
    this.baseTasks.generator = true;
    this.starterBaseEstablished = true;
    soundEngine.playBuildSnap();
    this.setSubtitle({
      speaker: 'Chloe Miller',
      role: 'Explorer',
      text: 'The military base backup generator is online. We can now check the medical wing and organise the rest of the compound.',
      duration: 5.0,
    });
    this.engine.triggerAutoSave();
    return true;
  }

  public onMeteorImpacted() {
    this.cinematicCam.playTrack('impact_view', 3.2, () => {
      this.cinematicCam.endCinematic();
      if (this.engine.player) {
        this.engine.player.avatarGroup.visible = this.engine.player.cameraView !== 'first';
      }
      this.startEvent('D2_E16_FIRST_INFECTION');
    });
  }

  // Backward compatibility alias methods
  public startChapter2() { this.startEvent('D1_E04_CITY_MORNING'); }
  public startChapter3() { this.startEvent('D1_E05_CAFE_MEETING'); }
  public startChapter4() { this.startEvent('D1_E07_PARK'); }
  public startChapter5() { this.startEvent('D1_E09_EVENING'); }
  public startChapter9() { this.startEvent('D2_E17_CITYWIDE_OUTBREAK'); }
  public startChapter10() { this.startEvent('D2_E18_CITY_ESCAPE'); }
  public startChapter11() { this.startEvent('D2_E20_STARTER_BASE'); }
  public startChapter12() { this.startEvent('D2_E20_STARTER_BASE'); }
  public startChapter13() { this.completeCampaign(); }

  // ==========================================
  // CAMPAIGN COMPLETION & OPEN-WORLD UNLOCK
  // ==========================================
  public completeCampaign() {
    this.isCompleted = true;
    this.phase = 'completed';
    this.starterBaseEstablished = false;
    this.baseTasks.generator = false;
    this.cinematicCam.endCinematic();
    this.callbacks.onPhaseChange('completed');
    this.callbacks.onSubtitleChange(null);
    this.callbacks.onTitleBanner(null);

    // Restore full chunk streaming for open-world exploration
    this.engine.chunkManager.setStreamingRadius(null);
    this.engine.zombieMgr.isOutbreakActive = true;
    this.outbreakMgr.isOutbreakActive = true;

    // Keep the four friends together at the existing apartment compound. The military base is introduced on campaign Day 4.
    this.companionMgr.teleportTo('marcus', [-10, 0, 16], Math.PI / 4);
    this.companionMgr.teleportTo('chloe', [-11.5, 0, 17.5], 0);
    this.companionMgr.teleportTo('maya', [-9, 0, 18], -Math.PI / 3);
    this.companionMgr.teleportTo('rohan', [-7.2, 0, 19.4], Math.PI / 2);
    this.companionMgr.setAllFollowing(false);

    // Spawn physical meteorite crater
    this.meteorMgr.spawnPhysicalCrater();

    // Reward starter survival equipment
    this.engine.callbacks.onItemCollected('canned_beans', 4);
    this.engine.callbacks.onItemCollected('clean_water', 4);
    this.engine.callbacks.onItemCollected('bandage', 3);
    this.engine.callbacks.onItemCollected('builder_hammer', 1);

    // Activate Chapter 1 open world quest line
    this.engine.quests = [
      {
        id: 'main_survival_story',
        chapter: 1,
        title: 'The Road Ahead: Rebirth',
        description:
          'You and your four friends survived the first two days and returned to the protected apartment compound. Chloe has a railway signal to investigate next; the military installation and Outpost 7 remain ahead.',
        completed: false,
        rewards: {
          xp: 500,
          items: [
            { itemId: 'builder_hammer', count: 1 },
            { itemId: 'nails_bolts', count: 24 },
          ],
        },
        objectives: [
          {
            id: 'talk_to_marcus',
            description: 'Talk to Marcus [E] in the apartment courtyard to coordinate the next move',
            current: 0,
            target: 1,
            completed: false,
          },
          {
            id: 'harvest_resources',
            description: 'Harvest wood and stone with your tools',
            current: 0,
            target: 20,
            completed: false,
          },
          {
            id: 'survive_night_one',
            description: 'Defend the apartment compound against the first night threat',
            current: 0,
            target: 1,
            completed: false,
          },
        ],
      },
    ];
    this.engine.callbacks.onQuestsUpdate(this.engine.quests);
    this.callbacks.onObjectiveUpdate('Discover what happened. Find survivors. Build a future.');
    this.engine.triggerAutoSave();
  }

  public skipPrologue() {
    this.completeCampaign();
  }

  // ==========================================
  // INTERACTION ROUTER CALLED BY GAMEENGINE
  // ==========================================
  public getInteractionPrompt(pos: THREE.Vector3): string | null {
    if (this.isCompleted) return null;

    // 1. Apartment Interactions (Day 1 E01-E03, E09-E10; Day 2 E11-E14)
    if (this.currentDay === 1 || this.currentEventId === 'D2_E11_SOMETHING_WRONG' || this.currentEventId === 'D2_E12_EMERGENCY_BROADCAST' || this.currentEventId === 'D2_E20_STARTER_BASE') {
      const apt = this.townMgr.getApartmentInteraction(pos);
      if (apt) return apt.prompt;
    }

    // 3. Companion Dialogue Prompt
    const friend = this.companionMgr.getNearestCompanion(pos, 3.5);
    if (friend) {
      return `Press [E] to Talk to ${friend.name} (${friend.role})`;
    }

    // 4. Citizen Conversation Prompt
    const citizen = this.townMgr.getNearestCitizen(pos, 3.5);
    if (citizen) {
      return `Press [E] to Talk to ${citizen.name} (${citizen.role})`;
    }

    return null;
  }

  public handleInteraction(pos: THREE.Vector3): boolean {
    if (this.isCompleted) return false;

    // 1. Apartment Interactions
    const apt = this.townMgr.getApartmentInteraction(pos);
    if (apt) {
      if (apt.id === 'phone') {
        soundEngine.playUIClick();
        this.apartmentInspected.phone = true;
        this.engine.callbacks.onOpenPhone?.();
        if (this.currentEventId === 'D1_E02_HOME_SWEET_HOME') {
          this.startEvent('D1_E03_FRIEND_MESSAGE');
        } else if (this.currentEventId === 'D2_E11_SOMETHING_WRONG') {
          this.startEvent('D2_E12_EMERGENCY_BROADCAST');
        }
        return true;
      } else if (apt.id === 'fridge') {
        soundEngine.playBuildSnap();
        this.apartmentInspected.fridge = true;
        this.engine.callbacks.onOpenFridge?.();
        return true;
      } else if (apt.id === 'armory') {
        soundEngine.playUIClick();
        this.apartmentInspected.armory = true;
        this.engine.callbacks.onOpenArmory?.();
        return true;
      } else if (apt.id === 'tv') {
        const isOn = this.townMgr.apartmentBuilding.toggleTV();
        this.apartmentInspected.tv = true;
        if (this.currentEventId === 'D2_E11_SOMETHING_WRONG' || this.currentEventId === 'D2_E12_EMERGENCY_BROADCAST') {
          this.startEvent('D2_E13_FRIENDS_RETURN');
        }
        return true;
      } else if (apt.id === 'compoundGate') {
        this.townMgr.apartmentBuilding.toggleCompoundGate();
        return true;
      } else if (apt.id === 'door') {
        const isOpen = this.townMgr.apartmentBuilding.toggleDoor();
        if (this.currentEventId === 'D1_E02_HOME_SWEET_HOME' || this.currentEventId === 'D1_E03_FRIEND_MESSAGE') {
          this.startEvent('D1_E04_CITY_MORNING');
        }
        return true;
      } else if (apt.id === 'garageDoor') {
        const isOpen = this.townMgr.apartmentBuilding.toggleGarageShutter();
        this.setSubtitle({
          speaker: 'Player',
          text: isOpen ? 'Garage roll-up shutter raised. Vehicles and tools accessible.' : 'Garage roll-up shutter lowered and secured.',
          duration: 3.0,
        });
        return true;
      } else if (apt.id === 'turret') {
        soundEngine.playUIClick();
        this.setSubtitle({
          speaker: 'AI Defense Sentry',
          role: 'Compound Security',
          text: 'Twenty armed compound sentries ONLINE. Threat engagement protocol active against explicitly hostile infected NPCs and enemy factions only. Player, friendly and neutral entities are protected.',
          duration: 4.5,
        });
        return true;
      } else if (apt.id === 'railwayOperations') {
        soundEngine.playUIClick();
        this.engine.callbacks.onOpenRailwayOperations?.();
        return true;
      } else if (apt.id === 'medicalClinic') {
        soundEngine.playUIClick();
        this.engine.callbacks.onOpenMedicalClinic?.();
        return true;
      } else if (apt.id === 'apartmentStatus') {
        soundEngine.playUIClick();
        this.engine.callbacks.onOpenApartmentStatus?.();
        return true;
      } else if (apt.id === 'fan') {
        this.townMgr.apartmentBuilding.toggleFan();
        return true;
      } else if (apt.id === 'ac') {
        this.townMgr.apartmentBuilding.toggleAC();
        return true;
      } else if (apt.id === 'bed') {
        return this.engine.executeBedSleep(new THREE.Vector3(-29.8, 0.245, 41.8));
      }
    }

    // 3. Companion Dialogue Interaction
    const friend = this.companionMgr.getNearestCompanion(pos, 3.8);
    if (friend) {
      soundEngine.playUIClick();
      if (this.currentEventId === 'D1_E05_CAFE_MEETING' || this.currentEventId === 'D1_E06_FOUR_FRIENDS') {
        this.startEvent('D1_E07_PARK');
        return true;
      }

      if (friend.id === 'marcus') {
        this.setSubtitle({
          speaker: 'Marcus Cole',
          role: 'Saviour',
          text: this.currentDay === 1
            ? 'Quiet mornings like this remind you how good life is.'
            : 'Stay alert. We move together and watch each other’s backs.',
          duration: 4.0,
        });
      } else if (friend.id === 'chloe') {
        this.setSubtitle({
          speaker: 'Chloe Miller',
          role: 'Explorer',
          text: this.currentDay === 1
            ? 'Shortwave repeaters are all calibrated. Ready for the hike!'
            : 'I’ve got the telemetry scanner set. Keep us moving.',
          duration: 4.0,
        });
      } else if (friend.id === 'maya') {
        this.setSubtitle({
          speaker: 'Dr. Maya Lin',
          role: 'Doctor',
          text: this.currentDay === 1
            ? 'A peaceful day in Oakridge is just what we needed.'
            : 'I have first-aid kits ready if anyone takes a hit.',
          duration: 4.0,
        });
      }
      else if (friend.id === 'rohan') {
        this.setSubtitle({
          speaker: 'Rohan Mehta',
          role: 'Armoury & Tactical Specialist',
          text: this.currentDay === 1
            ? 'I have checked our basic emergency kit. We should know our exits before we need them.'
            : 'I will organise the protective equipment and keep our team’s route clear.',
          duration: 4.0,
        });
      }
      return true;
    }

    // 4. Citizen Conversation
    const citizen = this.townMgr.getNearestCitizen(pos, 3.5);
    if (citizen) {
      const line = citizen.dialogueLines[Math.floor(Math.random() * citizen.dialogueLines.length)];
      this.setSubtitle({
        speaker: citizen.name,
        role: citizen.role,
        text: line,
        duration: 4.5,
      });
      if (citizen.id === 'mr_henderson') this.cityTasks.market = true;
      if (citizen.id === 'barista_sam') this.cityTasks.cafe = true;
      if (citizen.id === 'officer_davis') this.cityTasks.park = true;
      return true;
    }

    return false;
  }

  private checkAllBaseTasks() {
    if (
      this.baseTasks.generator &&
      this.baseTasks.storage &&
      this.baseTasks.medical &&
      this.baseTasks.gate
    ) {
      this.engine.objectiveNavigator.setObjective({
        id: 'story_base_complete',
        title: 'BASE SECURED',
        instruction: 'All 4 establishment tasks complete! Regroup at the courtyard center.',
        destinationName: 'Courtyard Center',
        position: [954, 0.2, 22],
        arrivalRadius: 4.0,
      });
    }
  }

  private setSubtitle(subtitle: PrologueSubtitle) {
    this.currentSubtitle = subtitle;
    this.currentSubtitleTimer = subtitle.duration || 4.0;
    this.callbacks.onSubtitleChange(subtitle);
    soundEngine.playDialogueBeep();
  }

  // ==========================================
  // SAVE / RESTORE LOGIC
  // ==========================================
  public restoreCompletedState(saveData: PrologueSaveData) {
    this.isCompleted = true;
    this.phase = 'completed';
    this.currentEventId = 'D2_E20_STARTER_BASE';
    this.chapter = 13;
    this.day = saveData.day || 2;
    this.currentDay = 2;
    this.friendsMet = { marcus: true, chloe: true, maya: true, rohan: true, ...(saveData.friendsMet || {}) };
    this.starterBaseEstablished = Boolean(saveData.starterBaseEstablished && (saveData.day || 1) >= 4);
    const legacyBaseBeforeDayFour = (saveData.day || 1) < 4;
    if (saveData.companions) {
      this.companionMgr.companions.forEach((companion, id) => {
        const saved = saveData.companions[id];
        if (saved) {
          companion.relationshipScore = saved.relationshipScore ?? companion.relationshipScore;
          if (typeof saved.isFollowing === 'boolean') companion.isFollowing = saved.isFollowing;
          if (typeof saved.isFriend === 'boolean') companion.isFriend = saved.isFriend;
          if (saved.position && saved.position.length === 3 && !legacyBaseBeforeDayFour) {
            this.companionMgr.teleportTo(id as any, saved.position, saved.rotationY ?? 0);
          }
        }
      });
    }

    // Spawn physical crater in world
    this.meteorMgr.spawnPhysicalCrater();
    this.engine.zombieMgr.isOutbreakActive = true;
    this.outbreakMgr.isOutbreakActive = true;

    // Keep companions at the apartment until the new campaign reaches the Day 4 military installation
    if (legacyBaseBeforeDayFour || !saveData.companions?.['marcus']?.position) {
      this.companionMgr.teleportTo('marcus', [-10, 0, 16], Math.PI / 4);
    }
    if (legacyBaseBeforeDayFour || !saveData.companions?.['chloe']?.position) {
      this.companionMgr.teleportTo('chloe', [-11.5, 0, 17.5], 0);
    }
    if (legacyBaseBeforeDayFour || !saveData.companions?.['maya']?.position) {
      this.companionMgr.teleportTo('maya', [-9, 0, 18], -Math.PI / 3);
    }
    if (legacyBaseBeforeDayFour || !saveData.companions?.['rohan']?.position) {
      this.companionMgr.teleportTo('rohan', [-7.2, 0, 19.4], Math.PI / 2);
    }
  }

  private syncObjectiveForCurrentEvent() {
    switch (this.currentEventId) {
      case 'D1_E01_NEW_MORNING':
        this.callbacks.onObjectiveUpdate('Mission: WAKE UP — Get ready for the day and check your phone [E]');
        this.engine.objectiveNavigator.setObjective({
          id: 'story_d1_e01_wake',
          title: 'A NEW MORNING',
          instruction: 'Get out of bed and check your phone on the coffee table.',
          destinationName: 'Living Room Table',
          position: [-26, 0.4, 36.8],
          arrivalRadius: 2.5,
        });
        break;
      case 'D1_E02_HOME_SWEET_HOME':
        this.callbacks.onObjectiveUpdate('Mission: EXPLORE HOME — Check your apartment rooms, phone, fridge, and front door [E]');
        this.engine.objectiveNavigator.setObjective({
          id: 'story_d1_e02_explore',
          title: 'HOME SWEET HOME',
          instruction: 'Inspect your living room table or step toward the front door.',
          destinationName: 'Apartment Front Door',
          position: [-26, 0.4, 31],
          arrivalRadius: 2.8,
        });
        break;
      case 'D1_E03_FRIEND_MESSAGE':
        this.callbacks.onObjectiveUpdate('Mission: HEAD OUTSIDE — Meet Marcus, Chloe, Maya, and Rohan at Corner Roast Café');
        this.engine.objectiveNavigator.setObjective({
          id: 'story_d1_e03_door',
          title: 'MEETING THE CREW',
          instruction: 'Leave the apartment and meet all four friends at Corner Roast Café.',
          destinationName: 'Corner Roast Café',
          position: [-14, 0.2, -60],
          arrivalRadius: 5.5,
        });
        break;
      case 'D1_E04_CITY_MORNING':
        this.callbacks.onObjectiveUpdate('Mission: EXPLORE NEIGHBOURHOOD — Walk down Main Avenue to Corner Roast Café');
        this.engine.objectiveNavigator.setObjective({
          id: 'story_d1_e04_walk_cafe',
          title: 'TO THE CAFÉ',
          instruction: 'Walk down Main Avenue to Corner Roast Café.',
          destinationName: 'Corner Roast Café',
          position: [-14, 0.2, -60],
          arrivalRadius: 4.5,
        });
        break;
      case 'D1_E05_CAFE_MEETING':
        this.callbacks.onObjectiveUpdate('Mission: CAFÉ REUNION — Talk to Marcus Cole at the café table');
        this.engine.objectiveNavigator.setObjective({
          id: 'story_d1_e05_talk',
          title: 'TALK TO MARCUS',
          instruction: 'Join your friends at the outdoor patio table.',
          destinationName: 'Café Patio Table',
          position: [-9.2, 0.2, -57],
          arrivalRadius: 3.5,
        });
        break;
      case 'D1_E06_FOUR_FRIENDS':
        this.callbacks.onObjectiveUpdate('Mission: SPEND TIME TOGETHER — Chat with all four friends at the café');
        break;
      case 'D1_E07_PARK':
        this.callbacks.onObjectiveUpdate('Mission: VISIT PARK — Walk with your friends to Town Square Park fountain');
        this.engine.objectiveNavigator.setObjective({
          id: 'story_d1_e07_fountain',
          title: 'TOWN SQUARE PARK',
          instruction: 'Visit the central park fountain with Marcus, Chloe, Maya, and Rohan.',
          destinationName: 'Park Fountain',
          position: [20, 0.2, 18],
          arrivalRadius: 4.5,
        });
        break;
      case 'D1_E08_STRANGE_NEWS':
        this.callbacks.onObjectiveUpdate('Mission: WATCH NEWS — Listen to the public broadcast report with your friends');
        break;
      case 'D1_E09_EVENING':
        this.callbacks.onObjectiveUpdate('Mission: RETURN HOME — Head back to your apartment living room with your friends');
        this.engine.objectiveNavigator.setObjective({
          id: 'story_d1_e09_return',
          title: 'RETURN TO APARTMENT',
          instruction: 'Walk back to your apartment living room with your friends.',
          destinationName: 'Apartment Living Room',
          position: [-26, 0.2, 38],
          arrivalRadius: 3.8,
        });
        break;
      case 'D1_E10_LAST_NORMAL_NIGHT':
        this.callbacks.onObjectiveUpdate('Mission: SLEEP IN BED — Interact with your bed [E] on Floor 1 to rest');
        this.engine.objectiveNavigator.setObjective({
          id: 'story_d1_e10_bed',
          title: 'REST IN BED',
          instruction: 'Sleep in your bed on Floor 1 to wake up for Day 2.',
          destinationName: 'Bedroom Bed',
          position: [-30, 0.4, 41],
          arrivalRadius: 2.5,
        });
        break;
      case 'D2_E11_SOMETHING_WRONG':
        this.callbacks.onObjectiveUpdate('Mission: CHECK PHONE — Unusual emergency sirens heard outside. Check your phone or TV [E]');
        this.engine.objectiveNavigator.setObjective({
          id: 'story_d2_e11_tv',
          title: 'CHECK LIVING ROOM TV',
          instruction: 'Go to the living room and turn on the television [E].',
          destinationName: 'Living Room TV',
          position: [-31.5, 1.5, 38],
          arrivalRadius: 2.8,
        });
        break;
      case 'D2_E12_EMERGENCY_BROADCAST':
        this.callbacks.onObjectiveUpdate('Mission: EMERGENCY BROADCAST — Watch the emergency alert on your TV');
        break;
      case 'D2_E13_FRIENDS_RETURN':
        this.callbacks.onObjectiveUpdate('Mission: REGROUP — Meet Marcus, Chloe, Maya, and Rohan at the apartment front door');
        this.engine.objectiveNavigator.setObjective({
          id: 'story_d2_e13_door',
          title: 'MEET AT FRONT DOOR',
          instruction: 'Open the front entrance door [E] to let your friends inside.',
          destinationName: 'Apartment Front Door',
          position: [-26, 0.2, 31],
          arrivalRadius: 3.2,
        });
        break;
      case 'D2_E14_SKY_CHANGES':
        this.callbacks.onObjectiveUpdate('Mission: CLIMB TO CROWN ROOFTOP — Take the staircase or elevator up to Floor 7 Crown Sky Palace');
        this.engine.objectiveNavigator.setObjective({
          id: 'story_d2_e14_rooftop',
          title: 'FLOOR 7 CROWN ROOFTOP',
          instruction: 'Take the staircase or main elevator to Floor 7 Crown Sky Palace with your friends.',
          destinationName: 'Crown Sky Palace Deck',
          position: [-26, 22.1, 38],
          arrivalRadius: 5.5,
        });
        break;
      case 'D2_E15_METEORITE_IMPACT':
        this.callbacks.onObjectiveUpdate('Mission: SURVIVE IMPACT — Watch Sector 4 Ground Zero from the rooftop');
        break;
      case 'D2_E16_FIRST_INFECTION':
        this.callbacks.onObjectiveUpdate('Mission: DESCEND TO STREET — Go down the stairs to street level and investigate cautiously');
        this.engine.objectiveNavigator.setObjective({
          id: 'story_d2_e16_street',
          title: 'STREET LEVEL',
          instruction: 'Descend to the street level with your friends.',
          destinationName: 'Sidewalk Intersection',
          position: [0, 0.2, 20],
          arrivalRadius: 5.5,
        });
        break;
      case 'D2_E17_CITYWIDE_OUTBREAK':
        this.callbacks.onObjectiveUpdate('Mission: AVOID BLOCKED AVENUES — Cut through the East Cross Street toward the highway');
        this.engine.objectiveNavigator.setObjective({
          id: 'story_d2_e17_bypass',
          title: 'EAST CROSS STREET',
          instruction: 'Cut through East Cross Street toward the highway corridor.',
          destinationName: 'East Cross Street',
          position: [16, 0.2, 0],
          arrivalRadius: 5.5,
        });
        break;
      case 'D2_E18_CITY_ESCAPE':
        this.callbacks.onObjectiveUpdate('Mission: ESCAPE THE CITY — Escort all four friends along the eastern highway corridor');
        this.engine.objectiveNavigator.setObjective({
          id: 'story_d2_e18_highway',
          title: 'EASTERN HIGHWAY',
          instruction: 'Follow the highway east with your friends.',
          destinationName: 'Highway Ridge',
          position: [250, 0.2, 20],
          arrivalRadius: 8.0,
        });
        break;
      case 'D2_E19_FINAL_ROAD':
        this.callbacks.onObjectiveUpdate('Mission: REACH OVERLOOK — Regroup with Marcus, Chloe, Maya, and Rohan on the highway overlook');
        this.engine.objectiveNavigator.setObjective({
          id: 'story_d2_e19_overlook',
          title: 'HIGHWAY OVERLOOK',
          instruction: 'Regroup on the elevated highway overlook at (600, 22).',
          destinationName: 'Highway Overlook',
          position: [600, 0.2, 22],
          arrivalRadius: 6.5,
        });
        break;
      case 'D2_E20_STARTER_BASE':
        this.callbacks.onObjectiveUpdate('Mission: FIRST NIGHT TOGETHER — regroup with all four friends at the apartment compound');
        this.engine.objectiveNavigator.setObjective({
          id: 'story_d2_e20_homecoming',
          title: 'FIRST NIGHT TOGETHER',
          instruction: 'Regroup with all four friends at the apartment compound.',
          destinationName: 'Apartment Compound Courtyard',
          position: [-10, 0.2, 17],
          arrivalRadius: 5.0,
        });
        break;
    }
  }

  public restoreStoryState(saveData: PrologueSaveData) {
    this.isCompleted = Boolean(saveData.isCompleted);
    this.currentDay = (saveData.day as StoryDay) || 1;
    this.day = saveData.day || 1;
    this.chapter = saveData.chapter || 1;
    this.currentEventId = saveData.currentEventId || 'D1_E01_NEW_MORNING';
    this.phase = saveData.phase || this.currentEventId;
    this.lastSafeCheckpointId = this.currentEventId;
    this.completedEventIds = saveData.completedEventIds || [];
    this.optionalObjectivesCompleted = saveData.optionalObjectivesCompleted || [];
    this.friendsMet = { marcus: false, chloe: false, maya: false, rohan: false, ...(saveData.friendsMet || {}) };
    if (saveData.apartmentInspected) this.apartmentInspected = { ...this.apartmentInspected, ...saveData.apartmentInspected };
    if (saveData.cityTasks) this.cityTasks = { ...this.cityTasks, ...saveData.cityTasks };
    if (saveData.baseTasks) this.baseTasks = { ...this.baseTasks, ...saveData.baseTasks };
    if ((saveData.day || 1) < 4) {
      this.baseTasks.generator = false;
      this.starterBaseEstablished = false;
    }
    const legacyBaseBeforeDayFour = (saveData.day || 1) < 4;
    if (saveData.companions) {
      this.companionMgr.companions.forEach((companion, id) => {
        const saved = saveData.companions[id];
        if (saved) {
          companion.relationshipScore = saved.relationshipScore ?? companion.relationshipScore;
          if (typeof saved.isFollowing === 'boolean') companion.isFollowing = saved.isFollowing;
          if (typeof saved.isFriend === 'boolean') companion.isFriend = saved.isFriend;
          if (saved.position && saved.position.length === 3 && !legacyBaseBeforeDayFour) {
            this.companionMgr.teleportTo(id as any, saved.position, saved.rotationY ?? 0);
          }
        }
      });
    }
    if (saveData.meteoriteImpactTriggered) this.meteoriteImpactTriggered = true;
    if (saveData.firstInfectionDiscovered) this.firstInfectionDiscovered = true;
    if (saveData.cityOutbreakStarted) this.cityOutbreakStarted = true;
    if (saveData.cityEscapeCompleted) this.cityEscapeCompleted = true;
    if (saveData.starterBaseEstablished && (saveData.day || 1) >= 4) this.starterBaseEstablished = true;

    const hasOutbreakBegun =
      this.meteoriteImpactTriggered ||
      this.firstInfectionDiscovered ||
      this.cityOutbreakStarted ||
      this.cityEscapeCompleted ||
      this.starterBaseEstablished ||
      this.chapter >= 7;
    this.engine.zombieMgr.isOutbreakActive = Boolean(hasOutbreakBegun);

    if (saveData.craterFormed || this.meteoriteImpactTriggered) {
      this.meteorMgr.spawnPhysicalCrater();
    }

    this.callbacks.onPhaseChange(this.phase);
    this.syncObjectiveForCurrentEvent();
  }

  public exportSaveData(): PrologueSaveData {
    const companionsData: Record<string, { health: number; station: string; relationshipScore: number; isFollowing?: boolean; isFriend?: boolean; position?: [number, number, number]; rotationY?: number }> = {};
    this.companionMgr.companions.forEach((c, id) => {
      companionsData[id] = {
        health: c.health,
        station: c.station,
        relationshipScore: c.relationshipScore,
        isFollowing: c.isFollowing,
        isFriend: c.isFriend ?? true,
        position: [c.position[0], c.position[1], c.position[2]],
        rotationY: c.rotationY,
      };
    });

    return {
      phase: this.phase,
      isCompleted: this.isCompleted,
      day: this.day,
      chapter: this.chapter,
      currentEventId: this.currentEventId,
      completedEventIds: [...this.completedEventIds],
      optionalObjectivesCompleted: [...this.optionalObjectivesCompleted],
      meteoriteImpactTriggered: this.meteoriteImpactTriggered,
      firstInfectionDiscovered: this.firstInfectionDiscovered,
      cityOutbreakStarted: this.cityOutbreakStarted,
      cityEscapeCompleted: this.cityEscapeCompleted,
      starterBaseEstablished: this.starterBaseEstablished,
      craterFormed: this.meteorMgr.isImpacted || this.meteoriteImpactTriggered,
      friendsMet: { ...this.friendsMet },
      shelterUnlocked: true,
      shelterDoorClosed: true,
      generatorOnline: this.baseTasks.generator,
      radioInspected: true,
      suppliesInspected: this.baseTasks.storage,
      apartmentInspected: { ...this.apartmentInspected },
      cityTasks: { ...this.cityTasks },
      baseTasks: { ...this.baseTasks },
      companions: companionsData,
    };
  }

  public exportStoryState(): OpeningStoryState {
    return {
      schemaVersion: 1,
      currentDay: this.currentDay,
      currentEventId: this.currentEventId,
      completedEventIds: [...this.completedEventIds],
      optionalObjectivesCompleted: [...this.optionalObjectivesCompleted],
      meteoriteImpactTriggered: this.meteoriteImpactTriggered,
      firstInfectionDiscovered: this.firstInfectionDiscovered,
      cityOutbreakStarted: this.cityOutbreakStarted,
      cityEscapeCompleted: this.cityEscapeCompleted,
      starterBaseEstablished: this.starterBaseEstablished,
      friendStoryFlags: { ...this.friendStoryFlags },
      lastSafeCheckpointId: this.lastSafeCheckpointId,
    };
  }

  public dispose() {
    this.researchComplex?.dispose();
    this.townMgr.dispose();
    this.companionMgr.dispose();
    this.meteorMgr.dispose();
    this.shelterMgr.dispose();
  }
}
