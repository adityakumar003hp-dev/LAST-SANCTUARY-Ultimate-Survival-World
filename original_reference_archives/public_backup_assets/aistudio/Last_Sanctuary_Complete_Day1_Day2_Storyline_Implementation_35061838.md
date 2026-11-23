# LAST SANCTUARY: REBIRTH
## Complete Day 1 + Day 2 Storyline Implementation
### Google AI Studio / Three.js / TypeScript

## Integration rules

Implement this inside the existing LAST SANCTUARY: REBIRTH project. This is an additive integration, not a replacement game or demo. Inspect the full repository first. Extend the current story/prologue manager, cinematic director, dialogue system, companion manager, objective navigator, world clock, weather, audio, NPC, chunk streaming, inventory and save systems. Do not create duplicate managers.

Preserve existing characters, assets, controls, environments, survival systems, wildlife, apartment, four floors, staircase, third-floor 100-entry fictional armory, fourth-floor rooftop pool and Starter Base. Preserve the identities and existing names of the three friends. Never claim untested features are complete.

The opening campaign contains exactly 20 major events:
- Day 1: 10 peaceful events introducing the player, apartment, city and friends.
- Day 2: 10 escalating events including meteorite impact, first infection, citywide outbreak, playable escape and Starter Base establishment.

The story must be primarily playable, with short integrated cinematics. Suggested pacing is 30–45 minutes for Day 1 and 45–60 minutes for Day 2, adjustable by optional exploration.

---

# 1. The three permanent friends

Use the three existing friend characters and preserve their established names, models, personalities and backstories. If roles are not yet assigned, use:

**Friend 1 — Leader/Planner**
- Helps make decisions, suggests routes and organizes tasks.
- Remains calm under pressure but can show uncertainty.
- Coordinates group discussions and survivor interactions.

**Friend 2 — Technician**
- Handles electronics, generators, radios and repairs.
- Helps restore communications and later improve Starter Base.
- Has practical, distinct dialogue.

**Friend 3 — Medic**
- Organizes medical supplies and helps people who need care.
- Establishes the medical corner at Starter Base.
- Has calm, supportive dialogue.

All three must have stable unique IDs, persistent identities, distinct dialogue, individual reactions, animations and companion AI. They must never duplicate or randomly disappear after saving, loading, chunk changes or mission restarts. Use existing navigation; do not visibly teleport companions. Prevent doorway blocking, stair navigation failures and dialogue spam. Save friend story flags and restore companions safely.

---

# 2. Day 1 — The Last Normal Day (10 events)

Day 1 is peaceful. Do not spawn active infected or trigger combat during this day.

## Event 01 — A New Morning
**Cinematic:** The player wakes in the first-floor apartment bedroom. Morning sunlight enters through the window; an alarm/phone notification sounds. Birds, distant traffic and normal city ambience establish a peaceful world. Show a brief exterior city shot, then return to the player.

**Gameplay:** Give control to the player. Let them get out of bed, inspect the phone and look outside. Objective: `Get ready for the day`.

**Implementation:** Set morning world time, peaceful weather and normal NPC schedules. Spawn the player safely. Save completion state.

## Event 02 — Home Sweet Home
**Objective:** `Explore your apartment`.

Make the existing four-floor apartment a fully explorable story location:
- **Floor 1:** white walls; bedroom/bed; working TV; refrigerator with open/close and storage UI; phone/in-game phone interface; sofa; table; kitchen counter/cabinets/sink; ceiling lights; working fan; wall AC; basic household necessities.
- **Floor 2:** grey walls, accessible rooms, furniture, doors, windows and lighting.
- **Floor 3:** fictional armory with the existing catalogue of exactly 100 unique inventory entries, display racks, lockers, item labels and collection state. Keep all items within the game's fictional inventory system.
- **Floor 4:** rooftop pool, deck, safety railings, lighting and safe water entry/exit using existing swimming physics.
- **Staircase:** continuous, correctly aligned and walkable between all four floors.

