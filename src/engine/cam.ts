import { COS, PI, SIN } from '../globals';
import { mat4, vec3 } from 'gl-matrix';

type CamState = {
    /**
     * Move camera along XYZ
     */
    move_: (x: number, y: number, z: number) => CamState;
    /**
     * Rotate camera (radians)
     */
    rotate_: (pitch: number, yaw: number) => CamState;
    /**
     * Move camera to absolute point XYZ
     */
    moveTo_: (x: number, y: number, z: number) => CamState;
    /**
     * Change target focus point
     * @deprecated not yet implemented
     */
    lookAt_: (x: number, y: number, z: number) => CamState;
    /**
     * recalculate transform matrix
     */
    recalculate_: () => CamState;
    /**
     * view-projection matrix
     */
    eye_: vec3;
    matrix_: mat4;
    viewMatrix_: mat4;
    projectionMatrix_: mat4;
};

const MAX_PITCH = PI / 2 - 0.01;
/**
 * Create webgl camera
 */
const Camera = (fov: number, zNear: number, zFar: number, aspect: number): CamState => {
    const projectionMat = mat4.perspective(mat4.create(), fov, aspect, zNear, zFar);
    const viewMat = mat4.create();

    const pos = vec3.create();
    const up = vec3.fromValues(0, 1, 0);
    const front = vec3.fromValues(0, 0, -1);
    // make cam initially point to z=-1
    let yaw = -PI / 2,
        pitch = 0;

    // temporary cached variables
    const t_move = vec3.create();
    const t_side = vec3.create();
    const t_dir = vec3.create();
    const t_view = mat4.create();
    const t_target = vec3.create();

    const thisObj: CamState = {
        move_(x, _y, z) {
            // TODO: handle y movement
            if (z) {
                vec3.scale(t_move, front, z);
                vec3.add(pos, pos, t_move);
            }
            if (x) {
                vec3.cross(t_side, up, front);
                vec3.normalize(t_side, t_side);
                vec3.scale(t_move, t_side, x);
                vec3.add(pos, pos, t_move);
            }
            return thisObj;
        },
        rotate_(ptch, yw) {
            pitch -= ptch;
            yaw += yw;
            if (pitch > MAX_PITCH)
                pitch = MAX_PITCH;
            if (pitch < -MAX_PITCH)
                pitch = -MAX_PITCH;

            const cosPitch = COS(pitch);
            t_dir[0] = COS(yaw) * cosPitch;
            t_dir[1] = SIN(pitch);
            t_dir[2] = SIN(yaw) * cosPitch;
            vec3.normalize(front, t_dir);
            return thisObj;
        },
        moveTo_(x, y, z) {
            vec3.set(pos, x, y, z);
            return thisObj;
        },
        // TODO
        lookAt_(_x, _y, _z) {
            //V3set(target, x, y, z);
            return thisObj;
        },
        recalculate_() {
            mat4.lookAt(t_view, pos, vec3.add(t_target, pos, front), up);
            mat4.multiply(thisObj.matrix_, projectionMat, t_view);
            return thisObj;
        },
        matrix_: mat4.clone(projectionMat),
        viewMatrix_: viewMat,
        projectionMatrix_: projectionMat,
        eye_: pos,
    };

    return thisObj;
};

export default Camera;
