"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FogInstancedAtShader = void 0;
const FogInstancedShader_1 = require("./FogInstancedShader");
class FogInstancedAtShader extends FogInstancedShader_1.FogInstancedShader {
    fillCode() {
        super.fillCode();
        this.fragmentShaderCode = `#version 300 es
            precision mediump float;
            uniform sampler2D sTexture;
            uniform vec4 color;

            in mediump vec2 vTexCoord;
            out vec4 fragColor;

            ${FogInstancedShader_1.FogInstancedShader.FOG_FRAGMENT_UNIFORMS_VARYINGS}

            void main(void) {
                ${FogInstancedShader_1.FogInstancedShader.FOG_FRAGMENT_MAIN}
                vec4 diffuse = texture(sTexture, vTexCoord) * color;
                if (diffuse.a < 0.5) {
                    discard;
                } else {
                    fragColor = mix(diffuse, fogColor, fogAmount);
                }
            }`;
    }
}
exports.FogInstancedAtShader = FogInstancedAtShader;
//# sourceMappingURL=FogInstancedAtShader.js.map