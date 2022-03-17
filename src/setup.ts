import { World } from 'cannon-es';
import { createGLContext } from './engine/webgl2';
import { getById } from './globals';

const WIDTH = 400, HEIGHT = 300;
export const ASPECT = WIDTH / HEIGHT;
const ctx = createGLContext(getById('c'), WIDTH, HEIGHT);
ctx.resize_();
onresize = ctx.resize_;

export const CTX = ctx;

export const WORLD = new World();
WORLD.gravity.set(0, -9.82, 0); // m/s^2
