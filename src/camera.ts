import { mat4, vec3 } from 'gl-matrix';
import Camera from './engine/cam';
import { Keys } from './engine/input';
import { radians } from './globals';

export type Camera = {
    update_: (dt: number) => void;
    recalculate_: () => void;
    mat_: mat4;
    eye_: vec3;
    lookDir_: vec3;
};

export const FPSCamera = (speed = .01): Camera => {
    const cam = Camera(radians(45), 1, 500, 400 / 300)
        .moveTo_(0, 2, 0);

    return {
        update_: (dt: number) => {
            const spd = speed * dt;
            const fd = Keys.up_ && spd;
            const bk = Keys.down_ && -spd;
            const lt = Keys.left_ && spd;
            const rt = Keys.right_ && -spd;
            cam.move_(lt + rt, 0, fd + bk);

            if (Keys.pointerLocked_) {
                cam.rotate_(Keys.ptrY_ / 1e3, Keys.ptrX_ / 1e3);
                // TODO: do this at the end of the update step
                Keys.ptrX_ = Keys.ptrY_ = 0;
            }
        },
        recalculate_: cam.recalculate_,
        mat_: cam.matrix_,
        eye_: cam.eye_,
        lookDir_: cam.lookDir_,
    };
};
