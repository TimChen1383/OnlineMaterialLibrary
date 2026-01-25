    float2 fragCoord = iUV * iResolution.xy;
    float2 p = fragCoord / iResolution.x; // replicate fragCoord/iResolution.xx

    // compute voronoi at scale
    float2 x = 8.0 * p;
    float2 ip = floor(x);
    float2 fp = frac(x);

    float2 mg = float2(0.0, 0.0);
    float2 mr = float2(0.0, 0.0);
    float md = 8.0;

    // first pass: find nearest feature point
    for (int j = -1; j <= 1; j++) {
        for (int i = -1; i <= 1; i++) {
            float2 g = float2(float(i), float(j));
            float2 cell = ip + g;
            // procedural hash2
            float2 tt = float2(dot(cell, float2(127.1, 311.7)), dot(cell, float2(269.5, 183.3)));
            float2 o = frac(sin(tt) * 43758.5453);
            // animate
            o = 0.5 + 0.5 * sin(iTime + 6.2831 * o);
            float2 r = g + o - fp;
            float d = dot(r, r);
            if (d < md) {
                md = d;
                mr = r;
                mg = g;
            }
        }
    }

    // second pass: distance to borders
    float md2 = 8.0;
    for (int j = -2; j <= 2; j++) {
        for (int i = -2; i <= 2; i++) {
            float2 g = mg + float2(float(i), float(j));
            float2 cell = ip + g;
            float2 tt = float2(dot(cell, float2(127.1, 311.7)), dot(cell, float2(269.5, 183.3)));
            float2 o = frac(sin(tt) * 43758.5453);
            o = 0.5 + 0.5 * sin(iTime + 6.2831 * o);
            float2 r = g + o - fp;
            float2 diff = r - mr;
            float denom = length(diff);
            if (denom > 1e-5) {
                float val = dot(0.5 * (mr + r), diff / denom);
                md2 = min(md2, val);
            }
        }
    }

    float3 c = float3(md2, mr.x, mr.y);

    // coloring
    float3 col = c.x * (0.5 + 0.5 * sin(64.0 * c.x)) * float3(1.0, 1.0, 1.0);
    col = lerp(float3(1.0, 0.6, 0.0), col, smoothstep(0.04, 0.07, c.x));
    float dd = length(c.yz);
    col = lerp(float3(1.0, 0.6, 0.1), col, smoothstep(0.0, 0.12, dd));
    col += float3(1.0, 0.6, 0.1) * (1.0 - smoothstep(0.0, 0.04, dd));

    fragColor = float4(col, 1.0);