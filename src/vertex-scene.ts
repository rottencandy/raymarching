import { Camera } from './camera';
import { CTX } from './setup';
import { Cube } from './vertices';

/**
* Calculates transformed vertices and provides
* normals and interpolated fragment positions.
*/
const vertexNormalFrag = `#version 300 es
    precision lowp float;
    layout(location=0)in vec4 aPos;
    layout(location=1)in vec4 aNorm;
    uniform mat4 uMat;
    uniform vec4 uPos;
    out vec3 vNormal, vFragPos;

    void main() {
        gl_Position = uMat * (uPos + aPos);
        vFragPos = aPos.xyz;
        vNormal = aNorm.xyz;
    }`;

/**
* Calculates fragment lights using Phong lighting (ambient+diffuse+spectacular)
*/
const fragmentPhong = `#version 300 es
    precision lowp float;
    in vec3 vNormal, vFragPos;
    uniform vec3 uColor, uLightPos, uCam;
    out vec4 outColor;

    void main() {
        // variables
        vec3 lightColor = vec3(1.);
        vec3 ambientStr = vec3(.1);
        vec3 diffStr = vec3(1.);
        vec3 spectacularStr = vec3(.5);
        float shininess = 8.;

        // ambient
        vec3 ambient = ambientStr * lightColor;

        // diffuse
        vec3 norm = normalize(vNormal);
        vec3 lightDir = normalize(uLightPos - vFragPos);
        float diff = max(dot(norm, lightDir), 0.);
        vec3 diffuse = lightColor * (diff * diffStr);

        // spectacular
        vec3 viewDir = normalize(uCam - vFragPos);

        // For blinn-phong
        // vec3 halfwayDir = normalize(lightDir + viewDir);
        // float spec = pow(max(dot(viewDir, halfwayDir), 0.), 16.);
        vec3 reflectDir = reflect(-lightDir, norm);
        float spec = pow(max(dot(viewDir, reflectDir), 0.), shininess);

        vec3 spectacular = lightColor * (spec * spectacularStr);

        vec3 result = (ambient + diffuse + spectacular) * uColor;
        outColor = vec4(result, 1.);
    }`;

/**
* Calculates vertices
*/
const vertexPos = `#version 300 es
    precision lowp float;
    layout(location=0)in vec4 aPos;
    uniform mat4 uMat;
    uniform vec4 uPos;

    void main() {
        gl_Position = uMat * (uPos + aPos);
    }`;

/**
* Static light color
*/
const fragmentStatic = `#version 300 es
    precision lowp float;
    uniform vec3 uColor;
    out vec4 outColor;

    void main() {
        outColor = vec4(uColor, 1.);
    }`;

const shader = CTX.shader_(
    vertexNormalFrag,
    fragmentPhong
).use_();

const { vao_, draw_ } = CTX.createMesh_(
    Cube(10),
    [
        // aPos
        [0, 3, 24],
        // aNorm
        [1, 3, 24, 12],
    ]
);

const lightSh = CTX.shader_(
    vertexPos,
    fragmentStatic
).use_();

const { vao_: lightVao, draw_: drawLight } = CTX.createMesh_(
    Cube(3),
    [
        [0, 3, 24],
    ]
);

export const update = (_dt: number, _cam: Camera) => {};

export const render = (_dt: number, cam: Camera) => {
    CTX.clear_();
    const mat = cam.mat_;

    vao_.bind_();
    shader.use_();

    shader.uniform_`uPos`.u4f_(0, 0, 0, 0);
    shader.uniform_`uMat`.m4fv_(mat);
    shader.uniform_`uCam`.u3f_(cam.eye_[0], cam.eye_[1], cam.eye_[2]);
    shader.uniform_`uLightPos`.u3f_(20, 20, 20);
    shader.uniform_`uColor`.u3f_(.2, .7, .5);
    draw_();

    lightVao.bind_();
    lightSh.use_();

    lightSh.uniform_`uMat`.m4fv_(mat);
    lightSh.uniform_`uColor`.u3f_(1, 1, 1);
    lightSh.uniform_`uPos`.u4f_(20, 20, 20, 0);
    drawLight();
};
