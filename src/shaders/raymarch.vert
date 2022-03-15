#version 300 es
precision lowp float;

layout(location=0)in vec2 aPos;

uniform float aspect;

out vec3 vRD;

// TODO: get this from cam
const float FOV = 45.0;

void main() {
    // aPos is [-1, 1]
    gl_Position = vec4(aPos, 0., 1.);
    // fix for aspect stretching, set FOV, and normalize to vec3
    vRD = normalize(vec3(vec2(aPos.x * aspect, aPos.y) * radians(FOV) / 2., 1.));
}
