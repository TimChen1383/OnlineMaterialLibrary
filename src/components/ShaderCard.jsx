import { useNavigate } from 'react-router-dom'

export default function ShaderCard({ shader }) {
  const navigate = useNavigate()

  const handleClick = () => {
    navigate(`/editor/${shader.id}`)
  }

  const handleImageError = (e) => {
    // Fallback to placeholder if image fails to load
    e.target.src = '/images/placeholder.svg'
  }

  return (
    <div className="shader-card" onClick={handleClick}>
      <div className="shader-preview">
        <img
          src={shader.thumbnail}
          alt={shader.name}
          className="shader-thumbnail"
          onError={handleImageError}
        />
      </div>
      <div className="shader-info">
        <h3>{shader.name}</h3>
      </div>
    </div>
  )
}
