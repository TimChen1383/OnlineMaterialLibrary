import { shaders } from '../shaders'
import ShaderCard from './ShaderCard'

export default function Gallery() {
  return (
    <div className="gallery">
      <header className="gallery-header">
        <h1>Material Library</h1>
        <p className="gallery-subtitle">Browse and explore shader materials</p>
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
