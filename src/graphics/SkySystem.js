// Atmosphere: physically-based (Preetham) sky + drifting fbm clouds + stars/moon,
// sun & ambient lights driven by the game clock, image-based lighting (PMREM of the sky)
// so glass / car paint / wet-looking asphalt reflect the real sky colour.
import * as THREE from 'three';

const SKY_VERT = /* glsl */ `
uniform vec3 sunDir; uniform float rayleigh; uniform float turbidity; uniform float mieCoefficient;
varying vec3 vDir; varying float vSunfade; varying vec3 vBetaR; varying vec3 vBetaM; varying float vSunE;
const float e = 2.718281828459045; const float pi = 3.141592653589793;
const vec3 totalRayleigh = vec3(5.804542996261093E-6, 1.3562911419845635E-5, 3.0265902468824876E-5);
const vec3 MieConst = vec3(1.8399918514433978E14, 2.7798023919660528E14, 4.0790479543861094E14);
const float cutoffAngle = 1.6110731556870734; const float steepness = 1.5; const float EE = 1000.0;
float sunIntensity(float c) { c = clamp(c, -1.0, 1.0); return EE * max(0.0, 1.0 - pow(e, -((cutoffAngle - acos(c)) / steepness))); }
vec3 totalMie(float T) { float c = (0.2 * T) * 10E-18; return 0.434 * c * MieConst; }
void main() {
  vDir = position;
  vec4 p = projectionMatrix * modelViewMatrix * vec4(position + cameraPosition, 1.0);
  gl_Position = p; gl_Position.z = gl_Position.w; // always on the far plane
  vec3 s = normalize(sunDir);
  vSunE = sunIntensity(s.y);
  vSunfade = 1.0 - clamp(1.0 - exp(s.y * 450000.0 / 450000.0), 0.0, 1.0);
  float rc = rayleigh - (1.0 * (1.0 - vSunfade));
  vBetaR = totalRayleigh * rc;
  vBetaM = totalMie(turbidity) * mieCoefficient;
}`;

