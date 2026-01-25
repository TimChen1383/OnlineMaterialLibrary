float2 fragCoord = iUV * iResolution.xy;
	float2 uv = fragCoord / iResolution.xy;

	// screen size is 6m x 6m
	float3 rayOri = float3((uv - 0.5) * float2(iResolution.x/iResolution.y, 1.0) * 6.0, 3.0);
	float3 rayDir = float3(0.0, 0.0, -1.0);

	float depth = 0.0;
	float3 p = float3(0.0, 0.0, 0.0);

	// Ray-march
	for (int i = 0; i < 64; i++) {
		p = rayOri + rayDir * depth;

		// map(p) inlined
		float d = 2.0;
		for (int j = 0; j < 16; j++) {
			float fj = float(j);
			float t = iTime * (frac(fj * 412.531 + 0.513) - 0.5) * 2.0;
			float3 off = sin(t + fj * float3(52.5126, 64.62744, 632.25)) * float3(2.0, 2.0, 0.8);
			float r = lerp(0.5, 1.0, frac(fj * 412.531 + 0.5124));
			float sd = length(p + off) - r; // sdSphere
			float k = 0.4;
			float hh = clamp(0.5 + 0.5*(d - sd)/k, 0.0, 1.0);
			d = lerp(d, sd, hh) - k*hh*(1.0 - hh);
		}

		float dist = d;
		depth += dist;
		if (dist < 1e-6) break;
	}

	depth = min(6.0, depth);

	// calcNormal(p) inlined (central differences)
	const float eps = 1e-5;

	// sample 1
	float3 p1 = p + float3(1.0, -1.0, -1.0) * eps;
	float d1 = 2.0;
	for (int j1 = 0; j1 < 16; j1++) {
		float fj = float(j1);
		float t = iTime * (frac(fj * 412.531 + 0.513) - 0.5) * 2.0;
		float3 off = sin(t + fj * float3(52.5126, 64.62744, 632.25)) * float3(2.0, 2.0, 0.8);
		float r = lerp(0.5, 1.0, frac(fj * 412.531 + 0.5124));
		float sd = length(p1 + off) - r;
		float k = 0.4;
		float hh = clamp(0.5 + 0.5*(d1 - sd)/k, 0.0, 1.0);
		d1 = lerp(d1, sd, hh) - k*hh*(1.0 - hh);
	}

	// sample 2
	float3 p2 = p + float3(-1.0, 1.0, -1.0) * eps;
	float d2 = 2.0;
	for (int j2 = 0; j2 < 16; j2++) {
		float fj = float(j2);
		float t = iTime * (frac(fj * 412.531 + 0.513) - 0.5) * 2.0;
		float3 off = sin(t + fj * float3(52.5126, 64.62744, 632.25)) * float3(2.0, 2.0, 0.8);
		float r = lerp(0.5, 1.0, frac(fj * 412.531 + 0.5124));
		float sd = length(p2 + off) - r;
		float k = 0.4;
		float hh = clamp(0.5 + 0.5*(d2 - sd)/k, 0.0, 1.0);
		d2 = lerp(d2, sd, hh) - k*hh*(1.0 - hh);
	}

	// sample 3
	float3 p3 = p + float3(-1.0, -1.0, 1.0) * eps;
	float d3 = 2.0;
	for (int j3 = 0; j3 < 16; j3++) {
		float fj = float(j3);
		float t = iTime * (frac(fj * 412.531 + 0.513) - 0.5) * 2.0;
		float3 off = sin(t + fj * float3(52.5126, 64.62744, 632.25)) * float3(2.0, 2.0, 0.8);
		float r = lerp(0.5, 1.0, frac(fj * 412.531 + 0.5124));
		float sd = length(p3 + off) - r;
		float k = 0.4;
		float hh = clamp(0.5 + 0.5*(d3 - sd)/k, 0.0, 1.0);
		d3 = lerp(d3, sd, hh) - k*hh*(1.0 - hh);
	}

	// sample 4
	float3 p4 = p + float3(1.0, 1.0, 1.0) * eps;
	float d4 = 2.0;
	for (int j4 = 0; j4 < 16; j4++) {
		float fj = float(j4);
		float t = iTime * (frac(fj * 412.531 + 0.513) - 0.5) * 2.0;
		float3 off = sin(t + fj * float3(52.5126, 64.62744, 632.25)) * float3(2.0, 2.0, 0.8);
		float r = lerp(0.5, 1.0, frac(fj * 412.531 + 0.5124));
		float sd = length(p4 + off) - r;
		float k = 0.4;
		float hh = clamp(0.5 + 0.5*(d4 - sd)/k, 0.0, 1.0);
		d4 = lerp(d4, sd, hh) - k*hh*(1.0 - hh);
	}

	float3 normal = normalize( float3(1.0, -1.0, -1.0) * d1 + float3(-1.0, 1.0, -1.0) * d2 + float3(-1.0, -1.0, 1.0) * d3 + float3(1.0, 1.0, 1.0) * d4 );

	float b = max(0.0, dot(normal, float3(0.577, 0.577, 0.577)));
	float3 col = (0.5 + 0.5 * cos((b + iTime * 3.0) + float3(uv.x, uv.y, uv.x) * 2.0 + float3(0,2,4))) * (0.85 + b * 0.35);
	col *= exp( -depth * 0.15 );

	// maximum thickness is 2m in alpha channel
	fragColor = float4(col, 1.0 - (depth - 0.5) / 2.0);