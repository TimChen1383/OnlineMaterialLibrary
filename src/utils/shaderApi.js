import { glslToHlsl, glslToUnrealHlsl } from './shaderConverter';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

/**
 * Convert GLSL to HLSL using the backend SPIR-V pipeline
 * Falls back to regex converter if server is unavailable
 *
 * @param {string} glslCode - The user's GLSL code
 * @param {object} options - Conversion options
 * @param {string} options.shaderType - 'frag' or 'vert'
 * @param {string} options.mode - 'hlsl' or 'unrealHlsl'
 * @param {boolean} options.extractUserCode - Whether to extract just user code section
 * @returns {Promise<{hlsl: string, usedFallback: boolean}>}
 */
export async function convertGlslToHlsl(glslCode, options = {}) {
  const {
    shaderType = 'frag',
    mode = 'hlsl',
    extractUserCode = false
  } = options;

  try {
    const response = await fetch(`${API_URL}/api/convert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ glslCode, shaderType, mode, extractUserCode })
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Conversion failed');
    }

    return { hlsl: data.hlsl, usedFallback: false };
  } catch (error) {
    console.warn('Server conversion failed, using fallback:', error.message);

    // Fallback to regex converter
    const fallbackHlsl = mode === 'unrealHlsl'
      ? glslToUnrealHlsl(glslCode)
      : glslToHlsl(glslCode);

    return { hlsl: fallbackHlsl, usedFallback: true };
  }
}

/**
 * Check if the conversion server is available
 * @returns {Promise<boolean>}
 */
export async function isServerAvailable() {
  try {
    const response = await fetch(`${API_URL}/api/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(2000)
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Get information about available conversion tools
 * @returns {Promise<{glslang: string, spirvCross: string} | null>}
 */
export async function getToolsInfo() {
  try {
    const response = await fetch(`${API_URL}/api/tools`);
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}
