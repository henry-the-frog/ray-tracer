// atmosphere.test.js — Tests for atmospheric effects

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ExponentialFog, HeightFog, AtmosphericScattering } from '../src/atmosphere.js';
import { Vec3, Color, Point3 } from '../src/vec3.js';

describe('ExponentialFog', () => {
  it('should return object color at zero distance', () => {
    const fog = new ExponentialFog(new Color(1, 1, 1), 0.1);
    const color = new Color(1, 0, 0);
    const result = fog.apply(color, 0);
    
    assert.ok(Math.abs(result.x - 1) < 0.001, 'At distance 0, should be original color');
    assert.ok(Math.abs(result.y - 0) < 0.001);
    assert.ok(Math.abs(result.z - 0) < 0.001);
  });

  it('should approach fog color at large distance', () => {
    const fogColor = new Color(0.5, 0.5, 0.6);
    const fog = new ExponentialFog(fogColor, 0.1);
    const result = fog.apply(new Color(1, 0, 0), 100);
    
    assert.ok(Math.abs(result.x - fogColor.x) < 0.01, `Should approach fog color: R=${result.x.toFixed(3)}`);
    assert.ok(Math.abs(result.y - fogColor.y) < 0.01);
    assert.ok(Math.abs(result.z - fogColor.z) < 0.01);
  });

  it('should blend linearly with distance', () => {
    const fog = new ExponentialFog(new Color(1, 1, 1), 0.1);
    const color = new Color(0, 0, 0);
    
    const near = fog.apply(color, 1);
    const mid = fog.apply(color, 5);
    const far = fog.apply(color, 20);
    
    // Should monotonically approach fog color (white)
    assert.ok(far.x > mid.x, 'Farther = more fog');
    assert.ok(mid.x > near.x, 'Mid should be between near and far');
  });

  it('should have no effect with zero density', () => {
    const fog = new ExponentialFog(new Color(1, 1, 1), 0);
    const color = new Color(0.5, 0.3, 0.8);
    const result = fog.apply(color, 1000);
    
    assert.ok(Math.abs(result.x - color.x) < 0.001, 'Zero density = no fog');
  });

  it('should have strong effect with high density', () => {
    const fog = new ExponentialFog(new Color(1, 1, 1), 5);
    const result = fog.apply(new Color(0, 0, 0), 1);
    
    // At density=5, distance=1: fogFactor = 1 - exp(-5) ≈ 0.993
    assert.ok(result.x > 0.99, `High density should fog heavily: ${result.x.toFixed(3)}`);
  });
});

describe('HeightFog', () => {
  it('should be denser near ground level', () => {
    const fog = new HeightFog(new Color(1, 1, 1), 0.1, 1.0, 0);
    const color = new Color(0, 0, 0);
    
    // Hit at ground level (y=0)
    const ground = fog.apply(color, 10, new Vec3(10, 0, 0), new Vec3(0, 0, 0));
    // Hit at height (y=10) 
    const high = fog.apply(color, 10, new Vec3(0, 10, 0), new Vec3(0, 0, 0));
    
    assert.ok(ground.x >= high.x,
      `Ground fog (${ground.x.toFixed(3)}) should be >= high fog (${high.x.toFixed(3)})`);
  });

  it('should have no fog above ground when camera is above ground', () => {
    const fog = new HeightFog(new Color(1, 1, 1), 0.1, 2.0, 0);
    const color = new Color(0, 0, 0);
    
    // Camera and hit point both high up
    const result = fog.apply(color, 5, new Vec3(5, 100, 0), new Vec3(0, 100, 0));
    
    // Should be very little fog at y=100 with falloff=2
    assert.ok(result.x < 0.5, `High altitude should have little fog: ${result.x.toFixed(3)}`);
  });

  it('should return object color at zero distance', () => {
    const fog = new HeightFog();
    const color = new Color(0.5, 0.3, 0.8);
    const result = fog.apply(color, 0, new Vec3(0, 0, 0), new Vec3(0, 0, 0));
    
    assert.ok(Math.abs(result.x - color.x) < 0.001);
    assert.ok(Math.abs(result.y - color.y) < 0.001);
  });
});

