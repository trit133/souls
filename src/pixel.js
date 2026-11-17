// Pixel-art rendering: the 3D scene is drawn into a small render target (about 340 game pixels tall). One pass at
// that same size adds a 1-pixel dark outline wherever depth jumps (silhouettes) and snaps colours to a fixed palette
// with 4x4 ordered dithering, into a canvas of exactly that size. CSS then scales the canvas up by a whole number
// with image-rendering: pixelated, so every game pixel is the same size and the upscale costs nothing.
// Gameplay never sees any of this.
// The enhanced lighting (lighting.js, the Proving Ring for now) adds to that same pass, all at the game's low
// resolution so it stays cheap: light shafts (the sun's light scattered by the dusty air, ray-marched through its
// shadow map at half size), bloom on what's brightest, soft shadow in creases (from the depth), a filmic tone curve,
// and the Soft palette (smooth light, finely posterized) in place of the strict one.
import * as THREE from 'three';

// Hard light bands on every Lambert material (all of the world, characters and props): 3 steps instead of a
// smooth falloff. Patched into the shared shader chunk so no material file has to change. A material with the
// SOFT_LIGHT define (lighting.js, the Soft palette) keeps the smooth falloff
THREE.ShaderChunk.lights_lambert_pars_fragment = THREE.ShaderChunk.lights_lambert_pars_fragment.replace(
  'float dotNL = saturate( dot( geometryNormal, directLight.direction ) );',
  'float dotNL = saturate( dot( geometryNormal, directLight.direction ) );\n#ifndef SOFT_LIGHT\n\tdotNL = dotNL < 0.12 ? 0.0 : dotNL < 0.55 ? 0.5 : 1.0;\n#endif',
);

// target height in game pixels for each Pixel size setting
export const PIXEL_H = { chunky: 180, medium: 340, fine: 480 };

// dark-fantasy palette (sRGB): ash and bone greys, moonlight blues, blood, embers, moss, wood, arcane
const PALETTE = [
  '0b0a09', '15130f', '1f1b16', '2a2520', '38312a', '4a4239', '5e554a', '776c5e', '948876', 'b3a68f', 'd4c8b0', 'f2ead8',
  '1a1e28', '2c3a52', '445a7a', '6a88b0', '9cc0e8', 'dceeff',
  '2e0f0e', '551714', '8a1f18', 'c4301e', 'ff4a2a',
  '7a3a12', 'b8601a', 'f08c22', 'ffc04a', 'fff0a0',
  '1f2a18', '34452a', '556b3c', '8aa05a',
  '3d2a1c', '5e4128', '87603a', '4a2a5a',
  // ground and stone mid-tones, so large surfaces stay mostly flat colour
  '30281f', '41362a', '56473a', '6e5b48', '86715a', '9c8870', '45403b', '5a5650', '726d66', '8c877e',
  // glows for skins and spells: bright greens and violets
  '3a9a4a', '7aff9a', 'd0ffd8', '4a2e8a', '8a5ae0', 'c4a0ff', 'eadcff',
];

const VERT = /* glsl */ `void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }`;

