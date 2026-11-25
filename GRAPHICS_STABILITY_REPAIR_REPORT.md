# LAST SANCTUARY: REBIRTH — Graphics Stability Repair

## Scope

Changes were applied to the active root application in the uploaded `last-sanctuary-—-ultimate-survival-world (13).zip`. Historical snapshots under `latest_working_source/` and `ls_dev/` were not substituted for the active root app.

## Source changes

### `src/engine/graphics/GraphicsManager.ts`
- Treat unavailable browser device-memory information conservatively instead of assuming an 8 GB device.
- Apply constrained-device caps to stored graphics preferences so a previously selected Ultra preset cannot silently restore high-cost settings on mobile/low-memory/software renderers.
- Disable shadows and post-processing on constrained devices; limit anisotropy, view distance, particles, local lights and custom render scale.
- Add a total render-pixel budget to the safe DPR calculation in addition to the WebGL renderbuffer/texture dimension limits.
- Force software renderers to the lowest view-distance/light/particle budget.

### `src/engine/GameEngine.ts`
- Disable MSAA on mobile and lower-memory devices and use a conservative power preference on mobile.
- Compute initial pixel ratio through the hardware-safe pixel budget.
- Avoid building the post-processing composer on mobile, software GL and devices reporting 4 GB or less memory.
- Replace half-float post-processing targets with unsigned-byte targets and retain safe sample limits.
- Stop the active render loop when the WebGL context is lost; use a generation token to prevent stale/duplicate loop callbacks after recovery.
- On context restoration, reassert output colour space/tone mapping, mark scene materials and textures for re-upload, rebuild the PMREM environment and restart only the previously active loop.
- Fall back from a failed optional post-processing render to direct scene rendering.

## Verification

| Check | Result |
|---|---|
| Original ZIP integrity (`testzip`) | PASS |
| Modified TypeScript syntax transpilation | PASS — both changed `.ts` files |
| `git diff --check` | Not available — archive is not a Git checkout |
| TypeScript project check (`tsc --noEmit`) | BLOCKED — dependencies/type packages are not installed (`vite/client`, `vite-plugin-pwa/client` missing) |
| Dependency installation | BLOCKED — `npm install --no-audit --no-fund` timed out |
| Production build | NOT RUN — dependency installation unavailable |
| Device FPS / thermal testing | NOT RUN |
| Actual WebGL context-loss/recovery test | NOT RUN |
| Android and desktop gameplay QA | NOT RUN |

## Important limitations

These are source-level stability improvements, not proof that every crash is fixed. Runtime testing on the affected device is still required. No target FPS is guaranteed without the device model, browser/WebView, GPU and runtime profiling. No above-ground world content or gameplay systems were intentionally edited.
