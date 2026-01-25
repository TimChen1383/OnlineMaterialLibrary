  const float PI = 3.14159265359;
    const float TWO_PI = 6.28318530718;
    const float SPEED = 1.0;

    // fragCoord and adjusted viewport (inline adjustViewport)
    float2 fragCoord = iUV * iResolution;
    float2 uv = (fragCoord * 2.0 - iResolution) / (iResolution.x < iResolution.y ? iResolution.x : iResolution.y);

    float t = iTime * SPEED;

    // inline cosine for scalar used to modify t: t += cosine(t*.25, 2.0);
    {
        float x = t * 0.25;
        float s = 2.0;
        float y = cos(frac(x) * PI);
        float cosine_val = floor(x) + 0.5 - (0.5 * pow(abs(y), 1.0 / s) * sign(y));
        t += cosine_val;
    }

    uv *= 5.0;
    float2 p = uv;
    float2 q = 1.0 - uv;
    float a = 0.5;

    // palette/gradient constants (inline)
    float3 c1 = float3(0.1, 0.1, 0.1);
    float3 c2 = float3(0.15, 0.15, 0.15);
    float3 c3 = float3(2.6, 2.6, 2.6);
    float3 c4 = float3(0.1, 0.5, 0.6);

    float3 col = float3(0.0, 0.0, 0.0);

    for (float i = 1.0; i < 9.0; i += 1.0)
    {
        float s = pow(1.3, i);
        float an = -a - cos(a * 0.5 + t) * 0.125;

        // rot2(in float a) -> float2x2
        float rc = cos(an);
        float rs = sin(an);
        float2x2 m = float2x2(rc, -rs, rs, rc);

        // apply rotation: p = m * p; q = m * q;
        p = mul(m, p);
        q = mul(m, q);

        // a += dot(cos(q + t + i - a)/s, vec2(.25));
        float2 tmpCos = cos(q + float2(t + i - a, t + i - a)) / s;
        a += dot(tmpCos, float2(0.25, 0.25));

        // k = fold(q - t - a + s)  (fold for each component)
        float off = -t - a + s;
        float2 tmpv = q + float2(off, off);
        float2 k;
        k.x = abs(fmod(tmpv.x + 1.0, 2.0) - 1.0);
        k.y = abs(fmod(tmpv.y + 1.0, 2.0) - 1.0);

        // h = scale(sin(a+t*1.5), -1., 1., .5, .75)
        float sinv = sin(a + t * 1.5);
        float h = (sinv + 1.0) * 0.125 + 0.5; // simplifies the scale formula

        // q = mix(q, k, h)
        q = lerp(q, k, h);

        // swap p and q
        float2 tmp = q;
        q = p;
        p = tmp;

        q *= 2.0;
        float w = a;

        // gradient(a*.5+t*.3+i, c1,c2,c3,c4) -> c1 + c2 * cos(TWO_PI*(c3 * tt + c4))
        float tt = a * 0.5 + t * 0.3 + i;
        float3 grad = c1 + c2 * cos(TWO_PI * (c3 * tt + c4));
        col += grad * w;
    }

    // col = cosine(col, 1.5)  -> apply scalar cosine to each component
    {
        float s = 1.5;
        float3 outc;
        // component x
        float yx = cos(frac(col.x) * PI);
        outc.x = floor(col.x) + 0.5 - (0.5 * pow(abs(yx), 1.0 / s) * sign(yx));
        // component y
        float yy = cos(frac(col.y) * PI);
        outc.y = floor(col.y) + 0.5 - (0.5 * pow(abs(yy), 1.0 / s) * sign(yy));
        // component z
        float yz = cos(frac(col.z) * PI);
        outc.z = floor(col.z) + 0.5 - (0.5 * pow(abs(yz), 1.0 / s) * sign(yz));
        col = outc;
    }

    fragColor = float4(col, 1.0);