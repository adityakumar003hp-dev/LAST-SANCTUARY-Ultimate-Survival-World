# LAST SANCTUARY: REBIRTH

# Implementation File 02 --- Physics Collision / Hitbox Repair + Objective Navigator

**Target:** Existing Google AI Studio game project\
**Priority:** Critical gameplay functionality\
**Scope:** Fix characters and objects behaving like visual ghosts,
restore reliable collision and interaction hitboxes, and add an
objective navigation system that guides the player to destinations such
as a café.

------------------------------------------------------------------------

# MASTER INSTRUCTION TO GOOGLE AI STUDIO

Inspect the existing LAST SANCTUARY: REBIRTH project and implement the
following changes directly in the current source code.

This is a repair and feature-integration task, not a new demo.

**Do not replace the game, player controller, physics engine, world
generator, NPC system, or UI architecture.** First identify the current
implementations and repair or extend them. Preserve existing
environments, story missions, controls, assets, animations, inventory,
quests, save/load, mobile support and the previous environmental physics
work.

Do not claim that a hitbox, collision, route or feature works unless it
has actually been implemented and tested in the running project.

------------------------------------------------------------------------

# PART A --- CRITICAL PHYSICS AND HITBOX REPAIR

## 1. Diagnose why everything behaves like a ghost

The current problem: characters and/or world objects appear visually,
but the player can pass through them or they do not physically respond
as expected. They appear to have no effective hitboxes.

Do not guess at the cause. Inspect the actual code and identify the
specific failure(s).

Check all of the following:

1.  Are physics bodies or collision shapes created for the player, NPCs,
    animals, buildings and props?
2.  Are collision shapes attached to the correct entity and transformed
    with it?
3.  Are collision bodies accidentally configured as triggers/sensors
    instead of solid bodies?
4.  Are collision layers and masks configured so relevant entities can
    detect one another?
5.  Are objects missing physics registration after spawning or chunk
    loading?
6.  Are collision meshes or primitive colliders incorrectly scaled,
    offset or rotated?
7.  Is the player movement controller bypassing the physics engine?
8.  Are collision bodies being disabled, disposed or detached during
    animation or scene updates?
9.  Are visual meshes and physics bodies using different world positions
    or coordinate spaces?
10. Are static and dynamic body types configured correctly?
11. Are collision callbacks/events connected and processed?
12. Are streamed chunks registering collision after load and
    unregistering safely on unload?
13. Are raycasts or ground checks using the correct collision filters?
14. Are animation updates overwriting physics-controlled transforms?
15. Are there duplicate update loops causing physics state to be
    overwritten?

Produce a short diagnosis in the implementation report, naming the
actual root causes found.

## 2. Establish one authoritative collision architecture

Use the existing physics engine and collision implementation. Do not
introduce a second physics engine.

Ensure each relevant entity has a clearly defined collision role:

-   Player: solid character controller or dynamic body, according to
    existing architecture.
-   NPCs and companions: solid character collision where appropriate.
-   Animals and dinosaurs: solid collision and species-appropriate
    interaction volumes.
-   Buildings and walls: static solid collision.
-   Floors and terrain: static collision or the existing terrain
    collision representation.
-   Doors and movable props: appropriate static, kinematic or dynamic
    bodies.
-   Trigger volumes: sensors only for intentional detection zones,
    mission zones, interaction ranges and hazard areas.

Visual-only decorative objects may remain non-collidable where
appropriate. Do not make every leaf, particle or tiny decoration a solid
obstacle.

## 3. Collision shape requirements

Use collision shapes suited to each object, rather than blindly using
detailed render meshes for everything.

Recommended collider choices, adapted to the current engine:

-   Player: capsule or existing character-controller shape.
-   Human NPCs: capsule or simplified compound shape.
-   Quadruped animals: capsule/box/compound shapes matched to body
    proportions.
-   Large dinosaurs: compound shapes or a small number of stable
    primitives.
-   Buildings: boxes, convex shapes or simplified static collision
    meshes.
-   Terrain: existing heightfield, terrain collider or suitable static
    mesh collider.
-   Small props: box, sphere or capsule.
-   Complex moving objects: convex collider where supported.

Colliders must: - have correct dimensions; - align with the visual
model; - follow entity transforms; - avoid excessive overlap; - avoid
unstable or unnecessarily complex triangle meshes for moving bodies; -
be created and disposed with the entity lifecycle.

