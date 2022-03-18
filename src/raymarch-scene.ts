import { Body, Plane, Sphere } from 'cannon-es';
import { FPSCannonCamera } from './camera';
import { F32, PI } from './globals';
import { ASPECT, CTX, WORLD } from './setup';

import frag from './shaders/raymarch.frag';
import vert from './shaders/raymarch.vert';

import img from './floor.png';

const shader = CTX.shader_(vert, frag).use_();
shader.uniform_`aspect`.u1f_(ASPECT);

const planeCoords = F32([
    -1,  1,
    -1, -1,
     1, -1,
     1,  1,
]);

const { vao_, draw_ } = CTX.createMesh_(
    [ planeCoords, [0, 1, 2, 0, 2, 3] ],
    [[0, 2]]
);

CTX.texture_()
    .setImage_(img)
    .setUnit_(shader.uniform_`uFloorTex`.loc, 0);

WORLD.bodies.forEach(b => WORLD.removeBody(b));

// ground
const ground = new Body({ mass: 0 });
ground.addShape(new Plane());
ground.quaternion.setFromEuler(-PI / 2, 0, 0);
WORLD.addBody(ground);

// sphere
const sphere = new Body({ mass: 10, shape: new Sphere(1) });
sphere.position.set(0, 20, 20);
const sPos = sphere.position;
// bounce
//sphere.addEventListener('collide', () => sphere.velocity.negate());
WORLD.addBody(sphere);

// cam
const player = new Body({ mass: 20, shape: new Sphere(5) });
player.position.set(0, 20, 0);
WORLD.addBody(player);
const cam = FPSCannonCamera(player);

export const update = (dt: number) => {
    cam.update_(dt);
    // we don't use the cam matrix, so recalculation isn't needed
    //cam.recalculate_();
};

//let time = 0;
export const render = (_dt: number) => {
    CTX.clear_();
    vao_.bind_();
    shader.use_();
    shader.uniform_`uCamPos`.u3f_(cam.pos_.x, cam.pos_.y, cam.pos_.z);
    shader.uniform_`uLookDir`.u3f_(cam.lookDir_.x, cam.lookDir_.y, cam.lookDir_.z);
    //shader.uniform_`uTime`.u1f_(time += 1e-3);
    shader.uniform_`uSpherePos`.u3f_(sPos.x, sPos.y, sPos.z);
    draw_();
};
