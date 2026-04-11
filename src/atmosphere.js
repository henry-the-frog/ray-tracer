// atmosphere.js — Atmospheric effects: fog, haze, and volumetric scattering
// 
// These are post-process-style effects applied at the renderer level:
// blend object color with fog color based on distance.
//
// Types:
// 1. ExponentialFog — classic distance-based fog
// 2. HeightFog — fog that's denser near the ground
// 3. AtmosphericScattering — Rayleigh/Mie scattering for outdoor scenes

import { Color, Vec3 } from './vec3.js';

/**
 * Exponential distance fog.
 * fogFactor = 1 - exp(-density * distance)
 * Blend: finalColor = objectColor * (1 - fogFactor) + fogColor * fogFactor
 */
export class ExponentialFog {
  /**
   * @param {Color} color - Fog color (usually white or light grey)
   * @param {number} density - Fog density (higher = thicker). Typical: 0.01-0.5
   */
  constructor(color = new Color(0.7, 0.7, 0.8), density = 0.1) {
    this.color = color;
    this.density = density;
  }

  /**
   * Apply fog to a color based on distance
   * @param {Color} objectColor - Original color
   * @param {number} distance - Distance from camera
   * @returns {Color} - Fogged color
   */
  apply(objectColor, distance) {
    const fogFactor = 1 - Math.exp(-this.density * distance);
    return new Color(
      objectColor.x * (1 - fogFactor) + this.color.x * fogFactor,
      objectColor.y * (1 - fogFactor) + this.color.y * fogFactor,
      objectColor.z * (1 - fogFactor) + this.color.z * fogFactor
    );
  }
}

/**
 * Height-based exponential fog.
 * Denser near the ground, thins out with altitude.
 * Useful for valley/ground fog effects.
 */
export class HeightFog {
  /**
   * @param {Color} color - Fog color
   * @param {number} density - Base density at ground level
   * @param {number} falloff - How quickly fog thins with height. Higher = thinner at altitude.
   * @param {number} groundLevel - Y-coordinate of the ground
   */
  constructor(color = new Color(0.8, 0.8, 0.85), density = 0.1, falloff = 0.5, groundLevel = 0) {
    this.color = color;
    this.density = density;
    this.falloff = falloff;
    this.groundLevel = groundLevel;
  }

  /**
   * Apply height fog to a color
   * @param {Color} objectColor - Original color
   * @param {number} distance - Distance from camera
   * @param {Vec3} hitPoint - World-space hit point
   * @param {Vec3} cameraPos - Camera position
   * @returns {Color} - Fogged color
   */
  apply(objectColor, distance, hitPoint, cameraPos) {
    // Integrate fog density along the ray
    // For a ray from cameraPos to hitPoint, the fog density varies with height
    const heightStart = cameraPos.y - this.groundLevel;
    const heightEnd = hitPoint.y - this.groundLevel;
    
    // Analytical integral of exp(-falloff * h) from heightStart to heightEnd
    let fogAmount;
    if (Math.abs(this.falloff) < 0.001) {
      // Near-zero falloff: uniform fog
      fogAmount = this.density * distance;
    } else {
      const h0 = Math.max(heightStart, 0);
      const h1 = Math.max(heightEnd, 0);
      
      // Average height-dependent density along ray
      const avgDensity = this.density * (
        Math.exp(-this.falloff * Math.min(h0, h1))
      );
      fogAmount = avgDensity * distance;
    }
    
    const fogFactor = 1 - Math.exp(-fogAmount);
    return new Color(
      objectColor.x * (1 - fogFactor) + this.color.x * fogFactor,
      objectColor.y * (1 - fogFactor) + this.color.y * fogFactor,
      objectColor.z * (1 - fogFactor) + this.color.z * fogFactor
    );
  }
}

/**
 * Rayleigh + Mie atmospheric scattering.
 * Creates realistic sky coloring: blue sky, orange sunsets, aerial perspective.
 * 
 * Rayleigh: scatters short wavelengths (blue) more → blue sky
 * Mie: forward-scattering → sun halo/glow
 */