Fix interior visibility using camera-aware wall/roof cutaway or fade logic. Do not make all walls permanently invisible. Match collision to visible floors, stairs, doors and pool. Keep the event optional enough for free exploration; do not require inspecting every prop.

## Event 03 — A Message From Friends
**Trigger:** After the player leaves the bedroom or completes the first apartment objective.

The phone receives a message from the three friends asking to meet at their usual café/park. Use the existing phone and dialogue/message UI. Objective: `Meet your friends at the café`. Save message state so it does not replay after reload. No external network calls.

## Event 04 — Morning in the City
**Objective:** `Explore the neighbourhood`.

The player exits the apartment. Show a short street-level establishing shot and return control. Populate the city with normal civilians, traffic, shops, public transport, ambient activity and appropriate wildlife. NPCs walk, shop, talk and commute. No infected NPCs or apocalypse effects. Optional activities include visiting shops, observing animals and talking to civilians.

## Event 05 — The Meeting Point
**Objective:** `Reach the café`.

Use the existing objective navigator to guide the player. The three friends are waiting or arrive naturally. Trigger a short greeting scene, give each a distinct greeting and return control. Reuse existing NPC instances and stable IDs; do not spawn duplicates when the café chunk loads.

## Event 06 — Four Friends Together
**Objective:** `Spend time with your friends`.

The group explores the café and nearby streets. Include optional dialogue choices and natural animations: sitting, standing, walking, looking and talking. Conversations cover ordinary life, hobbies, work and plans. Optional café interaction can use the existing inventory/interaction system. Keep dialogue short and avoid simultaneous speech. Persist one-time conversation flags.

## Event 07 — A Day at the Park
**Objective:** `Visit the park with your friends`.

The group walks to a park. Show normal birds, small animals and species appropriate to the environment. Civilians exercise, relax and socialize. Let the player explore and speak to friends. Reuse the existing WildlifeManager; respect spawn budgets, LOD and biome rules. Do not spawn creatures inside paths, benches or buildings.

## Event 08 — Strange News
**Objective:** `Watch the news`.

A television or public display reports an unidentified object detected in space. Scientists are monitoring it. Friends briefly discuss the report. The Technician may mention unusual interference; the Leader suggests checking updates; the Medic expresses concern. Keep the cause uncertain. Use existing broadcast UI. If skipped, allow replay through the phone/news terminal so progression is never blocked.

## Event 09 — Evening Together
**Objective:** `Return home with your friends`.

The group returns to the apartment. Transition to sunset/evening. Friends may explore, sit and interact with appropriate props. Add a shared meal or relaxed conversation. The player may visit the rooftop pool with friends if companion navigation supports it. Apartment lights turn on through the existing time-of-day system. Give each friend an optional personal conversation. Friends must navigate stairs; do not visibly teleport them.

## Event 10 — One Last Peaceful Night
**Objective:** `Get some rest`.

Friends say goodbye or stay over according to existing story logic. The player may finish optional apartment interactions, then chooses to sleep. Cinematic: lights dim, city ambience quiets, camera moves outside toward the night sky and a mysterious distant glow/object passes overhead. Do not show the impact yet. Fade to Day 2 morning.

Save event flags, friend dialogue/relationship state, optional progress and a safe player location. Advance world time to Day 2.

---

# 3. Day 2 — The Beginning of the Apocalypse (10 events)

Day 2 escalates gradually. The meteorite impact is the turning point. Infection scenes must be suspenseful and non-graphic.

## Event 11 — Something Is Wrong
The player wakes in the same apartment. Sky and weather are subtly different. Phone notifications report unusual atmospheric activity and service disruption. Birds leave the area; distant emergency vehicles can be heard.

**Objective:** `Check your phone and look outside`.

Let the player inspect the phone, TV and windows. Do not spawn the main outbreak yet.

## Event 12 — Emergency Broadcast
**Objective:** `Watch the emergency report`.

