# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Safe Titanic is an interactive 3D web experience that lets users explore the Titanic wreck underwater using a virtual submarine. Built with Three.js and vanilla JavaScript — no framework, no TypeScript.

## Commands

- **Dev server:** `npm run watch` (runs Vite)
- **Production build:** `npm run build` (runs Parcel, outputs to `dist/`)
- No test suite or linter is configured.

## Architecture

The entire app lives in two files:

- **`index.html`** — Single-page shell with inline CSS, overlay UI (instructions modal, about modal), navbar with controls legend, and the `<canvas id="drawing">` element. Styles use `clamp()` for responsive sizing.
- **`index.js`** — All 3D logic in one module. Sets up Three.js scene, camera, controls, lighting, model loading, post-processing pipeline, and the animation loop.

### Rendering Pipeline (index.js)

The `EffectComposer` chains passes in this order:
1. `RenderPass` — base scene render
2. `RenderPixelatedPass` — pixel art effect (resolution=2)
3. Custom AO `ShaderPass` — screen-space ambient occlusion via luminance comparison (inline GLSL)
4. `UnrealBloomPass` — glow effect
5. `GlitchPass` — periodic glitch distortion
6. `OutputPass` — Reinhard tone mapping

### Key Mechanics

- **Submarine control:** Hold Space to enable movement (sets `manuverable=true`). WASD moves, mouse looks. A lightbar indicator turns aquamarine when controls are active, red when locked.
- **Movement constraint:** Controls only enable when `distToShip <= 25000000` (squared distance) and `camera.position.y > 1`.
- **Spotlight follows gaze:** A SpotLight attached to the camera targets the nearest raycasted intersection point, simulating a submarine headlight.
- **Audio:** Howler.js plays looping underwater ambience on init.

### ThreeAddons/

Vendored Three.js addon modules (not installed via npm). These are local copies of standard three/examples/jsm modules. When upgrading Three.js, these may need manual updates to match the new version.

### Assets

- `Titanic_Ship.glb`, `Titanic_ground.glb` — 3D models loaded via GLTFLoader
- `underwater-ambience-6201.mp3` — background audio
- `Titanic.blend` / `.blend1` — Blender source files for the models
- The ocean floor texture is loaded from an external Wikipedia URL, not from local assets
