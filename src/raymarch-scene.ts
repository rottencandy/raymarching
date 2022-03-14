import { Camera } from './camera';
import { F32 } from './globals';
import { CTX } from './setup';

const frag = `#version 300 es
precision lowp float;
in vec2 vTex;
uniform sampler2D uTex;
out vec4 outColor;

void main() {
    outColor = texture(uTex, vTex);
}
`;

const shader = CTX.shader_(
    `#version 300 es
    precision lowp float;
    layout(location=0)in vec2 aPos;
    layout(location=1)in vec2 aTex;
    out vec2 vTex;

    void main() {
        gl_Position = vec4(aPos, 0., 1.);
        vTex = aTex;
    }`,
    frag,
).use_();

const planeCoords = F32([
    -1,  1,
    -1, -1,
     1, -1,
     1,  1,
]);

const planeTexCoords = F32([
    0, 1,
    0, 0,
    1, 0,
    1, 1,
]);

const { vao_, draw_ } = CTX.createMesh_(
    [
        planeCoords,
        [0, 1, 2, 0, 2, 3]
    ],
    [[0, 2]]
);

// aTex
CTX.buffer_().bind_().setData_(planeTexCoords);
vao_.setPtr_(1, 2);

export const update = (_dt: number, _cam: Camera) => {};

export const render = (_dt: number, _cam: Camera) => {
    CTX.clear_();
    vao_.bind_();
    shader.use_();
    draw_();
};
