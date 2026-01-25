    float2 fragCoord = iUV * iResolution;
    float2 uv = (fragCoord.xy / iResolution.xy) * 2.0 - 1.0;
    uv.x *= iResolution.x / iResolution.y;

    float r = length(uv);
    float a = atan2(uv.y, uv.x);
    float t = iTime * 0.5;

    float layer1 = sin(8.0 * r - 5.0 * t);
    float layer2 = cos(10.0 * a + 8.0 * t);
    float layer3 = sin(5.0 * r + 15.0 * a - 9.0 * t);
    float layer4 = cos(10.0 * r - 12.0 * a + 8.0 * t);

    float pattern1 = (layer1 * 0.3 + layer2 * 0.3 + layer3 * 0.2 + layer4 * 0.2);
    float pattern2 = (layer1 * 0.5 + layer3 * 0.6) * sin(layer2 * 0.5 + t * 0.5);

    // Palette base colors (reused inline where needed)
    float3 pink = float3(0.973, 0.267, 0.478);
    float3 purple = float3(0.663, 0.620, 0.898);
    float3 blue = float3(0.573, 0.686, 0.867);
    float3 yellow = float3(1.000, 0.804, 0.459);

    // colorA = palette(pattern1 * 0.5 + 0.5)
    float tt = pattern1 * 0.5 + 0.5;
    tt = frac(tt * 0.7);
    float p = sin(tt * 6.28318 * 4.0) * 0.5 + 0.5;
    float3 colorA;
    if (tt < 0.35) colorA = lerp(pink, purple, p);
    else if (tt < 0.5) colorA = lerp(purple, blue, p);
    else if (tt < 0.65) colorA = lerp(blue, yellow, p);
    else colorA = lerp(yellow, pink, p);

    // colorB = palette(pattern2 * 0.7 + 0.3)
    tt = pattern2 * 0.7 + 0.3;
    tt = frac(tt * 0.7);
    p = sin(tt * 6.28318 * 4.0) * 0.5 + 0.5;
    float3 colorB;
    if (tt < 0.35) colorB = lerp(pink, purple, p);
    else if (tt < 0.5) colorB = lerp(purple, blue, p);
    else if (tt < 0.65) colorB = lerp(blue, yellow, p);
    else colorB = lerp(yellow, pink, p);

    float angleColor = sin(a * 5.0 + t * 0.5) * 0.5 + 0.5;
    float radialColor = smoothstep(0.3, 1.0, r);

    float3 color = lerp(colorA, colorB, angleColor);

    // Mix with another palette sample: palette(pattern1 * pattern2 * 0.8 + 0.2)
    tt = pattern1 * pattern2 * 0.8 + 0.2;
    tt = frac(tt * 0.7);
    p = sin(tt * 6.28318 * 4.0) * 0.5 + 0.5;
    float3 colorC;
    if (tt < 0.35) colorC = lerp(pink, purple, p);
    else if (tt < 0.5) colorC = lerp(purple, blue, p);
    else if (tt < 0.65) colorC = lerp(blue, yellow, p);
    else colorC = lerp(yellow, pink, p);

    color = lerp(color, colorC, radialColor * 0.5);

    float centerGlow = exp(-r * 5.0) * 0.35;

    // Glow palette: palette(sin(t * 0.7) * 0.5 + 0.5)
    tt = sin(t * 0.7) * 0.5 + 0.5;
    tt = frac(tt * 0.7);
    p = sin(tt * 6.28318 * 4.0) * 0.5 + 0.5;
    float3 glowColor;
    if (tt < 0.35) glowColor = lerp(pink, purple, p);
    else if (tt < 0.5) glowColor = lerp(purple, blue, p);
    else if (tt < 0.65) glowColor = lerp(blue, yellow, p);
    else glowColor = lerp(yellow, pink, p);

    color += centerGlow * glowColor;

    float edge = 1.0 - smoothstep(0.8, 3.0, r);
    color *= edge;

    fragColor = float4(color, 1.0);