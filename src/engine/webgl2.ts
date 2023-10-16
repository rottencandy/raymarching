import {
    GL_ARRAY_BUFFER,
    GL_BLEND,
    GL_CLAMP_TO_EDGE,
    GL_COLOR_ATTACHMENT0,
    GL_COLOR_BUFFER_BIT,
    GL_CULL_FACE,
    GL_DEPTH_ATTACHMENT,
    GL_DEPTH_BUFFER_BIT,
    GL_DEPTH_COMPONENT,
    GL_DEPTH_COMPONENT24,
    GL_DEPTH_TEST,
    GL_ELEMENT_ARRAY_BUFFER,
    GL_FLOAT,
    GL_FRAGMENT_SHADER,
    GL_FRAMEBUFFER,
    GL_LEQUAL,
    GL_LINEAR,
    GL_LINK_STATUS,
    GL_NEAREST,
    GL_ONE_MINUS_SRC_ALPHA,
    GL_R8,
    GL_RED,
    GL_RGBA,
    GL_SRC_ALPHA,
    GL_STATIC_DRAW,
    GL_TEXTURE0,
    GL_TEXTURE_2D,
    GL_TEXTURE_MAG_FILTER,
    GL_TEXTURE_MIN_FILTER,
    GL_TEXTURE_WRAP_S,
    GL_TEXTURE_WRAP_T,
    GL_TRIANGLES,
    GL_UNPACK_ALIGNMENT,
    GL_UNSIGNED_BYTE,
    GL_UNSIGNED_INT,
    GL_UNSIGNED_SHORT,
    GL_VERTEX_SHADER,
} from './gl-constants';
import { deviceScaleRatio, getById } from '../globals';
import { setupKeyListener } from './input';

const clearFn = (gl: WebGL2RenderingContext) => () => {
    gl.clearColor(.1, .1, .1, 1.);
    gl.clear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);
};

const createShader = (gl: WebGL2RenderingContext, type: number, source: string) => {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    return shader;
};

const uniformSetterFns = (gl: WebGL2RenderingContext, prg: WebGLProgram) => (name: TemplateStringsArray) => {
    const loc = gl.getUniformLocation(prg, name as unknown as string);

    return {
        loc,
        u1f_: (x: number) => gl.uniform1f(loc, x),
        u2f_: (x: number, y: number) => gl.uniform2f(loc, x, y),
        u3f_: (x: number, y: number, z: number) => gl.uniform3f(loc, x, y, z),
        u4f_: (x: number, y: number, z: number, w: number) => gl.uniform4f(loc, x, y, z, w),
        m3fv_: (data: Float32List, transpose = false) => gl.uniformMatrix3fv(loc, transpose, data),
        m4fv_: (data: Iterable<number>, transpose = false) => gl.uniformMatrix4fv(loc, transpose, data),
        u1i_: (x: number) => gl.uniform1i(loc, x),
    };
};

type ShaderState = {
    prg_: WebGLProgram;
    use_: () => ShaderState;
    // TODO:
    uniform_: ReturnType<typeof uniformSetterFns>;
    /** @deprecated only for extreme cases, try to use `layout(location=n)` in shader */
    attribLoc_: (name: TemplateStringsArray) => number;
};

const createShaderFns = (gl: WebGL2RenderingContext) => (vSource: string, fSource: string): ShaderState => {
    const prg = gl.createProgram();
    gl.attachShader(prg, createShader(gl, GL_VERTEX_SHADER, vSource));
    gl.attachShader(prg, createShader(gl, GL_FRAGMENT_SHADER, fSource));
    gl.linkProgram(prg);

    if (!gl.getProgramParameter(prg, GL_LINK_STATUS)) {
        alert('Program Link failed: ' + gl.getProgramInfoLog(prg));
        //console.error('vs log: ', gl.getShaderInfoLog(vShader));
        //console.error('fs log: ', gl.getShaderInfoLog(fShader));
        //throw new Error;
    }

    const thisObj: ShaderState = {
        prg_: prg,
        uniform_: uniformSetterFns(gl, prg),
        use_() { gl.useProgram(prg); return thisObj; },
        attribLoc_: (name) => gl.getAttribLocation(prg, name as unknown as string),
    };

    return thisObj;
};

type VAOState = {
    vao_: WebGLVertexArrayObject;
    bind_: () => VAOState;
    setPtr_: (loc: number, size: number, stride?: number, offset?: number, type?: number, normalize?: boolean) => VAOState;
};

