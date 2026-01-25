const float PI = 3.141592653589793;
    const float TWO_PI = 6.283185307179586;
    const int SCOPE = 2; // controls sampling radius

    float3 c1 = float3(1.0, 1.0, 1.0);
    float3 c2 = float3(0.1, 0.1, 0.1);
    float3 c3 = float3(1.0, 1.0, 1.0);
    float3 c4 = float3(0.5, 0.6, 0.7);
	float2 fragCoord = iUV * iResolution.xy;

	// viewport
	float2 r = iResolution.xy;
	float2 uv = (fragCoord * 2.0 - r) / min(r.x, r.y);

	// scalar noise for time t
	float t0 = iTime / 16.0;
	// inline scalar noise
	float xi = floor(t0);
	float xf = frac(t0);
	float a_rand = frac(sin(xi) * 43758.5453123);
	float b_rand = frac(sin(xi + 1.0) * 43758.5453123);
	float noise_t = lerp(a_rand, b_rand, smoothstep(0.0, 1.0, xf));
	t0 += noise_t;

	// inline 'cosine' approximation used in original
	float ycos = cos(frac(t0) * PI);
	float cosine_t = floor(t0) + 0.5 - (0.5 * pow(abs(ycos), 1.0 / 2.0) * sign(ycos));
	t0 += cosine_t;

	uv *= 2.5;
	float2 uvf = frac(uv) - 0.5;
	float2 uvi = floor(uv);

	// compute two 2D noise values for n2
	// noise at (uv + t0) with seed 0
	{
		float2 p = uv + t0;
		float2 pi = floor(p);
		float2 pf = frac(p);
		float bl = frac(sin(dot(pi, float2(12.9898, 78.233)) + 0.0) * 43758.5453123);
		float br = frac(sin(dot(pi + float2(1.0, 0.0), float2(12.9898, 78.233)) + 0.0) * 43758.5453123);
		float tl = frac(sin(dot(pi + float2(0.0, 1.0), float2(12.9898, 78.233)) + 0.0) * 43758.5453123);
		float tr = frac(sin(dot(pi + float2(1.0, 1.0), float2(12.9898, 78.233)) + 0.0) * 43758.5453123);
		float2 w = smoothstep(float2(0.0, 0.0), float2(1.0, 1.0), pf);
		float t = lerp(tl, tr, w.x);
		float b = lerp(bl, br, w.x);
		float n0 = lerp(b, t, w.y);

		// noise at (uv - t0) with seed 1
		float2 p2 = uv - t0;
		float2 pi2 = floor(p2);
		float2 pf2 = frac(p2);
		float bl2 = frac(sin(dot(pi2, float2(12.9898, 78.233)) + 1.0) * 43758.5453123);
		float br2 = frac(sin(dot(pi2 + float2(1.0, 0.0), float2(12.9898, 78.233)) + 1.0) * 43758.5453123);
		float tl2 = frac(sin(dot(pi2 + float2(0.0, 1.0), float2(12.9898, 78.233)) + 1.0) * 43758.5453123);
		float tr2 = frac(sin(dot(pi2 + float2(1.0, 1.0), float2(12.9898, 78.233)) + 1.0) * 43758.5453123);
		float2 w2 = smoothstep(float2(0.0, 0.0), float2(1.0, 1.0), pf2);
		float t_ = lerp(tl2, tr2, w2.x);
		float b_ = lerp(bl2, br2, w2.x);
		float n1 = lerp(b_, t_, w2.y);

		float2 n2 = (float2(n0, n1) - 0.5) * float(SCOPE);
		uvi += n2;
	}

	float3 col = float3(0.0, 0.0, 0.0);

	for (int ii = -SCOPE; ii <= SCOPE; ii++) {
		for (int jj = -SCOPE; jj <= SCOPE; jj++) {
			float2 off = float2(float(ii), float(jj));

			// noise at (uvi - off + t0*2.0)
			float2 p = uvi - off + t0 * 2.0;
			float2 pi = floor(p);
			float2 pf = frac(p);
			float bl = frac(sin(dot(pi, float2(12.9898, 78.233))) * 43758.5453123);
			float br = frac(sin(dot(pi + float2(1.0, 0.0), float2(12.9898, 78.233))) * 43758.5453123);
			float tl = frac(sin(dot(pi + float2(0.0, 1.0), float2(12.9898, 78.233))) * 43758.5453123);
			float tr = frac(sin(dot(pi + float2(1.0, 1.0), float2(12.9898, 78.233))) * 43758.5453123);
			float2 w = smoothstep(float2(0.0, 0.0), float2(1.0, 1.0), pf);
			float tval = lerp(tl, tr, w.x);
			float bval = lerp(bl, br, w.x);
			float n = lerp(bval, tval, w.y) * 4.0;

			float s = exp2(n);
			float dist = length(uvf + off + (uvi - floor(uv))); // use local jitter
			float d = 0.025 / max(dist, 1e-5) / s;

			float dplus = d + uvi.x + uvi.y;
			float3 grad = c1 + c2 * cos(TWO_PI * (c3 * dplus + c4));
			col = max(col, grad * sqrt(max(d, 0.0)));
		}
	}

	fragColor = float4(col, 1.0);