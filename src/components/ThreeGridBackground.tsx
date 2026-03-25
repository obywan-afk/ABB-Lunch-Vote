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

const SCENE = {
  far: 5000,
  fov: 42,
  maxPixelRatio: 2,
  waterSize: 7200,
  waterSegments: 360,
  skyRadius: 1800,
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value))
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

function makeRock(scale: THREE.Vector3Tuple, color: string) {
  const mesh = new THREE.Mesh(
    new THREE.DodecahedronGeometry(1, 0),
    new THREE.MeshStandardMaterial({
      color,
      roughness: 0.96,
      metalness: 0.02,
    })
  )
  mesh.scale.set(scale[0], scale[1], scale[2])
  return mesh
}

function createPineTree(height: number, trunkColor: string, foliageColor: string) {
  const group = new THREE.Group()

  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.12, height * 0.24, 8),
    new THREE.MeshStandardMaterial({
      color: trunkColor,
      roughness: 0.96,
      metalness: 0.01,
    })
  )
  trunk.position.y = height * 0.12
  group.add(trunk)

  const layers = [
    { r: height * 0.18, h: height * 0.34, y: height * 0.26 },
    { r: height * 0.15, h: height * 0.28, y: height * 0.42 },
    { r: height * 0.12, h: height * 0.24, y: height * 0.56 },
  ]

  for (const layer of layers) {
    const cone = new THREE.Mesh(
      new THREE.ConeGeometry(layer.r, layer.h, 8),
      new THREE.MeshStandardMaterial({
        color: foliageColor,
        roughness: 0.98,
        metalness: 0,
      })
    )
    cone.position.y = layer.y
    group.add(cone)
  }

  return group
}

function createForegroundShore() {
  const group = new THREE.Group()

  const shelf = new THREE.Mesh(
    new THREE.CylinderGeometry(28, 38, 7, 10, 1, false, Math.PI * 0.08, Math.PI * 0.94),
    new THREE.MeshStandardMaterial({
      color: '#304857',
      roughness: 0.98,
      metalness: 0.01,
    })
  )
  shelf.rotation.x = Math.PI
  shelf.rotation.y = -0.76
  shelf.position.set(-25, -4.2, 20)
  group.add(shelf)

  const rocks = [
    { pos: [-10, -0.4, 8], rot: [0.4, 0.3, -0.1], scale: [12.6, 7.4, 8.4], color: '#58707d' },
    { pos: [-18, -0.7, 15], rot: [0.2, 1.0, 0.3], scale: [15.4, 8.8, 10.1], color: '#415864' },
    { pos: [-3, -0.8, 13], rot: [0.3, -0.5, 0.2], scale: [9.4, 5.2, 6.7], color: '#6f8791' },
    { pos: [-14, 0.3, 5], rot: [0.8, 0.2, -0.2], scale: [5.8, 4.4, 3.4], color: '#839aa5' },
    { pos: [-22, -0.9, 6], rot: [0.2, -0.3, 0.18], scale: [9.8, 5.6, 6.8], color: '#4b616c' },
    { pos: [-6, -0.3, 2], rot: [0.5, 0.1, -0.1], scale: [7.2, 4.2, 4.9], color: '#8ca0a8' },
  ]

  for (const item of rocks) {
    const rock = makeRock(item.scale as THREE.Vector3Tuple, item.color)
    rock.position.set(item.pos[0], item.pos[1], item.pos[2])
    rock.rotation.set(item.rot[0], item.rot[1], item.rot[2])
    group.add(rock)
  }

  const treePlacements = [
    { x: -18.5, y: 3.4, z: 7.4, h: 8.4 },
    { x: -14.2, y: 3.8, z: 10.2, h: 9.8 },
    { x: -9.2, y: 3.1, z: 12.2, h: 7.4 },
    { x: -21.2, y: 3.2, z: 11.0, h: 9.1 },
    { x: -6.4, y: 3.0, z: 8.6, h: 7.2 },
  ]

  for (const tree of treePlacements) {
    const pine = createPineTree(tree.h, '#5c4737', '#243f37')
    pine.position.set(tree.x, tree.y, tree.z)
    pine.rotation.y = tree.x * 0.07
    group.add(pine)
  }

  return group
}

