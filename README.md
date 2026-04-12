# 🌈 Ray Tracer

A physically-based ray tracer built from scratch in JavaScript. Zero dependencies. 356 tests.

**[Live Demo →](https://henry-the-frog.github.io/ray-tracer/)**

## Features

### Geometry
- **Primitives**: Sphere, Plane, Box, Cylinder, Cone, Disk, Triangle, Mesh
- **Torus** — donut shape via quartic solver (Ferrari's method)
- **CSG** — Constructive Solid Geometry (union, intersection, difference)
- **Motion Blur** — moving spheres with temporal sampling
- **Transforms** — translate, rotate

### Materials
- **Lambertian** (diffuse/matte)
- **Metal** (reflective with configurable fuzz)
- **Dielectric** (glass/water with refraction)
- **Colored Glass** (Beer-Lambert absorption)
- **Dispersive Glass** 🌈 — wavelength-dependent refraction for rainbow effects
  - Cauchy equation: n(λ) = A + B/λ²
  - Presets: crown glass, flint glass, heavy flint, diamond, water
- **Subsurface Scattering** 🕯️ — light penetrates, scatters inside, exits elsewhere
  - Random walk simulation with Beer-Lambert absorption
  - Presets: skin, marble, wax, jade, milk
- **Microfacet** (GGX/Beckmann NDF, Smith geometry, Schlick Fresnel)
- **Emissive** (area lights)
- **Isotropic** (volumes/fog)

### Textures
- Solid, Checker, Gradient, Stripe
- Procedural: Noise, Marble, Wood, Turbulence, Planet
- Image textures
- Normal maps with TBN computation

### Camera
- Configurable FOV, aspect ratio, position
- **Depth of field** with aperture control
- **Bokeh shapes**: circle, hexagon, pentagon, star, heart, ring

### Rendering
- Monte Carlo path tracing with configurable samples/depth
- **BVH acceleration** with SAH (Surface Area Heuristic)
- **Importance sampling** (cosine-weighted, light sampling, MIS)
- **Area lights** with next event estimation (soft shadows)
- PPM output with progress bar

### Atmosphere & Post-processing
- **Exponential fog** — distance-based atmospheric fog
- **Height fog** — altitude-dependent ground fog
- **Rayleigh + Mie scattering** — physically-based sky coloring
- Bilateral filter denoising, box blur
- Tone mapping: Reinhard, ACES, exposure adjustment

### Sky Models
- Gradient, solid, sunset, starfield backgrounds
- **Preetham sky model** — physically accurate daylight
- Time-of-day sky generation

### Debug & Tools
- Normal, depth, UV visualization
- BVH heatmap
- Scene serialization (JSON load/export)

## Quick Start

```bash
# Clone
git clone https://github.com/henry-the-frog/ray-tracer.git
cd ray-tracer

# Run tests
node --test

# Render showcase scene
node scenes/showcase.js 400 50 > showcase.ppm

# Convert to PNG (requires ImageMagick)
convert showcase.ppm showcase.png
```

## SceneBuilder (Recommended)

The easiest way to build scenes — fluent API with method chaining:

```javascript
import { SceneBuilder } from './src/index.js';

new SceneBuilder()
  .sphere([0, 1, 0], 1).metal([0.8, 0.8, 0.2], 0.1)   // Gold sphere
  .sphere([-2, 1, 0], 1).glass(1.5)                      // Glass sphere
  .sphere([2, 1, 0], 1).sss('jade')                      // Jade (SSS)
  .torus([0, 0.5, -3], 1.5, 0.4).dispersive('FLINT')    // Rainbow donut
  .ground().checker([0.1, 0.1, 0.1], [0.9, 0.9, 0.9])   // Checker floor
  .light([0, 10, 0], 2)                                   // Overhead light
  .camera([0, 3, 5], [0, 1, 0], { fov: 40, aperture: 0.05 })
  .render({ width: 800, samples: 200 });  // → PPM string
```

**Materials:** `lambertian`, `metal`, `glass`, `dispersive`, `diamond`, `sss`, `checker`, `emissive`
**Primitives:** `sphere`, `torus`, `ground`

## Example: Dispersive Prism

```javascript
import { Sphere, HittableList, Camera, Renderer, heavyFlintGlass, Point3, Vec3 } from './src/index.js';

const world = new HittableList();
world.add(new Sphere(new Point3(0, 0, -2), 1, heavyFlintGlass()));

const camera = new Camera({
  lookFrom: new Point3(0, 0, 2),
  lookAt: new Point3(0, 0, -2),
  vfov: 40,
  aspectRatio: 16/9,
});

const renderer = new Renderer({
  width: 800, height: 450,
  samplesPerPixel: 200,
  maxDepth: 20,
  camera, world,
});

process.stdout.write(renderer.renderPPM());
```

## Example: SSS Jade Sphere

```javascript
import { Sphere, HittableList, Camera, Renderer, jade, DiffuseLight, Color, Point3, Vec3 } from './src/index.js';

const world = new HittableList();
world.add(new Sphere(new Point3(0, 1, 0), 1, jade()));
world.add(new Sphere(new Point3(0, 5, 0), 1, new DiffuseLight(new Color(4, 4, 4))));

// ... camera & renderer setup same as above
```

## Architecture

```
src/
├── vec3.js          # Vector/Color math (Float64)
├── ray.js           # Ray class
├── hittable.js      # Hit records, HittableList
├── sphere.js        # Sphere intersection
├── plane.js         # Plane, Rect, Box
├── triangle.js      # Triangle, Mesh
├── cylinder.js      # Cylinder, Cone, Disk
├── torus.js         # Torus (quartic solver)
├── csg.js           # CSG operations
├── material.js      # Lambertian, Metal, Dielectric, DiffuseLight
├── microfacet.js    # PBR microfacet model
├── dispersion.js    # Dispersive glass (spectral rendering)
├── sss.js           # Subsurface scattering
├── texture.js       # Procedural & image textures
├── normal-map.js    # Normal mapping
├── camera.js        # Camera with DOF & bokeh
├── renderer.js      # Core ray tracing loop
├── bvh.js           # BVH acceleration (SAH)
├── aabb.js          # Axis-aligned bounding boxes
├── atmosphere.js    # Fog, height fog, Rayleigh/Mie
├── sky.js           # Preetham sky model
├── environment.js   # Background environments
├── spectral.js      # Wavelength→RGB, Cauchy equation
├── sampling.js      # Importance sampling utilities
├── pdf.js           # PDFs for importance sampling
├── bokeh.js         # Aperture shape samplers
├── tonemap.js       # Tone mapping (Reinhard, ACES)
├── denoise.js       # Bilateral filter, box blur
├── volume.js        # Volumetric rendering
├── transform.js     # Translation, rotation
├── scene-format.js  # JSON scene serialization
├── debug.js         # Visualization modes
├── moving-sphere.js # Motion blur
└── index.js         # Public API
```

## Stats

- **34 source files**, 4,351 lines of code
- **356 tests**, all passing
- **Zero dependencies** — pure JavaScript, runs in Node.js and browsers
- Renders at ~1-5M rays/second on modern hardware

## Physics

The ray tracer implements several physically-based models:

- **Snell's law** for refraction
- **Schlick's approximation** for Fresnel reflectance
- **Beer-Lambert law** for absorption in colored/SSS materials
- **Cauchy's equation** for wavelength-dependent IOR (dispersion)
- **Rayleigh scattering** (λ⁻⁴) for blue skies
- **Mie scattering** (Henyey-Greenstein phase) for sun halos
- **GGX/Beckmann NDF** for microfacet materials
- **Preetham sky model** for physically accurate daylight

## License

MIT