const FRAG = /* glsl */ `
out vec4 outColor;
uniform sampler2D tColor;
uniform sampler2D tDepth;
uniform vec2 uSize;      // render target size in game pixels
uniform float uNear, uFar;
uniform vec3 uPal[${PALETTE.length}];
uniform sampler2D tRays, tBloom;
uniform float uRays, uBloom, uAO, uSoft, uTone; // (each 0 when off)
uniform vec3 uSunCol;

float lin(ivec2 p) {
  p = clamp(p, ivec2(0), ivec2(uSize) - 1);
  float z = texelFetch(tDepth, p, 0).r * 2.0 - 1.0;
  return 2.0 * uNear * uFar / (uFar + uNear - z * (uFar - uNear));
}
vec3 toSRGB(vec3 c) { return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
float bayer(ivec2 p) {
  int i = (p.x & 3) + (p.y & 3) * 4;
  int m[16] = int[16](0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5);
  return float(m[i]) / 16.0 - 0.5;
}

vec3 aces(vec3 x) { return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }

// soft shadow where surfaces meet (a wall's foot, under a ledge): this pixel lies deeper than the plane through its
// neighbours either side, in four directions at two reaches; jumps in depth (silhouettes) don't count
float crease(ivec2 p, float d) {
  float occ = 0.0;
  for (int r = 1; r <= 2; r++) {
    int k = r * 3;
    ivec2 o[4] = ivec2[4](ivec2(k, 0), ivec2(0, k), ivec2(k, k), ivec2(k, -k));
    for (int i = 0; i < 4; i++) {
      float a = lin(p + o[i]), b = lin(p - o[i]);
      float dip = d - (a + b) * 0.5, jump = abs(a - b);
      occ += smoothstep(0.015, 0.22, dip) * (1.0 - smoothstep(0.8, 2.0, jump));
    }
  }
  return 1.0 - min(0.6, occ * 0.12);
}

void main() {
  ivec2 p = ivec2(gl_FragCoord.xy);
  vec3 lc = texelFetch(tColor, clamp(p, ivec2(0), ivec2(uSize) - 1), 0).rgb;
  float d = lin(p);
  vec2 uv = (vec2(p) + 0.5) / uSize;
  if (uAO > 0.0) lc *= crease(p, d);
  if (uRays > 0.0) {
    vec2 h = 1.0 / uSize;
    vec3 r = texture(tRays, uv).rgb * 0.4 + (texture(tRays, uv + vec2(h.x, 0)).rgb + texture(tRays, uv - vec2(h.x, 0)).rgb + texture(tRays, uv + vec2(0, h.y)).rgb + texture(tRays, uv - vec2(0, h.y)).rgb) * 0.15;
    lc += uSunCol * r * uRays;
  }
  if (uBloom > 0.0) lc += texture(tBloom, uv).rgb * uBloom;
  if (uTone > 0.0) lc = aces(lc * uTone);
  vec3 c = toSRGB(lc);

  // outline: this pixel sits just behind something nearer (a silhouette edge)
  float near = min(min(lin(p + ivec2(1, 0)), lin(p - ivec2(1, 0))), min(lin(p + ivec2(0, 1)), lin(p - ivec2(0, 1))));
  float edge = step(0.2 + d * 0.025, d - near);

  // the Soft palette: smooth light kept, posterized finely (32 steps a channel) through the same dither
  if (uSoft > 0.0) {
    c = floor(clamp(c + bayer(p) / 32.0, 0.0, 1.0) * 32.0 + 0.5) / 32.0;
    outColor = vec4(mix(c, c * 0.25, edge), 1.0);
    return;
  }
  // ordered dither, then the nearest palette colour (weighted for how the eye sees brightness)
  c += bayer(p) * 0.035;
  vec3 best = uPal[0]; float bd = 1e9;
  for (int i = 0; i < ${PALETTE.length}; i++) {
    vec3 e = (c - uPal[i]) * vec3(0.30, 0.59, 0.11);
    float dd = dot(e, e) + dot(c - uPal[i], c - uPal[i]) * 0.15;
    if (dd < bd) { bd = dd; best = uPal[i]; }
  }
  best = mix(best, best * 0.25, edge);
  outColor = vec4(best, 1.0);
}`;

