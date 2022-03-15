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

let time = 0;
export const render = (_dt: number, cam: Camera) => {
    CTX.clear_();
    vao_.bind_();
    shader.use_();
    shader.uniform_`uCamPos`.u3f_(cam.eye_[0], cam.eye_[1], cam.eye_[2]);
    shader.uniform_`uLookDir`.u3f_(cam.lookDir_[0], cam.lookDir_[1], cam.lookDir_[2]);
    shader.uniform_`uTime`.u1f_(time += 1e-3);
    draw_();
};
