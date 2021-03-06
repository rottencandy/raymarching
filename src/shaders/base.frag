#version 300 es
precision lowp float;

in vec3 vRO;
in vec3 vRD;
in vec2 vUV;

out vec4 outColor;

#define MAX_STEPS 512
#define MAX_DIST 256.
#define SURF_DIST .001

#define BLINN_PHONG
#define IMPROVED_SHADOW

#define SKY_ID   0
#define FLOOR_ID 1
#define SPHERE_ID 2

const vec3 SunlightDir = normalize(vec3(0.8, 1.5, 3.5));

// Utils {{{

float smin(float a, float b, float k) {
    float h = clamp(.5 + .5 * (b - a) / k, 0., 1.);
    return mix(b, a, h) - k * h * (1. - h);
}

float lerp(float a, float b, float f) { return a + f * (b - a); }

#define NUM_OCTAVES 3
float rand(vec2 n){
	return fract(sin(dot(n, vec2(12.9898, 4.1414))) * 43758.5453);
}
float noise(vec2 p){
    vec2 ip = floor(p);
    vec2 u = fract(p);
    u = u*u*(3.0-2.0*u);
    float res = mix(
        mix(rand(ip),rand(ip+vec2(1.0,0.0)),u.x),
        mix(rand(ip+vec2(0.0,1.0)),rand(ip+vec2(1.0,1.0)),u.x),u.y);
    return res*res;
}

// https://github.com/yiwenl/glsl-fbm
float fbm(vec2 x) {
	float v = 0.0;
	float a = 0.5;
	vec2 shift = vec2(100);
	// Rotate to reduce axial bias
    mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.50));
	for (int i = 0; i < NUM_OCTAVES; ++i) {
		v += a * noise(x);
		x = rot * x * 2.0 + shift;
		a *= 0.5;
	}
	return v;
}

// rotate a vector by a quaternion
// https://twistedpairdevelopment.wordpress.com/2013/02/11/rotating-a-vector-by-a-quaternion-in-glsl/
vec3 RotateVector(vec4 quat, vec3 vec) {
    return vec + 2.0 * cross(cross(vec, quat.xyz) + quat.w * vec, quat.xyz);
}

// }}}

// Primitives {{{

float SphereSDF(vec3 p, float r) {
    return length(p) - r;
}

float AAPlaneSDF(vec3 p, float height) {
    return p.y - height;
}

