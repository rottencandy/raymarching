import { Camera } from './camera';
import { F32 } from './globals';
import { CTX } from './setup';

import frag from './shaders/raymarch.frag';
import vert from './shaders/raymarch.vert';

const shader = CTX.shader_( vert, frag).use_();
// TODO get aspect from setup
shader.uniform_`aspect`.u1f_(400 / 300);

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