function createGlowTexture(inner: string, outer: string) {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256
  const ctx = canvas.getContext('2d')
  if (!ctx) return new THREE.CanvasTexture(canvas)

  const gradient = ctx.createRadialGradient(128, 128, 14, 128, 128, 128)
  gradient.addColorStop(0, inner)
  gradient.addColorStop(0.25, 'rgba(255,242,224,0.98)')
  gradient.addColorStop(0.58, outer)
  gradient.addColorStop(1, 'rgba(255,180,120,0)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, 256, 256)

  const texture = new THREE.CanvasTexture(canvas)
  texture.needsUpdate = true
  return texture
}

function createHorizonSilhouette(width: number, height: number, color: string, peaks: number) {
  const shape = new THREE.Shape()
  shape.moveTo(-width * 0.5, 0)

  for (let i = 0; i <= peaks; i++) {
    const t = i / peaks
    const x = lerp(-width * 0.5, width * 0.5, t)
    const ridge = Math.sin(t * Math.PI)
    const secondary = Math.sin(t * Math.PI * (2.4 + peaks * 0.14)) * 0.14
    const y = Math.max(0.12, ridge * height * (0.55 + (i % 3) * 0.12) + secondary * height)
    shape.lineTo(x, y)
  }

  shape.lineTo(width * 0.5, 0)
  shape.closePath()

  return new THREE.Mesh(
    new THREE.ShapeGeometry(shape),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.98,
      fog: false,
      side: THREE.DoubleSide,
    })
  )
}

function createDistantIslands() {
  const group = new THREE.Group()
  const silhouettes = [
    { x: -152, y: -3.6, z: -170, w: 136, h: 42, c: '#223847', peaks: 8, ry: 0.04 },
    { x: -18, y: -4.8, z: -212, w: 196, h: 54, c: '#172c39', peaks: 11, ry: 0.08 },
    { x: 146, y: -4.1, z: -182, w: 162, h: 40, c: '#203543', peaks: 8, ry: -0.03 },
    { x: 54, y: -1.2, z: -132, w: 114, h: 26, c: '#2d4653', peaks: 6, ry: -0.08 },
    { x: -108, y: -0.8, z: -126, w: 92, h: 22, c: '#314c58', peaks: 5, ry: 0.06 },
  ]

  for (const item of silhouettes) {
    const silhouette = createHorizonSilhouette(item.w, item.h, item.c, item.peaks)
    silhouette.position.set(item.x, item.y, item.z)
    silhouette.rotation.y = item.ry
    group.add(silhouette)

    const treeCount = Math.max(4, Math.round(item.w / 18))
    for (let i = 0; i < treeCount; i++) {
      const pine = createPineTree(7.4 + (i % 3) * 1.6, '#3f352d', '#13271f')
      const offset = (i / Math.max(1, treeCount - 1) - 0.5) * item.w * 0.92
      pine.position.set(item.x + offset, item.y + item.h * 0.38, item.z + 2 + (i % 2) * 1.5)
      pine.scale.setScalar(0.88 + (i % 2) * 0.24)
      group.add(pine)
    }
  }

  return group
}

function createRightHeadland() {
  const group = new THREE.Group()

  const masses = [
    { pos: [52, 4.8, -24], rot: [0.2, -0.5, 0.1], scale: [24, 16, 21], color: '#4c6570' },
    { pos: [62, 8.2, -36], rot: [0.3, 0.2, -0.18], scale: [32, 21, 24], color: '#415964' },
    { pos: [76, 7.4, -48], rot: [-0.12, 0.42, 0.08], scale: [22, 15, 18], color: '#6b838e' },
    { pos: [86, 5.8, -62], rot: [0.16, -0.3, 0.06], scale: [18, 12, 15], color: '#536a75' },
  ]

  for (const item of masses) {
    const rock = makeRock(item.scale as THREE.Vector3Tuple, item.color)
    rock.position.set(item.pos[0], item.pos[1], item.pos[2])
    rock.rotation.set(item.rot[0], item.rot[1], item.rot[2])
    group.add(rock)
  }

  const trees = [
    { x: 56, y: 17, z: -25, h: 11.8 },
    { x: 63, y: 22, z: -37, h: 14.4 },
    { x: 71, y: 20, z: -46, h: 12.8 },
    { x: 82, y: 16, z: -58, h: 10.8 },
  ]

  for (const tree of trees) {
    const pine = createPineTree(tree.h, '#5e4737', '#1f3a31')
    pine.position.set(tree.x, tree.y, tree.z)
    group.add(pine)
  }

  return group
}

