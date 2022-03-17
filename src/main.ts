import { startLoop } from './engine/loop';
import { FPSCamera } from './camera';
import * as raymarchScene from './raymarch-scene';
import { WORLD } from './setup';

const cam = FPSCamera();

startLoop(
    (dt) => {
        cam.update_(dt);
        raymarchScene.update(dt);
        WORLD.fixedStep();
    },
    (dt) => {
        // we don't use the cam matrix, so recalculation isn't needed
        //cam.recalculate_();
        raymarchScene.render(dt, cam);
    }
);
