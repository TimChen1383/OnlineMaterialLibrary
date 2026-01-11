// Platform variables: iUV, iNormal, iPosition, iTime, iResolution
float3 c = float3(0.0, 0.0, 0.0);
float l = 0.0;
float z = iTime;
float2 fragCoord = iUV * iResolution;
float r_x = iResolution.x;
float r_y = iResolution.y;

for(int i = 0; i < 3; i++) {
    float2 uv_local, p;
    p = fragCoord / iResolution;
    uv_local = p;
    p -= 0.5;
    p.x *= r_x / r_y;
    z += 0.07;
    l = length(p);
    uv_local += p / l * (sin(z) + 1.0) * abs(sin(l * 9.0 - z - z));
    c[i] = 0.01 / length(fmod(uv_local, float2(1.0, 1.0)) - 0.5);
}
float l_safe = max(l, 1e-6); // avoid div by zero
fragColor = float4(c / l_safe, 1.0);
