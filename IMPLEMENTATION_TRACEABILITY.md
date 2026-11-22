# Implementation Traceability — Root Application

This is a high-level code map for the updated root project. It does not certify every requirement in every specification document; use the source documents retained in this archive for the full acceptance criteria.

| Requirement area | Primary runtime files | Current code status |
|---|---|---|
| Player movement and camera | `src/engine/PlayerController.ts`, `src/engine/GameEngine.ts` | Integrated; camera recovery guard added; runtime QA pending |
| Cinematic ownership and cleanup | `src/engine/prologue/CinematicCameraManager.ts`, `src/engine/prologue/PrologueManager.ts` | Completion/skip/interruption cleanup paths present; runtime QA pending |
| AI-only railway and passenger mode | `src/engine/world/AITrainManager.ts`, `src/engine/GameEngine.ts`, `src/components/TrainHUD.tsx` | AI-only source invariant present; passenger exploration present; live collision/spacing tests pending |
| Park NPC grounding | `src/engine/prologue/TownLifeManager.ts` | Authored grass-pad height and foot-offset grounding present; lifecycle regression tests pending |
| Eight-day campaign | `src/data/eightDayCampaign.ts`, `src/data/sixDayCampaign.ts`, `src/engine/GameEngine.ts`, `src/components/QuestJournalModal.tsx` | Catalogue and runtime hooks present; all mission paths and migration need live testing |
| Home/mansion and interiors | `src/engine/prologue/ApartmentBuilding.ts`, `src/engine/prologue/TownLifeManager.ts`, `src/engine/PlayerController.ts` | Five-level home implementation paths present; room/collision acceptance testing pending |
| Medical clinic UI | `src/components/MedicalClinicModal.tsx`, `src/App.tsx`, `src/engine/GameEngine.ts` | Root UI callback connected to medical-wing interaction |
| World streaming and persistence | `src/engine/world/ChunkManager.ts`, `src/engine/world/WorldPersistence.ts`, `src/utils/storage.ts` | Existing source retained; long-session and reload tests pending |
| Performance | `src/engine/GameEngine.ts`, `src/engine/world/LODManager.ts`, `src/components/PerformanceDiagnostic.tsx` | Existing performance systems retained; bounded update delta added; profiling pending |
| Mobile controls | `src/components/MobileControls.tsx`, `src/App.tsx`, `src/index.css` | Existing controls retained; Android device QA pending |

The project root contains the original specification files and historical implementation notes. Their presence is not equivalent to implementation; verify each acceptance criterion against the live game.
