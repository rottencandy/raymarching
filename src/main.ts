import { startLoop } from './engine/loop';
import { FPSCamera } from './camera';
import * as raymarchScene from './raymarch-scene';

const cam = FPSCamera();

startLoop(
    (dt) => {
        cam.update_(dt);
        raymarchScene.update(dt, cam);
    },
    (dt) => {
        cam.recalculate_();
        raymarchScene.render(dt, cam);
    }
);
