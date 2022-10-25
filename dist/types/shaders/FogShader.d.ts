import { InstancedTexturePositionsColoredShader } from "./InstancedTexturePositionsColoredShader";
export declare class FogShader extends InstancedTexturePositionsColoredShader {
    fogStartDistance: WebGLUniformLocation | undefined;
    fogDistance: WebGLUniformLocation | undefined;
    heightFogParams: WebGLUniformLocation | undefined;
    heightOffset: WebGLUniformLocation | undefined;
    view_matrix: WebGLUniformLocation | undefined;
    model_matrix: WebGLUniformLocation | undefined;
    texCubemap: WebGLUniformLocation | undefined;
    static readonly FOG_VERTEX_UNIFORMS_VARYINGS = "\n        uniform vec2 heightOffset; // x: random positive/negative offset; y: fixed offset\n        uniform float fogDistance;\n        uniform float fogStartDistance;\n        out float vFogAmount;\n        out float vFogZ;\n        out mediump vec2 vTexCoord;\n        const float ZERO = 0.0;\n        const float ONE = 1.0;\n    ";
    static readonly FOG_FRAGMENT_UNIFORMS_VARYINGS = "\n        in float vFogAmount;\n        in float vFogZ;\n        uniform vec2 heightFogParams;\n        in vec3 texCoord;\n        uniform samplerCube texCubemap;\n        const float ZERO = 0.0;\n        const float ONE = 1.0;\n    ";
    static readonly FOG_AMOUNT_VERTEX = "\n        float distanceFog = clamp((length(gl_Position) - fogStartDistance) / fogDistance, ZERO, ONE);\n        vFogAmount = clamp(distanceFog, ZERO, ONE);\n    ";
    static readonly FOG_VERTEX_MAIN: string;
    static readonly FOG_AMOUNT_FRAGMENT = "\n        float heightFog = clamp(1.0 - ((vFogZ + heightFogParams.x) * heightFogParams.y), ZERO, ONE);\n        float fogAmount = clamp(vFogAmount + heightFog, ZERO, ONE);\n    ";
    static readonly FOG_FRAGMENT_MAIN: string;
    fillCode(): void;
    fillUniformsAttributes(): void;
}
