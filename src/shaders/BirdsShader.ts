import { BaseShader, FullModel } from "webgl-framework";
import { RendererWithExposedMethods } from "webgl-framework/dist/types/RendererWithExposedMethods";
import { FogShader } from "./FogShader";
import { ShaderCommonFunctions } from "./ShaderCommonFunctions";

export class BirdsShader extends BaseShader {
    // Uniforms are of type `WebGLUniformLocation`
    muMVPMatrixHandle: WebGLUniformLocation | undefined;
    msTextureHandle: WebGLUniformLocation | undefined;
    mMHandle: WebGLUniformLocation | undefined;
    uSeed: WebGLUniformLocation | undefined;
    color: WebGLUniformLocation | undefined;

    // Attributes are numbers.
    maPosition1Handle: number | undefined;
    maPosition2Handle: number | undefined;
    maTextureHandle: number | undefined;

    fogStartDistance: WebGLUniformLocation | undefined;
    fogDistance: WebGLUniformLocation | undefined;
    heightFogParams: WebGLUniformLocation | undefined;

    view_matrix: WebGLUniformLocation | undefined;
    model_matrix: WebGLUniformLocation | undefined;
    texCubemap: WebGLUniformLocation | undefined;

    fillCode() {
        this.vertexShaderCode = `#version 300 es
            precision highp float;
            uniform highp mat4 uMVPMatrix;
            in highp vec4 aPosition1;
            in highp vec4 aPosition2;
            uniform float m;
            in highp vec2 aTextureCoord;
            out mediump vec2 vTextureCoord;
            uniform vec2 uSeed;

            ${FogShader.FOG_VERTEX_UNIFORMS_VARYINGS}
            out vec3 texCoord;
            uniform mat4 view_matrix;
            uniform mat4 model_matrix;
            ${ShaderCommonFunctions.RANDOM}

            void main() {
              float fInstance = float(gl_InstanceID);
              vec4 vertex = mix(aPosition1, aPosition2, m);
              float r1 = random(fInstance + uSeed.x);
              float r2 = random(fInstance + uSeed.y);
              vec3 translation = vec3(
                150. * r1,
                300. * r2,
                42. * r1
              );
              vertex.xyz += translation;
              gl_Position = uMVPMatrix * vertex;
              vTextureCoord = aTextureCoord;
              vertex = model_matrix * vertex;
              ${FogShader.FOG_VERTEX_MAIN}
            }`;

        this.fragmentShaderCode = `#version 300 es
            precision mediump float;
            in mediump vec2 vTextureCoord;
            uniform sampler2D sTexture;
            out vec4 fragColor;
            uniform vec4 color;
            ${FogShader.FOG_FRAGMENT_UNIFORMS_VARYINGS}

            void main() {
              ${FogShader.FOG_FRAGMENT_MAIN}
              vec4 base = texture(sTexture, vTextureCoord);
              if (base.a < 0.95) {
                discard;
              } else {
                fragColor = mix(base * color, fogColor, fogAmount);
              }
            }`;
    }

    fillUniformsAttributes() {
        this.maPosition1Handle = this.getAttrib("aPosition1");
        this.maPosition2Handle = this.getAttrib("aPosition2");
        this.maTextureHandle = this.getAttrib("aTextureCoord");
        this.muMVPMatrixHandle = this.getUniform("uMVPMatrix");
        this.msTextureHandle = this.getUniform("sTexture");
        this.mMHandle = this.getUniform("m");
        this.uSeed = this.getUniform("uSeed");
        this.color = this.getUniform("color");

        this.fogStartDistance = this.getUniform("fogStartDistance");
        this.fogDistance = this.getUniform("fogDistance");
        this.heightFogParams = this.getUniform("heightFogParams");
        this.view_matrix = this.getUniform("view_matrix");
        this.model_matrix = this.getUniform("model_matrix");
        this.texCubemap = this.getUniform("texCubemap");
    }