const SKY_FRAG = /* glsl */ `
uniform vec3 sunDir; uniform vec3 moonDir; uniform float mieDirectionalG; uniform float night; uniform float time;
uniform float cloudCover; uniform vec3 fogColor; uniform float exposure; uniform float horizonBlend; uniform float envScale;
varying vec3 vDir; varying float vSunfade; varying vec3 vBetaR; varying vec3 vBetaM; varying float vSunE;
const float pi = 3.141592653589793;
const float rayleighZenithLength = 8.4E3; const float mieZenithLength = 1.25E3;
const float sunAngularDiameterCos = 0.99995;
float rayleighPhase(float c) { return 0.05968310365946075 * (1.0 + c * c); }
float hgPhase(float c, float g) { float g2 = g * g; return 0.07957747154594767 * ((1.0 - g2) / pow(1.0 - 2.0 * g * c + g2, 1.5)); }
float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float hash3(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 45.164))) * 43758.5453); }
float noise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y); }
float fbm(vec2 p) { float v = 0.0, a = 0.5; mat2 r = mat2(0.8, 0.6, -0.6, 0.8); for (int i = 0; i < 5; i++) { v += a * noise(p); p = r * p * 2.03 + 11.7; a *= 0.5; } return v; }
void main() {
  vec3 d = normalize(vDir);
  vec3 up = vec3(0.0, 1.0, 0.0);
  vec3 s = normalize(sunDir);
  float zen = acos(max(0.0, d.y));
  float inv = 1.0 / (cos(zen) + 0.15 * pow(93.885 - ((zen * 180.0) / pi), -1.253));
  vec3 Fex = exp(-(vBetaR * rayleighZenithLength * inv + vBetaM * mieZenithLength * inv));
  float cosT = dot(d, s);
  vec3 bR = vBetaR * rayleighPhase(cosT * 0.5 + 0.5);
  vec3 bM = vBetaM * hgPhase(cosT, mieDirectionalG);
  vec3 Lin = pow(vSunE * ((bR + bM) / (vBetaR + vBetaM)) * (1.0 - Fex), vec3(1.5));
  Lin *= mix(vec3(1.0), pow(vSunE * ((bR + bM) / (vBetaR + vBetaM)) * Fex, vec3(0.5)), clamp(pow(1.0 - dot(up, s), 5.0), 0.0, 1.0));
  vec3 L0 = vec3(0.1) * Fex;
  float disk = smoothstep(sunAngularDiameterCos, sunAngularDiameterCos + 0.00003, cosT);
  L0 += (vSunE * 19000.0 * Fex) * disk;
  vec3 col = (Lin + L0) * 0.04 + vec3(0.0, 0.0003, 0.00075);
  col = pow(col, vec3(1.0 / (1.2 + (1.2 * vSunfade)))) * exposure;
  // night sky: deep blue gradient, stars, moon
  float hy = max(d.y, 0.0);
  vec3 nightCol = mix(vec3(0.035, 0.05, 0.10), vec3(0.006, 0.01, 0.028), pow(hy, 0.5));
  col = mix(col, nightCol, night);
  vec3 q = floor(d * 420.0);
  float st = step(0.9978, hash3(q)) * smoothstep(0.04, 0.35, hy);
  st *= 0.6 + 0.4 * sin(time * 3.0 + hash3(q + 7.0) * 40.0);
  float moon = smoothstep(0.9993, 0.9996, dot(d, normalize(moonDir)));
  float moonGlow = pow(max(dot(d, normalize(moonDir)), 0.0), 60.0) * 0.12;
  // clouds on a virtual plane
  float cl = 0.0; vec3 cloudCol = vec3(0.0);
  if (d.y > 0.0) {
    vec2 cp = d.xz / (d.y + 0.08) * 1.6 + vec2(time * 0.006, time * 0.0025);
    float n = fbm(cp);
    float n2 = fbm(cp * 2.7 + 3.1);
    float dens = smoothstep(1.0 - cloudCover, 1.0 - cloudCover + 0.32, n * 0.75 + n2 * 0.35);
    cl = dens * smoothstep(0.0, 0.18, d.y);
    // lighting: bright where facing the sun, darker bellies, warm at sunset
    float sunSide = pow(max(cosT, 0.0), 6.0);
    float elev = clamp(s.y, -0.2, 1.0);
    vec3 dayLit = mix(vec3(0.55, 0.6, 0.68), vec3(0.98, 0.98, 0.97), clamp(1.15 - n2 * 1.1, 0.0, 1.0));
    vec3 sunset = vec3(1.05, 0.52, 0.34);
    float ss = clamp(1.0 - elev / 0.32, 0.0, 1.0);
    vec3 lit = mix(dayLit, mix(dayLit * 0.55, sunset, 0.75), ss);
    lit += vec3(1.0, 0.85, 0.65) * sunSide * (0.4 + ss) * 0.5;
    vec3 nightLit = vec3(0.05, 0.06, 0.09) + vec3(0.06, 0.07, 0.09) * pow(max(dot(d, normalize(moonDir)), 0.0), 8.0);
    cloudCol = mix(lit, nightLit, night);
  }
  col = mix(col, cloudCol, cl * 0.92);
  col += vec3(st) * smoothstep(0.55, 1.0, night) * (1.0 - cl) + (vec3(1.0, 0.97, 0.88) * moon * 1.5 + vec3(0.6, 0.7, 0.9) * moonGlow) * night * (1.0 - cl * 0.85);
  // haze towards the horizon so fogged buildings melt into the sky
  float hb = 1.0 - smoothstep(-0.02, horizonBlend, d.y);
  col = mix(col, fogColor, hb);
  if (d.y < -0.02) col = fogColor;
  gl_FragColor = vec4(col * envScale, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

const C = (h) => new THREE.Color(h);
const lerp = (a, b, t) => a + (b - a) * t;

export class SkySystem {
  constructor(scene, renderer, quality) {
    this.scene = scene;
    this.renderer = renderer;
    this.uniforms = {
      sunDir: { value: new THREE.Vector3(0, 1, 0) },
      moonDir: { value: new THREE.Vector3(0.3, 0.6, 0.4) },
      rayleigh: { value: 1.6 },
      turbidity: { value: 6.5 },
      mieCoefficient: { value: 0.006 },
      mieDirectionalG: { value: 0.82 },
      night: { value: 0 },
      time: { value: 0 },
      cloudCover: { value: 0.46 },
      fogColor: { value: new THREE.Color('#c8d4e0') },
      exposure: { value: 0.5 },
      horizonBlend: { value: 0.06 },
      envScale: { value: 1 },
    };
    this.material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: SKY_VERT,
      fragmentShader: SKY_FRAG,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
    });
    const geo = new THREE.SphereGeometry(1, 48, 24);
    this.mesh = new THREE.Mesh(geo, this.material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = -1000;
    scene.add(this.mesh);
    // separate scene used only to bake the environment map
    this.envScene = new THREE.Scene();
    this.envScene.add(new THREE.Mesh(geo, this.material));
    this.pmrem = new THREE.PMREMGenerator(renderer);
    this.envRT = null;
    this._envKey = null;
    this._envT = 0;

    this.hemi = new THREE.HemisphereLight('#bcd4ff', '#4d4636', 0.5);
    scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight('#fff1de', 3);
    this.sun.castShadow = quality !== 'low'; // low / xlow: no shadows (GameLoop.applyQuality switches them later)
    this.shadowR = 85;
    this.setShadowQuality(quality);
    const sc = this.sun.shadow.camera;
    sc.near = 1;
    sc.far = 520;
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.04;
    scene.add(this.sun, this.sun.target);
    scene.fog = new THREE.FogExp2('#c8d4e0', 0.0021);
    this.night = 0;
    this.sunset = 0;
    this.elev = 1;
    this._L = new THREE.Vector3();
    this._right = new THREE.Vector3();
    this._upv = new THREE.Vector3();
  }
  setShadowQuality(q) {
    const size = q === 'high' ? 4096 : q === 'medium' ? 2048 : 1024;
    const R = q === 'low' ? 60 : this.shadowR;
    const s = this.sun.shadow;
    if (s.mapSize.x !== size) {
      s.mapSize.set(size, size);
      if (s.map) {
        s.map.dispose();
        s.map = null;
      }
    }
    const sc = s.camera;
    sc.left = -R;
    sc.right = R;
    sc.top = R;
    sc.bottom = -R;
    sc.updateProjectionMatrix();
    this._R = R;
    this._size = size;
    s.radius = q === 'high' ? 2 : 1;
  }
  // m: minutes since midnight; focus: point the shadow frustum follows
  update(dt, m, focus, time) {
    m = ((m % 1440) + 1440) % 1440;
    let night;
    if (m < 300) night = 1;
    else if (m < 400) night = 1 - (m - 300) / 100;
    else if (m < 1040) night = 0;
    else if (m < 1140) night = (m - 1040) / 100;
    else night = 1;
    night = night * night * (3 - 2 * night);
    this.night = night;
    const dayAng = ((m - 360) / 720) * Math.PI; // 6:00 -> 0 (east), 12:00 -> zenith, 18:00 -> west
    const elev = Math.sin(dayAng);
    this.elev = elev;
    const sunDir = new THREE.Vector3(-Math.cos(dayAng) * 0.86, elev, -0.42).normalize();
    const sunset = Math.max(0, 1 - Math.abs(elev) / 0.3) * (1 - night * 0.7);
    this.sunset = sunset;
    const moonDir = new THREE.Vector3(
      Math.cos(dayAng) * 0.7,
      Math.max(0.25, -elev * 0.8 + 0.2),
      0.45
    ).normalize();
    const U = this.uniforms;
    U.sunDir.value.copy(sunDir);
    U.moonDir.value.copy(moonDir);
    U.night.value = night;
    U.time.value = time;
    U.turbidity.value = lerp(3.2, 8, sunset);
    U.rayleigh.value = lerp(1.3, 2.5, sunset);
    // haze / fog colour (matches the sky near the horizon)
    const dayH = C('#b8cbe0'),
      setH = C('#e3a47f'),
      nightH = C('#121a2e');
    const fog = dayH.clone().lerp(setH, sunset).lerp(nightH, night);
    U.fogColor.value.copy(fog);
    this.scene.fog.color.copy(fog);
    this.scene.fog.density =
      lerp(0.00125, 0.0021, Math.max(sunset, night * 0.6)) * (this.fogK || 1); // thicker on low quality (shorter view distance)
    // sun / moon light
    const lightDir = elev > 0.04 ? sunDir : moonDir;
    const sunCol = C('#fff3e2').lerp(C('#ffb070'), sunset);
    if (elev > 0.04) {
      this.sun.color.copy(sunCol);
      this.sun.intensity = lerp(0.6, 3.1, Math.min(1, elev * 2.2)) * (1 - night * 0.85);
    } else {
      this.sun.color.set('#8fa6e0');
      this.sun.intensity = 0.28 * night + 0.06;
    }
    this.hemi.color.copy(
      C('#bcd4ff')
        .lerp(C('#ffc29a'), sunset * 0.5)
        .lerp(C('#4a5c90'), night)
    );
    this.hemi.groundColor.copy(C('#5a5242').lerp(C('#1a1a22'), night));
    this.hemi.intensity = lerp(0.55, 0.32, night);
    // shadow frustum follows the focus point, snapped to shadow texels (no shimmering)
    if (focus) {
      const L = this._L.copy(lightDir).normalize();
      const right = this._right.crossVectors(new THREE.Vector3(0, 1, 0), L).normalize();
      const upv = this._upv.crossVectors(L, right);
      const texel = (2 * this._R) / this._size;
      let a = focus.x * right.x + focus.z * right.z,
        b = focus.x * upv.x + (focus.y || 0) * upv.y + focus.z * upv.z;
      const c = focus.x * L.x + (focus.y || 0) * L.y + focus.z * L.z;
      a = Math.round(a / texel) * texel;
      b = Math.round(b / texel) * texel;
      const cx = right.x * a + upv.x * b + L.x * c,
        cy = right.y * a + upv.y * b + L.y * c,
        cz = right.z * a + upv.z * b + L.z * c;
      this.sun.target.position.set(cx, cy, cz);
      this.sun.position.set(cx + L.x * 260, cy + L.y * 260, cz + L.z * 260);
      this.sun.target.updateMatrixWorld();
    }
    // re-bake the environment map when the sky changed enough (throttled)
    this._envT -= dt;
    const key = `${Math.round(elev * 60)}:${Math.round(night * 30)}:${Math.round(sunset * 20)}`;
    if (key !== this._envKey && this._envT <= 0) {
      this._envKey = key;
      this._envT = 0.6;
      this.bakeEnv();
    }
  }
  bakeEnv() {
    const U = this.uniforms;
    const ex = U.envScale.value,
      hb = U.horizonBlend.value;
    U.envScale.value = 0.85;
    U.horizonBlend.value = 0.25;
    const old = this.envRT;
    this.envRT = this.pmrem.fromScene(this.envScene, 0.02, 0.1, 100);
    U.envScale.value = ex;
    U.horizonBlend.value = hb;
    this.scene.environment = this.envRT.texture;
    if (old) old.dispose();
  }
}
