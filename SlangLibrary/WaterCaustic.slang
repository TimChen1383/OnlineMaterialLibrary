// Platform variables: iUV, iNormal, iPosition, iTime, iResolution
float TAU = 6.28318530718;
int MAX_ITER = 5;
float timeVal = iTime * 0.5 + 23.0;
float2 fragCoord = iUV * iResolution;
float2 uv_local = fragCoord / iResolution;

// Tiling off (SHOW_TILING not supported in platform)
float2 p = fmod(uv_local * TAU, float2(TAU, TAU)) - 250.0;
float2 i = p;
float c = 1.0;
float inten = 0.005;

for (int n = 0; n < 5; n++) {
    float t = timeVal * (1.0 - (3.5 / float(n + 1)));
    i = p + float2(cos(t - i.x) + sin(t + i.y), sin(t - i.y) + cos(t + i.x));
    c += 1.0 / length(float2(
        p.x / (sin(i.x + t) / inten),
        p.y / (cos(i.y + t) / inten)
    ));
}
c /= float(MAX_ITER);
c = 1.17 - pow(c, 1.4);
float3 colour = float3(pow(abs(c), 8.0), pow(abs(c), 8.0), pow(abs(c), 8.0));
colour = clamp(colour + float3(0.0, 0.35, 0.5), float3(0.0, 0.0, 0.0), float3(1.0, 1.0, 1.0));

fragColor = float4(colour, 1.0);
