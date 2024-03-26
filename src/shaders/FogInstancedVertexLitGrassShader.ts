import { RendererWithExposedMethods } from "webgl-framework/dist/types/RendererWithExposedMethods";
import { FogInstancedShader } from "./FogInstancedShader";
import { InstancedShader } from "./InstancedShader";
import { FullModel } from "webgl-framework";

export class FogInstancedVertexLitGrassShader extends FogInstancedShader {
    colorSun: WebGLUniformLocation | undefined;
    lightDir: WebGLUniformLocation | undefined;
    diffuseExponent: WebGLUniformLocation | undefined;
    rm_Normal: number | undefined;

    sTextureGrass: WebGLUniformLocation | undefined;
    grassAmount: WebGLUniformLocation | undefined;

    fillCode() {
        this.vertexShaderCode = `#version 300 es
            precision highp float;

            in vec2 rm_TexCoord0;
            in vec4 rm_Vertex;
            in vec3 rm_Normal;

            ${InstancedShader.COMMON_UNIFORMS_ATTRIBUTES}
            ${FogInstancedShader.FOG_VERTEX_UNIFORMS_VARYINGS}

            uniform vec4 color;
            uniform vec4 colorSun;
            uniform vec4 lightDir;
            uniform float diffuseExponent;
            out vec4 vDiffuseColor;
            out float vGrass;
            uniform float grassAmount;

            void main(void) {
                mat4 modelMatrix4 = mat4(modelMatrix);
                vec4 vertex = modelMatrix4 * rm_Vertex;
                // GLSL is column-major: mat[col][row]
                // modelMatrix[0][1] is sine of model rotation angle
                vertex.z += modelMatrix4[0][1] * heightOffset.x + heightOffset.y;

                gl_Position = projMatrix * viewMatrix * vertex;
                vTexCoord = rm_TexCoord0;

                ${FogInstancedShader.FOG_VERTEX_MAIN}

                vec4 normal = normalize(modelMatrix4 * vec4(rm_Normal, 0.0));

                float d = pow(max(0.0, dot(normal, lightDir)), diffuseExponent);

                vDiffuseColor = mix(colorSun, color, d);
                vGrass = smoothstep(0.2, 0.3, normal.z * grassAmount);
            }`;

        this.fragmentShaderCode = `#version 300 es
            precision mediump float;
            uniform sampler2D sTexture;
            uniform vec4 color;

            in mediump vec2 vTexCoord;
            out vec4 fragColor;

            uniform sampler2D sTextureGrass;
            in vec4 vDiffuseColor;
            in float vGrass;

            ${FogInstancedShader.FOG_FRAGMENT_UNIFORMS_VARYINGS}

            void main(void) {
                ${FogInstancedShader.FOG_FRAGMENT_MAIN}
                vec4 rock = texture(sTexture, vTexCoord);
                vec4 grass = texture(sTextureGrass, vTexCoord * 5.0);
                vec4 mixed = mix(rock, grass, vGrass);
                vec4 diffuse = mixed * vDiffuseColor;
                fragColor = mix(diffuse, fogColor, fogAmount);
            }`;
    }

    fillUniformsAttributes() {
        super.fillUniformsAttributes();

        this.colorSun = this.getUniform("colorSun");
        this.lightDir = this.getUniform("lightDir");
        this.diffuseExponent = this.getUniform("diffuseExponent");
        this.rm_Normal = this.getAttrib("rm_Normal");

        this.sTextureGrass = this.getUniform("sTextureGrass");
        this.grassAmount = this.getUniform("grassAmount");
    }

    drawInstanced(
        renderer: RendererWithExposedMethods,
        model: FullModel,
        bufferMatrices: WebGLBuffer,
        baseInstance: number,
        instances: number
    ): void {
        if (this.rm_Vertex === undefined
            || this.rm_TexCoord0 === undefined
            || this.rm_Normal === undefined
            || this.modelMatrix === undefined
            || !this.extBvbi
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

        gl.bindBuffer(gl.ARRAY_BUFFER, bufferMatrices);
        // set all 4 attributes for matrix
        const bytesPerMatrix = 4 * 16;
        for (let i = 0; i < 4; ++i) {
            const loc = this.modelMatrix + i;
            gl.enableVertexAttribArray(loc);
            // note the stride and offset
            const offset = i * 16;  // 4 floats per row, 4 bytes per float
            gl.vertexAttribPointer(
                loc,              // location
                4,                // size (num values to pull from buffer per iteration)
                gl.FLOAT,         // type of data in buffer
                false,            // normalize
                bytesPerMatrix,   // stride, num bytes to advance to get to next set of values
                offset,           // offset in buffer
            );
            // this line says this attribute only changes for each 1 instance
            gl.vertexAttribDivisor(loc, 1);
        }

        renderer.calculateMVPMatrix(0, 0, 0, 0, 0, 0, 1, 1, 1);

        gl.uniformMatrix4fv(this.viewMatrix!, false, renderer.getViewMatrix());
        gl.uniformMatrix4fv(this.projMatrix!, false, renderer.getProjectionMatrix());

        const count = model.getNumIndices() * 3;
        const offset = 0;
        const instanceCount = instances;
        const baseVertex = 0;
        this.extBvbi.drawElementsInstancedBaseVertexBaseInstanceWEBGL(
            gl.TRIANGLES, count, gl.UNSIGNED_SHORT,
            offset, instanceCount, baseVertex, baseInstance);

        // Reset attrib divisor for matrix attribs
        for (let i = 0; i < 4; ++i) {
            const loc = this.modelMatrix + i;
            gl.vertexAttribDivisor(loc, 0);
        }

        renderer.checkGlError("InstancedShader glDrawElements");
    }
}
