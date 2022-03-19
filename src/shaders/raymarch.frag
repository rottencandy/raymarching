#version 300 es
precision lowp float;

in vec3 vRO;
in vec3 vRD;
in vec2 vUV;

uniform float iTime;
uniform vec3 uSpherePos;

uniform vec3 uBox1Pos;
uniform vec3 uBox2Pos;
uniform vec3 uBox3Pos;
uniform vec3 uBox4Pos;
//uniform vec3 uBox5Pos;
uniform vec4 uBox1Quat;
uniform vec4 uBox2Quat;
uniform vec4 uBox3Quat;
uniform vec4 uBox4Quat;
uniform vec4 uBox5Quat;

uniform sampler2D uFloorTex;
uniform sampler2D uBallTex;
uniform sampler2D uNoiseTex;

out vec4 outColor;

#define MAX_STEPS 256
#define MAX_DIST 256.
#define SURF_DIST .01

#define BLINN_PHONG
#define IMPROVED_SHADOW

#define SKY_ID    0
#define SPHERE_ID 1
#define PLANE_ID  2
#define ROOM_ID   3
#define BOX_ID    4

// w is size of sphere
const vec3 SpotLightPos1 = vec3(5., 32., -50.);
const vec3 SpotLightPos2 = vec3(-5., 32., -50.);
const vec3 OppSpotLightPos = vec3(-5., 32., 50.);
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

float Ground(vec3 p) {
    return AAPlaneSDF(p, 0.);
}

float Room(vec3 p) {
    float room = OpOnion(CubeSDF(p, vec3(70, 50, 50)), .5);

    vec3 q = OpRep(p, vec3(26., 0., 0.));
    q.z = abs(q.z);
    vec3 winP = vec3(q - vec3(0, 32, 50));
    float window = CubeSDF(winP, vec3(8., 10., 2.));

    q.x += 13.5;
    float pillars = OpSubtraction(
        CubeSDF(q, vec3(2.1, 48., 48.)),
        CubeSDF(q, vec3(2., 49., 49.))
    );

    vec3 barP = p;
    barP.z = abs(barP.z);
    barP.xy *= Rot(1.5708);
    barP.x += 32.;
    barP.z -= 50.;
    float bars = CylinderSDF(barP, vec3(.1));

    float area = OpSubtraction(window, min(room, pillars));
    return min(area, bars);
}

vec2 GetInteriorDist(vec3 p) {
    float plane = Ground(p);
    // TODO: rotate sphere
    float sphere = SphereSDF(p - uSpherePos, 1.);
    float box1 = CubeSDF(RotateVector(uBox1Quat, p - uBox1Pos), vec3(2));
    float box2 = CubeSDF(RotateVector(uBox2Quat, p - uBox2Pos), vec3(2));
    float box3 = CubeSDF(RotateVector(uBox3Quat, p - uBox3Pos), vec3(2));
    float box4 = CubeSDF(RotateVector(uBox4Quat, p - uBox4Pos), vec3(2));
    //float box5 = CubeSDF(RotateVector(uBox5Quat, p - uBox5Pos), vec3(2));

    float d = 0.;
    int id = 0;
    if (plane < sphere) {
        d = plane;
        id = PLANE_ID;
    } else {
        d = sphere;
        id = SPHERE_ID;
    }
    if (box1 < d) {
        d = box1;
        id = BOX_ID;
    }
    if (box2 < d) {
        d = box2;
        id = BOX_ID;
    }
    if (box3 < d) {
        d = box3;
        id = BOX_ID;
    }
    if (box4 < d) {
        d = box4;
        id = BOX_ID;
    }
    //if (box5 < d) {
    //    d = box5;
    //    id = BOX_ID;
    //}
    return vec2(d, id);
}

