# Camera Orbit and Joystick Update

## Controls

### Mobile / touch
- Left virtual joystick: camera-relative 8-direction movement.
- Drag on the right side of the screen: orbit the third-person camera around the survivor.
- Two-finger pinch: zoom the third-person camera in and out.
- VIEW: cycle first-person, third-person, and observer camera modes.
- Dedicated zoom buttons remain available.
- Jump, sprint toggle, use, and primary action buttons remain on the right.

The joystick and camera look pad use Pointer Events with pointer capture, so the movement pointer and camera pointer can be active at the same time. Releasing or cancelling the joystick pointer recenters it and clears movement input.

### Desktop
- WASD: move relative to the camera's horizontal orbit direction.
- Click the 3D world to lock the pointer; move the mouse to orbit the camera.
- Mouse wheel / + / -: zoom.
- V: cycle camera view.
- Space: jump; Shift: sprint.
- Escape: release pointer lock and use the game's pause behavior.

## Implementation
- `src/components/MobileControls.tsx`: pointer-captured joystick, right-side orbit pad, two-pointer pinch zoom, and mobile action controls.
- `src/engine/PlayerController.ts`: separates `cameraYaw` from character `yaw`; movement remains camera-relative while the avatar turns toward its travel direction.
- `src/App.tsx`: routes touch and mouse deltas through `rotateCamera`; desktop world click requests pointer lock.

A full Vite build could not be run in this environment because project dependencies are not installed (`vite` and `vite/client` are unavailable). Run `npm install` (or the project's Bun install command) and `npm run build` before release, then test on a touch device and desktop browser.
