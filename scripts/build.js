import { build } from 'esbuild';
import { glsl } from 'esbuild-plugin-glsl';

build({
    entryPoints: ['src/main.ts', 'src/app.css'],
    bundle: true,
    minify: true,
    charset: 'utf8',
    target: 'es6',
    format: 'iife',
    outdir: 'app',
    mangleProps: /_$/,
    loader: { '.png': 'dataurl' },
    plugins: [glsl({ minify: true })],
}).catch(() => process.exit(1))
