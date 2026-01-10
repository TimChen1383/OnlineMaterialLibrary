import { useRef, useMemo, useEffect, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'

// Fixed vertex shader - users don't need to touch this
const VERTEX_SHADER = `
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;

void main() {
  vUv = uv;
  vNormal = normalize(normalMatrix * normal);
  vPosition = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

// Wrap user code into a complete fragment shader (Material Library mode)
function wrapUserCode(userCode) {
  return `
precision highp float;

uniform vec2 uResolution;
uniform float uTime;
uniform float uTimeDelta;
uniform float uFrame;
uniform float uFrameRate;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;

void main() {
  // Pre-defined variables for user convenience (aligned with ShaderToy naming)
  vec2 iResolution = uResolution;
  float iTime = uTime;
  float iTimeDelta = uTimeDelta;
  float iFrame = uFrame;
  float iFrameRate = uFrameRate;
  vec2 iUV = vUv;
  vec3 iNormal = vNormal;
  vec3 iPosition = vPosition;

  // Default output (vec4 RGBA)
  vec4 fragColor = vec4(1.0);

  // ---- USER CODE START ----
  ${userCode}
  // ---- USER CODE END ----

  gl_FragColor = fragColor;
}
`
}

// Wrap user code for ShaderToy compatibility mode
function wrapUserCodeShaderToy(userCode) {
  return `
precision highp float;

uniform vec2 uResolution;
uniform float uTime;
uniform float uTimeDelta;
uniform float uFrame;
uniform float uFrameRate;

varying vec2 vUv;

// ShaderToy compatible uniforms
vec3 iResolution;
float iTime;
float iTimeDelta;
float iFrame;
float iFrameRate;

// ---- USER CODE START ----
${userCode}
// ---- USER CODE END ----

void main() {
  // Initialize ShaderToy uniforms
  iResolution = vec3(uResolution, 1.0);
  iTime = uTime;
  iTimeDelta = uTimeDelta;
  iFrame = uFrame;
  iFrameRate = uFrameRate;

  // Calculate fragCoord from UV (ShaderToy uses pixel coordinates)
  vec2 fragCoord = vUv * uResolution;

  // Call user's mainImage function
  vec4 fragColor = vec4(0.0);
  mainImage(fragColor, fragCoord);

  gl_FragColor = fragColor;
}
`
}

// Check for unsupported ShaderToy parameters
function checkUnsupportedShaderToyParams(userCode) {
  const unsupportedParams = []

  if (/\biMouse\b/.test(userCode)) {
    unsupportedParams.push('iMouse (mouse input not supported)')
  }
  if (/\biDate\b/.test(userCode)) {
    unsupportedParams.push('iDate (date input not supported)')
  }
  if (/\biSampleRate\b/.test(userCode)) {
    unsupportedParams.push('iSampleRate (audio not supported)')
  }
  if (/\biChannelResolution\b/.test(userCode)) {
    unsupportedParams.push('iChannelResolution (texture channels not supported)')
  }
  if (/\biChannelTime\b/.test(userCode)) {
    unsupportedParams.push('iChannelTime (texture channels not supported)')
  }
  if (/\biChannel\d\b/.test(userCode)) {
    unsupportedParams.push('iChannel0-3 (texture inputs not supported)')
  }
  if (/\btexture\s*\(/.test(userCode)) {
    unsupportedParams.push('texture() (texture sampling not supported)')
  }

  return unsupportedParams
}

function ShaderMesh({ meshType, userCode, shaderRule, onError }) {
  const meshRef = useRef()
  const materialRef = useRef()
  const { gl } = useThree()
  const frameCountRef = useRef(0)
  const lastTimeRef = useRef(0)

  const uniforms = useMemo(() => ({
    uResolution: { value: new THREE.Vector2(800, 600) },
    uTime: { value: 0 },
    uTimeDelta: { value: 0 },
    uFrame: { value: 0 },
    uFrameRate: { value: 60 }
  }), [])

  // Update resolution on resize
  useEffect(() => {
    const updateResolution = () => {
      const width = window.innerWidth / 2
      const height = window.innerHeight
      uniforms.uResolution.value.set(width, height)
    }
    updateResolution()
    window.addEventListener('resize', updateResolution)
    return () => window.removeEventListener('resize', updateResolution)
  }, [uniforms])

  const material = useMemo(() => {
    // Check for unsupported parameters in ShaderToy mode
    let warnings = []
    if (shaderRule === 'shadertoy') {
      warnings = checkUnsupportedShaderToyParams(userCode)
    }

    // Use appropriate wrapper based on shader rule
    const fragmentShader = shaderRule === 'shadertoy'
      ? wrapUserCodeShaderToy(userCode)
      : wrapUserCode(userCode)

    // Line offset depends on the wrapper used
    // Material Library: user code starts at line 29 (offset 28)
    // ShaderToy: user code starts at line 20 (offset 19)
    const lineOffset = shaderRule === 'shadertoy' ? 19 : 28

    // Manually compile shader to check for errors
    const glContext = gl.getContext()
    const shader = glContext.createShader(glContext.FRAGMENT_SHADER)
    glContext.shaderSource(shader, fragmentShader)
    glContext.compileShader(shader)

    const success = glContext.getShaderParameter(shader, glContext.COMPILE_STATUS)
    const log = glContext.getShaderInfoLog(shader)
    glContext.deleteShader(shader)

    if (!success && log) {
      // Parse error message to adjust line numbers
      let errorMsg = log
      const lineMatch = log.match(/ERROR: \d+:(\d+):(.*)/)
      if (lineMatch) {
        const line = parseInt(lineMatch[1]) - lineOffset
        const msg = lineMatch[2].trim()
        errorMsg = `Line ${line > 0 ? line : '?'}: ${msg}`
      }
      // Prepend warnings if any
      if (warnings.length > 0) {
        errorMsg = `Warning: Unsupported parameters - ${warnings.join(', ')}\n${errorMsg}`
      }
      onError(errorMsg)
      return new THREE.MeshBasicMaterial({ color: 0x331111 })
    }

    // Show warnings even if compilation succeeds
    if (warnings.length > 0) {
      onError(`Warning: Unsupported parameters - ${warnings.join(', ')}`)
    } else {
      onError(null)
    }

    return new THREE.ShaderMaterial({
      uniforms,
      vertexShader: VERTEX_SHADER,
      fragmentShader,
      side: THREE.DoubleSide
    })
  }, [userCode, shaderRule, uniforms, onError, gl])

  useFrame((state) => {
    if (materialRef.current && materialRef.current.uniforms) {
      const currentTime = state.clock.elapsedTime
      const deltaTime = currentTime - lastTimeRef.current
      lastTimeRef.current = currentTime
      frameCountRef.current++

      materialRef.current.uniforms.uTime.value = currentTime
      materialRef.current.uniforms.uTimeDelta.value = deltaTime
      materialRef.current.uniforms.uFrame.value = frameCountRef.current
      materialRef.current.uniforms.uFrameRate.value = deltaTime > 0 ? 1 / deltaTime : 60
    }
  })

  // Update material ref when material changes
  useEffect(() => {
    materialRef.current = material
  }, [material])

  const geometry = useMemo(() => {
    switch (meshType) {
      case 'cube':
        return new THREE.BoxGeometry(2, 2, 2)
      case 'plane':
        return new THREE.PlaneGeometry(3, 3, 32, 32)
      case 'sphere':
      default:
        return new THREE.SphereGeometry(1.5, 64, 64)
    }
  }, [meshType])

  return (
    <mesh ref={meshRef} geometry={geometry} material={material} />
  )
}

// FPS tracker component
function FpsTracker({ onFpsUpdate }) {
  const frameCount = useRef(0)
  const lastTime = useRef(performance.now())

  useFrame(() => {
    frameCount.current++
    const now = performance.now()
    const delta = now - lastTime.current

    if (delta >= 500) { // Update every 500ms
      const fps = Math.round((frameCount.current * 1000) / delta)
      onFpsUpdate?.(fps)
      frameCount.current = 0
      lastTime.current = now
    }
  })

  return null
}

export default function Viewer({ meshType, userCode, shaderRule, onError, onFpsUpdate }) {
  return (
    <Canvas camera={{ position: [0, 0, 5], fov: 50 }}>
      <color attach="background" args={['#0a0a0f']} />
      <ShaderMesh
        meshType={meshType}
        userCode={userCode}
        shaderRule={shaderRule}
        onError={onError}
      />
      <OrbitControls enableDamping dampingFactor={0.05} />
      <FpsTracker onFpsUpdate={onFpsUpdate} />
    </Canvas>
  )
}

// Export for use in ExportModal
export { VERTEX_SHADER, wrapUserCode }
