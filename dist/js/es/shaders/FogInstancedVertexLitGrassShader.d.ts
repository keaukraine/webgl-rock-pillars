import { RendererWithExposedMethods } from "webgl-framework/dist/types/RendererWithExposedMethods";
import { FogInstancedShader } from "./FogInstancedShader";
import { FullModel } from "webgl-framework";
export declare class FogInstancedVertexLitGrassShader extends FogInstancedShader {
    colorSun: WebGLUniformLocation | undefined;
    lightDir: WebGLUniformLocation | undefined;
    diffuseExponent: WebGLUniformLocation | undefined;
    rm_Normal: number | undefined;
    sTextureGrass: WebGLUniformLocation | undefined;
    grassAmount: WebGLUniformLocation | undefined;
    fillCode(): void;
    fillUniformsAttributes(): void;
    drawInstanced(renderer: RendererWithExposedMethods, model: FullModel, bufferMatrices: WebGLBuffer, baseInstance: number, instances: number): void;
}
