"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FogVertexLitShader = void 0;
const FogShader_1 = require("./FogShader");
const InstancedTexturePositionsShader_1 = require("./InstancedTexturePositionsShader");
const ShaderCommonFunctions_1 = require("./ShaderCommonFunctions");
class FogVertexLitShader extends FogShader_1.FogShader {
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

            ${ShaderCommonFunctions_1.ShaderCommonFunctions.RANDOM}
            ${ShaderCommonFunctions_1.ShaderCommonFunctions.ROTATION}

            const float PI2 = 6.28318530718;

            ${FogShader_1.FogShader.FOG_VERTEX_UNIFORMS_VARYINGS}

            uniform vec4 color;
            uniform vec4 colorSun;
            uniform vec4 lightDir;
            uniform float diffuseExponent;
            out vec4 vDiffuseColor;

            void main(void)
            {
                ${InstancedTexturePositionsShader_1.InstancedTexturePositionsShader.COMMON_TRANSFORMS}
                vertex.z += rotations.x * heightOffset.x + heightOffset.y;

                gl_Position = view_proj_matrix * vertex;
                vTexCoord = rm_TexCoord0;

                ${FogShader_1.FogShader.FOG_VERTEX_MAIN}

                vec4 normal = vec4(rm_Normal, 0.0) * rotationMatrix;
                float d = pow(max(0.0, dot(normal, lightDir)), diffuseExponent);

                vDiffuseColor = mix(colorSun, color, d);
            }`;
        this.fragmentShaderCode = `#version 300 es
            precision mediump float;
            uniform sampler2D sTexture;

            in mediump vec2 vTexCoord;
            out vec4 fragColor;

            ${FogShader_1.FogShader.FOG_FRAGMENT_UNIFORMS_VARYINGS}

            in vec4 vDiffuseColor;

            void main(void)
            {
                ${FogShader_1.FogShader.FOG_FRAGMENT_MAIN}
                vec4 diffuse = texture(sTexture, vTexCoord) * vDiffuseColor;
                fragColor = mix(diffuse, fogColor, fogAmount);
            }`;
    }
    fillUniformsAttributes() {
        super.fillUniformsAttributes();
        this.colorSun = this.getUniform("colorSun");
        this.lightDir = this.getUniform("lightDir");
        this.diffuseExponent = this.getUniform("diffuseExponent");
        this.rm_Normal = this.getAttrib("rm_Normal");
    }
    drawInstanced(renderer, model, tx, ty, tz, rx, ry, rz, sx, sy, sz, offset, instances) {
        if (this.rm_Vertex === undefined
            || this.rm_TexCoord0 === undefined
            || this.rm_Normal === undefined
            || this.view_proj_matrix === undefined
            || this.view_matrix === undefined) {
            return;
        }
        const gl = renderer.gl;
        model.bindBuffers(gl);
        gl.enableVertexAttribArray(this.rm_Vertex);
        gl.enableVertexAttribArray(this.rm_TexCoord0);
        gl.enableVertexAttribArray(this.rm_Normal);
        gl.vertexAttribPointer(this.rm_Vertex, 3, gl.HALF_FLOAT, false, 16, 0);
        gl.vertexAttribPointer(this.rm_TexCoord0, 2, gl.HALF_FLOAT, false, 16, 6);
        gl.vertexAttribPointer(this.rm_Normal, 3, gl.HALF_FLOAT, false, 16, 10);
        renderer.calculateMVPMatrix(tx, ty, tz, rx, ry, rz, sx, sy, sz);
        gl.uniformMatrix4fv(this.view_proj_matrix, false, renderer.getMVPMatrix());
        gl.uniformMatrix4fv(this.view_matrix, false, renderer.getViewMatrix());
        gl.uniform1i(this.uPositionOffset, offset);
        gl.drawElementsInstanced(gl.TRIANGLES, model.getNumIndices() * 3, gl.UNSIGNED_SHORT, 0, instances);
        renderer.checkGlError("InstancedVegetationShader glDrawElements");
    }
}
exports.FogVertexLitShader = FogVertexLitShader;
//# sourceMappingURL=FogVertexLitShader.js.map