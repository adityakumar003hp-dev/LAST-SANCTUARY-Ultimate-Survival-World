# LAST SANCTUARY: REBIRTH

## Final Master Implementation Prompt for Google AI Studio Build Mode

**Version:** 4.0 --- Complete Open-World RPG Specification\
**Genre:** Ultra-realistic 3D open-world survival RPG / life simulation\
**Target:** Browser game, desktop and mobile responsive\
**Visual direction:** Realistic 3D environments and characters; not
voxel or Minecraft-style

------------------------------------------------------------------------

# 1. YOUR ROLE AND PRIMARY OBJECTIVE

Act as a senior game-engineering team: technical director, gameplay
programmer, 3D world engineer, AI engineer, UI/UX designer, systems
designer, optimization engineer, and QA lead.

Build **LAST SANCTUARY: REBIRTH**, a persistent, immersive,
single-player-first, open-world RPG set in a world recovering from a
zombie apocalypse.

This must be an actual playable game inside the existing Google AI
Studio Build project---not merely a concept page, static mock-up,
landing page, or collection of non-functional buttons.

The game combines: - Open-world exploration and discovery - Character
creation and RPG progression - Survival and resource management -
Settlement construction and management - NPC communities, companions,
relationships, and dialogue - Main story, side quests, faction missions,
and dynamic events - Farming, cooking, fishing, trading, crafting, and
daily life - Vehicles and world traversal - A dynamic day/night,
weather, and seasonal simulation - Fictional, non-graphic zombie
encounters and defensive strategy - Persistent saving and meaningful
consequences

**Important delivery rule:** Do not claim that a feature is complete
unless it is implemented and tested. Build a reliable playable
foundation first, then extend it in clearly separated phases. Never
replace working systems with placeholder screens just to make the
feature list appear complete.

------------------------------------------------------------------------

# 2. TECHNICAL FOUNDATION

Use the existing project structure where one exists. Inspect it before
editing. Preserve working files and features. Do not delete or rewrite
unrelated project code.

Preferred technology: - React and TypeScript for application structure
and UI - Three.js for the 3D world and rendering - WebGL-compatible
rendering - Tailwind CSS or the project's existing styling system -
IndexedDB for persistent world saves and larger game data - Local
storage only for small settings and session preferences

Engineering requirements: 1. Separate game simulation from UI rendering.
2. Use modular TypeScript systems with clear interfaces. 3. Avoid one
giant component or one giant game loop file. 4. Use deterministic
world-generation seeds so a saved world can be reconstructed. 5. Use
chunk-based world streaming and distance-based level of detail. 6. Use
instancing for repeated environmental objects. 7. Use object pooling for
frequently created and removed entities. 8. Use spatial partitioning for
NPCs, wildlife, and zombie awareness. 9. Use a fixed or controlled
simulation timestep where appropriate. 10. Pause or reduce background
simulation when the game is inactive. 11. Handle window resizing, tab
visibility, device pixel ratio, and context loss. 12. Provide graceful
fallbacks when advanced graphics are unsupported. 13. Keep save data
versioned and implement safe migration. 14. Add error handling, loading
states, and recovery from failed saves. 15. Keep all game logic local
for the initial single-player version. Do not present multiplayer as
functional unless a real server, authentication, synchronization,
validation, and persistence layer has been implemented.

Suggested module boundaries: - `GameApp` - `GameEngine` -
`WorldEngine` - `WorldStreaming` - `TerrainGenerator` - `BiomeSystem` -
`EnvironmentSystem` - `TimeSystem` - `WeatherSystem` -
`PlayerController` - `CameraManager` - `CharacterSystem` -
`CharacterProgression` - `InventorySystem` - `ItemDatabase` -
`CraftingSystem` - `BuildingSystem` - `SurvivalSystem` - `NPCManager` -
`DialogueSystem` - `RelationshipSystem` - `CompanionSystem` -
`QuestEngine` - `FactionSystem` - `SettlementManager` -
`EconomySystem` - `ZombieSimulation` - `HordeDirector` -
`VehicleSystem` - `WorldEventDirector` - `MapSystem` - `AudioManager` -
`SaveManager` - `UIManager`

Adapt these names to the existing architecture rather than creating
duplicate systems.

------------------------------------------------------------------------

# 3. GAME FLOW AND MENUS

