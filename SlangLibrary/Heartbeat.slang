// Setup coordinates: p is centered and aspect-corrected
float2 r = iResolution;
float2 fragCoord = iUV * iResolution;
float2 p = (fragCoord - 0.5 * r) / r.y;

// Initialize variables
float2 n = float2(0.0, 0.0);
float2 q = float2(0.0, 0.0);
float d = dot(p, p);
float S = 9.0;
float a = 0.0;
float j = 0.0;

// Output color variable
float4 o = float4(0.0, 0.0, 0.0, 0.0);

// The main loop (rotate2D inlined)
float angle = 5.0;
float2x2 m = float2x2(cos(angle), -sin(angle), sin(angle), cos(angle));

for(int k = 0; k < 30; k++) {
    p = mul(p, m);
    n = mul(n, m);
    q = p * S + iTime * 4.0 + sin(iTime * 4.0 - d * 6.0) * 0.8 + j + n;
    a += dot(cos(q) / S, float2(0.2, 0.2));
    n -= sin(q);
    S *= 1.2;
    j += 1.0;
}

// Final color calculation
o += (a + 0.2) * float4(4.0, 2.0, 1.0, 0.0) + a + a - d;

// Set final output
fragColor = float4(o.rgb, 1.0);
