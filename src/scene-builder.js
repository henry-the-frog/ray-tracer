// scene-builder.js — Fluent API for constructing ray tracer scenes
// Makes it easy to build scenes with method chaining instead of manual object creation
//
// Usage:
//   const scene = new SceneBuilder()
//     .sphere([0, 1, 0], 1).metal([0.8, 0.8, 0.2], 0.1)
//     .sphere([2, 0.5, 0], 0.5).glass(1.5)
//     .torus([0, 0.5, -3], 1.5, 0.4).lambertian([0.8, 0.2, 0.2])
//     .ground().checker([0.1, 0.1, 0.1], [0.9, 0.9, 0.9])
//     .light([0, 10, 0], 2, [3, 3, 3])
//     .camera([0, 3, 5], [0, 1, 0], { fov: 45, aperture: 0.1 })
//     .build({ width: 800, height: 450, samples: 100 });

import { Vec3, Color, Point3 } from './vec3.js';
import { Sphere } from './sphere.js';
import { Torus } from './torus.js';
import { XZRect, Box } from './plane.js';
import { Cylinder, Cone, Disk } from './cylinder.js';
import { Lambertian, Metal, Dielectric, DiffuseLight } from './material.js';
import { CheckerTexture, SolidColor, NoiseTexture, MarbleTexture, WoodTexture, StripeTexture } from './texture.js';
import { DispersiveGlass, flintGlass, heavyFlintGlass, diamond as diamondMat } from './dispersion.js';
import { SubsurfaceScattering, skin, marble, wax, jade, milk } from './sss.js';
import { MicrofacetMaterial } from './microfacet.js';
import { CSGUnion, CSGIntersection, CSGDifference } from './csg.js';
import { Camera } from './camera.js';
import { Renderer } from './renderer.js';
import { HittableList } from './hittable.js';
import { MovingSphere } from './moving-sphere.js';

function toVec3(arr) {
  if (arr instanceof Vec3) return arr;
  return new Vec3(arr[0], arr[1], arr[2]);
}

function toColor(arr) {
  if (arr instanceof Color) return arr;
  return new Color(arr[0], arr[1], arr[2]);
}

class PendingObject {
  constructor(builder, create) {
    this._builder = builder;
    this._create = create;
  }

  // Material methods
  lambertian(color) {
    this._builder._objects.push(this._create(new Lambertian(toColor(color))));
    return this._builder;
  }

  metal(color, fuzz = 0) {
    this._builder._objects.push(this._create(new Metal(toColor(color), fuzz)));
    return this._builder;
  }

  glass(ior = 1.5) {
    this._builder._objects.push(this._create(new Dielectric(ior)));
    return this._builder;
  }

  dispersive(type = 'FLINT') {
    this._builder._objects.push(this._create(new DispersiveGlass({ glassType: type })));
    return this._builder;
  }

  diamond() {
    this._builder._objects.push(this._create(diamondMat()));
    return this._builder;
  }

  sss(preset = 'skin') {
    const presets = { skin, marble, wax, jade, milk };
    const mat = (presets[preset] || skin)();
    this._builder._objects.push(this._create(mat));
    return this._builder;
  }

  checker(color1, color2, scale = 2) {
    const tex = new CheckerTexture(
      new SolidColor(toColor(color1)),
      new SolidColor(toColor(color2)),
      scale
    );
    this._builder._objects.push(this._create(new Lambertian(tex)));
    return this._builder;
  }

  noise(scale = 4) {
    this._builder._objects.push(this._create(new Lambertian(new NoiseTexture(scale))));
    return this._builder;
  }

  marble(scale = 4) {
    this._builder._objects.push(this._create(new Lambertian(new MarbleTexture(scale))));
    return this._builder;
  }

  wood(scale = 1) {
    this._builder._objects.push(this._create(new Lambertian(new WoodTexture(scale))));
    return this._builder;
  }

  stripe(color1, color2, scale = 1) {
    const tex = new StripeTexture(
      new SolidColor(toColor(color1)),
      new SolidColor(toColor(color2)),
      scale
    );
    this._builder._objects.push(this._create(new Lambertian(tex)));
    return this._builder;
  }

