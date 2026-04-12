// torus.js — Torus primitive (donut shape)
// Ray-torus intersection requires solving a quartic equation.
// Uses Ferrari's method for analytical solution.

import { Vec3 } from './vec3.js';
import { AABB } from './aabb.js';

/**
 * Solve quartic: ax⁴ + bx³ + cx² + dx + e = 0
 * Returns real roots sorted ascending.
 * Uses Ferrari's method via depressed quartic.
 */
function solveQuartic(a, b, c, d, e) {
  if (Math.abs(a) < 1e-12) return solveCubic(b, c, d, e);
  
  // Normalize
  const B = b / a, C = c / a, D = d / a, E = e / a;
  
  // Depressed quartic: t⁴ + pt² + qt + r = 0
  // via substitution t = x - B/4
  const B2 = B * B;
  const B3 = B2 * B;
  const B4 = B2 * B2;
  
  const p = C - 3 * B2 / 8;
  const q = D - B * C / 2 + B3 / 8;
  const r = E - B * D / 4 + B2 * C / 16 - 3 * B4 / 256;
  
  let roots;
  
  if (Math.abs(q) < 1e-12) {
    // Biquadratic: t⁴ + pt² + r = 0
    const disc = p * p - 4 * r;
    if (disc < -1e-12) return [];
    const sqrtDisc = Math.sqrt(Math.max(0, disc));
    const u1 = (-p + sqrtDisc) / 2;
    const u2 = (-p - sqrtDisc) / 2;
    
    roots = [];
    if (u1 >= -1e-12) {
      const s = Math.sqrt(Math.max(0, u1));
      roots.push(s, -s);
    }
    if (u2 >= -1e-12) {
      const s = Math.sqrt(Math.max(0, u2));
      roots.push(s, -s);
    }
  } else {
    // Ferrari's resolvent cubic: y³ - p/2 · y² - r·y + (pr/2 - q²/8) = 0
    // Actually: y³ + (5p/2)y + (2p² - r) + ... — let me use the standard form
    // Resolvent cubic: 8y³ - 4py² - 8ry + (4pr - q²) = 0
    const cubicRoots = solveCubic(8, -4 * p, -8 * r, 4 * p * r - q * q);
    
    if (cubicRoots.length === 0) return [];
    
    // Pick the largest real root y₁
    const y1 = cubicRoots[cubicRoots.length - 1];
    
    const sqrt2y = Math.sqrt(Math.max(0, 2 * y1 - p));
    if (sqrt2y < 1e-12) return [];
    
    roots = [];
    // Two quadratics:
    // t² + sqrt(2y₁-p)·t + (y₁ - q/(2·sqrt(2y₁-p))) = 0
    // t² - sqrt(2y₁-p)·t + (y₁ + q/(2·sqrt(2y₁-p))) = 0
    
    const qOver2s = q / (2 * sqrt2y);
    
    const disc1 = sqrt2y * sqrt2y / 4 - (y1 - qOver2s);
    const disc2 = sqrt2y * sqrt2y / 4 - (y1 + qOver2s);
    
    if (disc1 >= -1e-12) {
      const s = Math.sqrt(Math.max(0, disc1));
      roots.push(-sqrt2y / 2 + s, -sqrt2y / 2 - s);
    }
    if (disc2 >= -1e-12) {
      const s = Math.sqrt(Math.max(0, disc2));
      roots.push(sqrt2y / 2 + s, sqrt2y / 2 - s);
    }
  }
  
  // Undo substitution: x = t - B/4
  const shift = -B / 4;
  return roots.map(t => t + shift).filter(t => isFinite(t)).sort((a, b) => a - b);
}

/**
 * Solve cubic: ax³ + bx² + cx + d = 0
 * Returns real roots sorted ascending.
 */
function solveCubic(a, b, c, d) {
  if (Math.abs(a) < 1e-12) return solveQuadratic(b, c, d);
  
  const B = b / a, C = c / a, D = d / a;
  const B2 = B * B;
  
  // Depressed cubic: t³ + pt + q = 0 via t = x - B/3
  const p = C - B2 / 3;
  const q = D - B * C / 3 + 2 * B2 * B / 27;
  
  const disc = q * q / 4 + p * p * p / 27;
  
  const shift = -B / 3;
  
  if (disc > 1e-12) {
    // One real root
    const sqrtDisc = Math.sqrt(disc);
    const u = Math.cbrt(-q / 2 + sqrtDisc);
    const v = Math.cbrt(-q / 2 - sqrtDisc);
    return [u + v + shift];
  } else if (disc > -1e-12) {
    // Three real roots (one double)
    if (Math.abs(q) < 1e-12) return [shift];
    const u = Math.cbrt(-q / 2);
    return [2 * u + shift, -u + shift].sort((a, b) => a - b);
  } else {
    // Three distinct real roots (casus irreducibilis)
    const r = Math.sqrt(-p * p * p / 27);
    const theta = Math.acos(Math.max(-1, Math.min(1, -q / (2 * r))));
    const m = 2 * Math.cbrt(r);
    
    return [
      m * Math.cos(theta / 3) + shift,
      m * Math.cos((theta + 2 * Math.PI) / 3) + shift,
      m * Math.cos((theta + 4 * Math.PI) / 3) + shift
    ].sort((a, b) => a - b);
  }
}

function solveQuadratic(a, b, c) {
  if (Math.abs(a) < 1e-12) {
    return Math.abs(b) < 1e-12 ? [] : [-c / b];
  }
  const disc = b * b - 4 * a * c;
  if (disc < -1e-12) return [];
  if (disc < 1e-12) return [-b / (2 * a)];
  const sqrtDisc = Math.sqrt(disc);
  return [(-b - sqrtDisc) / (2 * a), (-b + sqrtDisc) / (2 * a)].sort((a, b) => a - b);
}

