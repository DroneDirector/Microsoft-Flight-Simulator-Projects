/* The sky of the 3D view: the real sun, moon (with its phase) and stars for the place and time you look at,
 * day and night with twilight in between, living water that reflects the sky, the sun and the moon, the lights
 * of airports, aircraft and towns at night. The time is the simulator's when linked, otherwise the real time. */

/* ---------- settings ---------- */
function skyOpt(k: string): boolean { return (State.settings as any)[k] !== false; }
function v3dWaterMode(): string { const v = (State.settings as any).v3dWater; return v === 'simple' || v === 'mirror' ? v : 'living'; }
/** The time the sky shows: the simulator's when linked (and switched on), otherwise now. */
function skyTime(): number {
  const L: any = typeof Link !== 'undefined' ? (Link as any).sim : null;
  if (skyOpt('v3dSimTime') && L && L.simTime && L.t && Date.now() - L.t < 20000) return L.simTime + (Date.now() - L.t);
  return Date.now();
}

/* ---------- where the sun and the moon are ---------- */
function astroD(ms: number): number { return ms / 86400000 + 2440587.5 - 2451545.0; }   // days from J2000
function astroSun(d: number): { ra: number; dec: number } {
  const g = (357.529 + 0.98560028 * d) * D2R, q = 280.459 + 0.98564736 * d;
  const L = (q + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g)) * D2R, e = (23.439 - 0.00000036 * d) * D2R;
  return { ra: Math.atan2(Math.cos(e) * Math.sin(L), Math.cos(L)) / D2R, dec: Math.asin(Math.sin(e) * Math.sin(L)) / D2R };
}
/** The moon (low precision, about a quarter of a degree): position and horizontal parallax. */
function astroMoon(d: number): { ra: number; dec: number; par: number } {
  const T = d / 36525, s = (a: number) => Math.sin(a * D2R), c = (a: number) => Math.cos(a * D2R);
  const lam = 218.32 + 481267.881 * T + 6.29 * s(135.0 + 477198.87 * T) - 1.27 * s(259.3 - 413335.36 * T) + 0.66 * s(235.7 + 890534.22 * T)
    + 0.21 * s(269.9 + 954397.74 * T) - 0.19 * s(357.5 + 35999.05 * T) - 0.11 * s(186.5 + 966404.03 * T);
  const bet = 5.13 * s(93.3 + 483202.02 * T) + 0.28 * s(228.2 + 960400.89 * T) - 0.28 * s(318.3 + 6003.15 * T) - 0.17 * s(217.6 - 407332.21 * T);
  const par = 0.9508 + 0.0518 * c(135.0 + 477198.87 * T) + 0.0095 * c(259.3 - 413335.36 * T) + 0.0078 * c(235.7 + 890534.22 * T) + 0.0028 * c(269.9 + 954397.74 * T);
  const e = (23.439 - 0.00000036 * d) * D2R, l = lam * D2R, b = bet * D2R;
  const x = Math.cos(b) * Math.cos(l), y = Math.cos(e) * Math.cos(b) * Math.sin(l) - Math.sin(e) * Math.sin(b), z = Math.sin(e) * Math.cos(b) * Math.sin(l) + Math.cos(e) * Math.sin(b);
  return { ra: Math.atan2(y, x) / D2R, dec: Math.asin(z) / D2R, par };
}
function astroLst(d: number, lon: number): number { return ((280.46061837 + 360.98564736629 * d + lon) % 360 + 360) % 360; }
/** Right ascension and declination seen from a place: altitude and azimuth (degrees, azimuth from north through east). */
function astroAltAz(ra: number, dec: number, lat: number, lst: number): { alt: number; az: number } {
  const H = (lst - ra) * D2R, f = lat * D2R, dl = dec * D2R;
  const alt = Math.asin(Math.sin(f) * Math.sin(dl) + Math.cos(f) * Math.cos(dl) * Math.cos(H));
  const az = Math.atan2(-Math.sin(H) * Math.cos(dl), Math.cos(f) * Math.sin(dl) - Math.sin(f) * Math.cos(dl) * Math.cos(H));
  return { alt: alt / D2R, az: ((az / D2R) + 360) % 360 };
}
function astroRefract(alt: number): number { return alt > -1.5 ? alt + 1.02 / Math.tan((alt + 10.3 / (alt + 5.11)) * D2R) / 60 : alt; }
/** Altitude/azimuth as a direction in the 3D view (x east, y up, z south). */
function astroVec(alt: number, az: number): number[] { const a = alt * D2R, z = az * D2R; return [Math.cos(a) * Math.sin(z), Math.sin(a), -Math.cos(a) * Math.cos(z)]; }

/* ---------- the sky's colour (the same in the sky, the fog and the water's reflections) ---------- */
const SKY_GLSL = `
uniform vec3 uSun; uniform vec3 uMoon; uniform float uSunAlt; uniform float uDay; uniform float uMoonK; uniform float uCloud;
vec3 skyCol(vec3 d) {
  float h = max(d.y, 0.0);
  vec3 zen = mix(vec3(0.006, 0.010, 0.026), vec3(0.17, 0.36, 0.74), uDay);
  vec3 hor = mix(vec3(0.022, 0.032, 0.058), vec3(0.64, 0.76, 0.90), uDay);
  float tw = clamp(1.0 - abs(uSunAlt + 0.02) * 6.0, 0.0, 1.0);
  vec2 dh = normalize(d.xz + 1e-5), sh = normalize(uSun.xz + 1e-5);
  float toward = pow(dot(dh, sh) * 0.5 + 0.5, 2.5);
  hor = mix(hor, vec3(1.0, 0.46, 0.18) * (0.3 + 0.7 * uDay), tw * (0.25 + 0.75 * toward) * 0.8);
  zen = mix(zen, zen * vec3(0.8, 0.75, 1.1), tw * 0.5);
  vec3 c = mix(hor, zen, pow(h, 0.42));
  float sd = max(dot(d, uSun), 0.0);
  c += vec3(1.0, 0.82, 0.58) * (pow(sd, 700.0) * 1.2 + pow(sd, 14.0) * 0.16 + pow(sd, 3.0) * 0.05 * tw) * smoothstep(-0.06, 0.03, uSunAlt);
  c += vec3(0.55, 0.6, 0.72) * pow(max(dot(d, uMoon), 0.0), 260.0) * 0.12 * uMoonK;
  float g = dot(c, vec3(0.33));
  c = mix(c, vec3(g) * 0.82, uCloud * 0.6);
  if (d.y < 0.0) c = mix(c, hor * 0.75, clamp(-d.y * 5.0, 0.0, 1.0));
  return c;
}`;
/** The same as the shader's skyCol, for the fog and the background (display values 0–1). */
function skyColJs(d: number[], u: any): number[] {
  const mix = (a: number[], b: number[], t: number) => a.map((v, i) => v + (b[i] - v) * t);
  const h = Math.max(d[1], 0), day = u.uDay.value, sa = u.uSunAlt.value, S = u.uSun.value;
  let zen = mix([0.006, 0.010, 0.026], [0.17, 0.36, 0.74], day), hor = mix([0.022, 0.032, 0.058], [0.64, 0.76, 0.90], day);
  const tw = clamp(1 - Math.abs(sa + 0.02) * 6, 0, 1);
  const dl = Math.hypot(d[0], d[2]) || 1, sl = Math.hypot(S.x, S.z) || 1, toward = Math.pow(((d[0] * S.x + d[2] * S.z) / dl / sl) * 0.5 + 0.5, 2.5);
  hor = mix(hor, [1.0, 0.46, 0.18].map(v => v * (0.3 + 0.7 * day)), tw * (0.25 + 0.75 * toward) * 0.8);
  zen = mix(zen, [zen[0] * 0.8, zen[1] * 0.75, zen[2] * 1.1], tw * 0.5);
  let c = mix(hor, zen, Math.pow(h, 0.42));
  const g = (c[0] + c[1] + c[2]) * 0.33; c = mix(c, [g * 0.82, g * 0.82, g * 0.82], u.uCloud.value * 0.6);
  return c;
}

