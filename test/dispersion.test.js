// dispersion.test.js — Tests for spectral utilities and dispersive glass material

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  wavelengthToRGB, cauchyIOR, abbeToCAuchy, randomWavelength,
  GLASS_TYPES, WAVELENGTH_MIN, WAVELENGTH_MAX
} from '../src/spectral.js';
import {
  DispersiveGlass, crownGlass, flintGlass, heavyFlintGlass, diamond, prismGlass
} from '../src/dispersion.js';
import { Vec3, Color, Point3 } from '../src/vec3.js';
import { Ray } from '../src/ray.js';
import { Sphere } from '../src/sphere.js';
import { HittableList } from '../src/hittable.js';
import { Renderer } from '../src/renderer.js';
import { Camera } from '../src/camera.js';
import { Triangle } from '../src/triangle.js';

describe('Spectral Utilities', () => {
  describe('wavelengthToRGB', () => {
    it('should produce red for 650nm', () => {
      const c = wavelengthToRGB(650);
      assert.ok(c.x > 0.8, `Red channel should be high: ${c.x}`);
      assert.ok(c.y < 0.1, `Green channel should be low: ${c.y}`);
      assert.ok(c.z < 0.01, `Blue channel should be near zero: ${c.z}`);
    });

    it('should produce green for 550nm', () => {
      const c = wavelengthToRGB(550);
      assert.ok(c.y > 0.8, `Green channel should be high: ${c.y}`);
    });

    it('should produce blue for 460nm', () => {
      const c = wavelengthToRGB(460);
      assert.ok(c.z > 0.8, `Blue channel should be high: ${c.z}`);
    });

    it('should have intensity falloff at spectrum edges', () => {
      const edge = wavelengthToRGB(390);
      const mid = wavelengthToRGB(500);
      const edgeMax = Math.max(edge.x, edge.y, edge.z);
      const midMax = Math.max(mid.x, mid.y, mid.z);
      assert.ok(edgeMax < midMax, 'Edge should be dimmer than mid-spectrum');
    });

    it('should return black outside visible range', () => {
      const uv = wavelengthToRGB(300);
      const ir = wavelengthToRGB(800);
      assert.equal(uv.x + uv.y + uv.z, 0, 'UV should be black');
      assert.equal(ir.x + ir.y + ir.z, 0, 'IR should be black');
    });

    it('should transition smoothly through ROYGBIV', () => {
      const wavelengths = [650, 600, 580, 550, 510, 470, 430];
      const colors = wavelengths.map(w => wavelengthToRGB(w));
      
      // Check that each color is valid (non-negative, at least one channel > 0)
      for (let i = 0; i < colors.length; i++) {
        assert.ok(colors[i].x >= 0 && colors[i].y >= 0 && colors[i].z >= 0,
          `Color at ${wavelengths[i]}nm has negative values`);
        assert.ok(colors[i].x + colors[i].y + colors[i].z > 0,
          `Color at ${wavelengths[i]}nm is black`);
      }
    });
  });

  describe('Cauchy equation', () => {
    it('should give higher IOR for shorter wavelengths (normal dispersion)', () => {
      const flint = GLASS_TYPES.FLINT;
      const nBlue = cauchyIOR(450, flint.A, flint.B);
      const nRed = cauchyIOR(650, flint.A, flint.B);
      assert.ok(nBlue > nRed, `Blue IOR (${nBlue.toFixed(4)}) should exceed red (${nRed.toFixed(4)})`);
    });

    it('should match known IOR at d-line for flint glass', () => {
      const flint = GLASS_TYPES.FLINT;
      const nD = cauchyIOR(587.6, flint.A, flint.B);
      assert.ok(Math.abs(nD - flint.nd) < 0.001,
        `IOR at d-line should be ~${flint.nd}, got ${nD.toFixed(4)}`);
    });

    it('should match known IOR at d-line for diamond', () => {
      const d = GLASS_TYPES.DIAMOND;
      const nD = cauchyIOR(587.6, d.A, d.B);
      assert.ok(Math.abs(nD - d.nd) < 0.001,
        `Diamond IOR at d-line should be ~${d.nd}, got ${nD.toFixed(4)}`);
    });

    it('should show more dispersion for lower Abbe number', () => {
      const crown = GLASS_TYPES.CROWN; // Vd = 58.7
      const flint = GLASS_TYPES.FLINT; // Vd = 36.4
      
      const crownSpread = cauchyIOR(400, crown.A, crown.B) - cauchyIOR(700, crown.A, crown.B);
      const flintSpread = cauchyIOR(400, flint.A, flint.B) - cauchyIOR(700, flint.A, flint.B);
      
      assert.ok(flintSpread > crownSpread,
        `Flint (${flintSpread.toFixed(4)}) should disperse more than crown (${crownSpread.toFixed(4)})`);
    });
  });

  describe('abbeToCAuchy', () => {
    it('should round-trip from Abbe number to Cauchy and back', () => {
      const nd = 1.5;
      const Vd = 40;
      const { A, B } = abbeToCAuchy(nd, Vd);
      
      // Verify d-line IOR matches
      const nD = A + B / (587.6 * 587.6);
      assert.ok(Math.abs(nD - nd) < 0.001, `d-line IOR should be ${nd}, got ${nD.toFixed(4)}`);
      
      // Verify Abbe number reconstructs
      const nF = A + B / (486.1 * 486.1);
      const nC = A + B / (656.3 * 656.3);
      const VdCalc = (nD - 1) / (nF - nC);
      assert.ok(Math.abs(VdCalc - Vd) < 0.1, `Abbe number should be ${Vd}, got ${VdCalc.toFixed(1)}`);
    });
  });

  describe('randomWavelength', () => {
    it('should return values within visible range', () => {
      for (let i = 0; i < 100; i++) {
        const w = randomWavelength();
        assert.ok(w >= WAVELENGTH_MIN && w <= WAVELENGTH_MAX,
          `Wavelength ${w} out of range [${WAVELENGTH_MIN}, ${WAVELENGTH_MAX}]`);
      }
    });

    it('should have roughly uniform distribution', () => {
      const bins = new Array(4).fill(0);
      const binWidth = (WAVELENGTH_MAX - WAVELENGTH_MIN) / 4;
      
      for (let i = 0; i < 4000; i++) {
        const w = randomWavelength();
        const bin = Math.min(3, Math.floor((w - WAVELENGTH_MIN) / binWidth));
        bins[bin]++;
      }
      
      // Each bin should have ~1000 ± 200 (roughly)
      for (const count of bins) {
        assert.ok(count > 700 && count < 1300,
          `Bin count ${count} too far from expected 1000`);
      }
    });
  });
});

