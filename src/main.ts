import { startLoop } from './engine/loop';
import { update, render } from './scene';

startLoop(update, render);