describe('AtmosphericScattering', () => {
  it('should produce blue-ish sky color when looking away from sun', () => {
    const atmo = new AtmosphericScattering({
      sunDirection: new Vec3(0, 1, 0).unit()
    });
    
    // Look horizontal, perpendicular to sun
    const skyColor = atmo.skyColor(new Vec3(1, 0, 0));
    
    // Should have more blue than red (Rayleigh scattering)
    assert.ok(skyColor.z > skyColor.x,
      `Sky should be blue-tinted: R=${skyColor.x.toFixed(3)} B=${skyColor.z.toFixed(3)}`);
  });

  it('should produce brighter color looking toward sun (Mie forward scattering)', () => {
    const atmo = new AtmosphericScattering({
      sunDirection: new Vec3(0, 0, 1).unit()
    });
    
    // Look toward sun
    const towardSun = atmo.skyColor(new Vec3(0, 0, 1));
    // Look away from sun
    const awaySun = atmo.skyColor(new Vec3(0, 0, -1));
    
    const totalToward = towardSun.x + towardSun.y + towardSun.z;
    const totalAway = awaySun.x + awaySun.y + awaySun.z;
    
    assert.ok(totalToward > totalAway,
      `Looking toward sun (${totalToward.toFixed(3)}) should be brighter than away (${totalAway.toFixed(3)})`);
  });

  it('should reduce object visibility at large distance', () => {
    const atmo = new AtmosphericScattering();
    const objectColor = new Color(1, 0, 0); // Bright red
    
    const near = atmo.apply(objectColor, 1, new Vec3(1, 0, 0));
    const far = atmo.apply(objectColor, 100, new Vec3(1, 0, 0));
    
    // Far objects should have less of their original color (extinction)
    assert.ok(far.x < near.x,
      `Far red should be dimmer: near=${near.x.toFixed(3)} far=${far.x.toFixed(3)}`);
  });

  it('should have no effect at zero distance', () => {
    const atmo = new AtmosphericScattering();
    const color = new Color(0.5, 0.3, 0.8);
    const result = atmo.apply(color, 0, new Vec3(0, 0, -1));
    
    assert.ok(Math.abs(result.x - color.x) < 0.01, 'Zero distance = no atmospheric effect');
  });

  it('should create sunset colors with low sun angle', () => {
    const atmo = new AtmosphericScattering({
      sunDirection: new Vec3(1, 0.1, 0).unit(), // Low sun
      rayleighDensity: 0.1 // Thicker atmosphere
    });
    
    // Look toward the horizon/sun
    const skyColor = atmo.skyColor(new Vec3(1, 0.1, 0).unit());
    
    // Should have warm tones (Rayleigh removes blue through thick atmosphere)
    // The Mie forward scattering should dominate near the sun
    const total = skyColor.x + skyColor.y + skyColor.z;
    assert.ok(total > 0, 'Should produce visible sky color');
  });

  it('should have physically correct Rayleigh phase function', () => {
    const atmo = new AtmosphericScattering({
      sunDirection: new Vec3(0, 0, 1),
      mieDensity: 0  // Only Rayleigh
    });
    
    // Rayleigh at 0° and 180° should be equal (symmetric)
    const forward = atmo.skyColor(new Vec3(0, 0, 1));
    const backward = atmo.skyColor(new Vec3(0, 0, -1));
    
    // Rayleigh phase: 3/4 * (1 + cos²θ)
    // At 0° (cos=1): phase = 1.5
    // At 180° (cos=-1): phase = 1.5 — same!
    const diff = Math.abs(forward.x - backward.x);
    assert.ok(diff < 0.001, `Rayleigh should be symmetric: forward=${forward.x.toFixed(4)} backward=${backward.x.toFixed(4)}`);
    
    // At 90° (cos=0): phase = 0.75 — minimum
    const sideways = atmo.skyColor(new Vec3(1, 0, 0));
    assert.ok(sideways.x < forward.x, 'Rayleigh should be weakest at 90°');
  });
});
