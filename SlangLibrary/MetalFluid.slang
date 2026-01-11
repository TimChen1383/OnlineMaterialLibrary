// Platform variables: iUV, iNormal, iPosition, iTime, iResolution
float2 fragCoord = iUV * iResolution;
float2 uv_local = (2.0 * fragCoord - iResolution) / min(iResolution.x, iResolution.y);

for(float i = 1.0; i < 10.0; i++) {
    uv_local.x += 0.6 / i * cos(i * 2.5 * uv_local.y + iTime);
    uv_local.y += 0.6 / i * cos(i * 1.5 * uv_local.x + iTime);
}

fragColor = float4(float3(0.1, 0.1, 0.1) / abs(sin(iTime - uv_local.y - uv_local.x)), 1.0);
