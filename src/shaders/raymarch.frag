#version 300 es
precision lowp float;

in vec3 vRO;
in vec3 vRD;

out vec4 outColor;

#define MAX_STEPS 100
#define MAX_DIST 100.
#define SURF_DIST .01

// w is size of sphere
const vec4 SpherePos = vec4(0., 1., 10., 1.);
const vec3 LightPos = vec3(2., 5., 0.);

float SphereSDF(vec3 p, vec4 pos) {
    return length(p - pos.xyz) - pos.w;
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

float TorusSDF(vec3 p, vec3 pos, vec2 r) {
    vec3 position = p - pos;
    float x = length(position.xz) - r.x;
    return length(vec2(x, position.y)) - r.y;
}

float CubeSDF(vec3 p, vec3 pos, vec3 s) {
    return length(max(abs(p - pos) - s, 0.));
}

float sdEllipsoid( vec3 p, vec3 pos, vec3 r ) {
    vec3 po = p - pos;
    float k0 = length(po / r);
    float k1 = length(po / (r * r));
    return k0 * (k0 - 1.0) / k1;
}

float GetDist(vec3 p) {
    float sphere = SphereSDF(p, SpherePos);
    float plane = AAPlaneSDF(p, 0.);
    float torus = TorusSDF(p, SpherePos.xyz, vec2(1.5, .1));
    float box = CubeSDF(p, vec3(3., 1., 7.), vec3(1.));
    float ellipse = sdEllipsoid(p, vec3(-3., 1., 7.), vec3(1.));

    float d = min(min(min(min(box, ellipse), sphere), torus), plane);
    return d;
}

float RayMarch(vec3 ro, vec3 rd) {
    float dO = 0.;
    for (int i = 0; i < MAX_STEPS; i++) {
        vec3 p = ro + dO * rd;
        float dS = GetDist(p);
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

float GetLight(vec3 p) {
    vec3 l = normalize(LightPos - p);
    vec3 n = GetNormal(p);

    float dif = clamp(dot(n, l), 0., 1.);

    // compute shadows
    float d = RayMarch(p + n * SURF_DIST * 2., l);
    if (d < length(LightPos - p)) dif *= .1;
    return dif;
}


void main() {
    float d = RayMarch(vRO, vRD);

    vec3 p = vRO + vRD * d;

    float dif = GetLight(p);
    vec3 col = vec3(dif);
    outColor = vec4(col, 1.);
}
