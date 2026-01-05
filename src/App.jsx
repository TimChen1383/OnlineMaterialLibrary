import { useState, useCallback } from 'react'
import Viewer from './components/Viewer'
import ShaderEditor from './components/ShaderEditor'
import ExportModal from './components/ExportModal'

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

export default function App() {
  const [meshType, setMeshType] = useState('sphere')
  const [userCode, setUserCode] = useState(DEFAULT_CODE)
  const [error, setError] = useState(null)
  const [showExport, setShowExport] = useState(false)
  const [fps, setFps] = useState(0)

  const handleError = useCallback((err) => {
    setError(err)
  }, [])

  return (
    <div className="app">
      {/* Editor Panel */}
      <div className="editor-panel">
        <div className="editor-header">
          <h2>Material Editor</h2>
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
