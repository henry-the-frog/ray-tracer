// dispersion.js — Dispersive glass material
// Physically-based chromatic dispersion through wavelength-dependent refraction
//
// How it works:
//   1. Each ray sample picks a random wavelength from the visible spectrum
//   2. The IOR for that wavelength is computed via Cauchy's equation
//   3. The ray refracts at this wavelength-specific angle
//   4. The attenuation is the spectral color of that wavelength
//   5. Over many samples, white light naturally splits into a rainbow
//
// This is physically correct Monte Carlo spectral rendering — each sample
// carries one wavelength, and the RGB image emerges from averaging.

import { Color, Vec3 } from './vec3.js';
import { Ray } from './ray.js';
import { wavelengthToRGB, cauchyIOR, randomWavelength, GLASS_TYPES } from './spectral.js';

export class DispersiveGlass {
  /**
   * @param {object} options
   * @param {number} options.nd - Index of refraction at d-line (587.6nm, yellow). Default: 1.5
   * @param {number} options.abbeNumber - Abbe number (lower = more dispersion). Default: 40
   * @param {string} options.glassType - Preset from GLASS_TYPES (overrides nd/abbeNumber)
   * @param {Color}  options.tint - Optional tint color for absorption
   * @param {number} options.density - Absorption density for tinted glass
   */
  constructor({
    nd = 1.5,
    abbeNumber = 40,
    glassType = null,
    tint = null,
    density = 0
  } = {}) {
    if (glassType && GLASS_TYPES[glassType]) {
      const gt = GLASS_TYPES[glassType];
      this.A = gt.A;
      this.B = gt.B;
      this.nd = gt.nd;
      this.abbeNumber = gt.Vd;
    } else {
      // Derive Cauchy coefficients from nd and Abbe number
      const lambdaF = 486.1, lambdaC = 656.3, lambdaD = 587.6;
      const deltaN = (nd - 1) / abbeNumber;
      this.B = deltaN / (1 / (lambdaF * lambdaF) - 1 / (lambdaC * lambdaC));
      this.A = nd - this.B / (lambdaD * lambdaD);
      this.nd = nd;
      this.abbeNumber = abbeNumber;
    }

    this.tint = tint;
    this.density = density;
  }

  scatter(rayIn, rec) {
    // Pick a random wavelength for this sample
    const wavelength = randomWavelength();
    
    // Compute wavelength-dependent IOR
    const ior = cauchyIOR(wavelength, this.A, this.B);
    
    const refractionRatio = rec.frontFace ? (1.0 / ior) : ior;
    const unitDirection = rayIn.direction.unit();
    const cosTheta = Math.min(unitDirection.negate().dot(rec.normal), 1.0);
    const sinTheta = Math.sqrt(1.0 - cosTheta * cosTheta);

    const cannotRefract = refractionRatio * sinTheta > 1.0;
    let direction;

    if (cannotRefract || this._reflectance(cosTheta, refractionRatio) > Math.random()) {
      // Total internal reflection or Fresnel reflection
      direction = unitDirection.reflect(rec.normal);
      // Reflected light keeps its spectral color
      return {
        scattered: new Ray(rec.p, direction),
        attenuation: wavelengthToRGB(wavelength)
      };
    } else {
      // Refract with wavelength-specific angle
      direction = unitDirection.refract(rec.normal, refractionRatio);
      
      // Base attenuation is the spectral color
      let attenuation = wavelengthToRGB(wavelength);
      
      // Apply tint absorption (Beer-Lambert) for exiting rays
      if (this.tint && this.density > 0 && !rec.frontFace) {
        attenuation = new Color(
          attenuation.x * Math.exp(-this.density * (1 - this.tint.x) * rec.t),
          attenuation.y * Math.exp(-this.density * (1 - this.tint.y) * rec.t),
          attenuation.z * Math.exp(-this.density * (1 - this.tint.z) * rec.t)
        );
      }
      
      // Scale by the number of wavelengths to maintain energy conservation.
      // Since we're sampling uniformly from the visible spectrum and each
      // sample only contributes one color channel's worth of energy,
      // we multiply by the spectral range factor. The factor of 3 accounts
      // for the fact that we're approximating 3-channel RGB with single
      // wavelength samples — without it, dispersive objects would appear
      // 3× darker than regular glass.
      attenuation = attenuation.mul(3);
      
      return {
        scattered: new Ray(rec.p, direction),
        attenuation
      };
    }
  }

  // Schlick's approximation for reflectance
  _reflectance(cosine, refIdx) {
    let r0 = (1 - refIdx) / (1 + refIdx);
    r0 = r0 * r0;
    return r0 + (1 - r0) * Math.pow(1 - cosine, 5);
  }

  /**
   * Get the IOR at a specific wavelength
   * @param {number} wavelength - nm
   * @returns {number}
   */
  iorAt(wavelength) {
    return cauchyIOR(wavelength, this.A, this.B);
  }
}

/**
 * Factory functions for common dispersive materials
 */
export function crownGlass() {
  return new DispersiveGlass({ glassType: 'CROWN' });
}

export function flintGlass() {
  return new DispersiveGlass({ glassType: 'FLINT' });
}

export function heavyFlintGlass() {
  return new DispersiveGlass({ glassType: 'HEAVY_FLINT' });
}

export function diamond() {
  return new DispersiveGlass({ glassType: 'DIAMOND' });
}

export function prismGlass() {
  // Heavy flint glass — maximum dispersion for dramatic rainbow effects
  return new DispersiveGlass({ glassType: 'HEAVY_FLINT' });
}
