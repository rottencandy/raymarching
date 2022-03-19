import { Body, ContactMaterial, Material, Plane, Sphere } from 'cannon-es';
import { FPSCannonCamera } from './camera';
import { PI } from './globals';
import { ASPECT, CTX, WORLD } from './setup';

import frag from './shaders/raymarch.frag';
import vert from './shaders/raymarch.vert';

import floor from './floor.png';
import noise from './noise.png';
import ball from './ball.png';
import { Keys } from './engine/input';

const shader = CTX.shader_(vert, frag).use_();
const floorTex = CTX.texture_();
const noiseTex = CTX.texture_();
const ballTex = CTX.texture_();

// cam
const player = new Body({ mass: 200, shape: new Sphere(5) });
const pPos = player.position;
const cam = FPSCannonCamera(player, 6);

const ballMat = new Material('ball');
const balConMat = new ContactMaterial(ballMat, ballMat, {friction: 0.9, restitution: 1.0});

const ground = new Body({ mass: 0, material: ballMat }).addShape(new Plane());
ground.quaternion.setFromEuler(-PI / 2, 0, 0);
const planeXM = new Body({ mass: 0, material: ballMat }).addShape(new Plane());
planeXM.quaternion.setFromEuler(0, PI / 2, 0);
planeXM.position.set(-70, 0, 0);
const planeXP = new Body({ mass: 0, material: ballMat }).addShape(new Plane());
planeXP.quaternion.setFromEuler(0, -PI / 2, 0);
planeXP.position.set(70, 0, 0);
const planeZM = new Body({ mass: 0, material: ballMat }).addShape(new Plane());
planeZM.quaternion.setFromEuler(0, 0, 0);
planeZM.position.set(0, 0, -50);
const planeZP = new Body({ mass: 0, material: ballMat }).addShape(new Plane());
planeZP.quaternion.setFromEuler(0, PI, 0);
planeZP.position.set(0, 0, 50);

const sphere = new Body({ mass: 200, shape: new Sphere(1), material: ballMat });
const sPos = sphere.position;


export const reset = () => {
    shader.uniform_`aspect`.u1f_(ASPECT);
    shader.use_();
    // TODO: texture size proportional to load time(and resets bind point after load)
    floorTex.setImage_(floor).setUnit_(shader.uniform_`uFloorTex`.loc, 0);
    ballTex.setImage_(ball).setUnit_(shader.uniform_`uBallTex`.loc, 1);
    noiseTex.setImage_(noise).setUnit_(shader.uniform_`uNoiseTex`.loc, 2);

    WORLD.bodies.forEach(b => WORLD.removeBody(b));
    WORLD.addContactMaterial(balConMat);

    WORLD.addBody(ground);
    WORLD.addBody(planeXM);
    WORLD.addBody(planeXP);
    WORLD.addBody(planeZM);
    WORLD.addBody(planeZP);

    sphere.position.set(0, 20, 20);
    WORLD.addBody(sphere);

    player.position.set(0, 10, 0);
    WORLD.addBody(player);
};

export const update = (dt: number) => {
    cam.update_(dt);
    // we don't use the cam matrix, so recalculation isn't needed
    //cam.recalculate_();

    // NOTE: checking for player ground contact using hardcoded position
    // will break if player height / ground pos is changed
    if (Keys.space_ && player.position.y < 5) {
        player.velocity.y = 24;
    }
};

//let time = 0;
export const render = (_dt: number) => {
    shader.uniform_`uCamPos`.u3f_(pPos.x, pPos.y, pPos.z);
    shader.uniform_`uLookDir`.u3f_(cam.lookDir_.x, cam.lookDir_.y, cam.lookDir_.z);
    //shader.uniform_`uTime`.u1f_(time += 1e-3);
    shader.uniform_`uSpherePos`.u3f_(sPos.x, sPos.y, sPos.z);
};