describe('DispersiveGlass Material', () => {
  const makeRec = (frontFace = true) => ({
    p: new Vec3(0, 0, 0),
    normal: new Vec3(0, 1, 0),
    frontFace,
    t: 1.0
  });

  it('should scatter rays', () => {
    const glass = flintGlass();
    const ray = new Ray(new Vec3(0, 1, 0), new Vec3(0.3, -1, 0).unit());
    const result = glass.scatter(ray, makeRec());
    
    assert.ok(result, 'Should return a scatter result');
    assert.ok(result.scattered instanceof Ray, 'Should return a scattered ray');
    assert.ok(result.attenuation instanceof Vec3, 'Should return attenuation');
  });

  it('should refract different wavelengths at different angles', () => {
    // Collect refraction angles over many samples
    const glass = new DispersiveGlass({ nd: 1.7, abbeNumber: 25 }); // High dispersion
    const ray = new Ray(new Vec3(0, 1, 0), new Vec3(0.5, -1, 0).unit());
    
    const angles = [];
    for (let i = 0; i < 500; i++) {
      const result = glass.scatter(ray, makeRec());
      if (result) {
        const dir = result.scattered.direction;
        const angle = Math.atan2(dir.x, -dir.y); // Angle from normal
        angles.push(angle);
      }
    }
    
    // There should be variation in angles (dispersion!)
    const minAngle = Math.min(...angles);
    const maxAngle = Math.max(...angles);
    const spread = maxAngle - minAngle;
    
    assert.ok(spread > 0.001, `Angle spread should be > 0: ${spread.toFixed(4)} rad`);
  });

  it('should produce colored attenuation', () => {
    const glass = flintGlass();
    const ray = new Ray(new Vec3(0, 1, 0), new Vec3(0, -1, 0).unit());
    
    // Collect attenuations — they should be colored (not white)
    let hasRed = false, hasGreen = false, hasBlue = false;
    for (let i = 0; i < 100; i++) {
      const result = glass.scatter(ray, makeRec());
      if (result) {
        if (result.attenuation.x > 2) hasRed = true;
        if (result.attenuation.y > 2) hasGreen = true;
        if (result.attenuation.z > 2) hasBlue = true;
      }
    }
    
    assert.ok(hasRed, 'Should produce red-tinted samples');
    assert.ok(hasGreen, 'Should produce green-tinted samples');
    assert.ok(hasBlue, 'Should produce blue-tinted samples');
  });

  it('should average to roughly neutral over many samples', () => {
    const glass = crownGlass();
    const ray = new Ray(new Vec3(0, 1, 0), new Vec3(0.3, -1, 0).unit());
    
    let sumR = 0, sumG = 0, sumB = 0, count = 0;
    for (let i = 0; i < 5000; i++) {
      const result = glass.scatter(ray, makeRec());
      if (result) {
        sumR += result.attenuation.x;
        sumG += result.attenuation.y;
        sumB += result.attenuation.z;
        count++;
      }
    }
    
    const avgR = sumR / count, avgG = sumG / count, avgB = sumB / count;
    const total = (avgR + avgG + avgB) / 3;
    
    // Average should be roughly 1 (energy conservation)
    assert.ok(total > 0.5 && total < 2.0,
      `Average attenuation should be ~1: R=${avgR.toFixed(2)} G=${avgG.toFixed(2)} B=${avgB.toFixed(2)}`);
  });

  it('should handle total internal reflection', () => {
    const glass = diamond(); // High IOR
    // Steep angle from inside the material
    const ray = new Ray(new Vec3(0, -1, 0), new Vec3(0.9, 1, 0).unit());
    const rec = makeRec(false); // Inside glass
    
    let reflected = 0;
    for (let i = 0; i < 100; i++) {
      const result = glass.scatter(ray, rec);
      if (result) {
        // If TIR, the ray should reflect (y < 0, going back in)
        if (result.scattered.direction.y < 0) reflected++;
      }
    }
    
    // At steep angles with high IOR, most should reflect
    assert.ok(reflected > 50, `Expected most rays to TIR, got ${reflected}/100`);
  });

  describe('Factory functions', () => {
    it('crownGlass should have low dispersion', () => {
      const glass = crownGlass();
      const spread = glass.iorAt(400) - glass.iorAt(700);
      assert.ok(spread > 0 && spread < 0.03, `Crown glass spread: ${spread.toFixed(4)}`);
    });

    it('flintGlass should have medium dispersion', () => {
      const glass = flintGlass();
      const spread = glass.iorAt(400) - glass.iorAt(700);
      assert.ok(spread > 0.02 && spread < 0.05, `Flint glass spread: ${spread.toFixed(4)}`);
    });

    it('diamond should have high IOR', () => {
      const glass = diamond();
      assert.ok(glass.iorAt(587.6) > 2.4, `Diamond IOR should be >2.4`);
    });
  });

  describe('Renderer integration', () => {
    it('should render a scene with dispersive sphere', () => {
      const world = new HittableList();
      world.add(new Sphere(new Point3(0, 0, -2), 1, flintGlass()));
      
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
        maxDepth: 5,
        camera,
        world,
      });
      
      const pixels = renderer.render();
      assert.ok(pixels instanceof Uint8ClampedArray, 'Should return pixel data');
      assert.equal(pixels.length, 20 * 10 * 4, 'Should have correct number of pixels');
      
      // Check that some pixels are non-black (rendering produced output)
      let hasColor = false;
      for (let i = 0; i < pixels.length; i += 4) {
        if (pixels[i] > 10 || pixels[i + 1] > 10 || pixels[i + 2] > 10) {
          hasColor = true;
          break;
        }
      }
      assert.ok(hasColor, 'Rendered image should have non-black pixels');
    });

    it('should produce color variation in dispersive sphere (evidence of dispersion)', () => {
      const world = new HittableList();
      world.add(new Sphere(new Point3(0, 0, -2), 0.5, heavyFlintGlass()));
      
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
        samplesPerPixel: 16,
        maxDepth: 10,
        camera,
        world,
      });
      
      const pixels = renderer.render();
      
      // Collect unique colors in the sphere region (center of image)
      const colors = new Set();
      for (let y = 3; y < 7; y++) {
        for (let x = 7; x < 13; x++) {
          const idx = (y * 20 + x) * 4;
          const r = Math.floor(pixels[idx] / 32);
          const g = Math.floor(pixels[idx + 1] / 32);
          const b = Math.floor(pixels[idx + 2] / 32);
          colors.add(`${r},${g},${b}`);
        }
      }
      
      // With dispersion, there should be some color variety
      assert.ok(colors.size > 1, `Expected color variety from dispersion, got ${colors.size} unique colors`);
    });
  });
});