Create a polished, cinematic main menu with: - New Game - Continue -
Load Game - Story Mode - Open-World Sandbox - Survival Mode - Creative
Building Mode - Settings - Credits

New Game flow: 1. Show a short, skippable cinematic introduction. 2. Let
the player create a character. 3. Let the player choose a difficulty. 4.
Let the player choose a world-generation seed or use a random seed. 5.
Generate the world and begin the opening mission. 6. Introduce controls
through optional contextual tutorials.

Difficulty presets: - Explorer: forgiving survival needs and lower
encounter pressure. - Standard: balanced survival and progression. -
Survivor: demanding resource management and stronger world pressure. -
Custom: adjustable survival, world, and encounter settings.

Do not lock the player into a mode without explaining its rules. Allow
accessibility settings to be changed later.

------------------------------------------------------------------------

# 4. CHARACTER CREATION AND RPG PROGRESSION

Create a character creator with: - Character name - Selectable face
presets - Hair styles and colors - Skin and clothing color choices -
Outfit presets - Accessories - Body-type presets that are purely
cosmetic and do not imply a preferred body ideal - Optional voice preset
if supported by available assets

Create a character profile with: - Level and experience - Health -
Stamina - Strength - Endurance - Agility - Intelligence - Engineering -
Survival - Perception - Charisma

Skills should improve through use and progression. Include skill trees
for: - Exploration - Survival - Engineering - Farming - Crafting -
Settlement leadership - Negotiation - Companion support

Use clear descriptions, balanced upgrade costs, and visible effects.
Avoid upgrades that make the player permanently overpowered.

------------------------------------------------------------------------

# 5. OPEN-WORLD MAP AND ENVIRONMENTS

Create a large, seamless-feeling world divided into streamable regions.
Use a hybrid approach: procedural generation for terrain, natural
variation, minor locations, and repeatable content; handcrafted or
carefully authored locations for the main story, important settlements,
and major quests.

World regions: 1. Abandoned metropolis 2. Suburban neighborhoods 3.
Dense forest 4. Mountain range 5. Rural villages 6. Farmland and
countryside 7. Industrial district 8. Research campus 9. Military
outpost 10. Coastal region 11. Islands 12. Underground metro 13. Cave
networks 14. Highway and service stations 15. Remote bunkers 16.
Survivor settlements 17. Lakes and rivers 18. Marshland 19. Abandoned
airport 20. Desert or dry badlands region

World-generation requirements: - Varied terrain elevation - Rivers,
lakes, roads, trails, bridges, and tunnels - Forest density variation -
Buildings with enterable interiors where practical - Landmarks visible
from a distance - Loot locations and resource zones - Hidden routes and
discoverable areas - Weather-appropriate vegetation - World boundaries
that feel natural - No obvious repeated copy-paste layouts

Use world chunks that load around the player and unload safely at a
distance. Keep important quest and settlement locations stable across
saves.

------------------------------------------------------------------------

# 6. PLAYER MOVEMENT AND CAMERA

Support both first-person and third-person views.

Camera controls: - Toggle first/third person with `V` - Mouse look on
desktop - Adjustable sensitivity - Adjustable field of view - Camera
collision so it does not pass through walls - Smooth camera
transitions - Optional camera shake with an accessibility toggle -
Adjustable third-person follow distance

Desktop controls: - `W A S D`: movement - Mouse: look - `Space`: jump -
`Shift`: sprint - `Ctrl`: crouch - `E`: interact - `I`: inventory - `M`:
map - `J`: journal and quests - `C`: character - `V`: camera toggle -
`Esc`: pause

Mobile controls: - Responsive virtual joystick - Touch camera-look
area - Contextual interact button - Jump, crouch, and sprint controls -
Inventory, map, and quest shortcuts - Scalable HUD - Support portrait
and landscape layouts where practical - Avoid controls overlapping
important screen content

Include remappable controls, controller support if feasible, and a
complete controls-help screen.

------------------------------------------------------------------------

# 7. SURVIVAL SIMULATION

Track: - Health - Stamina - Hunger - Thirst - Temperature - Rest and
fatigue - Infection status as a fictional game status - Environmental
exposure

Survival systems: - Food and water consumption - Cooking and food
preservation - Clean and unsafe water as abstract game item states -
Shelter and temperature protection - Resting and sleeping - Medical
supplies as fictional inventory items - Status effects with clear,
non-graphic UI descriptions - Recovery through appropriate in-game
resources and rest

