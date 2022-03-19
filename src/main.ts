import { createDropdown } from './debug';
import { startLoop } from './engine/loop';
import { F32 } from './globals';
import * as baseScene from './base-scene';
import * as indoorScene from './raymarch-scene';
import { CTX, WORLD } from './setup';

createDropdown('Resolution: ', ['426x240', '640x360', '854x480', '1280x720', '1920x1080'], (val) => {
    const [width, height] = val.split('x').map(v => Number(v));
    CTX.changeSize_(width, height);
})

let activeScene = baseScene;
activeScene.reset();

createDropdown('Scene: ', ['Base', 'Indoor'], (val) => {
    switch(val) {
        case 'Base':
            activeScene = baseScene;
            break;
        case 'Indoor':
            activeScene = indoorScene;
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
