 const float arrow_density = 4.5;
    const float arrow_length = 0.45;

    const int iterationTime1 = 20;
    const int iterationTime2 = 20;
    const int vector_field_mode = 0;
    const float scale = 6.0;

    const float velocity_x = 0.1;
    const float velocity_y = 0.2;

    const float mode_2_speed = 2.5;
    const float mode_1_detail = 200.0;
    const float mode_1_twist = 50.0;

    const bool isArraw = true;

    const float3 luma = float3(0.2126, 0.7152, 0.0722);
    float time = iTime;

    // fragCoord and normalized field-space p
    float2 fragCoord = iUV * iResolution;
    float2 p = fragCoord / iResolution - 0.5;
    p.x *= iResolution.x / iResolution.y;
    p *= scale;

    // compute field(p, mode) inlined (we only use vector_mode below)
    int vector_mode = vector_field_mode;
    float2 vel = float2(0.0, 0.0);
    float2 pos = float2(0.0, 0.0);

    // Common temporary variables used by both modes
    if (vector_mode == 0)
    {
        float2 pp = p;
        float2 ep = float2(0.05, 0.0);
        float2 rz = float2(0.0, 0.0);
        for (int i = 0; i < iterationTime1; i++)
        {
            // inline f(pp)
            float t0 = sin(pp.x + sin(pp.y + time * velocity_x)) * sin(pp.y * pp.x * 0.1 + time * velocity_y);
            float t1 = sin((pp.x + ep.x) + sin(pp.y + time * velocity_x)) * sin(pp.y * (pp.x + ep.x) * 0.1 + time * velocity_y);
            float t2 = sin(pp.x + sin((pp.y + ep.x) + time * velocity_x)) * sin((pp.y + ep.x) * pp.x * 0.1 + time * velocity_y);

            float2 g = float2((t1 - t0), (t2 - t0)) / ep.x;
            float2 tt = float2(-g.y, g.x);

            pp += (mode_1_twist * 0.01) * tt + g * (1.0 / mode_1_detail);
            pp.x = pp.x + sin(time * mode_2_speed / 10.0) / 10.0;
            pp.y = pp.y + cos(time * mode_2_speed / 10.0) / 10.0;
            rz = g;
        }
        vel = rz;
    }
    else // vector_mode == 1
    {
        float2 pp = p;
        float2 ep = float2(0.05, 0.0);
        float2 rz = float2(0.0, 0.0);
        for (int i = 0; i < iterationTime1; i++)
        {
            float t0 = sin(pp.x + sin(pp.y + time * velocity_x)) * sin(pp.y * pp.x * 0.1 + time * velocity_y);
            float t1 = sin((pp.x + ep.x) + sin(pp.y + time * velocity_x)) * sin(pp.y * (pp.x + ep.x) * 0.1 + time * velocity_y);
            float t2 = sin(pp.x + sin((pp.y + ep.x) + time * velocity_x)) * sin((pp.y + ep.x) * pp.x * 0.1 + time * velocity_y);

            float2 g = float2((t1 - t0), (t2 - t0)) / ep.x;
            float2 tt = float2(-g.y, g.x);

            pp += (mode_1_twist * 0.01) * tt + g * (1.0 / mode_1_detail);
            pp.x = pp.x + sin(time * mode_2_speed / 10.0) / 10.0;
            pp.y = pp.y + cos(time * mode_2_speed / 10.0) / 10.0;
            rz = g;
        }

        // add curved effect into curved mesh
        for (int i = 1; i < iterationTime2; i++)
        {
            float fi = (float)i;
            pp.x += 0.3 / fi * sin(fi * 3.0 * pp.y + time * mode_2_speed) + 0.5;
            pp.y += 0.3 / fi * cos(fi * 3.0 * pp.x + time * mode_2_speed) + 0.5;
        }
        vel = rz;
        pos = pp;
    }

    // getRGB inlined
    float3 col = float3(0.0, 0.0, 0.0);
    if (vector_mode == 0)
    {
        float2 pv = vel;
        col = float3(pv * 0.5 + 0.5, 1.5);
    }
    else
    {
        float2 pv = pos;
        float r = cos(pv.x + pv.y + 1.0) * 0.5 + 0.5;
        float g = sin(pv.x + pv.y + 1.0) * 0.5 + 0.5;
        float b = (sin(pv.x + pv.y) + cos(pv.x + pv.y)) * 0.3 + 0.5;
        col = float3(r, g, b);
    }

    col *= 0.85;
    fragColor = float4(col, 1.0);