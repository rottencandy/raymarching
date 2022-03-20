#version 300 es
precision lowp float;

in vec3 vRO;
in vec3 vRD;
in vec2 vUV;

uniform sampler2D uWallTex;
uniform sampler2D uNoiseTex;
uniform float uTime;

out vec4 outColor;

#define MAX_STEPS 512
#define MAX_DIST 256.
#define SURF_DIST .001

#define BLINN_PHONG
#define IMPROVED_SHADOW

#define SKY_ID   0
#define FLOOR_ID 1
#define WALL_ID  2
#define CEIL_ID  3
#define LIGHT_ID 4

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

vec3 GetRepPos(vec3 p) {
    return OpRep(p, vec3(90, 0, 70));
}

vec2 Room(vec3 p) {
    float floor = AAPlaneSDF(p, 0.);
    float ceil = -AAPlaneSDF(p, 10.);
    float light = CubeSDF(GetRepPos(p - vec3(0, 11.8, 0)), vec3(2));

    vec2 d = vec2(0);
    if (floor < ceil) {
        d = vec2(floor, FLOOR_ID);
    } else {
        d = vec2(ceil, CEIL_ID);
    }
    if (light < d.x) {
        d = vec2(light, LIGHT_ID);
    }
    return d;
}

vec2 Walls(vec3 p) {
    float wall1 = CubeSDF(p, vec3(30, 10, 1));
    float wall2 = CubeSDF(p + vec3(-10, 0, -9), vec3(1, 10, 10));
    float wall3 = CubeSDF(p + vec3(-19, 0, -19), vec3(10, 10, 1));
    float wall4 = CubeSDF(p + vec3(10, 0, 0), vec3(1, 10, 25));
    return vec2(min(min(min(wall1, wall2), wall3), wall4), WALL_ID);
}

vec2 GetDist(vec3 p) {
    vec2 plane = Room(p);
    vec2 walls = Walls(GetRepPos(p - vec3(0, 0, 10)));

    vec2 dist = vec2(0, SKY_ID);
    if (walls.x < plane.x) {
        dist = walls;
    } else {
        dist = plane;
    }
    return dist;
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

float InteriorSoftShadow(vec3 ro, vec3 rd, float k) {
    float res = 1.;
    float ph = 1e20;
    for(float t = .01; t < MAX_DIST; ) {
        float h = Walls(ro + rd * t).x;
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
    float ambientStr = .6;
    float diffStr = .5;
    float spectacularStr = .1;

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
    vec3 ext = exp2(-t * 0.005 * vec3(.19, .13, .04));
    return col * ext + (1.0 - ext) * 2.; // * 0.55;
}

vec3 SkyColor() {
    return vec3(.1, .1, .01);
}

vec3 CubeTex(vec3 p, vec3 n, sampler2D tex) {
    vec3 texXZ = texture(tex, p.xz).rgb;
    vec3 texXY = texture(tex, p.xy).rgb;
    vec3 texYZ = texture(tex, p.yz).rgb;
    // sn /= sn.x + sn.y + sn.z;
    return texXZ * n.y + texXY * n.z + texYZ * n.x;
}

float texNoise(vec2 p) {
	float s = texture(uNoiseTex,vec2(1.,2.*cos(uTime))*uTime*8. + p*1.).x;
	s *= s;
	return s;
}
float ramp(float y, float start, float end) {
	float inside = step(start,y) - step(end,y);
	float fact = (y-start)/(end-start)*inside;
	return (1.-fact) * inside;
}
float stripes(vec2 uv) {
	float noi = texNoise(uv*vec2(0.5,1.) + vec2(1.,3.));
	return ramp(mod(uv.y*4. + uTime/2.+sin(uTime + sin(uTime*0.63)),1.),0.5,0.6)*noi;
}
vec2 screenDistort(vec2 uv) {
	uv -= vec2(.5,.5);
	uv = uv*1.2*(1./1.2+2.*uv.x*uv.x*uv.y*uv.y);
	uv += vec2(.5,.5);
	return uv;
}

vec3 Material(float id, vec3 p, float light, vec3 n) {
    switch(int(id)) {
        case SKY_ID:
            return SkyColor();

        case FLOOR_ID:
            return vec3(.8, .75, .37) * CubeTex(p, vec3(0, 1, 0), uNoiseTex) * light;

        case CEIL_ID:
            return vec3(.85, .8, .42) * light;

        case WALL_ID:
            return vec3(.7, .6, .1) * CubeTex(p / 2., n, uWallTex) * light;

        case LIGHT_ID:
            return vec3(1.);

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

    vec3 lightDir = normalize(GetRepPos(vec3(0, 11.5, 0) - p));

    float light = BlinnPhongLight(norm, vRD, lightDir);

    //light *= InteriorSoftShadow(p, lightDir, 16.);

    vec3 col = Material(id, p, light, norm);

    col = fog(col, dist);

    // gamma correction
    col = pow(col, vec3(1.0 / 2.2));

    // VHS effect
    // Source: https://www.shadertoy.com/view/ldjGzV
    vec2 distortUV = screenDistort(vUV * .5 + .5);
    col += stripes(distortUV);
    col += texNoise(distortUV + uTime) / 2.;
    col *= (12.+mod(distortUV.y*30.+uTime,1.))/13.;

    outColor = vec4(col, 1.);
}

// vim: fdm=marker:fdl=0:
