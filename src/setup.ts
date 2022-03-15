import { createGLContext } from './engine/webgl2';
import { getById } from './globals';

const WIDTH = 400, HEIGHT = 300;
export const ASPECT = WIDTH / HEIGHT;
const ctx = createGLContext(getById('c'), WIDTH, HEIGHT);
ctx.resize_();
onresize = ctx.resize_;

export const CTX = ctx;