// the light shafts: from the camera to each pixel's surface, how much of the way is in the sun (its shadow map) and
// thick with dust (more near the ground), with more glow looking toward the sun. Half the game's resolution; the
// march starts at a different point per pixel and the main pass blurs it a little
const RAYS = /* glsl */ `
out vec4 outColor;
uniform sampler2D tDepth;
uniform sampler2DShadow tShadow;
uniform mat4 uInvProj, uCamWorld, uShadowMat;
uniform vec3 uCamPos, uSunDir;
uniform vec2 uSize, uFull;
uniform float uMaxD;
uniform int uSteps;
float ign(vec2 p) { return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715)))); }
void main() {
  vec2 q = gl_FragCoord.xy, uv = q / uSize;
  float z = texelFetch(tDepth, ivec2(uv * uFull), 0).r;
  vec4 v = uInvProj * vec4(uv * 2.0 - 1.0, z * 2.0 - 1.0, 1.0); v /= v.w;
  vec3 wp = (uCamWorld * v).xyz, rd = wp - uCamPos;
  float L = length(rd); rd /= L; L = min(L, uMaxD);
  float st = L / float(uSteps), j = ign(q), acc = 0.0;
  for (int i = 0; i < 64; i++) {
    if (i >= uSteps) break;
    vec3 pos = uCamPos + rd * (float(i) + j) * st;
    vec4 sc = uShadowMat * vec4(pos, 1.0);
    float lit = 1.0;
    if (sc.x > 0.0 && sc.x < 1.0 && sc.y > 0.0 && sc.y < 1.0 && sc.z < 1.0) lit = texture(tShadow, vec3(sc.xy, sc.z - 0.0015));
    acc += lit * exp(-max(pos.y, 0.0) * 0.32);
  }
  float mu = dot(rd, uSunDir), g = 0.6;
  float phase = (1.0 - g * g) / pow(1.0 + g * g - 2.0 * g * mu, 1.5);
  outColor = vec4(vec3(acc * st * (0.15 + phase * 0.25)), 1.0);
}`;
// bloom: what's brightest, halved, then blurred one way and the other (9 taps)
const BRIGHT = /* glsl */ `
out vec4 outColor;
uniform sampler2D tColor;
uniform vec2 uSize;
void main() {
  vec3 c = texture(tColor, gl_FragCoord.xy / uSize).rgb;
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  outColor = vec4(c * smoothstep(0.45, 0.85, l), 1.0);
}`;
const BLUR = /* glsl */ `
out vec4 outColor;
uniform sampler2D tSrc;
uniform vec2 uSize, uDir;
void main() {
  vec2 uv = gl_FragCoord.xy / uSize, s = uDir / uSize;
  float w[5] = float[5](0.227, 0.194, 0.121, 0.054, 0.016);
  vec3 c = texture(tSrc, uv).rgb * w[0];
  for (int i = 1; i < 5; i++) c += (texture(tSrc, uv + s * float(i) * 1.5).rgb + texture(tSrc, uv - s * float(i) * 1.5).rgb) * w[i];
  outColor = vec4(c, 1.0);
}`;
const fsq = (frag, uniforms) => {
  const m = new THREE.ShaderMaterial({ glslVersion: THREE.GLSL3, vertexShader: VERT, fragmentShader: frag, depthTest: false, depthWrite: false, uniforms });
  const q = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), m); q.frustumCulled = false;
  const sc = new THREE.Scene(); sc.add(q);
  return { m, sc };
};
const linRT = (type = THREE.UnsignedByteType) => new THREE.WebGLRenderTarget(16, 16, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false, type });

