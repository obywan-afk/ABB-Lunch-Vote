'use client'

import { useEffect, useRef } from 'react'
import * as THREE from 'three'

/**
 * Visual Concept: "Liquid Chrome & Glass"
 * 
 * A high-end, futuristic aesthetic inspired by modern SaaS branding (like Linear or Raycast).
 * 
 * Design Elements:
 * - Materials: A mix of polished Chrome (reflective) and Frosted Glass (translucent/refractive).
 * - Geometry: Smooth, organic primitives (Spheres, Icosahedrons with high detail).
 * - Composition: Objects float in an orbital ring, keeping the center clear for the login form
 *   while framing it with beautiful 3D elements.
 * - Lighting: Dramatic rim lighting with cool (blue/teal) and warm (purple/pink) accents.
 */

// Visual Configuration
const CONFIG = {
  // Appearance
  bgColor: 0x020617,       // Slate 950 (Deep dark blue)
  chromeColor: 0xffffff,
  glassColor: 0xc7d2fe,    // Indigo 200 (brighter for sharpness)
  
  // Objects
  particleCount: 30,
  orbitRadius: 10,         // Radius of the ring around the center
  orbitSpeed: 0.02,        // Slower, more majestic
  
  // Physics/Interaction
  mouseLag: 0.05,          // Slower lag for heavier feel
  parallaxStrength: 4.0,   // Increased strength to be noticeable
}

function buildScene(container: HTMLDivElement) {
  // --- 1. SETUP ---
  const renderer = new THREE.WebGLRenderer({
    antialias: true, // MSAA
    alpha: true,
    powerPreference: 'high-performance',
    stencil: false,
    depth: true,
  })
  
  // Sharpness Fix: Use full device pixel ratio (capped at 3 for insane screens)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 3))
  renderer.setSize(container.clientWidth, container.clientHeight)
  renderer.setClearColor(CONFIG.bgColor, 1)
  
  // Color Management for correct contrast/sharpness
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.0
  
  // Enable shadow maps for depth
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  
  container.appendChild(renderer.domElement)

  const scene = new THREE.Scene()
  // Fog
  scene.fog = new THREE.FogExp2(CONFIG.bgColor, 0.02)

  const camera = new THREE.PerspectiveCamera(
    45, 
    container.clientWidth / container.clientHeight, 
    0.1, 
    100
  )
  camera.position.set(0, 0, 22)

  // --- 2. MATERIALS ---
  // High-end PBR Materials
  
  // Polished Chrome
  const chromeMaterial = new THREE.MeshStandardMaterial({
    color: CONFIG.chromeColor,
    metalness: 1.0,
    roughness: 0.1,
    envMapIntensity: 1.0,
  })

  // Frosted Glass
  const glassMaterial = new THREE.MeshPhysicalMaterial({
    color: CONFIG.glassColor,
    metalness: 0.1,
    roughness: 0.2,
    transmission: 0.9, // Glass-like transparency
    thickness: 1.5,    // Refraction volume
    clearcoat: 1.0,
    clearcoatRoughness: 0.1,
    ior: 1.5,
  })

  // Matte Dark (Connector bits)
  const matteMaterial = new THREE.MeshStandardMaterial({
    color: 0x1e293b, // Slate 800
    roughness: 0.9,
    metalness: 0.0,
  })

  // --- 3. OBJECTS ---
  const objects: { mesh: THREE.Mesh; angle: number; speed: number; radius: number; floatY: number; speedFloat: number }[] = []
  
  // Geometries
  const geoSphere = new THREE.IcosahedronGeometry(1, 4) // High poly sphere
  const geoTorus = new THREE.TorusGeometry(0.8, 0.25, 16, 50)
  const geoCap = new THREE.CapsuleGeometry(0.5, 1, 4, 16)

  for (let i = 0; i < CONFIG.particleCount; i++) {
    // Choose material & geometry
    const rand = Math.random()
    let mesh
    if (rand > 0.6) {
      mesh = new THREE.Mesh(geoSphere, chromeMaterial)
    } else if (rand > 0.3) {
      mesh = new THREE.Mesh(geoSphere, glassMaterial)
    } else {
       // Occasional shape variants
       mesh = new THREE.Mesh(rand > 0.15 ? geoTorus : geoCap, rand > 0.15 ? matteMaterial : chromeMaterial)
    }

    // Position: Distribute in a hollow cylinder/ring (avoiding center)
    const angle = (Math.random() * Math.PI * 2)
    const zDepth = (Math.random() - 0.5) * 15 // Spread in depth
    const radius = CONFIG.orbitRadius + (Math.random() * 8) // Don't spawn too close to center

    mesh.position.set(
      Math.cos(angle) * radius,
      (Math.random() - 0.5) * 15, // Spread vertically
      zDepth
    )

    // Scale variation
    const scale = 0.5 + Math.random() * 1.5
    mesh.scale.setScalar(scale)
    
    // Random initial rotation
    mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0)
    
    // Shadows
    mesh.castShadow = true
    mesh.receiveShadow = true

    scene.add(mesh)

    objects.push({
      mesh,
      angle, // store varied angle
      radius, // store varied radius
      speed: (Math.random() * 0.2 + 0.1) * (Math.random() > 0.5 ? 1 : -1), // Orbit speed
      floatY: mesh.position.y,
      speedFloat: Math.random() * 2 + 0.5
    })
  }

  // --- 4. LIGHTING ---
  // Create a studio lighting setup
  const ambientLight = new THREE.AmbientLight(0x475569, 0.4) // Cool grey ambient
  scene.add(ambientLight)

  // Warm Highlight (Top Left)
  const spotLight1 = new THREE.SpotLight(0xa855f7, 200) // Purple
  spotLight1.position.set(-20, 20, 10)
  spotLight1.angle = 0.5
  spotLight1.penumbra = 1
  spotLight1.castShadow = true
  scene.add(spotLight1)

  // Cool Rim Light (Bottom Right)
  const spotLight2 = new THREE.SpotLight(0x38bdf8, 200) // Cyan
  spotLight2.position.set(20, -10, 10)
  spotLight2.angle = 0.5
  spotLight2.penumbra = 1
  scene.add(spotLight2)

  // Front Fill
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.5)
  dirLight.position.set(0, 0, 10)
  scene.add(dirLight)

  // --- 5. INTERACTION & ANIMATION ---
  const mouse = new THREE.Vector2(0, 0)
  const targetCam = new THREE.Vector3(0, 0, 25)
  
  const handleMouseMove = (e: MouseEvent) => {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1
  }

  // Resize Observer for robustness
  const resizeObserver = new ResizeObserver((entries) => {
    for (const entry of entries) {
      const width = entry.contentRect.width
      const height = entry.contentRect.height
      renderer.setSize(width, height)
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 3))
      camera.aspect = width / height
      camera.updateProjectionMatrix()
    }
  })
  resizeObserver.observe(container)

  window.addEventListener('mousemove', handleMouseMove)

  const clock = new THREE.Clock()
  let frameId: number

  const animate = () => {
    const time = clock.getElapsedTime()

    // 1. Camera Parallax
    // Gently move camera opposite to mouse for depth feeling
    const targetX = mouse.x * CONFIG.parallaxStrength
    const targetY = mouse.y * CONFIG.parallaxStrength
    
    // Smooth Lerp
    camera.position.x += (targetX - camera.position.x) * CONFIG.mouseLag
    camera.position.y += (targetY - camera.position.y) * CONFIG.mouseLag
    camera.lookAt(0, 0, 0)

    // 2. Object Animation
    objects.forEach((obj, i) => {
      // Rotation (Self)
      obj.mesh.rotation.x += 0.005
      obj.mesh.rotation.y += 0.008

      // Gentle Orbit around center
      // We modify the angle over time
      const currentAngle = obj.angle + time * CONFIG.orbitSpeed * 0.2
      // Update X and Z to orbit
      obj.mesh.position.x = Math.cos(currentAngle) * obj.radius
      obj.mesh.position.z = Math.sin(currentAngle) * obj.radius * 0.5 // elliptical orbit compressed in Z

      // Floating (Bobbing)
      obj.mesh.position.y = obj.floatY + Math.sin(time * 0.5 + i) * 1.5
    })

    // 3. Light Animation (Subtle breathing)
    spotLight1.intensity = 200 + Math.sin(time) * 50
    spotLight2.intensity = 200 + Math.cos(time * 0.8) * 50

    renderer.render(scene, camera)
    frameId = requestAnimationFrame(animate)
  }

  animate()

  return () => {
    window.removeEventListener('mousemove', handleMouseMove)
    resizeObserver.disconnect()
    cancelAnimationFrame(frameId)
    
    if (container.contains(renderer.domElement)) {
      container.removeChild(renderer.domElement)
    }
    
    renderer.dispose()
    
    // Dispose geometry/materials
    geoSphere.dispose()
    geoTorus.dispose()
    geoCap.dispose()
    chromeMaterial.dispose()
    glassMaterial.dispose()
    matteMaterial.dispose()
  }
}

export function ThreeGridBackground() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return
    const dispose = buildScene(containerRef.current)
    return () => dispose()
  }, [])

  return (
    <div 
      ref={containerRef} 
      className="absolute inset-0 w-full h-full -z-10 bg-slate-950"
    />
  )
}