function createBoat() {
  const group = new THREE.Group()

  const hull = new THREE.Mesh(
    new THREE.BoxGeometry(16.2, 1.7, 4.3),
    new THREE.MeshStandardMaterial({
      color: '#6d3f2d',
      roughness: 0.72,
      metalness: 0.06,
    })
  )
  hull.position.y = 0.44
  group.add(hull)

  const bow = new THREE.Mesh(
    new THREE.ConeGeometry(2.1, 4.2, 4),
    new THREE.MeshStandardMaterial({
      color: '#84503a',
      roughness: 0.75,
      metalness: 0.03,
    })
  )
  bow.rotation.z = -Math.PI / 2
  bow.rotation.y = Math.PI / 4
  bow.position.set(9.35, 0.42, 0)
  group.add(bow)

  const stern = new THREE.Mesh(
    new THREE.BoxGeometry(3.2, 1.4, 3.2),
    new THREE.MeshStandardMaterial({
      color: '#543021',
      roughness: 0.76,
      metalness: 0.03,
    })
  )
  stern.position.set(-7.8, 0.6, 0)
  group.add(stern)

  const mast = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.24, 17.4, 10),
    new THREE.MeshStandardMaterial({
      color: '#d8c7a8',
      roughness: 0.9,
      metalness: 0.02,
    })
  )
  mast.position.set(-1.2, 8.6, 0)
  group.add(mast)

  const boom = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.11, 9.5, 8),
    new THREE.MeshStandardMaterial({
      color: '#ceb38b',
      roughness: 0.88,
      metalness: 0.02,
    })
  )
  boom.rotation.z = Math.PI / 2
  boom.position.set(2.4, 6.9, 0)
  group.add(boom)

  const sailMaterial = new THREE.MeshStandardMaterial({
    color: '#f6efe2',
    roughness: 0.92,
    metalness: 0,
    side: THREE.DoubleSide,
  })

  const mainSail = new THREE.Mesh(new THREE.PlaneGeometry(12.8, 13.4), sailMaterial)
  mainSail.position.set(2.7, 8.8, 0)
  mainSail.rotation.y = -0.42
  mainSail.rotation.z = 0.08
  group.add(mainSail)

  const jib = new THREE.Mesh(new THREE.PlaneGeometry(7.6, 8.1), sailMaterial.clone())
  jib.position.set(-6.6, 6.4, 0)
  jib.rotation.y = -0.3
  jib.rotation.z = -0.06
  group.add(jib)

  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(5.2, 1.7, 2.8),
    new THREE.MeshStandardMaterial({
      color: '#d8e6eb',
      roughness: 0.88,
      metalness: 0.01,
    })
  )
  cabin.position.set(-2.4, 1.7, 0)
  group.add(cabin)

  const lantern = new THREE.PointLight('#ffd59f', 8.8, 38, 2)
  lantern.position.set(5.8, 2.9, 0)
  group.add(lantern)

  return group
}

function createMistLayer(width: number, depth: number, color: string, opacity: number) {
  return new THREE.Mesh(
    new THREE.PlaneGeometry(width, depth),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
  )
}

function sampleWave(x: number, z: number, time: number, windSpeed: number, waveHeight: number) {
  const wind = Math.min(20, Math.max(0, windSpeed))
  const wN = wind / 20
  const speed = lerp(0.34, 0.9, wN)
  const lengthScale = lerp(1.25, 2.1, wN)
  const amp = lerp(waveHeight, Math.pow(waveHeight, 1.02), 0.28) * 0.72
  const t = time * speed
  const warpX = Math.sin(z * 0.01 + t * 0.18) * 8
  const warpZ = Math.cos(x * 0.008 - t * 0.14) * 6
  const sx = x + warpX
  const sz = z + warpZ

  const waves = [
    { dir: [1.0, 0.14], a: 0.82 * amp, wl: 132 * lengthScale },
    { dir: [0.5, 1.0], a: 0.24 * amp, wl: 62 * lengthScale },
    { dir: [-0.8, 0.28], a: 0.14 * amp, wl: 36 * lengthScale },
    { dir: [-0.25, -1.0], a: 0.09 * amp, wl: 22 * lengthScale },
  ]

  let y = 0
  for (const wave of waves) {
    const d = new THREE.Vector2(wave.dir[0], wave.dir[1]).normalize()
    const k = (Math.PI * 2) / wave.wl
    const omega = Math.sqrt(9.8 * k)
    const distortion =
      (Math.sin((sx + sz) * 0.012 + t * 0.21) + Math.cos((sx - sz) * 0.009 - t * 0.16)) *
      wave.wl *
      0.06
    const phase = k * (d.x * (sx + distortion) + d.y * (sz - distortion * 0.6)) - omega * t
    y += wave.a * Math.sin(phase)
  }

  y += (Math.sin(sx * 0.015 + t * 0.44) + Math.cos(sz * 0.018 - t * 0.31)) * amp * 0.07

  return y
}

function buildScene(container: HTMLDivElement, initial: Required<ThreeGridBackgroundProps>) {
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
  })

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, SCENE.maxPixelRatio))
  renderer.setSize(container.clientWidth, container.clientHeight)
  renderer.setClearColor(0x000000, 0)
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.38
  container.appendChild(renderer.domElement)

  const scene = new THREE.Scene()
  scene.fog = new THREE.FogExp2('#58728a', 0.00115)

  const camera = new THREE.PerspectiveCamera(
    SCENE.fov,
    container.clientWidth / container.clientHeight,
    0.1,
    SCENE.far
  )
  camera.position.set(-32, 9, 42)

  const prefersReducedMotion =
    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.06
  controls.autoRotate = true
  controls.autoRotateSpeed = 0.16
  controls.target.set(24, 2.8, -58)
  controls.minPolarAngle = Math.PI * 0.18
  controls.maxPolarAngle = Math.PI * 0.39
  controls.minDistance = 12
  controls.maxDistance = 90
  controls.maxTargetRadius = 96

  const disableAutoRotate = () => {
    controls.autoRotate = false
  }
  renderer.domElement.addEventListener('pointerdown', disableAutoRotate)
  renderer.domElement.addEventListener('wheel', disableAutoRotate, { passive: true })
  renderer.domElement.addEventListener('touchstart', disableAutoRotate, { passive: true })

  const uniforms = {
    uTime: { value: 0 },
    uWind: { value: initial.windSpeed },
    uWaveHeight: { value: initial.waveHeight },
    uLight: { value: initial.lighting },
    uSunDir: { value: new THREE.Vector3(0.82, 0.32, -0.42).normalize() },
    uCamPos: { value: new THREE.Vector3() },
  }

  const skyMaterial = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms,
    vertexShader: `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      precision highp float;
      uniform float uTime;
      uniform float uLight;
      uniform vec3 uSunDir;
      varying vec3 vDir;

      float sat(float x) { return clamp(x, 0.0, 1.0); }
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        float a = hash(i);
        float b = hash(i + vec2(1.0, 0.0));
        float c = hash(i + vec2(0.0, 1.0));
        float d = hash(i + vec2(1.0, 1.0));
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
      }
      float fbm(vec2 p) {
        float v = 0.0;
        float a = 0.55;
        for (int i = 0; i < 4; i++) {
          v += a * noise(p);
          p *= 2.03;
          a *= 0.5;
        }
        return v;
      }

      void main() {
        vec3 dir = normalize(vDir);
        float h = sat(dir.y * 0.5 + 0.5);
        float clear = sat((uLight - 0.3) / 1.9);

        vec3 zenith = mix(vec3(0.24, 0.24, 0.36), vec3(0.10, 0.48, 0.78), clear);
        vec3 horizon = mix(vec3(0.70, 0.70, 0.78), vec3(1.0, 0.74, 0.56), clear);
        vec3 glow = mix(vec3(0.62, 0.50, 0.68), vec3(1.0, 0.58, 0.38), clear);
        vec3 brush = mix(vec3(0.34, 0.28, 0.44), vec3(1.0, 0.50, 0.34), clear);

        vec3 col = mix(horizon, zenith, pow(h, 1.4));

        float sun = pow(max(dot(dir, normalize(uSunDir)), 0.0), mix(48.0, 220.0, clear));
        col += glow * sun * mix(0.45, 1.08, clear);

        vec2 uv = dir.xz / max(dir.y + 0.28, 0.18);
        uv += vec2(uTime * 0.0025, uTime * 0.0018);
        float cloud = smoothstep(0.55, 0.82, fbm(uv * 0.9));
        cloud *= smoothstep(0.0, 0.35, dir.y);
        col = mix(col, mix(vec3(0.72, 0.78, 0.84), vec3(1.0, 0.93, 0.9), clear), cloud * 0.22);
        col += brush * pow(1.0 - abs(dir.y - 0.18), 3.0) * mix(0.04, 0.18, clear);

        gl_FragColor = vec4(col, 1.0);
      }
    `,
  })

  const sky = new THREE.Mesh(new THREE.SphereGeometry(SCENE.skyRadius, 32, 18), skyMaterial)
  scene.add(sky)

  const ambient = new THREE.HemisphereLight('#ffcda2', '#163241', 1.95)
  scene.add(ambient)

  const sunLight = new THREE.DirectionalLight('#ffcf94', 1.9)
  sunLight.position.set(120, 55, -95)
  scene.add(sunLight)

  const sunTexture = createGlowTexture('rgba(255,246,225,1)', 'rgba(255,177,98,0.55)')
  const sunHalo = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: sunTexture,
      color: '#ffb574',
      transparent: true,
      opacity: 0.36,
      depthWrite: false,
      depthTest: false,
    })
  )
  sunHalo.scale.set(168, 168, 1)
  scene.add(sunHalo)

  const sunDisk = new THREE.Mesh(
    new THREE.CircleGeometry(15, 48),
    new THREE.MeshBasicMaterial({
      color: '#fff0d7',
      transparent: true,
      opacity: 0.98,
      fog: false,
    })
  )
  scene.add(sunDisk)

  const waterMaterial = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    toneMapped: true,
    vertexShader: `
      precision highp float;
      uniform float uTime;
      uniform float uWind;
      uniform float uWaveHeight;

      varying vec3 vWorldPos;
      varying vec2 vXZ;
      varying float vWave;

      const float TAU = 6.28318530718;

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
      }

      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        float a = hash(i);
        float b = hash(i + vec2(1.0, 0.0));
        float c = hash(i + vec2(0.0, 1.0));
        float d = hash(i + vec2(1.0, 1.0));
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
      }

      float fbm(vec2 p) {
        float v = 0.0;
        float a = 0.55;
        for (int i = 0; i < 4; i++) {
          v += a * noise(p);
          p *= 2.03;
          a *= 0.5;
        }
        return v;
      }

      void addWave(vec2 xz, vec2 dir, float amplitude, float wavelength, float speed, inout vec3 pos, inout float waveMix) {
        float k = TAU / wavelength;
        float distortion = (fbm(xz * 0.012 + vec2(uTime * 0.012, -uTime * 0.01)) - 0.5) * wavelength * 0.42;
        float phase = k * dot(dir, xz + distortion) - uTime * speed;
        float s = sin(phase);
        pos.y += amplitude * s;
        waveMix += amplitude * s;
      }

      void main() {
        float wind = clamp(uWind, 0.0, 20.0);
        float wN = wind / 20.0;
        float sea = clamp(uWaveHeight / 2.2, 0.0, 1.0);
        float amp = mix(uWaveHeight, pow(uWaveHeight, 1.02), 0.25) * mix(0.85, 1.45, sea);
        float speed = mix(0.18, 0.92, wN);
        float len = mix(0.95, 2.35, sea);
        float chop = mix(0.75, 1.95, wN) * mix(0.82, 1.35, sea);

        vec3 pos = position;
        vec3 worldBase = (modelMatrix * vec4(pos, 1.0)).xyz;
        vXZ = worldBase.xz;

        float macroNoise = fbm(vXZ * 0.004 + vec2(uTime * 0.008, -uTime * 0.005));
        vec2 warp = vec2(
          sin(vXZ.y * 0.010 + uTime * 0.18 + macroNoise * 2.2),
          cos(vXZ.x * 0.008 - uTime * 0.14 - macroNoise * 1.9)
        ) * mix(8.0, 16.0, macroNoise);
        vec2 sampleXZ = vXZ + warp;

        float waveMix = 0.0;
        addWave(sampleXZ, normalize(vec2(1.0, 0.14)), 0.68 * amp, 156.0 * len, 0.92 * speed, pos, waveMix);
        addWave(sampleXZ, normalize(vec2(0.62, 0.94)), 0.32 * amp, 84.0 * len, 1.16 * speed, pos, waveMix);
        addWave(sampleXZ, normalize(vec2(-0.76, 0.34)), 0.24 * amp, 46.0 * len, 1.54 * speed, pos, waveMix);
        addWave(sampleXZ, normalize(vec2(-0.34, -0.94)), 0.14 * amp, 24.0 * len, 2.08 * speed, pos, waveMix);
        pos.y += (fbm(vXZ * 0.014 + vec2(uTime * 0.028, uTime * 0.016)) - 0.5) * amp * mix(0.28, 0.62, sea);
        pos.y += (fbm(vXZ * 0.032 + vec2(-uTime * 0.05, uTime * 0.04)) - 0.5) * amp * 0.12 * chop;

        vec4 world = modelMatrix * vec4(pos, 1.0);
        vWorldPos = world.xyz;
        vWave = waveMix * mix(0.9, 1.35, sea) + macroNoise * 0.18 * chop;
        gl_Position = projectionMatrix * viewMatrix * world;
      }
    `,
    fragmentShader: `
      precision highp float;
      uniform float uTime;
      uniform float uWind;
      uniform float uWaveHeight;
      uniform float uLight;
      uniform vec3 uSunDir;
      uniform vec3 uCamPos;

      varying vec3 vWorldPos;
      varying vec2 vXZ;
      varying float vWave;

      float sat(float x) { return clamp(x, 0.0, 1.0); }
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        float a = hash(i);
        float b = hash(i + vec2(1.0, 0.0));
        float c = hash(i + vec2(0.0, 1.0));
        float d = hash(i + vec2(1.0, 1.0));
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
      }
      float fbm(vec2 p) {
        float v = 0.0;
        float a = 0.55;
        for (int i = 0; i < 4; i++) {
          v += a * noise(p);
          p *= 2.02;
          a *= 0.5;
        }
        return v;
      }

      void main() {
        float clear = sat((uLight - 0.3) / 1.9);
        float wind = clamp(uWind, 0.0, 20.0) / 20.0;
        float sea = clamp(uWaveHeight / 2.2, 0.0, 1.0);
        float agitation = sat(wind * 0.65 + sea * 0.75);

        float macroNoise = fbm(vXZ * 0.004 + vec2(uTime * 0.008, -uTime * 0.005));
        vec2 warp = vec2(
          sin(vXZ.y * 0.010 + uTime * 0.18 + macroNoise * 2.2),
          cos(vXZ.x * 0.008 - uTime * 0.14 - macroNoise * 1.9)
        ) * mix(0.05, 0.12, macroNoise);
        vec2 p = vXZ * 0.0032 + warp;

        float rippleA = fbm(p * 12.0 + vec2(uTime * 0.05, -uTime * 0.03));
        float rippleB = fbm((p + vec2(4.2, -2.7)) * 18.0 + vec2(-uTime * 0.07, uTime * 0.04));
        float swellMask = fbm(p * 3.0 + vec2(uTime * 0.012, uTime * 0.018));
        vec2 ripple = vec2(rippleA - 0.5, rippleB - 0.5);

        vec3 N = normalize(vec3(
          -ripple.x * mix(0.12, 0.48, agitation) - (swellMask - 0.5) * mix(0.18, 0.44, sea),
          1.0,
          -ripple.y * mix(0.10, 0.40, agitation) + (swellMask - 0.5) * mix(0.14, 0.34, sea)
        ));

        vec3 V = normalize(uCamPos - vWorldPos);
        vec3 L = normalize(uSunDir);
        vec3 R = reflect(-V, N);

        float fresnel = pow(1.0 - max(dot(N, V), 0.0), 3.5);
        float spec = pow(max(dot(R, L), 0.0), mix(44.0, 120.0, clear));
        float depth = sat(1.0 - exp(-length(uCamPos - vWorldPos) * 0.012));

        vec3 deep = mix(vec3(0.05, 0.16, 0.32), vec3(0.04, 0.28, 0.50), clear);
        vec3 shallow = mix(vec3(0.18, 0.36, 0.52), vec3(0.22, 0.76, 0.80), clear);
        deep = mix(deep, vec3(0.07, 0.13, 0.34), sea * 0.42);
        shallow = mix(shallow, vec3(0.10, 0.56, 0.74), wind * 0.35);
        vec3 base = mix(shallow, deep, depth);

        float reflectionBand = pow(max(dot(normalize(vec3(L.x, 0.0, L.z)), normalize(vec3(V.x, 0.0, V.z))), 0.0), mix(11.0, 5.4, agitation));
        reflectionBand *= (0.3 + 0.8 * fresnel);
        reflectionBand *= smoothstep(-0.1, 0.3, N.y);
        reflectionBand *= mix(1.15, 0.82, wind);

        float crest = smoothstep(0.24, 0.96, vWave + rippleA * 0.18 + swellMask * 0.12);
        vec3 foam = vec3(0.92, 0.97, 1.0) * crest * mix(0.08, 0.42, agitation);
        vec3 painter = mix(vec3(0.22, 0.32, 0.58), vec3(1.0, 0.54, 0.40), clear) * pow(1.0 - depth, 2.0) * 0.08;

        vec3 col = base;
        col += vec3(1.0, 0.72, 0.42) * reflectionBand * mix(0.75, 2.1, clear);
        col += vec3(1.0, 0.86, 0.66) * spec * (0.55 + 1.15 * clear);
        col = mix(col, vec3(0.82, 0.88, 0.92), fresnel * mix(0.16, 0.28, sea));
        col += painter;
        col += foam;

        gl_FragColor = vec4(col, 1.0);
      }
    `,
  })

  const waterGeometry = new THREE.PlaneGeometry(
    SCENE.waterSize,
    SCENE.waterSize,
    SCENE.waterSegments,
    SCENE.waterSegments
  )
  waterGeometry.rotateX(-Math.PI / 2)
  const water = new THREE.Mesh(waterGeometry, waterMaterial)
  water.frustumCulled = false
  scene.add(water)

  const shore = createForegroundShore()
  scene.add(shore)

  const islands = createDistantIslands()
  scene.add(islands)

  const rightHeadland = createRightHeadland()
  scene.add(rightHeadland)

  const boat = createBoat()
  boat.position.set(16, 1.4, -48)
  boat.rotation.y = 0.18
  scene.add(boat)

  const buoy = new THREE.Group()
  const buoyBody = new THREE.Mesh(
    new THREE.CylinderGeometry(1.15, 1.4, 4.8, 12),
    new THREE.MeshStandardMaterial({
      color: '#f97352',
      roughness: 0.68,
      metalness: 0.05,
    })
  )
  buoyBody.position.y = 1.8
  buoy.add(buoyBody)

  const buoyTop = new THREE.Mesh(
    new THREE.CylinderGeometry(0.2, 0.28, 2.7, 8),
    new THREE.MeshStandardMaterial({
      color: '#f7d5b0',
      roughness: 0.7,
      metalness: 0.08,
    })
  )
  buoyTop.position.set(0, 4.9, 0)
  buoy.add(buoyTop)

  const buoyLamp = new THREE.PointLight('#ffd29b', 18, 64, 2)
  buoyLamp.position.set(0, 5.9, 0)
  buoy.add(buoyLamp)

  const buoyGlow = new THREE.Mesh(
    new THREE.SphereGeometry(0.48, 14, 14),
    new THREE.MeshBasicMaterial({ color: '#ffd7b2' })
  )
  buoyGlow.position.set(0, 5.7, 0)
  buoy.add(buoyGlow)
  buoy.position.set(2, 0.9, -24)
  scene.add(buoy)

  const shoreLanternA = new THREE.PointLight('#ffc78e', 10, 55, 2)
  shoreLanternA.position.set(-13, 4.8, 10)
  scene.add(shoreLanternA)
  const shoreLanternB = new THREE.PointLight('#ffdcb4', 7, 38, 2)
  shoreLanternB.position.set(-6.5, 3.7, 11.8)
  scene.add(shoreLanternB)

  const mistNear = createMistLayer(240, 58, '#d6e1ea', 0.12)
  mistNear.rotation.x = -Math.PI / 2
  mistNear.position.set(6, 1.15, -34)
  scene.add(mistNear)

  const mistFar = createMistLayer(420, 66, '#f2ddd2', 0.08)
  mistFar.rotation.x = -Math.PI / 2
  mistFar.position.set(18, 2.4, -172)
  scene.add(mistFar)

  const resizeObserver = new ResizeObserver((entries) => {
    for (const entry of entries) {
      const width = entry.contentRect.width
      const height = entry.contentRect.height
      renderer.setSize(width, height)
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, SCENE.maxPixelRatio))
      camera.aspect = width / height
      camera.updateProjectionMatrix()
    }
  })
  resizeObserver.observe(container)

  const clock = new THREE.Clock()
  let frameId = 0
  let time = 0
  const controlsState = { ...initial }

  const animate = () => {
    const dt = clock.getDelta()
    const motionScale = prefersReducedMotion ? 0.25 : 1.0
    const windN = clamp01(uniforms.uWind.value / 18)
    const seaN = clamp01(uniforms.uWaveHeight.value / 2.2)

    if (!controlsState.paused) {
      time += dt * motionScale * lerp(0.8, 1.15, windN)
      uniforms.uTime.value = time
    }

    water.position.x = camera.position.x
    water.position.z = camera.position.z
    sky.position.copy(camera.position)

    const clear = clamp01((uniforms.uLight.value - 0.3) / 1.9)
    const sunAz = -0.92 + Math.sin(time * 0.05) * 0.1
    const sunEl = lerp(0.18, 0.34, clear)
    uniforms.uSunDir.value.set(Math.cos(sunAz) * 0.88, sunEl, Math.sin(sunAz) * 0.48).normalize()
    sunLight.position.copy(uniforms.uSunDir.value).multiplyScalar(180)
    sunLight.intensity = lerp(1.45, 2.35, clear)
    ambient.intensity = lerp(1.55, 2.15, clear)
    controls.autoRotateSpeed = lerp(0.09, 0.24, windN)
    controls.dampingFactor = lerp(0.05, 0.09, seaN)

    const boatY = sampleWave(boat.position.x, boat.position.z, time, uniforms.uWind.value, uniforms.uWaveHeight.value)
    const boatYx = sampleWave(boat.position.x + 5.4, boat.position.z, time, uniforms.uWind.value, uniforms.uWaveHeight.value)
    const boatYz = sampleWave(boat.position.x, boat.position.z + 4.8, time, uniforms.uWind.value, uniforms.uWaveHeight.value)
    boat.position.y = 1.85 + boatY
    boat.rotation.z = (boatYx - boatY) * lerp(0.03, 0.065, seaN)
    boat.rotation.x = (boatYz - boatY) * lerp(0.026, 0.052, seaN)
    boat.rotation.y = 0.18 + Math.sin(time * lerp(0.12, 0.28, windN)) * lerp(0.025, 0.065, windN)

    const buoyY = sampleWave(buoy.position.x, buoy.position.z, time, uniforms.uWind.value, uniforms.uWaveHeight.value)
    buoy.position.y = 1.2 + buoyY
    buoy.rotation.z = Math.sin(time * lerp(0.9, 1.6, windN)) * lerp(0.04, 0.09, seaN)
    buoy.rotation.x = Math.cos(time * lerp(0.8, 1.35, windN)) * lerp(0.025, 0.06, seaN)

    shore.position.y = -0.15 + Math.sin(time * 0.08) * 0.02
    mistNear.position.x = 6 + Math.sin(time * lerp(0.04, 0.1, windN)) * lerp(5, 12, windN)
    ;(mistNear.material as THREE.MeshBasicMaterial).opacity = lerp(0.07, 0.12, clear) + Math.sin(time * 0.25) * 0.02
    mistFar.position.x = 18 + Math.cos(time * lerp(0.03, 0.08, windN)) * lerp(7, 14, windN)
    ;(mistFar.material as THREE.MeshBasicMaterial).opacity = lerp(0.04, 0.085, clear) + Math.cos(time * 0.18) * 0.015

    sunDisk.position.set(
      uniforms.uSunDir.value.x * 238,
      28 + uniforms.uSunDir.value.y * 80,
      uniforms.uSunDir.value.z * 238 - 152
    )
    sunDisk.lookAt(camera.position)
    sunHalo.position.copy(sunDisk.position)
    ;(sunHalo.material as THREE.SpriteMaterial).opacity = lerp(0.22, 0.4, clear)
    sunHalo.scale.setScalar(lerp(144, 184, clear))

    controls.target.y = Math.max(1.8, controls.target.y)
    camera.position.y = Math.max(4.5, camera.position.y)
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
      renderer.domElement.removeEventListener('pointerdown', disableAutoRotate)
      renderer.domElement.removeEventListener('wheel', disableAutoRotate)
      renderer.domElement.removeEventListener('touchstart', disableAutoRotate)

      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }

      waterGeometry.dispose()
      waterMaterial.dispose()
      sky.geometry.dispose()
      skyMaterial.dispose()
      ;(sunDisk.geometry as THREE.BufferGeometry).dispose()
      ;(sunDisk.material as THREE.Material).dispose()
      ;(sunHalo.material as THREE.Material).dispose()
      sunTexture.dispose()
      ;(mistNear.material as THREE.Material).dispose()
      ;(mistFar.material as THREE.Material).dispose()
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
    [lighting, paused, waveHeight, windSpeed]
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
        background:
          'linear-gradient(180deg, rgba(255,189,133,0.24) 0%, rgba(89,138,170,0.18) 26%, rgba(17,51,78,0.78) 58%, rgba(7,22,35,1) 100%)',
      }}
    />
  )
}
