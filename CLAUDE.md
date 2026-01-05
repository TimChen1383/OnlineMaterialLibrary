# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
npm run dev      # Start development server with hot reload
npm run build    # Production build to dist/
npm run preview  # Preview production build locally
```

## Architecture Overview

Online Material Library is a React + Three.js web application for real-time shader authoring and GLSL/HLSL code export.

### Core Data Flow

1. User writes GLSL fragment shader code in the Monaco editor (left panel)
2. The code is wrapped into a complete fragment shader by `Viewer.jsx:wrapUserCode()`
3. Three.js compiles and renders the shader on a 3D mesh (sphere/cube/plane)
4. Shader errors are parsed and displayed with adjusted line numbers
5. Export modal allows downloading as GLSL or converted HLSL

### Key Components

- **App.jsx** - Main layout with two-panel split: editor (left) and 3D preview (right). Manages `userCode` state and mesh type selection.
- **Viewer.jsx** - Three.js/React Three Fiber canvas. Contains `VERTEX_SHADER` constant and `wrapUserCode()` function that wraps user code into a complete fragment shader with predefined uniforms (`uTime`, `uResolution`) and varyings (`vUv`, `vNormal`, `vPosition`).
- **ShaderEditor.jsx** - Monaco editor with custom GLSL syntax highlighting (tokenizer defined inline).
- **ExportModal.jsx** - Export dialog with format selection (GLSL/HLSL) and code type (user code only, full fragment, full vertex).
- **shaderConverter.js** - Regex-based GLSL<->HLSL converter handling type mappings (`vec3`->`float3`, `mix`->`lerp`, etc.).

### User Code Context

When users write shader code, they have access to these predefined variables:
- `uv` (vec2) - texture coordinates
- `normal` (vec3) - surface normal
- `position` (vec3) - vertex position
- `time` (float) - elapsed time
- `resolution` (vec2) - screen size

Output: set `finalColor` (vec3)

### Shader Error Handling

WebGL compile errors are caught in `Viewer.jsx` and line numbers are adjusted by -15 to account for the wrapper code injected by `wrapUserCode()`.