export class PixelPass {
  constructor(renderer) {
    this.renderer = renderer;
    this.rt = new THREE.WebGLRenderTarget(16, 16, {
      minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, depthBuffer: true,
      depthTexture: new THREE.DepthTexture(16, 16),
    });
    this.mat = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      vertexShader: VERT, fragmentShader: FRAG, depthTest: false, depthWrite: false,
      uniforms: {
        tColor: { value: this.rt.texture }, tDepth: { value: this.rt.depthTexture },
        uSize: { value: new THREE.Vector2(16, 16) },
        uNear: { value: 0.1 }, uFar: { value: 200 },
        uPal: { value: PALETTE.map((h) => new THREE.Color().setRGB(...[0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255))) },
        tRays: { value: null }, tBloom: { value: null },
        uRays: { value: 0 }, uBloom: { value: 0 }, uAO: { value: 0 }, uSoft: { value: 0 }, uTone: { value: 0 },
        uSunCol: { value: new THREE.Color(1, 0.7, 0.45) },
      },
    });
    // the enhanced lighting's passes (lighting.js sets this.fx: { rays: { sun, steps, strength }, bloom, ao, soft, tone })
    this.fx = null;
    this.rayRT = linRT(THREE.HalfFloatType);
    this.rays = fsq(RAYS, {
      tDepth: { value: this.rt.depthTexture }, tShadow: { value: null },
      uInvProj: { value: new THREE.Matrix4() }, uCamWorld: { value: new THREE.Matrix4() }, uShadowMat: { value: new THREE.Matrix4() },
      uCamPos: { value: new THREE.Vector3() }, uSunDir: { value: new THREE.Vector3() },
      uSize: { value: new THREE.Vector2() }, uFull: { value: new THREE.Vector2() }, uMaxD: { value: 40 }, uSteps: { value: 24 },
    });
    this.bloomA = linRT(); this.bloomB = linRT();
    this.bright = fsq(BRIGHT, { tColor: { value: this.rt.texture }, uSize: { value: new THREE.Vector2() } });
    this.blur = fsq(BLUR, { tSrc: { value: null }, uSize: { value: new THREE.Vector2() }, uDir: { value: new THREE.Vector2() } });
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.mat);
    this.quad.frustumCulled = false;
    this.post = new THREE.Scene(); this.post.add(this.quad);
    this.cam = new THREE.Camera();
    this.size = new THREE.Vector2(16, 16);
    this.scale = 1;
  }

  // Screen size in CSS pixels, device pixel ratio and the wanted height in game pixels. Picks a whole-number
  // scale (device pixels per game pixel), sizes the canvas to the game resolution and lays it out in CSS at
  // exactly scale x that, centred; the 0-1 game pixel overhang is cropped by the screen edge.
  setSize(cssW, cssH, dpr, wantH) {
    const devW = Math.round(cssW * dpr), devH = Math.round(cssH * dpr);
    const scale = Math.max(1, Math.round(devH / wantH));
    const w = Math.ceil(devW / scale), h = Math.ceil(devH / scale);
    this.size.set(w, h); this.scale = scale;
    this.rt.setSize(w, h);
    this.mat.uniforms.uSize.value.set(w, h);
    const hw = Math.max(1, Math.ceil(w / 2)), hh = Math.max(1, Math.ceil(h / 2));
    this.rayRT.setSize(hw, hh); this.bloomA.setSize(hw, hh); this.bloomB.setSize(hw, hh);
    const r = this.renderer;
    r.setPixelRatio(1);
    r.setSize(w, h, false);
    const st = r.domElement.style, sw = (w * scale) / dpr, sh = (h * scale) / dpr;
    st.width = sw + 'px'; st.height = sh + 'px';
    st.left = (cssW - sw) / 2 + 'px'; st.top = (cssH - sh) / 2 + 'px';
    return { w, h, scale };
  }

  render(scene, camera) {
    const r = this.renderer;
    this.mat.uniforms.uNear.value = camera.near; this.mat.uniforms.uFar.value = camera.far;
    r.setRenderTarget(this.rt);
    r.render(scene, camera);
    const U = this.mat.uniforms, fx = this.fx;
    U.uRays.value = 0; U.uBloom.value = 0;
    U.uAO.value = fx?.ao ? 1 : 0; U.uSoft.value = fx?.soft ? 1 : 0; U.uTone.value = fx?.tone || 0;
    if (fx?.rays && fx.rays.sun.shadow.map?.depthTexture) this.drawRays(camera, fx.rays);
    if (fx?.bloom) this.drawBloom(fx.bloom);
    r.setRenderTarget(null);
    r.render(this.post, this.cam);
  }

  drawRays(camera, R) {
    const r = this.renderer, u = this.rays.m.uniforms, sun = R.sun;
    u.tShadow.value = sun.shadow.map.depthTexture;
    u.uInvProj.value.copy(camera.projectionMatrixInverse); u.uCamWorld.value.copy(camera.matrixWorld);
    u.uShadowMat.value.copy(sun.shadow.matrix); u.uCamPos.value.setFromMatrixPosition(camera.matrixWorld);
    u.uSunDir.value.subVectors(sun.position, sun.target.position).normalize();
    u.uSize.value.set(this.rayRT.width, this.rayRT.height); u.uFull.value.copy(this.size); u.uSteps.value = R.steps;
    r.setRenderTarget(this.rayRT); r.render(this.rays.sc, this.cam);
    const U = this.mat.uniforms;
    U.tRays.value = this.rayRT.texture; U.uRays.value = R.strength; U.uSunCol.value.copy(sun.color);
  }

  drawBloom(k) {
    const r = this.renderer, sz = new THREE.Vector2(this.bloomA.width, this.bloomA.height);
    this.bright.m.uniforms.uSize.value.copy(sz);
    r.setRenderTarget(this.bloomA); r.render(this.bright.sc, this.cam);
    const b = this.blur.m.uniforms; b.uSize.value.copy(sz);
    b.tSrc.value = this.bloomA.texture; b.uDir.value.set(1, 0); r.setRenderTarget(this.bloomB); r.render(this.blur.sc, this.cam);
    b.tSrc.value = this.bloomB.texture; b.uDir.value.set(0, 1); r.setRenderTarget(this.bloomA); r.render(this.blur.sc, this.cam);
    this.mat.uniforms.tBloom.value = this.bloomA.texture; this.mat.uniforms.uBloom.value = k;
  }
}
