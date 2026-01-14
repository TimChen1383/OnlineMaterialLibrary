import Editor from '@monaco-editor/react'

export default function ShaderEditor({ value, onChange, onKeyDown }) {
  const handleEditorMount = (editor, monaco) => {
    // Register GLSL language if not already registered
    if (!monaco.languages.getLanguages().some(lang => lang.id === 'glsl')) {
      monaco.languages.register({ id: 'glsl' })
      monaco.languages.setMonarchTokensProvider('glsl', {
        tokenizer: {
          root: [
            [/\/\/.*$/, 'comment'],
            [/\/\*/, 'comment', '@comment'],
            [/\b(void|bool|int|uint|float|double|vec[234]|ivec[234]|uvec[234]|bvec[234]|mat[234]|mat[234]x[234]|sampler[123]D|samplerCube|sampler2DShadow)\b/, 'type'],
            [/\b(const|uniform|varying|attribute|in|out|inout|layout|centroid|flat|smooth|noperspective|patch|sample|break|continue|do|for|while|switch|case|default|if|else|discard|return|struct)\b/, 'keyword'],
            [/\b(radians|degrees|sin|cos|tan|asin|acos|atan|sinh|cosh|tanh|asinh|acosh|atanh|pow|exp|log|exp2|log2|sqrt|inversesqrt|abs|sign|floor|trunc|round|roundEven|ceil|fract|mod|modf|min|max|clamp|mix|step|smoothstep|isnan|isinf|floatBitsToInt|intBitsToFloat|fma|frexp|ldexp|packUnorm2x16|packSnorm2x16|packUnorm4x8|packSnorm4x8|unpackUnorm2x16|unpackSnorm2x16|unpackUnorm4x8|unpackSnorm4x8|packDouble2x32|unpackDouble2x32|packHalf2x16|unpackHalf2x16|length|distance|dot|cross|normalize|ftransform|faceforward|reflect|refract|matrixCompMult|outerProduct|transpose|determinant|inverse|lessThan|lessThanEqual|greaterThan|greaterThanEqual|equal|notEqual|any|all|not|textureSize|textureQueryLod|texture|textureProj|textureLod|textureOffset|texelFetch|texelFetchOffset|textureProjOffset|textureLodOffset|textureProjLod|textureProjLodOffset|textureGrad|textureGradOffset|textureProjGrad|textureProjGradOffset|textureGather|textureGatherOffset|dFdx|dFdy|fwidth|noise[1234]|EmitVertex|EndPrimitive)\b/, 'function'],
            [/\b(gl_Position|gl_FragColor|gl_FragCoord|gl_PointSize|gl_VertexID|gl_InstanceID|gl_FrontFacing|gl_PointCoord|gl_PrimitiveID|gl_Layer|gl_ViewportIndex|gl_SampleID|gl_SamplePosition|gl_SampleMask|gl_ClipDistance|gl_CullDistance)\b/, 'variable.predefined'],
            [/\b\d+\.?\d*([eE][-+]?\d+)?[fF]?\b/, 'number'],
            [/\b0[xX][0-9a-fA-F]+[uU]?\b/, 'number.hex'],
            [/\b\d+[uU]?\b/, 'number'],
            [/#\s*(define|undef|if|ifdef|ifndef|else|elif|endif|error|pragma|extension|version|line)\b/, 'keyword.directive'],
            [/[a-zA-Z_]\w*/, 'identifier'],
          ],
          comment: [
            [/[^\/*]+/, 'comment'],
            [/\*\//, 'comment', '@pop'],
            [/[\/*]/, 'comment']
          ],
        }
      })
    }

    // Register Slang language if not already registered
    if (!monaco.languages.getLanguages().some(lang => lang.id === 'slang')) {
      monaco.languages.register({ id: 'slang' })
      monaco.languages.setMonarchTokensProvider('slang', {
        tokenizer: {
          root: [
            // Comments
            [/\/\/.*$/, 'comment'],
            [/\/\*/, 'comment', '@comment'],

            // Slang-specific attributes
            [/\[shader\s*\(\s*"[^"]*"\s*\)\]/, 'annotation'],
            [/\[numthreads\s*\([^\)]*\)\]/, 'annotation'],
            [/\[[a-zA-Z_]\w*(?:\s*\([^\)]*\))?\]/, 'annotation'],

            // Types - HLSL/Slang style
            [/\b(void|bool|int|uint|float|double|half|min16float|min10float|min16int|min12int|min16uint)\b/, 'type'],
            [/\b(float[1234]|int[1234]|uint[1234]|bool[1234]|half[1234])\b/, 'type'],
            [/\b(float[1234]x[1234]|int[1234]x[1234]|uint[1234]x[1234]|half[1234]x[1234])\b/, 'type'],
            [/\b(Texture[123]D|Texture2DArray|TextureCube|Texture2DMS|RWTexture[123]D)\b/, 'type'],
            [/\b(SamplerState|SamplerComparisonState)\b/, 'type'],
            [/\b(StructuredBuffer|RWStructuredBuffer|ByteAddressBuffer|RWByteAddressBuffer)\b/, 'type'],
            [/\b(ConstantBuffer|AppendStructuredBuffer|ConsumeStructuredBuffer)\b/, 'type'],

            // Keywords
            [/\b(const|static|uniform|extern|volatile|inline|precise|groupshared)\b/, 'keyword'],
            [/\b(in|out|inout|ref)\b/, 'keyword'],
            [/\b(break|continue|do|for|while|switch|case|default|if|else|return|discard)\b/, 'keyword'],
            [/\b(struct|class|interface|extension|typedef|enum|namespace)\b/, 'keyword'],
            [/\b(import|module|public|private|internal|export|__generic|This|associatedtype)\b/, 'keyword'],
            [/\b(cbuffer|tbuffer|register|packoffset)\b/, 'keyword'],
            [/\b(true|false)\b/, 'keyword'],

            // Semantics
            [/:\s*(SV_Target|SV_Position|SV_Depth|SV_VertexID|SV_InstanceID|SV_IsFrontFace|SV_PrimitiveID|SV_DispatchThreadID|SV_GroupID|SV_GroupIndex|SV_GroupThreadID)\b/i, 'type.identifier'],
            [/:\s*(POSITION|NORMAL|TEXCOORD|COLOR|TANGENT|BINORMAL|BLENDWEIGHT|BLENDINDICES)[0-9]*/i, 'type.identifier'],

            // Built-in functions - common
            [/\b(abs|acos|all|any|asin|atan|atan2|ceil|clamp|clip|cos|cosh|cross|ddx|ddy|degrees|determinant|distance|dot|exp|exp2|faceforward|floor|fmod|frac|frexp|fwidth|isfinite|isinf|isnan|ldexp|length|lerp|lit|log|log10|log2|mad|max|min|modf|mul|normalize|pow|radians|rcp|reflect|refract|round|rsqrt|saturate|sign|sin|sincos|sinh|smoothstep|sqrt|step|tan|tanh|tex1D|tex2D|tex3D|texCUBE|transpose|trunc)\b/, 'function'],

            // Pre-defined variables (from our wrapper)
            [/\b(iResolution|iTime|iTimeDelta|iFrame|iFrameRate|iUV|iNormal|iPosition|fragColor)\b/, 'variable.predefined'],

            // Numbers
            [/\b\d+\.?\d*([eE][-+]?\d+)?[fFhHlL]?\b/, 'number'],
            [/\b0[xX][0-9a-fA-F]+[uUlL]*\b/, 'number.hex'],
            [/\b\d+[uUlL]*\b/, 'number'],

            // Preprocessor
            [/#\s*(define|undef|if|ifdef|ifndef|else|elif|endif|error|pragma|include|line)\b/, 'keyword.directive'],

            // Identifiers
            [/[a-zA-Z_]\w*/, 'identifier'],
          ],
          comment: [
            [/[^\/*]+/, 'comment'],
            [/\*\//, 'comment', '@pop'],
            [/[\/*]/, 'comment']
          ],
        }
      })
    }

    // Add Ctrl+Enter keybinding for compile
    if (onKeyDown) {
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
        onKeyDown({ ctrlKey: true, key: 'Enter' })
      })
    }
  }

  return (
    <Editor
      height="100%"
      language="slang"
      theme="vs-dark"
      value={value}
      onChange={onChange}
      onMount={handleEditorMount}
      options={{
        minimap: { enabled: false },
        fontSize: 13,
        lineNumbers: 'on',
        scrollBeyondLastLine: false,
        automaticLayout: true,
        tabSize: 2,
        wordWrap: 'on'
      }}
    />
  )
}
