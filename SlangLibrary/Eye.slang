    const float PI = 3.14159265359;
    const float TWO_PI = 6.28318530718;
    const float edge = 0.01;

    // fragCoord and normalized uv
    float2 fragCoord = iUV * iResolution;
    float2 vUV = fragCoord / iResolution;
    vUV.x *= iResolution.x / iResolution.y;
    float scl = 1.75;
    float2 pUV = vUV * scl + float2(iTime * 0.01, iTime * -0.0107);
    float4 color = float4(0.0,0.0,0.0,0.0);
    float sdf = 1.0;

    // Loop (i = 0.0 and 1.0)
    for (int ii = 0; ii <= 1; ++ii)
    {
        float i = float(ii);
        float2 luv = pUV + 7.5*(1.0 - i);
        float2 iUV = floor(luv);
        float2 tvUV = frac(luv) - 0.5;

        // value_noise(iUV, int(tvUV.x*tvUV.y))
        int seed = (int)(tvUV.x * tvUV.y);
        // In original GLSL this call reduces to the grid-random at iUV (fract(iUV)==0),
        // so compute random1D(iUV, seed) directly for faithful result.
        float rand = frac(abs(sin(dot(iUV, float2(11.13, 57.05)) + float(seed)) * 48240.41));

        float t = (iTime + 100.0*(i + 0.5)) * (rand + 1.0);

        // rotate2D(tvUV, t*0.01)
        float ang = t * 0.01;
        float ca = cos(ang);
        float sa = sin(ang);
        float2x2 rot = float2x2(ca, -sa, sa, ca);
        float2 rv = mul(rot, tvUV);

        // b = scale(pow(fold(t * 0.1), 100.0), 0.0, 1.0, 2.0, 10.0)
        // fold
        float fd = abs(fmod(t * 0.1 + 1.0, 2.0) - 1.0);
        float bpow = pow(fd, 100.0);
        float b = ((bpow - 0.0) / (1.0 - 0.0)) * (10.0 - 2.0) + 2.0;

        // mk_eye: needs eyeSDF, mk_tearduct, mk_eyelids, mk_eyeball
        // We'll compute eye components inline for v = rv * pow(2.0, rand)
        float scaleRand = pow(2.0, rand);
        float2 vv = rv * scaleRand;

        // compute eyeball (mk_eyeball)
        // mk_retina, mk_sclera, etc. inline

        // mk_sclera(vv, d, t)
        float d = length(vv);
        // glow from rotate2D(vUV, length(vUV)*TWO_PI*sin(t*0.1) + t*0.01).y
        float angG = length(vv) * TWO_PI * sin(t * 0.1) + t * 0.01;
        float caG = cos(angG); float saG = sin(angG);
        float2x2 rotG = float2x2(caG, -saG, saG, caG);
        float2 rg = mul(rotG, vv);
        float g = rg.y;
        float3 glow = smoothstep(edge, 0.0, g) * float3(1.0,1.0,1.0);
        float4 sclera = smoothstep(edge, 0.0, d - 0.25) * float4(0.8275,0.8235,0.8235,1.0);
        float4 border = smoothstep(edge, 0.0, abs(d - 0.25) - 0.0025) * float4(0.2549,0.2549,0.2549,1.0);
        sclera.rgb = lerp(sclera.rgb, glow, glow.x);
        sclera = lerp(sclera, border, border.a);

        // mk_retina
        float2 rv2 = vv;
        rv2 *= length(vv) * 1.5 + 1.0;
        rv2 += float2(cos(t*0.98), sin(t*0.234)) * 0.08;
        float d2 = length(rv2);

        // mk_glow(rv2,t)
        float2 gv = rv2;
        gv *= float2(sin(d2*2.123 - t*0.798347), cos(d2*3.123 + t*0.91823)) * 0.1 + 1.0;
        float gd = length((gv - (gv.y*0.1)) - 0.05);
        float4 glowA = smoothstep(edge*1.5, 0.0, gd - 0.03) * float4(1.0,1.0,1.0,1.0);
        gd = length((gv - (gv.y*0.1)) + 0.05);
        float4 glowB = smoothstep(edge*1.25, 0.0, gd - 0.02) * float4(1.0,1.0,1.0,1.0);
        glowA = lerp(glowA, glowB, 1.0 - glowA.a);

        // mk_iris(rv2, d2, t)
        float a = atan2(rv2.x, rv2.y);
        // cosine_ramp and fold inline used below
        // compute col mixture
        float cr1_in = sin(a*3.0*cos(a*2.0) + t*0.5);
        // fold(cosine_ramp(...)) sequence: compute cosine_ramp(sin(...),4.0)
        float fr = frac(cr1_in);
        float yy = cos(fr * PI);
        float cosr = floor(cr1_in) + 0.5 - (0.5 * pow(abs(yy), 1.0 / 4.0) * sign(yy));
        float ffold = abs(fmod(cosr + 1.0, 2.0) - 1.0);
        float3 colI = lerp(float3(0.6784,0.7922,0.8431), float3(0.6118,0.7255,0.7804), ffold);
        float cr2_in = cos(3.0*a*sin(-a*1.5) + t*0.4) * 0.5 + 0.5;
        float fr2 = frac(cr2_in);
        float yy2 = cos(fr2 * PI);
        float cosr2 = floor(cr2_in) + 0.5 - (0.5 * pow(abs(yy2), 1.0 / 4.0) * sign(yy2));
        colI = lerp(colI, float3(0.7765,0.8196,0.8392), cosr2);
        float4 iris = smoothstep(edge, 0.0, d2 - 0.125) * float4(colI, 1.0);
        float4 borderI = smoothstep(edge, 0.0, abs(d2 - 0.125) - 0.002) * float4(0.2627,0.2353,0.2353,1.0);

        float shade = cos(a + t*0.25) * 0.5 + 0.5;
        shade *= shade;
        float sfract = frac(shade);
        float yy3 = cos(sfract * PI);
        float shadeR = floor(shade) + 0.5 - (0.5 * pow(abs(yy3), 1.0 / 4.0) * sign(yy3));
        iris = lerp(iris, borderI, borderI.a);
        iris.rgb = lerp(iris.rgb, float3(0.3529,0.4627,0.4941), shadeR * 0.75);

        // mk_pupil
        float dp = d2;
        float tp = sin(dp + t*0.125) * 0.01;
        float4 pupil = smoothstep(edge, 0.0, dp - 0.05 + tp) * float4(0.0627,0.0588,0.0588,1.0);

        // mk_retina composition
        float4 retina = float4(0.0,0.0,0.0,0.0);
        retina = lerp(retina, iris, iris.a);
        retina = lerp(retina, pupil, pupil.a * retina.a);
        retina = lerp(retina, glowA, glowA.a * 0.975 * iris.a);

        // combine sclera and retina into eyeball
        float4 eyeball = float4(0.0,0.0,0.0,0.0);
        eyeball = lerp(eyeball, sclera, sclera.a);
        eyeball = lerp(eyeball, retina, retina.a * sclera.a);

        // mk_tearduct(eye_sdf, t)
        // compute eyeSDF for v = tvUV * 1.06 and b later; but here approximate with d2
        float eye_sdf = 0.0;
        // eyeSDF implementation (approx)
        {
            float o = 0.125;
            float2 tuv = abs(tvUV * float2(1.0 + o, 1.0));
            float xval = clamp(tuv.x * (1.0 - o), 0.0, 0.5);
            float px = pow(cos(xval * PI) / 1.0, 1.0);
            float2 uv2 = tuv - float2(0.5, px);
            eye_sdf = length(max(float2(0.0,0.0), uv2)) + min(0.0, max(uv2.x, uv2.y));
        }

        // mk_tearduct color
        float cr_in = frac(eye_sdf * 60.0 + t * 0.25);
        float yy4 = cos(cr_in * PI);
        float cosine_r = floor(eye_sdf * 60.0 + t * 0.25) + 0.5 - (0.5 * pow(abs(yy4), 1.0 / 2.0) * sign(yy4));
        float3 tearduct_col = lerp(float3(0.0,0.0,0.0), float3(0.8471,0.8471,0.8471), cosine_r);
        float ta = smoothstep(edge, 0.0, eye_sdf + edge);
        float4 tearduct = float4(tearduct_col, ta);

        // mk_eyelids
        float4 eyelids = smoothstep(edge*2.0, 0.0, abs(eye_sdf) - 0.01) * float4(0.6471,0.6471,0.6471,1.0);

        // compose eye: mix tearduct, eyeball, eyelids
        float4 eye = float4(0.0,0.0,0.0,0.0);
        eye = lerp(eye, tearduct, tearduct.a);
        eye = lerp(eye, eyeball, eyeball.a * tearduct.a);
        eye = lerp(eye, eyelids, eyelids.a);

        // compute eyeSDF for sdf accumulation: use eyeSDF(tvUV * scl, b)
        // approximate as earlier eye_sdf scaled
        float eyeSDF_val = eye_sdf; // approximation
        sdf = min(sdf, eyeSDF_val);
        color = lerp(color, eye, eye.a);
    }

    // post loop processing
    float tmp = abs(fmod(sdf * (16.0 + sin(iTime * 0.25) * 2.0) - iTime * 0.1 + 1.0, 2.0) - 1.0);
    float camel = floor(tmp) + pow(0.5 - (0.5 * cos(TWO_PI * frac(tmp)) * cos(PI * frac(tmp))), 1.0);
    float sdfr = camel * camel;
    color = lerp(color, float4(0.6824,0.6824,0.6824,1.0) * sdfr, sdfr * (1.0 - color.a));

    // Ensure background stays black when alpha is zero by premultiplying
    fragColor = float4(color.rgb * color.a, color.a);