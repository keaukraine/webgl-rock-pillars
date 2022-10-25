import { BaseShader, DiffuseShader, FullModel } from "webgl-framework";
import { DrawableShader } from "webgl-framework/dist/types/DrawableShader";
import { RendererWithExposedMethods } from "webgl-framework/dist/types/RendererWithExposedMethods";

import { mat4 } from "gl-matrix";

export class SkyShader extends BaseShader implements DrawableShader {
    view_proj_matrix: WebGLUniformLocation | undefined;
    view_matrix: WebGLUniformLocation | undefined;
    texCubemap: WebGLUniformLocation | undefined;
    rm_Vertex: number | undefined;

    fillCode() {
        this.vertexShaderCode = `#version 300 es
            precision highp float;
            uniform mat4 view_proj_matrix;
            in vec4 rm_Vertex;
            out vec3 texCoord;
            uniform mat4 view_matrix;

            void main() {
                gl_Position = view_proj_matrix * rm_Vertex;
                vec4 p = view_matrix * rm_Vertex;
                texCoord = inverse(mat3(view_matrix)) * p.xyz;
            }`;

        this.fragmentShaderCode = `#version 300 es
            precision mediump float;
            in vec3 texCoord;
            out vec4 color;
            uniform samplerCube texCubemap;

            void main(void) {
                color = texture(texCubemap, texCoord);
            }
        `;
    }

    fillUniformsAttributes() {
        this.view_proj_matrix = this.getUniform("view_proj_matrix");
        this.view_matrix = this.getUniform("view_matrix");
        this.texCubemap = this.getUniform("texCubemap");
        this.rm_Vertex = this.getAttrib("rm_Vertex");
    }

    drawModel(renderer: RendererWithExposedMethods, model: FullModel, tx: number, ty: number, tz: number, rx: number, ry: number, rz: number, sx: number, sy: number, sz: number): void {
        if (this.rm_Vertex === undefined || this.view_proj_matrix === undefined || this.view_matrix === undefined || this.texCubemap === undefined) {
            return;
        }

        const gl = renderer.gl;

        model.bindBuffers(gl);

        gl.enableVertexAttribArray(this.rm_Vertex);
        // gl.enableVertexAttribArray(this.rm_TexCoord0);
        gl.vertexAttribPointer(this.rm_Vertex, 3, gl.FLOAT, false, 4 * (3 + 2), 0);
        // gl.vertexAttribPointer(this.rm_TexCoord0, 2, gl.FLOAT, false, 4 * (3 + 2), 4 * 3);

        renderer.calculateMVPMatrix(tx, ty, tz, rx, ry, rz, sx, sy, sz);

        gl.uniformMatrix4fv(this.view_proj_matrix, false, renderer.getMVPMatrix());
        gl.uniformMatrix4fv(this.view_matrix, false, renderer.getViewMatrix());
        gl.drawElements(gl.TRIANGLES, model.getNumIndices() * 3, gl.UNSIGNED_SHORT, 0);

        renderer.checkGlError("SkyShader glDrawElements");
    }
}
