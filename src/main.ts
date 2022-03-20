import { createDropdown } from './debug';
import { startLoop } from './engine/loop';
import { F32 } from './globals';
import { CTX, WORLD } from './setup';

import * as baseScene from './base-scene';
import * as backroomScene from './backroom-scene';
import * as spheresScene from './spheres-scene';
import * as indoorScene from './raymarch-scene';
import * as reflectScene from './reflection-scene';

createDropdown('Resolution: ', ['426x240', '640x360', '854x480', '1280x720', '1920x1080'], (val) => {
    const [width, height] = val.split('x').map(v => Number(v));
    CTX.changeSize_(width, height);
})

let activeScene = baseScene;
activeScene.reset();

createDropdown('Scene: ', ['Base', 'Spheres', 'Backrooms', 'Reflect', 'Indoor'], (val) => {
    switch(val) {
        case 'Base':
            activeScene = baseScene;
            break;
        case 'Spheres':
            activeScene = spheresScene;
            break;
        case 'Backrooms':
            activeScene = backroomScene;
            break;
        case 'Indoor':
            activeScene = indoorScene;
            break;
        case 'Desert':
            activeScene = reflectScene;
            break;
    }
    activeScene.reset();
})

const planeCoords = F32([
    -1,  1,
    -1, -1,
     1, -1,
     1,  1,
]);

const { vao_, draw_ } = CTX.createMesh_(
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
        vao_.bind_();
        activeScene.render(dt);
        draw_();
    }
);
