import { useNavigate } from 'react-router-dom'
import { shaders } from '../shaders'
import ShaderCard from './ShaderCard'

export default function Gallery() {
  const navigate = useNavigate()

  return (
    <div className="gallery">
      <header className="gallery-header">
        <div className="gallery-header-content">
          <h1>Material Library</h1>
          <p className="gallery-subtitle">Browse and explore shader materials</p>
        </div>
        <button className="new-shader-btn" onClick={() => navigate('/editor')}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          New
        </button>
      </header>

      <div className="gallery-grid">
        {shaders.map(shader => (
          <ShaderCard key={shader.id} shader={shader} />
        ))}
      </div>

      {shaders.length === 0 && (
        <div className="gallery-empty">
          <p>No shaders found. Add .txt files to the OpenGLLibrary folder.</p>
        </div>
      )}
    </div>
  )
}