float CylinderSDF(vec3 p, vec3 c) {
    return length(p.xz - c.xy) - c.z;
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

float CubeSDF(vec3 p, vec3 b) {
    vec3 q = abs(p) - b;
    return length(max(q,0.0)) + min(max(q.x,max(q.y,q.z)),0.0);
}

// }}}

// Operations {{{

mat2 Rot(float a) {
    float s = sin(a);
    float c = cos(a);
    return mat2(c, -s, s, c);
}

float OpOnion(in float sdf, in float thickness) { return abs(sdf)-thickness; }

float OpUnion( float d1, float d2 ) { return min(d1,d2); }

float OpSubtraction( float d1, float d2 ) { return max(-d1,d2); }

float OpIntersection( float d1, float d2 ) { return max(d1,d2); }

vec3 OpRep(vec3 p, vec3 gap) { return mod(p + .6 * gap, gap) - .6 * gap; }

vec3 OpMove(vec3 p, vec3 x) { return p + x; }

// }}}

// Scene {{{

float Floor(vec3 p) {
    return AAPlaneSDF(p, 0.);
}

vec2 GetDist(vec3 p) {
    vec3 spherePos = p - vec3(0, 2, 0);
    float sphere = SphereSDF(spherePos, 2.);
    float plane = Floor(p);

    float d = 0.;
    int id = SKY_ID;
    if (sphere < plane) {
        d = sphere;
        id = SPHERE_ID;
    } else {
        d = plane;
        id = FLOOR_ID;
    }
    return vec2(d, id);
}

// }}}

// Raymarching {{{

vec2 RayMarch(vec3 ro, vec3 rd, int maxIter) {
    float dO = 0.;
    float id = 0.;
    for (int i = 0; i < MAX_STEPS; i++) {
        vec2 dist = GetDist(ro + rd * dO);
        float dS = dist.x;
        id = dist.y;
        dO += dS;
        if (dO > MAX_DIST) {
            return vec2(MAX_DIST, SKY_ID);
        }
        if (i > maxIter || abs(dS) < SURF_DIST) {
            return vec2(dO, dist.y);
        }
    }
    return vec2(dO, id);
}

vec3 GetNormal(vec3 p, float id) {
    vec2 e = vec2(SURF_DIST, .0);

    vec3 n = GetDist(p).x - vec3(
        GetDist(p - e.xyy).x,
        GetDist(p - e.yxy).x,
        GetDist(p - e.yyx).x
    );
    vec3 norm = normalize(n);

    return norm;
}

float SoftShadow(vec3 ro, vec3 rd, float k) {
    float res = 1.;
    float ph = 1e20;
    for(float t = .01; t < MAX_DIST; ) {
        float h = GetDist(ro + rd * t).x;
        if (h < .001)
            return .1;
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

float HardShadow(vec3 p, vec3 norm, vec3 lightDir) {
    float sdist = RayMarch(p + norm * SURF_DIST * 2., lightDir, 128).x;
    return sdist < MAX_DIST ? .2 : 1.;
}

float DiffuseLight(vec3 n, vec3 p, vec3 lightDir) {
    float dif = max(dot(n, lightDir), 0.);

    return dif;
}

float BlinnPhongLight(vec3 norm, vec3 rd, vec3 lightDir) {
    // constants
    float ambientStr = .3;
    float diffStr = .6;
    float spectacularStr = .7;

    // ambient
    float ambient = ambientStr;

    // diffuse
    float diff = max(dot(norm, lightDir), 0.);
    float diffuse = (diff * diffStr);

    // spectacular

#ifdef BLINN_PHONG
    // blinn-phong
    vec3 halfwayDir = normalize(lightDir - rd);
    float spec = pow(max(dot(norm, halfwayDir), 0.), 32.);
#else
    // normal phong
    vec3 reflectDir = reflect(-lightDir, norm);
    float spec = pow(max(dot(rd, reflectDir), 0.), 16.);
#endif

    float spectacular = (spec * spectacularStr);

    float light = ambient + diffuse + spectacular;

    return light;
}

// }}}

// Materials {{{

vec3 fog(vec3 col, float t) {
    vec3 ext = exp2(-t * 0.005 * vec3(.2, .4, .6));
    return col * ext + (1.0 - ext) * .2; // * 0.55;
}

// Source: https://www.shadertoy.com/view/XdcBW4
vec3 GetSky(vec3 ld){
    vec3 rd = vRD;

    // Sky color gradients.
    vec3 col = vec3(.8, .7, .5), col2 = vec3(.4, .6, .9);

    //return mix(col, col2, pow(max(rd.y*.5 + .9, 0.), 5.));  // Probably a little too simplistic. :)

    // Mix the gradients using the Y value of the unit direction ray.
    vec3 sky = mix(col, col2, pow(max(rd.y + .15, 0.), .5));
    sky *= vec3(.7, 1, 1.3)*vec3(1.2, 1, .9); // Adding some extra vibrancy.

     // Subtle, fake sky curvature.
    rd.z *= 1. + length(rd.xy)*.15;
    rd = normalize(rd);

    // A simple way to place some clouds on a distant plane above the terrain -- Based on something IQ uses.
    const float SC = 1e5;
    float t = (SC - .15)/(rd.y + .15); // Trace out to a distant XZ plane.
    vec2 uv = (t*rd).xz; // UV coordinates.

    // Mix the sky with the clouds, whilst fading out a little toward the horizon (The rd.y bit).
	if(t>0.) sky =  mix(sky, vec3(2), smoothstep(.45, 1., fbm(1.5*uv/SC))*
                        smoothstep(.45, .55, rd.y*.5 + .5)*.4);

    // Return the sky color.
    return sky;
}

vec3 Material(float id, vec3 p, float light, vec3 n) {
    switch(int(id)) {
        case SKY_ID:
            return GetSky(SunlightDir);

        case FLOOR_ID:
            return vec3(.6) * light;

        case SPHERE_ID:
            return vec3(.7, .2, .1) * light;

        default:
            return vec3(light);
    }
}

// }}}


void main() {
    vec2 ray = RayMarch(vRO, vRD, MAX_STEPS);
    float dist = ray.x;
    float id = ray.y;

    vec3 p = vRO + vRD * dist;

    vec3 norm = GetNormal(p, id);

    float light = BlinnPhongLight(norm, vRD, SunlightDir);

    light *= SoftShadow(p, SunlightDir, 16.);

    vec3 col = Material(id, p, light, norm);

    col = fog(col, dist);

    // gamma correction
    col = pow(col, vec3(1.0 / 2.2));

    outColor = vec4(col, 1.);
}

// vim: fdm=marker:fdl=0:
