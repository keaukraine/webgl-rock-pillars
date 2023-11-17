import { InstancedShader } from "./InstancedShader";
export declare class InstancedColoredShader extends InstancedShader {
    color: WebGLUniformLocation | undefined;
    fillCode(): void;
    fillUniformsAttributes(): void;
}
