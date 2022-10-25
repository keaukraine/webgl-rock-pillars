import { BaseShader, FullModel } from "webgl-framework";
import { RendererWithExposedMethods } from "webgl-framework/dist/types/RendererWithExposedMethods";
export declare class BirdsShader extends BaseShader {
    muMVPMatrixHandle: WebGLUniformLocation | undefined;
    msTextureHandle: WebGLUniformLocation | undefined;
    mMHandle: WebGLUniformLocation | undefined;
    uSeed: WebGLUniformLocation | undefined;
    color: WebGLUniformLocation | undefined;
    maPosition1Handle: number | undefined;
    maPosition2Handle: number | undefined;
    maTextureHandle: number | undefined;
    fogStartDistance: WebGLUniformLocation | undefined;
    fogDistance: WebGLUniformLocation | undefined;
    heightFogParams: WebGLUniformLocation | undefined;
    view_matrix: WebGLUniformLocation | undefined;
    model_matrix: WebGLUniformLocation | undefined;
    texCubemap: WebGLUniformLocation | undefined;
    fillCode(): void;
    fillUniformsAttributes(): void;
    private clamp;
    drawModel(renderer: RendererWithExposedMethods, model: FullModel, frames: number, frame1: number, frame2: number, m: number, tx: number, ty: number, tz: number, rx: number, ry: number, rz: number, sx: number, sy: number, sz: number): void;
    drawInstanced(renderer: RendererWithExposedMethods, model: FullModel, frames: number, frame1: number, frame2: number, m: number, tx: number, ty: number, tz: number, rx: number, ry: number, rz: number, sx: number, sy: number, sz: number, instances: number): void;
}
