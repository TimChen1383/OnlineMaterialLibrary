import { useRef, useMemo, useEffect } from 'react'
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

uniform float uTime;
uniform vec2 uResolution;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;

void main() {
  vec2 uv = vUv;
  vec3 normal = vNormal;
  vec3 position = vPosition;
  float time = uTime;
  vec2 resolution = uResolution;

  vec3 finalColor = vec3(1.0);

  ${userCode}

  gl_FragColor = vec4(finalColor, 1.0);
}
`
}

function ShaderSphere({ userCode }) {
  const materialRef = useRef()
  const { gl } = useThree()

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uResolution: { value: new THREE.Vector2(300, 300) }
  }), [])

  const material = useMemo(() => {
    const fragmentShader = wrapUserCode(userCode)

    // Manually compile shader to check for errors
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
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime
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
  const navigate = useNavigate()

  const handleClick = () => {
    navigate(`/editor/${shader.id}`)
  }

  return (
    <div className="shader-card" onClick={handleClick}>
      <div className="shader-preview">
        <Canvas camera={{ position: [0, 0, 4], fov: 50 }}>
          <color attach="background" args={['#0a0a0f']} />
          <ShaderSphere userCode={shader.code} />
        </Canvas>
      </div>
      <div className="shader-info">
        <h3>{shader.name}</h3>
      </div>
    </div>
  )
}
