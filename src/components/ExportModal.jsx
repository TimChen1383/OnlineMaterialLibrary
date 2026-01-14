import { useState, useEffect, useCallback } from 'react'
import { compileSlang, isSlangAvailable } from '../utils/shaderApi'

export default function ExportModal({ userCode, onClose }) {
  const [activeTab, setActiveTab] = useState('slang')
  const [copied, setCopied] = useState(false)
  const [convertedCode, setConvertedCode] = useState('')
  const [isConverting, setIsConverting] = useState(false)
  const [conversionError, setConversionError] = useState(null)
  const [serverStatus, setServerStatus] = useState('checking')

  // Check server availability on mount
  useEffect(() => {
    isSlangAvailable().then(result => {
      setServerStatus(result.available ? 'online' : 'offline')
    })
  }, [])

  // Convert code when tab changes
  const convertCode = useCallback(async (tab) => {
    // For Slang source tab, just show the user code directly
    if (tab === 'slang') {
      setConvertedCode(userCode)
      setConversionError(null)
      return
    }

    // Check server status before attempting conversion
    if (serverStatus === 'offline') {
      setConversionError('Slang compiler is not available. Please ensure the server is running.')
      setConvertedCode('')
      return
    }

    setIsConverting(true)
    setConversionError(null)

    try {
      // Map tab to Slang target
      const targetMap = {
        'hlsl': 'hlsl',
        'unrealHlsl': 'unrealHlsl',
        'glslOutput': 'glsl',
        'wgsl': 'wgsl',
        'metal': 'metal',
        'spirv': 'spirv'
      }
      const target = targetMap[tab] || 'hlsl'

      const result = await compileSlang(userCode, { target, mode: 'materialLibrary', forExport: true })
      setConvertedCode(result.code)
    } catch (err) {
      setConversionError(err.message)
      setConvertedCode('')
    } finally {
      setIsConverting(false)
    }
  }, [userCode, serverStatus])

  // Trigger conversion when tab changes
  useEffect(() => {
    convertCode(activeTab)
  }, [activeTab, convertCode])

  const getDisplayCode = () => {
    if (activeTab === 'slang') return userCode
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

    // Map tab to file extension
    const extMap = {
      'slang': 'slang',
      'glslOutput': 'glsl',
      'hlsl': 'hlsl',
      'unrealHlsl': 'hlsl',
      'wgsl': 'wgsl',
      'metal': 'metal',
      'spirv': 'spv'
    }
    const ext = extMap[activeTab] || 'txt'
    const filename = activeTab === 'unrealHlsl' ? `shader_unreal.${ext}` : `shader_material.${ext}`
    const blob = new Blob([code], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  const getStatusIndicator = () => {
    if (serverStatus === 'checking') return 'Checking...'
    if (serverStatus === 'online') return 'Server Online'
    return 'Server Offline'
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

        {/* Source code section */}
        <div className="modal-section">
          <label>Source:</label>
          <div className="modal-tabs">
            <button
              className={`modal-tab ${activeTab === 'slang' ? 'active' : ''}`}
              onClick={() => setActiveTab('slang')}
            >
              Slang
            </button>
          </div>
        </div>

        {/* Export targets section */}
        <div className="modal-section">
          <label>Export to:</label>
          <div className="modal-tabs">
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
              Unreal
            </button>
            <button
              className={`modal-tab ${activeTab === 'glslOutput' ? 'active' : ''}`}
              onClick={() => setActiveTab('glslOutput')}
            >
              GLSL
            </button>
            <button
              className={`modal-tab ${activeTab === 'wgsl' ? 'active' : ''}`}
              onClick={() => setActiveTab('wgsl')}
            >
              WGSL
            </button>
            <button
              className={`modal-tab ${activeTab === 'metal' ? 'active' : ''}`}
              onClick={() => setActiveTab('metal')}
            >
              Metal
            </button>
          </div>
        </div>

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
