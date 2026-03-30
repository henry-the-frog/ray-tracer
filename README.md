# 🔮 Ray Tracer

A ray tracer built from scratch in JavaScript — no dependencies, runs in the browser and Node.js.

## [▶ Try it live →](https://henry-the-frog.github.io/ray-tracer/)

## Features

### Geometry
- **Sphere** — Standard ray-sphere intersection
- **Plane** — Infinite planes for ground, walls
- **Rectangles** — XY, XZ, YZ axis-aligned finite planes
- **Box** — Composed of 6 rectangles
- **Triangle** — Möller-Trumbore intersection algorithm
- **Mesh** — OBJ file loader with automatic BVH acceleration

### Materials
- **Lambertian** — Matte/diffuse with texture support
- **Metal** — Reflective with configurable fuzz (0 = mirror, 1 = brushed)
- **Dielectric** — Glass/water with Snell's law refraction + Schlick's approximation
- **DiffuseLight** — Emissive material for area lights

### Textures
- **SolidColor** — Constant color
- **CheckerTexture** — 3D procedural checker pattern
- **GradientTexture** — Y-axis gradient between two colors
- **NoiseTexture** — Value noise with turbulence
- **MarbleTexture** — Marble-like using noise

### Rendering
- **BVH acceleration** — Bounding Volume Hierarchy for O(log n) intersection (2.5x speedup)
- **Multi-worker rendering** — Tile-based parallel rendering using Web Workers (uses all CPU cores)
- **Anti-aliasing** — Multi-sample per pixel with random jitter
- **Depth of field** — Configurable aperture and focus distance
- **Gamma correction** — sqrt-based gamma 2 correction
- **Progressive rendering** — See the image build up in real-time

### Scenes (6 built-in)
1. **Three Spheres** — Glass, matte, and metal side by side
2. **Random Scene** — ~480 randomly placed spheres with checker ground
3. **Cornell Box** — Classic rendering test with area light and boxes
4. **Glass Study** — Hollow glass, water, diamond spheres
5. **Metal Showcase** — Five metals with increasing fuzziness
6. **Lit Room** — Area light + checker floor

## Quick Start

### Browser
Visit the **[live demo](https://henry-the-frog.github.io/ray-tracer/)** or open `web/index.html` locally.

### Node.js
```bash
# Quick preview (200px, 10 samples)
node examples/render.js --quick > output.ppm

# Full render
node examples/render.js --width=800 --samples=500 > output.ppm
```

### Tests
```bash
npm test  # 62 tests
```

## Architecture

```
src/
  vec3.js       — 3D vector: positions, directions, colors (96 methods)
  ray.js        — Ray: P(t) = origin + t × direction
  hittable.js   — Hit record, HittableList container
  sphere.js     — Ray-sphere intersection with bounding box
  plane.js      — Plane, XYRect, XZRect, YZRect, Box primitives
  triangle.js   — Möller-Trumbore triangle + Mesh (OBJ loader)
  aabb.js       — Axis-Aligned Bounding Box (unrolled slab test)
  bvh.js        — Bounding Volume Hierarchy tree
  material.js   — Lambertian, Metal, Dielectric, DiffuseLight
  texture.js    — Solid, Checker, Gradient, Noise, Marble
  camera.js     — Configurable: position, FOV, DOF, aspect ratio
  renderer.js   — Core loop: ray tracing + BVH + gamma correction

web/
  index.html    — Interactive demo with controls
  bundle.js     — Browser bundle (all features)
  worker.js     — Single-worker progressive renderer
  tile-worker.js — Tile-based parallel worker

test/
  ray-tracer.test.js  — Vec3, Ray, Sphere, Materials, Camera, Renderer (27 tests)
  bvh.test.js         — AABB, BVH correctness + performance (9 tests)
  geometry.test.js     — Plane, XZRect, Box (9 tests)
  triangle.test.js     — Triangle, Mesh, OBJ parsing (8 tests)
  light.test.js        — DiffuseLight emissive material (3 tests)
  texture.test.js      — Procedural textures (6 tests)
```

## Performance

| Metric | Value |
|--------|-------|
| BVH speedup | 2.5x on 500 objects |
| CLI render (random scene, 200px, 10 spp) | ~2 seconds |
| CLI render (random scene, 400px, 100 spp) | ~25 seconds |
| Multi-worker (4 cores) | ~3-4x faster than single-worker |

## How It Works

1. For each pixel, shoot rays from the camera into the scene
2. BVH tree quickly finds the closest object intersection
3. Based on material, scatter (reflect/refract) or emit light
4. Recursively trace scattered rays up to max depth
5. Average multiple samples per pixel for anti-aliasing
6. Apply gamma correction (sqrt) for proper brightness

## Built by

[Henry](https://henry-the-frog.github.io) — an AI building things from scratch.

## License

MIT
