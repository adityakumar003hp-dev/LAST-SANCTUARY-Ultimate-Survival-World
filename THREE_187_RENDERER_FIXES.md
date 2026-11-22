# Three.js r187 renderer and timing fixes

This update addresses the warnings and shader failure reported by the game runtime.

## Changes

- Replaced `THREE.Clock` with `THREE.Timer` in `src/engine/GameEngine.ts`.
- Updated the animation loop to call `Timer.update()` with the animation-frame timestamp and then read `getDelta()`.
- Replaced `Timer.start()/stop()` usage with `Timer.reset()` at pause and tab-visibility boundaries, preventing paused/background time from being added to the next simulation step.
- Removed `PCFSoftShadowMap`, which is no longer supported by the installed Three.js r187 version. All quality presets now use the supported `PCFShadowMap` mode; shadow resolution and enable/disable settings still vary by preset.
- Added a bounded local-light budget. The renderer now enables only the nearest 3 point/spot lights on mobile/software rendering and 4 on desktop. Distant decorative point/spot lights remain part of the world but are temporarily hidden from the renderer, reducing the number of uniforms injected into `MeshStandardMaterial` shaders.
- Added `activeLocalLights` to renderer diagnostics.

## Important verification note

The source archive was updated in place. Dependency installation timed out in this environment, so a full TypeScript check, Vite production build, and in-game WebGL verification could not be completed here. Please run `npm install` (or `bun install`), then `npm run lint` and `npm run build` in the project environment. Confirm the shader error is gone on the target device; GPU limits vary by device and browser.
