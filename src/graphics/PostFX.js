// Post-processing chain: HDR render (MSAA) -> bloom -> tone map
// -> colour grade (contrast / saturation / split toning / vignette / grain).
// (Screen-space AO was tried and dropped: an extra full scene pass for an almost invisible gain here;
//  contact shadows under buildings + sun shadows do that job.)
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

const GradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    time: { value: 0 },
    res: { value: new THREE.Vector2(1, 1) },
    contrast: { value: 1.08 },
    saturation: { value: 1.12 },
    vignette: { value: 0.32 },
    grain: { value: 0.018 },
    shadowTint: { value: new THREE.Color(0.0, 0.05, 0.09) },
    highTint: { value: new THREE.Color(0.07, 0.035, 0.0) },
  },
  vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse; uniform float time; uniform vec2 res; uniform float contrast; uniform float saturation;
    uniform float vignette; uniform float grain; uniform vec3 shadowTint; uniform vec3 highTint; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main(){
      vec3 c = texture2D(tDiffuse, vUv).rgb;
      float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
      c = mix(vec3(l), c, saturation);
      c = (c - 0.5) * contrast + 0.5;
      c += shadowTint * (1.0 - smoothstep(0.0, 0.55, l)) + highTint * smoothstep(0.45, 1.0, l);
      vec2 d = vUv - 0.5; d.x *= res.x / res.y;
      c *= 1.0 - vignette * smoothstep(0.25, 1.05, length(d));
      c += (h(vUv * res + fract(time) * 91.7) - 0.5) * grain;
      gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
    }`,
};

export class PostFX {
  constructor(renderer, scene, camera, quality) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.quality = null;
    this.composer = null;
    this.setQuality(quality);
  }
  _build() {
    const r = this.renderer,
      w = innerWidth,
      h = innerHeight,
      pr = r.getPixelRatio();
    const rt = new THREE.WebGLRenderTarget(w * pr, h * pr, {
      type: THREE.HalfFloatType,
      samples: this.quality === 'high' ? 4 : 2,
    });
    const c = new EffectComposer(r, rt);
    c.setPixelRatio(pr);
    c.setSize(w, h);
    c.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(w / 2, h / 2), 0.35, 0.55, 0.92);
    c.addPass(this.bloom);
    c.addPass(new OutputPass());
    this.grade = new ShaderPass(GradeShader);
    c.addPass(this.grade);
    this.composer = c;
  }
  setQuality(q) {
    if (q === this.quality) return;
    this.quality = q;
    if (this.composer) {
      this.composer.renderTarget1.dispose();
      this.composer.renderTarget2.dispose();
      this.composer = null;
    }
    if (q !== 'low') this._build();
  }
  setSize(w, h) {
    if (!this.composer) return;
    this.composer.setPixelRatio(this.renderer.getPixelRatio());
    this.composer.setSize(w, h);
    this.bloom.setSize(w / 2, h / 2);
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
