LAST SANCTUARY — THE LAST LINE

This update combines the apartment/compound direction with the railway-led survival story.

Key additions in this archive:
- src/data/lastLineCampaign.ts: structured 40-mission campaign catalogue (Days 1–4)
- LAST_SANCTUARY_THE_LAST_LINE_FINAL_STORY_AND_RAILWAY_CAMPAIGN.md: full story, mission flow, gameplay rules, compatibility requirements and QA checklist
- Existing apartment, railway, train, survival and story project files are retained.

IMPORTANT IMPLEMENTATION STATUS
The campaign catalogue and design specification are included. The 40 new missions are not yet wired into the live mission dispatcher, quest journal, save migration or playable triggers. Existing prologue and train systems are preserved; run a build and in-game regression test before deployment.

Suggested validation:
1. npm install
2. npm run lint
3. npm run build
4. Test old saves, apartment/compound boundaries, garage/car, staircase, rooftop, all six AI train services, seven-car boarding and mission progression.