const createVAOFns = (gl: WebGL2RenderingContext) => (): VAOState => {
    const vao = gl.createVertexArray();
    const thisObj: VAOState = {
        vao_: vao,
        bind_() {
            gl.bindVertexArray(vao);
            return thisObj;
        },
        setPtr_(loc, size, stride = 0, offset = 0, type = GL_FLOAT, normalize = false) {
            gl.enableVertexAttribArray(loc);
            gl.vertexAttribPointer(loc, size, type, normalize, stride, offset);
            return thisObj;
        },
    };
    return thisObj;
};

type BufferState = {
    buf_: WebGLBuffer;
    bind_: () => BufferState;
    setData_: (data: BufferSource) => BufferState;
};

const createBufferFns = (gl: WebGL2RenderingContext) => (target = GL_ARRAY_BUFFER, mode = GL_STATIC_DRAW): BufferState => {
    const buf = gl.createBuffer();
    const thisObj: BufferState = {
        buf_: buf,
        bind_() { gl.bindBuffer(target, buf); return thisObj; },
        setData_(data) { gl.bufferData(target, data, mode); return thisObj; },
    };
    return thisObj;
};

type TextureState = {
    tex_: WebGLTexture;
    bind_: () => TextureState;
    setImage_: (imgSrc: string) => TextureState;
    setFilter_: (type?: number) => TextureState;
    setWrap_: (type?: number) => TextureState;
    setTexData_: (data: ArrayBufferView, level?: number, internalFormat?: number, width?: number, height?: number, border?: number, format?: number, type?: number, alignment?: number) => TextureState;
    /**
     * Only needed when using multiple textures in a single program
     */
    setUnit_: (loc: WebGLUniformLocation, unit: number) => TextureState;
};


const createTextureFns = (gl: WebGL2RenderingContext) => (target = GL_TEXTURE_2D) => {
    const tex = gl.createTexture();
    const setParam = (key: number, val: number) => gl.texParameteri(target, key, val);
    const thisObj: TextureState = {
        tex_: tex,
        bind_() { gl.bindTexture(target, tex); return thisObj; },
        setFilter_(type = GL_NEAREST) {
            setParam(GL_TEXTURE_MIN_FILTER, type);
            setParam(GL_TEXTURE_MAG_FILTER, type);
            return thisObj;
        },
        setWrap_(type = GL_CLAMP_TO_EDGE) {
            setParam(GL_TEXTURE_WRAP_S, type);
            setParam(GL_TEXTURE_WRAP_T, type);
            return thisObj;
        },
        // TODO: Turn this into async
        setImage_(imgSrc) {
            const img = new Image;
            img.src = imgSrc;
            img.onload = () => {
                thisObj.bind_();
                gl.texImage2D(target, 0, GL_RGBA, GL_RGBA, GL_UNSIGNED_BYTE, img);
                gl.generateMipmap(target);
            };
            return thisObj;
        },
        setTexData_(data: ArrayBufferView, level = 0, internalFormat = GL_R8, width = 2, height = 2, border = 0, format = GL_RED, type = GL_UNSIGNED_BYTE, alignment = 1) {
            thisObj.bind_();
            gl.pixelStorei(GL_UNPACK_ALIGNMENT, alignment);
            gl.texImage2D(target, level, internalFormat, width, height, border, format, type, data);
            return thisObj;
        },
        setUnit_(loc: WebGLUniformLocation, unit: number) {
            gl.uniform1i(loc, unit);
            thisObj.bind_();
            gl.activeTexture(GL_TEXTURE0 + unit);
            return thisObj;
        }
    };
    // set a temporary blue texture
    thisObj.setTexData_(new Uint8Array([0, 0, 255, 255]), 0, GL_RGBA, 1, 1, 0, GL_RGBA, GL_UNSIGNED_BYTE);
    return thisObj;
};

type EBState = {
    buf_: WebGLBuffer;
    bind_: () => EBState;
    setIndices_: (data: number[]) => EBState;
};

const createElementBufferFns = (gl: WebGL2RenderingContext) => (mode = GL_STATIC_DRAW): EBState => {
    const buf = gl.createBuffer();
    const thisObj: EBState = {
        buf_: buf,
        bind_() { gl.bindBuffer(GL_ELEMENT_ARRAY_BUFFER, buf); return thisObj; },
        setIndices_(data) {
            gl.bufferData(GL_ELEMENT_ARRAY_BUFFER, new Uint16Array(data), mode);
            return thisObj;
        },
    };
    return thisObj;
};

