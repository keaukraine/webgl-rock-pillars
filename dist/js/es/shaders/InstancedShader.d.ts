import { BaseShader, FullModel } from "webgl-framework";
import { RendererWithExposedMethods } from "webgl-framework/dist/types/RendererWithExposedMethods";
export interface IInstancedShader {
    drawInstanced(renderer: RendererWithExposedMethods, model: FullModel, bufferMatrices: WebGLBuffer, baseInstance: number, instances: number): void;
}
export declare class InstancedShader extends BaseShader implements IInstancedShader {
    viewMatrix: WebGLUniformLocation | undefined;
    projMatrix: WebGLUniformLocation | undefined;
    sTexture: WebGLUniformLocation | undefined;
    modelMatrix: number | undefined;
    rm_Vertex: number | undefined;
    rm_TexCoord0: number | undefined;
    protected extBvbi: any;
    static readonly COMMON_UNIFORMS_ATTRIBUTES = "\n        uniform mat4 viewMatrix;\n        uniform mat4 projMatrix;\n        in mat4 modelMatrix;\n    ";
    static readonly COMMON_TRANSFORMS = "\n        mat4 view_proj_matrix = projMatrix * viewMatrix * modelMatrix;\n    ";
    fillCode(): void;
    fillUniformsAttributes(): void;
    constructor(gl: WebGLRenderingContext | WebGL2RenderingContext);
    /** @inheritdoc */
    drawModel(renderer: RendererWithExposedMethods, model: FullModel, bufferMatrices: WebGLBuffer): void;
    drawAllInstances(renderer: RendererWithExposedMethods, model: FullModel, bufferMatrices: WebGLBuffer, instances: number): void;
    drawInstanced(renderer: RendererWithExposedMethods, model: FullModel, bufferMatrices: WebGLBuffer, baseInstance: number, instances: number): void;
}