The TV interrupts normal programming. A news presenter reports an unidentified object approaching Earth and agencies monitoring it. Mobile alerts arrive; friends message the player. Add a short radio interference effect. Reuse TV/phone/radio systems. Make the broadcast replayable if skipped. Avoid repeated notifications.

## Event 13 — The Friends Return
**Objective:** `Meet your friends at the apartment`.

The three friends contact the player and arrive through the building entrance. They use the staircase as appropriate. Leader asks everyone to stay calm; Technician checks radio/electronics; Medic checks supplies. Player choices can affect optional dialogue but must not break progression. Reconcile saved friend locations before spawning; never duplicate companions.

## Event 14 — The Sky Changes
**Objective:** `Go to the rooftop with your friends`.

The group uses the staircase to reach the rooftop. Clouds and lighting shift; a bright object appears in the distance; rumbling grows louder; birds and wildlife react. Briefly frame the four characters looking toward the horizon, then return to player control or transition cleanly to the impact cinematic. Do not trap the camera or teleport friends.

## Event 15 — METEORITE IMPACT
**Major cinematic, triggered exactly once.**

Sequence:
1. Wide city skyline and approaching meteorite.
2. Sky brightens as the object descends toward an area outside the city.
3. Large distant impact flash.
4. Stylized shockwave moves across the horizon.
5. Nearby windows and loose props react where supported.
6. Selected city power systems flicker or fail.
7. Emergency sirens begin.
8. Camera returns to player and friends, showing their reactions.
9. Brief pause, then player control returns.
10. Objective: `Check on the city and stay with your friends`.

Use layered audio, lighting, particles, distant debris silhouettes and controlled camera shake. Keep mobile performance in mind. Do not use a blinding full-screen white flash, uncontrolled physics explosion, unfair player death or graphic imagery. Do not destroy the apartment. The event must persist across save/load and never replay on reload.

## Event 16 — The First Infection
**Objective:** `Investigate the nearby emergency`.

The group moves to a safe nearby street/observation point. The player sees the first infected NPCs behaving unusually. An emergency broadcast reports that people near the impact area are becoming ill or acting unpredictably. Show a suspenseful encounter at a safe narrative distance, without graphic injury detail.

Medic advises caution; Leader recommends staying together; Technician tries to restore communication. Introduce a controlled, low-density infected AI tutorial. Teach awareness, avoidance and safe navigation using existing controls. Do not force combat if stealth/escape is supported. Do not spawn infected inside the apartment or solid geometry. Protect story companions from accidental targeting during this introduction.

## Event 17 — Citywide Outbreak
**Objective:** `Find a safe route through the city`.

Emergency broadcasts become inconsistent. Traffic slows or stops in selected streets; shops close; civilians seek safety. Some NPCs become infected under controlled story spawn rules; others hide, call for help or move toward safe locations. Emergency vehicles and sirens appear at selected points.

Use existing NPC/infected AI. Do not convert every civilian in the loaded world at once. Use staged spawn volumes, chunk-aware budgets and navigation limits. Allow optional rescue opportunities without making the main objective impossible. Provide a clear objective marker and supported alternate route.

## Event 18 — Escape From the City
**Playable survival mission.**

**Objective:** `Escape the city with all three friends`.

Mission phases:
1. Leave the immediate danger area.
2. Follow the Leader's suggested route or choose a supported alternate.
3. Avoid infected groups and environmental hazards.
4. Search a safe supply point for basic water, food and first-aid supplies.
5. Optionally help a stranded civilian.
6. Regroup if a companion falls behind.
7. Reach the designated city exit.

Friend contributions:
- Leader suggests safe routes and coordinates regrouping.
- Technician restores a temporary signal or enables a non-combat route interaction.
- Medic helps a civilian or companion who needs assistance.

Companions follow at a reasonable distance, avoid doorways, use existing navigation, and regroup if stuck. Never visibly teleport in front of the player. If recovery is needed, use an existing safe companion recovery mechanic outside the camera view. Do not permanently lose a friend because of a navigation error.

