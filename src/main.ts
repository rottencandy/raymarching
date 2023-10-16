import { createDropdown } from './debug';
import { startLoop } from './engine/loop';
import { F32 } from './globals';
import { CTX, WORLD } from './setup';

import * as baseScene from './base-scene';
import * as backroomScene from './backroom-scene';
import * as spheresScene from './spheres-scene';
import * as indoorScene from './raymarch-scene';
import * as reflectScene from './reflection-scene';
import * as reflect2Scene from './reflection-2-scene';

createDropdown('Resolution: ', ['426x240', '640x360', '854x480', '1280x720', '1920x1080'], (val) => {
    const [width, height] = val.split('x').map(v => Number(v));
    CTX.changeSize_(width, height);
})

let activeScene = baseScene;
activeScene.reset();

const scenes = {
    Base: baseScene,
    Spheres: spheresScene,
    Backrooms: backroomScene,
    Indoor: indoorScene,
    Reflect: reflectScene,
    Reflect2: reflect2Scene,
};

createDropdown('Scene: ', Object.keys(scenes), (val) => {
    activeScene = scenes[val];
    activeScene.reset();
})

const planeCoords = F32([
    -1,  1,
    -1, -1,
     1, -1,
     1,  1,
]);

const { draw_ } = CTX.createMesh_(
    [ planeCoords, [0, 1, 2, 0, 2, 3] ],
    [[0, 2]],
);

startLoop(
    (dt) => {
        activeScene.update(dt);
        WORLD.fixedStep();
    },
    (dt) => {
        CTX.clear_();
        activeScene.render(dt);
        draw_();
    }
);