Make survival understandable rather than frustrating. Give warnings
before a critical status is reached. Provide adjustable survival
settings.

Do not depict graphic injury or gore. Use stylized visual feedback,
icons, animations, and concise status messages.

------------------------------------------------------------------------

# 8. RESOURCES, INVENTORY, AND ITEMS

Resource categories: - Wood - Stone - Metal scrap - Fabric -
Components - Fuel - Food - Water - Seeds - Medicine supplies - Building
materials - Electronic parts - Quest objects - Collectibles

Inventory features: - Grid or list view - Item icons and descriptions -
Stack limits - Weight or capacity system - Sorting and filtering - Quick
slots - Equipment slots - Compare item details - Split, transfer, store,
and discard actions - Search - Clear feedback for full inventory

Use an item database rather than hardcoding item data into UI
components. Each item should have a unique ID, category, description,
stack size, weight, rarity, and relevant gameplay properties.

------------------------------------------------------------------------

# 9. GATHERING, CRAFTING, AND WORKSHOPS

Allow the player to gather resources from appropriate world objects: -
Collect fallen branches and usable wood - Gather stones and natural
materials - Search abandoned locations for components - Harvest crops -
Collect water from world sources - Salvage broken machinery through a
simple interaction system

Crafting stations: - Workbench - Workshop - Cooking station - Farming
station - Medical station - Water purification station - Electronics
station

Crafting requirements: - Recipes have clear resource costs. - Show
missing ingredients. - Show crafting time where relevant. - Support
recipe discovery. - Support upgrades to stations. - Queue multiple tasks
if the station supports it. - Never consume ingredients if crafting
fails. - Save crafting queues and results.

Keep all recipes fictional and game-focused. Do not provide real-world
weapon construction instructions. Combat equipment should use fictional,
abstract item designs and non-graphic effects.

------------------------------------------------------------------------

# 10. STARTER BASE, BASE BUILDING, AND SETTLEMENT CONSTRUCTION

## Mandatory starter base from the beginning of a new game

The player must receive a pre-built, enterable starter base during the opening chapter. Do not make the player build their first shelter from nothing, and do not leave the starting area as an empty field.

Starter base location and layout:
- Place it in a scenic but defensible forest-edge clearing near a small road, a water source, and resource-gathering areas.
- Include a modest main house with a working entrance, interior rooms, windows, lighting, and a save/rest point.
- Include a secure perimeter fence or wooden wall with a functional gate.
- Include a small watch platform or lookout tower.
- Include a storage area with a working inventory container.
- Include a basic crafting/workbench station.
- Include a small farm plot with plantable soil.
- Include a campfire or cooking point.
- Include a water collection point or water storage container.
- Include an outdoor work area and a clearly marked expansion zone.
- Add paths, crates, lanterns, a notice board, and seating without cluttering navigation.

Starter base gameplay:
- The player begins with ownership/access to this base after the introductory sequence.
- The player can enter and exit every advertised accessible building.
- The bed/rest point advances time and supports recovery.
- Storage transfers items correctly and persists after saving and loading.
- The workbench opens the crafting interface and supports implemented recipes.
- The farm plot supports the farming loop once that phase is implemented.
- The gate opens and closes and its collision matches its visible state.
- The perimeter and buildings can be repaired and upgraded.
- The player can place additional structures in the marked expansion area.
- Show a starter-base map marker and a short tutorial explaining its facilities.
- The base must persist in the same location and retain upgrades, stored items, and placed structures across reloads.
- Keep the starting base safe during the opening tutorial. Later threats may create settlement-defense gameplay, but do not unexpectedly destroy the player's starting home.

Allow the player to establish and expand a safe settlement beyond this starter base.

Buildable categories: - Foundations - Floors - Walls - Windows - Roofs -
Doors - Gates - Fences - Watch platforms - Storage - Lighting - Farms -
Water storage - Workshops - Kitchens - Medical rooms - Generators -
Community rooms - Defensive barriers - Decorative objects

Building tools: - Placement preview - Grid snapping toggle - Rotation -
Height adjustment where supported - Valid/invalid placement feedback -
Resource cost preview - Build, move, repair, upgrade, and remove modes -
Save and restore placed structures - Collision and navigation updates
after construction

