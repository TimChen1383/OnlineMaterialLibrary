// Platform variables: iUV, iNormal, iPosition, iTime, iResolution
const int zoom = 40;
const float brightness = 0.975;
float timeVal = iTime * 1.25;
float2 fragCoord = iUV * iResolution;
float2 uv_local = fragCoord / iResolution;
float2 p = (2.0 * fragCoord - iResolution) / max(iResolution.x, iResolution.y);

// Inline cosRange logic
float ct = (((1.0 + cos(radians(timeVal * 5.0))) * 0.5) * 3.0) + 1.1;
float xBoost = (((1.0 + cos(radians(timeVal * 0.2))) * 0.5) * 5.0) + 5.0;
float yBoost = (((1.0 + cos(radians(timeVal * 0.1))) * 0.5) * 10.0) + 5.0;
float fScale = (((1.0 + cos(radians(timeVal * 15.5))) * 0.5) * 1.25) + 0.5;

for(int i = 1; i < zoom; i++) {
    float _i = float(i);
    float2 newp = p;
    newp.x += 0.25 / _i * sin(_i * p.y + timeVal * cos(ct) * 0.5 / 20.0 + 0.005 * _i) * fScale + xBoost;
    newp.y += 0.25 / _i * sin(_i * p.x + timeVal * ct * 0.3 / 40.0 + 0.03 * float(i + 15)) * fScale + yBoost;
    p = newp;
}

float3 col = float3(0.5 * sin(3.0 * p.x) + 0.5, 0.5 * sin(3.0 * p.y) + 0.5, sin(p.x + p.y));
col *= brightness;

// Add border
float vigAmt = 5.0;
float vignette = (1.0 - vigAmt * (uv_local.y - 0.5) * (uv_local.y - 0.5)) * (1.0 - vigAmt * (uv_local.x - 0.5) * (uv_local.x - 0.5));
float extrusion = (col.x + col.y + col.z) / 4.0;
extrusion *= 1.5;
extrusion *= vignette;

fragColor = float4(col, 1.0);
