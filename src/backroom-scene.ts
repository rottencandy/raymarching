import { FPSCamera } from './camera';
import { ASPECT, CTX } from './setup';

import frag from './shaders/backroom.frag';
import vert from './shaders/raymarch.vert';

import noise from './noise.png';
import wall from './wall.png';

const shader = CTX.shader_(vert, frag).use_();
const wallTex = CTX.texture_();
const noiseTex = CTX.texture_();

// cam
const cam = FPSCamera();

export const reset = () => {
    shader.use_();
    shader.uniform_`aspect`.u1f_(ASPECT);
    wallTex.setImage_(wall).setUnit_(shader.uniform_`uWallTex`.loc, 0);
    noiseTex.setImage_(noise).setUnit_(shader.uniform_`uNoiseTex`.loc, 1);
};

export const update = (dt: number) => {
    cam.update_(dt);
};

let time = 0;
export const render = (_dt: number) => {
    shader.uniform_`uTime`.u1f_(time+=.01);
    shader.uniform_`uCamPos`.u3f_(cam.eye_[0], cam.eye_[1], cam.eye_[2]);
    shader.uniform_`uLookDir`.u3f_(cam.lookDir_[0], cam.lookDir_[1], cam.lookDir_[2]);
};