If the player is incapacitated, use existing recovery/checkpoint systems; do not restart the campaign. Preserve mission progress appropriately. Keep content non-graphic.

## Event 19 — The Final Road
**Objective:** `Reach the outskirts together`.

The four friends reach the outskirts. Short cinematic shows the distant city, emergency lights and smoke/fog on the horizon. Group pauses. Dialogue reflects each friend's personality and uncertainty. Leader proposes finding a safe place; Technician checks communications; Medic organizes supplies. Player chooses to continue toward the designated safe location.

Do not make friends disappear during the scene. Save escape completion and keep the route to Starter Base navigable.

## Event 20 — A New Beginning: Starter Base
**Objective:** `Establish Starter Base`.

The group reaches the existing Starter Base location/designated starting-base area. This is the first permanent safe home/headquarters, not an underground shelter unless the existing world already defines it that way.

Cinematic: the group enters and surveys the location. Leader organizes tasks; Technician identifies power/repair needs; Medic establishes a medical corner. Return control to the player.

Initial tasks:
- Inspect the perimeter.
- Set up sleeping spaces.
- Organize food and water.
- Establish a medical corner.
- Check storage.
- Inspect or restore the generator.
- Set up radio/communications.
- Mark future expansion locations.

End cinematic: all four characters stand together at Starter Base. Camera shows the damaged city far away and the new base in the foreground. Dialogue establishes their goal: survive, find other survivors and understand what happened. Fade into normal gameplay and unlock the next campaign chapter.

---

# 4. Story progression architecture

Integrate the event sequence into the existing story state manager. The following is a conceptual schema; adapt it to the current project rather than creating a duplicate save system.

```ts
type StoryDay = 1 | 2;

type OpeningEventId =
  | "D1_E01_NEW_MORNING"
  | "D1_E02_HOME_SWEET_HOME"
  | "D1_E03_FRIEND_MESSAGE"
  | "D1_E04_CITY_MORNING"
  | "D1_E05_CAFE_MEETING"
  | "D1_E06_FOUR_FRIENDS"
  | "D1_E07_PARK"
  | "D1_E08_STRANGE_NEWS"
  | "D1_E09_EVENING"
  | "D1_E10_LAST_NORMAL_NIGHT"
  | "D2_E11_SOMETHING_WRONG"
  | "D2_E12_EMERGENCY_BROADCAST"
  | "D2_E13_FRIENDS_RETURN"
  | "D2_E14_SKY_CHANGES"
  | "D2_E15_METEORITE_IMPACT"
  | "D2_E16_FIRST_INFECTION"
  | "D2_E17_CITYWIDE_OUTBREAK"
  | "D2_E18_CITY_ESCAPE"
  | "D2_E19_FINAL_ROAD"
  | "D2_E20_STARTER_BASE";

interface OpeningStoryState {
  schemaVersion: number;
  currentDay: StoryDay;
  currentEventId: OpeningEventId;
  completedEventIds: OpeningEventId[];
  optionalObjectivesCompleted: string[];
  meteoriteImpactTriggered: boolean;
  firstInfectionDiscovered: boolean;
  cityOutbreakStarted: boolean;
  cityEscapeCompleted: boolean;
  starterBaseEstablished: boolean;
  friendStoryFlags: Record<string, string[]>;
  lastSafeCheckpointId: string;
}
```

State machine requirements:
- Only one major event active at a time.
- Completion must be idempotent; duplicate calls cannot duplicate rewards, actors or cinematics.
- Save after every major event and important mission checkpoint.
- Resume the current event after reload.
- Optional activities never block mandatory progression.
- Meteorite impact and outbreak trigger exactly once.
- Do not replay Day 1 after reaching Day 2 unless a new game is started.
- Use stable event IDs, not display strings, as save keys.
- Migrate older saves with safe defaults.
- If an event ID is invalid, recover to the last valid checkpoint and log a warning.
- Skipping a cinematic, if supported, must apply the same required story state as watching it.