/* ---------- state ---------- */
const V3dSky: any = {
  U: null, dome: null, sun: null, moon: null, stars: null, rt: null, mcam: null, astroAt: 0, dimAt: 0, a: null, tint: [1, 1, 1], amb: 1,
};
function v3dSkyUniforms(): any {
  if (V3dSky.U) return V3dSky.U;
  const T = THREE;
  V3dSky.U = {
    uSun: { value: new T.Vector3(0, 1, 0) }, uMoon: { value: new T.Vector3(0, -1, 0) }, uSunAlt: { value: 0.7 }, uDay: { value: 1 }, uMoonK: { value: 0 }, uCloud: { value: 0 },
    uSunCol: { value: new T.Color(1, 1, 1) }, uSunVis: { value: 1 }, uMoonVis: { value: 0 }, uAmb: { value: 1 }, uNight: { value: 0 },
    uTime: { value: 0 }, uWind: { value: 0.3 }, uWindDir: { value: 0 }, uWater: { value: 1 }, uMirror: { value: 0 }, uMirrorPass: { value: 0 },
    uMirrorTex: { value: null }, uMirrorMat: { value: new T.Matrix4() }, uLightsOn: { value: 0 }, uPxScale: { value: 800 }, uGlow: { value: 1 },
  };
  return V3dSky.U;
}