type AttribPointers = [
    loc: number,
    size: number,
    stride?: number,
    offset?: number,
    type?: number,
    normalize?: boolean
];

type WebglState = {
    gl_: WebGL2RenderingContext;
    clear_: () => void;
    shader_: (vs: string, fs: string) => ShaderState;
    buffer_: (target?: number, mode?: number) => BufferState;
    texture_: (target?: number) => TextureState;
    elementBuffer_: (mode?: number) => EBState;
    VAO_: () => VAOState;
    draw_: (count: number, mode?: number, offset?: number) => void;
    drawElements_: (count: number, mode?: number, offset?: number) => void;
    resize_: () => void;
    changeSize_: (w: number, h: number) => void;
    createMesh_: (data: [Float32Array, number[]], attribs: AttribPointers[]) => {
        vao_: VAOState, draw_: () => void
    };
    renderTargetContext_: (tex: TextureState) => (fn: () => void) => void;
};

export const createGLContext = (canvas: HTMLCanvasElement, width = 400, height = 300): WebglState => {
    const gl = canvas.getContext('webgl2');
    if (!gl) {
        alert('Could not get gl context');
    };

    canvas.width = width;
    canvas.height = height;

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.enable(GL_CULL_FACE);
    gl.enable(GL_DEPTH_TEST);
    gl.enable(GL_BLEND);
    gl.depthFunc(GL_LEQUAL);
    gl.blendFunc(GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA);
    gl.clearDepth(1.);
    setupKeyListener(canvas, width, height, true);

    const thisObj: WebglState = {
        gl_: gl,
        clear_: clearFn(gl),
        shader_: createShaderFns(gl),
        buffer_: createBufferFns(gl),
        texture_: createTextureFns(gl),
        elementBuffer_: createElementBufferFns(gl),
        VAO_: createVAOFns(gl),
        draw_: (count, mode = GL_TRIANGLES, offset = 0) =>
            gl.drawArrays(mode, offset, count),
        drawElements_: (count, mode = GL_TRIANGLES, offset = 0) =>
            gl.drawElements(mode, count, GL_UNSIGNED_SHORT, offset),

        createMesh_([data, indices], attribs) {
            const vao = thisObj.VAO_().bind_();
            thisObj.buffer_().bind_().setData_(data);
            thisObj.elementBuffer_().bind_().setIndices_(indices);
            attribs.map(attr => vao.setPtr_(...attr));
            return { vao_: vao, draw_: () => thisObj.drawElements_(indices.length) };
        },
        resize_() {
            const ratio = deviceScaleRatio(width, height);
            canvas.width = width;
            canvas.height = height;
            canvas.style.width = width * ratio + 'px';
            canvas.style.height = height * ratio + 'px';
            gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
            // display note if device is in potrait
            getById('d').style.display = innerWidth < innerHeight ? 'block' : 'none';
        },
        changeSize_(w, h) {
            width = w;
            height = h;
            thisObj.resize_();
        },
        renderTargetContext_(target) {
            const fb = gl.createFramebuffer();
            target.setTexData_(null, 0, GL_RGBA, width, height, 0, GL_RGBA).setFilter_(GL_LINEAR).setWrap_();
            const bindFn = (target: WebGLFramebuffer) => gl.bindFramebuffer(GL_FRAMEBUFFER, target);
            const withTarget = (ctxFn: () => void) => {
                bindFn(fb);
                ctxFn();
                bindFn(null);
            };
            withTarget(() => {
                gl.framebufferTexture2D(GL_FRAMEBUFFER, GL_COLOR_ATTACHMENT0, GL_TEXTURE_2D, target.tex_, 0);
                const depth = thisObj.texture_()
                    .setTexData_(null, 0, GL_DEPTH_COMPONENT24, width, height, 0, GL_DEPTH_COMPONENT, GL_UNSIGNED_INT)
                    .setFilter_(GL_LINEAR)
                    .setWrap_();
                gl.framebufferTexture2D(GL_FRAMEBUFFER, GL_DEPTH_ATTACHMENT, GL_TEXTURE_2D, depth.tex_, 0);
            })
            return withTarget;
        },
    };

    return thisObj;
};
