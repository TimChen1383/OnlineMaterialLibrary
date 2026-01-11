// Platform variables: iUV, iNormal, iPosition, iTime, iResolution
float timeVal = iTime * 0.05 + 47.0;
float2 z = -1.0 + 2.0 * iUV;
z *= 1.5;
float3 col = float3(1.0, 1.0, 1.0);

for (int j = 0; j < 48; j++) {
    float s = float(j) / 16.0;
    float f = 0.2 * (0.5 + 1.0 * frac(sin(s * 20.0)));
    float2 c = 0.5 * float2(cos(f * timeVal + 17.0 * s), sin(f * timeVal + 19.0 * s));
    z -= c;
    float zr = length(z);
    float ar = atan2(z.y, z.x) + zr * 0.6;
    z = float2(cos(ar), sin(ar)) / zr;
    z += c;
    col -= 0.5 * exp(-10.0 * dot(z, z)) * (0.25 + 0.4 * sin(5.5 + 1.5 * s + float3(1.6, 0.8, 0.5)));
}

// Simple normal approximation for lighting
float e = 1.0 / iResolution.x;
float f = dot(col, float3(0.333, 0.333, 0.333));
float fx = dot(float3(1.0, 1.0, 1.0), float3(0.333, 0.333, 0.333)) - f;
float fy = dot(float3(1.0, 1.0, 1.0), float3(0.333, 0.333, 0.333)) - f;
float3 nor = normalize(float3(fx, fy, e));
col += 0.2 * float3(1.0, 0.9, 0.5) * dot(nor, float3(0.8, 0.4, 0.2));
col += 0.3 * nor.z;

col = pow(clamp(col, float3(0.0, 0.0, 0.0), float3(1.0, 1.0, 1.0)), float3(0.8, 1.1, 1.3));

float2 uv_local = iUV;
col *= 0.4 + 0.6 * pow(16.0 * uv_local.x * uv_local.y * (1.0 - uv_local.x) * (1.0 - uv_local.y), 0.1);

fragColor = float4(col, 1.0);