/* ---------- the ground's material: the map or the satellite picture, with living water and town lights ---------- */
/** A ring's water as a picture: sea and lakes white, land black (soft at the coast). */
function v3dWetTexture(size: number, wet: (i: number) => number): any {
  const n = Math.min(640, size), cv = document.createElement('canvas'); cv.width = cv.height = n;
  const g = cv.getContext('2d'), img = g.createImageData(n, n), D = img.data, k = size / n;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { const v = wet(Math.floor(y * k) * size + Math.floor(x * k)), o = (y * n + x) * 4; D[o] = D[o + 1] = D[o + 2] = v; D[o + 3] = 255; }
  g.putImageData(img, 0, 0);
  const T = THREE, tex = new T.CanvasTexture(cv); tex.generateMipmaps = true; tex.minFilter = T.LinearMipmapLinearFilter; tex.magFilter = T.LinearFilter;
  return tex;
}
function v3dGroundMat(map: any, wetTex: any): any {
  const T = THREE, U = v3dSkyUniforms();
  const m = new T.MeshBasicMaterial({ map });
  const own = { uWet: { value: wetTex }, uCity: { value: null as any }, uCityOn: { value: 0 } };
  m.userData.u = own; m.userData.ground = true;
  m.onBeforeCompile = (sh: any) => {
    Object.assign(sh.uniforms, U, own);
    sh.vertexShader = 'varying vec3 vWpos; varying vec2 vUv2;\n' + sh.vertexShader.replace('#include <fog_vertex>', 'vWpos = (modelMatrix * vec4(position, 1.0)).xyz; vUv2 = uv;\n#include <fog_vertex>');
    sh.fragmentShader = `varying vec3 vWpos; varying vec2 vUv2;
uniform sampler2D uWet; uniform sampler2D uCity; uniform float uCityOn;
uniform vec3 uSunCol; uniform float uSunVis; uniform float uMoonVis; uniform float uAmb; uniform float uNight; uniform float uTime;
uniform float uWind; uniform float uWindDir; uniform float uWater; uniform float uMirror; uniform float uMirrorPass; uniform sampler2D uMirrorTex; uniform mat4 uMirrorMat;
${SKY_GLSL}
` + sh.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
{
  float wet = texture2D(uWet, vUv2).r;
  if (uMirrorPass > 0.5 && wet > 0.5) discard;
  vec3 cityL = vec3(0.0);
  if (uCityOn > 0.5 && uNight > 0.01) { vec3 cc = texture2D(uCity, vUv2).rgb; float lum = max(dot(cc, vec3(0.35, 0.45, 0.2)) - 0.09, 0.0) / 0.91; cityL = vec3(1.0, 0.7, 0.36) * pow(lum, 1.5) * 1.5 * uNight * (1.0 - smoothstep(0.3, 0.6, wet)); }
  if (uWater > 0.5 && wet > 0.25) {
    vec3 V = normalize(cameraPosition - vWpos); float dist = length(cameraPosition - vWpos); vec2 P = vWpos.xz; float w = uWind;
    vec2 g = vec2(0.0);
    float foot = dist * 0.0012 / max(V.y, 0.03);   // the size of a pixel on the water there (long at a low angle)
    // many waves of different lengths and directions (so no pattern shows), each faded out where it
    // would be smaller than a few pixels on screen
    for (int i = 0; i < 9; i++) {
      float fi = float(i), r1 = fract(sin(fi * 12.9898) * 43758.5453), r2 = fract(sin(fi * 78.233) * 12345.678);
      float lam = 150.0 * pow(0.62, fi) * mix(0.6, 1.3, w) * (0.85 + 0.3 * r1);
      float ang = uWindDir + (r2 - 0.5) * 2.2;
      vec2 dir = vec2(cos(ang), sin(ang)); float k = 6.2831853 / lam;
      float ph = dot(dir, P) * k - uTime * sqrt(9.81 * k) + r1 * 6.2831853;
      float amp = mix(0.03, 0.13, w) * smoothstep(foot * 5.0, foot * 18.0, lam);
      g += dir * cos(ph) * amp;
    }
    vec3 N = normalize(vec3(-g.x, 1.0, -g.y));
    float F = 0.02 + 0.98 * pow(1.0 - max(dot(N, V), 0.0), 5.0);
    vec3 R = reflect(-V, N); R.y = abs(R.y) + 0.002; R = normalize(R);
    vec3 refl = pow(skyCol(R), vec3(2.2));
    if (uMirror > 0.5) { vec4 mp = uMirrorMat * vec4(vWpos, 1.0); vec2 st = mp.xy / mp.w * 0.5 + 0.5 + N.xz * 0.05; if (mp.w > 0.0 && st.x > 0.0 && st.x < 1.0 && st.y > 0.0 && st.y < 1.0) refl = texture2D(uMirrorTex, st).rgb; }
    vec3 body = vec3(0.006, 0.03, 0.045) * uAmb;
    vec3 wc = mix(body, refl, F);
    float shn = mix(2200.0, 260.0, w);
    wc += uSunCol * pow(max(dot(R, uSun), 0.0), shn) * mix(40.0, 7.0, w) * uSunVis;
    wc += vec3(0.55, 0.6, 0.7) * pow(max(dot(R, uMoon), 0.0), shn * 0.6) * mix(3.0, 1.0, w) * uMoonVis;
    float shore = smoothstep(0.28, 0.45, wet) * (1.0 - smoothstep(0.45, 0.7, wet));
    float surf = shore * (0.55 + 0.45 * sin(dot(P, vec2(0.11, 0.07)) - uTime * 1.3)) * (0.35 + w);
    wc = mix(wc, vec3(0.85) * uAmb, clamp(surf, 0.0, 0.7));
    diffuseColor.rgb = mix(diffuseColor.rgb, wc, smoothstep(0.3, 0.6, wet));
  }
  diffuseColor.rgb += cityL;
}`);
  };
  m.customProgramCacheKey = () => 'v3d-ground';
  return m;
}

/* ---------- town lights at night (NASA Black Marble, public domain) ---------- */
const CITY_URLS = [
  'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_Black_Marble/default/2016-01-01/GoogleMapsCompatible_Level8/{z}/{y}/{x}.png',
  'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_CityLights_2012/default/2012-01-01/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpg',
];
function v3dCityLoad(r: any) {
  if (!skyOpt('v3dCity') || !r.mesh) { r.cityDone = true; return; }
  const gen = V3dTerrain.gen, zc = Math.min(8, r.z), sh = r.z - zc;
  const x0 = r.x0 >> sh, y0 = r.y0 >> sh, x1 = (r.x0 + r.N - 1) >> sh, y1 = (r.y0 + r.N - 1) >> sh, M = Math.max(x1 - x0, y1 - y0) + 1;
  const tryUrl = (k: number) => {
    if (k >= CITY_URLS.length) { r.cityDone = true; return; }
    V3dTerrain.tiles(CITY_URLS[k], zc, x0, y0, M, 'city').then((cv: HTMLCanvasElement) => {
      if (gen !== V3dTerrain.gen || !V3d.open || !r.mesh) { r.cityDone = true; return; }
      if (!cv) { tryUrl(k + 1); return; }
      // the part of the tiles the ring covers
      const out = document.createElement('canvas'); out.width = out.height = 512;
      const f = 256 / (1 << sh), sx = (r.x0 / (1 << sh) - x0) * 256, sy = (r.y0 / (1 << sh) - y0) * 256;
      out.getContext('2d').drawImage(cv, sx, sy, r.N * f, r.N * f, 0, 0, 512, 512);
      const T = THREE, tex = new T.CanvasTexture(out); tex.generateMipmaps = true; tex.minFilter = T.LinearMipmapLinearFilter;
      const u = r.mesh.material.userData.u; if (u) { u.uCity.value = tex; u.uCityOn.value = 1; }
      r.cityTex = tex; r.cityDone = true;
    });
  };
  tryUrl(0);
}

/* ---------- the sky's objects ---------- */
const SKY_BILLBOARD_VS = `
#include <common>
#include <logdepthbuf_pars_vertex>
uniform float uSize; varying vec2 vUv;
void main() {
  vUv = uv;
  vec4 mv = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
  mv.xy += position.xy * uSize;
  gl_Position = projectionMatrix * mv;
  #include <logdepthbuf_vertex>
}`;
const SUN_GLOW = 14;   // the sun's picture reaches this many sun radii (the disc in the middle, its glow around it)
const MOON_GLOW = 1.6;
function v3dSkyInit() {
  const T = THREE, U = v3dSkyUniforms(), sc = V3d.scene;
  // the sky: a dome around the camera, drawn first, behind everything
  const dome = new T.Mesh(new T.SphereGeometry(1, 48, 24), new T.ShaderMaterial({
    uniforms: U, side: T.BackSide, depthTest: false, depthWrite: false, fog: false,
    vertexShader: 'varying vec3 vDir; void main() { vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: SKY_GLSL + '\nvarying vec3 vDir; void main() { vec3 c = skyCol(normalize(vDir)); c += (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) / 255.0; gl_FragColor = vec4(c, 1.0); }',
  }));
  dome.renderOrder = -1000; dome.frustumCulled = false; sc.add(dome); V3dSky.dome = dome;
  // the sun: its disc at its true size (about half a degree), and the glow around it
  const sun = new T.Mesh(new T.PlaneGeometry(1, 1), new T.ShaderMaterial({
    uniforms: { uSize: { value: 1 }, uCol: { value: new T.Color(1, 1, 1) }, uVis: { value: 1 } }, transparent: true, depthWrite: false, blending: T.AdditiveBlending, fog: false,
    vertexShader: SKY_BILLBOARD_VS,
    fragmentShader: `#include <common>
#include <logdepthbuf_pars_fragment>
uniform vec3 uCol; uniform float uVis; varying vec2 vUv;
void main() {
  #include <logdepthbuf_fragment>
  float r = length(vUv - 0.5) * 2.0 * ${SUN_GLOW.toFixed(1)};
  float disc = 1.0 - smoothstep(0.92, 1.06, r), limb = 0.62 + 0.38 * sqrt(max(0.0, 1.0 - min(r, 1.0) * min(r, 1.0)));
  float glow = exp(-r * 0.42) * 0.42 + exp(-r * 0.11) * 0.1;
  vec3 c = uCol * (disc * limb * 2.2 + glow);
  gl_FragColor = vec4(c, uVis * clamp(disc + glow * 1.4, 0.0, 1.0) * (1.0 - smoothstep(0.85, 1.0, length(vUv - 0.5) * 2.0)));
}` }));
  sun.renderOrder = -990; sun.frustumCulled = false; sc.add(sun); V3dSky.sun = sun;
  // the moon: a lit ball, its phase from where the sun is, and faint dark patches (the seas)
  const moon = new T.Mesh(new T.PlaneGeometry(1, 1), new T.ShaderMaterial({
    uniforms: { uSize: { value: 1 }, uL: { value: new T.Vector3(0, 0, 1) }, uVis: { value: 1 }, uDayK: { value: 0 }, uIllum: { value: 1 } }, transparent: true, depthWrite: false, fog: false,
    vertexShader: SKY_BILLBOARD_VS,
    fragmentShader: `#include <common>
#include <logdepthbuf_pars_fragment>
uniform vec3 uL; uniform float uVis; uniform float uDayK; uniform float uIllum; varying vec2 vUv;
float mare(vec2 p, vec2 c, float r) { return 1.0 - smoothstep(r * 0.6, r, length(p - c)); }
void main() {
  #include <logdepthbuf_fragment>
  vec2 p = (vUv - 0.5) * 2.0 * ${MOON_GLOW.toFixed(1)}; float r = length(p);
  vec3 n = vec3(p, sqrt(max(0.0, 1.0 - r * r)));
  float lit = smoothstep(-0.06, 0.1, dot(n, normalize(uL)));
  float m = mare(p, vec2(-0.3, 0.35), 0.3) + mare(p, vec2(0.12, 0.33), 0.18) + mare(p, vec2(0.28, 0.1), 0.22) + mare(p, vec2(-0.5, 0.0), 0.36)
          + mare(p, vec2(-0.15, -0.35), 0.2) + mare(p, vec2(0.5, -0.06), 0.15) + mare(p, vec2(0.62, 0.3), 0.11);
  float alb = 1.0 - 0.22 * clamp(m, 0.0, 1.0);
  float disc = 1.0 - smoothstep(0.97, 1.01, r);
  vec3 c = vec3(0.97, 0.95, 0.9) * alb;
  c = mix(c, vec3(0.86, 0.9, 1.0), uDayK * 0.35);
  float a = disc * clamp(lit * mix(1.0, 0.5, uDayK) + 0.035 * (1.0 - uDayK), 0.0, 1.0);
  float glow = r > 1.0 ? exp(-(r - 1.0) * 5.0) * 0.14 * uIllum * (1.0 - uDayK) : 0.0;
  gl_FragColor = vec4(c, (a + glow) * uVis);
}` }));
  moon.renderOrder = -989; moon.frustumCulled = false; sc.add(moon); V3dSky.moon = moon;
  // the stars: the real ones, brighter ones bigger, in their colours; they turn with the sky
  const N = STARS.length / 4, pos = new Float32Array(N * 3), col = new Float32Array(N * 3), size = new Float32Array(N), br = new Float32Array(N);
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  for (let i = 0; i < N; i++) {
    const ra = STARS[i * 4] * D2R, dec = STARS[i * 4 + 1] * D2R, mag = STARS[i * 4 + 2], bv = STARS[i * 4 + 3];
    pos[i * 3] = Math.cos(dec) * Math.cos(ra); pos[i * 3 + 1] = Math.cos(dec) * Math.sin(ra); pos[i * 3 + 2] = Math.sin(dec);
    const t = clamp((bv + 0.3) / 2.0, 0, 1), c = t < 0.45 ? [0.72 + t * 0.6, 0.8 + t * 0.4, 1] : [1, 1 - (t - 0.45) * 0.5, 1 - (t - 0.45) * 1.1];
    col[i * 3] = c[0]; col[i * 3 + 1] = c[1]; col[i * 3 + 2] = Math.max(0.4, c[2]);
    size[i] = (1.0 + 2.6 * clamp((5.6 - mag) / 7, 0, 1)) * dpr; br[i] = clamp(Math.pow(10, -0.4 * (mag - 2.2)), 0.2, 1.8);
  }
  const geo = new T.BufferGeometry();
  geo.setAttribute('position', new T.BufferAttribute(pos, 3)); geo.setAttribute('color', new T.BufferAttribute(col, 3));
  geo.setAttribute('aSize', new T.BufferAttribute(size, 1)); geo.setAttribute('aB', new T.BufferAttribute(br, 1));
  const stars = new T.Points(geo, new T.ShaderMaterial({
    uniforms: { uNight: U.uNight, uTime: U.uTime, uCloud: U.uCloud }, transparent: true, depthWrite: false, blending: T.AdditiveBlending, fog: false, vertexColors: true,
    vertexShader: `#include <common>
#include <logdepthbuf_pars_vertex>
attribute float aSize; attribute float aB; uniform float uTime; varying vec3 vCol; varying float vB;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0); vec3 dir = normalize(wp.xyz - cameraPosition);
  float tw = 0.82 + 0.18 * sin(uTime * (2.0 + fract(position.x * 91.7) * 3.0) + position.y * 400.0);
  vCol = color; vB = aB * tw * smoothstep(-0.01, 0.16, dir.y);
  gl_PointSize = aSize;
  gl_Position = projectionMatrix * viewMatrix * wp;
  #include <logdepthbuf_vertex>
}`,
    fragmentShader: `#include <common>
