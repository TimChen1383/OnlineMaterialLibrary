import { useState, useCallback, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Viewer from './Viewer'
import ShaderEditor from './ShaderEditor'
import ExportModal from './ExportModal'
import { getShaderById } from '../shaders'
import { compileSlang, isSlangAvailable } from '../utils/shaderApi'
import slangLogo from '../img/Slang_logo.png'

// Default Slang code - simple starter template
const DEFAULT_SLANG_CODE = `/*Pre-defined Variables (Slang/HLSL style)
float2 iResolution (Screen size in pixels)
float iTime (Current time in seconds)
float iTimeDelta (Time to render a frame, in seconds)
float iFrame (Current frame)
float iFrameRate (Frames rendered per second)
float2 iUV (Texture coordinates)
float3 iNormal (Surface normal)
float3 iPosition (Vertex position in local space)
*/

/*Output Variable
float4 fragColor (The RGBA color output)
*/

// Simple gradient based on UV
float3 color = float3(iUV.x, iUV.y, 0.5);

// Animate with time
color.x = sin(iTime) * 0.5 + 0.5;

// Use normal for basic lighting
float light = dot(iNormal, normalize(float3(1.0, 1.0, 1.0)));
color *= light;

// Output (required)
fragColor = float4(color, 1.0);`

// Compilation status enum
const CompileStatus = {
  READY: 'ready',
  COMPILING: 'compiling',
  COMPILED: 'compiled',
  ERROR: 'error'
}

export default function Editor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [meshType, setMeshType] = useState('sphere')
  const [userCode, setUserCode] = useState(DEFAULT_SLANG_CODE)
  const [shaderName, setShaderName] = useState('New Shader')
  const [error, setError] = useState(null)
  const [showExport, setShowExport] = useState(false)
  const [fps, setFps] = useState(0)

  // Slang compilation state
  const [compileStatus, setCompileStatus] = useState(CompileStatus.READY)
  const [compiledGlsl, setCompiledGlsl] = useState(null) // Compiled GLSL from Slang
  const [slangAvailable, setSlangAvailable] = useState(false)
  const [isDirty, setIsDirty] = useState(true) // Track if code changed since last compile

  // Track if we've done the initial auto-compile (reset when loading new shader)
  const hasInitiallyCompiled = useRef(false)

  // Check if Slang compiler is available on mount
  useEffect(() => {
    isSlangAvailable().then(result => {
      setSlangAvailable(result.available)
    })
  }, [])

  // Load shader if ID is provided
  useEffect(() => {
    if (id) {
      const shader = getShaderById(id)
      if (shader) {
        setUserCode(shader.code)
        setShaderName(shader.name)
        setCompileStatus(CompileStatus.READY)
        setCompiledGlsl(null)
        setIsDirty(true)
        // Reset auto-compile flag so new shader gets compiled automatically
        hasInitiallyCompiled.current = false
      }
    }
  }, [id])

  // Auto-compile on initial load when Slang is available
  useEffect(() => {
    if (!hasInitiallyCompiled.current &&
        slangAvailable &&
        compileStatus === CompileStatus.READY &&
        isDirty) {
      hasInitiallyCompiled.current = true
      handleCompile()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slangAvailable, isDirty, compileStatus])

  // Handle code changes
  const handleCodeChange = (value) => {
    setUserCode(value || '')
    setIsDirty(true)
    if (compileStatus === CompileStatus.COMPILED || compileStatus === CompileStatus.ERROR) {
      setCompileStatus(CompileStatus.READY)
    }
  }

  // Compile Slang code
  const handleCompile = async () => {
    if (compileStatus === CompileStatus.COMPILING) return

    setCompileStatus(CompileStatus.COMPILING)
    setError(null)

    try {
      const result = await compileSlang(userCode, {
        target: 'glsl',
        mode: 'materialLibrary'
      })

      setCompiledGlsl(result.code)
      setCompileStatus(CompileStatus.COMPILED)
      setIsDirty(false)
    } catch (err) {
      setError(err.message)
      setCompileStatus(CompileStatus.ERROR)
    }
  }

  // Handle Ctrl+Enter from editor
  const handleEditorKeyDown = (e) => {
    if (e.ctrlKey && e.key === 'Enter') {
      handleCompile()
    }
  }

  const handleError = useCallback((err) => {
    setError(err)
  }, [])

  // Get compile button text and style
  const getCompileButtonContent = () => {
    switch (compileStatus) {
      case CompileStatus.COMPILING:
        return { text: 'Compiling...', className: 'compile-btn compiling' }
      case CompileStatus.COMPILED:
        return { text: isDirty ? 'Compile' : 'Compiled', className: `compile-btn ${isDirty ? 'ready' : 'compiled'}` }
      case CompileStatus.ERROR:
        return { text: 'Compile', className: 'compile-btn error' }
      default:
        return { text: 'Compile', className: 'compile-btn ready' }
    }
  }

  const compileButton = getCompileButtonContent()

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
            {/* Slang Logo */}
            <div className="slang-logo-container">
              <img src={slangLogo} alt="Slang" className="slang-logo" />
            </div>

            {/* Compile Button */}
            <button
              className={compileButton.className}
              onClick={handleCompile}
              disabled={compileStatus === CompileStatus.COMPILING || !slangAvailable}
              title={slangAvailable ? "Compile Slang to GLSL (Ctrl+Enter)" : "Slang compiler not available"}
            >
              {compileStatus === CompileStatus.COMPILING && (
                <span className="spinner"></span>
              )}
              {compileButton.text}
            </button>
          </div>
        </div>
        <div className="editor-container">
          <ShaderEditor
            value={userCode}
            onChange={handleCodeChange}
            onKeyDown={handleEditorKeyDown}
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
            userCode={compiledGlsl}
            onError={handleError}
            onFpsUpdate={setFps}
            slangCompiled={compileStatus === CompileStatus.COMPILED && !isDirty}
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
