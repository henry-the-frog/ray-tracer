#!/usr/bin/env node
// showcase.js — Render a demo scene showcasing new features
// Run: node scenes/showcase.js > showcase.ppm
// Convert: convert showcase.ppm showcase.png (ImageMagick)
//
// Features demonstrated:
// - Dispersive glass sphere (rainbow refraction)
// - SSS material (skin-like sphere)
// - Torus with metallic finish
// - Atmospheric fog
// - Procedural ground texture

import {
  Vec3, Point3, Color, Ray,
  Sphere, Torus, XZRect,
  Lambertian, Metal, DiffuseLight, Dielectric,
  Camera, Renderer, HittableList,
  CheckerTexture, SolidColor,
  DispersiveGlass, flintGlass, heavyFlintGlass, diamond,
  SubsurfaceScattering, skin, jade, marble,
  ExponentialFog, AtmosphericScattering,
} from '../src/index.js';

const world = new HittableList();

// Ground: checker texture
const checker = new CheckerTexture(
  new SolidColor(new Color(0.15, 0.15, 0.15)),
  new SolidColor(new Color(0.85, 0.85, 0.85)),
  2.0
);
world.add(new XZRect(-20, 20, -20, 20, 0, new Lambertian(checker)));

// 1. Dispersive glass sphere (rainbow effects)
world.add(new Sphere(new Point3(-2.5, 1, -3), 1, heavyFlintGlass()));

// 2. SSS sphere (jade)
world.add(new Sphere(new Point3(0, 1, -3), 1, jade()));

// 3. SSS sphere (skin)
world.add(new Sphere(new Point3(2.5, 1, -3), 1, skin()));

// 4. Metal torus
world.add(new Torus(
  new Point3(0, 0.8, -6),
  1.5, 0.4,
  new Metal(new Color(0.85, 0.7, 0.3), 0.05) // Gold
));

// 5. Diamond sphere (smaller, behind)
world.add(new Sphere(new Point3(-1, 0.5, -5), 0.5, diamond()));

// 6. Marble sphere
world.add(new Sphere(new Point3(1.5, 0.5, -5), 0.5, marble()));

// 7. Light source
world.add(new Sphere(new Point3(0, 8, -3), 2, new DiffuseLight(new Color(3, 2.8, 2.5))));

// Camera
const camera = new Camera({
  lookFrom: new Point3(0, 4, 3),
  lookAt: new Point3(0, 1, -3),
  vup: new Vec3(0, 1, 0),
  vfov: 45,
  aspectRatio: 16 / 9,
  aperture: 0.05,
  focusDist: 6.5,
});

// Renderer
const width = parseInt(process.argv[2]) || 400;
const height = Math.floor(width / (16 / 9));
const samples = parseInt(process.argv[3]) || 50;

process.stderr.write(`\nShowcase render: ${width}×${height}, ${samples} spp\n`);
process.stderr.write(`Features: dispersion, SSS (jade, skin, marble), torus, diamond\n\n`);

const renderer = new Renderer({
  width,
  height,
  samplesPerPixel: samples,
  maxDepth: 20,
  camera,
  world,
  lights: [],
});

const ppm = renderer.renderPPM();
process.stdout.write(ppm);
process.stderr.write(`\nDone! Output ${ppm.length} bytes of PPM.\n`);
