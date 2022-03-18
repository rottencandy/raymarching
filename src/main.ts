import { startLoop } from './engine/loop';
import * as raymarchScene from './raymarch-scene';
import { WORLD } from './setup';

startLoop(
    (dt) => {
        raymarchScene.update(dt);
        WORLD.fixedStep();
    },
    (dt) => {
        raymarchScene.render(dt);
    }
);
