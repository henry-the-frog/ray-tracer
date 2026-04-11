// torus.test.js — Tests for torus primitive and quartic solver

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Torus, solveQuartic, solveCubic, solveQuadratic } from '../src/torus.js';
import { Vec3, Color, Point3 } from '../src/vec3.js';
import { Ray } from '../src/ray.js';
import { Lambertian, Metal } from '../src/material.js';
import { Sphere } from '../src/sphere.js';
import { HittableList } from '../src/hittable.js';
import { Camera } from '../src/camera.js';
import { Renderer } from '../src/renderer.js';

describe('Polynomial Solvers', () => {
  describe('solveQuadratic', () => {
    it('should solve x² - 1 = 0', () => {
      const roots = solveQuadratic(1, 0, -1);
      assert.equal(roots.length, 2);
      assert.ok(Math.abs(roots[0] - (-1)) < 0.001);
      assert.ok(Math.abs(roots[1] - 1) < 0.001);
    });

    it('should return empty for x² + 1 = 0', () => {
      const roots = solveQuadratic(1, 0, 1);
      assert.equal(roots.length, 0);
    });

    it('should solve x² - 2x + 1 = 0 (double root)', () => {
      const roots = solveQuadratic(1, -2, 1);
      assert.equal(roots.length, 1);
      assert.ok(Math.abs(roots[0] - 1) < 0.001);
    });
  });

  describe('solveCubic', () => {
    it('should solve x³ - 1 = 0', () => {
      const roots = solveCubic(1, 0, 0, -1);
      assert.ok(roots.length >= 1);
      assert.ok(roots.some(r => Math.abs(r - 1) < 0.001), `Should have root at 1, got ${roots}`);
    });

    it('should solve x³ - 6x² + 11x - 6 = 0 → roots 1, 2, 3', () => {
      const roots = solveCubic(1, -6, 11, -6);
      assert.equal(roots.length, 3);
      assert.ok(Math.abs(roots[0] - 1) < 0.01, `First root: ${roots[0]}`);
      assert.ok(Math.abs(roots[1] - 2) < 0.01, `Second root: ${roots[1]}`);
      assert.ok(Math.abs(roots[2] - 3) < 0.01, `Third root: ${roots[2]}`);
    });

    it('should solve x³ = 0 (triple root)', () => {
      const roots = solveCubic(1, 0, 0, 0);
      assert.ok(roots.length >= 1);
      assert.ok(roots.some(r => Math.abs(r) < 0.01));
    });
  });

  describe('solveQuartic', () => {
    it('should solve x⁴ - 1 = 0 → roots -1, 1', () => {
      const roots = solveQuartic(1, 0, 0, 0, -1);
      assert.ok(roots.length >= 2);
      assert.ok(roots.some(r => Math.abs(r - 1) < 0.01), `Should have root at 1: ${roots}`);
      assert.ok(roots.some(r => Math.abs(r + 1) < 0.01), `Should have root at -1: ${roots}`);
    });

    it('should solve (x-1)(x-2)(x-3)(x-4) = 0', () => {
      // x⁴ - 10x³ + 35x² - 50x + 24 = 0
      const roots = solveQuartic(1, -10, 35, -50, 24);
      assert.equal(roots.length, 4, `Expected 4 roots, got ${roots.length}: ${roots}`);
      assert.ok(Math.abs(roots[0] - 1) < 0.05, `Root 0: ${roots[0]}`);
      assert.ok(Math.abs(roots[1] - 2) < 0.05, `Root 1: ${roots[1]}`);
      assert.ok(Math.abs(roots[2] - 3) < 0.05, `Root 2: ${roots[2]}`);
      assert.ok(Math.abs(roots[3] - 4) < 0.05, `Root 3: ${roots[3]}`);
    });

    it('should solve biquadratic x⁴ - 5x² + 4 = 0', () => {
      // (x²-1)(x²-4) = 0 → roots -2, -1, 1, 2
      const roots = solveQuartic(1, 0, -5, 0, 4);
      assert.equal(roots.length, 4);
      assert.ok(Math.abs(roots[0] - (-2)) < 0.01);
      assert.ok(Math.abs(roots[1] - (-1)) < 0.01);
      assert.ok(Math.abs(roots[2] - 1) < 0.01);
      assert.ok(Math.abs(roots[3] - 2) < 0.01);
    });

    it('should return empty for x⁴ + 1 = 0 (no real roots)', () => {
      const roots = solveQuartic(1, 0, 0, 0, 1);
      assert.equal(roots.length, 0);
    });

    it('should handle x⁴ = 0 (quadruple root at 0)', () => {
      const roots = solveQuartic(1, 0, 0, 0, 0);
      assert.ok(roots.length >= 1);
      assert.ok(roots.some(r => Math.abs(r) < 0.01));
    });
  });
});

