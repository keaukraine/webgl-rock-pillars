"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FogSpriteShader = void 0;
const webgl_framework_1 = require("webgl-framework");
const FogShader_1 = require("./FogShader");
class FogSpriteShader extends webgl_framework_1.DiffuseShader {
    fillCode() {
        super.fillCode();
        this.vertexShaderCode = `#version 300 es
            precision highp float;

            uniform mat4 view_proj_matrix;
            uniform mat4 view_matrix;
            uniform mat4 model_matrix;
            out vec3 texCoord;

            in vec2 rm_TexCoord0;
            in vec4 rm_Vertex;

            ${FogShader_1.FogShader.FOG_VERTEX_UNIFORMS_VARYINGS}

            void main(void)
            {
                vec4 vertex = model_matrix * rm_Vertex;
                gl_Position = view_proj_matrix * rm_Vertex;
                vTexCoord = rm_TexCoord0;
                ${FogShader_1.FogShader.FOG_VERTEX_MAIN}
            }`;
        this.fragmentShaderCode = `#version 300 es
            precision mediump float;
            uniform sampler2D sTexture;
            uniform vec4 color;

            in mediump vec2 vTexCoord;
            out vec4 fragColor;

            uniform vec2 uCameraRange;
            uniform vec2 uInvViewportSize;
            uniform float uTransitionSize;
            float calc_depth(in float z)
            {
              return (2.0 * uCameraRange.x) / (uCameraRange.y + uCameraRange.x - z*(uCameraRange.y - uCameraRange.x));
            }
            uniform sampler2D sDepth;
            const float NEAR_SMOOTH_FADE = 0.03;

            ${FogShader_1.FogShader.FOG_FRAGMENT_UNIFORMS_VARYINGS}

            void main(void)
            {
                vec2 coords = gl_FragCoord.xy * uInvViewportSize; // calculate depth texture coordinates
                float geometryZ = calc_depth(texture(sDepth, coords).r); // lineriarize particle depth
                float sceneZ = calc_depth(gl_FragCoord.z); // lineriarize scene depth
                float a = clamp(geometryZ - sceneZ, 0.0, 1.0); // linear clamped diff between scene and particle depth
                float b = smoothstep(0.0, uTransitionSize, a); // apply smoothstep to make soft transition

                ${FogShader_1.FogShader.FOG_AMOUNT_FRAGMENT}
                vec4 diffuse = texture(sTexture, vTexCoord).rrrr * color;
                b *= smoothstep(ZERO, NEAR_SMOOTH_FADE, sceneZ); // smooth fade out right before near clipping plane
                fragColor = diffuse * (ONE - fogAmount) * b;
            }`;
    }
    fillUniformsAttributes() {
        super.fillUniformsAttributes();
        this.fogStartDistance = this.getUniform("fogStartDistance");
        this.fogDistance = this.getUniform("fogDistance");
        this.heightFogParams = this.getUniform("heightFogParams");
        this.model_matrix = this.getUniform("model_matrix");
        this.color = this.getUniform("color");
        this.cameraRange = this.getUniform("uCameraRange");
        this.sDepth = this.getUniform("sDepth");
        this.invViewportSize = this.getUniform("uInvViewportSize");
        this.transitionSize = this.getUniform("uTransitionSize");
    }
}
exports.FogSpriteShader = FogSpriteShader;
//# sourceMappingURL=FogSpriteShader.js.map