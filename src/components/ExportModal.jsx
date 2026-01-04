import { useState } from 'react'
import { glslToHlsl } from '../utils/shaderConverter'
import { VERTEX_SHADER, wrapUserCode } from './Viewer'

export default function ExportModal({ userCode, onClose }) {
  const [activeTab, setActiveTab] = useState('glsl')
  const [codeType, setCodeType] = useState('fragment') // 'fragment', 'vertex', 'userOnly'
  const [copied, setCopied] = useState(false)

  const getCode = () => {
    let code = ''

    if (codeType === 'userOnly') {
      // Just the user's code snippet
      code = userCode
    } else if (codeType === 'vertex') {
      // Full vertex shader
      code = VERTEX_SHADER.trim()
    } else {
      // Full fragment shader
      code = wrapUserCode(userCode).trim()
    }

    // Convert to HLSL if needed
    if (activeTab === 'hlsl') {
      return glslToHlsl(code)
    }
    return code
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(getCode())
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const handleDownload = () => {
    const code = getCode()
    const ext = activeTab === 'hlsl' ? 'hlsl' : 'glsl'
    const typeNames = { fragment: 'fragment', vertex: 'vertex', userOnly: 'material' }
    const filename = `shader_${typeNames[codeType]}.${ext}`
    const blob = new Blob([code], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h3>Export Shader</h3>

        {/* Language selection */}
        <div className="modal-section">
          <label>Language:</label>
          <div className="modal-tabs">
            <button
              className={`modal-tab ${activeTab === 'glsl' ? 'active' : ''}`}
              onClick={() => setActiveTab('glsl')}
            >
              GLSL (WebGL)
            </button>
            <button
              className={`modal-tab ${activeTab === 'hlsl' ? 'active' : ''}`}
              onClick={() => setActiveTab('hlsl')}
            >
              HLSL (Unreal)
            </button>
          </div>
        </div>

        {/* Code type selection */}
        <div className="modal-section">
          <label>Export:</label>
          <div className="modal-tabs">
            <button
              className={`modal-tab ${codeType === 'userOnly' ? 'active' : ''}`}
              onClick={() => setCodeType('userOnly')}
            >
              Code Only
            </button>
            <button
              className={`modal-tab ${codeType === 'fragment' ? 'active' : ''}`}
              onClick={() => setCodeType('fragment')}
            >
              Full Fragment
            </button>
            <button
              className={`modal-tab ${codeType === 'vertex' ? 'active' : ''}`}
              onClick={() => setCodeType('vertex')}
            >
              Full Vertex
            </button>
          </div>
        </div>

        <div className="code-preview">
          {getCode()}
        </div>

        <div className="modal-actions">
          <button className="close-btn" onClick={onClose}>
            Close
          </button>
          <button className="copy-btn" onClick={handleDownload}>
            Download
          </button>
          <button className="copy-btn" onClick={handleCopy}>
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>
    </div>
  )
}