    private clamp(i: number, low: number, high: number): number {
        return Math.max(Math.min(i, high), low);
    }

    drawModel(renderer: RendererWithExposedMethods, model: FullModel, frames: number, frame1: number, frame2: number, m: number, tx: number, ty: number, tz: number, rx: number, ry: number, rz: number, sx: number, sy: number, sz: number): void {
        if (this.muMVPMatrixHandle === undefined || this.msTextureHandle === undefined || this.mMHandle === undefined || this.maPosition1Handle === undefined || this.maPosition2Handle === undefined || this.maTextureHandle === undefined) {
            return;
        }

        const gl = renderer.gl;

        model.bindBuffers(gl);

        const stride = (2 + frames * 3) * 4;
        const offsetUV = (frames * 3) * 4;

        gl.enableVertexAttribArray(this.maPosition1Handle);
        gl.enableVertexAttribArray(this.maPosition2Handle);
        gl.enableVertexAttribArray(this.maTextureHandle);

        gl.vertexAttribPointer(this.maPosition1Handle, 3, gl.FLOAT, false, stride, 3 * (frame1) * 4);
        gl.vertexAttribPointer(this.maPosition2Handle, 3, gl.FLOAT, false, stride, 3 * (frame2) * 4);
        gl.vertexAttribPointer(this.maTextureHandle, 2, gl.FLOAT, false, stride, offsetUV);

        renderer.calculateMVPMatrix(tx, ty, tz, rx, ry, rz, sx, sy, sz);
        gl.uniformMatrix4fv(this.muMVPMatrixHandle, false, renderer.getMVPMatrix());

        gl.uniform1f(this.mMHandle, this.clamp(m, 0.0, 1.0));

        gl.drawElements(gl.TRIANGLES, model.getNumIndices() * 3, gl.UNSIGNED_SHORT, 0);
        renderer.checkGlError("glDrawElements");
    }

    drawInstanced(renderer: RendererWithExposedMethods,
        model: FullModel,
        frames: number,
        frame1: number, frame2: number,
        m: number,
        tx: number, ty: number, tz: number,
        rx: number, ry: number, rz: number,
        sx: number, sy: number, sz: number,
        instances: number
    ): void {
        if (this.muMVPMatrixHandle === undefined || this.msTextureHandle === undefined || this.mMHandle === undefined || this.maPosition1Handle === undefined || this.maPosition2Handle === undefined || this.maTextureHandle === undefined) {
            return;
        }

        const gl = renderer.gl as WebGL2RenderingContext;

        model.bindBuffers(gl);

        const stride = (2 + frames * 3) * 4;
        const offsetUV = (frames * 3) * 4;

        gl.enableVertexAttribArray(this.maPosition1Handle);
        gl.enableVertexAttribArray(this.maPosition2Handle);
        gl.enableVertexAttribArray(this.maTextureHandle);

        gl.vertexAttribPointer(this.maPosition1Handle, 3, gl.FLOAT, false, stride, 3 * (frame1) * 4);
        gl.vertexAttribPointer(this.maPosition2Handle, 3, gl.FLOAT, false, stride, 3 * (frame2) * 4);
        gl.vertexAttribPointer(this.maTextureHandle, 2, gl.FLOAT, false, stride, offsetUV);

        renderer.calculateMVPMatrix(tx, ty, tz, rx, ry, rz, sx, sy, sz);
        gl.uniformMatrix4fv(this.muMVPMatrixHandle, false, renderer.getMVPMatrix());
        gl.uniformMatrix4fv(this.model_matrix!, false, renderer.getModelMatrix());

        gl.uniform1f(this.mMHandle, this.clamp(m, 0.0, 1.0));

        gl.drawElementsInstanced(gl.TRIANGLES, model.getNumIndices() * 3, gl.UNSIGNED_SHORT, 0, instances);
        renderer.checkGlError("glDrawElementsInstanced");
    }
}