export class Torus {
  /**
   * @param {Vec3} center - Center of the torus
   * @param {number} majorRadius - Distance from center to tube center (R)
   * @param {number} minorRadius - Tube radius (r)
   * @param {object} material - Material
   * @param {Vec3} axis - Torus axis (default: Y-up)
   */
  constructor(center, majorRadius, minorRadius, material, axis = new Vec3(0, 1, 0)) {
    this.center = center;
    this.R = majorRadius;
    this.r = minorRadius;
    this.material = material;
    this.axis = axis.unit();
  }

  hit(ray, tMin, tMax) {
    // Transform ray to torus local space (centered at origin, Y-up)
    const origin = ray.origin.sub(this.center);
    const dir = ray.direction;
    
    // For a Y-axis torus: (x² + y² + z² + R² - r²)² = 4R²(x² + z²)
    // Substitute P = O + tD and expand to quartic: at⁴ + bt³ + ct² + dt + e = 0
    
    const ox = origin.x, oy = origin.y, oz = origin.z;
    const dx = dir.x, dy = dir.y, dz = dir.z;
    
    const R2 = this.R * this.R;
    const r2 = this.r * this.r;
    
    // alpha = D·D
    const alpha = dx * dx + dy * dy + dz * dz;
    // beta = 2(O·D)
    const beta = 2 * (ox * dx + oy * dy + oz * dz);
    // gamma = O·O + R² - r²
    const gamma = ox * ox + oy * oy + oz * oz + R2 - r2;
    
    // For xz-plane: D_xz·D_xz, O_xz·D_xz, O_xz·O_xz
    const dxz2 = dx * dx + dz * dz;
    const oxzDxz = ox * dx + oz * dz;
    const oxz2 = ox * ox + oz * oz;
    
    // Quartic coefficients:
    // a = alpha²
    const a = alpha * alpha;
    // b = 2·alpha·beta
    const b = 2 * alpha * beta;
    // c = beta² + 2·alpha·gamma - 4·R²·dxz2
    const c = beta * beta + 2 * alpha * gamma - 4 * R2 * dxz2;
    // d = 2·beta·gamma - 8·R²·oxzDxz
    const d = 2 * beta * gamma - 8 * R2 * oxzDxz;
    // e = gamma² - 4·R²·oxz2
    const e = gamma * gamma - 4 * R2 * oxz2;
    
    const roots = solveQuartic(a, b, c, d, e);
    
    // Find smallest root in [tMin, tMax]
    for (const t of roots) {
      if (t >= tMin && t <= tMax) {
        const p = ray.origin.add(dir.mul(t));
        const normal = this._normalAt(p);
        const [u, v] = this._uvAt(p);
        const frontFace = dir.dot(normal) < 0;
        
        return {
          t,
          p,
          normal: frontFace ? normal : normal.negate(),
          frontFace,
          material: this.material,
          u,
          v
        };
      }
    }
    
    return null;
  }

  _normalAt(p) {
    // Normal for Y-axis torus at point P:
    // The gradient of f(x,y,z) = (x²+y²+z²+R²-r²)² - 4R²(x²+z²)
    const local = p.sub(this.center);
    const x = local.x, y = local.y, z = local.z;
    const R2 = this.R * this.R;
    const r2 = this.r * this.r;
    
    const sumSq = x * x + y * y + z * z;
    const k = sumSq + R2 - r2;
    
    // ∂f/∂x = 4x·k - 8R²x = 4x(k - 2R²)
    // ∂f/∂y = 4y·k
    // ∂f/∂z = 4z·k - 8R²z = 4z(k - 2R²)
    // Simplify: gradient ∝ (x(k-2R²), y·k, z(k-2R²))
    
    // Actually the cleaner formula: for a point P on the torus,
    // project P onto the circle of radius R in the xz-plane.
    // The normal points from that projected point to P.
    const distXZ = Math.sqrt(x * x + z * z);
    if (distXZ < 1e-10) {
      // On the axis — degenerate
      return new Vec3(0, y > 0 ? 1 : -1, 0);
    }
    
    // Point on the center ring closest to P
    const ringPoint = new Vec3(
      this.R * x / distXZ,
      0,
      this.R * z / distXZ
    );
    
    // Normal = P_local - ringPoint, normalized
    return new Vec3(
      local.x - ringPoint.x,
      local.y - ringPoint.y,
      local.z - ringPoint.z
    ).unit();
  }

  _uvAt(p) {
    // UV coordinates for a torus:
    // u = angle around the major circle (0 to 1)
    // v = angle around the tube cross-section (0 to 1)
    const local = p.sub(this.center);
    const x = local.x, y = local.y, z = local.z;
    
    // u: angle in xz-plane around the major circle
    const u = (Math.atan2(z, x) + Math.PI) / (2 * Math.PI);
    
    // v: angle around the tube
    // Project point onto the ring to find the tube center
    const distXZ = Math.sqrt(x * x + z * z);
    // Local coordinates relative to ring point
    const tubeX = distXZ - this.R; // radial distance from ring
    const tubeY = y;               // height relative to ring
    const v = (Math.atan2(tubeY, tubeX) + Math.PI) / (2 * Math.PI);
    
    return [u, v];
  }

  boundingBox() {
    const extent = this.R + this.r;
    return new AABB(
      this.center.sub(new Vec3(extent, this.r, extent)),
      this.center.add(new Vec3(extent, this.r, extent))
    );
  }
}

// Export the quartic solver for testing
export { solveQuartic, solveCubic, solveQuadratic };
