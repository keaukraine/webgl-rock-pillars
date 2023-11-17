"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InstancedColoredShader = void 0;
const InstancedShader_1 = require("./InstancedShader");
class InstancedColoredShader extends InstancedShader_1.InstancedShader {
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
exports.InstancedColoredShader = InstancedColoredShader;
//# sourceMappingURL=InstancedColoredShader.js.map