Every structure should have: - Unique ID - Type - Position and
rotation - Durability - Upgrade level - Resource cost - Ownership or
settlement association

Settlement systems: - Population - Food and water supply - Shelter
capacity - Power - Morale - Safety - Storage - Work assignments -
Community upgrades - Repair needs - Visitor and recruitment events

NPC workers should have understandable schedules and task states. Do not
simulate every distant NPC at full detail.

------------------------------------------------------------------------

# 11. NPCS, DIALOGUE, COMPANIONS, AND COMMUNITY

Create survivors with individual profiles: - Name - Appearance preset -
Personality - Background - Skills - Occupation - Daily routine - Needs -
Current goal - Faction - Relationship with the player - Current location

NPC behaviors: - Work - Rest - Eat - Socialize - Travel between safe
locations - React to weather and world events - Seek shelter during
danger - Request assistance - Trade - Join or leave a settlement based
on game events

Dialogue: - Branching conversation choices - Dialogue history -
Quest-related dialogue - Reputation-aware dialogue - Companion banter -
Clear indication when a choice has a consequence

Companions: - Recruitable characters - Party management - Follow, wait,
and return commands - Companion roles and support skills - Trust and
friendship progression - Companion equipment as abstract game
inventory - Companion needs and morale - Safe return behavior if stuck -
Clear companion status UI

Keep character relationships age-appropriate and non-explicit. Focus on
friendship, trust, loyalty, teamwork, and community.

------------------------------------------------------------------------

# 12. QUESTS, STORY, AND WORLD CONSEQUENCES

Quest categories: - Main story - Side quests - Faction missions -
Settlement tasks - Companion quests - Exploration discoveries - Rescue
and escort missions - Resource recovery missions - Investigation
missions - Dynamic world-event quests

Quest structure: - Unique quest ID - Title and description -
Objectives - Optional objectives - Prerequisites - Relevant NPCs and
locations - Rewards - Failure conditions - Branching outcomes -
World-state changes

Main campaign: Create a multi-chapter story about rebuilding a network
of survivor communities and discovering the cause of the outbreak.
Include meaningful choices, mysteries, memorable characters, and
multiple possible outcomes.

Do not make every quest a combat mission. Include exploration, dialogue,
resource delivery, repair, investigation, navigation, rescue, and
settlement-support objectives.

Dynamic quest examples: - A radio distress signal is detected. - A
settlement needs supplies. - A trader is delayed. - A companion
discovers a hidden location. - A storm damages a route. - A community
requests help repairing infrastructure. - A faction offers a temporary
alliance. - A new safe route is discovered.

World events must be grounded in the actual world state. Do not generate
quests that refer to nonexistent NPCs, items, or locations.

------------------------------------------------------------------------

# 13. FACTIONS AND REPUTATION

Create several fictional factions with distinct goals, values, and
territories: - Sanctuary Network - Ironwood Settlers - Northern
Expedition - Research Collective - Free Traders - Independent Survivors

Faction systems: - Reputation score - Alliance and rivalry states -
Faction-specific quests - Trade access - Territory influence - NPC
reactions - Consequences for major choices - Faction notices and world
events

Avoid a simple good-versus-evil structure. Each faction should have
understandable motivations and trade-offs.

------------------------------------------------------------------------

# 14. ECONOMY AND TRADING

Include: - NPC vendors - Player trading - Settlement supply and demand -
Item values - Currency or barter - Merchant inventories - Limited
stock - Price changes based on scarcity - Trade reputation - Supply
routes

Prevent exploits such as selling the same item repeatedly without
removing it from inventory. Validate every transaction and update both
inventories atomically.

------------------------------------------------------------------------

# 15. ZOMBIE ECOSYSTEM AND NON-GRAPHIC ENCOUNTERS

Create fictional zombie archetypes with distinct gameplay behavior: -
Walker: slow and persistent - Runner: faster but less durable - Brute:
slow, high-pressure enemy - Armored: difficult to distract - Screamer:
attracts nearby threats - Stalker: uses cover and low visibility -
Climber: can reach certain elevated paths - Exploder: creates a
fictional area hazard - Boss: a rare, high-pressure encounter

AI requirements: - Vision and sound awareness - Search behavior - Patrol
routes - Investigation of disturbances - Group movement - Pathfinding
around obstacles - Navigation updates after building changes - Attack or
pressure on settlement barriers - Retreat or disengage conditions where
appropriate - Difficulty scaling by region and progression

Horde director: - Controls population and encounter intensity - Uses
distance and visibility budgets - Avoids spawning enemies directly in
view - Scales encounter size to device performance - Saves important
encounter state - Prevents endless unbounded enemy accumulation

Combat should be fictional, non-graphic, and readable. Use stylized
effects and clear hit feedback. Do not include gore or realistic
instructions for making, obtaining, or using real-world weapons. Use
abstract fictional equipment and defensive abilities.

------------------------------------------------------------------------

# 16. DAY/NIGHT, WEATHER, AND SEASONS

Time system: - Full day/night cycle - Adjustable time speed - Dawn,
daylight, sunset, and night lighting - NPC schedules respond to time -
World ambience changes by time - Night encounters may be more
challenging

Weather: - Clear - Cloudy - Rain - Heavy rain - Fog - Storm - Snow in
suitable regions - Wind

Seasonal changes: - Temperature variation - Vegetation variation -
Farming calendar - Weather patterns - Seasonal world events

Weather must affect visibility and ambience without making the game
unfair. Use quality settings to scale particle and lighting effects.

------------------------------------------------------------------------

# 17. VEHICLES AND TRAVERSAL

Include fictional, drivable transport where feasible: - Compact car -
Utility vehicle - Pickup - Van - Off-road vehicle - Boat

Vehicle features: - Enter and exit - Basic acceleration, braking,
steering, and reverse - Fuel as an abstract game resource - Durability -
Repair and maintenance - Storage capacity - Vehicle ownership - Parking
and retrieval - Camera modes - Collision handling - Vehicle save
persistence

Do not add vehicles as decorative objects only. If a vehicle is shown as
usable, its core driving and interaction loop must work.

Other traversal: - Walking - Sprinting - Crouching - Climbing designated
ladders - Jumping - Swimming where supported - Bridges, tunnels, and
discovered shortcuts

------------------------------------------------------------------------

# 18. FARMING, FOOD, AND DAILY LIFE

Farming: - Prepare plots - Plant seeds - Water crops - Growth stages -
Harvest - Seasonal suitability - Storage

Cooking: - Recipes - Ingredient requirements - Food quality - Meal buffs
as temporary game effects - Food spoilage as an optional difficulty
setting

Other activities: - Fishing mini-game - Photography and discovery
journal - Vehicle maintenance - Navigation challenges - Community
events - Trading - Resource delivery - Exploration challenges

These activities should provide meaningful progression and should not
all be mandatory.

------------------------------------------------------------------------

# 19. MAP, RADAR, JOURNAL, AND DISCOVERY

Map: - Explored and unexplored areas - Player marker - Settlement
markers - Quest markers - Discovered landmarks - Resource locations -
Fast-travel points only after discovery and unlock - Zoom and pan -
Region labels

Optional compact radar: - Nearby points of interest - Companion
direction - Quest direction - Important encounter warning - Configurable
visibility

Journal: - Main story - Side quests - Completed quests - Character
notes - Faction records - Discovered locations - Collectibles - Tutorial
reminders

Use icons and color-independent shapes so important information is
accessible to color-blind players.

------------------------------------------------------------------------

# 20. UI AND UX

Create a consistent, polished interface with a grounded survival-RPG
visual identity.

Required screens: - Main menu - Character creator - Difficulty
selection - Loading screen - In-game HUD - Pause menu - Inventory -
Equipment - Crafting - Building - Map - Journal - Quest tracker -
Character attributes - Skill trees - Dialogue - Companion management -
Settlement management - Faction reputation - Trading - Vehicle
dashboard - Settings - Save/load management

HUD: - Health and stamina - Hunger and thirst - Temperature or exposure
warning - Current objective - Interaction prompt - Time and weather -
Quick slots - Contextual notifications

UI rules: - All buttons must perform real actions. - No decorative
buttons pretending to work. - Every menu must have a reliable close/back
action. - Use consistent typography, spacing, and icon language. -
Provide keyboard and touch navigation. - Add clear empty states, loading
states, and error messages. - Include subtitles and text-size options. -
Support reduced motion and camera-shake toggles.

------------------------------------------------------------------------

# 21. AUDIO AND PRESENTATION

