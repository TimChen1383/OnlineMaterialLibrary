// Base HLSL conversions (shared between HLSL and Unreal HLSL)
function applyBaseHlslConversions(glslCode) {
  let hlsl = glslCode;

  // Type conversions
  hlsl = hlsl.replace(/\bvec2\b/g, 'float2');
  hlsl = hlsl.replace(/\bvec3\b/g, 'float3');
  hlsl = hlsl.replace(/\bvec4\b/g, 'float4');
  hlsl = hlsl.replace(/\bmat2\b/g, 'float2x2');
  hlsl = hlsl.replace(/\bmat3\b/g, 'float3x3');
  hlsl = hlsl.replace(/\bmat4\b/g, 'float4x4');
  hlsl = hlsl.replace(/\bivec2\b/g, 'int2');
  hlsl = hlsl.replace(/\bivec3\b/g, 'int3');
  hlsl = hlsl.replace(/\bivec4\b/g, 'int4');
  hlsl = hlsl.replace(/\bbvec2\b/g, 'bool2');
  hlsl = hlsl.replace(/\bbvec3\b/g, 'bool3');
  hlsl = hlsl.replace(/\bbvec4\b/g, 'bool4');

  // Function conversions
  hlsl = hlsl.replace(/\bmix\s*\(/g, 'lerp(');
  hlsl = hlsl.replace(/\bfract\s*\(/g, 'frac(');
  hlsl = hlsl.replace(/\bmod\s*\(/g, 'fmod(');
  hlsl = hlsl.replace(/\bdFdx\s*\(/g, 'ddx(');
  hlsl = hlsl.replace(/\bdFdy\s*\(/g, 'ddy(');
  hlsl = hlsl.replace(/\binversesqrt\s*\(/g, 'rsqrt(');
  hlsl = hlsl.replace(/\batan\s*\(\s*([^,]+)\s*,\s*([^)]+)\s*\)/g, 'atan2($1, $2)');

  // Texture sampling (basic conversion)
  hlsl = hlsl.replace(/\btexture\s*\(\s*(\w+)\s*,/g, '$1.Sample(samplerState,');
  hlsl = hlsl.replace(/\btexture2D\s*\(\s*(\w+)\s*,/g, '$1.Sample(samplerState,');

  // Qualifiers
  hlsl = hlsl.replace(/\bvarying\b/g, '// varying (use struct)');
  hlsl = hlsl.replace(/\buniform\b/g, '// uniform (use cbuffer)');
  hlsl = hlsl.replace(/\battribute\b/g, '// attribute (use struct)');

  // gl_FragColor (simplified)
  hlsl = hlsl.replace(/\bgl_FragColor\b/g, 'output.color');
  hlsl = hlsl.replace(/\bgl_Position\b/g, 'output.position');

  return hlsl;
}

// GLSL to HLSL converter
export function glslToHlsl(glslCode) {
  let hlsl = applyBaseHlslConversions(glslCode);

  // Add HLSL header comment
  hlsl = `// Converted from GLSL to HLSL
// Note: Manual adjustments may be required for:
// - Texture samplers (need SamplerState)
// - Input/Output structs
// - Constant buffers (cbuffer)

${hlsl}`;

  return hlsl;
}

// GLSL to Unreal HLSL converter (for Custom Node)
export function glslToUnrealHlsl(glslCode) {
  let hlsl = applyBaseHlslConversions(glslCode);

  // Unreal-specific: expand single-argument vector constructors to full arguments
  // float2(x) -> float2(x, x)
  hlsl = hlsl.replace(/\bfloat2\s*\(\s*([^,)]+)\s*\)/g, (match, arg) => {
    // Check if it's already a full constructor (has comma)
    if (arg.includes(',')) return match;
    return `float2(${arg.trim()}, ${arg.trim()})`;
  });
  // float3(x) -> float3(x, x, x)
  hlsl = hlsl.replace(/\bfloat3\s*\(\s*([^,)]+)\s*\)/g, (match, arg) => {
    if (arg.includes(',')) return match;
    return `float3(${arg.trim()}, ${arg.trim()}, ${arg.trim()})`;
  });
  // float4(x) -> float4(x, x, x, x)
  hlsl = hlsl.replace(/\bfloat4\s*\(\s*([^,)]+)\s*\)/g, (match, arg) => {
    if (arg.includes(',')) return match;
    return `float4(${arg.trim()}, ${arg.trim()}, ${arg.trim()}, ${arg.trim()})`;
  });

  // Unreal-specific: convert matrix multiplication operators to mul()
  // vec *= mat -> vec = mul(vec, mat)
  hlsl = hlsl.replace(/(\w+)\s*\*=\s*(\w+)\s*;/g, (match, vec, mat) => {
    // Only convert if the second operand looks like a matrix variable (typically single letter or ends with 'm' or 'mat')
    // We'll be conservative and convert all *= that might be matrix ops
    return `${vec} = mul(${vec}, ${mat});`;
  });

  // Unreal-specific: convert finalColor assignment to return statement
  // finalColor = x; -> return x;
  hlsl = hlsl.replace(/\bfinalColor\s*=\s*([^;]+);/g, 'return $1;');

  return hlsl;
}

// HLSL to GLSL converter
export function hlslToGlsl(hlslCode) {
  let glsl = hlslCode;

  // Type conversions
  glsl = glsl.replace(/\bfloat2\b/g, 'vec2');
  glsl = glsl.replace(/\bfloat3\b/g, 'vec3');
  glsl = glsl.replace(/\bfloat4\b/g, 'vec4');
  glsl = glsl.replace(/\bfloat2x2\b/g, 'mat2');
  glsl = glsl.replace(/\bfloat3x3\b/g, 'mat3');
  glsl = glsl.replace(/\bfloat4x4\b/g, 'mat4');
  glsl = glsl.replace(/\bint2\b/g, 'ivec2');
  glsl = glsl.replace(/\bint3\b/g, 'ivec3');
  glsl = glsl.replace(/\bint4\b/g, 'ivec4');
  glsl = glsl.replace(/\bbool2\b/g, 'bvec2');
  glsl = glsl.replace(/\bbool3\b/g, 'bvec3');
  glsl = glsl.replace(/\bbool4\b/g, 'bvec4');

  // Function conversions
  glsl = glsl.replace(/\blerp\s*\(/g, 'mix(');
  glsl = glsl.replace(/\bfrac\s*\(/g, 'fract(');
  glsl = glsl.replace(/\bfmod\s*\(/g, 'mod(');
  glsl = glsl.replace(/\bddx\s*\(/g, 'dFdx(');
  glsl = glsl.replace(/\bddy\s*\(/g, 'dFdy(');
  glsl = glsl.replace(/\brsqrt\s*\(/g, 'inversesqrt(');
  glsl = glsl.replace(/\batan2\s*\(/g, 'atan(');
  glsl = glsl.replace(/\bsaturate\s*\(\s*([^)]+)\s*\)/g, 'clamp($1, 0.0, 1.0)');

  // Add GLSL header comment
  glsl = `// Converted from HLSL to GLSL
// Note: Manual adjustments may be required for:
// - Texture samplers
// - Precision qualifiers
// - Built-in variables

${glsl}`;

  return glsl;
}
