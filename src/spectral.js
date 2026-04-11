// spectral.js — Spectral rendering utilities for dispersion
// Converts between wavelengths (nm) and RGB colors for physically-based dispersion

import { Color } from './vec3.js';

// Visible spectrum range (nanometers)
export const WAVELENGTH_MIN = 380;
export const WAVELENGTH_MAX = 780;

/**
 * Convert a wavelength (nm) to an approximate sRGB color.
 * Based on CIE 1931 color matching functions, simplified.
 * Uses Dan Bruton's approximation (widely used in computer graphics).
 * 
 * @param {number} wavelength - Wavelength in nanometers (380-780)
 * @returns {Color} - RGB color (0-1 range)
 */
export function wavelengthToRGB(wavelength) {
  let r, g, b;

  if (wavelength >= 380 && wavelength < 440) {
    r = -(wavelength - 440) / (440 - 380);
    g = 0;
    b = 1;
  } else if (wavelength >= 440 && wavelength < 490) {
    r = 0;
    g = (wavelength - 440) / (490 - 440);
    b = 1;
  } else if (wavelength >= 490 && wavelength < 510) {
    r = 0;
    g = 1;
    b = -(wavelength - 510) / (510 - 490);
  } else if (wavelength >= 510 && wavelength < 580) {
    r = (wavelength - 510) / (580 - 510);
    g = 1;
    b = 0;
  } else if (wavelength >= 580 && wavelength < 645) {
    r = 1;
    g = -(wavelength - 645) / (645 - 580);
    b = 0;
  } else if (wavelength >= 645 && wavelength <= 780) {
    r = 1;
    g = 0;
    b = 0;
  } else {
    r = 0; g = 0; b = 0;
  }

  // Intensity falloff at edges of visible spectrum
  let intensity;
  if (wavelength >= 380 && wavelength < 420) {
    intensity = 0.3 + 0.7 * (wavelength - 380) / (420 - 380);
  } else if (wavelength >= 420 && wavelength <= 700) {
    intensity = 1.0;
  } else if (wavelength > 700 && wavelength <= 780) {
    intensity = 0.3 + 0.7 * (780 - wavelength) / (780 - 700);
  } else {
    intensity = 0;
  }

  return new Color(r * intensity, g * intensity, b * intensity);
}

/**
 * Cauchy's equation for wavelength-dependent index of refraction.
 * n(λ) = A + B/λ² + C/λ⁴
 * 
 * More accurate than a single IOR — captures the physical reality that
 * shorter wavelengths (blue) bend more than longer ones (red).
 * 
 * @param {number} wavelength - Wavelength in nanometers
 * @param {number} A - Base refractive index
 * @param {number} B - First dispersion coefficient (nm²)
 * @param {number} C - Second dispersion coefficient (nm⁴), usually 0
 * @returns {number} - Index of refraction at this wavelength
 */
export function cauchyIOR(wavelength, A, B, C = 0) {
  const λ2 = wavelength * wavelength;
  return A + B / λ2 + C / (λ2 * λ2);
}

/**
 * Abbe number → Cauchy coefficients.
 * The Abbe number V_d describes how much a material disperses light.
 * Lower V_d = more dispersion (flint glass ~30), higher = less (crown glass ~60).
 * 
 * V_d = (n_d - 1) / (n_F - n_C)
 * where n_d = IOR at 587.6nm (yellow), n_F = 486.1nm (blue), n_C = 656.3nm (red)
 * 
 * @param {number} nd - Index of refraction at d-line (587.6nm, yellow)
 * @param {number} Vd - Abbe number
 * @returns {{A: number, B: number}} - Cauchy coefficients
 */
export function abbeToCAuchy(nd, Vd) {
  // From Abbe number, derive nF - nC
  const deltaN = (nd - 1) / Vd;
  
  // nF (486.1nm) - nC (656.3nm) = deltaN
  // Using Cauchy: A + B/486.1² - (A + B/656.3²) = deltaN
  // B * (1/486.1² - 1/656.3²) = deltaN
  const lambdaF = 486.1;
  const lambdaC = 656.3;
  const lambdaD = 587.6;
  
  const B = deltaN / (1 / (lambdaF * lambdaF) - 1 / (lambdaC * lambdaC));
  const A = nd - B / (lambdaD * lambdaD);
  
  return { A, B };
}

/**
 * Sample a random wavelength from the visible spectrum.
 * Uniform distribution — each wavelength equally likely.
 * For energy-correct rendering, you'd want importance sampling
 * based on the D65 illuminant, but uniform works well visually.
 * 
 * @returns {number} - Wavelength in nanometers
 */
export function randomWavelength() {
  return WAVELENGTH_MIN + Math.random() * (WAVELENGTH_MAX - WAVELENGTH_MIN);
}

/**
 * Precomputed common glass types.
 * Each entry has: nd (IOR at yellow), Vd (Abbe number), and derived Cauchy A, B.
 */
export const GLASS_TYPES = {};

// Crown glass (typical window glass) — low dispersion
const crown = abbeToCAuchy(1.523, 58.7);
GLASS_TYPES.CROWN = { nd: 1.523, Vd: 58.7, ...crown };

// Flint glass — high dispersion (good for prisms!)
const flint = abbeToCAuchy(1.62, 36.4);
GLASS_TYPES.FLINT = { nd: 1.62, Vd: 36.4, ...flint };

// Heavy flint glass — very high dispersion
const heavyFlint = abbeToCAuchy(1.72, 29.3);
GLASS_TYPES.HEAVY_FLINT = { nd: 1.72, Vd: 29.3, ...heavyFlint };

// BK7 (borosilicate crown) — standard optics glass
const bk7 = abbeToCAuchy(1.5168, 64.17);
GLASS_TYPES.BK7 = { nd: 1.5168, Vd: 64.17, ...bk7 };

// Diamond — extreme dispersion (fire!)
const diamond = abbeToCAuchy(2.417, 55.3);
GLASS_TYPES.DIAMOND = { nd: 2.417, Vd: 55.3, ...diamond };

// Water
const water = abbeToCAuchy(1.333, 55.8);
GLASS_TYPES.WATER = { nd: 1.333, Vd: 55.8, ...water };