Do not create a collider for every individual animated bone. Use stable
body-level collision and optional hit zones only where gameplay needs
them.

## 4. Collision layers and masks

Inspect the project's actual collision-layer API and define a documented
collision matrix.

At minimum, verify intended interactions among: - player; -
NPC/companion; - animal/dinosaur; - terrain/floor; - static building; -
movable prop; - vehicle, if present; - trigger/sensor; - projectile or
gameplay effect, if present.

Ensure: - player collides with floors, walls, buildings and solid
props; - NPCs collide with world geometry where required; - creatures
collide with terrain and solid structures; - player-creature contact is
detected; - interaction and mission triggers do not physically block
movement; - sensors do not accidentally replace solid colliders; -
collision filters do not silently exclude the player from all world
geometry.

Document the actual layer/mask mapping in code comments or project
documentation.

## 5. Player movement must respect collision

Repair the authoritative player movement path so the character cannot
walk through solid walls, buildings, terrain or solid NPCs/creatures
where collision is intended.

Requirements: - resolve movement against collision geometry; - prevent
falling through floors; - prevent walking through walls; - support
stairs/slopes according to existing movement design; - preserve jumping
and falling if supported; - preserve swimming and environmental
movement; - prevent tunnelling at normal gameplay speeds using the
engine's supported methods; - keep movement stable at different frame
rates; - preserve keyboard, controller and mobile input.

Do not simply freeze the player on contact. Allow sliding along walls
and smooth movement around corners where the existing controller
supports it.

## 6. NPC, animal and dinosaur collision

NPCs and creatures must not be visual ghosts.

Implement: - world collision for navigation and movement; -
collision-aware movement or avoidance; - appropriate player contact
response; - collision with buildings and major objects; - stable
collision during animation; - no unintended overlap between companions
and player; - safe recovery if an NPC becomes stuck.

Use navigation avoidance where available, but do not treat avoidance as
a substitute for physical collision.

For large creatures, use stable compound colliders rather than a huge
single inaccurate box. Keep collision and interaction/hit zones
distinct.

## 7. Hitboxes versus interaction zones

Keep these concepts separate:

**Solid collider:** prevents physical passage through an object.

**Hitbox/contact zone:** detects a gameplay contact or impact.

**Interaction zone:** allows the player to interact when nearby.

**Navigation obstacle:** informs NPC pathfinding that an area is
blocked.

Do not use a large interaction trigger as a physical wall. Do not use a
visual mesh as proof that a solid collider exists.

Provide debug visualization for each category, with different colours or
labels, using the project's existing debug UI if available.

## 8. Doors, buildings and props

Verify: - walls and building structures block the player; - floors
support the player; - doors have the correct closed/open collision
state; - opening a door updates or moves its collider; - movable props
have stable collision; - furniture and large objects cannot be walked
through if intended to be solid; - decorative objects can remain
non-collidable when appropriate.

Avoid gaps between adjacent wall/floor colliders that let the player
fall through.

## 9. Spawn, streaming and lifecycle

Every entity that needs collision must register its collider when
spawned.

When a chunk loads: 1. create or restore its collision data; 2. register
it with the existing physics world; 3. ensure transforms and filters are
correct; 4. only then allow the player to interact with the loaded area.

When a chunk unloads: - safely unregister physics bodies; - remove stale
references; - preserve persistent world state; - avoid leaving invisible
collision behind.

Apply the same lifecycle rules to NPCs, animals, dinosaurs, doors and
spawned props.

## 10. Physics debug mode

Add a developer-only collision debug mode, preferably toggleable through
the existing debug menu.

Show: - collider wireframes; - collider bounds and orientation; - entity
identifiers; - collision layer and mask; - body type; - trigger/sensor
status; - collision contact points where available; - grounded state and
ground-check result; - current physics registration status.

The debug mode must not be enabled by default for ordinary players.

## 11. Physics repair test checklist

Test in the actual running game:

-   Walk into a building wall: player is blocked.
-   Walk along the wall: player slides instead of passing through.
-   Stand on a floor: player does not fall through.
-   Walk into a solid closed door: player is blocked.
-   Open the door: passage becomes possible.
-   Walk into a solid prop: expected collision occurs.
-   Approach an NPC: collision/contact behaves as designed.
-   Approach a companion: no uncontrolled overlap or jitter.
-   Approach an animal/dinosaur: physical contact is detected.
-   Move an NPC against a wall: it does not pass through the wall.
-   Load a new world chunk: its collision is active.
-   Unload a chunk: no invisible collider remains.
-   Test desktop and mobile controls.
-   Test different frame rates.
-   Test save/load and respawn.

