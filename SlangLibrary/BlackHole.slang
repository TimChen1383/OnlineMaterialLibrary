float2 F = iUV * iResolution;
float2 r = iResolution;
float2 p = (F + F - r) / r.y / 0.7;
float2 d = float2(-1.0, 1.0);
float i_init = 0.2;
float a = 0.0;
float2 b = p - i_init * d;
float2 row2 = d / (0.1 + i_init / dot(b, b));
float2 c = mul(p, float2x2(float2(1.0, 1.0), row2));
a = dot(c, c);
float2 v = mul(c, float2x2(
    cos(0.5 * log(a) + iTime * i_init + 0.0), cos(0.5 * log(a) + iTime * i_init + 33.0),
    cos(0.5 * log(a) + iTime * i_init + 11.0), cos(0.5 * log(a) + iTime * i_init + 0.0)
)) / i_init;
float2 w = float2(0.0, 0.0);

for (float i = 0.2; i < 9.0; i += 1.0) {
    v += 0.7 * sin(v.yx * i + iTime) / i + 0.5;
    w += 1.0 + sin(v);
}

float i_len = length(sin(v / 0.3) * 0.4 + c * (3.0 + d));
float a_safe = max(a, 1e-6); // avoid division by zero

float4 O = 1.0 - exp(
    -exp(c.x * float4(0.6, -0.4, -1.0, 0.0))
    / w.xyxy
    / (2.0 + i_len * i_len / 4.0 - i_len)
    / (0.5 + 1.0 / a_safe)
    / (0.03 + abs(length(p) - 0.7))
);

fragColor = float4(O.rgb, 1.0);
