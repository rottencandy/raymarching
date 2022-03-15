#version 300 es
precision lowp float;

in vec2 vTex;
in vec2 vFragCoord;

uniform sampler2D uTex;

out vec4 outColor;

#define MAX_STEPS 100
#define MAX_DIST 100.
#define SURF_DIST .01

float SphereSDF(vec3 p, vec4 pos) {
    return length(p - pos.xyz) - pos.w;
}

float GetDist(vec3 p) {
    float sphere = SphereSDF(p, vec4(0., 1., 6., 1.));
    float planeDist = p.y;
    // float d = min(sphere, planeDist);
    // return d;
    return sphere;
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
    vec3 lightPos = vec3(0., 5., 6.);
    vec3 l = normalize(lightPos - p);
    vec3 n = GetNormal(p);

    float dif = clamp(dot(n, l), 0., 1.);
    float d = RayMarch(p + n*SURF_DIST*2., l);
    if (d < length(lightPos - p)) dif *= .1;
    return dif;
}


void main() {
    outColor = texture(uTex, vTex);

    vec3 ro = vec3(0., 1., 0.);
    vec3 rd = normalize(vec3(vFragCoord, 1.));
    float d = RayMarch(ro, rd);

    vec3 col = vec3(0.);
    if (d < MAX_DIST) {
        vec3 p = ro + rd * d;
        float dif = GetLight(p);
        col = vec3(dif);
        outColor.rgb = col;
    }
}
