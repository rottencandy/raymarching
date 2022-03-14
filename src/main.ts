import { startLoop } from './engine/loop';
import { FPSCamera } from './camera';
import { CTX } from './setup';
import * as vertexScene from './vertex-scene';
import * as raymarchScene from './raymarch-scene';

const cam = FPSCamera();

const raymarchTarget = CTX.texture_();
const withTarget = CTX.renderTargetContext_(raymarchTarget);

startLoop(
    (dt) => {
        cam.update_(dt);
        vertexScene.update(dt, cam);
        raymarchScene.update(dt, cam);
    },
    (dt) => {
        cam.recalculate_();
        withTarget(() => vertexScene.render(dt, cam));
        raymarchTarget.bind_();
        raymarchScene.render(dt, cam);
    }
);
