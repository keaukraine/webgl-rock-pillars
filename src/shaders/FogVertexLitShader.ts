import { FullModel } from "webgl-framework";
import { RendererWithExposedMethods } from "webgl-framework/dist/types/RendererWithExposedMethods";
import { FogShader } from "./FogShader";
import { InstancedTexturePositionsShader } from "./InstancedTexturePositionsShader";
import { ShaderCommonFunctions } from "./ShaderCommonFunctions";

export class FogVertexLitShader extends FogShader {
    colorSun: WebGLUniformLocation | undefined;
    lightDir: WebGLUniformLocation | undefined;
    diffuseExponent: WebGLUniformLocation | undefined;
    rm_Normal: number | undefined;

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
            }`;

        this.fragmentShaderCode = `#version 300 es
            precision mediump float;
            uniform sampler2D sTexture;

            in mediump vec2 vTexCoord;
            out vec4 fragColor;

            ${FogShader.FOG_FRAGMENT_UNIFORMS_VARYINGS}

            in vec4 vDiffuseColor;

            void main(void)
            {
                ${FogShader.FOG_FRAGMENT_MAIN}
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

    drawInstanced(
        renderer: RendererWithExposedMethods,
        model: FullModel,
        tx: number, ty: number, tz: number,
        rx: number, ry: number, rz: number,
        sx: number, sy: number, sz: number,
        offset: number,
        instances: number
    ): void {
        if (this.rm_Vertex === undefined
            || this.rm_TexCoord0 === undefined
            || this.rm_Normal === undefined
            || this.view_proj_matrix === undefined
            || this.view_matrix === undefined
        ) {
            return;
        }

        const gl = renderer.gl as WebGL2RenderingContext;

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
        gl.uniform1i(this.uPositionOffset!, offset);
        gl.drawElementsInstanced(gl.TRIANGLES, model.getNumIndices() * 3, gl.UNSIGNED_SHORT, 0, instances);

        renderer.checkGlError("InstancedVegetationShader glDrawElements");
    }
}
