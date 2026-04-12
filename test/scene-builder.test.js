// scene-builder.test.js — Tests for fluent scene builder API

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SceneBuilder } from '../src/scene-builder.js';

describe('SceneBuilder', () => {
  it('should create a basic scene with one sphere', () => {
    const renderer = new SceneBuilder()
      .sphere([0, 0, -2], 1).lambertian([0.8, 0.2, 0.2])
      .camera([0, 0, 0], [0, 0, -1])
      .build({ width: 10, height: 5, samples: 1 });
    
    const pixels = renderer.render();
    assert.ok(pixels instanceof Uint8ClampedArray);
  });

  it('should support metal material', () => {
    const renderer = new SceneBuilder()
      .sphere([0, 0, -2], 1).metal([0.9, 0.9, 0.9], 0.05)
      .camera([0, 0, 0], [0, 0, -1])
      .build({ width: 10, height: 5, samples: 1 });
    
    const pixels = renderer.render();
    assert.ok(pixels.length > 0);
  });

  it('should support glass material', () => {
    const renderer = new SceneBuilder()
      .sphere([0, 0, -2], 1).glass(1.5)
      .camera([0, 0, 0], [0, 0, -1])
      .build({ width: 10, height: 5, samples: 1 });
    
    const pixels = renderer.render();
    assert.ok(pixels.length > 0);
  });

  it('should support dispersive glass', () => {
    const renderer = new SceneBuilder()
      .sphere([0, 0, -2], 1).dispersive('FLINT')
      .camera([0, 0, 0], [0, 0, -1])
      .build({ width: 10, height: 5, samples: 2 });
    
    const pixels = renderer.render();
    assert.ok(pixels.length > 0);
  });

  it('should support SSS materials', () => {
    const renderer = new SceneBuilder()
      .sphere([0, 0, -2], 1).sss('jade')
      .camera([0, 0, 0], [0, 0, -1])
      .build({ width: 10, height: 5, samples: 2 });
    
    const pixels = renderer.render();
    assert.ok(pixels.length > 0);
  });

  it('should support torus primitive', () => {
    const renderer = new SceneBuilder()
      .torus([0, 0, -4], 1.5, 0.5).lambertian([0.8, 0.2, 0.2])
      .camera([0, 2, 0], [0, 0, -4])
      .build({ width: 10, height: 5, samples: 2 });
    
    const pixels = renderer.render();
    assert.ok(pixels.length > 0);
  });

  it('should support ground with checker texture', () => {
    const scene = new SceneBuilder()
      .ground().checker([0, 0, 0], [1, 1, 1]);
    
    const world = scene.getWorld();
    assert.equal(world.objects.length, 1);
  });

  it('should support light sources', () => {
    const scene = new SceneBuilder()
      .sphere([0, 0, -2], 1).lambertian([0.5, 0.5, 0.5])
      .light([0, 5, 0], 1, [3, 3, 3]);
    
    const world = scene.getWorld();
    assert.equal(world.objects.length, 2); // sphere + light
  });

  it('should support method chaining', () => {
    const scene = new SceneBuilder()
      .sphere([0, 1, 0], 1).metal([0.8, 0.8, 0.2], 0.1)
      .sphere([-2, 1, 0], 1).glass(1.5)
      .sphere([2, 1, 0], 1).lambertian([0.2, 0.8, 0.2])
      .ground().lambertian([0.5, 0.5, 0.5])
      .light([0, 10, 0], 2);
    
    const world = scene.getWorld();
    assert.equal(world.objects.length, 5); // 3 spheres + ground + light
  });

  it('should render to PPM', () => {
    const ppm = new SceneBuilder()
      .sphere([0, 0, -2], 1).lambertian([1, 0, 0])
      .camera([0, 0, 0], [0, 0, -1])
      .render({ width: 10, height: 5, samples: 1 });
    
    assert.ok(ppm.startsWith('P3'), 'Should start with PPM header');
    assert.ok(ppm.includes('10 5'), 'Should contain dimensions');
  });

  it('should support diamond material', () => {
    const renderer = new SceneBuilder()
      .sphere([0, 0, -2], 0.5).diamond()
      .camera([0, 0, 0], [0, 0, -1])
      .build({ width: 10, height: 5, samples: 2 });
    
    const pixels = renderer.render();
    assert.ok(pixels.length > 0);
  });

  it('should support emissive material', () => {
    const renderer = new SceneBuilder()
      .sphere([0, 0, -2], 1).emissive([1, 0.8, 0.5], 3)
      .camera([0, 0, 0], [0, 0, -1])
      .build({ width: 10, height: 5, samples: 2 });
    
    const pixels = renderer.render();
    assert.ok(pixels.length > 0);
  });
});
