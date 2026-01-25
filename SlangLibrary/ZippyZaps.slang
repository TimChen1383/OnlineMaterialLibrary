float2 fragCoord = iUV * iResolution.xy;
     float2 u = fragCoord;
     float2 v = iResolution.xy;

     u = 0.2 * (u + u - v) / v.y;

     float4 o = float4(1.0, 2.0, 3.0, 0.0);
     float4 z = o;

     float a = 0.5;
     float t = iTime;

     // i in original ranges 1..18 (using ++i < 19.)
     for (int idx = 1; idx < 19; idx++) {
          float i_f = float(idx);

          float safeDiv = max(0.05, 0.5 - dot(u, u));
          float2 sinArg = 1.5 * u / safeDiv - 9.0 * u.yx + t;
          float denomRaw = length((1.0 + i_f * dot(v, v)) * sin(sinArg));
          float denom = max(denomRaw, 1e-3);
          o += (1.0 + cos(z + t)) / denom;

          // increment a and t as in original (++t and a += .03)
          a += 0.03;
          t += 1.0;

          v = cos(t - 7.0 * u * pow(a, i_f)) - 5.0 * u;

          // build a 2x2 matrix from cos(...) (approximate GLSL mat2(vec4) behavior)
          float4 sVec = float4(i_f + 0.02 * t) - 11.0 * float4(z.w, z.x, z.z, z.w);
          float m00 = cos(sVec.x);
          float m01 = cos(sVec.y);
          float m10 = cos(sVec.z);
          float m11 = cos(sVec.w);
          float2 u2 = float2(m00 * u.x + m01 * u.y, m10 * u.x + m11 * u.y);

          float sdot = dot(u2, u);
          float2 cosVec = float2(cos(100.0 * u.y + t), cos(100.0 * u.x + t));
          float2 tanhArg = clamp(40.0 * sdot * cosVec, float2(-10.0, -10.0), float2(10.0, 10.0));
          float2 term = tanh(tanhArg) / 200.0;

          float dotOO = dot(o, o);
          float safeExpArg = clamp(dotOO / 100.0, -10.0, 10.0);
          float scalarAdd = cos(4.0 / exp(safeExpArg) + t) / 300.0;
          u += term + 0.2 * a * u + float2(scalarAdd, scalarAdd);
     }

     float4 o_safe = max(o, float4(1e-3,1e-3,1e-3,1e-3));
     float4 denomFinal = min(o, float4(13.0,13.0,13.0,13.0)) + 164.0 / o_safe;
     o = 25.6 / denomFinal - dot(u, u) / 250.0;

     fragColor = o;