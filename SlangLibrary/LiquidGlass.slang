    float mr = min(iResolution.x, iResolution.y);
    float2 fragCoord = iUV * iResolution.xy;
    float2 uv = (fragCoord * 2.0 - iResolution.xy) / mr;

    float d = -iTime * 0.5;
    float a = 0.0;
    for (int idx = 0; idx < 8; idx++) {
        float ii = float(idx);
        a += cos(ii - d - a * uv.x);
        d += sin(uv.y * ii + a);
    }
    d += iTime * 0.5;

    float2 first = cos(uv * float2(d, a)) * 0.6 + 0.4;
    float third = cos(a + d) * 0.5 + 0.5;
    float3 col = float3(first, third);
    col = cos(col * cos(float3(d, a, 2.5)) * 0.5 + 0.5);

    fragColor = float4(col, 1.0);