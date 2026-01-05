import { useState, useEffect, useCallback } from 'react'
import { convertGlslToHlsl, isServerAvailable } from '../utils/shaderApi'

export default function ExportModal({ userCode, onClose }) {
  const [activeTab, setActiveTab] = useState('glsl')
  const [copied, setCopied] = useState(false)
  const [convertedCode, setConvertedCode] = useState('')
  const [isConverting, setIsConverting] = useState(false)
  const [conversionError, setConversionError] = useState(null)
  const [usedFallback, setUsedFallback] = useState(false)
  const [serverStatus, setServerStatus] = useState('checking')

  // Check server availability on mount
  useEffect(() => {
    isServerAvailable().then(available => {
      setServerStatus(available ? 'online' : 'offline')
    })
  }, [])

  // Convert code when tab changes to HLSL variants
  const convertCode = useCallback(async (tab) => {
    if (tab === 'glsl') {
      setConvertedCode(userCode)
      setConversionError(null)
      setUsedFallback(false)
      return
    }

    setIsConverting(true)
    setConversionError(null)

    try {
      const mode = tab === 'unrealHlsl' ? 'unrealHlsl' : 'hlsl'
      const result = await convertGlslToHlsl(userCode, { mode })
      setConvertedCode(result.hlsl)
      setUsedFallback(result.usedFallback)
    } catch (err) {
      setConversionError(err.message)
      setConvertedCode('')
    } finally {
      setIsConverting(false)
    }
  }, [userCode])

  // Trigger conversion when tab changes
  useEffect(() => {
    convertCode(activeTab)
  }, [activeTab, convertCode])

  const getDisplayCode = () => {
    if (activeTab === 'glsl') return userCode
    return convertedCode
  }

  const handleCopy = async () => {
    const code = getDisplayCode()
    if (!code) return

    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const handleDownload = () => {
    const code = getDisplayCode()
    if (!code) return

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

  const getStatusIndicator = () => {
    if (serverStatus === 'checking') return '...'
    if (serverStatus === 'online') return 'SPIR-V'
    return 'Regex'
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Export Shader</h3>
          <span className={`server-status ${serverStatus}`}>
            {getStatusIndicator()}
          </span>
        </div>

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

        {usedFallback && activeTab !== 'glsl' && (
          <div className="fallback-notice">
            Using regex fallback (server unavailable)
          </div>
        )}

        <div className="code-preview">
          {isConverting ? (
            <div className="converting-indicator">Converting...</div>
          ) : conversionError ? (
            <div className="conversion-error">{conversionError}</div>
          ) : (
            getDisplayCode()
          )}
        </div>

        <div className="modal-actions">
          <button className="close-btn" onClick={onClose}>
            Close
          </button>
          <button
            className="copy-btn"
            onClick={handleDownload}
            disabled={isConverting || conversionError}
          >
            Download
          </button>
          <button
            className="copy-btn"
            onClick={handleCopy}
            disabled={isConverting || conversionError}
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>
    </div>
  )
}
