import { BaseShader, FullModel } from "webgl-framework";
import { RendererWithExposedMethods } from "webgl-framework/dist/types/RendererWithExposedMethods";
import { InstancedShader } from "./InstancedShader";

export class InstancedColoredShader extends InstancedShader {
    // Uniforms are of type `WebGLUniformLocation`
    color: WebGLUniformLocation | undefined;

    fillCode() {
        super.fillCode();

        this.fragmentShaderCode = `#version 300 es
            precision mediump float;
            uniform sampler2D sTexture;

            in mediump vec2 vTexCoord;
            out vec4 fragColor;

            uniform vec4 color;

            void main(void) {
                fragColor = texture(sTexture, vTexCoord) * color;
            }`;
    }

    fillUniformsAttributes() {
        super.fillUniformsAttributes();

        this.color = this.getUniform("color");
    }
}
