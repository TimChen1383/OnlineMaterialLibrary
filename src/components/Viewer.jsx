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

// Convert spirv-cross GLSL ES output to WebGL-compatible GLSL
function convertSlangGlslToWebGL(glslEsCode) {
  let code = glslEsCode

  // Remove #version directive (WebGL doesn't need it)
  code = code.replace(/#version\s+\d+.*\r?\n?/g, '')

  // Remove precision declarations (we'll add our own)
  code = code.replace(/precision\s+(lowp|mediump|highp)\s+(float|int)\s*;\s*\r?\n?/g, '')

  // Remove the GlobalParams_std140 struct definition
  code = code.replace(/struct\s+GlobalParams_std140\s*\{[^}]*\}\s*;\s*/gs, '')

  // Remove the uniform struct instance declaration
  code = code.replace(/uniform\s+GlobalParams_std140\s+globalParams\s*;\s*/g, `
uniform vec2 uResolution;
uniform float uTime;
uniform float uTimeDelta;
uniform float uFrame;
uniform float uFrameRate;
`)

  // Map spirv-cross uniform references to our uniform names
  code = code.replace(/globalParams\.uResolution/g, 'uResolution')
  code = code.replace(/globalParams\.uTime/g, 'uTime')
  code = code.replace(/globalParams\.uTimeDelta/g, 'uTimeDelta')
  code = code.replace(/globalParams\.uFrame/g, 'uFrame')
  code = code.replace(/globalParams\.uFrameRate/g, 'uFrameRate')

  // Map spirv-cross varying names to our vertex shader's varying names
  code = code.replace(/\binput_uv\b/g, 'vUv')
  code = code.replace(/\binput_normal\b/g, 'vNormal')
  code = code.replace(/\binput_position\b/g, 'vPosition')

  // Remove highp qualifiers from varying declarations (we'll use global precision)
  code = code.replace(/varying\s+highp\s+/g, 'varying ')

  // Convert gl_FragData[0] to gl_FragColor
  code = code.replace(/gl_FragData\s*\[\s*0\s*\]/g, 'gl_FragColor')

  // Convert infinite loop pattern for(;;) to WebGL-compatible loop
  code = code.replace(/for\s*\(\s*;\s*;\s*\)/g, 'for(int _loopIdx = 0; _loopIdx < 10000; _loopIdx++)')

  // Add precision qualifier at the beginning
  code = 'precision highp float;\n' + code

  // Clean up multiple empty lines and carriage returns
  code = code.replace(/\r\n/g, '\n')
  code = code.replace(/\n{3,}/g, '\n\n')

  return code.trim()
}

function ShaderMesh({ meshType, userCode, onError, slangCompiled }) {
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
    // Check if we have compiled code
    if (!userCode) {
      // No compiled code yet - show placeholder
      onError('Click "Compile" to preview shader (Ctrl+Enter)')
      return new THREE.MeshBasicMaterial({ color: 0x1a1a2e })
    }

    // userCode is already the compiled GLSL from server
    // We need to convert it from GLSL 450 to WebGL-compatible GLSL
    const fragmentShader = convertSlangGlslToWebGL(userCode)

    // Manually compile shader to check for errors
    const glContext = gl.getContext()
    const shader = glContext.createShader(glContext.FRAGMENT_SHADER)
    glContext.shaderSource(shader, fragmentShader)
    glContext.compileShader(shader)

    const success = glContext.getShaderParameter(shader, glContext.COMPILE_STATUS)
    const log = glContext.getShaderInfoLog(shader)
    glContext.deleteShader(shader)

    if (!success && log) {
      // Parse error message
      let errorMsg = log
      const lineMatch = log.match(/ERROR: \d+:(\d+):(.*)/)
      if (lineMatch) {
        const msg = lineMatch[2].trim()
        errorMsg = `WebGL Error: ${msg}`
      }
      onError(errorMsg)
      return new THREE.MeshBasicMaterial({ color: 0x331111 })
    }

    onError(null)

    return new THREE.ShaderMaterial({
      uniforms,
      vertexShader: VERTEX_SHADER,
      fragmentShader,
      side: THREE.DoubleSide
    })
  }, [userCode, uniforms, onError, gl, slangCompiled])

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

export default function Viewer({ meshType, userCode, onError, onFpsUpdate, slangCompiled }) {
  return (
    <Canvas camera={{ position: [0, 0, 5], fov: 50 }}>
      <color attach="background" args={['#0a0a0f']} />
      <ShaderMesh
        meshType={meshType}
        userCode={userCode}
        onError={onError}
        slangCompiled={slangCompiled}
      />
      <OrbitControls enableDamping dampingFactor={0.05} />
      <FpsTracker onFpsUpdate={onFpsUpdate} />
    </Canvas>
  )
}

// Export VERTEX_SHADER for potential external use
export { VERTEX_SHADER }
