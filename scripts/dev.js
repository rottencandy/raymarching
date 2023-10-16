import { context } from 'esbuild';
import { glsl } from 'esbuild-plugin-glsl';

const ctx = await context({
    entryPoints: ['src/main.ts', 'src/app.css'],
    bundle: true,
    sourcemap: 'inline',
    charset: 'utf8',
    target: 'es6',
    format: 'iife',
    outdir: 'app',
    loader: { '.png': 'dataurl' },
    // loader: { '.png': 'dataurl', '.frag': 'text', '.vert': 'text' },
    plugins: [glsl()]
});
await ctx.watch();
const { host, port } = await ctx.serve({ servedir: 'app' });
console.log(`Serving: http://${host}:${port}`);

process.on('SIGINT', async () => {
    await ctx.dispose();
    process.exit();
});
