import { Body, Box, ContactMaterial, Material, Plane, Sphere, Vec3 } from 'cannon-es';
import { Keys } from './engine/input';
import { FPSCannonCamera } from './camera';
import { PI } from './globals';
import { ASPECT, CTX, WORLD } from './setup';

import frag from './shaders/raymarch.frag';
import vert from './shaders/raymarch.vert';

import floor from './floor.png';
import noise from './noise.png';
import ball from './ball.png';

const shader = CTX.shader_(vert, frag).use_();
const floorTex = CTX.texture_();
const noiseTex = CTX.texture_();
const ballTex = CTX.texture_();

// cam
const player = new Body({ mass: 900, shape: new Sphere(5) });
const pPos = player.position;
const cam = FPSCannonCamera(player, 6);

// physics material
const ballMat = new Material('ball');
const balConMat = new ContactMaterial(ballMat, ballMat, { friction: 1.9, restitution: 0.8 });

// ground
const ground = new Body({ mass: 0, material: ballMat }).addShape(new Plane());
ground.quaternion.setFromEuler(-PI / 2, 0, 0);
const roof = new Body({ mass: 0 }).addShape(new Plane());
roof.quaternion.setFromEuler(PI / 2, 0, 0);
roof.position.set(0, 50, 0);

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

// sphere
const sphere = new Body({ mass: 200, shape: new Sphere(1), material: ballMat });
const sPos = sphere.position;
let sphereHeld = false;
sphere.addEventListener('collide', (e) => {
    if (!sphereHeld && e.body.index === player.index) {
        sphereHeld = true;
    }
});

// objects
const box1 = new Body({ mass: 200, shape: new Box(new Vec3(2, 2, 2)) });
const box2 = new Body({ mass: 200, shape: new Box(new Vec3(2, 2, 2)) });
const box3 = new Body({ mass: 200, shape: new Box(new Vec3(2, 2, 2)) });
const box4 = new Body({ mass: 200, shape: new Box(new Vec3(2, 2, 2)) });
//const box5 = new Body({ mass: 200, shape: new Box(new Vec3(2, 2, 2)) });


export const reset = () => {
    shader.use_();
    shader.uniform_`aspect`.u1f_(ASPECT);
    // TODO: texture size proportional to load time(and resets bind point after load)
    floorTex.setImage_(floor).setUnit_(shader.uniform_`uFloorTex`.loc, 0);
    ballTex.setImage_(ball).setUnit_(shader.uniform_`uBallTex`.loc, 1);
    noiseTex.setImage_(noise).setUnit_(shader.uniform_`uNoiseTex`.loc, 3);

    WORLD.bodies.forEach(b => WORLD.removeBody(b));
    WORLD.addContactMaterial(balConMat);

    WORLD.addBody(ground);
    WORLD.addBody(roof);
    WORLD.addBody(planeXM);
    WORLD.addBody(planeXP);
    WORLD.addBody(planeZM);
    WORLD.addBody(planeZP);

    sphere.position.set(0, 20, 20);
    WORLD.addBody(sphere);

    player.position.set(-10, 7, -10);
    WORLD.addBody(player);

    box1.position.set(10, 10, 10)
    box2.position.set(15, 10, 11)
    box3.position.set(20, 10, 12)
    box4.position.set(12, 20, 11)
    //box5.position.set(17, 20, 10)
    WORLD.addBody(box1);
    WORLD.addBody(box2);
    WORLD.addBody(box3);
    WORLD.addBody(box4);
    //WORLD.addBody(box5);
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

    if (sphereHeld) {
        sPos.set(
            player.position.x + cam.lookDir_.x * 10.,
            player.position.y - 1.,
            player.position.z + cam.lookDir_.z * 10.,
        );

        if (Keys.clicked_) {
            // set
            sphere.velocity.set(
                cam.lookDir_.x * 90.,
                cam.lookDir_.y * 90.,
                cam.lookDir_.z * 90.
            );
            sphereHeld = false;
        }
    }
};

//let time = 0;
export const render = (_dt: number) => {
    shader.uniform_`uCamPos`.u3f_(pPos.x, pPos.y, pPos.z);
    shader.uniform_`uLookDir`.u3f_(cam.lookDir_.x, cam.lookDir_.y, cam.lookDir_.z);
    //shader.uniform_`uTime`.u1f_(time += 1e-3);

    shader.uniform_`uSpherePos`.u3f_(sPos.x, sPos.y, sPos.z);

    shader.uniform_`uBox1Pos`.u3f_(box1.position.x, box1.position.y, box1.position.z);
    shader.uniform_`uBox2Pos`.u3f_(box2.position.x, box2.position.y, box2.position.z);
    shader.uniform_`uBox3Pos`.u3f_(box3.position.x, box3.position.y, box3.position.z);
    shader.uniform_`uBox4Pos`.u3f_(box4.position.x, box4.position.y, box4.position.z);
    //shader.uniform_`uBox5Pos`.u3f_(box5.position.x, box5.position.y, box5.position.z);
    shader.uniform_`uBox1Quat`.u4f_(box1.quaternion.x, box1.quaternion.y, box1.quaternion.z, box1.quaternion.w);
    shader.uniform_`uBox2Quat`.u4f_(box2.quaternion.x, box2.quaternion.y, box2.quaternion.z, box2.quaternion.w);
    shader.uniform_`uBox3Quat`.u4f_(box3.quaternion.x, box3.quaternion.y, box3.quaternion.z, box3.quaternion.w);
    shader.uniform_`uBox4Quat`.u4f_(box4.quaternion.x, box4.quaternion.y, box4.quaternion.z, box4.quaternion.w);
    //shader.uniform_`uBox5Quat`.u4f_(box5.quaternion.x, box5.quaternion.y, box5.quaternion.z, box5.quaternion.w);
};