#include <logdepthbuf_pars_fragment>
uniform float uNight; uniform float uCloud; varying vec3 vCol; varying float vB;
void main() {
  #include <logdepthbuf_fragment>
  float d = length(gl_PointCoord - 0.5) * 2.0;
  gl_FragColor = vec4(vCol, smoothstep(1.0, 0.15, d) * vB * uNight * (1.0 - 0.85 * uCloud));
}` }));
  stars.renderOrder = -995; stars.frustumCulled = false; stars.matrixAutoUpdate = false; sc.add(stars); V3dSky.stars = stars;
  V3dSky.astroAt = 0; V3dSky.dimAt = 0;
}
function v3dSkyClear() {
  if (V3dSky.rt) { try { V3dSky.rt.dispose(); } catch (e) { /* gone */ } }
  V3dSky.dome = V3dSky.sun = V3dSky.moon = V3dSky.stars = V3dSky.rt = V3dSky.mcam = null;
}

/** The weather nearest the view: wind (0–1 and the direction it blows to) and how overcast it is. */
function v3dSkyWeather(lon: number, lat: number): { wind: number; dir: number; cloud: number } {
  const L: any = typeof Link !== 'undefined' ? (Link as any).sim : null;
  let kt = -1, from = 0, cloud = 0;
  if (L && L.wx && L.lat && gcDistanceNm([L.lon, L.lat], [lon, lat]) < 30) { kt = L.wx.windKt; from = L.wx.windDir; }
  let best = 1e9, w: any = null; const cache: any = LiveWx.cache;
  for (const k in cache) { const A = apt(k); if (!A) continue; const d = gcDistanceNm(A.pos, [lon, lat]); if (d < best && d < 120) { best = d; w = cache[k]; } }
  if (w) {
    if (kt < 0) { kt = w.kt || 0; from = w.dir >= 0 ? w.dir : 0; }
    for (const c of w.clouds || []) cloud = Math.max(cloud, c.cover === 'OVC' ? 1 : c.cover === 'BKN' ? 0.6 : c.cover === 'SCT' ? 0.2 : 0);
  }
  if (kt < 0) kt = 8;
  // the waves run with the wind: towards where it blows (x east, z south)
  const to = (from + 180) * D2R;
  return { wind: clamp(kt / 32, 0, 1), dir: Math.atan2(-Math.cos(to), Math.sin(to)), cloud };
}

/** Each frame: the sun, moon and stars where they are now, the light and colours to match, the water, the mirror picture. */
function v3dSkyStep(now: number) {
  const T = THREE, U = v3dSkyUniforms(), cam = V3d.cam; if (!cam || !V3d.origin) return;
  if (!V3dSky.dome || V3dSky.dome.parent !== V3d.scene) v3dSkyInit();
  U.uTime.value = now / 1000;
  const ll = v3dLonLat(cam.position.x, cam.position.z), dn = skyOpt('v3dDayNight');
  // the sun and the moon: worked out a few times a second (they move slowly, but you may fly fast)
  if (!V3dSky.a || now - V3dSky.astroAt > 400) {
    V3dSky.astroAt = now;
    const t = skyTime(), d = astroD(t), lst = astroLst(d, ll[0]);
    const s = astroSun(d), sp = astroAltAz(s.ra, s.dec, ll[1], lst);
    const m = astroMoon(d), mp = astroAltAz(m.ra, m.dec, ll[1], lst);
    const mAlt = mp.alt - m.par * Math.cos(mp.alt * D2R);   // seen from the surface, not the centre of the Earth
    let sunAlt = astroRefract(sp.alt), moonAlt = astroRefract(mAlt);
    if (!dn) { sunAlt = Math.max(sunAlt, 38); moonAlt = -30; }
    const sv = astroVec(sunAlt, sp.az), mv = astroVec(moonAlt, mp.az);
    const el = Math.acos(clamp(sv[0] * mv[0] + sv[1] * mv[1] + sv[2] * mv[2], -1, 1)), illum = (1 - Math.cos(el)) / 2;
    // the stars: the sky's turning as one rotation (the equator's axes as seen from here)
    const e = (ra: number, dec: number) => { const q = astroAltAz(ra, dec, ll[1], lst); return astroVec(q.alt, q.az); };
    const ex = e(0, 0), ey = e(90, 0), ez = e(0, 90);
    const wx = v3dSkyWeather(ll[0], ll[1]);
    V3dSky.a = { sunAlt, moonAlt, sv, mv, illum, ex, ey, ez, wx };
  }
  const A = V3dSky.a, sunAlt = A.sunAlt, moonAlt = A.moonAlt;
  const sstep = (a: number, b: number, x: number) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  U.uSun.value.set(A.sv[0], A.sv[1], A.sv[2]); U.uMoon.value.set(A.mv[0], A.mv[1], A.mv[2]);
  U.uSunAlt.value = Math.sin(sunAlt * D2R);
  U.uDay.value = Math.pow(sstep(-12, 8, sunAlt), 1.4);
  U.uCloud.value = A.wx.cloud; U.uWind.value = A.wx.wind; U.uWindDir.value = A.wx.dir;
  const sunVis = sstep(-1.2, 1.5, sunAlt) * (1 - 0.85 * A.wx.cloud), moonUp = sstep(-1, 2, moonAlt);
  U.uSunVis.value = sunVis;
  U.uMoonK.value = moonUp * A.illum * (1 - U.uDay.value);
  U.uMoonVis.value = moonUp * A.illum * (1 - sstep(-6, 4, sunAlt)) * (1 - 0.8 * A.wx.cloud) * 0.6;
  U.uNight.value = 1 - sstep(-14, -3, sunAlt);
  // the sun's colour: white high up, gold and then red near the horizon
  const ts = sstep(0, 22, sunAlt), sunCol = [1, 0.45 + 0.53 * ts, 0.18 + 0.74 * ts];
  U.uSunCol.value.setRGB(sunCol[0], sunCol[1], sunCol[2], T.SRGBColorSpace);
  // the light on everything: daylight, warm at sunset, blue-grey moonlight at night
  const day = sstep(-7, 14, sunAlt) * (1 - 0.32 * A.wx.cloud), moon = U.uMoonK.value * 0.09, amb = 0.055 + day * 0.945 + moon;
  const warm = clamp(1 - Math.abs(sunAlt - 2) / 10, 0, 1) * (1 - A.wx.cloud * 0.7);
  const nightTint = [0.62, 0.7, 0.95], dayTint = [1, 1, 1], warmTint = [1, 0.8, 0.62];
  const tint = [0, 1, 2].map(i => (nightTint[i] + (dayTint[i] - nightTint[i]) * sstep(-6, 6, sunAlt)) * (1 - warm * 0.6) + warmTint[i] * warm * 0.6);
  V3dSky.amb = amb; V3dSky.tint = tint;
  U.uAmb.value = amb * amb;   // as linear light
  U.uLightsOn.value = 1 - sstep(-2, 5, sunAlt) * (1 - A.wx.cloud * 0.6);
  U.uGlow.value = 0.45 + 0.55 * U.uNight.value;
  U.uWater.value = v3dWaterMode() === 'simple' ? 0 : 1;
  // the lights of the scene
  const H: any = (V3d as any).hemi, D: any = (V3d as any).sunL;
  if (H) { H.intensity = 1.6 * amb; H.color.setRGB(0.87 * tint[0], 0.91 * tint[1], tint[2], T.SRGBColorSpace); H.groundColor.setRGB(0.13 * tint[0], 0.2 * tint[1], 0.28 * tint[2], T.SRGBColorSpace); }
  if (D) {
    if (sunVis > 0.02 || !(moonUp > 0)) { D.intensity = 1.9 * sunVis; D.color.setRGB(sunCol[0], sunCol[1], sunCol[2], T.SRGBColorSpace); D.position.set(A.sv[0] * 1e4, Math.max(0.05, A.sv[1]) * 1e4, A.sv[2] * 1e4); }
    else { D.intensity = 0.35 * A.illum * moonUp * (1 - A.wx.cloud * 0.8); D.color.setRGB(0.62, 0.7, 0.9, T.SRGBColorSpace); D.position.set(A.mv[0] * 1e4, Math.max(0.05, A.mv[1]) * 1e4, A.mv[2] * 1e4); }
  }
  // the fog and the background take the colour of the horizon in front of you
  const fwd = new T.Vector3(0, 0, -1).applyQuaternion(cam.quaternion); fwd.y = 0; if (fwd.lengthSq() < 1e-6) fwd.set(0, 0, -1); fwd.normalize();
  const hc = skyColJs([fwd.x, 0.02, fwd.z], U);
  if (V3d.scene.fog) V3d.scene.fog.color.setRGB(hc[0], hc[1], hc[2], T.SRGBColorSpace);
  if (V3d.scene.background && V3d.scene.background.isColor) V3d.scene.background.setRGB(hc[0], hc[1], hc[2], T.SRGBColorSpace);
  // the sky's objects follow the camera
  const far = cam.far, Dd = far * 0.86, cp = cam.position;
  V3dSky.dome.position.copy(cp); V3dSky.dome.scale.setScalar(far * 0.9);
  const show = skyOpt('v3dSky');
  V3dSky.sun.visible = show && sunAlt > -2;
  V3dSky.sun.position.set(cp.x + A.sv[0] * Dd, cp.y + A.sv[1] * Dd, cp.z + A.sv[2] * Dd);
  V3dSky.sun.material.uniforms.uSize.value = 2 * Dd * Math.tan(0.2666 * D2R) * SUN_GLOW;
  V3dSky.sun.material.uniforms.uCol.value.setRGB(sunCol[0], sunCol[1], sunCol[2]);
  V3dSky.sun.material.uniforms.uVis.value = sstep(-1.5, 0.5, sunAlt) * (1 - 0.92 * A.wx.cloud);
  V3dSky.moon.visible = show && moonAlt > -1;
  V3dSky.moon.position.set(cp.x + A.mv[0] * Dd * 0.98, cp.y + A.mv[1] * Dd * 0.98, cp.z + A.mv[2] * Dd * 0.98);
  V3dSky.moon.material.uniforms.uSize.value = 2 * Dd * 0.98 * Math.tan(0.259 * D2R) * MOON_GLOW;
  const Lv = new T.Vector3(A.sv[0], A.sv[1], A.sv[2]).transformDirection(cam.matrixWorldInverse);
  V3dSky.moon.material.uniforms.uL.value.copy(Lv);
  V3dSky.moon.material.uniforms.uDayK.value = U.uDay.value;
  V3dSky.moon.material.uniforms.uIllum.value = A.illum;
  V3dSky.moon.material.uniforms.uVis.value = sstep(-1, 1, moonAlt) * (1 - 0.9 * A.wx.cloud);
  V3dSky.stars.visible = show && U.uNight.value > 0.01;
  if (V3dSky.stars.visible) {
    const M = new T.Matrix4().makeBasis(new T.Vector3(A.ex[0], A.ex[1], A.ex[2]), new T.Vector3(A.ey[0], A.ey[1], A.ey[2]), new T.Vector3(A.ez[0], A.ez[1], A.ez[2]));
    V3dSky.stars.matrix.makeTranslation(cp.x, cp.y, cp.z).multiply(M).multiply(new T.Matrix4().makeScale(Dd * 0.97, Dd * 0.97, Dd * 0.97));
    V3dSky.stars.matrixWorldNeedsUpdate = true;
  }
  // the size of a light's glow on screen
  U.uPxScale.value = (V3d.r ? V3d.r.domElement.height : 800) / (2 * Math.tan(cam.fov * D2R / 2));
  // the clouds take the light too
  try {
    const C: any = V3dClouds.mesh; if (C) {
      const k = 0.08 + 0.92 * sstep(-8, 10, sunAlt) + U.uMoonK.value * 0.08;
      C.material.uniforms.uLight.value.setRGB(0.97 * k * (tint[0] * 0.7 + 0.3), 0.98 * k * (tint[1] * 0.7 + 0.3), k * (tint[2] * 0.7 + 0.3));
      C.material.uniforms.uDark.value.setRGB(0.5 * k * tint[0], 0.55 * k * tint[1], 0.63 * k * tint[2]);
    }
  } catch (e) { /* no clouds */ }
  // everything drawn without lighting (the ground, runways, the airport's paint) is dimmed and tinted the same way
  if (now - V3dSky.dimAt > 300) {
    V3dSky.dimAt = now;
    const k = [tint[0] * amb, tint[1] * amb, tint[2] * amb];
    V3d.scene.traverse((o: any) => {
      const ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
      for (const m of ms) {
        if (!m || !(m.isMeshBasicMaterial || m.isSpriteMaterial) || m.userData.noDim) continue;
        if (!m.userData.c0) m.userData.c0 = m.color.clone();
        m.color.setRGB(m.userData.c0.r * k[0], m.userData.c0.g * k[1], m.userData.c0.b * k[2]);
      }
    });
  }
  // the mirror: the scene seen from under the water's surface, for the reflections (fast computers)
  const mirror = v3dWaterMode() === 'mirror';
  U.uMirror.value = mirror ? 1 : 0;
  if (mirror && V3d.r) {
    const R = V3d.r, w = Math.max(64, Math.floor(R.domElement.width / 2)), h = Math.max(64, Math.floor(R.domElement.height / 2));
    if (!V3dSky.rt || V3dSky.rt.width !== w || V3dSky.rt.height !== h) {
      if (V3dSky.rt) V3dSky.rt.dispose();
      V3dSky.rt = new T.WebGLRenderTarget(w, h); V3dSky.rt.texture.colorSpace = T.SRGBColorSpace;
      V3dSky.mcam = new T.PerspectiveCamera();
    }
    const mc = V3dSky.mcam; mc.copy(cam);
    const p = cam.position.clone(); p.y = -p.y;
    const f = new T.Vector3(0, 0, -1).applyQuaternion(cam.quaternion); f.y = -f.y;
    const up = new T.Vector3(0, 1, 0).applyQuaternion(cam.quaternion); up.y = -up.y;
    mc.position.copy(p); mc.up.copy(up); mc.lookAt(p.clone().add(f)); mc.updateMatrixWorld(); mc.updateProjectionMatrix();
    U.uMirrorMat.value.multiplyMatrices(mc.projectionMatrix, mc.matrixWorldInverse);
    U.uMirrorPass.value = 1;
    R.setRenderTarget(V3dSky.rt); R.render(V3d.scene, mc); R.setRenderTarget(null);
    U.uMirrorPass.value = 0; U.uMirrorTex.value = V3dSky.rt.texture;
  }
}

/* ---------- airport lights ---------- */
function v3dLightPoints(pos: number[], col: number[], size: number[], kind?: number[], dir?: number[], phase?: number[]): any {
  const T = THREE, U = v3dSkyUniforms(), geo = new T.BufferGeometry(), n = size.length;
  geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); geo.setAttribute('color', new T.Float32BufferAttribute(col, 3));
  geo.setAttribute('aSize', new T.Float32BufferAttribute(size, 1));
  geo.setAttribute('aKind', new T.Float32BufferAttribute(kind || new Array(n).fill(0), 1));
  geo.setAttribute('aDir', new T.Float32BufferAttribute(dir || new Array(n * 3).fill(0), 3));
  geo.setAttribute('aPhase', new T.Float32BufferAttribute(phase || new Array(n).fill(0), 1));
  const mat = new T.ShaderMaterial({
    uniforms: { uOn: U.uLightsOn, uScale: U.uPxScale, uTime: U.uTime, uGlow: U.uGlow, uFlags: { value: new T.Vector4(1, 1, 1, 0) }, uAlways: { value: 0 } },
    transparent: true, depthWrite: false, blending: T.AdditiveBlending, vertexColors: true, fog: false,
    vertexShader: `#include <common>
