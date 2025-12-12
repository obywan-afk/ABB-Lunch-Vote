'use client'

import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

type ThreeGridBackgroundProps = {
  windSpeed?: number
  waveHeight?: number
  lighting?: number
  paused?: boolean
}

const OCEAN = {
  far: 4000,
  fov: 55,
  maxPixelRatio: 2,
  planeSize: 6500,
  planeSegments: 320, // you can lower to 256 if you want more perf
  skyRadius: 1600,
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value))
}
function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

function buildScene(container: HTMLDivElement, initial: Required<ThreeGridBackgroundProps>) {
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
    stencil: false,
    depth: true,
  })

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, OCEAN.maxPixelRatio))
  renderer.setSize(container.clientWidth, container.clientHeight)

  // Better background blending for an app (lets your CSS gradient show)
  renderer.setClearColor(0x000000, 0)

  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.28

  container.appendChild(renderer.domElement)

  const scene = new THREE.Scene()

  const camera = new THREE.PerspectiveCamera(
    OCEAN.fov,
    container.clientWidth / container.clientHeight,
    0.1,
    OCEAN.far,
  )
  camera.position.set(0, 7.5, 16)

  const prefersReducedMotion =
    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.06
  controls.maxPolarAngle = Math.PI * 0.49
  controls.minPolarAngle = Math.PI * 0.18
  controls.minDistance = 6
  controls.maxDistance = 70
  controls.target.set(0, 1.2, 0)

  const uniforms = {
    uTime: { value: 0 },
    uWind: { value: initial.windSpeed },
    uWaveHeight: { value: initial.waveHeight },
    uLight: { value: initial.lighting },
    uSunDir: { value: new THREE.Vector3(0.3, 0.85, 0.2).normalize() },
    uCamPos: { value: new THREE.Vector3() },
  }

  // -----------------------
  // SKY (unchanged concept, small tweaks for app readability)
  // -----------------------
  const skyVertexGLSL = `
    varying vec3 vDir;
    void main(){
      vDir = normalize(position);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `

  const skyFragmentGLSL = `
    precision highp float;
    uniform float uTime;
    uniform float uLight;
    uniform vec3  uSunDir;
    varying vec3 vDir;

    float sat(float x){ return clamp(x, 0.0, 1.0); }
    float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
    float noise(vec2 p){
      vec2 i = floor(p);
      vec2 f = fract(p);
      float a = hash(i);
      float b = hash(i + vec2(1.0, 0.0));
      float c = hash(i + vec2(0.0, 1.0));
      float d = hash(i + vec2(1.0, 1.0));
      vec2 u = f*f*(3.0 - 2.0*f);
      return mix(a, b, u.x) + (c - a)*u.y*(1.0 - u.x) + (d - b)*u.x*u.y;
    }
    float fbm(vec2 p){
      float v = 0.0;
      float a = 0.55;
      for(int i=0;i<4;i++){
        v += a * noise(p);
        p *= 2.02;
        a *= 0.5;
      }
      return v;
    }

	    vec3 skyColor(vec3 dir){
	      // uLight: 0.2 (overcast) -> 2.2 (clear/bright)
	      float clear = sat((uLight - 0.2) / 2.0);
	      float cloudCover = 1.0 - clear;

      float h = sat(dir.y * 0.5 + 0.5);

	      vec3 zenithClear  = vec3(0.05, 0.22, 0.40);
	      vec3 horizonClear = vec3(0.58, 0.76, 0.88);
	      vec3 zenithOver   = vec3(0.16, 0.19, 0.22);
	      vec3 horizonOver  = vec3(0.44, 0.48, 0.52);

      vec3 zenith  = mix(zenithOver,  zenithClear,  clear);
      vec3 horizon = mix(horizonOver, horizonClear, clear);
	      vec3 col = mix(horizon, zenith, pow(h, 1.25));
	      col *= mix(0.92, 1.25, clear);

      float up = sat((dir.y - 0.02) / 0.25);
      vec2 uv = dir.xz / max(0.18, dir.y + 0.35);
      uv *= 0.85;
      uv += vec2(uTime * 0.004, uTime * 0.002);

      float n = fbm(uv);
      float m = smoothstep(0.55 - 0.25*cloudCover, 0.78 - 0.10*cloudCover, n);
      m *= up * (0.35 + 0.65*cloudCover);

	      vec3 cloudCol = mix(vec3(0.70,0.73,0.76), vec3(0.95,0.97,0.99), clear);
      col = mix(col, cloudCol, m);

      float s = sat(dot(dir, normalize(uSunDir)));
	      float sharp = mix(14.0, 280.0, clear);
	      float sun = exp((s - 1.0) * sharp);
	      vec3 sunCol = vec3(1.0, 0.97, 0.90) * mix(0.45, 2.35, clear) * uLight;
	      col += sun * sunCol;

      col = mix(col, vec3(dot(col, vec3(0.333))), cloudCover * 0.26);
      return col;
    }

    void main(){
      vec3 dir = normalize(vDir);
      gl_FragColor = vec4(skyColor(dir), 1.0);
    }
  `

  const skyMaterial = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms,
    vertexShader: skyVertexGLSL,
    fragmentShader: skyFragmentGLSL,
    depthWrite: false,
  })

  const skyGeometry = new THREE.SphereGeometry(OCEAN.skyRadius, 32, 16)
  const sky = new THREE.Mesh(skyGeometry, skyMaterial)
  scene.add(sky)

  // -----------------------
  // OCEAN: key improvements
  // 1) Vertex = long waves only (no short-wave geometry)
  // 2) Fragment = long+short normals, micro ripples, foam from long waves
  // 3) Choppiness reduced + safety clamp to avoid cusps
  // -----------------------
  const oceanVertexGLSL = `
    precision highp float;

    uniform float uTime;
    uniform float uWind;
    uniform float uWaveHeight;

    varying vec3 vWorldPos;
    varying vec2 vXZ;

    const float TAU = 6.28318530718;

    // Long-wave displacement ONLY (keeps geometry smooth => no visible triangles)
    void addWaveLong(vec2 xz, vec2 D, float A, float wl, float steep, float t, inout vec3 disp){
      float k = TAU / wl;
      float omega = sqrt(9.8 * k);
      float phase = k * dot(D, xz) - omega * t;
      float s = sin(phase);
      float c = cos(phase);

      // Safe choppiness: clamp Q to prevent cusp at high amplitudes
      float Q = steep / (k*A*6.0 + 1e-4);
      Q = min(Q, 0.70);

      // Keep horizontal displacement smaller than vertical (prevents pointy crests)
      float chop = 0.55;
      disp.x += D.x * (Q*A*c) * chop;
      disp.z += D.y * (Q*A*c) * chop;
      disp.y += A * s;
    }

    void main() {
      vec3 pos = position;

      // world-space sampling coordinate (stable)
      vec3 worldBase = (modelMatrix * vec4(pos, 1.0)).xyz;
      vXZ = worldBase.xz;

      float wind = clamp(uWind, 0.0, 20.0);
      float wN = wind / 20.0;

      float speedMul = mix(0.55, 1.65, wN);
      float lenMul   = mix(0.95, 1.75, wN);

      // Keep amplitude progression gentle (avoid “exploding” crests)
      float A0 = clamp(uWaveHeight, 0.0, 3.0);
      float A  = mix(A0, pow(A0, 1.02), 0.35);

      vec2 d0 = normalize(vec2(1.0, 0.25));
      vec2 d1 = normalize(vec2(0.35, 1.0));
      vec2 d2 = normalize(vec2(-0.75, 0.45));
      vec2 d3 = normalize(vec2(0.10, -1.0));

      float t = uTime * speedMul;

      vec3 disp = vec3(0.0);
      addWaveLong(vXZ, d0, 0.55*A, 52.0*lenMul, 0.75, t, disp);
      addWaveLong(vXZ, d1, 0.36*A, 34.0*lenMul, 0.62, t, disp);
      addWaveLong(vXZ, d2, 0.22*A, 22.0*lenMul, 0.55, t, disp);
      addWaveLong(vXZ, d3, 0.12*A, 14.0*lenMul, 0.45, t, disp);

      pos += disp;

      vec4 world = modelMatrix * vec4(pos, 1.0);
      vWorldPos = world.xyz;

      gl_Position = projectionMatrix * viewMatrix * world;
    }
  `

  const oceanFragmentGLSL = `
    precision highp float;

    uniform float uTime;
    uniform float uWind;
    uniform float uWaveHeight;
    uniform float uLight;
    uniform vec3  uSunDir;
    uniform vec3  uCamPos;

    varying vec3 vWorldPos;
    varying vec2 vXZ;

    const float PI  = 3.14159265359;
    const float TAU = 6.28318530718;

    float sat(float x){ return clamp(x, 0.0, 1.0); }

    float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
    float noise(vec2 p){
      vec2 i = floor(p);
      vec2 f = fract(p);
      float a = hash(i);
      float b = hash(i + vec2(1.0, 0.0));
      float c = hash(i + vec2(0.0, 1.0));
      float d = hash(i + vec2(1.0, 1.0));
      vec2 u = f*f*(3.0 - 2.0*f);
      return mix(a, b, u.x) + (c - a)*u.y*(1.0 - u.x) + (d - b)*u.x*u.y;
    }
    float fbm(vec2 p){
      float v = 0.0;
      float a = 0.55;
      for(int i=0;i<4;i++){
        v += a * noise(p);
        p *= 2.02;
        a *= 0.5;
      }
      return v;
    }
    float fbm3(vec2 p){
      float v = 0.0;
      float a = 0.55;
      for(int i=0;i<3;i++){
        v += a * noise(p);
        p *= 2.03;
        a *= 0.5;
      }
      return v;
    }

    // Sky function for reflections (same as in sky shader)
    vec3 skyColor(vec3 dir){
	      // uLight: 0.2 (overcast) -> 2.2 (clear/bright)
	      float clear = sat((uLight - 0.2) / 2.0);
	      float cloudCover = 1.0 - clear;

      float h = sat(dir.y * 0.5 + 0.5);

      vec3 zenithClear  = vec3(0.03, 0.15, 0.26);
      vec3 horizonClear = vec3(0.44, 0.60, 0.66);
      vec3 zenithOver   = vec3(0.22, 0.26, 0.30);
      vec3 horizonOver  = vec3(0.54, 0.57, 0.60);

      vec3 zenith  = mix(zenithOver,  zenithClear,  clear);
      vec3 horizon = mix(horizonOver, horizonClear, clear);
      vec3 col = mix(horizon, zenith, pow(h, 1.25));

      float up = sat((dir.y - 0.02) / 0.25);
      vec2 uv = dir.xz / max(0.18, dir.y + 0.35);
      uv *= 0.85;
      uv += vec2(uTime * 0.004, uTime * 0.002);

      float n = fbm(uv);
      float m = smoothstep(0.55 - 0.25*cloudCover, 0.78 - 0.10*cloudCover, n);
      m *= up * (0.35 + 0.65*cloudCover);

      vec3 cloudCol = mix(vec3(0.74,0.77,0.80), vec3(0.94,0.96,0.98), clear);
      col = mix(col, cloudCol, m);

      float s = sat(dot(dir, normalize(uSunDir)));
      float sharp = mix(18.0, 240.0, clear);
      float sun = exp((s - 1.0) * sharp);
      vec3 sunCol = vec3(1.0, 0.95, 0.86) * mix(0.35, 1.25, clear) * uLight;
      col += sun * sunCol;

      col = mix(col, vec3(dot(col, vec3(0.333))), cloudCover * 0.26);
      return col;
    }

    // GGX helpers
    vec3 fresnelSchlick(float cosTheta, vec3 F0){
      return F0 + (1.0 - F0) * pow(1.0 - cosTheta, 5.0);
    }
    float D_GGX(float NoH, float a){
      float a2 = a*a;
      float d = (NoH*NoH) * (a2 - 1.0) + 1.0;
      return a2 / (PI * d * d + 1e-6);
    }
    float G_SchlickGGX(float NoV, float k){
      return NoV / (NoV * (1.0 - k) + k + 1e-6);
    }
    float G_Smith(float NoV, float NoL, float k){
      return G_SchlickGGX(NoV, k) * G_SchlickGGX(NoL, k);
    }

    // Analytic derivatives for normals (detail without geometry)
    void addWaveDeriv(vec2 xz, vec2 D, float A, float wl, float steep, float t,
                      inout float height,
                      inout vec3 dPdx,
                      inout vec3 dPdz){
      float k = TAU / wl;
      float omega = sqrt(9.8 * k);
      float phase = k * dot(D, xz) - omega * t;
      float s = sin(phase);
      float c = cos(phase);

      float Q = steep / (k*A*6.0 + 1e-4);
      Q = min(Q, 0.85);

      height += A * s;

      float QaKsin = Q*A*k*s;
      float aKcos  = A*k*c;

      dPdx.x += -QaKsin * D.x * D.x;
      dPdx.z += -QaKsin * D.y * D.x;
      dPdx.y +=  aKcos  * D.x;

      dPdz.x += -QaKsin * D.x * D.y;
      dPdz.z += -QaKsin * D.y * D.y;
      dPdz.y +=  aKcos  * D.y;
    }

    void main() {
      float wind = clamp(uWind, 0.0, 20.0);
      float wN = wind / 20.0;

      float speedMul = mix(0.55, 1.65, wN);
      float lenMul   = mix(0.95, 1.75, wN);

      float A0 = clamp(uWaveHeight, 0.0, 3.0);
      float A  = mix(A0, pow(A0, 1.02), 0.35);

      float t = uTime * speedMul;

      vec3 V = normalize(uCamPos - vWorldPos);
      vec3 L = normalize(uSunDir);

      float clear = sat((uLight - 0.35) / 1.65);
      float cloudCover = 1.0 - clear;

      // ---- LONG waves (for foam + primary shape)
      vec3 dPdxL = vec3(1.0, 0.0, 0.0);
      vec3 dPdzL = vec3(0.0, 0.0, 1.0);
      float HL = 0.0;

      vec2 d0 = normalize(vec2(1.0, 0.25));
      vec2 d1 = normalize(vec2(0.35, 1.0));
      vec2 d2 = normalize(vec2(-0.75, 0.45));
      vec2 d3 = normalize(vec2(0.10, -1.0));

      addWaveDeriv(vXZ, d0, 0.55*A, 52.0*lenMul, 0.75, t, HL, dPdxL, dPdzL);
      addWaveDeriv(vXZ, d1, 0.36*A, 34.0*lenMul, 0.62, t, HL, dPdxL, dPdzL);
      addWaveDeriv(vXZ, d2, 0.22*A, 22.0*lenMul, 0.55, t, HL, dPdxL, dPdzL);
      addWaveDeriv(vXZ, d3, 0.12*A, 14.0*lenMul, 0.45, t, HL, dPdxL, dPdzL);

      vec3 Nlong = normalize(cross(dPdzL, dPdxL));
      float slopeL = 1.0 - sat(Nlong.y);

      // ---- DETAIL waves (normals only)
      vec3 dPdx = dPdxL;
      vec3 dPdz = dPdzL;
      float H = HL;

      // short/detail set: lower steepness to avoid “spiky” normals
      addWaveDeriv(vXZ, normalize(vec2(0.80, 0.60)), 0.10*A,  9.0*lenMul, 0.40, t*1.18, H, dPdx, dPdz);
      addWaveDeriv(vXZ, normalize(vec2(-0.20, 1.00)), 0.06*A,  5.0*lenMul, 0.42, t*1.35, H, dPdx, dPdz);
      addWaveDeriv(vXZ, normalize(vec2(-1.00,-0.15)), 0.03*A,  3.0*lenMul, 0.45, t*1.80, H, dPdx, dPdz);

      vec3 N = normalize(cross(dPdz, dPdx));

      // Micro ripples (normal perturbation only; keeps geometry clean)
      vec2 p = vXZ * (0.030 + 0.018 * wN) + vec2(t * 0.018, t * 0.012);
      float n0 = fbm3(p);
      float eps = 0.08;
      float nx = fbm3(p + vec2(eps, 0.0));
      float nz = fbm3(p + vec2(0.0, eps));
      vec2 grad = vec2(nx - n0, nz - n0);

      float microAmt = mix(0.07, 0.22, wN) * mix(0.30, 1.00, clear);
      N = normalize(N + vec3(-grad.x * microAmt, 0.0, -grad.y * microAmt));

      float NoV = sat(dot(N, V));
      float NoL = sat(dot(N, L));

      vec3 R = reflect(-V, N);

	      // Water body color (Beer–Lambert-ish): shallow -> teal, deep -> blue,
	      // plus per-channel absorption that naturally shifts towards blue with depth.
	      vec3 shallowOver = vec3(0.10, 0.34, 0.38);
	      vec3 deepOver    = vec3(0.03, 0.12, 0.16);
	      vec3 shallowClear = vec3(0.10, 0.50, 0.62);
	      vec3 deepClear    = vec3(0.01, 0.10, 0.22);

	      vec3 shallow = mix(shallowOver, shallowClear, clear);
	      vec3 deep    = mix(deepOver, deepClear, clear);

	      // Approximate "view depth": grazing angles see deeper path length.
	      float viewDepth = mix(2.0, 34.0, pow(1.0 - NoV, 2.25));
	      viewDepth += 4.0 * sat(HL); // slightly more depth in troughs/large waves

	      // Absorption coefficients (R absorbs most, B least)
	      vec3 absorption = mix(vec3(0.22, 0.10, 0.04), vec3(0.18, 0.07, 0.03), clear);
	      vec3 trans = exp(-absorption * viewDepth);

	      vec3 waterBody = shallow * trans + deep * (vec3(1.0) - trans);

	      // Large-scale color variance (patches), kept subtle and slow
	      float macro = fbm(vXZ * 0.0016 + vec2(t * 0.006, -t * 0.004));
	      waterBody *= mix(vec3(0.94, 1.00, 1.06), vec3(1.06, 1.02, 0.95), macro);

	      // Wave-dependent tint: steeper faces look a touch lighter
	      float slopeTint = sat(0.55 + 0.35 * slopeL);
	      vec3 baseCol = mix(deep, waterBody, slopeTint);

	      // Brighten with clear sky (not the other way around)
	      baseCol *= mix(0.98, 1.26, clear) * mix(0.95, 1.10, sat(uLight / 2.2));

	      // Gentle subsurface lift opposite the sun (helps realism in midtones)
	      float sss = pow(sat(dot(N, -L)), 2.2) * (0.015 + 0.06 * clear) * (0.35 + 0.65 * wN);
	      baseCol += baseCol * sss;

      // Foam from LONG waves only (prevents noisy/aliased foam)
      float crest = smoothstep(0.28, 0.86, slopeL) * smoothstep(0.22, 1.05, HL);
      crest *= mix(0.75, 1.25, wN);
      float foamNoise = fbm(vXZ * 0.010 + vec2(t * 0.06, -t * 0.04));
      float foam = crest * smoothstep(0.42, 0.80, foamNoise);
      foam = clamp(foam, 0.0, 1.0);

      // Roughness behavior (wind + cloud cover)
      float rough = mix(0.09, 0.30, wN);
      rough = mix(rough, rough + 0.18, cloudCover);
      rough = clamp(rough, 0.05, 0.60);
      float a = rough * rough;
      float k = (rough + 1.0);
      k = (k*k) / 8.0;

      // Environment reflection (clouds + sun)
      vec3 env = skyColor(normalize(vec3(R.x, max(R.y, 0.02), R.z)));
	      env = mix(env, vec3(0.07,0.10,0.12), rough*0.45);

      // Specular (GGX)
      vec3 F0 = vec3(0.02);
      vec3 Hh = normalize(L + V);
      float NoH = sat(dot(N, Hh));
      float VoH = sat(dot(V, Hh));

      vec3  F = fresnelSchlick(VoH, F0);
      float D = D_GGX(NoH, a);
      float G = G_Smith(NoV, NoL, k);

	      vec3 specDirect = (D * G * F / max(4.0 * NoV * NoL, 1e-5)) * NoL;
	      specDirect *= mix(0.55, 1.85, clear) * uLight;

	      vec3 specEnv = env * (F * (0.40 + 0.85*(1.0 - rough))) * mix(0.90, 1.30, clear);

      // Diffuse-ish + backscatter for form readability
      float diffAmt = mix(0.22, 0.08, clear);
      vec3 diffuse = baseCol * (diffAmt + 0.10*NoL) * (0.85 + 0.35*uLight);

      float back = pow(1.0 - NoV, 2.2);
      diffuse += baseCol * back * (0.12 + 0.22*cloudCover);

	      // Extra sun glint (stronger on clear days)
	      float sunGlint = pow(sat(dot(reflect(-L, N), V)), mix(650.0, 2400.0, clear));
	      sunGlint *= (0.10 + 1.10 * clear) * (1.0 - rough) * uLight;

	      // Combine
	      vec3 col = diffuse + specEnv + specDirect + vec3(1.0, 0.97, 0.90) * sunGlint;

      // Foam reduces reflectivity
      vec3 foamCol = vec3(0.94, 0.97, 0.99);
      col = mix(col, foamCol, foam);
      col = mix(col, col * 0.92, foam * 0.6);

      // Horizon haze to hide plane boundary (infinite feel)
      float dist = length(uCamPos - vWorldPos);
      float haze = 1.0 - exp(-dist * 0.00125);
      haze *= mix(0.7, 1.15, 1.0 - NoV);
	      vec3 hazeCol = mix(vec3(0.10,0.18,0.22), env, mix(0.30, 0.45, clear));
	      col = mix(col, hazeCol, sat(haze));

      gl_FragColor = vec4(col, 1.0);
    }
  `

  const oceanMaterial = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: oceanVertexGLSL,
    fragmentShader: oceanFragmentGLSL,
    toneMapped: true,
    depthWrite: false,
    transparent: true, // nicer compositing behind your UI
  })

  const oceanGeometry = new THREE.PlaneGeometry(
    OCEAN.planeSize,
    OCEAN.planeSize,
    OCEAN.planeSegments,
    OCEAN.planeSegments,
  )
  oceanGeometry.rotateX(-Math.PI / 2)

  const ocean = new THREE.Mesh(oceanGeometry, oceanMaterial)
  ocean.frustumCulled = false
  scene.add(ocean)

  const resizeObserver = new ResizeObserver((entries) => {
    for (const entry of entries) {
      const width = entry.contentRect.width
      const height = entry.contentRect.height
      renderer.setSize(width, height)
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, OCEAN.maxPixelRatio))
      camera.aspect = width / height
      camera.updateProjectionMatrix()
    }
  })
  resizeObserver.observe(container)

  const clock = new THREE.Clock()
  let frameId = 0
  let t = 0
  const controlsState = { ...initial }

  const animate = () => {
    const dt = clock.getDelta()
    const motionScale = prefersReducedMotion ? 0.25 : 1.0

    if (!controlsState.paused) {
      const w = uniforms.uWind.value
      t += dt * motionScale * (0.55 + 0.06 * w)
      uniforms.uTime.value = t
    }

    // Infinite ocean / sky follow camera
    ocean.position.x = camera.position.x
    ocean.position.z = camera.position.z
    sky.position.copy(camera.position)

    // Sun path (clear -> overcast affects elevation)
    const li = uniforms.uLight.value
    const clear = clamp01((li - 0.35) / 1.65)
    const elev = lerp(0.22, 0.95, clear)
    const az = t * 0.03
    uniforms.uSunDir.value.set(Math.cos(az) * 0.45, elev, Math.sin(az) * 0.35).normalize()

    uniforms.uCamPos.value.copy(camera.position)

    controls.update()
    renderer.render(scene, camera)

    frameId = requestAnimationFrame(animate)
  }

  animate()

  return {
    setControls(next: Required<ThreeGridBackgroundProps>) {
      uniforms.uWind.value = next.windSpeed
      uniforms.uWaveHeight.value = next.waveHeight
      uniforms.uLight.value = next.lighting
      controlsState.paused = next.paused
    },
    dispose() {
      resizeObserver.disconnect()
      cancelAnimationFrame(frameId)
      controls.dispose()

      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }

      oceanGeometry.dispose()
      oceanMaterial.dispose()
      skyGeometry.dispose()
      skyMaterial.dispose()
      renderer.dispose()
    },
  }
}

export function ThreeGridBackground({
  windSpeed = 8,
  waveHeight = 0.9,
  lighting = 1.1,
  paused = false,
}: ThreeGridBackgroundProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const apiRef = useRef<ReturnType<typeof buildScene> | null>(null)

  const controls = useMemo(
    () => ({ windSpeed, waveHeight, lighting, paused }),
    [lighting, paused, waveHeight, windSpeed],
  )

  useEffect(() => {
    if (!containerRef.current) return
    apiRef.current = buildScene(containerRef.current, controls as Required<ThreeGridBackgroundProps>)
    return () => apiRef.current?.dispose()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    apiRef.current?.setControls(controls as Required<ThreeGridBackgroundProps>)
  }, [controls])

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 h-full w-full -z-10"
      style={{
        background: 'radial-gradient(1200px 800px at 60% 10%, #0a2a33, #071a22)',
      }}
    />
  )
}
