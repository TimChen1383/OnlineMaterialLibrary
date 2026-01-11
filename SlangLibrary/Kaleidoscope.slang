// Platform variables: iUV, iNormal, iPosition, iTime, iResolution
float2 fragCoord = iUV * iResolution;
float2 uv_main = (fragCoord * 2.0 - iResolution) / iResolution.y;
float2 uv0 = uv_main;
float3 finalCol = float3(0.0, 0.0, 0.0);

for (float i = 0.0; i < 4.0; i++) {
    // Palette logic inlined
    float3 a = float3(0.5, 0.5, 0.5);
    float3 b = float3(0.5, 0.5, 0.5);
    float3 c = float3(1.0, 1.0, 1.0);
    float3 d = float3(0.263, 0.416, 0.557);

    uv_main = frac(uv_main * 1.5) - 0.5;
    float dlen = length(uv_main) * exp(-length(uv0));
    float t = length(uv0) + i * 0.4 + iTime * 0.4;
    float3 col = a + b * cos(6.28318 * (c * t + d));

    float dval = sin(dlen * 8.0 + iTime) / 8.0;
    dval = abs(dval);
    dval = pow(0.01 / dval, 1.2);

    finalCol += col * dval;
}

fragColor = float4(finalCol, 1.0);
