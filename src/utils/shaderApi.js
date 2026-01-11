const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

/**
 * Convert GLSL to HLSL using the backend SPIR-V pipeline
 * No fallback - requires server to be available
 *
 * @param {string} glslCode - The user's GLSL code
 * @param {object} options - Conversion options
 * @param {string} options.shaderType - 'frag' or 'vert'
 * @param {string} options.mode - 'hlsl' or 'unrealHlsl'
 * @param {boolean} options.extractUserCode - Whether to extract just user code section
 * @returns {Promise<{hlsl: string}>}
 */
export async function convertGlslToHlsl(glslCode, options = {}) {
  const {
    shaderType = 'frag',
    mode = 'hlsl',
    extractUserCode = false
  } = options;

  // First check if server is available
  const serverAvailable = await isServerAvailable();
  if (!serverAvailable) {
    throw new Error('Conversion server is not available. Please ensure the server is running.');
  }

  const response = await fetch(`${API_URL}/api/convert`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ glslCode, shaderType, mode, extractUserCode })
  });

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error || 'Conversion failed');
  }

  return { hlsl: data.hlsl };
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

// ============================================================================
// SLANG COMPILATION API
// ============================================================================

/**
 * Compile Slang code to a target format
 *
 * @param {string} source - The user's Slang code
 * @param {object} options - Compilation options
 * @param {string} options.target - Target format: 'glsl', 'hlsl', 'spirv', 'wgsl', 'metal'
 * @param {string} options.mode - 'materialLibrary' or 'shaderToy'
 * @param {boolean} options.forExport - If true, apply cleanup for readable export output
 * @returns {Promise<{code: string, target: string, mode: string}>}
 */
export async function compileSlang(source, options = {}) {
  const {
    target = 'glsl',
    mode = 'materialLibrary',
    forExport = false
  } = options;

  const response = await fetch(`${API_URL}/api/slang/compile`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ source, target, mode, forExport })
  });

  const data = await response.json();

  if (!data.success) {
    const error = new Error(data.error || 'Compilation failed');
    error.errors = data.errors || [];
    error.stage = data.stage;
    throw error;
  }

  return {
    code: data.code,
    target: data.target,
    mode: data.mode
  };
}

/**
 * Check if the Slang compiler is available
 * @returns {Promise<{available: boolean, targets: string[]}>}
 */
export async function isSlangAvailable() {
  try {
    const response = await fetch(`${API_URL}/api/slang/version`, {
      method: 'GET',
      signal: AbortSignal.timeout(3000)
    });
    if (!response.ok) return { available: false, targets: [] };
    return await response.json();
  } catch {
    return { available: false, targets: [] };
  }
}

/**
 * Get available Slang compilation targets
 * @returns {Promise<Array<{id: string, name: string, description: string}>>}
 */
export async function getSlangTargets() {
  try {
    const response = await fetch(`${API_URL}/api/slang/targets`);
    if (!response.ok) return [];
    const data = await response.json();
    return data.targets || [];
  } catch {
    return [];
  }
}