vec2 GetDist(vec3 p) {
    vec2 ray = GetInteriorDist(p);
    float room = Room(p);
    float d = ray.x;
    int id = int(ray.y);

    if (room < d) {
        d = room;
        id = ROOM_ID;
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
    vec2 e = vec2(.01, .0);

    vec3 n = GetDist(p).x - vec3(
        GetDist(p - e.xyy).x,
        GetDist(p - e.yxy).x,
        GetDist(p - e.yyx).x
    );
    vec3 norm = normalize(n);

    return norm;
}

float InteriorSoftShadow(vec3 ro, vec3 rd, float k) {
    float res = 1.;
    float ph = 1e20;
    for(float t = .01; t < MAX_DIST; ) {
        float h = GetInteriorDist(ro + rd * t).x;
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
    float ambientStr = .1;
    float diffStr = .4;
    float spectacularStr = .6;

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
    vec3 ext = exp2(-t * 0.005 * vec3(.2));
    return col * ext + (1.0 - ext) * .1; // 0.55
}

vec3 SkyColor() {
    vec2 p = vRD.xz - vec2(.0, .5 + vRD.y);
    float sun = .08 / length(vRD.xz - vec2(.3, .1 + vRD.y));
    return mix(vec3(.3, .5, .7), vec3(.9, .9, .8), sun);
}

vec3 GroundColor(vec3 p) {
    return texture(uFloorTex, p.xz / 64.).rgb * vec3(.4, .3, .2);
}

vec3 NoiseTex(vec3 p, vec3 n) {
    vec3 texXZ = texture(uNoiseTex, p.xz).rgb;
    vec3 texXY = texture(uNoiseTex, p.xy).rgb;
    vec3 texYZ = texture(uNoiseTex, p.yz).rgb;
    return texXZ * n.y + texXY * n.z + texYZ * n.x;
}

vec3 CubeTex(vec3 p, vec3 n, sampler2D tex) {
    vec3 texXZ = texture(tex, p.xz).rgb;
    vec3 texXY = texture(tex, p.xy).rgb;
    vec3 texYZ = texture(tex, p.yz).rgb;
    // sn /= sn.x + sn.y + sn.z;
    return texXZ * n.y + texXY * n.z + texYZ * n.x;
}

vec3 Material(float id, vec3 p, float light, vec3 n) {
    switch(int(id)) {
        case SKY_ID:
            return SkyColor();

        case PLANE_ID:
            return GroundColor(p) * light;

        case SPHERE_ID:
            // convert to local space
            vec3 sp = p - uSpherePos;
            vec3 sn = abs(n * n * n);
            // sn /= sn.x + sn.y + sn.z;
            vec3 stex = CubeTex(sp, sn, uBallTex);
            return stex * light;

        case BOX_ID:
            return vec3(.8, .4, .1) * CubeTex(p / 2., n, uNoiseTex) * light;

        case ROOM_ID:
            vec3 col = p.y > 12. ? vec3(.9, .94, .7) : vec3(.2, .3, .2);
            vec3 tex = CubeTex(p, n, uNoiseTex);
            return col * tex * light;

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

    vec3 spotLightDir1 = normalize(SpotLightPos1 - p);
    vec3 spotLightDir2 = normalize(SpotLightPos2 - p);
    vec3 oppSpotLightDir = normalize(OppSpotLightPos - p);

    vec3 norm = GetNormal(p, id);
    float sunlight = BlinnPhongLight(norm, vRD, SunlightDir);
    float spotlight1 = BlinnPhongLight(norm, vRD, spotLightDir1) * 4.;
    float spotlight2 = BlinnPhongLight(norm, vRD, spotLightDir2) * 4.;
    float oppSpotLight = BlinnPhongLight(norm, vRD, oppSpotLightDir) * 2.;
    float spotlight = spotlight1 + spotlight2 + oppSpotLight;
    float light = max(sunlight, spotlight);

    light *= HardShadow(p, norm, SunlightDir);
    light *= max(.8, InteriorSoftShadow(p, vec3(spotLightDir1), 3.));

    vec3 col = Material(id, p, light, norm);

    col = fog(col, dist);

    // gamma correction
    col = pow(col, vec3(1.0 / 2.2));

    outColor = vec4(col, 1.);
}
// vim: fdm=marker:fdl=0:
