import { useState, useCallback, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Viewer from './Viewer'
import ShaderEditor from './ShaderEditor'
import ExportModal from './ExportModal'
import { getShaderById } from '../shaders'

// Default user code - simple starter template
const DEFAULT_CODE = `/*Pre-defined Variables
vec2 iResolution (Screen size in pixels)
float iTime (Current time in seconds)
float iTimeDelta (Time to render a frame, in seconds)
float iFrame (Current frame)
float iFrameRate (Frames rendered per second)
vec2 iUV (Texture coordinates)
vec3 iNormal (Surface normal)
vec3 iPosition (Vertex position in local space)
*/

/*Output Variable
vec4 fragColor (The RGBA color output)
*/

// Simple gradient based on UV
vec3 color = vec3(iUV.x, iUV.y, 0.5);

// Animate with time
color.r = sin(iTime) * 0.5 + 0.5;

// Use normal for basic lighting
float light = dot(iNormal, normalize(vec3(1.0, 1.0, 1.0)));
color *= light;

// Output (required)
fragColor = vec4(color, 1.0);`

export default function Editor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [meshType, setMeshType] = useState('sphere')
  const [userCode, setUserCode] = useState(DEFAULT_CODE)
  const [shaderName, setShaderName] = useState('New Shader')
  const [error, setError] = useState(null)
  const [showExport, setShowExport] = useState(false)
  const [fps, setFps] = useState(0)
  const [shaderRule, setShaderRule] = useState('material-library')

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
          <div className="editor-options">
            <div className="rule-selector">
              <label>Shader Rule:</label>
              <select
                value={shaderRule}
                onChange={(e) => setShaderRule(e.target.value)}
              >
                <option value="material-library">Material Library</option>
                <option value="shadertoy">ShaderToy</option>
              </select>
            </div>
            <span className="editor-hint">GLSL</span>
          </div>
        </div>
        <div className="editor-container">
          <ShaderEditor
            value={userCode}
            onChange={(value) => setUserCode(value || '')}
          />
        </div>
        {error && (
          <div className={`error-panel ${error.startsWith('Warning:') ? 'warning' : ''}`}>
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
            shaderRule={shaderRule}
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
