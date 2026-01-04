import Editor from '@monaco-editor/react'

export default function ShaderEditor({ value, onChange, language = 'glsl' }) {
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
  }

  return (
    <Editor
      height="100%"
      language="glsl"
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
