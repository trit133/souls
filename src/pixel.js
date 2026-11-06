// Pixel-art rendering: the 3D scene is drawn into a small render target (about 270 game pixels tall). One pass at
// that same size adds a 1-pixel dark outline wherever depth jumps (silhouettes) and snaps colours to a fixed palette
// with 4x4 ordered dithering, into a canvas of exactly that size. CSS then scales the canvas up by a whole number
// with image-rendering: pixelated, so every game pixel is the same size and the upscale costs nothing.
// Gameplay never sees any of this.
import * as THREE from 'three';

// Hard light bands on every Lambert material (all of the world, characters and props): 3 steps instead of a
// smooth falloff. Patched into the shared shader chunk so no material file has to change.
THREE.ShaderChunk.lights_lambert_pars_fragment = THREE.ShaderChunk.lights_lambert_pars_fragment.replace(
  'float dotNL = saturate( dot( geometryNormal, directLight.direction ) );',
  'float dotNL = saturate( dot( geometryNormal, directLight.direction ) );\n\tdotNL = dotNL < 0.12 ? 0.0 : dotNL < 0.55 ? 0.5 : 1.0;',
);

// target height in game pixels for each Pixel size setting
export const PIXEL_H = { chunky: 180, medium: 270, fine: 360 };

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
];

const VERT = /* glsl */ `void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }`;

const FRAG = /* glsl */ `
out vec4 outColor;
uniform sampler2D tColor;
uniform sampler2D tDepth;
uniform vec2 uSize;      // render target size in game pixels
uniform float uNear, uFar;
uniform vec3 uPal[${PALETTE.length}];

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

void main() {
  ivec2 p = ivec2(gl_FragCoord.xy);
  vec3 c = toSRGB(texelFetch(tColor, clamp(p, ivec2(0), ivec2(uSize) - 1), 0).rgb);

  // outline: this pixel sits just behind something nearer (a silhouette edge)
  float d = lin(p);
  float near = min(min(lin(p + ivec2(1, 0)), lin(p - ivec2(1, 0))), min(lin(p + ivec2(0, 1)), lin(p - ivec2(0, 1))));
  float edge = step(0.2 + d * 0.025, d - near);

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
      },
    });
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
    r.setRenderTarget(null);
    r.render(this.post, this.cam);
  }
}
