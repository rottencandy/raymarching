#version 300 es
precision lowp float;

layout(location=0)in vec2 aPos;

uniform float aspect, uTime;
uniform vec3 uLookDir, uCamPos;

out vec3 vRO;
out vec3 vRD;

// TODO: get this from cam
const float FOV = 45.0;
const vec3 UP = vec3(0., 1., 0.);

void main() {
    // aPos is [-1, 1]
    gl_Position = vec4(aPos, 0., 1.);

    // handle for aspect stretching, scale to FOV
    vec3 offsets = vec3(vec2(aPos.x * aspect, aPos.y) * tan(radians(FOV) / 2.), 1.);

    // compute the 3 orthogonal unit vectors
    vec3 rayFront = uLookDir;
    vec3 rayRight = normalize(cross(rayFront, UP));
    vec3 rayUp = cross(rayRight, rayFront);

    // TODO: can all this be moved to CPU?
    vec3 rayDir = rayFront + rayRight * offsets.x + rayUp * offsets.y;

    vRD = normalize(rayDir);
    vRO = uCamPos;
}
