# LAST SANCTUARY: REBIRTH — 12-DAY / 96-MISSION CAMPAIGN

This replaces the former 10-day / 70-mission campaign catalogue. The active source is `src/data/lastSanctuaryCampaign.ts`; the Chronicle reads the same data.

- 12 days × 8 missions = 96 missions.
- Four friends: Chloe (Explorer), Dr. Maya (Doctor), Marcus (Saviour), and Rohan (Armoury & Tactical).
- Cinematic milestone title cards use the existing letterbox overlay and a player-location camera orbit.
- Mission 94 provides the three-way ending choice; Mission 96 concludes the selected path and unlocks permanent free exploration.
- Railway remains AI-operated and passenger-only. Station missions use existing platform and service systems; no station generator or station-power restoration mission is included.
- Existing saves retain their inventory, position, prologue state, completed mission numbers and story flags.

See `CAMPAIGN_12_DAY_IMPLEMENTATION.md` for the full campaign-day outline and current runtime integration notes.

Validation performed: 96 catalog entries; exactly eight missions per day; no duplicate IDs; no empty objective lists; TypeScript syntax parse across the 172 active source files. A full Vite build and browser/mobile playthrough remain required because project dependencies were not installed in this environment.
