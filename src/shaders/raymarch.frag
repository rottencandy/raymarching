#version 300 es
precision lowp float;

in vec3 vRO;
in vec3 vRD;

uniform float iTime;

out vec4 outColor;

#define MAX_STEPS 100
#define MAX_DIST 100.
#define SURF_DIST .01

// w is size of sphere
const vec4 SpherePos = vec4(0., 1., 10., 1.);
const vec3 LightPos = vec3(2., 5., 0.);

mat2 Rot(float a) {
    float s = sin(a);
    float c = cos(a);
    return mat2(c, -s, s, c);
}

float smin(float a, float b, float k) {
    float h = clamp(.5 + .5 * (b - a) / k, 0., 1.);
    return mix(b, a, h) - k * h * (1. - h);
}

float lerp(float a, float b, float f) {
    return a + f * (b - a);
}

float SphereSDF(vec3 p, float r) {
    return length(p) - r;
}

float AAPlaneSDF(vec3 p, float height) {
    return p.y - height;
}

float CapsuleSDF(vec3 p, vec3 a, vec3 b, float r) {
    vec3 ab = b - a;
    vec3 ap = p - a;
    float t = dot(ab, ap) / dot(ab, ab);
    t = clamp(t, 0., 1.);

    vec3 c = a + t * ab;
    return length(p - c) - r;
}

float TorusSDF(vec3 p, vec2 r) {
    float x = length(p.xz) - r.x;
    return length(vec2(x, p.y)) - r.y;
}

float CubeSDF(vec3 p, vec3 s) {
    return length(max(abs(p) - s, 0.));
}

float sdEllipsoid(vec3 p, vec3 r ) {
    float k0 = length(p / r);
    float k1 = length(p / (r * r));
    return k0 * (k0 - 1.0) / k1;
}

float GetDist(vec3 p) {
    float sphere = SphereSDF(p - SpherePos.xyz, SpherePos.w);

    float torus = TorusSDF(p - SpherePos.xyz, vec2(1.5, .1));

    float box = CubeSDF(p - vec3(3., 1., 7.), vec3(1.));

    float ellipse = sdEllipsoid(p - vec3(-3., 1., 7.), vec3(1.));

    float plane = AAPlaneSDF(p, 0.);

    float d = min(min(min(smin(sphere, torus, .9), box), ellipse), plane);
    return d;
}

float RayMarch(vec3 ro, vec3 rd) {
    float dO = 0.;
    for (int i = 0; i < MAX_STEPS; i++) {
        float dS = GetDist(ro + rd * dO);
        dO += dS;
        if (dO > MAX_DIST || dS < SURF_DIST) break;
    }
    return dO;
}

vec3 GetNormal(vec3 p) {
    vec2 e = vec2(.01, .0);

    vec3 n = GetDist(p) - vec3(
        GetDist(p - e.xyy),
        GetDist(p - e.yxy),
        GetDist(p - e.yyx)
    );

    return normalize(n);
}

float SoftShadow(vec3 ro, vec3 rd, float k) {
    float res = 1.;
    float ph = 1e20;
    for(float t = .01; t < MAX_DIST; ) {
        float h = GetDist(ro + rd * t);
        if (h < .001)
            return 0.;
        // improved method
        //float y = h * h / (2. * ph);
        //float d = sqrt(h * h - y * y);
        //res = min(res, k * h / max(0., t - y));
        res = min(res, k * h / t);
        t += h;
    }
    return res;
}

float GetLight(vec3 p) {
    vec3 lightDir = normalize(LightPos - p);
    vec3 n = GetNormal(p);

    float dif = clamp(dot(n, lightDir), 0., 1.);

    // hard shadows
    //float d = RayMarch(p + n * SURF_DIST * 2., lightDir);
    //if (d < length(LightPos - p)) dif *= .2;
    dif *= SoftShadow(p, lightDir, 32.);
    return dif;
}


void main() {
    float d = RayMarch(vRO, vRD);

    vec3 p = vRO + vRD * d;

    float dif = GetLight(p);
    vec3 col = vec3(dif);

    // fog
    //col *= exp(-.0005 * t * t * t);

    outColor = vec4(col, 1.);
}
