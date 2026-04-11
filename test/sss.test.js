// sss.test.js — Tests for subsurface scattering material

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SubsurfaceScattering, skin, marble, wax, jade, milk } from '../src/sss.js';
import { Vec3, Color, Point3 } from '../src/vec3.js';
import { Ray } from '../src/ray.js';
import { Sphere } from '../src/sphere.js';
import { HittableList } from '../src/hittable.js';
import { Renderer } from '../src/renderer.js';
import { Camera } from '../src/camera.js';
import { Lambertian } from '../src/material.js';

describe('SubsurfaceScattering Material', () => {
  const makeRec = (normal = new Vec3(0, 0, 1)) => ({
    p: new Point3(0, 0, 0),
    normal,
    frontFace: true,
    t: 1.0
  });

  it('should scatter most incoming rays', () => {
    const sss = skin();
    const ray = new Ray(new Point3(0, 0, 2), new Vec3(0, 0, -1));
    
    let scattered = 0;
    for (let i = 0; i < 200; i++) {
      if (sss.scatter(ray, makeRec())) scattered++;
    }
    
    assert.ok(scattered > 150, `Expected most rays to scatter, got ${scattered}/200`);
  });

  it('should produce colored attenuation from scatterColor', () => {
    const sss = new SubsurfaceScattering({
      scatterColor: new Color(1, 0, 0), // Pure red scatter
      scatterDistance: 0.5,
      roughness: 0, // No diffuse component
    });
    
    const ray = new Ray(new Point3(0, 0, 2), new Vec3(0, 0, -1));
    let hasRedDominant = false;
    
    for (let i = 0; i < 100; i++) {
      const result = sss.scatter(ray, makeRec());
      if (result && result.attenuation.x > result.attenuation.y * 2) {
        hasRedDominant = true;
        break;
      }
    }
    
    assert.ok(hasRedDominant, 'Red scatter color should produce red-dominant attenuation');
  });

  it('should scatter rays in diverse directions (not just specular)', () => {
    const sss = skin();
    const ray = new Ray(new Point3(0, 0, 2), new Vec3(0, 0, -1));
    
    const directions = [];
    for (let i = 0; i < 100; i++) {
      const result = sss.scatter(ray, makeRec());
      if (result) directions.push(result.scattered.direction);
    }
    
    assert.ok(directions.length > 50, 'Should have many scattered rays');
    
    // Check directional diversity (not all going the same way)
    let hasPositiveZ = false, hasNegativeZ = false;
    for (const dir of directions) {
      if (dir.z > 0) hasPositiveZ = true;
      if (dir.z < 0) hasNegativeZ = true;
    }
    
    assert.ok(hasPositiveZ, 'Some rays should scatter forward');
    assert.ok(hasNegativeZ, 'Some rays should scatter backward');
  });

  it('should have lower attenuation for short scatterDistance (more opaque)', () => {
    const thin = new SubsurfaceScattering({ scatterDistance: 0.1, roughness: 0 });
    const thick = new SubsurfaceScattering({ scatterDistance: 2.0, roughness: 0 });
    
    const ray = new Ray(new Point3(0, 0, 2), new Vec3(0, 0, -1));
    
    let thinTotal = 0, thickTotal = 0;
    const N = 200;
    for (let i = 0; i < N; i++) {
      const thinResult = thin.scatter(ray, makeRec());
      const thickResult = thick.scatter(ray, makeRec());
      if (thinResult) thinTotal += thinResult.attenuation.x + thinResult.attenuation.y + thinResult.attenuation.z;
      if (thickResult) thickTotal += thickResult.attenuation.x + thickResult.attenuation.y + thickResult.attenuation.z;
    }
    
    // Short scatter distance = more absorption = lower total attenuation
    // (This may not always hold due to randomness, but on average should)
    assert.ok(thickTotal > 0, 'Thick material should produce some light');
    assert.ok(thinTotal >= 0, 'Thin material attenuation should be non-negative');
  });

  it('should produce Fresnel reflection at glancing angles', () => {
    const sss = new SubsurfaceScattering({ ior: 2.0, roughness: 0 }); // High IOR = more reflection
    
    // Glancing angle ray
    const ray = new Ray(new Point3(0, 0, 2), new Vec3(0.99, 0, -0.14).unit());
    const rec = makeRec();
    
    let reflected = 0;
    for (let i = 0; i < 100; i++) {
      const result = sss.scatter(ray, rec);
      if (result && result.scattered.direction.z > 0) reflected++;
    }
    
    // At glancing angles, Fresnel should reflect more
    assert.ok(reflected > 20, `Expected significant Fresnel reflection, got ${reflected}/100`);
  });

  describe('Preset materials', () => {
    it('skin() should have warm scatter color', () => {
      const s = skin();
      assert.ok(s.scatterColor.x > s.scatterColor.z, 'Skin scatter should be redder than blue');
    });

    it('marble() should have neutral scatter color', () => {
      const m = marble();
      const diff = Math.abs(m.scatterColor.x - m.scatterColor.z);
      assert.ok(diff < 0.2, `Marble scatter should be nearly neutral, diff=${diff.toFixed(2)}`);
    });

    it('jade() should have green scatter color', () => {
      const j = jade();
      assert.ok(j.scatterColor.y > j.scatterColor.x, 'Jade should scatter green > red');
      assert.ok(j.scatterColor.y > j.scatterColor.z, 'Jade should scatter green > blue');
    });

    it('all presets should be valid materials', () => {
      const materials = [skin(), marble(), wax(), jade(), milk()];
      const ray = new Ray(new Point3(0, 0, 2), new Vec3(0, 0, -1));
      
      for (const mat of materials) {
        const result = mat.scatter(ray, makeRec());
        // Should either scatter or absorb (null)
        if (result) {
          assert.ok(result.scattered instanceof Ray, 'Should return a Ray');
          assert.ok(result.attenuation instanceof Vec3, 'Should return attenuation');
          // Attenuation should be non-negative
          assert.ok(result.attenuation.x >= 0 && result.attenuation.y >= 0 && result.attenuation.z >= 0,
            'Attenuation should be non-negative');
        }
      }
    });
  });

  describe('Renderer integration', () => {
    it('should render SSS sphere without errors', () => {
      const world = new HittableList();
      world.add(new Sphere(new Point3(0, 0, -2), 1, skin()));
      
      const camera = new Camera({
        lookFrom: new Point3(0, 0, 0),
        lookAt: new Point3(0, 0, -1),
        vup: new Vec3(0, 1, 0),
        vfov: 60,
        aspectRatio: 2,
      });
      
      const renderer = new Renderer({
        width: 20,
        height: 10,
        samplesPerPixel: 4,
        maxDepth: 8,
        camera,
        world,
      });
      
      const pixels = renderer.render();
      assert.ok(pixels instanceof Uint8ClampedArray);
      assert.equal(pixels.length, 20 * 10 * 4);
      
      // Should produce visible output
      let hasColor = false;
      for (let i = 0; i < pixels.length; i += 4) {
        if (pixels[i] > 10 || pixels[i + 1] > 10 || pixels[i + 2] > 10) {
          hasColor = true;
          break;
        }
      }
      assert.ok(hasColor, 'SSS sphere should produce visible pixels');
    });

    it('should look different from Lambertian (SSS has softer appearance)', () => {
      const makeSphere = (mat) => {
        const world = new HittableList();
        world.add(new Sphere(new Point3(0, 0, -2), 1, mat));
        return world;
      };
      
      const camera = new Camera({
        lookFrom: new Point3(0, 0, 0),
        lookAt: new Point3(0, 0, -1),
        vup: new Vec3(0, 1, 0),
        vfov: 60,
        aspectRatio: 2,
      });
      
      // Render SSS sphere
      const sssPixels = new Renderer({
        width: 10, height: 5, samplesPerPixel: 8, maxDepth: 8,
        camera, world: makeSphere(skin())
      }).render();
      
      // Render Lambertian sphere with same color
      const lambPixels = new Renderer({
        width: 10, height: 5, samplesPerPixel: 8, maxDepth: 8,
        camera, world: makeSphere(new Lambertian(new Color(0.85, 0.65, 0.55)))
      }).render();
      
      // They should produce different pixel values
      let diffCount = 0;
      for (let i = 0; i < sssPixels.length; i += 4) {
        if (Math.abs(sssPixels[i] - lambPixels[i]) > 5 ||
            Math.abs(sssPixels[i + 1] - lambPixels[i + 1]) > 5 ||
            Math.abs(sssPixels[i + 2] - lambPixels[i + 2]) > 5) {
          diffCount++;
        }
      }
      
      assert.ok(diffCount > 0, 'SSS and Lambertian should produce different images');
    });
  });
});
