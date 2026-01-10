import { useRef, useMemo, useEffect, useState, useCallback } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useNavigate } from 'react-router-dom'
import * as THREE from 'three'

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

  ${userCode}

  gl_FragColor = fragColor;
}
`
}

// Component to capture a snapshot after first render
function SnapshotCapture({ userCode, onSnapshot }) {
  const { gl, scene, camera } = useThree()
  const hasCaptured = useRef(false)

  const uniforms = useMemo(() => ({
    uResolution: { value: new THREE.Vector2(300, 300) },
    uTime: { value: 0 },
    uTimeDelta: { value: 0 },
    uFrame: { value: 0 },
    uFrameRate: { value: 60 }
  }), [])

  const material = useMemo(() => {
    const fragmentShader = wrapUserCode(userCode)

    const glContext = gl.getContext()
    const shader = glContext.createShader(glContext.FRAGMENT_SHADER)
    glContext.shaderSource(shader, fragmentShader)
    glContext.compileShader(shader)

    const success = glContext.getShaderParameter(shader, glContext.COMPILE_STATUS)
    glContext.deleteShader(shader)

    if (!success) {
      return new THREE.MeshBasicMaterial({ color: 0x331111 })
    }

    return new THREE.ShaderMaterial({
      uniforms,
      vertexShader: VERTEX_SHADER,
      fragmentShader,
      side: THREE.DoubleSide
    })
  }, [userCode, uniforms, gl])

  useFrame(() => {
    if (!hasCaptured.current) {
      // Render once and capture
      gl.render(scene, camera)
      const dataUrl = gl.domElement.toDataURL('image/png')
      onSnapshot(dataUrl)
      hasCaptured.current = true
    }
  })

  return (
    <mesh>
      <sphereGeometry args={[1.5, 64, 64]} />
      <primitive object={material} attach="material" />
    </mesh>
  )
}

// Live animated shader sphere
function ShaderSphere({ userCode }) {
  const materialRef = useRef()
  const { gl } = useThree()
  const frameCountRef = useRef(0)
  const lastTimeRef = useRef(0)

  const uniforms = useMemo(() => ({
    uResolution: { value: new THREE.Vector2(300, 300) },
    uTime: { value: 0 },
    uTimeDelta: { value: 0 },
    uFrame: { value: 0 },
    uFrameRate: { value: 60 }
  }), [])

  const material = useMemo(() => {
    const fragmentShader = wrapUserCode(userCode)

    const glContext = gl.getContext()
    const shader = glContext.createShader(glContext.FRAGMENT_SHADER)
    glContext.shaderSource(shader, fragmentShader)
    glContext.compileShader(shader)

    const success = glContext.getShaderParameter(shader, glContext.COMPILE_STATUS)
    glContext.deleteShader(shader)

    if (!success) {
      return new THREE.MeshBasicMaterial({ color: 0x331111 })
    }

    return new THREE.ShaderMaterial({
      uniforms,
      vertexShader: VERTEX_SHADER,
      fragmentShader,
      side: THREE.DoubleSide
    })
  }, [userCode, uniforms, gl])

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

  useEffect(() => {
    materialRef.current = material
  }, [material])

  return (
    <mesh>
      <sphereGeometry args={[1.5, 64, 64]} />
      <primitive object={material} attach="material" />
    </mesh>
  )
}

export default function ShaderCard({ shader }) {
  const [isHovered, setIsHovered] = useState(false)
  const [thumbnail, setThumbnail] = useState(null)
  const navigate = useNavigate()

  const handleClick = () => {
    navigate(`/editor/${shader.id}`)
  }

  const handleSnapshot = useCallback((dataUrl) => {
    setThumbnail(dataUrl)
  }, [])

  return (
    <div
      className="shader-card"
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="shader-preview">
        {isHovered ? (
          // Live animated shader when hovering
          <Canvas camera={{ position: [0, 0, 4], fov: 50 }}>
            <color attach="background" args={['#0a0a0f']} />
            <ShaderSphere userCode={shader.code} />
          </Canvas>
        ) : thumbnail ? (
          // Static thumbnail when not hovering
          <img src={thumbnail} alt={shader.name} className="shader-thumbnail" />
        ) : (
          // Capture snapshot on first render
          <Canvas camera={{ position: [0, 0, 4], fov: 50 }}>
            <color attach="background" args={['#0a0a0f']} />
            <SnapshotCapture userCode={shader.code} onSnapshot={handleSnapshot} />
          </Canvas>
        )}
      </div>
      <div className="shader-info">
        <h3>{shader.name}</h3>
      </div>
    </div>
  )
}
