#!/usr/bin/env node
// csg-showcase.js — Render CSG demo scene showing boolean operations
// Run: node scenes/csg-showcase.js [width] [samples] > csg.ppm

import {
  Vec3, Point3, Color,
  Sphere, Box,
  Lambertian, Metal, DiffuseLight,
  Camera, Renderer, HittableList,
  CSGDifference, CSGIntersection, CSGUnion,
  CheckerTexture, SolidColor,
} from '../src/index.js';

const world = new HittableList();

// Ground
const checker = new CheckerTexture(
  new SolidColor(new Color(0.2, 0.2, 0.2)),
  new SolidColor(new Color(0.8, 0.8, 0.8)),
  2.0
);
world.add(new Box(new Point3(-20, -0.1, -20), new Point3(20, 0, 20), new Lambertian(checker)));

// 1. Sphere minus Sphere (hollow sphere / meniscus)
const outerSphere = new Sphere(new Point3(-3, 1.2, -3), 1.2, new Lambertian(new Color(0.8, 0.2, 0.2)));
const innerSphere = new Sphere(new Point3(-3, 1.5, -2.7), 1.0, new Lambertian(new Color(0.8, 0.2, 0.2)));
world.add(new CSGDifference(outerSphere, innerSphere));

// 2. Box intersected with Sphere (rounded cube)
const box = new Box(new Point3(-0.8, 0.2, -3.8), new Point3(0.8, 1.8, -2.2), new Metal(new Color(0.7, 0.7, 0.9), 0.05));
const roundSphere = new Sphere(new Point3(0, 1, -3), 1.1, new Metal(new Color(0.7, 0.7, 0.9), 0.05));
world.add(new CSGIntersection(box, roundSphere));

// 3. Union of three spheres (snowman-like)
const bottom = new Sphere(new Point3(3, 0.6, -3), 0.6, new Lambertian(new Color(0.9, 0.9, 0.9)));
const middle = new Sphere(new Point3(3, 1.4, -3), 0.4, new Lambertian(new Color(0.9, 0.9, 0.9)));
const top = new Sphere(new Point3(3, 2, -3), 0.3, new Lambertian(new Color(0.9, 0.9, 0.9)));
world.add(new CSGUnion(new CSGUnion(bottom, middle), top));

// Labels (small colored spheres as markers)
world.add(new Sphere(new Point3(-3, 0, -1.5), 0.1, new DiffuseLight(new Color(3, 0.3, 0.3)))); // Red marker for Difference
world.add(new Sphere(new Point3(0, 0, -1.5), 0.1, new DiffuseLight(new Color(0.3, 0.3, 3)))); // Blue marker for Intersection
world.add(new Sphere(new Point3(3, 0, -1.5), 0.1, new DiffuseLight(new Color(0.3, 3, 0.3)))); // Green marker for Union

// Light
world.add(new Sphere(new Point3(0, 8, -3), 3, new DiffuseLight(new Color(2.5, 2.5, 2.5))));

// Camera
const camera = new Camera({
  lookFrom: new Point3(0, 4, 3),
  lookAt: new Point3(0, 1, -3),
  vup: new Vec3(0, 1, 0),
  vfov: 40,
  aspectRatio: 16 / 9,
});

const width = parseInt(process.argv[2]) || 400;
const height = Math.floor(width / (16 / 9));
const samples = parseInt(process.argv[3]) || 50;

process.stderr.write(`\nCSG Showcase: ${width}×${height}, ${samples} spp\n`);
process.stderr.write(`Left: Difference (hollow sphere)\n`);
process.stderr.write(`Center: Intersection (rounded cube)\n`);
process.stderr.write(`Right: Union (snowman)\n\n`);

const renderer = new Renderer({
  width, height, samplesPerPixel: samples, maxDepth: 15,
  camera, world, lights: [],
});

process.stdout.write(renderer.renderPPM());
process.stderr.write(`Done!\n`);