Audio layers: - Ambient environment - Wind and weather - Wildlife -
Settlement ambience - Footsteps - UI sounds - Vehicle audio -
Non-graphic encounter cues - Music for exploration, tension, and story
moments

Audio requirements: - Volume sliders for master, music, ambience, and
effects - Mute option - Avoid sudden excessive volume - Respect browser
autoplay restrictions - Load audio assets lazily

Visual presentation: - Realistic lighting where supported - Atmospheric
fog - Shadows with quality settings - PBR-style materials where assets
permit - Natural terrain and vegetation - Interior lighting - Day/night
lighting transitions - Weather effects - Cinematic camera only for
short, skippable sequences

Do not use expensive effects by default on low-end mobile devices.

------------------------------------------------------------------------

# 22. SAVE, LOAD, AND PERSISTENT WORLD

Implement a robust save system using IndexedDB.

Save: - World seed and generation version - Player position and state -
Character progression - Inventory and equipment - Placed structures -
Settlement state - Important NPC states - Companion state - Quest
progress and choices - Faction reputation - Discovered map data -
Vehicle state - World time and weather state - Important world events -
Settings

Save requirements: - Autosave at safe intervals - Manual save - Multiple
save slots - Save timestamp and playtime - Save version - Validation
before loading - Recovery from corrupted save data where possible - Do
not overwrite a valid save until a new save is confirmed - Show a clear
save/load error if an operation fails

The world should preserve important player-made changes. Do not
regenerate the entire world differently every time a save is loaded.

------------------------------------------------------------------------

# 23. PERFORMANCE AND ACCESSIBILITY

Performance targets: - Aim for smooth play on typical modern desktop
hardware. - Provide scalable quality settings for mobile and lower-end
devices. - Use chunk streaming, LOD, instancing, culling, and object
pooling. - Limit active AI simulation by distance and relevance. - Use
simplified simulation for distant settlements and NPCs. - Avoid memory
leaks and unbounded arrays. - Dispose of Three.js geometries, materials,
textures, and render targets when no longer needed. - Monitor frame time
and expose a performance/debug overlay in development mode.

Graphics presets: - Low - Medium - High - Ultra

Accessibility: - Remappable controls - Adjustable sensitivity - Subtitle
controls - Text-size options - Color-blind-friendly markers - Reduced
camera shake - Reduced motion - Toggle/hold options where appropriate -
Difficulty customization - Tutorial replay

------------------------------------------------------------------------

# 24. DEVELOPMENT PHASES --- BUILD IN THIS ORDER

Do not attempt to implement every system simultaneously. Build a
playable vertical slice, verify it, and then extend the game without
breaking previous work.

## Phase 1 --- Playable foundation

-   Main menu
-   Character placeholder/customization
-   3D terrain test region
-   Player movement
-   First-person and third-person camera
-   Basic interaction
-   Day/night cycle
-   Basic HUD
-   Pause menu
-   One reliable save slot

**Acceptance test:** The player can start a new game, move around,
switch cameras, interact with an object, pause, save, reload, and
continue from the saved location.

## Phase 2 --- Exploration and survival

-   World chunks
-   Biomes and points of interest
-   Inventory
-   Gathering
-   Hunger, thirst, stamina, and health
-   Basic crafting
-   Map and discovery journal

**Acceptance test:** The player can explore multiple areas, collect
resources, use inventory, craft a basic item, and retain progress after
reload.

## Phase 3 --- Building and settlement

-   Placement system
-   Structural persistence
-   Storage
-   Farming
-   Settlement resources
-   NPC work assignments

**Acceptance test:** The player can build, save, reload, and see
structures in the same positions with their correct state.

## Phase 4 --- NPCs and RPG systems

-   NPC profiles and schedules
-   Dialogue
-   Companions
-   Character attributes and skills
-   Quests
-   Factions and reputation

**Acceptance test:** A quest can be accepted, progressed, completed, and
its consequences persist after reload.

## Phase 5 --- Zombie simulation and world events

-   Zombie archetypes
-   Awareness and navigation
-   Encounter director
-   Settlement pressure
-   Dynamic events
-   Non-graphic combat feedback

**Acceptance test:** Encounters spawn fairly, enemies navigate
obstacles, and the game remains stable during a moderate encounter.

## Phase 6 --- Vehicles and expanded world

