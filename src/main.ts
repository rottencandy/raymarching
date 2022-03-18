import { startLoop } from './engine/loop';
import * as raymarchScene from './raymarch-scene';
import { WORLD } from './setup';

raymarchScene.init();

startLoop(
    (dt) => {
        raymarchScene.update(dt);
        WORLD.fixedStep();
    },
    (dt) => {
        raymarchScene.render(dt);
    }
);
