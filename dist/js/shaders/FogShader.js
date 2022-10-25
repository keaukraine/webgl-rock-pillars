"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.FogShader = void 0;
const InstancedTexturePositionsColoredShader_1 = require("./InstancedTexturePositionsColoredShader");
const InstancedTexturePositionsShader_1 = require("./InstancedTexturePositionsShader");
const ShaderCommonFunctions_1 = require("./ShaderCommonFunctions");
class FogShader extends InstancedTexturePositionsColoredShader_1.InstancedTexturePositionsColoredShader {
    fillCode() {
        this.vertexShaderCode = `#version 300 es
            precision highp float;

            uniform mat4 view_proj_matrix;

            uniform mat4 view_matrix;
            uniform mat4 model_matrix;
            out vec3 texCoord;

            uniform vec2 uScale; // x: base scale for models; y: max random additional scale
            uniform sampler2D sPositions;
            uniform int uPositionOffset;

            in vec2 rm_TexCoord0;
            in vec4 rm_Vertex;

            ${ShaderCommonFunctions_1.ShaderCommonFunctions.RANDOM}
            ${ShaderCommonFunctions_1.ShaderCommonFunctions.ROTATION}

            const float PI2 = 6.28318530718;

            ${FogShader.FOG_VERTEX_UNIFORMS_VARYINGS}

            void main(void)
            {
                ${InstancedTexturePositionsShader_1.InstancedTexturePositionsShader.COMMON_TRANSFORMS}
                vertex.z += rotations.x * heightOffset.x + heightOffset.y;

                gl_Position = view_proj_matrix * vertex;
                vTexCoord = rm_TexCoord0;

                ${FogShader.FOG_VERTEX_MAIN}
            }`;
        this.fragmentShaderCode = `#version 300 es
            precision mediump float;
            uniform sampler2D sTexture;
            uniform vec4 color;

            in mediump vec2 vTexCoord;
            out vec4 fragColor;

            ${FogShader.FOG_FRAGMENT_UNIFORMS_VARYINGS}

            void main(void)
            {
                ${FogShader.FOG_FRAGMENT_MAIN}
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
        this.view_matrix = this.getUniform("view_matrix");
        this.texCubemap = this.getUniform("texCubemap");
    }
}
exports.FogShader = FogShader;
_a = FogShader;
FogShader.FOG_VERTEX_UNIFORMS_VARYINGS = `
        uniform vec2 heightOffset; // x: random positive/negative offset; y: fixed offset
        uniform float fogDistance;
        uniform float fogStartDistance;
        out float vFogAmount;
        out float vFogZ;
        out mediump vec2 vTexCoord;
        const float ZERO = 0.0;
        const float ONE = 1.0;
    `;
FogShader.FOG_FRAGMENT_UNIFORMS_VARYINGS = `
        in float vFogAmount;
        in float vFogZ;
        uniform vec2 heightFogParams;
        in vec3 texCoord;
        uniform samplerCube texCubemap;
        const float ZERO = 0.0;
        const float ONE = 1.0;
    `;
FogShader.FOG_AMOUNT_VERTEX = `
        float distanceFog = clamp((length(gl_Position) - fogStartDistance) / fogDistance, ZERO, ONE);
        vFogAmount = clamp(distanceFog, ZERO, ONE);
    `;
FogShader.FOG_VERTEX_MAIN = `
        ${_a.FOG_AMOUNT_VERTEX}
        vFogZ = vertex.z;
        texCoord = inverse(mat3(view_matrix)) * (view_matrix * vertex).xyz;
    `;
FogShader.FOG_AMOUNT_FRAGMENT = `
        float heightFog = clamp(1.0 - ((vFogZ + heightFogParams.x) * heightFogParams.y), ZERO, ONE);
        float fogAmount = clamp(vFogAmount + heightFog, ZERO, ONE);
    `;
FogShader.FOG_FRAGMENT_MAIN = `
        ${_a.FOG_AMOUNT_FRAGMENT}
        vec4 fogColor = texture(texCubemap, texCoord);
    `;
//# sourceMappingURL=FogShader.js.map