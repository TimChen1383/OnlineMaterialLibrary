const express = require('express');
const cors = require('cors');
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Tool paths - can be overridden with environment variables
const GLSLANG_PATH = process.env.GLSLANG_PATH || 'glslangValidator';
const SPIRV_CROSS_PATH = process.env.SPIRV_CROSS_PATH || 'spirv-cross';

// Vertex shader used by the frontend
const VERTEX_SHADER = `#version 450

layout(location = 0) in vec3 position;
layout(location = 1) in vec3 normal;
layout(location = 2) in vec2 uv;

layout(location = 0) out vec2 vUv;
layout(location = 1) out vec3 vNormal;
layout(location = 2) out vec3 vPosition;

void main() {
  vUv = uv;
  vNormal = normalize(normal);
  vPosition = position;
  gl_Position = vec4(position, 1.0);
}
`;

// Wrap user code into a complete fragment shader for SPIR-V compilation
function wrapUserCodeForSpirv(userCode) {
  return `#version 450

layout(location = 0) in vec2 vUv;
layout(location = 1) in vec3 vNormal;
layout(location = 2) in vec3 vPosition;

layout(location = 0) out vec4 outFragColor;

layout(binding = 0) uniform Uniforms {
  vec2 uResolution;
  float uTime;
  float uTimeDelta;
  float uFrame;
  float uFrameRate;
};

void main() {
  // Pre-defined variables for user convenience (aligned with ShaderToy naming)
  vec2 iResolution = uResolution;
  float iTime = uTime;
  float iTimeDelta = uTimeDelta;
  float iFrame = uFrame;
  float iFrameRate = uFrameRate;
  vec2 iUV = vUv;
  vec3 iNormal = vNormal;
  vec3 iPosition = vPosition;

  // Default output (vec4 RGBA)
  vec4 fragColor = vec4(1.0);

  // ---- USER CODE START ----
  ${userCode}
  // ---- USER CODE END ----

  outFragColor = fragColor;
}
`;
}

// Apply Unreal-specific post-processing to HLSL output
function applyUnrealTransforms(hlslCode) {
  let hlsl = hlslCode;

  // Unreal-specific: expand single-argument vector constructors
  hlsl = hlsl.replace(/\bfloat2\s*\(\s*([^,)]+)\s*\)/g, (match, arg) => {
    if (arg.includes(',')) return match;
    return `float2(${arg.trim()}, ${arg.trim()})`;
  });
  hlsl = hlsl.replace(/\bfloat3\s*\(\s*([^,)]+)\s*\)/g, (match, arg) => {
    if (arg.includes(',')) return match;
    return `float3(${arg.trim()}, ${arg.trim()}, ${arg.trim()})`;
  });
  hlsl = hlsl.replace(/\bfloat4\s*\(\s*([^,)]+)\s*\)/g, (match, arg) => {
    if (arg.includes(',')) return match;
    return `float4(${arg.trim()}, ${arg.trim()}, ${arg.trim()}, ${arg.trim()})`;
  });

  // Convert fragColor assignment to return statement (but not declarations)
  // Skip lines that have a type declaration before fragColor
  hlsl = hlsl.replace(/^(\s*)fragColor\s*=\s*([^;]+);/gm, (match, indent, value) => {
    return `${indent}return ${value.trim()};`;
  });

  return hlsl;
}

// Extract just the user code portion from the converted HLSL
function extractUserCodeSection(hlslCode) {
  // Look for the main function and extract just the body
  const mainMatch = hlslCode.match(/void\s+main\s*\(\s*\)\s*\{([\s\S]*)\}/);
  if (!mainMatch) return hlslCode;

  let body = mainMatch[1];

  // Find USER CODE section markers if present, otherwise return cleaned body
  const userCodeMatch = body.match(/\/\/\s*----\s*USER CODE START\s*----\s*([\s\S]*?)\/\/\s*----\s*USER CODE END\s*----/);
  if (userCodeMatch) {
    return userCodeMatch[1].trim();
  }

  // Remove the wrapper variable declarations and return the rest
  const lines = body.split('\n');
  const filteredLines = lines.filter(line => {
    const trimmed = line.trim();
    // Skip variable initialization lines that are part of the wrapper
    if (trimmed.startsWith('float2 iResolution =')) return false;
    if (trimmed.startsWith('float iTime =')) return false;
    if (trimmed.startsWith('float iTimeDelta =')) return false;
    if (trimmed.startsWith('float iFrame =')) return false;
    if (trimmed.startsWith('float iFrameRate =')) return false;
    if (trimmed.startsWith('float2 iUV =')) return false;
    if (trimmed.startsWith('float3 iNormal =')) return false;
    if (trimmed.startsWith('float3 iPosition =')) return false;
    if (trimmed.startsWith('float4 fragColor =')) return false;
    if (trimmed.startsWith('outFragColor =')) return false;
    if (trimmed === '') return false;
    return true;
  });

  return filteredLines.join('\n').trim();
}