-   Vehicle driving
-   More regions
-   Interior locations
-   Weather
-   Seasonal systems
-   Economy and trading
-   More activities

**Acceptance test:** Vehicles can be entered, driven, exited, stored,
and restored after reload.

## Phase 7 --- Story, polish, and optimization

-   Main campaign
-   Branching story
-   Companion quests
-   Cinematics
-   Audio
-   Performance profiles
-   Accessibility
-   Full regression testing

**Acceptance test:** The game can be played from a new save through the
opening story arc without blocking bugs or data loss.

------------------------------------------------------------------------

# 25. REQUIRED TESTING CHECKLIST

Before declaring a phase complete, test:

-   [ ] Project starts without compile errors.
-   [ ] No missing imports or unresolved modules.
-   [ ] Main menu buttons work.
-   [ ] New Game and Continue work.
-   [ ] Player movement and collision work.
-   [ ] First-person and third-person cameras work.
-   [ ] Camera does not clip through nearby geometry.
-   [ ] Desktop controls work.
-   [ ] Mobile controls work at supported screen sizes.
-   [ ] UI remains usable after resizing.
-   [ ] Inventory updates correctly.
-   [ ] Items are not duplicated or lost during transfers.
-   [ ] Crafting checks and consumes ingredients correctly.
-   [ ] Building placement validates collisions and saves correctly.
-   [ ] NPCs do not remain permanently stuck.
-   [ ] Quest objectives update from actual game events.
-   [ ] Zombie AI does not spawn directly in the player's view.
-   [ ] Distant simulation is performance-limited.
-   [ ] Save and load preserve important world state.
-   [ ] Failed saves show an error and do not silently erase valid data.
-   [ ] No major console errors during the tested gameplay loop.

------------------------------------------------------------------------

# 26. STRICT IMPLEMENTATION RULES FOR GOOGLE AI STUDIO

1.  First inspect the existing project files and identify the current
    framework, entry points, and existing systems.
2.  Report the existing architecture briefly before making changes.
3.  Preserve working code and existing features.
4.  Do not delete pages, components, assets, or systems unless
    explicitly required.
5.  Do not create a separate demo when the task is to implement the
    actual game.
6.  Do not replace real functionality with fake buttons, static cards,
    or placeholder descriptions.
7.  If an asset is unavailable, create a clearly identified procedural
    or primitive fallback and keep the asset interface replaceable.
8.  If a feature is too large for one pass, implement its core loop and
    mark the remaining work honestly.
9.  After each phase, run the available build/type checks and fix errors
    before moving on.
10. Keep code modular and readable.
11. Do not hardcode secrets or private credentials.
12. Do not claim multiplayer, advanced AI, or persistence works unless
    it has actually been implemented and tested.
13. Keep the game playable after every phase.
14. Provide a concise implementation report listing files changed,
    features completed, known limitations, and tests run.
15. Never remove a working feature to make room for a new one without
    explaining the conflict and receiving approval.

------------------------------------------------------------------------

# 27. FINAL DELIVERY REQUIREMENT

The final result must be a playable, expandable open-world RPG---not
only a visual mock-up.

Start by inspecting the current project. Then implement **Phase 1**
completely and test it. Continue to the next phases in order, preserving
all working features.

At the end of each phase, report: - What was implemented - Which files
were created or changed - Which tests were run - What passed - What
remains incomplete - Any known performance or compatibility limitations

**Priority order:** stability → playable core loop → persistence → world
systems → RPG depth → visual polish → advanced content.

Build **LAST SANCTUARY: REBIRTH** as a cohesive, immersive open-world
RPG with meaningful exploration, survival, community, progression, and a
world that remembers the player's choices.


---

# 28. NEW-GAME OPENING REQUIREMENT — STARTER BASE

The opening gameplay sequence must guide the player to the starter base and introduce it as the player's first home. The base is not merely a background image or menu illustration: it must exist as real 3D world geometry with collision, enterable spaces, functional interactions, and persistent state.

At minimum, Phase 1 must include the starter house shell, accessible entrance, simple interior, rest point, storage interaction, perimeter gate, and base marker. Later phases must activate crafting, farming, repairs, upgrades, settlement jobs, and expanded construction.

Do not show a feature as interactive until its core interaction is implemented. Where a later-phase feature is visible but not yet active, label it as unavailable or locked rather than presenting a fake interaction.