---

# 5. Cinematic direction

Use the existing cinematic director and camera controller.

**Day 1:** warm natural lighting, stable framing, gentle camera movement, peaceful ambience.

**Day 2 warning scenes:** wider framing, longer holds, subtle camera movement and restrained audio tension.

**Meteorite impact:** wide establishing shot, distant impact, environmental reaction, then character reaction shots.

**First infection:** suspenseful framing that emphasizes uncertainty and character reactions, not graphic imagery.

**City escape:** mostly player-controlled camera with brief transitions.

**Starter Base:** calm wide shot communicating a new beginning.

Cinematic safety:
- Always restore player input and camera ownership after a cutscene.
- Add a failsafe timeout for cutscene completion.
- If an actor or camera path is missing, use a safe fallback and continue.
- Respect pause state.
- Avoid clipping through walls, stairs, pool railings and buildings.
- Use delta-time updates.
- Do not create huge numbers of objects in one frame.
- Keep cinematics short enough to return control frequently.

Dialogue/subtitles:
- Reuse existing dialogue and subtitle systems.
- Clearly identify speakers.
- Prevent overlapping lines.
- Provide text fallback if voice assets are missing.
- Keep subtitles readable on mobile.
- Persist one-time dialogue flags.

---

# 6. World and event choreography

**Day 1 world state:** peaceful weather, ordinary traffic and pedestrian schedules, normal public services, wildlife active by biome/time, no infection spawns.

**Day 2 before impact:** subtle sky/weather changes, unusual bird movement, distant ambience, emergency broadcasts and phone alerts. Do not destroy the city before Event 15.

**After impact:** localized effects, controlled prop reactions, selected NPC emergency schedules, infection discovery only at Event 16 and gradual outbreak escalation at Event 17. Preserve safe zones and mission navigation.

Use the existing world clock and weather manager. Smoothly transition lighting/weather. Do not add a second clock or weather system.

---

# 7. Navigation and companion AI

Use the existing ObjectiveNavigator or equivalent:
- Stable objective IDs and grounded world targets.
- Resolve targets safely across chunk loading.
- If a target is missing, show a fallback instruction and log the missing target.
- Do not draw routes through walls or inaccessible buildings.
- Respect stairs, doors, blocked roads and streamed chunks.
- Keep markers readable on mobile.
- Companions use existing navigation or a compatible extension.
- Regrouping is mission-aware and must not visibly teleport characters.

---

# 8. Audio and visual effects

Reuse existing audio/effects managers.

Day 1 sounds: birds, wind, traffic, footsteps, café ambience, doors, appliances, phone notifications and quiet evening ambience.

Day 2 sounds: distant rumbling, radio/TV interference, meteorite descent, distant impact layers, sirens, emergency announcements and restrained suspense audio.

Requirements:
- Respect volume and mute settings.
- Avoid excessive simultaneous loops.
- Stop/fade audio when leaving a streamed scene.
- Prevent duplicate audio sources after reload.
- Use procedural fallbacks only if assets are missing.
- Avoid sudden ear-piercing peaks.

---

# 9. Performance and smoothness

- Reuse existing renderer, update loop, physics, audio, asset cache and managers.
- Use delta-time-safe updates.
- Preload only assets needed for the next event.
- Do not synchronously load the entire city during the impact scene.
- Use chunk streaming, LOD and instancing.
- Pool repeated particles and temporary effects.
- Do not create materials every frame.
- Dispose of unused geometries, materials, textures, audio and listeners.
- Reduce distant AI update rates.
- Stage infected NPC spawns; never spawn the entire population at once.
- Avoid unbounded arrays, timers, event listeners or repeated subscriptions.
- Make each event pause/resume safe.
- Avoid per-frame scans of every NPC/world object.
- Keep impact effects within mobile performance budgets.
- If frame rate drops, reduce distant detail/effects before reducing player control responsiveness.

