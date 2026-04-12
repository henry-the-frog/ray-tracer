#!/usr/bin/env node
// quick-render.js — Quick scene previews in the terminal
// Usage: node scenes/quick-render.js [scene-name]
// Scenes: cornell, materials, dispersion, csg, torus, all-features

import { SceneBuilder, renderAscii } from '../src/index.js';

const scenes = {
  cornell: () => new SceneBuilder()
    .box([-2.5, 0, -5], [-2.4, 5, 0]).lambertian([0.8, 0.2, 0.2])  // Left red wall
    .box([2.4, 0, -5], [2.5, 5, 0]).lambertian([0.2, 0.8, 0.2])   // Right green wall
    .ground(0).lambertian([0.8, 0.8, 0.8])                         // Floor
    .sphere([0, 1, -3], 1).glass(1.5)
    .sphere([-1, 0.5, -2], 0.5).metal([0.8, 0.8, 0.2], 0.1)
    .light([0, 4.9, -2.5], 1, [3, 3, 3])
    .camera([0, 2.5, 2], [0, 1, -2.5], { fov: 50 }),
    
  materials: () => new SceneBuilder()
    .sphere([-3, 1, -3], 1).lambertian([0.8, 0.2, 0.2])
    .sphere([-1, 1, -3], 1).metal([0.8, 0.8, 0.2], 0.1)
    .sphere([1, 1, -3], 1).glass(1.5)
    .sphere([3, 1, -3], 1).pbr([0.2, 0.6, 0.8], 0.2, 0.5)
    .ground().checker([0.1, 0.1, 0.1], [0.9, 0.9, 0.9])
    .light([0, 8, 0], 2)
    .camera([0, 3, 3], [0, 1, -3], { fov: 60 }),

  dispersion: () => new SceneBuilder()
    .sphere([-1.5, 1, -2], 1).dispersive('HEAVY_FLINT')
    .sphere([1.5, 0.5, -2], 0.5).diamond()
    .ground().lambertian([0.3, 0.3, 0.3])
    .light([2, 5, 2], 1, [4, 4, 4])
    .camera([0, 2, 3], [0, 1, -2], { fov: 40 }),

  torus: () => new SceneBuilder()
    .torus([0, 0.8, -3], 1.5, 0.4).metal([0.85, 0.7, 0.3], 0.05)
    .sphere([0, 0.5, -3], 0.3).sss('jade')
    .ground().checker([0.15, 0.15, 0.15], [0.85, 0.85, 0.85])
    .light([0, 6, 0], 1.5)
    .camera([0, 3, 2], [0, 0.5, -3], { fov: 40 }),

  sss: () => new SceneBuilder()
    .sphere([-2, 1, -3], 1).sss('skin')
    .sphere([0, 1, -3], 1).sss('jade')
    .sphere([2, 1, -3], 1).sss('marble')
    .ground().lambertian([0.4, 0.4, 0.4])
    .light([0, 6, 0], 2)
    .camera([0, 2, 2], [0, 1, -3], { fov: 50 }),
};

const sceneName = process.argv[2] || 'materials';
const width = parseInt(process.argv[3]) || 120;
const samples = parseInt(process.argv[4]) || 16;
const maxWidth = parseInt(process.argv[5]) || 60;

if (sceneName === 'list') {
  console.log('\nAvailable scenes:', Object.keys(scenes).join(', '));
  process.exit(0);
}

const builder = scenes[sceneName];
if (!builder) {
  console.error(`Unknown scene: ${sceneName}. Available: ${Object.keys(scenes).join(', ')}`);
  process.exit(1);
}

const height = Math.floor(width / (16 / 9));

console.log(`\n🔆 Quick Render: "${sceneName}" (${width}×${height}, ${samples} spp)\n`);

const renderer = builder().build({ width, height, samples, maxDepth: 10 });
const start = performance.now();
const ascii = renderAscii(renderer, { maxWidth, color: process.stdout.isTTY });
const elapsed = performance.now() - start;

console.log(ascii);
console.log(`\n⏱  ${(elapsed / 1000).toFixed(1)}s | ${sceneName}\n`);
