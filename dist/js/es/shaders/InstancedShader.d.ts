import { BaseShader, FullModel } from "webgl-framework";
import { RendererWithExposedMethods } from "webgl-framework/dist/types/RendererWithExposedMethods";
export declare class InstancedShader extends BaseShader {
    viewMatrix: WebGLUniformLocation | undefined;
    projMatrix: WebGLUniformLocation | undefined;
    sTexture: WebGLUniformLocation | undefined;
    modelMatrix: number | undefined;
    rm_Vertex: number | undefined;
    rm_TexCoord0: number | undefined;
    static readonly COMMON_UNIFORMS_ATTRIBUTES = "\n    uniform mat4 viewMatrix;\n    uniform mat4 projMatrix;\n    in mat4 modelMatrix;\n    ";
    static readonly COMMON_TRANSFORMS = "\n    // mat4 view_proj_matrix = modelMatrix * viewMatrix * projMatrix;\n    // mat4 view_proj_matrix = viewMatrix * modelMatrix * projMatrix; // as in calculateMVPMatrix()\n    mat4 view_proj_matrix = projMatrix * viewMatrix * modelMatrix;\n    // gl_Position = ProjectionMatrix * ViewMatrix * ModelMatrix * vec4(position, 1.0);\n    ";
    fillCode(): void;
    fillUniformsAttributes(): void;
    /** @inheritdoc */
    drawModel(renderer: RendererWithExposedMethods, model: FullModel, bufferMatrices: WebGLBuffer): void;
    drawInstanced(renderer: RendererWithExposedMethods, model: FullModel, bufferMatrices: WebGLBuffer, offset: number, instances: number): void;
}
