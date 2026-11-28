# Last Sanctuary — Performance & Visual Upgrade Report

## Applied in this pass

- Reduced the renderer's startup shadow-map allocation to **512×512 on mobile/touch** and **1024×1024 on desktop**, matching the runtime graphics-manager ceiling and avoiding an oversized first shadow allocation.
- Limited the mobile portrait hotbar to **five visible slots** while preserving all eight quick slots on desktop and landscape layouts.
- Changed Aurelian floor-light synchronization to write `visible` and `intensity` only when their values actually change, avoiding redundant per-frame updates across culled floors.

## Existing project systems inspected and retained

The uploaded source already contains substantial implementations for the requested behavior. These were retained rather than duplicated or rewritten:

- **Dynamic resolution / Low Heat:** device-pixel-ratio ceilings of 1.25 for mobile/touch and 2.0 for desktop; Low Heat / Mobile Saver UI; 30/45 FPS caps; 0.75× downscale trigger above 22 ms; frame governor and recovery logic.
- **Pause / visibility:** the main render loop cancels scheduled frames while paused or when `document.hidden`, and resumes with a reset clock.
- **Aurelian floor culling:** B2, B1 and F1–F7 roots are individually toggled; only the current floor and active elevator shaft are shown, with destination-floor pre-enable during elevator arrival. Per-floor visual animation updates are already gated by visibility.
- **Background simulation:** Aurelian power, water pressure, purification and crop growth use a 200 ms accumulator; sentry turret target acquisition uses a 200 ms scan interval; HUD callbacks are synchronized at 100 ms; security-screen telemetry is throttled at 200 ms.
- **Shadows / local lighting:** shadow maps are on-demand (`autoUpdate = false`); runtime shadow resolution is capped by device class; Aurelian interior point lights are non-shadow-casting; B2 and F1 have hemisphere bounce fill.
- **Camera / elevator:** third-person camera collision sampling, tight-room distance pull-in, elevator shaft bounds and tighter elevator camera damping already exist in `PlayerController`; the Aurelian coordinator pre-enables the destination floor before doors open.
- **Blood Moon:** the sky shader already provides multi-stop crimson horizon scattering and the scene uses `THREE.FogExp2`; the fog color is matched to the atmospheric horizon.
- **Sentry lasers:** the turret renderer already uses additive inner-core and translucent outer-glow layers with a distance-faded texture.

## Validation status

- Source-level inspection completed.
- A full TypeScript/Vite build could not be run in this environment because dependencies were not present and `npm install` timed out.
- Device-level thermal, camera, Blood Moon and touch-HUD gameplay validation still needs to be performed on target Android/iOS hardware.

## Files changed in this pass

- `src/engine/GameEngine.ts`
- `src/components/HUD.tsx`
- `src/index.css`
- `src/engine/aurelion/AurelionCoordinator.ts`
