# LAST SANCTUARY: REBIRTH — IMPLEMENTATION TRACEABILITY MASTER MATRIX

**Project Title:** LAST SANCTUARY: REBIRTH (Maximum Realism Survival & Railway Simulation)  
**Verification Date:** November 2026  
**Status:** FULLY INTEGRATED & VERIFIED  

---

## 1. Traceability Summary

This master matrix maps every requirement from the user directives and specification attachments directly to runtime code files, architectural subsystems, unit verification criteria, and test gate outcomes.

| Requirement ID | Domain | Specification Requirement | Source File(s) | Verification / Test Reference | Status |
|---|---|---|---|---|---|
| **REQ-DISP-01** | Railway Control | Relocate Railway Operations Control Centre to apartment basement ($Y = -3.5\text{m}$). Old 1st-floor room removed; rest of floor preserved. | `src/engine/prologue/ApartmentBuilding.ts`, `src/engine/prologue/BasementControlRoom.ts` | GATE-01: Console Geometry & Interaction | **VERIFIED** |
| **REQ-DISP-02** | Railway Control | 5-Display physical console architecture: Central Wide Screen, 2 Left Displays, 2 Right Displays with dynamic canvas textures. | `src/engine/prologue/BasementControlRoom.ts`, `src/components/RailwayOperationsModal.tsx` | GATE-01: Monitor Layout & Canvas Update | **VERIFIED** |
| **REQ-DISP-03** | Railway Control | Keyboard shortcuts ([1]-[6] slot selection, [H] hold toggle, [R] timetable, [A/Enter] acknowledge, [↑/↓] cycle, [ESC] exit). | `src/components/RailwayOperationsModal.tsx` | GATE-01: Keyboard & Touch Dispatch Input | **VERIFIED** |
| **REQ-DISP-04** | Railway Control | Live telemetry for 6 services (F1, F2, F3, B1, B2, B3) with real-time positions, ATS signals, and dwell countdowns. | `src/engine/world/AITrainManager.ts`, `src/components/RailwayOperationsModal.tsx` | GATE-01: Telemetry Synchronization | **VERIFIED** |
| **REQ-DISP-05** | Railway Control | Active dispatch hold/release commands affecting physical in-game trains; autonomous AI-only operation preserved. | `src/engine/world/AITrainManager.ts`, `src/components/RailwayOperationsModal.tsx` | GATE-01: Physical Service Hold Validation | **VERIFIED** |
| **REQ-MED-01** | Medical Clinic | First-Floor Medical Section: Reception desk, examination bed with adjustable headrest, recovery bed, medicine cabinet, medical fridge, workstation. | `src/engine/prologue/ApartmentBuilding.ts` | GATE-02: Medical Architecture & Colliders | **VERIFIED** |
| **REQ-MED-02** | Medical Clinic | Solid colliders registered in UnifiedPhysicsManager for medical desks, beds, and cabinets; zero wall-clipping. | `src/engine/prologue/ApartmentBuilding.ts`, `src/engine/physics/UnifiedPhysicsManager.ts` | GATE-02: Collision Proxy Registration | **VERIFIED** |
| **REQ-MED-03** | Medical Clinic | Interactive MedicalClinicModal connected to GameEngine & App.tsx with live HP assessment and first-aid kit consumption (+25 HP). | `src/components/MedicalClinicModal.tsx`, `src/engine/GameEngine.ts`, `src/App.tsx` | GATE-02: Treatment Station Action | **VERIFIED** |
| **REQ-STORY-01** | Campaign Storyline | Approved 8-Day 64-Event narrative catalogue (`lastSanctuaryCampaign.ts`) unified into QuestJournalModal with Day 1–8 timeline ribbon. | `src/data/lastSanctuaryCampaign.ts`, `src/components/QuestJournalModal.tsx` | GATE-03: Campaign Navigation & Directives | **VERIFIED** |
| **REQ-STORY-02** | Day 1 & Day 2 Prologue | Seamless 20-event opening story: peaceful morning, friend meetups, meteorite impact cinematic, outbreak, escape to Starter Base. | `src/engine/prologue/PrologueManager.ts`, `src/components/prologue/CinematicOverlay.tsx` | GATE-03: Narrative Trigger Execution | **VERIFIED** |
| **REQ-PROT-01** | World & Spawning | Pre-impact zombie suppression (`isOutbreakActive = false`); zero zombie spawning before meteorite strike. | `src/engine/ZombieManager.ts`, `src/engine/prologue/PrologueManager.ts` | GATE-04: Outbreak Invariant Check | **VERIFIED** |
| **REQ-PROT-02** | Sleep & Rest | Player begins game sleeping in bed; sequential nighttime-only sleep with canonical dialogue quotes and morning transition. | `src/engine/GameEngine.ts`, `src/engine/prologue/PrologueManager.ts` | GATE-04: Bed Sleep State Machine | **VERIFIED** |
| **REQ-PROT-03** | Compound Boundary | Apartment compound enclosed with perimeter wall, double gate at $(-26, 0, 16)$, dual AI sentry turrets; zero intrusion. | `src/engine/prologue/ApartmentBuilding.ts`, `src/engine/prologue/ApartmentTurrets.ts` | GATE-04: Perimeter Defense Validation | **VERIFIED** |
| **REQ-VEH-01** | Garage & Vehicles | Backyard Private Garage with roll-up motorized shutter, vehicle bays, and drivable buggy physics. | `src/engine/prologue/ApartmentBuilding.ts`, `src/engine/VehicleManager.ts` | GATE-05: Garage Shutter & Driving | **VERIFIED** |
| **REQ-ARM-01** | Sector Armory | Floor 3 Armory Vault with 100 fictional entries, searchable categories, and persistent inventory integration. | `src/components/ArmoryCatalogModal.tsx`, `src/data/armoryCatalog.ts` | GATE-05: Armory Catalog Retrieval | **VERIFIED** |

---

## 2. Invariant Safety Assertions

1. **Autonomous Railway Integrity:** No locomotive permits player driving. Direct train operation is strictly handled by the autonomous schedule and monitored/held via the Basement Railway Dispatch Console.
2. **First-Floor Clinic Protection:** The medical section is physically located on Floor 1 of the apartment and remains permanently accessible through free-roam and future campaign events.
3. **Outbreak Invariant:** Infected never spawn inside protected sanctuary boundaries and cannot spawn before the meteorite cataclysm.
4. **Build & Type Cleanliness:** Zero TypeScript (`tsc --noEmit`) and zero Vite compilation errors across all modules.
