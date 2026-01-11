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
const SLANG_PATH = process.env.SLANG_PATH || 'slangc';

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

// ============================================================================
// SLANG COMPILATION ENDPOINTS
// ============================================================================

// Wrap user code into a complete Slang fragment shader for Material Library mode
function wrapUserCodeForSlang(userCode) {
  return `// Slang Fragment Shader - Material Library Mode

// Uniforms
uniform float2 uResolution;
uniform float uTime;
uniform float uTimeDelta;
uniform float uFrame;
uniform float uFrameRate;

// Varyings from vertex shader
struct VSInput
{
    float2 uv : TEXCOORD0;
    float3 normal : NORMAL;
    float3 position : TEXCOORD1;
};

[shader("fragment")]
float4 fragmentMain(VSInput input) : SV_Target
{
    // Pre-defined variables for user convenience
    float2 iResolution = uResolution;
    float iTime = uTime;
    float iTimeDelta = uTimeDelta;
    float iFrame = uFrame;
    float iFrameRate = uFrameRate;
    float2 iUV = input.uv;
    float3 iNormal = input.normal;
    float3 iPosition = input.position;

    // Default output
    float4 fragColor = float4(1.0, 1.0, 1.0, 1.0);

    // ---- USER CODE START (line 36) ----
${userCode}
    // ---- USER CODE END ----

    return fragColor;
}
`;
}

// Wrap user code for ShaderToy compatibility mode
function wrapUserCodeForSlangShaderToy(userCode) {
  return `// Slang Fragment Shader - ShaderToy Mode

// Uniforms
uniform float3 iResolution;
uniform float iTime;
uniform float iTimeDelta;
uniform float iFrame;
uniform float iFrameRate;

// Varyings
struct VSInput
{
    float2 uv : TEXCOORD0;
};

// Forward declaration for mainImage
void mainImage(out float4 fragColor, in float2 fragCoord);

[shader("fragment")]
float4 fragmentMain(VSInput input) : SV_Target
{
    float2 fragCoord = input.uv * iResolution.xy;
    float4 fragColor = float4(0.0, 0.0, 0.0, 1.0);
    mainImage(fragColor, fragCoord);
    return fragColor;
}

// ---- USER CODE START (line 28) ----
${userCode}
// ---- USER CODE END ----
`;
}

// Parse Slang compiler error output
function parseSlangErrors(stderr, lineOffset) {
  const errors = [];
  const lines = stderr.split('\n');

  for (const line of lines) {
    // Slang error format: filename(line): error code: message
    // or: (line): error code: message
    const match = line.match(/(?:\([^)]*\))?\((\d+)\):\s*(error|warning)\s*(\d+)?:\s*(.*)/i);
    if (match) {
      const lineNum = parseInt(match[1]) - lineOffset;
      errors.push({
        line: lineNum > 0 ? lineNum : 1,
        type: match[2].toLowerCase(),
        code: match[3] || '',
        message: match[4].trim()
      });
    }
  }

  return errors;
}

