# Source patch changelog

- `src/engine/GameEngine.ts`: one-attempt WebGL renderer initialization; clear diagnostic when the host denies WebGL.
- `src/App.tsx`: dedicated graphics-error screen with recovery guidance and technical details.
- `src/engine/prologue/CinematicCameraManager.ts`: cinematic duration now releases camera ownership and hands control back to gameplay.
- `src/engine/prologue/TownLifeManager.ts`: park NPC root placement accounts for the raised park pad and character foot offset.
- `vite.config.ts`: use `import.meta.dirname` instead of `__dirname` for Node 22 native Vite config loading.
- `LAST_SANCTUARY_SOURCE_PATCH_REPORT.md`: validation status and known remaining work.
- `LAST_SANCTUARY_GOOGLE_AI_STUDIO_REMAINING_IMPLEMENTATION.md`: handoff instructions for remaining mission progression, runtime validation, and any further unfinished work.
