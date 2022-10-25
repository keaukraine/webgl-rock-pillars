"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FogAtShader = void 0;
const FogShader_1 = require("./FogShader");
class FogAtShader extends FogShader_1.FogShader {
    fillCode() {
        super.fillCode();
        this.fragmentShaderCode = `#version 300 es
            precision mediump float;
            uniform sampler2D sTexture;
            uniform vec4 color;

            in mediump vec2 vTexCoord;
            out vec4 fragColor;

            ${FogShader_1.FogShader.FOG_FRAGMENT_UNIFORMS_VARYINGS}

            void main(void)
            {
                ${FogShader_1.FogShader.FOG_FRAGMENT_MAIN}
                vec4 diffuse = texture(sTexture, vTexCoord) * color;
                if (diffuse.a < 0.5) {
                    discard;
                } else {
                    fragColor = mix(diffuse, fogColor, fogAmount);
                }
            }`;
    }
}
exports.FogAtShader = FogAtShader;
//# sourceMappingURL=FogAtShader.js.map