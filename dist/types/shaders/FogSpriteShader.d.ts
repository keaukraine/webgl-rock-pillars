import { DiffuseShader } from "webgl-framework";
export declare class FogSpriteShader extends DiffuseShader {
    fogStartDistance: WebGLUniformLocation | undefined;
    fogDistance: WebGLUniformLocation | undefined;
    heightFogParams: WebGLUniformLocation | undefined;
    color: WebGLUniformLocation | undefined;
    model_matrix: WebGLUniformLocation | undefined;
    cameraRange: WebGLUniformLocation | undefined;
    sDepth: WebGLUniformLocation | undefined;
    invViewportSize: WebGLUniformLocation | undefined;
    transitionSize: WebGLUniformLocation | undefined;
    fillCode(): void;
    fillUniformsAttributes(): void;
}
