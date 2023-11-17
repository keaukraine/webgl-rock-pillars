import { FogShader } from "./FogShader";
import { FogVertexLitShader } from "./FogVertexLitShader";
import { InstancedTexturePositionsShader } from "./InstancedTexturePositionsShader";
import { ShaderCommonFunctions } from "./ShaderCommonFunctions";

export class FogVertexLitGrassShader extends FogVertexLitShader {
    sTextureGrass: WebGLUniformLocation | undefined;
    grassAmount: WebGLUniformLocation | undefined;

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
            in vec3 rm_Normal;

            ${ShaderCommonFunctions.RANDOM}
            ${ShaderCommonFunctions.ROTATION}

            const float PI2 = 6.28318530718;

            ${FogShader.FOG_VERTEX_UNIFORMS_VARYINGS}

            uniform vec4 color;
            uniform vec4 colorSun;
            uniform vec4 lightDir;
            uniform float diffuseExponent;
            out vec4 vDiffuseColor;
            out float vGrass;
            uniform float grassAmount;

            void main(void)
            {
                ${InstancedTexturePositionsShader.COMMON_TRANSFORMS}
                vertex.z += rotations.x * heightOffset.x + heightOffset.y;

                gl_Position = view_proj_matrix * vertex;
                vTexCoord = rm_TexCoord0;

                ${FogShader.FOG_VERTEX_MAIN}

                vec4 normal = vec4(rm_Normal, 0.0) * rotationMatrix;

                float d = pow(max(0.0, dot(normal, lightDir)), diffuseExponent);

                vDiffuseColor = mix(colorSun, color, d);
                vGrass = smoothstep(0.2, 0.3, normal.z * grassAmount);
            }`;

        this.fragmentShaderCode = `#version 300 es
            precision mediump float;
            uniform sampler2D sTexture;
            uniform sampler2D sTextureGrass;

            in mediump vec2 vTexCoord;
            out vec4 fragColor;

            ${FogShader.FOG_FRAGMENT_UNIFORMS_VARYINGS}

            in vec4 vDiffuseColor;
            in float vGrass;

            void main(void)
            {
                ${FogShader.FOG_FRAGMENT_MAIN}
                vec4 rock = texture(sTexture, vTexCoord);
                vec4 grass = texture(sTextureGrass, vTexCoord * 5.0);
                vec4 mixed = mix(rock, grass, vGrass);
                vec4 diffuse = mixed * vDiffuseColor;
                fragColor = mix(diffuse, fogColor, fogAmount);
                // fragColor.rgb = texCoord;
            }`;
    }

    fillUniformsAttributes() {
        super.fillUniformsAttributes();

        this.sTextureGrass = this.getUniform("sTextureGrass");
        this.grassAmount = this.getUniform("grassAmount");
    }
}
