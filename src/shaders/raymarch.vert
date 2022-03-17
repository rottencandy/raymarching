#version 300 es
precision lowp float;

layout(location=0)in vec2 aPos;

uniform float aspect, uTime;
uniform vec3 uLookDir, uCamPos;

out vec3 vRO;
out vec3 vRD;
out vec2 vUV;

// TODO: get this from cam
const float FOV = 45.0;
const vec3 UP = vec3(0., 1., 0.);

// rotate a vector by a quaternion
// https://twistedpairdevelopment.wordpress.com/2013/02/11/rotating-a-vector-by-a-quaternion-in-glsl/
vec3 RotateVector(vec4 quat, vec3 vec) {
return vec + 2.0 * cross(cross(vec, quat.xyz) + quat.w * vec, quat.xyz);
}

void main() {
    // aPos is [-1, 1]
    gl_Position = vec4(aPos, 0., 1.);

    // handle for aspect stretching, scale to FOV
    vec3 offsets = vec3(vec2(aPos.x * aspect, aPos.y) * tan(radians(FOV) / 2.), 1.);

    // compute the 3 orthogonal unit vectors
    vec3 rayFront = uLookDir;
    vec3 rayRight = normalize(cross(rayFront, UP));
    vec3 rayUp = cross(rayRight, rayFront);

    vec3 rayDir = rayFront + rayRight * offsets.x + rayUp * offsets.y;

    vRD = normalize(rayDir);
    vRO = uCamPos;
    vUV = aPos;
}
