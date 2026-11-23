# LAST SANCTUARY: REBIRTH

# Complete Physical & Environmental Impact Implementation

**Target:** Existing Google AI Studio project\
**Purpose:** A unified, realistic, performant physical-response system
for the player, environment, weather, terrain, water, objects, animals
and dinosaurs.

## 1. Master implementation instruction

Inspect the complete existing project before editing. Identify the
current player controller, physics engine or custom movement
implementation, collision system, animation state machines, health and
stamina systems, environmental simulation, weather, water, wildlife and
dinosaur AI, world streaming, save/load, mobile controls and graphics
settings.

Then implement this specification directly in the existing project.

**Do not create a separate demo or replace the game.** Preserve all
working systems, existing environments, assets, controls, managers and
project conventions. Extend existing systems wherever possible. Do not
invent APIs or assume a particular physics library is installed. If a
capability is absent, implement it using the project's existing
architecture or clearly report the dependency that is genuinely
required.

Before editing: 1. Map relevant source files and system ownership. 2.
Identify the authoritative player movement and physics implementation.
3. Identify how collisions, damage, animation, camera feedback and
status effects work. 4. Identify existing wildlife and dinosaur
behaviour. 5. Plan the smallest compatible changes.

After editing: 1. Run available type checks, builds and tests. 2. Fix
errors introduced by the changes. 3. Test the integrated systems in the
actual game. 4. Report changed files, implemented features, limitations
and tests actually run. 5. Never claim a feature was implemented or
tested if it was only specified.

## 2. Core design principles

-   One authoritative player physics path: all forces and movement
    responses flow through the existing player controller or physics
    body.
-   One shared hazard framework: weather, terrain, water, impacts and
    creature interactions use shared event and response interfaces.
-   Physical and visual effects are separate: camera shake or animation
    alone is not a physical impact.
-   Readable cause and effect: the player should understand what caused
    a movement change or status effect.
-   Fair gameplay: provide warnings, recovery and escape opportunities
    where appropriate.
-   Non-graphic presentation: creature encounters can be tense and
    cinematic without graphic injury, ingestion or chewing depictions.
-   Performance-aware simulation: do not run expensive rigid-body
    simulation for every distant object.
-   Delta-time safety and streaming-safe behaviour.
-   Mobile compatibility and configurable camera comfort.

## 3. Unified architecture

Reuse existing systems first. Add new modules only when no suitable
equivalent exists. Possible responsibilities:

  -----------------------------------------------------------------------
  Responsibility                      Required behaviour
  ----------------------------------- -----------------------------------
  EnvironmentalPhysicsManager         Coordinates environmental forces
                                      and physical events

  HazardManager                       Registers hazards, exposure zones,
                                      warnings and cooldowns

  ImpactResponseManager               Routes impact events to player,
                                      objects and camera feedback

  SurfacePhysicsManager               Supplies terrain-specific movement
                                      properties

  WeatherForceManager                 Applies wind, rain, snow and storm
                                      effects

  WaterInteractionManager             Handles swimming, buoyancy,
                                      currents and immersion

  CreatureInteractionManager          Coordinates creature contact,
                                      knockback, grabs and releases

  PlayerConditionManager              Connects exposure and impact to
                                      existing survival conditions

  PhysicsQualityController            Adjusts simulation detail to
                                      platform and graphics settings
  -----------------------------------------------------------------------

These are suggested responsibilities, not mandatory new class names.
Avoid duplicate managers.

### Shared event model

Use a typed event or equivalent structure with: - event type; - world
position; - direction or force vector; - effective radius; - bounded
intensity; - duration; - source and affected entity identifiers; - event
identifier for deduplication; - gameplay tags; - optional warning and
recovery metadata.

Validate finite numbers. Reject NaN, infinity, invalid vectors, negative
radii and stale entity references. Clamp values to sensible game-design
limits.

### Force application

Use the existing physics body's supported force or impulse API. If the
player uses a custom controller, route the effect through its velocity
and movement integration rather than applying a second independent
simulation.

Distinguish continuous forces (wind/current), impulses
(collision/shockwave), contact constraints (slopes) and status effects
(cold/visibility). Never repeatedly apply a one-time impulse every
frame.

## 4. Player physical response

Implement context-sensitive responses for: - collision and knockback; -
momentum and inertia; - stumbling and stagger; - falling and landing; -
slipping and sliding; - pushing and being pushed; - swimming and
buoyancy; - wind exposure; - temporary movement restriction; - balance
recovery; - creature capture and release where supported.

Use or extend the existing animation and movement state machine.
Suggested states: grounded, airborne, landing, slipping, swimming,
staggered, knocked down, grabbed, recovering and defeated.

Define valid state transitions and cancellation rules. Prevent
incompatible states from running simultaneously. Do not allow permanent
ragdoll or movement lock. Restore normal movement after the event.
Respect accessibility and camera settings.

## 5. Collision and impact response

Support physical contact between the player and terrain, static
structures, movable props, supported vehicles, wildlife, dinosaurs,
water surfaces and environmental debris.

Collision response should consider relative velocity, contact normal,
effective mass, surface material and collision type.

**Light contact:** small movement response or sound; no unnecessary
health reduction.

**Moderate collision:** appropriate stagger or knockback, optional short
recovery and clear audio/animation feedback.

**Major environmental impact:** stronger but bounded physical response,
configurable camera feedback and existing condition effects only when
justified by game rules.

Prevent duplicate damage or impulses from multiple callbacks during the
same contact. Use event identifiers, contact cooldowns or the existing
collision lifecycle.

### Falling objects and debris

-   Objects collide with terrain and supported structures.
-   Nearby loose objects may react to impacts.
-   Distant objects use simplified simulation.
-   Bound debris counts.
-   Prevent repeated damage while an object remains in contact with the
    player.

### Environmental shockwaves

Use a bounded radial gameplay event with an origin, radius, falloff
curve, impulse cap, optional line-of-sight check, event deduplication
and visual/audio feedback. It must affect gameplay, not merely shake the
camera. Keep the model abstract and tuned for fictional gameplay; do not
implement real-world blast calculations.

## 6. Terrain and surface physics

Create data-driven surface profiles for concrete, asphalt, grass, mud,
sand, gravel, snow, ice, wet ground, rocky ground, wood, metal, shallow
water and deep water.

Each profile can define game-tuned values for: - friction and
traction; - movement resistance; - sliding tendency; - footstep and
landing sound identifiers; - particle effect identifiers; - optional
movement modifiers; - wetness or temperature interaction.

Use surface lookup or material tags integrated with existing terrain and
collision data. Smooth surface transitions to avoid jitter.

## 7. Weather and environmental exposure

### Wind

Apply bounded game-tuned forces to exposed player movement where
appropriate. Affect foliage and lightweight objects. Sheltered areas
should reduce effects. Do not push the player uncontrollably.

### Rain

Update wetness and puddle visuals where supported. Adjust traction
through surface profiles. Add rain audio and visibility changes without
expensive per-frame terrain rebuilds.

### Thunderstorms

Lightning illuminates the scene. Thunder timing and volume respond to
in-game distance. Storms influence visibility and ambience. Do not make
every lightning event a guaranteed player hit.

### Snow

Represent accumulation through supported material, particle or terrain
layers. Snow-covered surfaces use appropriate traction profiles. Keep
accumulation bounded.

### Sandstorms and fog

Reduce visibility with distance-aware effects. Add wind-driven particles
for sandstorms. Keep interface text readable. NPC perception may respond
if supported by existing AI.

### Temperature and exposure

Connect cold, heat, wetness and exposure to existing survival status
systems. Use gradual, readable, game-tuned changes and clear UI
feedback. Avoid arbitrary instant penalties.

## 8. Water and flooding physics

Integrate with the existing water implementation. Do not create a second
water engine.

Support water-depth detection, entering/exiting water, swimming,
buoyancy or a stable approximation, water resistance, underwater
movement, surface floating, river currents, waterfalls, flooded areas
and wetness state.

Use different behaviour for shallow, deep and underwater states. Ensure
the player cannot become trapped beneath the surface due to conflicting
movement controllers. Add clear transitions and recovery.

## 9. Falling, landing and slopes

Use fall state and landing information from the authoritative player
controller.

Support landing animation selection, landing sound, camera feedback,
temporary recovery, game-tuned stamina or health consequences where
appropriate, slope traction and sliding on selected surfaces.

Scale consequences by game-defined fall categories and player state.
Avoid real-world injury thresholds or medical claims. Ensure small steps
do not trigger major fall reactions.

## 10. Environmental hazard framework

Register hazards as data-driven world entities or volumes.

**Natural hazards:** severe weather, flood zones, falling rocks, falling
trees, unstable terrain, deep water, extreme temperature and low
visibility.

**Structural hazards:** unstable floors, falling building debris,
collapsing structures, damaged bridges, moving machinery and fictional
electrical hazard zones.

**World hazards:** meteorite impact areas, environmental shockwave
events and fictional geothermal or volcanic regions if present.

Each hazard supports activation state, detection volume, warning state,
exposure duration, effect type and intensity, cooldown, safe
exit/recovery condition and persistence/streaming behaviour where
needed.

Communicate hazards through environmental cues, sound, animation and
clear interface messages.

## 11. Player survival integration

Connect hazards to existing condition systems. Possible effects include
health, stamina, temperature, wet clothing, movement modifiers,
visibility impairment, temporary disorientation and recovery
requirements.

Do not create duplicate health or stamina systems. Avoid stacking the
same status effect every frame. Define duration, refresh and stacking
rules. Explain the source of a status effect in the HUD.

## 12. Animal and dinosaur physical interactions

Integrate with existing wildlife and dinosaur AI, navigation, animation,
collision and health systems. Species must have distinct movement,
temperament, warning signals and encounter behaviour.

Example fictional behaviour categories: - Small defensive animals:
warning, retreat or brief contact reaction. - Pack predators:
coordinated pursuit and retreat conditions. - Large mammals: charge,
collision, knockback and disengagement. - Semi-aquatic predators:
water-edge encounter and temporary capture behaviour. - Large dinosaurs:
territorial warning, charge, push, knockdown or temporary grab where
suitable. - Herbivorous dinosaurs: defensive charge, trampling-style
environmental interaction and territorial display.

These are fictional game behaviours, not instructions for approaching or
handling real wildlife.

### Creature encounter state machine

Suggested states: 1. idle / roaming; 2. awareness; 3. warning; 4.
pursuit or defensive approach; 5. attack animation; 6. contact
validation; 7. physical response; 8. optional temporary grab; 9. release
or disengage; 10. retreat / reset.

Use actual creature animation state and collision data. Visual animation
must not register repeated hits every frame.

### Physical impacts

For an appropriate creature collision: - validate contact; - calculate a
bounded game impulse using the existing physics system; - trigger a
matching player response; - apply any allowed condition effect once per
event; - play creature and player reactions; - start recovery; - allow
the encounter to continue or disengage.

### Large-creature grab and temporary capture

For suitable species: - align player and creature using animation
attachment points or the project's equivalent; - synchronize both
animation state machines; - temporarily constrain player movement
without disabling all game logic; - prevent clipping and unwanted
rotation; - provide an escape opportunity where intended; - allow the
creature to release the player; - restore player control safely; -
handle interruption, creature despawn, chunk unload and save/load.

Do not depict graphic swallowing, chewing, ingestion or injury. If a
predator encounter ends in defeat, use a non-graphic cinematic
transition, fade, status message and existing checkpoint/respawn flow.

Give players readable warning cues and fair escape or disengagement
opportunities. Avoid unavoidable instant defeat from ordinary roaming
encounters. Prevent repeated attack registration and unrecoverable
animation locks.

### Companions

Where supported, friends react to nearby encounters, regroup or move to
a safe position, do not teleport unrealistically and recover correctly.
Story-critical companions must not become permanently lost due to random
wildlife events.

## 13. Meteorite event integration

The meteorite event from the story campaign uses the same shared impact
framework.

Implement a persistent impact location, crater and environmental state,
dust/lighting/audio effects, bounded gameplay shockwave, nearby
loose-object reactions, supported environmental changes, NPC and
wildlife reactions, chunk persistence and save/load.

The player's experience should depend on in-game position and available
cover, without real-world blast modelling. A video background or camera
shake alone is insufficient.

## 14. Starter Base and open-world integration

Use the same physical systems at the Starter Base and across all
existing environments.

Examples: - doors and gates respond to interaction and collision; -
movable props use appropriate physics; - wind and rain affect exposed
areas; - water storage and flooded areas use water state; - machinery
has interactive state and collision; - objects remain stable and
persistent where supported.

Across the open world, hazards work in streamed chunks. Nearby physics
uses higher detail; distant simulation uses simplified updates.
Persistent world events are restored when chunks reload. Chunk unloading
cleans up transient events and references safely.

## 15. Camera, animation and sound feedback

Connect physical responses to the existing third-person camera and
animation controller.

Support impact camera shake, landing feedback, wind movement, swimming
camera behaviour, stagger/recovery animations, creature contact/capture
animations, environmental sounds, surface-specific footsteps and
impact/debris sounds.

Camera shake and motion effects must be configurable. Do not make the
camera permanently unstable or obscure gameplay.

## 16. Performance, stability and mobile support

Support desktop and mobile using configurable physics quality,
distance-based simulation, simplified distant objects, existing
broad-phase collision systems, bounded debris and particle counts,
object sleep/wake behaviour if supported, collision layers and masks,
pooling where appropriate, stable delta-time handling and limited active
creature interactions.

Integrate with existing LOW, MEDIUM, HIGH and ULTRA settings if
available.

Do not run a second physics engine alongside the existing one. Do not
simulate every distant tree, rock or wildlife entity at full detail.

## 17. Save and load

Persist only necessary state: - persistent crater and environmental
changes; - activated or completed hazard events; - world object changes
supported by current persistence; - player conditions where already
saved; - creature encounter state only if necessary and safe to
restore; - Starter Base state.

Do not save transient physics internals such as stale contact pointers
or invalid body references. Reconstruct those safely on load.

After loading, ensure no duplicate forces, stuck grab state, stale
collision references, repeated meteorite event, lost companion or broken
player movement.

## 18. Required test plan

Run available type checks, linting, build and tests. Add focused tests
where architecture permits.

**Player physics:** ordinary movement, light/moderate collisions,
bounded knockback, stagger/recovery, fall/landing, slopes and no
permanent movement lock.

**Surfaces and weather:** concrete, grass, mud, sand, gravel, snow, ice,
wet transitions, exposed/sheltered wind, rain/storm transitions,
fog/sandstorm visibility and stable performance.

**Water:** shallow/deep water, swimming entry/exit, buoyancy, currents,
underwater control and no trapped player state.

**Objects and impacts:** falling objects, collisions, event
deduplication, bounded shockwave effects, debris limits and no repeated
damage from persistent contact.

**Wildlife and dinosaurs:** species-specific awareness/warning, pursuit
and attack transitions, collision validation, one response per impact,
optional grab alignment, escape/release, non-graphic defeat/checkpoint
transition, no clipping or permanent capture and companion recovery.

**World integration:** meteorite persistence, chunk load/unload,
save/load, all existing environments, Starter Base, mobile/desktop
controls and existing inventory, crafting, quests and survival.

Record actual test results. Distinguish completed implementation,
partial implementation, blocked dependencies and untested features.

## 19. Final implementation command

Now inspect the existing LAST SANCTUARY: REBIRTH project and implement
this complete unified physical and environmental impact system directly
into it.

Do not stop after generating a plan or describing code. Modify the real
source files, integrate with existing systems, run available checks, fix
regressions and provide a clear report.

Preserve the existing game and all working systems. Do not create a
separate demo. Do not claim success for anything that has not actually
been implemented and verified.

The final experience must make the world feel physically responsive:
surfaces, weather, water, falling objects, environmental events, animals
and dinosaurs must all interact coherently with the player and the
existing game world.
