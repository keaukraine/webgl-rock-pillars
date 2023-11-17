"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.FogInstancedShader = void 0;
const InstancedColoredShader_1 = require("./InstancedColoredShader");
const InstancedShader_1 = require("./InstancedShader");
class FogInstancedShader extends InstancedColoredShader_1.InstancedColoredShader {
    fillCode() {
        this.vertexShaderCode = `#version 300 es
            precision highp float;

            in vec2 rm_TexCoord0;
            in vec4 rm_Vertex;

            ${InstancedShader_1.InstancedShader.COMMON_UNIFORMS_ATTRIBUTES}
            ${FogInstancedShader.FOG_VERTEX_UNIFORMS_VARYINGS}

            void main(void) {
                vec4 vertex = modelMatrix * rm_Vertex;
                // GLSL is column-major: mat[col][row]
                // modelMatrix[0][1] is sine of model rotation angle
                vertex.z += modelMatrix[0][1] * heightOffset.x + heightOffset.y;

                gl_Position = projMatrix * viewMatrix * vertex;
                vTexCoord = rm_TexCoord0;

                ${FogInstancedShader.FOG_VERTEX_MAIN}
            }`;
        this.fragmentShaderCode = `#version 300 es
            precision mediump float;
            uniform sampler2D sTexture;
            uniform vec4 color;

            in mediump vec2 vTexCoord;
            out vec4 fragColor;

            ${FogInstancedShader.FOG_FRAGMENT_UNIFORMS_VARYINGS}

            void main(void) {
                ${FogInstancedShader.FOG_FRAGMENT_MAIN}
                vec4 diffuse = texture(sTexture, vTexCoord) * color;
                fragColor = mix(diffuse, fogColor, fogAmount);
            }`;
    }
    fillUniformsAttributes() {
        super.fillUniformsAttributes();
        this.fogStartDistance = this.getUniform("fogStartDistance");
        this.fogDistance = this.getUniform("fogDistance");
        this.heightFogParams = this.getUniform("heightFogParams");
        this.heightOffset = this.getUniform("heightOffset");
        this.texCubemap = this.getUniform("texCubemap");
    }
}
exports.FogInstancedShader = FogInstancedShader;
_a = FogInstancedShader;
FogInstancedShader.FOG_VERTEX_UNIFORMS_VARYINGS = `
        uniform vec2 heightOffset; // x: random positive/negative offset; y: fixed offset
        uniform float fogDistance;
        uniform float fogStartDistance;
        out float vFogAmount;
        out float vFogZ;
        out vec3 texCoord;
        out mediump vec2 vTexCoord;
        const float ZERO = 0.0;
        const float ONE = 1.0;
    `;
FogInstancedShader.FOG_FRAGMENT_UNIFORMS_VARYINGS = `
        in float vFogAmount;
        in float vFogZ;
        uniform vec2 heightFogParams;
        in vec3 texCoord;
        uniform samplerCube texCubemap;
        const float ZERO = 0.0;
        const float ONE = 1.0;
    `;
FogInstancedShader.FOG_AMOUNT_VERTEX = `
        float distanceFog = clamp((length(gl_Position) - fogStartDistance) / fogDistance, ZERO, ONE);
        vFogAmount = clamp(distanceFog, ZERO, ONE);
    `;
FogInstancedShader.FOG_VERTEX_MAIN = `
        ${_a.FOG_AMOUNT_VERTEX}
        vFogZ = vertex.z;
        texCoord = inverse(mat3(viewMatrix)) * (viewMatrix * vertex).xyz;
    `;
FogInstancedShader.FOG_AMOUNT_FRAGMENT = `
        float heightFog = clamp(1.0 - ((vFogZ + heightFogParams.x) * heightFogParams.y), ZERO, ONE);
        float fogAmount = clamp(vFogAmount + heightFog, ZERO, ONE);
    `;
FogInstancedShader.FOG_FRAGMENT_MAIN = `
        ${_a.FOG_AMOUNT_FRAGMENT}
        vec4 fogColor = texture(texCubemap, texCoord);
    `;
//# sourceMappingURL=FogInstancedShader.js.map