#include <logdepthbuf_pars_vertex>
attribute float aSize; attribute float aKind; attribute vec3 aDir; attribute float aPhase;
uniform float uScale; uniform float uTime; uniform vec4 uFlags; varying vec3 vCol; varying float vOn;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  float on = uFlags.x;
  if (aKind > 0.5 && aKind < 1.5) { float ph = fract(uTime * 0.9 + aPhase); on = (step(ph, 0.05) + step(0.12, ph) * step(ph, 0.17)) * uFlags.y; }
  else if (aKind > 1.5 && aKind < 2.5) { float ph = fract(uTime * 0.8 + aPhase); on = step(ph, 0.14) * uFlags.z; }
  else if (aKind > 2.5) { vec3 wd = normalize(mat3(modelMatrix) * aDir); vec3 tc = normalize(cameraPosition - wp.xyz); on = uFlags.w * (0.15 + 2.6 * pow(max(dot(wd, tc), 0.0), 8.0)); }
  vOn = on; vCol = color;
  vec4 mv = viewMatrix * wp;
  gl_PointSize = clamp(aSize * (aKind > 2.5 ? 1.0 + on : 1.0) * uScale / max(1.0, -mv.z), 1.6, 34.0);
  gl_Position = projectionMatrix * mv;
  #include <logdepthbuf_vertex>
}`,
    fragmentShader: `#include <common>
