import { useState } from 'react'
import { glslToHlsl, glslToUnrealHlsl } from '../utils/shaderConverter'

export default function ExportModal({ userCode, onClose }) {
  const [activeTab, setActiveTab] = useState('glsl')
  const [copied, setCopied] = useState(false)

  const getCode = () => {
    const code = userCode

    if (activeTab === 'hlsl') {
      return glslToHlsl(code)
    } else if (activeTab === 'unrealHlsl') {
      return glslToUnrealHlsl(code)
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
    const ext = activeTab === 'glsl' ? 'glsl' : 'hlsl'
    const filename = `shader_material.${ext}`
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
              GLSL
            </button>
            <button
              className={`modal-tab ${activeTab === 'hlsl' ? 'active' : ''}`}
              onClick={() => setActiveTab('hlsl')}
            >
              HLSL
            </button>
            <button
              className={`modal-tab ${activeTab === 'unrealHlsl' ? 'active' : ''}`}
              onClick={() => setActiveTab('unrealHlsl')}
            >
              HLSL (Unreal)
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