  emissive(color, intensity = 1) {
    const c = toColor(color);
    this._builder._objects.push(this._create(new DiffuseLight(c.mul(intensity))));
    return this._builder;
  }

  // PBR microfacet material
  pbr(color, roughness = 0.3, metallic = 0) {
    this._builder._objects.push(this._create(new MicrofacetMaterial({
      albedo: toColor(color),
      roughness,
      metallic,
    })));
    return this._builder;
  }
}

export class SceneBuilder {
  constructor() {
    this._objects = [];
    this._cameraConfig = null;
    this._lights = [];
  }

  // Primitives
  sphere(center, radius) {
    return new PendingObject(this, mat => new Sphere(toVec3(center), radius, mat));
  }

  torus(center, majorRadius, minorRadius) {
    return new PendingObject(this, mat => new Torus(toVec3(center), majorRadius, minorRadius, mat));
  }

  box(min, max) {
    return new PendingObject(this, mat => new Box(toVec3(min), toVec3(max), mat));
  }

  cylinder(center, radius, height) {
    const c = toVec3(center);
    return new PendingObject(this, mat => new Cylinder(c, radius, c.y, c.y + height, mat));
  }

  cone(tip, radius, height) {
    const t = toVec3(tip);
    return new PendingObject(this, mat => new Cone(t, radius, height, mat));
  }

  movingSphere(center0, center1, radius, time0 = 0, time1 = 1) {
    return new PendingObject(this, mat => new MovingSphere(toVec3(center0), toVec3(center1), time0, time1, radius, mat));
  }

  ground(y = 0, extent = 100) {
    return new PendingObject(this, mat => new XZRect(-extent, extent, -extent, extent, y, mat));
  }

  // Convenience: sphere light
  light(center, radius, color = [3, 3, 3]) {
    this._objects.push(new Sphere(toVec3(center), radius, new DiffuseLight(toColor(color))));
    return this;
  }

  // CSG operations (work on the last two objects)
  csgUnion() {
    if (this._objects.length < 2) return this;
    const b = this._objects.pop();
    const a = this._objects.pop();
    this._objects.push(new CSGUnion(a, b));
    return this;
  }

  csgIntersect() {
    if (this._objects.length < 2) return this;
    const b = this._objects.pop();
    const a = this._objects.pop();
    this._objects.push(new CSGIntersection(a, b));
    return this;
  }

  csgSubtract() {
    if (this._objects.length < 2) return this;
    const b = this._objects.pop();
    const a = this._objects.pop();
    this._objects.push(new CSGDifference(a, b));
    return this;
  }

  // Camera
  camera(lookFrom, lookAt, options = {}) {
    this._cameraConfig = {
      lookFrom: toVec3(lookFrom),
      lookAt: toVec3(lookAt),
      vup: options.up ? toVec3(options.up) : new Vec3(0, 1, 0),
      vfov: options.fov || 45,
      aspectRatio: options.aspect || 16 / 9,
      aperture: options.aperture || 0,
      focusDist: options.focusDist || toVec3(lookFrom).sub(toVec3(lookAt)).length(),
    };
    return this;
  }

  // Build the scene
  build({ width = 400, height, samples = 50, maxDepth = 20 } = {}) {
    const aspect = this._cameraConfig?.aspectRatio || 16 / 9;
    const h = height || Math.floor(width / aspect);

    const cam = this._cameraConfig || {
      lookFrom: new Point3(0, 3, 5),
      lookAt: new Point3(0, 1, 0),
      vup: new Vec3(0, 1, 0),
      vfov: 45,
      aspectRatio: aspect,
    };

    const camera = new Camera(cam);
    const world = new HittableList();
    for (const obj of this._objects) world.add(obj);

    return new Renderer({
      width,
      height: h,
      samplesPerPixel: samples,
      maxDepth,
      camera,
      world,
      lights: this._lights,
    });
  }

  // Render directly to PPM
  render(options) {
    return this.build(options).renderPPM();
  }

  // Get the world list (for testing)
  getWorld() {
    const world = new HittableList();
    for (const obj of this._objects) world.add(obj);
    return world;
  }
}
