# LAST SANCTUARY: REBIRTH — Absolute Realism Mode

## Implemented

Added a fifth graphics preset, **Absolute Realism**, to the existing graphics/settings flows:
- Pause-menu picture quality selector.
- Graphics & Stability Manager preset cards.
- Performance diagnostic quick selector.
- HUD/mobile quality indicator.
- Persisted graphics preset parsing and storage.

## Rendering behavior

On desktop-class hardware, the mode requests the highest settings currently exposed by this renderer:
- Up to 2.0x render scale, still clamped by the renderer's hardware and pixel-budget limits.
- 3072px real-time shadow map.
- Post-processing and bloom.
- Up to 16x anisotropic texture filtering.
- Up to 5 terrain streaming chunks.
- Maximum configured local-light and particle budgets.
- Stronger existing environment/sunlight and sun-shaft settings.
- Existing automatic performance governor remains enabled.

On mobile and devices reporting 4 GB or less memory, the mode is adaptive rather than forcing desktop settings: shadows and post-processing are disabled, anisotropy is capped at 4x, view distance at 2 chunks, particles at 75%, and local lights at 3. Render scale remains hardware/pixel-budget clamped. Software-rendered devices cannot select this experimental preset.

## Important limitation

This mode maximizes the visual features already implemented in the current source. It does not magically create new photorealistic meshes, higher-resolution source textures, physically based material maps, or ray tracing where the game does not already contain/support them. Achieving those would require separate world-asset and renderer development.

## Files changed

- `src/types/game.ts`
- `src/engine/graphics/GraphicsManager.ts`
- `src/engine/GameEngine.ts`
- `src/components/GraphicsManagerModal.tsx`
- `src/components/PauseMenu.tsx`
- `src/components/PerformanceDiagnostic.tsx`
- `src/components/HUD.tsx`
- `src/components/MobileControls.tsx`
- `src/App.tsx`

## Verification

- TypeScript/TSX syntax transpilation passed for all 9 changed source files.
- Full dependency-backed typecheck and production build were not run because project dependencies are not installed in this environment.
- No runtime GPU/FPS testing was possible here. The Android-safe profile is designed to avoid forcing expensive settings, but must still be tested on the actual vivo Y-series device.
