import { Body, Vec3 } from 'cannon-es';
import { mat4, vec3 } from 'gl-matrix';
import Camera from './engine/cam';
import { Keys } from './engine/input';
import { clamp } from './engine/interpolation';
import { COS, PI, radians, SIN } from './globals';

export type Camera = {
    update_: (dt: number) => void;
    recalculate_: () => void;
    mat_: mat4;
    eye_: vec3;
    lookDir_: vec3;
};

export const FPSCamera = (speed = .01): Camera => {
    const cam = Camera(radians(45), 1, 500, 400 / 300)
        .moveTo_(0, 5, 0);

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

const UP = new Vec3(0, 1, 0);
const MAX_PITCH = PI / 2 - 0.01;

export const FPSCannonCamera = (body: Body, spd: number) => {
    const front = new Vec3(0, 0, 1);
    const side = new Vec3();
    const runInc = 9;
    let pitch = 0, yaw = PI / 2;

    return {
        update_: (_dt: number) => {
            const speed = spd + runInc * (Keys.shift_ as any);
            const fd = Keys.up_ && speed;
            const bk = Keys.down_ && -speed;
            const lt = Keys.left_ && -speed;
            const rt = Keys.right_ && speed;
            const z = fd + bk;
            const x = lt + rt;

            front.cross(UP, side);

            body.velocity.x /= 1.5;
            body.velocity.z /= 1.5;
            // z
            body.velocity.x += front.x * z;
            body.velocity.z += front.z * z;
            // x
            body.velocity.x += side.x * x;
            body.velocity.z += side.z * x;

            if (Keys.pointerLocked_) {
                if (Keys.ptrX_ || Keys.ptrY_) {
                    pitch -= Keys.ptrY_ / 1e3;
                    yaw += Keys.ptrX_ / 1e3;
                    clamp(pitch, -MAX_PITCH, MAX_PITCH);

                    const cosPitch = COS(pitch);
                    front.x = COS(yaw) * cosPitch;
                    front.y = SIN(pitch);
                    front.z = SIN(yaw) * cosPitch;
                    front.normalize();

                    // TODO: do this at the end of the update step
                    Keys.ptrX_ = Keys.ptrY_ = 0;
                }
            }
        },
        pos_: body.position,
        lookDir_: front,
    };
};
