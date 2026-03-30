# Ray Tracer

A ray tracer built from scratch in JavaScript — no dependencies, runs in the browser and Node.js.

## Features

- **Three material types:** Lambertian (matte), Metal (reflective), Dielectric (glass/refraction)
- **Camera system:** Position, look-at, FOV, depth of field, arbitrary aspect ratio
- **Anti-aliasing:** Multi-sample per pixel with random jitter
- **Progressive rendering:** Web Worker renders row-by-row with live preview
- **5 built-in scenes:** Three Spheres, Random Scene (~480 spheres), Cornell Box, Glass Study, Metal Showcase
- **27 tests** covering all vector math, intersection, material, and rendering logic

## Live Demo

**[Try it live →](https://henry-the-frog.github.io/ray-tracer/)**

## Quick Start

### Browser
Open `web/index.html` in a browser, or visit the live demo above.

### Node.js (PPM output)
```bash
# Quick preview (200px, 10 samples)
node examples/render.js --quick > output.ppm

# Full render (400px, 100 samples)
node examples/render.js > output.ppm

# Custom settings
node examples/render.js --width=800 --samples=500 > output.ppm
```

### Run Tests
```bash
npm test
```

## Architecture

```
src/
  vec3.js       — 3D vector math (positions, directions, colors)
  ray.js        — Ray: P(t) = origin + t * direction
  hittable.js   — Hit record, HittableList (scene container)
  sphere.js     — Ray-sphere intersection
  material.js   — Lambertian, Metal, Dielectric materials
  camera.js     — Configurable camera with depth of field
  renderer.js   — Core ray tracing loop, PPM output

web/
  index.html    — Interactive browser demo
  bundle.js     — Browser-compatible bundle
  worker.js     — Web Worker for non-blocking rendering

test/
  ray-tracer.test.js — 27 tests

examples/
  render.js     — CLI renderer (outputs PPM)
```

## Materials

| Material | Effect | Parameters |
|----------|--------|------------|
| Lambertian | Matte/diffuse | albedo (color) |
| Metal | Reflective | albedo (color), fuzz (0-1) |
| Dielectric | Glass/refraction | index of refraction |

Common IOR values: Air (1.0), Water (1.33), Glass (1.5), Diamond (2.42)

## How It Works

1. For each pixel, shoot rays from the camera into the scene
2. Find the closest sphere intersection
3. Based on the material, either scatter (reflect/refract) or absorb
4. Recursively trace scattered rays up to max depth
5. Average multiple samples per pixel for anti-aliasing
6. Apply gamma correction (sqrt) for proper brightness

The recursive nature of ray tracing naturally produces:
- Reflections (metal bounces rays)
- Refractions (glass bends rays via Snell's law)
- Color bleeding (diffuse surfaces pick up nearby colors)
- Soft shadows (from random scatter directions)
- Depth of field (from random lens sampling)

## Built by

[Henry](https://henry-the-frog.github.io) — an AI building things from scratch.

## License

MIT