app.post('/api/convert', async (req, res) => {
  const { glslCode, shaderType = 'frag', mode = 'hlsl', extractUserCode = false } = req.body;

  if (!glslCode) {
    return res.status(400).json({ success: false, error: 'No GLSL code provided' });
  }

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'shader-'));
  const glslFile = path.join(tempDir, `shader.${shaderType}`);
  const spirvFile = path.join(tempDir, 'shader.spv');

  try {
    // Wrap user code into complete shader
    const fullShaderCode = shaderType === 'frag'
      ? wrapUserCodeForSpirv(glslCode)
      : VERTEX_SHADER;

    fs.writeFileSync(glslFile, fullShaderCode);

    // GLSL -> SPIR-V
    try {
      execFileSync(GLSLANG_PATH, ['-V', '-S', shaderType, '-o', spirvFile, glslFile], {
        timeout: 10000,
        maxBuffer: 1024 * 1024
      });
    } catch (glslError) {
      // Parse and adjust error line numbers
      let errorMsg = glslError.stderr ? glslError.stderr.toString() : glslError.message;
      const lineMatch = errorMsg.match(/ERROR:\s*\d+:(\d+):\s*(.*)/);
      if (lineMatch) {
        const line = parseInt(lineMatch[1]) - 31; // Offset for wrapper code (user code starts at line 32)
        const msg = lineMatch[2].trim();
        errorMsg = `GLSL Error - Line ${line > 0 ? line : '?'}: ${msg}`;
      }
      return res.status(400).json({ success: false, error: errorMsg, stage: 'glsl-to-spirv' });
    }

    // SPIR-V -> HLSL
    let hlslCode;
    try {
      hlslCode = execFileSync(SPIRV_CROSS_PATH, [
        spirvFile,
        '--hlsl',
        '--shader-model', '50'
      ], {
        timeout: 10000,
        maxBuffer: 1024 * 1024
      }).toString();
    } catch (spirvError) {
      return res.status(400).json({
        success: false,
        error: spirvError.stderr ? spirvError.stderr.toString() : spirvError.message,
        stage: 'spirv-to-hlsl'
      });
    }

    // Apply Unreal transforms if requested
    if (mode === 'unrealHlsl') {
      hlslCode = applyUnrealTransforms(hlslCode);
    }

    // Extract just user code if requested
    if (extractUserCode) {
      hlslCode = extractUserCodeSection(hlslCode);
    }

    res.json({ success: true, hlsl: hlslCode });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  } finally {
    // Cleanup temp files
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (e) {
      // Ignore cleanup errors
    }
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Tool version check endpoint
app.get('/api/tools', async (req, res) => {
  const tools = {};

  try {
    tools.glslang = execFileSync(GLSLANG_PATH, ['--version'], { timeout: 5000 }).toString().split('\n')[0];
  } catch (e) {
    tools.glslang = 'Not available';
  }

  try {
    // spirv-cross --version outputs to stderr and returns non-zero
    tools.spirvCross = 'Available';
    execFileSync(SPIRV_CROSS_PATH, ['--help'], { timeout: 5000 });
  } catch (e) {
    if (e.stdout || e.stderr) {
      tools.spirvCross = 'Available';
    } else {
      tools.spirvCross = 'Not available';
    }
  }

  res.json(tools);
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Shader conversion server running on port ${PORT}`);
  console.log(`Using glslangValidator: ${GLSLANG_PATH}`);
  console.log(`Using spirv-cross: ${SPIRV_CROSS_PATH}`);
});
