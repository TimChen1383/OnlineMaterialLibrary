	float2 fragCoord = iUV * iResolution.xy;
	float2 r = iResolution.xy;
	float t = iTime;

	float3 c = float3(0.0, 0.0, 0.0);
	float l = 0.0;
	float z = t;

	for (int i = 0; i < 3; i++) {
		float2 p = fragCoord.xy / r;
		float2 uv = p;
		p -= 0.5;
		p.x *= r.x / r.y;
		z += 0.07;
		l = max(length(p), 1e-6);
		uv += (p / l) * (sin(z) + 1.0) * abs(sin(l * 9.0 - z - z));
		float val = 0.01 / length(frac(uv) - 0.5);
		if (i == 0) c.x = val;
		else if (i == 1) c.y = val;
		else c.z = val;
	}

	fragColor = float4(c / l, t);