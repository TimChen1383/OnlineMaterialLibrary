float2 s = iResolution;
float t = iTime * 0.2;
float c, d, m;
float2 fragCoord = iUV * iResolution;
float3 p = float3((2.0 * fragCoord - s) / s.x, 1.0);
float3 r = p - p;
float3 q = r;

// Inline rotation matrix multiplication
float a = -t;
float3x3 rotY = float3x3(cos(a),0.,sin(a),0.,1.,0.,-sin(a),0.,cos(a));
p = mul(p, rotY);

q.zx += 10.0 + float2(sin(t), cos(t)) * 3.0;

for (float i = 1.0; i > 0.0; i -= 0.01) {
    c = d = 0.0;
    m = 1.0;
    for (int j = 0; j < 3; j++) {
        r = fmod(q * m + 1.0, float3(2.0, 2.0, 2.0)) - 1.0;
        r *= r;
        r *= r;
        r *= r;
        r = max(r, r.yzx);
        d = max(d, (0.29 - length(r) * 0.6) / m) * 0.8;
        m *= 1.1;
    }

    q += p * d;
    c = i;

    if (d < 1e-5) break;
}

float k = dot(r, r + 0.15);
fragColor = float4(max(float3(1.0, k, k / c) - 0.8, float3(0.0, 0.0, 0.0)), 1.0);
