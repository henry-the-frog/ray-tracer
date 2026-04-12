#!/usr/bin/env node
// benchmark.js — Measure ray tracer performance
// Renders multiple test scenes and reports M rays/sec

import { SceneBuilder } from '../src/index.js';

function bench(name, builderFn, config = {}) {
  const width = config.width || 100;
  const height = config.height || 50;
  const samples = config.samples || 10;
  const maxDepth = config.maxDepth || 10;
  
  const totalRays = width * height * samples; // Approximate (doesn't count bounces)
  
  const renderer = builderFn()
    .build({ width, height, samples, maxDepth });
  
  const start = performance.now();
  renderer.render();
  const elapsed = performance.now() - start;
  
  const mrays = (totalRays / 1e6).toFixed(2);
  const mraysSec = ((totalRays / elapsed) * 1000 / 1e6).toFixed(2);
  
  console.log(`  ${name.padEnd(30)} ${elapsed.toFixed(0).padStart(6)}ms  ${mrays}M rays  ${mraysSec} Mrays/s`);
  return { name, elapsed, totalRays, mraysPerSec: parseFloat(mraysSec) };
}

console.log('\n🔆 Ray Tracer Benchmark\n');
console.log(`  ${'Scene'.padEnd(30)} ${'Time'.padStart(6)}  ${'Rays'.padStart(9)}  Performance`);
console.log(`  ${'-'.repeat(30)} ${'-'.repeat(6)}  ${'-'.repeat(9)}  ${'-'.repeat(11)}`);

const results = [];

// Scene 1: Simple (1 sphere, no bounces)
results.push(bench('Single sphere (Lambertian)', () =>
  new SceneBuilder()
    .sphere([0, 0, -2], 1).lambertian([0.8, 0.2, 0.2])
    .camera([0, 0, 0], [0, 0, -1])
));

// Scene 2: Metal reflections
results.push(bench('Metal reflections (3 spheres)', () =>
  new SceneBuilder()
    .sphere([0, 0, -2], 1).metal([0.8, 0.8, 0.8], 0.01)
    .sphere([-2.5, 0, -2], 1).metal([0.8, 0.6, 0.2], 0.1)
    .sphere([2.5, 0, -2], 1).metal([0.2, 0.6, 0.8], 0.05)
    .ground(-1).lambertian([0.3, 0.3, 0.3])
    .camera([0, 1, 3], [0, 0, -2])
));

// Scene 3: Glass refraction
results.push(bench('Glass refraction', () =>
  new SceneBuilder()
    .sphere([0, 0, -2], 1).glass(1.5)
    .sphere([-2, 0, -3], 1).lambertian([0.8, 0.2, 0.2])
    .ground(-1).lambertian([0.5, 0.5, 0.5])
    .light([0, 5, 0], 1)
    .camera([0, 1, 3], [0, 0, -2])
));

// Scene 4: Dispersive glass
results.push(bench('Dispersive glass', () =>
  new SceneBuilder()
    .sphere([0, 0, -2], 1).dispersive('HEAVY_FLINT')
    .ground(-1).lambertian([0.5, 0.5, 0.5])
    .light([0, 5, 0], 1)
    .camera([0, 1, 3], [0, 0, -2])
));

// Scene 5: SSS material
results.push(bench('Subsurface scattering (skin)', () =>
  new SceneBuilder()
    .sphere([0, 0, -2], 1).sss('skin')
    .light([0, 5, 0], 1)
    .camera([0, 0, 0], [0, 0, -1])
));

// Scene 6: Torus
results.push(bench('Torus (quartic)', () =>
  new SceneBuilder()
    .torus([0, 0, -4], 1.5, 0.5).metal([0.8, 0.7, 0.3], 0.05)
    .ground(-1).checker([0, 0, 0], [1, 1, 1])
    .camera([0, 2, 0], [0, 0, -4])
));

// Scene 7: Complex scene
results.push(bench('Complex (7 objects)', () =>
  new SceneBuilder()
    .sphere([0, 1, 0], 1).metal([0.8, 0.8, 0.2], 0.1)
    .sphere([-2, 1, 0], 1).glass(1.5)
    .sphere([2, 1, 0], 1).sss('jade')
    .sphere([0, 0.5, 2], 0.5).dispersive('FLINT')
    .torus([0, 0.5, -3], 1.5, 0.4).lambertian([0.8, 0.2, 0.2])
    .ground().checker([0.1, 0.1, 0.1], [0.9, 0.9, 0.9])
    .light([0, 10, 0], 2)
    .camera([0, 3, 5], [0, 1, 0], { fov: 40 })
));

// Summary
console.log();
const avgMrays = results.reduce((s, r) => s + r.mraysPerSec, 0) / results.length;
const fastest = results.reduce((a, b) => a.mraysPerSec > b.mraysPerSec ? a : b);
const slowest = results.reduce((a, b) => a.mraysPerSec < b.mraysPerSec ? a : b);

console.log(`  Average: ${avgMrays.toFixed(2)} Mrays/s`);
console.log(`  Fastest: ${fastest.name} (${fastest.mraysPerSec} Mrays/s)`);
console.log(`  Slowest: ${slowest.name} (${slowest.mraysPerSec} Mrays/s)`);
console.log();
