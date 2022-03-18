import { startLoop } from './engine/loop';
import { F32 } from './globals';
import * as raymarchScene from './raymarch-scene';
import { CTX, WORLD } from './setup';

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

raymarchScene.reset();

startLoop(
    (dt) => {
        raymarchScene.update(dt);
        WORLD.fixedStep();
    },
    (dt) => {
        CTX.clear_();
        vao_.bind_();
        raymarchScene.render(dt);
        draw_();
    }
);