export class AtmosphericScattering {
  /**
   * @param {Vec3} sunDirection - Direction TO the sun (normalized)
   * @param {Color} sunColor - Sun color/intensity
   * @param {number} rayleighDensity - Rayleigh scattering coefficient
   * @param {number} mieDensity - Mie scattering coefficient
   * @param {number} mieAnisotropy - Mie anisotropy factor (0-1, higher = more forward scattering)
   * @param {Color} rayleighColor - Wavelength-dependent Rayleigh coefficients
   */
  constructor({
    sunDirection = new Vec3(0, 1, 0.5).unit(),
    sunColor = new Color(1.5, 1.2, 0.9),
    rayleighDensity = 0.05,
    mieDensity = 0.01,
    mieAnisotropy = 0.76,
    rayleighColor = new Color(0.27, 0.51, 1.0) // Blue scatters more (λ⁻⁴ for R,G,B)
  } = {}) {
    this.sunDirection = sunDirection;
    this.sunColor = sunColor;
    this.rayleighDensity = rayleighDensity;
    this.mieDensity = mieDensity;
    this.mieAnisotropy = mieAnisotropy;
    this.rayleighColor = rayleighColor;
  }

  /**
   * Compute in-scattered light for a ray direction (skybox contribution)
   * @param {Vec3} rayDir - Ray direction (normalized)
   * @returns {Color} - Sky color from scattering
   */
  skyColor(rayDir) {
    const dir = rayDir.unit();
    const cosAngle = dir.dot(this.sunDirection);
    
    // Rayleigh phase function: (3/4)(1 + cos²θ)
    const rayleighPhase = 0.75 * (1 + cosAngle * cosAngle);
    
    // Mie phase function (Henyey-Greenstein): 
    // (1 - g²) / (4π(1 + g² - 2g·cosθ)^(3/2))
    const g = this.mieAnisotropy;
    const mieDenom = 1 + g * g - 2 * g * cosAngle;
    const miePhase = (1 - g * g) / (4 * Math.PI * Math.pow(mieDenom, 1.5));
    
    // Combine scattering
    const rayleigh = new Color(
      this.rayleighColor.x * rayleighPhase * this.rayleighDensity,
      this.rayleighColor.y * rayleighPhase * this.rayleighDensity,
      this.rayleighColor.z * rayleighPhase * this.rayleighDensity
    );
    
    const mie = this.sunColor.mul(miePhase * this.mieDensity);
    
    // Combine and multiply by sun
    return new Color(
      (rayleigh.x + mie.x) * this.sunColor.x,
      (rayleigh.y + mie.y) * this.sunColor.y,
      (rayleigh.z + mie.z) * this.sunColor.z
    );
  }

  /**
   * Apply atmospheric scattering to an object color at a given distance
   * @param {Color} objectColor - Original color
   * @param {number} distance - Distance from camera
   * @param {Vec3} rayDir - Ray direction
   * @returns {Color} - Color with atmospheric effects
   */
  apply(objectColor, distance, rayDir) {
    // Extinction: how much original light is absorbed/scattered away
    const extinction = new Color(
      Math.exp(-this.rayleighColor.x * this.rayleighDensity * distance - this.mieDensity * distance),
      Math.exp(-this.rayleighColor.y * this.rayleighDensity * distance - this.mieDensity * distance),
      Math.exp(-this.rayleighColor.z * this.rayleighDensity * distance - this.mieDensity * distance)
    );
    
    // In-scattered light (from atmosphere)
    const inScatter = this.skyColor(rayDir);
    const scatterAmount = 1 - (extinction.x + extinction.y + extinction.z) / 3;
    
    return new Color(
      objectColor.x * extinction.x + inScatter.x * scatterAmount,
      objectColor.y * extinction.y + inScatter.y * scatterAmount,
      objectColor.z * extinction.z + inScatter.z * scatterAmount
    );
  }
}
