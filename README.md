---
tags: [project, safe-titanic, readme, threejs, webgl, surface, communications]
status: shipped
domain: communications
repo: https://github.com/range-et/safeTitanic
---

# Safe Titanic

An interactive 3D underwater experience that lets you explore the Titanic wreck from the safety of your browser. Built with Three.js.

> **Why it exists.** The 2023 Titan submersible implosion was the prompt — *why is the substitute experience not already free*? Safe Titanic is one answer: a public artifact that says "you don't need to risk your life for this." It belongs in the *Communications & Surfaces* cluster alongside [[../portfolio/README|portfolio]] and [[../shenanigans/README|shenanigans]] — the work expressing itself in public — and is paired with a writeup on the [shenanigans blog](https://www.shenanigans.blog/shenan/?shenan=safetitanic). Same WebGL stance as [[../PGL/README|PGL]] but for narrative scenes rather than abstract graphs.

**[Explore the Titanic](https://range-et.github.io/safeTitanic/)**

## About

In 2023, the Titan submersible implosion raised questions about extreme tourism and why people risk their lives for experiences that could be had more safely. Safe Titanic offers that experience — piloting a virtual submarine through the wreck site — for free and without danger.

Read the full story: [Safe Titanic on Shenanigans Blog](https://www.shenanigans.blog/shenan/?shenan=safetitanic)

## Controls

| Key | Action |
|-----|--------|
| **Hold Space** | Enable submarine controls |
| **W / A / S / D** | Move forward / left / backward / right |
| **Mouse** | Look around |
| **F11** | Fullscreen |

The lightbar indicator turns aquamarine when controls are active and red when locked.

## Features

- First-person submarine navigation with spotlight tracking
- Post-processing pipeline: pixelation, ambient occlusion, bloom, glitch effects
- Frustum-culled instanced anemones and biofouling across the ship hull
- Floating underwater particle system
- Underwater ambience audio
- Deployed automatically via GitHub Pages

## Development

```bash
# Install dependencies
npm install

# Start dev server
npm run watch

# Production build
npm run build

# Run visual smoke tests (requires Playwright)
npx playwright install chromium
npm test
```

## Tech

- [Three.js](https://threejs.org/) (v0.154) — 3D rendering
- [Howler.js](https://howlerjs.com/) — Audio
- [Vite](https://vitejs.dev/) — Build tooling
- [Playwright](https://playwright.dev/) — Visual testing

## Author

[Indrajeet Haldar](https://www.indrajeethaldar.com/)

## License

MIT

---

*Related: [shenanigans](../shenanigans/README.md) (the writeup blog post lives here) · [portfolio](../portfolio/README.md) (sibling surface) · [PGL](../PGL/README.md) (WebGL cousin) · [Threads/Visualization at scale](../../Threads/Visualization%20at%20scale.md) · [MOC](../../MOC.md)*