describe('Torus Primitive', () => {
  const mat = new Lambertian(new Color(0.8, 0.2, 0.2));

  it('should hit a torus from outside (through the hole)', () => {
    const torus = new Torus(new Point3(0, 0, 0), 2, 0.5, mat);
    
    // Ray aimed at the tube from the side
    const ray = new Ray(new Point3(3, 0, 0), new Vec3(-1, 0, 0));
    const hit = torus.hit(ray, 0.001, 100);
    
    assert.ok(hit, 'Should hit the torus');
    assert.ok(hit.t > 0, 'Hit should be in front of ray');
    assert.ok(Math.abs(hit.p.x - 2.5) < 0.1, `Hit should be near x=2.5, got ${hit.p.x.toFixed(2)}`);
  });

  it('should miss a torus through the hole', () => {
    const torus = new Torus(new Point3(0, 0, 0), 2, 0.5, mat);
    
    // Ray going straight through the hole (along Y axis)
    const ray = new Ray(new Point3(0, 5, 0), new Vec3(0, -1, 0));
    const hit = torus.hit(ray, 0.001, 100);
    
    // Should miss if the minor radius doesn't reach the center
    // At x=0, z=0: the tube center is at distance R=2 from axis, 
    // so at origin, the nearest tube surface is R-r = 1.5 away in the xz plane.
    // A Y-axis ray at (0,y,0) misses since it's inside the hole.
    assert.equal(hit, null, 'Should miss through the hole');
  });

  it('should produce correct normals', () => {
    const torus = new Torus(new Point3(0, 0, 0), 2, 0.5, mat);
    
    // Hit from the right side
    const ray = new Ray(new Point3(5, 0, 0), new Vec3(-1, 0, 0));
    const hit = torus.hit(ray, 0.001, 100);
    
    assert.ok(hit, 'Should hit');
    // Normal should point outward (roughly +x at the outer edge)
    assert.ok(hit.normal.x > 0.5, `Normal should point outward: ${hit.normal.x.toFixed(2)}`);
    // Normal should be unit length
    const len = hit.normal.length();
    assert.ok(Math.abs(len - 1) < 0.01, `Normal should be unit length: ${len.toFixed(4)}`);
  });

  it('should have correct bounding box', () => {
    const torus = new Torus(new Point3(1, 2, 3), 3, 1, mat);
    const box = torus.boundingBox();
    
    // Extent in x,z: center ± (R+r) = 1 ± 4 = [-3, 5]
    // Extent in y: center ± r = 2 ± 1 = [1, 3]
    assert.ok(Math.abs(box.minimum.x - (-3)) < 0.01, `Min x: ${box.minimum.x}`);
    assert.ok(Math.abs(box.maximum.x - 5) < 0.01, `Max x: ${box.maximum.x}`);
    assert.ok(Math.abs(box.minimum.y - 1) < 0.01, `Min y: ${box.minimum.y}`);
    assert.ok(Math.abs(box.maximum.y - 3) < 0.01, `Max y: ${box.maximum.y}`);
  });

  it('should hit from multiple angles', () => {
    const torus = new Torus(new Point3(0, 0, 0), 2, 0.5, mat);
    
    // Ray from top
    const topRay = new Ray(new Point3(2, 3, 0), new Vec3(0, -1, 0));
    const topHit = torus.hit(topRay, 0.001, 100);
    assert.ok(topHit, 'Should hit from top');
    
    // Ray from front
    const frontRay = new Ray(new Point3(0, 0, 5), new Vec3(0, 0, -1));
    const frontHit = torus.hit(frontRay, 0.001, 100);
    assert.ok(frontHit, 'Should hit from front');
  });

  it('should produce up to 4 intersections', () => {
    // A ray through a torus can hit up to 4 times
    const torus = new Torus(new Point3(0, 0, 0), 2, 1, mat);
    
    // Ray through the torus horizontally across the tube
    const ray = new Ray(new Point3(5, 0, 0), new Vec3(-1, 0, 0));
    
    // Collect all hits by finding them sequentially
    const hits = [];
    let tMin = 0.001;
    for (let i = 0; i < 5; i++) {
      const hit = torus.hit(ray, tMin, 100);
      if (!hit) break;
      hits.push(hit.t);
      tMin = hit.t + 0.01;
    }
    
    // Should have at least 2 hits (entering and exiting the tube)
    assert.ok(hits.length >= 2, `Expected at least 2 hits, got ${hits.length}`);
  });

  describe('Renderer integration', () => {
    it('should render a torus', () => {
      const world = new HittableList();
      world.add(new Torus(new Point3(0, 0, -4), 1.5, 0.5, mat));
      
      const camera = new Camera({
        lookFrom: new Point3(0, 3, 0),
        lookAt: new Point3(0, 0, -4),
        vup: new Vec3(0, 1, 0),
        vfov: 60,
        aspectRatio: 2,
      });
      
      const renderer = new Renderer({
        width: 20,
        height: 10,
        samplesPerPixel: 2,
        maxDepth: 5,
        camera,
        world,
      });
      
      const pixels = renderer.render();
      assert.ok(pixels instanceof Uint8ClampedArray);
      
      // Some pixels should be colored (torus is red)
      let redPixels = 0;
      for (let i = 0; i < pixels.length; i += 4) {
        if (pixels[i] > 50 && pixels[i] > pixels[i + 1]) redPixels++;
      }
      assert.ok(redPixels > 0, 'Should see red torus pixels');
    });

    it('should work with metallic material', () => {
      const world = new HittableList();
      world.add(new Torus(new Point3(0, 0, -4), 1.5, 0.5, new Metal(new Color(0.8, 0.8, 0.2), 0.1)));
      
      const camera = new Camera({
        lookFrom: new Point3(0, 2, 0),
        lookAt: new Point3(0, 0, -4),
        vup: new Vec3(0, 1, 0),
        vfov: 60,
        aspectRatio: 2,
      });
      
      const renderer = new Renderer({
        width: 10, height: 5, samplesPerPixel: 2, maxDepth: 5,
        camera, world,
      });
      
      const pixels = renderer.render();
      let hasColor = false;
      for (let i = 0; i < pixels.length; i += 4) {
        if (pixels[i] > 10 || pixels[i + 1] > 10 || pixels[i + 2] > 10) {
          hasColor = true;
          break;
        }
      }
      assert.ok(hasColor, 'Metal torus should produce visible pixels');
    });
  });
});
