import { startLoop } from './engine/loop';
import * as raymarchScene from './raymarch-scene';
import { WORLD } from './setup';

startLoop(
    (dt) => {
        raymarchScene.update(dt);
        WORLD.fixedStep();
    },
    (dt) => {
        // we don't use the cam matrix, so recalculation isn't needed
        //cam.recalculate_();
        raymarchScene.render(dt);
    }
);
