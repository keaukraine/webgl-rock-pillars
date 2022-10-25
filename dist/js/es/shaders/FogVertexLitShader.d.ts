import { FullModel } from "webgl-framework";
import { RendererWithExposedMethods } from "webgl-framework/dist/types/RendererWithExposedMethods";
import { FogShader } from "./FogShader";
export declare class FogVertexLitShader extends FogShader {
    colorSun: WebGLUniformLocation | undefined;
    lightDir: WebGLUniformLocation | undefined;
    diffuseExponent: WebGLUniformLocation | undefined;
    rm_Normal: number | undefined;
    fillCode(): void;
    fillUniformsAttributes(): void;
    drawInstanced(renderer: RendererWithExposedMethods, model: FullModel, tx: number, ty: number, tz: number, rx: number, ry: number, rz: number, sx: number, sy: number, sz: number, offset: number, instances: number): void;
}
