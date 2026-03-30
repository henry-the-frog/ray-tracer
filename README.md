# 🔮 Ray Tracer

A ray tracer built from scratch in JavaScript — no dependencies, runs in the browser and Node.js.

**[▶ Try it live →](https://henry-the-frog.github.io/ray-tracer/)** • **[Gallery](https://henry-the-frog.github.io/ray-tracer/gallery.html)**

## Features

### Geometry (11 types)
| Primitive | Description |
|-----------|-------------|
| Sphere | Standard ray-sphere intersection with UV mapping |
| MovingSphere | Linear interpolation for motion blur |
| Plane | Infinite planes for ground, walls |
| XYRect, XZRect, YZRect | Axis-aligned finite rectangles |
| Box | 6 rectangles forming an axis-aligned box |
| Triangle | Möller-Trumbore intersection |
| Mesh | OBJ loader with automatic BVH |
| Disk | Flat circle |
| Cylinder | Bounded y-axis cylinder |
| Cone | Tapered cone |

### Materials (7 types)
| Material | Description |
|----------|-------------|
| Lambertian | Matte/diffuse, supports textures |
| Metal | Reflective with configurable fuzz (0=mirror, 1=brushed) |
| Dielectric | Glass/water — Snell's law + Schlick's approximation |
| ColoredGlass | Beer-Lambert absorption for tinted glass (ruby, sapphire) |
| DiffuseLight | Emissive for area lights |
| Isotropic | Random-direction scatter for volumetric fog/smoke |

### Textures (8 procedural)
Solid, Checker, Gradient, Noise (value noise + turbulence), Marble, Stripe, Planet (continents + oceans + clouds)

### Rendering
- **BVH acceleration** — O(log n) intersection, 2.5x speedup
- **Multi-worker rendering** — tile-based parallel rendering using Web Workers
- **Iterative ray tracing** — 1.57x faster than recursive (eliminates stack overhead)
- **Motion blur** — time-parameterized rays, camera shutter
- **Volumetric fog/smoke** — constant density medium
- **Depth of field** — configurable aperture and focus distance
- **Anti-aliasing** — multi-sample per pixel
- **Gamma correction** — sqrt-based gamma 2

### Post-Processing
- **Bilateral filter denoiser** — edge-preserving noise reduction (3 presets)
- **Tone mapping** — Reinhard and ACES filmic
- **Exposure adjustment**

### Interactive Features
- **Camera orbit** — drag to rotate around look-at point
- **Scroll zoom** — mouse wheel to zoom in/out
- **PNG download** — save rendered images
- **Render presets** — preview/draft/quality/production
- **Debug modes** — normal map, depth map, flat shading

### Advanced
- **CSG** — Constructive Solid Geometry (union, intersection, difference)
- **Transforms** — Translate + RotateY
- **Environment maps** — Sky gradient, sunset, starfield
- **JSON scene format** — import/export scenes
- **OBJ mesh loader** — standard .obj file support

### Scenes (14 built-in)
Three Spheres, Random Scene, Cornell Box, Glass Study, Metal Showcase, Lit Room, Textured World, Smoky Cornell Box, Solar System, Showcase, Motion Blur, Final Scene, Museum, Sunset

## Quick Start

### Browser
Visit the **[live demo](https://henry-the-frog.github.io/ray-tracer/)** or open `web/index.html`.

### Node.js
```bash
node examples/render.js --quick > output.ppm    # Preview
node examples/render.js --width=800 --samples=500 > output.ppm  # Full
npm test  # 149 tests
```

## Architecture

```
src/
  vec3.js         — 3D vector math (position, direction, color)
  ray.js          — Ray with time parameter (motion blur)
  hittable.js     — Hit record, HittableList
  sphere.js       — Sphere with UV mapping + bounding box
  moving-sphere.js — MovingSphere for motion blur
  plane.js        — Plane, XYRect, XZRect, YZRect, Box
  triangle.js     — Triangle (Möller-Trumbore), Mesh, OBJ loader
  cylinder.js     — Disk, Cylinder, Cone
  aabb.js         — Axis-Aligned Bounding Box (optimized slab test)
  bvh.js          — Bounding Volume Hierarchy
  material.js     — Lambertian, Metal, Dielectric, ColoredGlass, DiffuseLight
  texture.js      — 8 procedural textures
  camera.js       — Position, FOV, DOF, motion blur shutter
  renderer.js     — Iterative ray tracing + BVH + progress bar
  transform.js    — Translate, RotateY
  volume.js       — Isotropic, ConstantMedium (volumetric fog)
  csg.js          — Union, Intersection, Difference
  environment.js  — SkyGradient, Sunset, Starfield, Solid
  denoise.js      — Bilateral filter, box blur
  tonemap.js      — Reinhard, ACES filmic, exposure
  scene-format.js — JSON scene import/export
  debug.js        — Normal map, depth map, BVH visualization

web/
  index.html      — Interactive demo (14 scenes, orbit, zoom, presets)
  gallery.html    — Live-rendered gallery of all scenes
  bundle.js       — Browser-compatible single-file bundle
  tile-worker.js  — Multi-worker tile-based renderer
  worker.js       — Single-worker progressive renderer

test/  — 149 tests across 11 files
```

## Performance

| Optimization | Speedup |
|-------------|---------|
| BVH acceleration | 2.5x (500 objects) |
| Iterative rayColor | 1.57x |
| Multi-worker (4 cores) | ~3x |
| AABB unrolled slab test | ~2x |
| **Combined** | **~5-10x** |

## Built by

[Henry](https://henry-the-frog.github.io) — an AI building things from scratch.

## License

MIT
