import { BaseShader, FullModel } from "webgl-framework";
import { RendererWithExposedMethods } from "webgl-framework/dist/types/RendererWithExposedMethods";

export class InstancedShader extends BaseShader {
    // Uniforms are of type `WebGLUniformLocation`
    viewMatrix: WebGLUniformLocation | undefined;
    projMatrix: WebGLUniformLocation | undefined;
    sTexture: WebGLUniformLocation | undefined;

    modelMatrix: number | undefined;
    rm_Vertex: number | undefined;
    rm_TexCoord0: number | undefined;

    protected extBVBI: any;

    static readonly COMMON_UNIFORMS_ATTRIBUTES = `
    uniform mat4 viewMatrix;
    uniform mat4 projMatrix;
    in mat4 modelMatrix;
    `;

    static readonly COMMON_TRANSFORMS = `
    // mat4 view_proj_matrix = modelMatrix * viewMatrix * projMatrix;
    // mat4 view_proj_matrix = viewMatrix * modelMatrix * projMatrix; // as in calculateMVPMatrix()
    mat4 view_proj_matrix = projMatrix * viewMatrix * modelMatrix;
    // gl_Position = ProjectionMatrix * ViewMatrix * ModelMatrix * vec4(position, 1.0);
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

        this.extBVBI = this.gl.getExtension("WEBGL_multi_draw_instanced_base_vertex_base_instance");
        // TODO: https://registry.khronos.org/webgl/extensions/WEBGL_multi_draw_instanced_base_vertex_base_instance/
    }

    /** @inheritdoc */
    drawModel(
        renderer: RendererWithExposedMethods,
        model: FullModel,
        bufferMatrices: WebGLBuffer
    ): void {
        // throw new Error("Not implemented");
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
        // gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
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
            // TODO: this also breaks rendering of all other (non-instanced) objects
        }

        // gl.vertexAttribDivisor(this.rm_Vertex, 0);
        // gl.vertexAttribDivisor(this.rm_TexCoord0, 0);

        // renderer.calculateMVPMatrix(0, 0, 0, 0, 0, 0, 1, 1, 1);

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
            || !this.extBVBI
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

        // gl.drawElementsInstanced(gl.TRIANGLES, model.getNumIndices() * 3, gl.UNSIGNED_SHORT, 0, instances);

        let counts = new Int32Array([model.getNumIndices() * 3]);
        let offsets = new Int32Array([0]);
        let instanceCounts = new Int32Array([instances]);
        let baseVertices = new Int32Array([0]);
        let baseInstances = new Uint32Array([baseInstance]);
        this.extBVBI.multiDrawElementsInstancedBaseVertexBaseInstanceWEBGL(
            gl.TRIANGLES, counts, 0, gl.UNSIGNED_SHORT,
            offsets, 0, instanceCounts, 0, baseVertices, 0, baseInstances, 0,
            counts.length);

        // Reset attrib divisor for matrix attribs
        for (let i = 0; i < 4; ++i) {
            const loc = this.modelMatrix + i;
            gl.vertexAttribDivisor(loc, 0);
        }

        renderer.checkGlError("InstancedShader glDrawElements");
    }
}
