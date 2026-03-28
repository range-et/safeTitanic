# Safe Titanic

An interactive 3D underwater experience that lets you explore the Titanic wreck from the safety of your browser. Built with Three.js.

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
