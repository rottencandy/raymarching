#version 300 es
precision lowp float;

in vec3 vRO;
in vec3 vRD;

uniform float iTime;

out vec4 outColor;

#define MAX_STEPS 100
#define MAX_DIST 100.
#define SURF_DIST .01

#define BLINN_PHONG
//#define IMPROVED_SHADOW

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

float RotPlaneSDF(vec3 p, vec3 norm) {
    return dot(p, normalize(norm));
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

float Ground(vec3 p) {
    return AAPlaneSDF(p, 0.); // - sin(p.x / 4.) - cos(p.z / 4.);
}

float GetDist(vec3 p) {
    float sphere = SphereSDF(p - SpherePos.xyz, SpherePos.w);

    float torus = TorusSDF(p - SpherePos.xyz, vec2(1.5, .1));

    //float box = CubeSDF(p - vec3(3., 1., 7.), vec3(1.));

    //float ellipse = sdEllipsoid(p - vec3(-3., 1., 7.), vec3(1.));

    //float plane = AAPlaneSDF(p, 0.);

    float plane = Ground(p);

    float d = min(smin(sphere, torus, .9), plane);
    return d;
}

float RayMarch(vec3 ro, vec3 rd) {
    float dO = 0.;
    for (int i = 0; i < MAX_STEPS; i++) {
        float dS = GetDist(ro + rd * dO);
        dO += dS;
        if (dO > MAX_DIST || abs(dS) < SURF_DIST) break;
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
#ifdef IMPROVED_SHADOW
        float y = h * h / (2. * ph);
        float d = sqrt(h * h - y * y);
        res = min(res, k * h / max(0., t - y));
#else
        res = min(res, k * h / t);
#endif
        t += h;
    }
    return res;
}

float DiffuseLight(vec3 p) {
    vec3 lightDir = normalize(LightPos - p);
    vec3 n = GetNormal(p);

    float dif = max(dot(n, lightDir), 0.);

    // hard shadows
    //float d = RayMarch(p + n * SURF_DIST * 2., lightDir);
    //if (d < length(LightPos - p)) dif *= .2;
    dif *= SoftShadow(p, lightDir, 32.);
    return dif;
}

float BlinnPhongLight(vec3 p, vec3 rd) {
    // constants
    float ambientStr = .01;
    float diffStr = .3;
    float spectacularStr = .4;
    float shininess = 32.;
    // variables
    vec3 lightDir = normalize(LightPos - p);
    vec3 norm = GetNormal(p);

    // ambient
    float ambient = ambientStr;

    // diffuse
    float diff = max(dot(norm, lightDir), 0.);
    float diffuse = (diff * diffStr);

    // spectacular

#ifdef BLINN_PHONG
    // blinn-phong
    vec3 halfwayDir = normalize(lightDir - rd);
    float spec = pow(max(dot(norm, halfwayDir), 0.), 16.);
#else
    // normal phong
    vec3 reflectDir = reflect(-lightDir, norm);
    float spec = pow(max(dot(rd, reflectDir), 0.), 8.);
#endif

    float spectacular = (spec * spectacularStr);

    float light = ambient + diffuse + spectacular;

    // hard shadows
    //float d = RayMarch(p + norm * SURF_DIST * 2., lightDir);
    //if (d < length(LightPos - p)) light *= .2;
    light *= SoftShadow(p, lightDir, 32.);

    return light;
}

vec3 fog(vec3 col, float t) {
    vec3 ext = exp2(-t * 0.005 * vec3(1, 1.5, 2));
    return col * ext + (1.0 - ext) * vec3(0.55, 0.55, 0.58); // 0.55
}


void main() {
    float d = RayMarch(vRO, vRD);

    vec3 p = vRO + vRD * d;

    float dif = BlinnPhongLight(p, vRD);
    vec3 col = vec3(dif);

    col = fog(col, d);

    // gamma correction
    col = pow(col, vec3(1.0 / 2.2));

    outColor = vec4(col, 1.);
    //outColor = texture(uTex, vUV);
}
