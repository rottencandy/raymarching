import { Camera } from './camera';
import { F32 } from './globals';
import { ASPECT, CTX } from './setup';

import frag from './shaders/raymarch.frag';
import vert from './shaders/raymarch.vert';

const shader = CTX.shader_(vert, frag).use_();
shader.uniform_`aspect`.u1f_(ASPECT);

const planeCoords = F32([
    -1,  1,
    -1, -1,
     1, -1,
     1,  1,
]);

const { vao_, draw_ } = CTX.createMesh_(
    [
        planeCoords,
        [0, 1, 2, 0, 2, 3]
    ],
    [[0, 2]]
);

export const update = (_dt: number, _cam: Camera) => {};

export const render = (_dt: number, _cam: Camera) => {
    CTX.clear_();
    vao_.bind_();
    shader.use_();
    draw_();
};
