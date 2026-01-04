import { useRef, useMemo, useEffect } from 'react'
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

// Wrap user code into a complete fragment shader
function wrapUserCode(userCode) {
  return `
precision highp float;

uniform float uTime;
uniform vec2 uResolution;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;

void main() {
  // Pre-defined variables for user convenience
  vec2 uv = vUv;
  vec3 normal = vNormal;
  vec3 position = vPosition;
  float time = uTime;
  vec2 resolution = uResolution;

  // Default output
  vec3 finalColor = vec3(1.0);

  // ---- USER CODE START ----
  ${userCode}
  // ---- USER CODE END ----

  gl_FragColor = vec4(finalColor, 1.0);
}
`
}

function ShaderMesh({ meshType, userCode, onError }) {
  const meshRef = useRef()
  const materialRef = useRef()
  const { gl } = useThree()

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uResolution: { value: new THREE.Vector2(800, 600) }
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
    const fragmentShader = wrapUserCode(userCode)

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
        const line = parseInt(lineMatch[1]) - 22 // Offset for wrapper code (user code starts at line 23)
        const msg = lineMatch[2].trim()
        errorMsg = `Line ${line > 0 ? line : '?'}: ${msg}`
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
  }, [userCode, uniforms, onError, gl])

  useFrame((state) => {
    if (materialRef.current && materialRef.current.uniforms) {
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime
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

export default function Viewer({ meshType, userCode, onError }) {
  return (
    <Canvas camera={{ position: [0, 0, 5], fov: 50 }}>
      <color attach="background" args={['#0a0a0f']} />
      <ShaderMesh
        meshType={meshType}
        userCode={userCode}
        onError={onError}
      />
      <OrbitControls enableDamping dampingFactor={0.05} />
    </Canvas>
  )
}

// Export for use in ExportModal
export { VERTEX_SHADER, wrapUserCode }
