import { BaseShader, FullModel } from "webgl-framework";
import { RendererWithExposedMethods } from "webgl-framework/dist/types/RendererWithExposedMethods";

export interface IInstancedShader {
    drawInstanced(
        renderer: RendererWithExposedMethods,
        model: FullModel,
        bufferMatrices: WebGLBuffer,
        baseInstance: number,
        instances: number
    ): void;
}

export class InstancedShader extends BaseShader implements IInstancedShader {
    // Uniforms are of type `WebGLUniformLocation`
    viewMatrix: WebGLUniformLocation | undefined;
    projMatrix: WebGLUniformLocation | undefined;
    sTexture: WebGLUniformLocation | undefined;

    modelMatrix: number | undefined;
    rm_Vertex: number | undefined;
    rm_TexCoord0: number | undefined;

    protected extBvbi: any;

    static readonly COMMON_UNIFORMS_ATTRIBUTES = `
        uniform mat4 viewMatrix;
        uniform mat4 projMatrix;
        in mat4 modelMatrix;
    `;

    static readonly COMMON_TRANSFORMS = `
        mat4 view_proj_matrix = projMatrix * viewMatrix * modelMatrix;
    `;

    fillCode() {
        this.vertexShaderCode = `#version 300 es
            precision highp float;

            ${InstancedShader.COMMON_UNIFORMS_ATTRIBUTES}

            in mediump vec2 rm_TexCoord0;
            in vec4 rm_Vertex;
            out mediump vec2 vTexCoord;

            void main(void) {
                ${InstancedShader.COMMON_TRANSFORMS}

                gl_Position = view_proj_matrix * rm_Vertex;
                vTexCoord = rm_TexCoord0;
            }`;

        this.fragmentShaderCode = `#version 300 es
            precision mediump float;
            uniform sampler2D sTexture;

            in mediump vec2 vTexCoord;
            out vec4 fragColor;

            void main(void) {
                fragColor = texture(sTexture, vTexCoord);
                // fragColor.r = 1.; // FIXME
            }`;
    }

    fillUniformsAttributes() {
        this.viewMatrix = this.getUniform("viewMatrix");
        this.projMatrix = this.getUniform("projMatrix");
        this.modelMatrix = this.getAttrib("modelMatrix");

        this.sTexture = this.getUniform("sTexture");
        this.rm_TexCoord0 = this.getAttrib("rm_TexCoord0");
        this.rm_Vertex = this.getAttrib("rm_Vertex");
    }

    constructor(gl: WebGLRenderingContext | WebGL2RenderingContext) {
        super(gl);

        this.extBvbi = this.gl.getExtension("WEBGL_draw_instanced_base_vertex_base_instance");
    }

    /** @inheritdoc */
    drawModel(
        renderer: RendererWithExposedMethods,
        model: FullModel,
        bufferMatrices: WebGLBuffer
    ): void {
        if (this.rm_Vertex === undefined
            || this.rm_TexCoord0 === undefined
            || this.modelMatrix === undefined
        ) {
            return;
        }

        const gl = this.gl as WebGL2RenderingContext;

        model.bindBuffers(gl);

        gl.enableVertexAttribArray(this.rm_Vertex);
        gl.enableVertexAttribArray(this.rm_TexCoord0);
        gl.vertexAttribPointer(this.rm_Vertex, 3, gl.HALF_FLOAT, false, 12, 0);
        gl.vertexAttribPointer(this.rm_TexCoord0, 2, gl.HALF_FLOAT, false, 12, 6);

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

        gl.uniformMatrix4fv(this.viewMatrix!, false, renderer.getViewMatrix());
        gl.uniformMatrix4fv(this.projMatrix!, false, renderer.getProjectionMatrix());
        gl.drawElements(gl.TRIANGLES, model.getNumIndices() * 3, gl.UNSIGNED_SHORT, 0);

        // Reset attrib divisor for matrix attribs
        for (let i = 0; i < 4; ++i) {
            const loc = this.modelMatrix + i;
            gl.vertexAttribDivisor(loc, 0);
        }

        renderer.checkGlError("VertexLitInstancedShader glDrawElements");
    }

    drawAllInstances(
        renderer: RendererWithExposedMethods,
        model: FullModel,
        bufferMatrices: WebGLBuffer,
        instances: number
    ): void {
        if (this.rm_Vertex === undefined
            || this.rm_TexCoord0 === undefined
            || this.modelMatrix === undefined
        ) {
            return;
        }

        const gl = renderer.gl as WebGL2RenderingContext;

        model.bindBuffers(gl);

        gl.enableVertexAttribArray(this.rm_Vertex);
        gl.enableVertexAttribArray(this.rm_TexCoord0);

        gl.vertexAttribPointer(this.rm_Vertex, 3, gl.HALF_FLOAT, false, 12, 0);
        gl.vertexAttribPointer(this.rm_TexCoord0, 2, gl.HALF_FLOAT, false, 12, 6);

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
        gl.drawElementsInstanced(gl.TRIANGLES, model.getNumIndices() * 3, gl.UNSIGNED_SHORT, 0, instances);

        // Reset attrib divisor for matrix attribs
        for (let i = 0; i < 4; ++i) {
            const loc = this.modelMatrix + i;
            gl.vertexAttribDivisor(loc, 0);
        }

        renderer.checkGlError("InstancedShader drawAllInstances");
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
            || this.modelMatrix === undefined
            || !this.extBvbi
        ) {
            return;
        }

        const gl = renderer.gl as WebGL2RenderingContext;

        model.bindBuffers(gl);

        gl.enableVertexAttribArray(this.rm_Vertex);
        gl.enableVertexAttribArray(this.rm_TexCoord0);

        gl.vertexAttribPointer(this.rm_Vertex, 3, gl.HALF_FLOAT, false, 12, 0);
        gl.vertexAttribPointer(this.rm_TexCoord0, 2, gl.HALF_FLOAT, false, 12, 6);

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
