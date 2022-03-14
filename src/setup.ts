import { createGLContext } from './engine/webgl2';
import { getById } from './globals';

const ctx = createGLContext(getById('c'));
ctx.resize_();
onresize = ctx.resize_;

export const CTX = ctx;
