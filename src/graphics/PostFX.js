// Post-processing chain: HDR render (MSAA on high) -> bloom -> tone map + colour grade
// (contrast / saturation / split toning / vignette / grain) in one full-screen pass.
// (Screen-space AO was tried and dropped: an extra full scene pass for an almost invisible gain here;
//  contact shadows under buildings + sun shadows do that job.)
// The composer and its passes are loaded with a dynamic import() the first time a quality needs them
// (low draws straight to the screen and never loads them); medium renders without MSAA and blurs its bloom at a
// quarter of the resolution; the tone mapping (OutputPass) and the grade share one pass instead of two.
import * as THREE from 'three';

let FX = null; // the post-processing modules, once loaded
function loadFX() {
  return (FX ||= Promise.all([
    import('three/addons/postprocessing/EffectComposer.js'),
    import('three/addons/postprocessing/RenderPass.js'),
    import('three/addons/postprocessing/UnrealBloomPass.js'),
    import('three/addons/postprocessing/OutputPass.js'),
  ]).then(([ec, rp, bp, op]) => ({
    EffectComposer: ec.EffectComposer,
    RenderPass: rp.RenderPass,
    UnrealBloomPass: bp.UnrealBloomPass,
    OutputPass: op.OutputPass,
  })));
}

// the grade, run on the tone-mapped sRGB colour at the end of OutputPass's shader
const GRADE_UNIFORMS = {
  time: { value: 0 },
  res: { value: new THREE.Vector2(1, 1) },
  contrast: { value: 1.08 },
  saturation: { value: 1.12 },
  vignette: { value: 0.32 },
  grain: { value: 0.018 },
  shadowTint: { value: new THREE.Color(0.0, 0.05, 0.09) },
  highTint: { value: new THREE.Color(0.07, 0.035, 0.0) },
};
const GRADE_PARS = /* glsl */ `
  uniform float time; uniform vec2 res; uniform float contrast; uniform float saturation;
  uniform float vignette; uniform float grain; uniform vec3 shadowTint; uniform vec3 highTint;
  float gradeHash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }`;
const GRADE_MAIN = /* glsl */ `
  {
    vec3 c = gl_FragColor.rgb;
    float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
    c = mix(vec3(l), c, saturation);
    c = (c - 0.5) * contrast + 0.5;
    c += shadowTint * (1.0 - smoothstep(0.0, 0.55, l)) + highTint * smoothstep(0.45, 1.0, l);
    vec2 d = vUv - 0.5; d.x *= res.x / res.y;
    c *= 1.0 - vignette * smoothstep(0.25, 1.05, length(d));
    c += (gradeHash(vUv * res + fract(time) * 91.7) - 0.5) * grain;
    gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
  }`;
// OutputPass (tone mapping + sRGB) with the grade appended to its shader
function gradedOutputPass(OutputPass) {
  const pass = new OutputPass();
  const m = pass.material;
  Object.assign(pass.uniforms, THREE.UniformsUtils.clone(GRADE_UNIFORMS));
  m.fragmentShader = m.fragmentShader
    .replace('varying vec2 vUv;', `varying vec2 vUv;\n${GRADE_PARS}`)
    .replace(/\}\s*$/, `${GRADE_MAIN}\n}`);
  m.needsUpdate = true;
  return pass;
}

// bloom buffer size: a quarter of the screen on medium, half on high
const bloomDiv = (q) => (q === 'high' ? 2 : 4);

export class PostFX {
  constructor(renderer, scene, camera, quality) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.quality = null;
    this.composer = null;
    this.setQuality(quality);
  }
  _build(M) {
    const r = this.renderer,
      w = innerWidth,
      h = innerHeight,
      pr = r.getPixelRatio(),
      q = this.quality;
    const rt = new THREE.WebGLRenderTarget(w * pr, h * pr, {
      type: THREE.HalfFloatType,
      samples: q === 'high' ? 4 : 0,
    });
    const c = new M.EffectComposer(r, rt);
    c.setPixelRatio(pr);
    c.setSize(w, h);
    c.addPass(new M.RenderPass(this.scene, this.camera));
    this.bloom = new M.UnrealBloomPass(
      new THREE.Vector2(w / bloomDiv(q), h / bloomDiv(q)),
      0.35,
      0.55,
      0.92
    );
    c.addPass(this.bloom);
    this.grade = gradedOutputPass(M.OutputPass);
    c.addPass(this.grade);
    this.composer = c;
  }
  _drop() {
    if (!this.composer) return;
    this.composer.renderTarget1.dispose();
    this.composer.renderTarget2.dispose();
    this.composer = null;
  }
  setQuality(q) {
    if (q === this.quality) return;
    this.quality = q;
    this._drop();
    if (q === 'low') return;
    // until the modules are in (the first time only), frames draw straight to the screen as on low
    loadFX().then((M) => {
      if (this.quality !== q || this.composer) return;
      this._build(M);
    });
  }
  setSize(w, h) {
    if (!this.composer) return;
    this.composer.setPixelRatio(this.renderer.getPixelRatio());
    this.composer.setSize(w, h);
    this.bloom.setSize(w / bloomDiv(this.quality), h / bloomDiv(this.quality));
  }
  render(dt, env) {
    if (!this.composer) {
      this.renderer.render(this.scene, this.camera);
      return;
    }
    const n = env.night || 0,
      ss = env.sunset || 0;
    this.bloom.strength = 0.2 + n * 0.32 + ss * 0.1;
    this.bloom.threshold = 0.95 - n * 0.15;
    this.bloom.radius = 0.45 + n * 0.1;
    const U = this.grade.uniforms;
    U.time.value += dt;
    U.res.value.set(innerWidth, innerHeight);
    U.saturation.value = 1.12 - n * 0.08;
    U.contrast.value = 1.07 + n * 0.04;
    U.vignette.value = 0.3 + n * 0.12;
    U.shadowTint.value.setRGB(0.0, 0.035 + n * 0.02, 0.07 + n * 0.05);
    U.highTint.value.setRGB(0.06 + ss * 0.04, 0.03 + ss * 0.01, 0.0);
    this.composer.render(dt);
  }
}