Do not mark the repair complete until these tests have been performed or
clearly label untested cases.

------------------------------------------------------------------------

# PART B --- OBJECTIVE NAVIGATOR AND WAYFINDING SYSTEM

## 12. Purpose

Add a clear navigation system so the player always understands where to
go for the active mission.

Example current objective:

**MEET YOUR FRIENDS AT THE CAFÉ**

The player should not have to guess where the café is. The game must
identify the actual café location in the world and guide the player
there.

The navigator must use real mission destination data and real world
coordinates, not a hard-coded screen arrow pointing in an arbitrary
direction.

## 13. Objective data structure

Extend the existing quest/mission system. Each objective that needs
navigation should be able to provide:

-   unique objective ID;
-   objective title;
-   short instruction;
-   destination entity or location ID;
-   world-space destination position or a reliable resolver;
-   optional destination radius;
-   optional floor/level identifier;
-   optional map marker icon;
-   optional route category;
-   completion condition;
-   optional prerequisites.

Prefer references to actual world entities or named locations over
copied, stale coordinates.

Example conceptual objective:

-   ID: story_day1_meet_friends
-   Title: Meet your friends
-   Instruction: Go to the café
-   Destination: cafe_main_city
-   Completion: enter the meeting area and trigger the mission
    interaction

Adapt field names to existing project conventions.

## 14. Active objective HUD

Add a compact objective panel to the existing HUD.

Display: - active mission title; - current step; - destination name; -
distance to destination; - directional guidance; - optional estimated
walking time only if the game already calculates it reliably.

Example:

MISSION MEET YOUR FRIENDS

Destination: Central Café Distance: 240 m Direction: Follow the route

Update the distance as the player moves.

Do not cover important controls, subtitles or mobile touch buttons. Make
the panel responsive for desktop and mobile.

## 15. Direction indicator

Add a clear compass or directional indicator.

Requirements: - show the direction of the active destination relative to
the player's facing direction; - rotate correctly as the player turns; -
use the actual player transform and destination position; - update
smoothly without lag; - show a clear arrival state when close enough; -
support destinations above or below the player's current floor where
applicable.

Do not confuse world north, camera direction and player facing
direction. Use a consistent coordinate convention from the existing
project.

## 16. World waypoint marker

Show a visible in-world waypoint for the active destination.

For the café example: - display a marker above or near the actual café
entrance; - keep it visible at useful distances; - use distance-aware
scaling or visibility; - prevent the marker from appearing through
obstructing geometry if the project supports occlusion; - avoid covering
the player's view; - show the destination name and distance when
appropriate; - hide or change the marker after arrival or objective
completion.

Do not place a marker at the centre of the city if the café is
elsewhere. Resolve the marker to the actual café entrance or designated
mission point.

## 17. Minimap and full map

If the project already has a minimap or world map, extend it rather than
creating a duplicate.

Show: - player location and facing direction; - active objective
marker; - route line; - important nearby landmarks; - destination
label; - optional map zoom and recenter controls.

If there is no map system, implement a simple minimap only if compatible
with the current UI and world-coordinate architecture. Do not build a
second world map that becomes inconsistent with the actual world.

The full map should allow the player to identify the destination and
understand the route.

## 18. Route calculation

Use the project's existing navigation mesh, road graph, waypoint graph
or pathfinding system.

The route should: - follow walkable paths and roads; - avoid buildings
and blocked areas; - account for doors and accessible entrances where
supported; - update if a path becomes blocked; - recalculate when the
player moves far off route; - support streamed world chunks; - guide to
the actual entrance or mission interaction point.

Do not draw a straight line through buildings when a navigable route
exists.

If no pathfinding system exists, inspect the world architecture and
implement a compatible lightweight navigation graph for mission
destinations. Do not invent a route through unloaded or inaccessible
terrain.

When no valid route is available, clearly tell the player that the route
is unavailable and provide a map marker or nearest known waypoint rather
than displaying a false route.

## 19. Café mission example --- end-to-end

Implement the following story objective using the actual city location.

**Mission:** MEET YOUR FRIENDS

**Instruction:** Your friends are waiting at the Central Café.

Expected behaviour:

1.  Mission activates.
2.  Quest system resolves the actual Central Café location.
3.  HUD displays "Meet your friends at the Central Café."
4.  Compass points toward the café.
5.  World marker appears at the café entrance.
6.  Minimap displays the café marker and route.
7.  Distance updates while the player walks.
8.  Route follows streets and walkable paths.
9.  Near the café, guidance changes to "Destination nearby."
10. At the entrance, display "Enter the café."
11. When the player enters the correct meeting area, trigger the mission
    interaction.
12. Start the friend conversation.
13. Mark the objective complete.
14. Remove the active route and activate the next objective.

The café must exist as an actual accessible game location with a correct
destination identifier and interaction trigger. Do not complete the
objective simply because the player is near an unrelated point.

## 20. Navigation for all story and side missions

Make the navigator reusable for: - meeting friends; - returning to the
apartment; - visiting shops; - finding the meteorite impact area; -
locating companions; - reaching evacuation points; - travelling to the
Starter Base; - finding survivors; - reaching quest objects; - returning
to a mission giver.

The quest system should be able to activate, update and clear navigation
targets without creating duplicate markers.

## 21. Navigation controls and accessibility

Support: - show/hide navigation; - toggle minimap if available; -
recenter map; - optional route visibility; - clear destination label; -
adjustable marker visibility; - readable colours and icons; -
mobile-safe HUD placement.

Use existing input settings and UI conventions. Do not make the player
dependent on a tiny arrow alone; include destination names and map
context.

## 22. Navigator state and save/load

Save the active objective ID and relevant mission state using the
existing quest save system.

On load: - restore the active objective; - resolve its destination from
the current world; - rebuild the marker and route; - recalculate
distance; - avoid duplicate route lines or markers; - handle a
destination that is not currently loaded.

Do not save stale runtime object pointers. Save stable IDs and resolve
entities again.

------------------------------------------------------------------------

# PART C --- INTEGRATION, PERFORMANCE AND TESTING

## 23. Suggested system responsibilities

Reuse current implementations first. Add only missing responsibilities,
such as:

-   CollisionDiagnostics
-   EntityColliderFactory
-   CollisionLayerConfig
-   ObjectiveNavigationController
-   ObjectiveDestinationResolver
-   RouteService
-   WorldWaypointManager
-   ObjectiveHUD

These are suggestions. Do not add duplicate managers if equivalent
systems already exist.

## 24. Performance requirements

-   Use simplified colliders for most characters and objects.
-   Avoid detailed triangle colliders on moving bodies.
-   Update route paths only when needed, not every rendered frame.
-   Update distance and compass at a reasonable interval.
-   Pool or reuse waypoint UI objects.
-   Support chunk streaming.
-   Keep mobile performance in mind.
-   Integrate with existing graphics and physics quality settings.

## 25. Final acceptance tests

### Collision repair

-   Player cannot pass through intended solid walls, floors, doors and
    objects.
-   NPCs and creatures have correct collision.
-   Trigger volumes remain non-blocking.
-   Colliders align with visual entities.
-   Chunk load/unload does not create missing or invisible collision.
-   No jitter, tunnelling or permanent stuck states.
-   Desktop and mobile controls remain functional.

### Objective navigation

-   Activate "Meet your friends at the café."
-   HUD shows the correct destination.
-   Compass points in the correct direction.
-   World marker is at the actual café.
-   Map route follows a walkable path.
-   Distance changes as the player moves.
-   Reaching the café triggers the correct mission interaction.
-   Completing the mission clears the old marker.
-   Next objective receives its own correct destination.
-   Save/load restores navigation correctly.
-   Off-route movement causes sensible recalculation.

### Regression checks

-   Existing story missions still work.
-   Existing world and chunk systems still work.
-   Existing physics and environmental impacts still work.
-   Existing NPC, animal and dinosaur systems still work.
-   Existing UI, inventory, crafting and save/load still work.
-   No TypeScript/build errors introduced.

## 26. Final command

Inspect the actual LAST SANCTUARY: REBIRTH project, diagnose and repair
the ghost/no-hitbox problem, then implement the objective navigator and
the Central Café mission example.

Modify the real project files. Do not stop after writing a plan. Run
available checks and report:

1.  Root cause(s) found for the missing collision.
2.  Files changed.
3.  Collision categories repaired.
4.  How the café destination is resolved.
5.  How compass, marker, map and route work.
6.  Tests actually run and their results.
7.  Any remaining limitations.

Preserve all existing game systems. Never fake a successful collision or
route. The final result must let the player physically interact with the
world and reliably find mission destinations.
