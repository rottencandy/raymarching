#version 300 es
precision lowp float;

layout(location=0)in vec2 aPos;
layout(location=1)in vec2 aTex;

uniform float aspect;

out vec2 vTex;
out vec2 vFragCoord;

void main() {
    gl_Position = vec4(aPos, 0., 1.);
    vTex = aTex;
    vFragCoord = vec2(aPos.x * aspect, aPos.y);
}
