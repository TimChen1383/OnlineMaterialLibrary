import { useState, useCallback, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Viewer from './Viewer'
import ShaderEditor from './ShaderEditor'
import ExportModal from './ExportModal'
import { getShaderById } from '../shaders'

// Default user code - just the material logic
const DEFAULT_CODE = `// Available variables:
//   uv       - texture coordinates (0-1)
//   normal   - surface normal (vec3)
//   position - vertex position (vec3)
//   time     - elapsed time in seconds
//   resolution - screen size (vec2)
//
// Output: set finalColor (vec3)

// Animated gradient
vec3 color1 = vec3(0.1, 0.3, 0.6);
vec3 color2 = vec3(0.9, 0.2, 0.3);

float t = sin(time + uv.x * 3.14159) * 0.5 + 0.5;
vec3 color = mix(color1, color2, t);

// Simple lighting
vec3 lightDir = normalize(vec3(1.0, 1.0, 1.0));
float diff = max(dot(normal, lightDir), 0.0);
color *= 0.5 + 0.5 * diff;

finalColor = color;`

export default function Editor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [meshType, setMeshType] = useState('sphere')
  const [userCode, setUserCode] = useState(DEFAULT_CODE)
  const [shaderName, setShaderName] = useState('New Shader')
  const [error, setError] = useState(null)
  const [showExport, setShowExport] = useState(false)
  const [fps, setFps] = useState(0)

  // Load shader if ID is provided
  useEffect(() => {
    if (id) {
      const shader = getShaderById(id)
      if (shader) {
        setUserCode(shader.code)
        setShaderName(shader.name)
      }
    }
  }, [id])

  const handleError = useCallback((err) => {
    setError(err)
  }, [])

  return (
    <div className="app">
      {/* Editor Panel */}
      <div className="editor-panel">
        <div className="editor-header">
          <div className="editor-title">
            <button className="back-btn" onClick={() => navigate('/')}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7"/>
              </svg>
            </button>
            <h2>{shaderName}</h2>
          </div>
          <span className="editor-hint">GLSL</span>
        </div>
        <div className="editor-container">
          <ShaderEditor
            value={userCode}
            onChange={(value) => setUserCode(value || '')}
          />
        </div>
        {error && (
          <div className="error-panel">
            {error}
          </div>
        )}
      </div>

      {/* Viewer Panel */}
      <div className="viewer-panel">
        <div className="viewer-header">
          <div className="viewer-title">
            <h2>Preview</h2>
            <span className="fps-display">{fps} FPS</span>
          </div>
          <div className="controls">
            <div className="mesh-selector">
              <button
                className={`mesh-btn ${meshType === 'sphere' ? 'active' : ''}`}
                onClick={() => setMeshType('sphere')}
              >
                Sphere
              </button>
              <button
                className={`mesh-btn ${meshType === 'cube' ? 'active' : ''}`}
                onClick={() => setMeshType('cube')}
              >
                Cube
              </button>
              <button
                className={`mesh-btn ${meshType === 'plane' ? 'active' : ''}`}
                onClick={() => setMeshType('plane')}
              >
                Plane
              </button>
            </div>
            <button className="export-btn" onClick={() => setShowExport(true)}>
              Export
            </button>
          </div>
        </div>
        <div className="viewer-container">
          <Viewer
            meshType={meshType}
            userCode={userCode}
            onError={handleError}
            onFpsUpdate={setFps}
          />
        </div>
      </div>

      {/* Export Modal */}
      {showExport && (
        <ExportModal
          userCode={userCode}
          onClose={() => setShowExport(false)}
        />
      )}
    </div>
  )
}