---

# 10. Save/load and recovery

Persist current day/event, completed events, optional objectives, friend IDs/story flags, apartment discovery/object states, important inventory changes, meteorite/outbreak flags, escape progress and Starter Base establishment.

On load:
- Rebuild transient meshes/cinematic actors from logical state.
- Never serialize live Three.js objects.
- Reconcile friend IDs before spawning.
- Do not duplicate the meteorite, impact effects, infected tutorial NPCs or Starter Base.
- Restore player at a safe checkpoint.
- Restore world state consistent with the active story event.
- If a cutscene was interrupted, resume at a safe event checkpoint.
- Preserve older save files through migration.

---

# 11. Required acceptance tests

**Day 1**
- [ ] Player wakes in the correct apartment bedroom.
- [ ] Player can move and explore.
- [ ] Apartment interior and all four floors are visible and accessible.
- [ ] Staircase is walkable in both directions.
- [ ] Floor 1 is white; Floor 2 is grey.
- [ ] TV, fridge, phone, fan, AC and lights work where implemented.
- [ ] Armory catalogue connects to existing inventory.
- [ ] Rooftop pool uses existing water physics.
- [ ] Three friends meet without duplication.
- [ ] Café and park objectives resolve.
- [ ] Peaceful NPC and wildlife behavior remains active.
- [ ] News can be reviewed if skipped.
- [ ] Day 1 ends through the intended sleep/completion condition.

**Day 2**
- [ ] Day 2 begins with correct time/weather.
- [ ] Emergency broadcast appears once and can be reviewed.
- [ ] Three friends return with identities intact.
- [ ] Rooftop scene uses staircase; no visible teleport.
- [ ] Meteorite cinematic triggers once.
- [ ] Impact does not freeze the game or unfairly kill the player.
- [ ] First infection occurs only after impact.
- [ ] Outbreak escalates gradually.
- [ ] Escape mission is playable.
- [ ] Companions follow and regroup.
- [ ] Starter Base is reached and established.
- [ ] Next campaign chapter unlocks after Event 20.

**Regression**
- [ ] Existing story/prologue still works.
- [ ] Player controls unchanged.
- [ ] Desktop and mobile controls work.
- [ ] Wildlife, survival, inventory, physics and save systems remain intact.
- [ ] No duplicate companions or one-time events after reload.
- [ ] No major memory leaks or persistent console errors.
- [ ] Actual build/typecheck/tests are run and results recorded.

---

# 12. Google AI Studio implementation instructions

1. Inspect the full existing source before editing.
2. Locate and extend the actual story/prologue, cinematic, dialogue, companion, mission, world clock, weather, audio, save and chunk systems.
3. Implement all 20 event definitions and connect them to real gameplay triggers.
4. Create missing scene assets using the existing asset pipeline; use lightweight procedural Three.js fallbacks only when needed.
5. Preserve existing friend identities and all established story facts.
6. Integrate the apartment and friends into the campaign naturally.
7. Make objectives completable and recoverable after save/load.
8. Write actual source code; do not leave TODO-only placeholders.
9. Do not remove unrelated systems or replace the existing campaign.
10. Run the actual project typecheck, build and available tests.
11. Fix errors introduced by the changes.
12. Report changed files, implemented features, tests actually run and remaining limitations.
13. Never claim success for untested features.
14. Provide an updated complete project ZIP if the environment supports creating it.

## Final acceptance condition

The existing LAST SANCTUARY: REBIRTH game opens with a peaceful, explorable Day 1 containing exactly 10 major events, then transitions into Day 2 with exactly 10 major events: meteorite impact, first infection, citywide outbreak, playable escape with all three friends and establishment of Starter Base. The apartment, four floors, three persistent friends, existing world and all other game systems remain integrated. The campaign is cinematic but primarily playable, save-safe, mobile-friendly and performance-conscious.
