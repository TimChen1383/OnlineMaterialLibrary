uniform float uTime;
uniform vec2 uResolution;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;

void main() {
  // Simple animated gradient based on UV and time
  vec3 color1 = vec3(0.1, 0.3, 0.6);
  vec3 color2 = vec3(0.9, 0.2, 0.3);

  float t = sin(uTime + vUv.x * 3.14159) * 0.5 + 0.5;
  vec3 color = mix(color1, color2, t);

  // Add simple lighting
  vec3 lightDir = normalize(vec3(1.0, 1.0, 1.0));
  float diff = max(dot(vNormal, lightDir), 0.0);
  color *= 0.5 + 0.5 * diff;

  gl_FragColor = vec4(color, 1.0);
}
