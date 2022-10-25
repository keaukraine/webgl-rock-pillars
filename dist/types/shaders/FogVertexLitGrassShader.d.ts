import { FogVertexLitShader } from "./FogVertexLitShader";
export declare class FogVertexLitGrassShader extends FogVertexLitShader {
    sTextureGrass: WebGLUniformLocation | undefined;
    grassAmount: WebGLUniformLocation | undefined;
    fillCode(): void;
    fillUniformsAttributes(): void;
}