// Clean up Slang HLSL output to make it more readable
function cleanupSlangHlslOutput(hlslCode) {
  let code = hlslCode;

  // Remove preprocessor pragmas and NVAPI includes
  code = code.replace(/#pragma pack_matrix\(column_major\)\s*/g, '');
  code = code.replace(/#ifdef SLANG_HLSL_ENABLE_NVAPI[\s\S]*?#endif\s*/g, '');
  code = code.replace(/#ifndef __DXC_VERSION_MAJOR[\s\S]*?#endif\s*/g, '');

  // Remove any remaining #line directives (should be gone with -line-directive-mode none)
  code = code.replace(/^#line\s+\d+.*$/gm, '');

  // Clean up the cbuffer/struct - rename GlobalParams_0 to Uniforms
  code = code.replace(/GlobalParams_0/g, 'Uniforms');
  code = code.replace(/globalParams_0\./g, '');

  // Clean up uniform names - remove _0 suffix
  code = code.replace(/uResolution_0/g, 'iResolution');
  code = code.replace(/uTime_0/g, 'iTime');
  code = code.replace(/uTimeDelta_0/g, 'iTimeDelta');
  code = code.replace(/uFrame_0/g, 'iFrame');
  code = code.replace(/uFrameRate_0/g, 'iFrameRate');

  // Clean up input struct names
  code = code.replace(/VSInput_0/g, 'VSInput');
  code = code.replace(/input_0\./g, 'input.');
  code = code.replace(/input_0(?!\w)/g, 'input');

  // Clean up member names in input struct
  code = code.replace(/uv_0/g, 'uv');
  code = code.replace(/normal_0/g, 'normal');
  code = code.replace(/position_0/g, 'position');

  // Clean up generated temporary variable names like _S1, _S2 -> t1, t2
  code = code.replace(/_S(\d+)/g, 't$1');

  // Remove excessive empty lines
  code = code.replace(/\n{3,}/g, '\n\n');

  // Remove leading/trailing whitespace
  code = code.trim();

  return code;
}

// Clean up Slang HLSL output for Unreal Engine Custom Material Node
function cleanupSlangHlslForUnreal(hlslCode) {
  let code = hlslCode;

  // Remove preprocessor pragmas and NVAPI includes
  code = code.replace(/#pragma pack_matrix\(column_major\)\s*/g, '');
  code = code.replace(/#ifdef SLANG_HLSL_ENABLE_NVAPI[\s\S]*?#endif\s*/g, '');
  code = code.replace(/#ifndef __DXC_VERSION_MAJOR[\s\S]*?#endif\s*/g, '');
  code = code.replace(/^#line\s+\d+.*$/gm, '');

  // Remove struct definitions
  code = code.replace(/struct\s+GlobalParams_0\s*\{[^}]*\}\s*;\s*/gs, '');
  code = code.replace(/struct\s+VSInput_0\s*\{[^}]*\}\s*;\s*/gs, '');

  // Remove cbuffer definition
  code = code.replace(/cbuffer\s+globalParams_0\s*:\s*register\s*\([^)]*\)\s*\{[^}]*\}\s*/gs, '');

  // Extract function body from fragmentMain
  const funcMatch = code.match(/float4\s+fragmentMain\s*\([^)]*\)\s*:\s*SV_TARGET\s*\{([\s\S]*)\}/);
  if (!funcMatch) {
    return '// Error: Could not extract function body\n' + code;
  }

  let funcBody = funcMatch[1];

  // Map Slang variable names to Unreal equivalents
  funcBody = funcBody.replace(/globalParams_0\.uResolution_0/g, 'Resolution');
  funcBody = funcBody.replace(/globalParams_0\.uTime_0/g, 'Time');
  funcBody = funcBody.replace(/globalParams_0\.uTimeDelta_0/g, 'DeltaTime');
  funcBody = funcBody.replace(/globalParams_0\.uFrame_0/g, 'Frame');
  funcBody = funcBody.replace(/globalParams_0\.uFrameRate_0/g, 'FrameRate');

  funcBody = funcBody.replace(/input_0\.uv_0/g, 'UV');
  funcBody = funcBody.replace(/input_0\.normal_0/g, 'Normal');
  funcBody = funcBody.replace(/input_0\.position_0/g, 'Position');

  // Clean up temp variable names
  funcBody = funcBody.replace(/_S(\d+)/g, 't$1');

  // Convert for(;;) to bounded loop
  funcBody = funcBody.replace(/for\s*\(\s*;\s*;\s*\)/g, 'for(int _loopIdx = 0; _loopIdx < 10000; _loopIdx++)');

  // Convert return float4(...) to return the RGB part only
  // Handle nested parentheses by finding matching brackets
  funcBody = funcBody.replace(/return\s+float4\s*\(/g, (match) => {
    return '__RETURN_FLOAT4_START__(';
  });

  // Find the float4 return and extract just the color part
  if (funcBody.includes('__RETURN_FLOAT4_START__')) {
    // Find the position of the marker (includes the original "return ")
    const startMarker = '__RETURN_FLOAT4_START__(';
    const startIdx = funcBody.indexOf(startMarker);
    if (startIdx !== -1) {
      const afterStart = startIdx + startMarker.length;
      // Find matching closing paren by counting brackets
      let depth = 1;
      let endIdx = afterStart;
      while (depth > 0 && endIdx < funcBody.length) {
        if (funcBody[endIdx] === '(') depth++;
        if (funcBody[endIdx] === ')') depth--;
        endIdx++;
      }
      // Now endIdx is right after the closing paren
      const innerContent = funcBody.substring(afterStart, endIdx - 1);

      // Find the last comma that separates alpha from color (at depth 0)
      let lastCommaIdx = -1;
      depth = 0;
      for (let i = innerContent.length - 1; i >= 0; i--) {
        if (innerContent[i] === ')') depth++;
        if (innerContent[i] === '(') depth--;
        if (innerContent[i] === ',' && depth === 0) {
          lastCommaIdx = i;
          break;
        }
      }

      if (lastCommaIdx !== -1) {
        // Extract just the color part (before the last comma)
        const colorPart = innerContent.substring(0, lastCommaIdx).trim();
        // Replace the entire marker + content + closing paren with just return + colorPart
        funcBody = funcBody.substring(0, startIdx) + 'return ' + colorPart + ';' + funcBody.substring(endIdx + 1);
      } else {
        // No comma found, just append .xyz
        funcBody = funcBody.replace('__RETURN_FLOAT4_START__', 'float4');
        funcBody = funcBody.replace(/return\s+float4\s*\(([^;]+)\)\s*;/, 'return ($1).xyz;');
      }
    }
  }

  // Clean up indentation
  funcBody = funcBody.split('\n').map(line => {
    if (line.startsWith('    ')) {
      return line.substring(4);
    }
    return line;
  }).join('\n');

  // Build Unreal-compatible output
  const result = `// Unreal Engine Custom Material Node
// Connect these inputs in the Material Editor:
//   - Time: Use "Time" node
//   - UV: Use "TexCoord[0]" node
//   - Normal: Use "VertexNormalWS" node
//   - Position: Use "WorldPosition" node
//   - Resolution: Use "ViewSize" node or create a parameter

// Input variables (connect via Material Editor)
float Time = View.RealTime;
float2 UV = TexCoords[0].xy;
float3 Normal = Parameters.TangentToWorld[2];
float3 Position = GetWorldPosition(Parameters);
float2 Resolution = View.ViewSizeAndInvSize.xy;

// Additional variables (if needed)
float DeltaTime = View.DeltaTime;
float Frame = View.FrameNumber;
float FrameRate = 1.0 / max(View.DeltaTime, 0.001);

// Shader logic
${funcBody.trim()}`;

  return result.replace(/\n{3,}/g, '\n\n').trim();
}

// Clean up Slang WGSL output
function cleanupSlangWgslOutput(wgslCode) {
  let code = wgslCode;

  // Clean up uniform buffer names
  code = code.replace(/globalParams_0\./g, '');
  code = code.replace(/uResolution_0/g, 'iResolution');
  code = code.replace(/uTime_0/g, 'iTime');
  code = code.replace(/uTimeDelta_0/g, 'iTimeDelta');
  code = code.replace(/uFrame_0/g, 'iFrame');
  code = code.replace(/uFrameRate_0/g, 'iFrameRate');

  // Clean up input names
  code = code.replace(/input_0\./g, 'input.');
  code = code.replace(/_S(\d+)/g, 't$1');

  return code.trim();
}

// Clean up Slang Metal output
function cleanupSlangMetalOutput(metalCode) {
  let code = metalCode;

  // Clean up uniform names
  code = code.replace(/globalParams_0->/g, '');
  code = code.replace(/globalParams_0\./g, '');
  code = code.replace(/uResolution_0/g, 'iResolution');
  code = code.replace(/uTime_0/g, 'iTime');
  code = code.replace(/uTimeDelta_0/g, 'iTimeDelta');
  code = code.replace(/uFrame_0/g, 'iFrame');
  code = code.replace(/uFrameRate_0/g, 'iFrameRate');

  // Clean up input names
  code = code.replace(/input_0\./g, 'input.');
  code = code.replace(/_S(\d+)/g, 't$1');

  return code.trim();
}

// Clean up spirv-cross GLSL ES output for ShaderToy compatibility
function cleanupSlangGlslOutput(glslCode, mode = 'materialLibrary') {
  let code = glslCode;

  // Remove #version directive
  code = code.replace(/#version\s+\d+.*\r?\n?/g, '');

  // Remove precision declarations
  code = code.replace(/precision\s+(lowp|mediump|highp)\s+(float|int)\s*;\s*\r?\n?/g, '');

  // Remove the GlobalParams_std140 struct definition
  code = code.replace(/struct\s+GlobalParams_std140\s*\{[^}]*\}\s*;\s*/gs, '');

  // Remove the uniform struct instance declaration
  code = code.replace(/uniform\s+GlobalParams_std140\s+globalParams\s*;\s*/g, '');

  // Remove varying declarations (we'll set them up in mainImage)
  code = code.replace(/varying\s+highp\s+vec2\s+input_uv\s*;\s*/g, '');
  code = code.replace(/varying\s+highp\s+vec3\s+input_normal\s*;\s*/g, '');
  code = code.replace(/varying\s+highp\s+vec3\s+input_position\s*;\s*/g, '');

  // Map spirv-cross uniform references to ShaderToy-style names
  code = code.replace(/globalParams\.uResolution/g, 'iResolution');
  code = code.replace(/globalParams\.uTime/g, 'iTime');
  code = code.replace(/globalParams\.uTimeDelta/g, 'iTimeDelta');
  code = code.replace(/globalParams\.uFrame/g, 'iFrame');
  code = code.replace(/globalParams\.uFrameRate/g, 'iFrameRate');

  // Map input varyings to readable names
  code = code.replace(/\binput_uv\b/g, 'uv');
  code = code.replace(/\binput_normal\b/g, 'normal');
  code = code.replace(/\binput_position\b/g, 'position');

  // Map gl_FragData[0] to fragColor
  code = code.replace(/gl_FragData\s*\[\s*0\s*\]/g, 'fragColor');

  // Remove highp qualifiers for cleaner output
  code = code.replace(/\bhighp\s+/g, '');

  // Convert infinite loop pattern for(;;) to standard loop
  code = code.replace(/for\s*\(\s*;\s*;\s*\)/g, 'for(int _loopIdx = 0; _loopIdx < 10000; _loopIdx++)');

  // Extract main() body content
  const mainMatch = code.match(/void\s+main\s*\(\s*\)\s*\{([\s\S]*)\}/);
  if (!mainMatch) {
    // If no main() found, return cleaned code as-is
    return code.trim();
  }

  let mainBody = mainMatch[1];

  // Clean up indentation - remove one level
  mainBody = mainBody.split('\n').map(line => {
    if (line.startsWith('    ')) {
      return line.substring(4);
    }
    return line;
  }).join('\n');

  // Build the ShaderToy-compatible output
  let result = '';

  if (mode === 'shaderToy') {
    // ShaderToy mode - wrap in mainImage with 2D fallbacks
    result = `void mainImage(out vec4 fragColor, in vec2 fragCoord)
{
    // Convert pixel coordinates to UV (0-1 range)
    vec2 uv = fragCoord / iResolution.xy;

    // Fake 3D inputs for 2D ShaderToy context
    vec3 normal = vec3(0.0, 0.0, 1.0);
    vec3 position = vec3(uv, 0.0);

${mainBody}
}`;
  } else {
    // Material Library mode - clean standalone function
    result = `// Uniforms: iResolution, iTime, iTimeDelta, iFrame, iFrameRate
// Inputs: uv (vec2), normal (vec3), position (vec3)
// Output: fragColor (vec4)

void mainImage(out vec4 fragColor, in vec2 fragCoord)
{
    vec2 uv = fragCoord / iResolution.xy;
    vec3 normal = vec3(0.0, 0.0, 1.0);
    vec3 position = vec3(uv, 0.0);

${mainBody}
}`;
  }

  // Clean up multiple empty lines
  result = result.replace(/\r\n/g, '\n');
  result = result.replace(/\n{3,}/g, '\n\n');

  return result.trim();
}

// Slang compilation endpoint
app.post('/api/slang/compile', async (req, res) => {
  const {
    source,
    target = 'glsl',
    mode = 'materialLibrary',
    entryPoint = 'fragmentMain',
    stage = 'fragment',
    forExport = false
  } = req.body;

  if (!source) {
    return res.status(400).json({ success: false, error: 'No source code provided' });
  }

  // Validate target
  const validTargets = ['glsl', 'hlsl', 'unrealHlsl', 'spirv', 'wgsl', 'metal'];
  if (!validTargets.includes(target)) {
    return res.status(400).json({
      success: false,
      error: `Invalid target: ${target}. Valid targets: ${validTargets.join(', ')}`
    });
  }

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'slang-'));
  const slangFile = path.join(tempDir, 'shader.slang');

  // Determine output extension based on target (unrealHlsl uses hlsl extension)
  const outputExtensions = {
    glsl: 'glsl',
    hlsl: 'hlsl',
    unrealHlsl: 'hlsl',
    spirv: 'spv',
    wgsl: 'wgsl',
    metal: 'metal'
  };
  const outputFile = path.join(tempDir, `shader.${outputExtensions[target]}`);

  // Line offset for error messages (user code starts at different lines based on mode)
  const lineOffset = mode === 'shaderToy' ? 28 : 36;

  try {
    // Wrap user code based on mode
    const fullShaderCode = mode === 'shaderToy'
      ? wrapUserCodeForSlangShaderToy(source)
      : wrapUserCodeForSlang(source);

    fs.writeFileSync(slangFile, fullShaderCode);

    // For GLSL target, use SPIR-V + spirv-cross pipeline for better ES compatibility
    const useSpirVCrossPipeline = (target === 'glsl');
    // Map unrealHlsl to hlsl for Slang compilation
    const slangTarget = useSpirVCrossPipeline ? 'spirv' : (target === 'unrealHlsl' ? 'hlsl' : target);
    const slangOutputFile = useSpirVCrossPipeline
      ? path.join(tempDir, 'shader.spv')
      : outputFile;

    // Build slangc command arguments
    const args = [
      slangFile,
      '-target', slangTarget,
      '-entry', entryPoint,
      '-stage', stage,
      '-o', slangOutputFile
    ];

    // Add target-specific options
    if (target === 'hlsl' || target === 'unrealHlsl') {
      args.push('-profile', 'sm_5_0');
    }

    // Remove #line directives for cleaner output
    args.push('-line-directive-mode', 'none');

    // Execute Slang compiler
    try {
      execFileSync(SLANG_PATH, args, {
        timeout: 30000,
        maxBuffer: 1024 * 1024
      });
    } catch (slangError) {
      const stderr = slangError.stderr ? slangError.stderr.toString() : slangError.message;
      const errors = parseSlangErrors(stderr, lineOffset);

      return res.status(400).json({
        success: false,
        error: errors.length > 0 ? errors[0].message : stderr,
        errors: errors,
        stage: 'slang-compilation'
      });
    }

    // For GLSL, run spirv-cross to convert SPIR-V to GLSL ES
    if (useSpirVCrossPipeline) {
      try {
        const spirvCrossArgs = [
          slangOutputFile,
          '--version', '100',
          '--es',
          '--output', outputFile
        ];
        execFileSync(SPIRV_CROSS_PATH, spirvCrossArgs, {
          timeout: 30000,
          maxBuffer: 1024 * 1024
        });
      } catch (spirvCrossError) {
        const stderr = spirvCrossError.stderr ? spirvCrossError.stderr.toString() : spirvCrossError.message;
        return res.status(400).json({
          success: false,
          error: `spirv-cross error: ${stderr}`,
          stage: 'spirv-cross'
        });
      }
    }

    // Read compiled output
    let compiledCode;
    if (target === 'spirv') {
      // For SPIR-V, return base64 encoded binary
      const spirvBinary = fs.readFileSync(outputFile);
      compiledCode = spirvBinary.toString('base64');
    } else {
      compiledCode = fs.readFileSync(outputFile, 'utf-8');

      // Apply cleanup based on target for better readability (only for export)
      if (forExport) {
        if (target === 'hlsl') {
          compiledCode = cleanupSlangHlslOutput(compiledCode);
        } else if (target === 'unrealHlsl') {
          compiledCode = cleanupSlangHlslForUnreal(compiledCode);
        } else if (target === 'wgsl') {
          compiledCode = cleanupSlangWgslOutput(compiledCode);
        } else if (target === 'metal') {
          compiledCode = cleanupSlangMetalOutput(compiledCode);
        } else if (target === 'glsl') {
          compiledCode = cleanupSlangGlslOutput(compiledCode, mode);
        }
      }
    }

    res.json({
      success: true,
      code: compiledCode,
      target: target,
      mode: mode
    });

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

// Slang version/health check endpoint
app.get('/api/slang/version', (req, res) => {
  try {
    // slangc doesn't have --version, so we just check if it's available
    execFileSync(SLANG_PATH, ['-h'], { timeout: 5000, maxBuffer: 1024 * 1024 });
    res.json({
      available: true,
      path: SLANG_PATH,
      targets: ['glsl', 'hlsl', 'spirv', 'wgsl', 'metal']
    });
  } catch (e) {
    // -h returns non-zero but still works if available
    if (e.stdout || e.stderr) {
      res.json({
        available: true,
        path: SLANG_PATH,
        targets: ['glsl', 'hlsl', 'spirv', 'wgsl', 'metal']
      });
    } else {
      res.json({ available: false, error: 'Slang compiler not found' });
    }
  }
});

// List available compilation targets
app.get('/api/slang/targets', (req, res) => {
  res.json({
    targets: [
      { id: 'glsl', name: 'GLSL', description: 'OpenGL Shading Language (WebGL/OpenGL)' },
      { id: 'hlsl', name: 'HLSL', description: 'High-Level Shading Language (DirectX)' },
      { id: 'spirv', name: 'SPIR-V', description: 'Standard Portable Intermediate Representation (Vulkan)' },
      { id: 'wgsl', name: 'WGSL', description: 'WebGPU Shading Language' },
      { id: 'metal', name: 'Metal', description: 'Metal Shading Language (Apple)' }
    ]
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Shader conversion server running on port ${PORT}`);
  console.log(`Using glslangValidator: ${GLSLANG_PATH}`);
  console.log(`Using spirv-cross: ${SPIRV_CROSS_PATH}`);
  console.log(`Using slangc: ${SLANG_PATH}`);
});