#include <logdepthbuf_pars_fragment>
uniform float uOn; uniform float uGlow; uniform float uAlways; varying vec3 vCol; varying float vOn;
void main() {
  #include <logdepthbuf_fragment>
  float d = length(gl_PointCoord - 0.5) * 2.0;
  float a = (exp(-d * d * 5.0) + 0.6 * exp(-d * d * 40.0)) * vOn * max(uOn, uAlways) * uGlow;
  gl_FragColor = vec4(vCol * 1.4, clamp(a, 0.0, 1.0));
}` });
  const pts = new T.Points(geo, mat); pts.frustumCulled = false; pts.renderOrder = 20;
  return pts;
}
/** The lights of an airport from its layout: runway edges, centre lines, thresholds and approach lights, taxiway centre and edge lights, apron floodlights. */
function v3dAirportLights(L: AirportLayout, loc: (x: number, y: number) => number[], gy: (x: number, z: number) => number): any {
  if (!skyOpt('v3dAptLights')) return null;
  const pos: number[] = [], col: number[] = [], size: number[] = [];
  const add = (x: number, z: number, h: number, c: number[], s: number) => { pos.push(x, gy(x, z) + h, z); col.push(c[0], c[1], c[2]); size.push(s); };
  const W = [1, 0.95, 0.85], RED = [1, 0.15, 0.1], GRN = [0.2, 1, 0.45], BLU = [0.25, 0.45, 1], AMB = [1, 0.75, 0.25], FLOOD = [1, 0.72, 0.42];
  for (const r of L.runways) {
    if (r.surf === 9) continue;
    const q = v3dXY(r.lon, r.lat), h = r.hdg * D2R, f = [Math.sin(h), -Math.cos(h)], s = [Math.cos(h), Math.sin(h)], half = r.len / 2, w = (r.wid || 45) / 2 + 1.5;
    const at = (a: number, b: number) => [q[0] + f[0] * a + s[0] * b, q[1] + f[1] * a + s[1] * b];
    // edges every 60 m (amber over the last 600 m for the direction taken off in)
    for (let a = -half; a <= half + 0.1; a += 60) for (const b of [-w, w]) { const p = at(a, b); add(p[0], p[1], 0.9, a > half - 600 ? AMB : W, 2.2); }
    // centre line every 30 m on longer runways: white, then red and white, then red towards the end
    if (r.len >= 1500) for (let a = -half + 15; a < half; a += 30) { const left = half - a, c = left < 300 ? RED : left < 900 ? ((Math.round(a / 30) % 2) ? RED : W) : W; const p = at(a, 0); add(p[0], p[1], 0.7, c, 1.6); }
    // thresholds green, ends red
    for (let b = -w; b <= w + 0.1; b += (2 * w) / 8) { const p1 = at(-half, b), p2 = at(half, b); add(p1[0], p1[1], 0.8, GRN, 2.2); add(p2[0], p2[1], 0.8, RED, 2.2); }
    // approach lights before both thresholds on instrument runways: a line of bars and a cross bar 300 m out
    if (r.len >= 1800) for (const dirn of [-1, 1]) {
      for (let a = 30; a <= 900; a += 30) for (const b of [-2, -1, 0, 1, 2]) { const p = at(dirn * (half + a), b * 1.2); add(p[0], p[1], 1.5, W, 2.0); }
      for (let b = -15; b <= 15; b += 1.5) { const p = at(dirn * (half + 300), b); add(p[0], p[1], 1.5, W, 2.0); }
    }
  }
  // taxiways: green centre line every 30 m, blue edges every 60 m
  for (const p of L.paths || []) {
    if (!(p[0] === 1 || p[0] === 4)) continue;
    const A = L.points[p[2]], B = L.points[p[3]]; if (!A || !B) continue;
    const a = loc(A[0], A[1]), b = loc(B[0], B[1]), len = Math.hypot(b[0] - a[0], b[1] - a[1]); if (len < 1) continue;
    const ux = (b[0] - a[0]) / len, uz = (b[1] - a[1]) / len, wd = (p[1] || 18) / 2 + 1;
    for (let d = 0; d < len; d += 30) add(a[0] + ux * d, a[1] + uz * d, 0.6, GRN, 1.3);
    if (p[0] === 1) for (let d = 0; d < len; d += 60) for (const sd of [-wd, wd]) add(a[0] + ux * d - uz * sd, a[1] + uz * d + ux * sd, 0.6, BLU, 1.3);
  }
  // aprons: floodlights on masts around the edge
  for (const ar of L.areas || []) {
    if (ar.k !== 'apron' || ar.pts.length < 3) continue;
    for (let i = 0; i < ar.pts.length; i++) {
      const P1 = loc(ar.pts[i][0], ar.pts[i][1]), P2 = loc(ar.pts[(i + 1) % ar.pts.length][0], ar.pts[(i + 1) % ar.pts.length][1]), len = Math.hypot(P2[0] - P1[0], P2[1] - P1[1]);
      for (let d = 0; d < len; d += 90) { const t = d / len; add(P1[0] + (P2[0] - P1[0]) * t, P1[1] + (P2[1] - P1[1]) * t, 24, FLOOD.map(v => v * 0.6), 16); }
    }
  }
  if (!size.length) return null;
  return v3dLightPoints(pos, col, size);
}

/* ---------- aircraft lights ---------- */
/** Navigation lights (red left, green right, white tail), white strobes, red beacons and landing lights, on the model itself. */
function v3dPlaneLightsAdd(body: any, typeId: string) {
  if (!skyOpt('v3dAcLights')) return;
  const s = shapeOf(typeId), W = s.wing, semi = s.span / 2, rootY = s.w / 2 * 0.9;
  const wz0 = s.ground + W.z * s.h + (W.z > 0.9 ? -0.05 : 0.06), tipX = W.x + (semi - rootY) * Math.tan(W.sweep * D2R) + W.tip * 0.5, tipZ = wz0 + (semi - rootY) * Math.tan(W.dih * D2R);
  const v = (x: number, y: number, z: number) => _av(x, y, z);
  const pos: number[] = [], col: number[] = [], size: number[] = [], kind: number[] = [], dir: number[] = [], ph: number[] = [];
  const add = (p: any, c: number[], sz: number, k: number, d?: number[], phase?: number) => { pos.push(p.x, p.y, p.z); col.push(c[0], c[1], c[2]); size.push(sz); kind.push(k); dir.push(...(d || [0, 0, 0])); ph.push(phase || 0); };
  const span = Math.max(1, s.span / 30);
  add(v(tipX, -semi, tipZ), [1, 0.12, 0.1], 1.6 * span, 0);            // left: red
  add(v(tipX, semi, tipZ), [0.15, 1, 0.35], 1.6 * span, 0);             // right: green
  add(v(s.L - 0.2, 0, s.ground + s.h * 0.55), [1, 1, 0.95], 1.4 * span, 0);   // tail: white
  add(v(tipX, -semi, tipZ), [1, 1, 1], 2.6 * span, 1, undefined, 0);   // strobes
  add(v(tipX, semi, tipZ), [1, 1, 1], 2.6 * span, 1, undefined, 0);
  add(v(s.L * 0.42, 0, s.ground + s.h + 0.15), [1, 0.1, 0.05], 1.8 * span, 2, undefined, 0);   // beacons, top and bottom
  add(v(s.L * 0.5, 0, s.ground - 0.1), [1, 0.1, 0.05], 1.8 * span, 2, undefined, 0.5);
  const fwd = [-1, 0, 0];   // the nose points along −x of the model
  add(v(W.x + 1.2, -rootY * 1.8, wz0), [1, 0.97, 0.88], 3.2 * span, 3, fwd);   // landing lights
  add(v(W.x + 1.2, rootY * 1.8, wz0), [1, 0.97, 0.88], 3.2 * span, 3, fwd);
  add(v(s.gear.nose, 0, s.ground * 0.5), [1, 0.97, 0.88], 2.4 * span, 3, fwd);
  const pts = v3dLightPoints(pos, col, size, kind, dir, ph);
  pts.material.uniforms.uAlways.value = 1;   // aircraft lights are on by day too (only less bright)
  body.add(pts); body.userData.lights = pts;
}
/** Which lights are on, by the phase of the flight. */
function v3dPlaneLightsSet(model: any, ph: string, agl: number, onGround: boolean) {
  const body = model.userData.body, L = body && body.userData.lights; if (!L) return;
  const parked = /park|gate|boarding|deboard|arrived|turnaround/.test(ph);
  const taxi = /taxi|pushback/.test(ph);
  const land = !parked && !taxi && (/take-?off|lift-?off|final|landing|touchdown|roll/.test(ph) || (!onGround && agl < 3000));
  L.material.uniforms.uFlags.value.set(1, parked || taxi ? 0 : 1, parked ? 0 : 1, land ? 1 : 0);
}

/* ---------- day and night on the 2D map ---------- */
const MapNight: any = { cv: null, key: '', at: 0 };
function nightMapDraw(c: CanvasRenderingContext2D, m: any) {
  if (!skyOpt('mapNight')) return;
  const W = m.w, H = m.h; if (!W || !H) return;
  const sc = 1 / 8, w = Math.ceil(W * sc), h = Math.ceil(H * sc);
  const a0 = m.ll(0, 0), a1 = m.ll(W, H); if (!a0 || !a1) return;
  const key = [a0[0].toFixed(2), a0[1].toFixed(2), a1[0].toFixed(2), a1[1].toFixed(2), W, H, Math.floor(Date.now() / 60000)].join(',');
  if (key !== MapNight.key && Date.now() - MapNight.at > 120) {
    MapNight.key = key; MapNight.at = Date.now();
    if (!MapNight.cv) MapNight.cv = document.createElement('canvas');
    const cv = MapNight.cv as HTMLCanvasElement; cv.width = w; cv.height = h;
    const g = cv.getContext('2d'), img = g.createImageData(w, h), D = img.data;
    const d = astroD(Date.now()), s = astroSun(d), gm = astroLst(d, 0), sd = Math.sin(s.dec * D2R), cd = Math.cos(s.dec * D2R);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const ll = m.ll((x + 0.5) / sc, (y + 0.5) / sc); if (!ll) continue;
      const f = ll[1] * D2R, Hh = (gm + ll[0] - s.ra) * D2R, alt = Math.asin(Math.sin(f) * sd + Math.cos(f) * cd * Math.cos(Hh)) / D2R;
      const dark = clamp((0.5 - alt) / 18, 0, 1), o = (y * w + x) * 4;
      // the night side darker, the day side a touch lighter, so the line between them shows on the dark map
      if (dark > 0.02) { D[o] = 0; D[o + 1] = 2; D[o + 2] = 10; D[o + 3] = Math.round(255 * dark * 0.62); }
      else { D[o] = 120; D[o + 1] = 160; D[o + 2] = 220; D[o + 3] = 16; }
    }
    g.putImageData(img, 0, 0);
  }
  if (!MapNight.cv) return;
  c.save(); c.imageSmoothingEnabled = true; c.drawImage(MapNight.cv, 0, 0, W, H); c.restore();
}
