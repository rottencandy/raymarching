import { FPSCamera } from './camera';
import { ASPECT, CTX } from './setup';

import frag from './shaders/base.frag';
import vert from './shaders/raymarch.vert';

const shader = CTX.shader_(vert, frag).use_();

// cam
const cam = FPSCamera();

export const reset = () => {
    shader.use_();
    shader.uniform_`aspect`.u1f_(ASPECT);
};

export const update = (dt: number) => {
    cam.update_(dt);
};

//let time = 0;
export const render = (_dt: number) => {
    shader.uniform_`uCamPos`.u3f_(cam.eye_[0], cam.eye_[1], cam.eye_[2]);
    shader.uniform_`uLookDir`.u3f_(cam.lookDir_[0], cam.lookDir_[1], cam.lookDir_[2]);
};
