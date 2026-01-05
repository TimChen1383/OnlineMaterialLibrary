// Import all shader files from OpenGLLibrary folder
const shaderModules = import.meta.glob('/OpenGLLibrary/*.txt', { query: '?raw', import: 'default', eager: true })

// Process into a usable format
export const shaders = Object.entries(shaderModules).map(([path, code]) => {
  // Extract filename without extension as the shader name
  const filename = path.split('/').pop().replace('.txt', '')

  return {
    id: filename.toLowerCase().replace(/\s+/g, '-'),
    name: filename,
    code: code.trim()
  }
})

// Get shader by ID
export function getShaderById(id) {
  return shaders.find(s => s.id === id)
}
