// Platform variables: iUV, iNormal, iPosition, iTime, iResolution
float2 fragCoord = iUV * iResolution;
float2 q = iUV;
float2 p = (fragCoord - 0.5 * iResolution) / iResolution.y;
float2 bsMo = float2(0.0, 0.0);

float timeVal = iTime * 3.0;
float3 ro = float3(0.0, 0.0, timeVal);

ro += float3(sin(iTime) * 0.5, 0.0, 0.0);

float dspAmp = 0.85;
ro.xy += float2(sin(ro.z * 0.22), cos(ro.z * 0.175)) * 2.0 * dspAmp;
float tgtDst = 3.5;

float3 target = normalize(ro - float3(sin((timeVal + tgtDst) * 0.22) * 2.0 * dspAmp * 0.5,
                                      cos((timeVal + tgtDst) * 0.175) * 2.0 * dspAmp * 0.5,
                                      timeVal + tgtDst));
ro.x -= bsMo.x * 2.0;
float3 rightdir = normalize(cross(target, float3(0, 1, 0)));
float3 updir = normalize(cross(rightdir, target));
rightdir = normalize(cross(updir, target));
float3 rd = normalize((p.x * rightdir + p.y * updir) - target);
float rotAngle = -sin((timeVal + 3.5) * 0.22) * 0.2 + bsMo.x;
rd.xy = mul(rd.xy, float2x2(cos(rotAngle), sin(rotAngle), -sin(rotAngle), cos(rotAngle)));
float prm1 = smoothstep(-0.4, 0.4, sin(iTime * 0.3));

// --- render() logic inlined ---
float4 rez = float4(0.0, 0.0, 0.0, 0.0);
const float ldst = 8.0;
float3 lpos = float3(sin((timeVal + ldst) * 0.22) * 2.0 * 0.5, cos((timeVal + ldst) * 0.175) * 2.0 * 0.5, timeVal + ldst);
float t = 1.5;
float fogT = 0.0;
for (int i = 0; i < 130; i++) {
    if (rez.a > 0.99) break;
    float3 pos = ro + t * rd;

    // --- map() logic inlined ---
    float3 p2 = pos;
    p2.xy -= float2(sin(pos.z * 0.22) * 2.0, cos(pos.z * 0.175) * 2.0);
    float2 rotv = float2(cos(sin(pos.z + iTime) * (0.1 + prm1 * 0.05) + iTime * 0.09), sin(sin(pos.z + iTime) * (0.1 + prm1 * 0.05) + iTime * 0.09));
    float2x2 rotm = float2x2(rotv.x, rotv.y, -rotv.y, rotv.x);
    pos.xy = mul(pos.xy, rotm);
    float cl = dot(p2.xy, p2.xy);
    float d = 0.0;
    float3 p3 = pos * 0.61;
    float z = 1.0;
    float trk = 1.0;
    float dspAmp2 = 0.1 + prm1 * 0.2;
    for (int j = 0; j < 5; j++) {
        p3 += sin(p3.zxy * 0.75 * trk + iTime * trk * 0.8) * dspAmp2;
        d -= abs(dot(cos(p3), sin(p3.yzx)) * z);
        z *= 0.57;
        trk *= 1.4;
        p3 = mul(p3, float3x3(0.33338, 0.56034, -0.71817, -0.87887, 0.32651, -0.15323, 0.15162, 0.69596, 0.61339)) * 1.93;
    }
    d = abs(d + prm1 * 3.0) + prm1 * 0.3 - 2.5 + bsMo.y;
    float mapx = d + cl * 0.2 + 0.25;
    float mapy = cl;
    // --- end map() ---

    float den = clamp(mapx - 0.3, 0.0, 1.0) * 1.12;
    float dn = clamp((mapx + 2.0), 0.0, 3.0);

    float4 col = float4(0.0, 0.0, 0.0, 0.0);
    if (mapx > 0.6) {
        col = float4(sin(float3(5.0, 0.4, 0.2) + mapy * 0.1 + sin(pos.z * 0.4) * 0.5 + 1.8) * 0.5 + 0.5, 0.08);
        col *= den * den * den;
        col.rgb *= clamp((4.0 - mapx) / (4.0 + 2.5), 0.0, 1.0) * 2.3;
        float dif = clamp((den - (abs(d + prm1 * 3.0 + prm1 * 0.3 - 2.5 + bsMo.y + 0.8 * 0.2 + 0.25) + cl * 0.2 + 0.25)) / 9.0, 0.001, 1.0);
        dif += clamp((den - (abs(d + prm1 * 3.0 + prm1 * 0.3 - 2.5 + bsMo.y + 0.35 * 0.2 + 0.25) + cl * 0.2 + 0.25)) / 2.5, 0.001, 1.0);
        col.xyz *= den * (float3(0.005, 0.045, 0.075) + 1.5 * float3(0.033, 0.07, 0.03) * dif);
    }

    float fogC = exp(t * 0.2 - 2.2);
    col.rgba += float4(0.06, 0.11, 0.11, 0.1) * clamp(fogC - fogT, 0.0, 1.0);
    fogT = fogC;
    rez = rez + col * (1.0 - rez.a);
    t += clamp(0.5 - dn * dn * 0.05, 0.09, 0.3);
}
float3 finalCol = rez.rgb;

// --- iLerp logic inlined ---
float3 aCol = finalCol.bgr;
float3 bCol = finalCol.rgb;
float x = clamp(1.0 - prm1, 0.05, 1.0);
float3 ic = lerp(aCol, bCol, x) + float3(1e-6, 0.0, 0.0);
float mi = min(min(ic.x, ic.y), ic.z);
float ma = max(max(ic.x, ic.y), ic.z);
float sd = abs((ma - mi) / (ma + 1e-7) - lerp((max(max(aCol.x, aCol.y), aCol.z) - min(min(aCol.x, aCol.y), aCol.z)) / (max(max(aCol.x, aCol.y), aCol.z) + 1e-7),
    (max(max(bCol.x, bCol.y), bCol.z) - min(min(bCol.x, bCol.y), bCol.z)) / (max(max(bCol.x, bCol.y), bCol.z) + 1e-7), x));
float3 dir = normalize(float3(2.0 * ic.x - ic.y - ic.z, 2.0 * ic.y - ic.x - ic.z, 2.0 * ic.z - ic.y - ic.x));
float lgt = dot(float3(1.0, 1.0, 1.0), ic);
float ff = dot(dir, normalize(ic));
ic += 1.5 * dir * sd * ff * lgt;
finalCol = clamp(ic, float3(0.0, 0.0, 0.0), float3(1.0, 1.0, 1.0));

finalCol = pow(finalCol, float3(0.55, 0.65, 0.6)) * float3(1.0, 0.97, 0.9);

finalCol *= pow(16.0 * q.x * q.y * (1.0 - q.x) * (1.0 - q.y), 0.12) * 0.7 + 0.3;

fragColor = float4(finalCol, 1.0);
