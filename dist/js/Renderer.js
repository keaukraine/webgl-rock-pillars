"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Renderer = void 0;
const webgl_framework_1 = require("webgl-framework");
const gl_matrix_1 = require("gl-matrix");
const CameraMode_1 = require("./CameraMode");
const ObjectsPlacement_1 = require("./ObjectsPlacement");
const ObjectsPlacement_2 = require("./ObjectsPlacement");
const FogAtShader_1 = require("./shaders/FogAtShader");
const SkyShader_1 = require("./shaders/SkyShader");
const BirdsShader_1 = require("./shaders/BirdsShader");
const FogVertexLitGrassShader_1 = require("./shaders/FogVertexLitGrassShader");
const FogSpriteShader_1 = require("./shaders/FogSpriteShader");
const FogInstancedAtShader_1 = require("./shaders/FogInstancedAtShader");
const FogInstancedVertexLitGrassShader_1 = require("./shaders/FogInstancedVertexLitGrassShader");
const FOV_LANDSCAPE = 60.0; // FOV for landscape
const FOV_PORTRAIT = 70.0; // FOV for portrait
class Renderer extends webgl_framework_1.BaseRenderer {
    constructor() {
        super();
        this.lastTime = 0;
        this.loaded = false;
        this.fmSky = new webgl_framework_1.FullModel();
        this.fmRock1 = new webgl_framework_1.FullModel();
        this.fmRock1Grass = new webgl_framework_1.FullModel();
        this.fmRock2 = new webgl_framework_1.FullModel();
        this.fmRock2Grass = new webgl_framework_1.FullModel();
        this.fmRock3 = new webgl_framework_1.FullModel();
        this.fmRock3Grass = new webgl_framework_1.FullModel();
        this.fmTree = new webgl_framework_1.FullModel();
        this.fmBird = new webgl_framework_1.FullModel();
        this.fmSmoke = new webgl_framework_1.FullModel();
        this.noTextures = false;
        this.noGlare = false;
        this.textureOffscreenColor = null;
        this.textureOffscreenDepth = null;
        this.textureRocksPositions1 = null;
        this.textureRocksPositions2 = null;
        this.textureRocksPositions3 = null;
        this.textureRocksPositions4 = null;
        this.textureRocksPositions5 = null;
        this.textureTreesPositions = null;
        this.bufferTreesMatrices = null;
        this.bufferRocks1Matrices = null;
        this.bufferRocks2Matrices = null;
        this.bufferRocks3Matrices = null;
        this.bufferRocks4Matrices = null;
        this.bufferRocks5Matrices = null;
        this.animationBird = new webgl_framework_1.CombinedAnimation(5);
        this.Z_NEAR = 2.0;
        this.Z_FAR = 1100.0;
        this.SMOKE_SOFTNESS = 0.012;
        this.timerCamera = 0;
        this.SPLINE_CAMERA_PERIOD = 166000;
        this.timerFogThickness = 0;
        this.FOG_THICKNESS_PERIOD = 42000;
        this.timerBirdAnimation1 = 0;
        this.BIRD_ANIMATION_PERIOD1 = 1200;
        this.timerRocksMovement = 0;
        this.ROCKS_MOVEMENT_PERIOD = 8000;
        this.fogStartDistance = 0;
        this.currentPreset = 2;
        this.PRESETS = [
            {
                name: "Sunrise",
                cubemap: "sunrise1",
                lightDir: [0.0, 1.0, 0.0, 1.0],
                diffuseExponent: 0.025,
                cloudsColor: [0.17, 0.17, 0.17, 1.0],
                colorSun: [255 / 255, 167 / 255, 53 / 255, 1.0],
                colorAmbient: [93 / 255, 81 / 255, 112 / 255, 1.0]
            },
            {
                name: "Day",
                cubemap: "day1",
                lightDir: [0.0, 1.0, 0.0, 1.0],
                diffuseExponent: 0.025,
                cloudsColor: [0.17, 0.17, 0.17, 1.0],
                colorSun: [255 / 255, 255 / 255, 255 / 255, 1.0],
                colorAmbient: [61 / 255, 95 / 255, 156 / 255, 1.0]
            },
            {
                name: "Sunset",
                cubemap: "sunset1",
                lightDir: [0.0, 1.0, 0.0, 1.0],
                diffuseExponent: 0.025,
                cloudsColor: [0.17, 0.17, 0.17, 1.0],
                colorSun: [1, 0.78, 0.2, 1],
                colorAmbient: [0.43, 0.45, 0.47, 1]
            },
            {
                name: "Night",
                cubemap: "night1",
                lightDir: [0.0, 1.0, 0.0, 1.0],
                diffuseExponent: 0.025,
                cloudsColor: [24 / 255, 28 / 255, 34 / 255, 1.0],
                colorSun: [44 / 255, 60 / 255, 93 / 255, 1.0],
                colorAmbient: [37 / 255, 42 / 255, 51 / 255, 1.0]
            }
        ];
        this.cameraMode = CameraMode_1.CameraMode.Rotating;
        this.matViewInverted = gl_matrix_1.mat4.create();
        this.matViewInvertedTransposed = gl_matrix_1.mat4.create();
        this.matTemp = gl_matrix_1.mat4.create();
        this.cameraPosition = gl_matrix_1.vec3.create();
        this.cameraRotation = gl_matrix_1.vec3.create();
        this.tmpPosition1 = [0, 0, 0];
        this.tmpPosition2 = [0, 0, 0];
        this.tmpPosition3 = [0, 0, 0];
        this.config = {
            fogStartDistance: 70,
            fogDistance: 50,
            fogHeightOffset: 2.0,
            fogHeightMultiplier: 0.08,
            heightOffset: 10,
            treesHeightOffset: 5.2,
            lightDir: [0.0, 1.0, 0.0, 1.0],
            diffuseExponent: 0.025,
            grassAmount: 1.5,
            cloudsColor: [0.17, 0.17, 0.17, 1.0],
            cloudsScale: 0.3,
            preset: 2
        };
        // Preallocated temp vectors
        this.v1 = gl_matrix_1.vec3.create();
        this.v2 = gl_matrix_1.vec3.create();
        this.v3 = gl_matrix_1.vec3.create();
    }
    setCustomCamera(camera, position, rotation) {
        this.customCamera = camera;
        if (position !== undefined) {
            this.cameraPosition = position;
        }
        if (rotation !== undefined) {
            this.cameraRotation = rotation;
        }
    }
    resetCustomCamera() {
        this.customCamera = undefined;
    }
    onBeforeInit() {
    }
    onAfterInit() {
    }
    onInitError() {
        var _a, _b;
        (_a = document.getElementById("canvasGL")) === null || _a === void 0 ? void 0 : _a.classList.add("hidden");
        (_b = document.getElementById("alertError")) === null || _b === void 0 ? void 0 : _b.classList.remove("hidden");
    }
    initShaders() {
        this.shaderDiffuse = new webgl_framework_1.DiffuseShader(this.gl);
        this.shaderFogVertexLitGrass = new FogVertexLitGrassShader_1.FogVertexLitGrassShader(this.gl);
        this.shaderFogAt = new FogAtShader_1.FogAtShader(this.gl);
        this.shaderSky = new SkyShader_1.SkyShader(this.gl);
        this.shaderBirds = new BirdsShader_1.BirdsShader(this.gl);
        this.shaderFogSprite = new FogSpriteShader_1.FogSpriteShader(this.gl);
        this.extBvbi = this.gl.getExtension("WEBGL_multi_draw_instanced_base_vertex_base_instance");
        if (this.extBvbi) {
            console.log("Base vertex base index is available.");
            this.shaderInstancedFogAt = new FogInstancedAtShader_1.FogInstancedAtShader(this.gl);
            this.shaderInstancedRocks = new FogInstancedVertexLitGrassShader_1.FogInstancedVertexLitGrassShader(this.gl);
        }
    }
    loadFp32Texture(data, gl, width, height, minFilter = gl.LINEAR, magFilter = gl.LINEAR, clamp = false, numberOfComponents = 3) {
        const texture = gl.createTexture();
        if (texture === null) {
            throw new Error("Error creating WebGL texture");
        }
        let internalFormat = gl.RGB32F;
        let format = gl.RGB;
        if (numberOfComponents === 2) {
            internalFormat = gl.RG32F;
            format = gl.RG;
        }
        else if (numberOfComponents === 1) {
            internalFormat = gl.R32F;
            format = gl.RED;
        }
        else if (numberOfComponents === 4) {
            internalFormat = gl.RGBA32F;
            format = gl.RGBA;
        }
        const dataView = new Float32Array(data);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        this.checkGlError("loadFp32Texture 0");
        gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
        // gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB16F, width, height, 0, gl.RGB, gl.HALF_FLOAT, dataView);
        // gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, width, height, 0, format, gl.HALF_FLOAT, dataView);
        gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, width, height, 0, format, gl.FLOAT, dataView);
        this.checkGlError("loadFp32Texture 1");
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, minFilter);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, magFilter);
        if (clamp === true) {
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        }
        else {
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
        }
        this.checkGlError("loadFp32Texture 2");
        gl.bindTexture(gl.TEXTURE_2D, null);
        return texture;
    }
    loadData() {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const preset = this.PRESETS[this.currentPreset];
            this.initOffscreen();
            this.initVignette();
            const gl = this.gl;
            yield Promise.all([
                this.fmSky.load("data/models/sky", this.gl),
                this.fmRock1.load("data/models/rock-8", this.gl),
                this.fmRock2.load("data/models/rock-11", this.gl),
                this.fmRock3.load("data/models/rock-6", this.gl),
                this.fmTree.load("data/models/pinetree", this.gl),
                this.fmBird.load("data/models/bird-anim-uv", this.gl),
                this.fmRock1Grass.load("data/models/rock-8-grass", this.gl),
                this.fmRock2Grass.load("data/models/rock-11-grass", this.gl),
                this.fmRock3Grass.load("data/models/rock-6-grass", this.gl),
                this.fmSmoke.load("data/models/cloud", this.gl),
            ]);
            const loadPositionsTexture = (texture, count) => this.loadFp32Texture(texture, this.gl, count, 2, this.gl.NEAREST, this.gl.NEAREST, true, 3);
            if (this.extBvbi) {
                this.bufferTreesMatrices = gl.createBuffer();
                gl.bindBuffer(gl.ARRAY_BUFFER, this.bufferTreesMatrices);
                gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(ObjectsPlacement_2.TREES_XFORM), gl.STATIC_DRAW);
                this.bufferRocks1Matrices = gl.createBuffer();
                gl.bindBuffer(gl.ARRAY_BUFFER, this.bufferRocks1Matrices);
                gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(ObjectsPlacement_1.ROCKS1_XFORM), gl.STATIC_DRAW);
                this.bufferRocks2Matrices = gl.createBuffer();
                gl.bindBuffer(gl.ARRAY_BUFFER, this.bufferRocks2Matrices);
                gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(ObjectsPlacement_1.ROCKS2_XFORM), gl.STATIC_DRAW);
                this.bufferRocks3Matrices = gl.createBuffer();
                gl.bindBuffer(gl.ARRAY_BUFFER, this.bufferRocks3Matrices);
                gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(ObjectsPlacement_1.ROCKS3_XFORM), gl.STATIC_DRAW);
                this.bufferRocks4Matrices = gl.createBuffer();
                gl.bindBuffer(gl.ARRAY_BUFFER, this.bufferRocks4Matrices);
                gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(ObjectsPlacement_1.ROCKS4_XFORM), gl.STATIC_DRAW);
                this.bufferRocks5Matrices = gl.createBuffer();
                gl.bindBuffer(gl.ARRAY_BUFFER, this.bufferRocks5Matrices);
                gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(ObjectsPlacement_1.ROCKS5_XFORM), gl.STATIC_DRAW);
            }
            else {
                this.textureRocksPositions1 = loadPositionsTexture(ObjectsPlacement_2.ROCKS1_TEXTURE, ObjectsPlacement_2.ROCKS1_COUNT);
                this.textureRocksPositions2 = loadPositionsTexture(ObjectsPlacement_2.ROCKS2_TEXTURE, ObjectsPlacement_2.ROCKS2_COUNT);
                this.textureRocksPositions3 = loadPositionsTexture(ObjectsPlacement_2.ROCKS3_TEXTURE, ObjectsPlacement_2.ROCKS3_COUNT);
                this.textureRocksPositions4 = loadPositionsTexture(ObjectsPlacement_2.ROCKS4_TEXTURE, ObjectsPlacement_2.ROCKS4_COUNT);
                this.textureRocksPositions5 = loadPositionsTexture(ObjectsPlacement_2.ROCKS5_TEXTURE, ObjectsPlacement_2.ROCKS5_COUNT);
                this.textureTreesPositions = loadPositionsTexture(ObjectsPlacement_2.TREES_TEXTURE, ObjectsPlacement_2.TREES_COUNT);
            }
            [
                this.textureRocks,
                this.textureTrees,
                this.textureFogCubemap,
                this.textureBirds,
                this.textureGrass,
                this.textureFern,
                this.textureCloud,
                this.textureWhite
            ] = yield Promise.all([
                webgl_framework_1.UncompressedTextureLoader.load("data/textures/rocks.webp", this.gl, undefined, undefined, true),
                webgl_framework_1.UncompressedTextureLoader.load("data/textures/pine_leaves.webp", this.gl, undefined, undefined, true),
                webgl_framework_1.UncompressedTextureLoader.loadCubemap(`data/textures/cubemaps/${preset.cubemap}/sky`, this.gl, "webp"),
                webgl_framework_1.UncompressedTextureLoader.load("data/textures/bird2.webp", this.gl, undefined, undefined, true),
                webgl_framework_1.UncompressedTextureLoader.load("data/textures/grass.webp", this.gl, undefined, undefined, false),
                webgl_framework_1.UncompressedTextureLoader.load("data/textures/fern.webp", this.gl, undefined, undefined, false),
                webgl_framework_1.UncompressedTextureLoader.load("data/textures/smoke.webp", this.gl),
                webgl_framework_1.UncompressedTextureLoader.load("data/textures/white.webp", this.gl, undefined, undefined, true)
            ]);
            this.generateMipmaps(this.textureRocks, this.textureTrees, this.textureGrass, this.textureFern, this.textureCloud, this.textureBirds);
            this.loaded = true;
            console.log("Loaded all assets");
            (_a = this.readyCallback) === null || _a === void 0 ? void 0 : _a.call(this);
        });
    }
    initOffscreen() {
        if (this.canvas === undefined) {
            return;
        }
        if (this.textureOffscreenColor !== null) {
            this.gl.deleteTexture(this.textureOffscreenColor);
        }
        if (this.textureOffscreenDepth !== null) {
            this.gl.deleteTexture(this.textureOffscreenDepth);
        }
        this.textureOffscreenColor = webgl_framework_1.TextureUtils.createNpotTexture(this.gl, this.canvas.width, this.canvas.height, false);
        this.textureOffscreenDepth = webgl_framework_1.TextureUtils.createDepthTexture(this.gl, this.canvas.width, this.canvas.height);
        this.fboOffscreen = new webgl_framework_1.FrameBuffer(this.gl);
        this.fboOffscreen.textureHandle = this.textureOffscreenColor;
        this.fboOffscreen.depthTextureHandle = this.textureOffscreenDepth;
        this.fboOffscreen.width = this.canvas.width;
        this.fboOffscreen.height = this.canvas.height;
        this.fboOffscreen.createGLData(this.canvas.width, this.canvas.height);
        this.checkGlError("offscreen FBO");
    }
    resizeCanvas() {
        if (this.canvas === undefined) {
            return;
        }
        const { width, height } = this.canvas;
        super.resizeCanvas();
        if (this.canvas.width != width || this.canvas.height != height) {
            this.initOffscreen();
        }
    }
    initVignette() {
        gl_matrix_1.mat4.ortho(this.matOrtho, -1, 1, -1, 1, 2.0, 250);
        this.mQuadTriangles = new Float32Array([
            // X, Y, Z, U, V
            -1.0, -1.0, -5.0, 0.0, 0.0,
            1.0, -1.0, -5.0, 1.0, 0.0,
            -1.0, 1.0, -5.0, 0.0, 1.0,
            1.0, 1.0, -5.0, 1.0, 1.0, // 3. right-top
        ]);
        this.mTriangleVerticesVignette = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.mTriangleVerticesVignette);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, this.mQuadTriangles, this.gl.STATIC_DRAW);
    }
    changeScene(preset) {
        return __awaiter(this, void 0, void 0, function* () {
            const newPreset = preset !== null && preset !== void 0 ? preset : (this.currentPreset + 1) % 4;
            const texture = yield webgl_framework_1.UncompressedTextureLoader.loadCubemap(`data/textures/cubemaps/${this.PRESETS[newPreset].cubemap}/sky`, this.gl, "webp");
            this.gl.deleteTexture(this.textureFogCubemap);
            this.textureFogCubemap = texture;
            this.currentPreset = newPreset;
        });
    }
    animate() {
        const timeNow = new Date().getTime();
        if (this.lastTime != 0) {
            this.timerCamera = this.cameraMode === CameraMode_1.CameraMode.Rotating
                ? (timeNow % this.SPLINE_CAMERA_PERIOD) / this.SPLINE_CAMERA_PERIOD
                : 0;
            this.timerFogThickness = (timeNow % this.FOG_THICKNESS_PERIOD) / this.FOG_THICKNESS_PERIOD;
            this.timerBirdAnimation1 = (timeNow % this.BIRD_ANIMATION_PERIOD1) / this.BIRD_ANIMATION_PERIOD1;
            this.timerRocksMovement = (timeNow % this.ROCKS_MOVEMENT_PERIOD) / this.ROCKS_MOVEMENT_PERIOD;
        }
        this.lastTime = timeNow;
    }
    /** Calculates projection matrix */
    setCameraFOV(multiplier) {
        var ratio;
        if (this.gl.canvas.height > 0) {
            ratio = this.gl.canvas.width / this.gl.canvas.height;
        }
        else {
            ratio = 1.0;
        }
        let fov = 0;
        if (this.gl.canvas.width >= this.gl.canvas.height) {
            fov = FOV_LANDSCAPE * multiplier;
        }
        else {
            fov = FOV_PORTRAIT * multiplier;
        }
        this.setFOV(this.mProjMatrix, fov, ratio, this.Z_NEAR, this.Z_FAR);
    }
    /**
     * Calculates camera matrix.
     *
     * @param a Position in [0...1] range
     */
    positionCamera(a) {
        if (this.customCamera !== undefined) {
            this.mVMatrix = this.customCamera;
            return;
        }
        (0, ObjectsPlacement_1.positionOnSpline)(a, 0, this.tmpPosition1);
        (0, ObjectsPlacement_1.positionOnSpline)(a + 0.02, 0, this.tmpPosition2);
        (0, ObjectsPlacement_1.positionOnSpline)(a + 0.0205, 0, this.tmpPosition3);
        this.cameraPosition[0] = this.tmpPosition1[0];
        this.cameraPosition[1] = this.tmpPosition1[1];
        this.cameraPosition[2] = this.tmpPosition1[2];
        gl_matrix_1.vec3.sub(this.v1, this.tmpPosition2, this.tmpPosition1);
        gl_matrix_1.vec3.sub(this.v2, this.tmpPosition3, this.tmpPosition1);
        gl_matrix_1.vec3.normalize(this.v1, this.v1);
        gl_matrix_1.vec3.normalize(this.v2, this.v2);
        gl_matrix_1.vec3.cross(this.v3, this.v1, this.v2);
        gl_matrix_1.mat4.lookAt(this.mVMatrix, this.tmpPosition1, // eye
        this.tmpPosition2, // center
        [0, this.v3[2] * -6, 1] // up vector w/ banking
        );
    }
    /** Issues actual draw calls */
    drawScene() {
        if (!this.loaded) {
            return;
        }
        this.positionCamera(this.timerCamera);
        this.setCameraFOV(1.0);
        this.gl.clearColor(0, 0, 0, 0);
        this.gl.enable(this.gl.DEPTH_TEST);
        this.gl.enable(this.gl.CULL_FACE);
        this.gl.cullFace(this.gl.BACK);
        this.gl.colorMask(true, true, true, true);
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.fboOffscreen.framebufferHandle);
        this.gl.viewport(0, 0, this.fboOffscreen.width, this.fboOffscreen.height);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
        this.drawOffscreenObjects();
        this.gl.clearColor(0, 0, 0, 0);
        if (this.cameraMode === CameraMode_1.CameraMode.Random) {
            this.gl.clearColor(1.0, 0.0, 1.0, 1.0);
        }
        this.positionCamera(this.timerCamera);
        this.setCameraFOV(1.0);
        this.gl.colorMask(true, true, true, true);
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null); // This differs from OpenGL ES
        this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
        this.drawSceneObjects();
        // this.drawTestDepth();
    }
    drawTestDepth() {
        this.gl.enable(this.gl.CULL_FACE);
        this.gl.cullFace(this.gl.BACK);
        this.gl.disable(this.gl.BLEND);
        this.shaderDiffuse.use();
        this.setTexture2D(0, this.textureOffscreenDepth, this.shaderDiffuse.sTexture);
        this.drawVignette(this.shaderDiffuse);
    }
    drawVignette(shader) {
        this.unbindBuffers();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.mTriangleVerticesVignette);
        this.gl.enableVertexAttribArray(shader.rm_Vertex);
        this.gl.vertexAttribPointer(shader.rm_Vertex, 3, this.gl.FLOAT, false, 20, 0);
        this.gl.enableVertexAttribArray(shader.rm_TexCoord0);
        this.gl.vertexAttribPointer(shader.rm_TexCoord0, 2, this.gl.FLOAT, false, 20, 4 * 3);
        this.gl.uniformMatrix4fv(shader.view_proj_matrix, false, this.getOrthoMatrix());
        this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
    }
    drawOffscreenObjects() {
        this.drawRocks();
    }
    drawSceneObjects() {
        if (this.shaderDiffuse === undefined) {
            console.log("undefined shaders");
            return;
        }
        this.gl.cullFace(this.gl.BACK);
        this.gl.disable(this.gl.BLEND);
        this.fogStartDistance =
            this.config.fogStartDistance * 0.666 +
                0.333 * this.config.fogStartDistance * ((Math.sin(Math.PI * 2 * this.timerFogThickness) + 1) * 0.5);
        this.drawRocks();
        this.drawBirds();
        this.gl.enable(this.gl.CULL_FACE);
        this.drawSkyObject();
        this.gl.depthMask(false);
        this.gl.enable(this.gl.BLEND);
        this.gl.blendFunc(this.gl.ONE, this.gl.ONE);
        this.drawClouds();
        this.gl.disable(this.gl.BLEND);
        this.gl.depthMask(true);
    }
    drawClouds() {
        if (this.shaderFogSprite === undefined) {
            console.log("undefined shaders");
            return;
        }
        const preset = this.PRESETS[this.currentPreset];
        this.gl.enable(this.gl.CULL_FACE);
        const shader = this.shaderFogSprite;
        shader.use();
        this.gl.uniform1f(shader.fogStartDistance, this.fogStartDistance);
        this.gl.uniform1f(shader.fogDistance, this.config.fogDistance);
        this.gl.uniform2f(shader.heightFogParams, this.config.fogHeightOffset, this.config.fogHeightMultiplier);
        this.setTexture2D(0, this.textureCloud, shader.sTexture);
        this.gl.uniform4fv(shader.color, preset.cloudsColor);
        this.gl.uniform2f(shader.cameraRange, this.Z_NEAR, this.Z_FAR); // near and far clipping planes
        this.gl.uniform2f(shader.invViewportSize, 1.0 / this.gl.canvas.width, 1.0 / this.gl.canvas.height); // inverted screen size
        this.gl.uniform1f(shader.transitionSize, this.SMOKE_SOFTNESS);
        this.setTexture2D(1, this.textureOffscreenDepth, shader.sDepth);
        this.drawCloudModels(shader, this.fmSmoke, ObjectsPlacement_2.PARTICLES_TEXTURE, ObjectsPlacement_2.PARTICLES_COUNT, this.config.cloudsScale, 0, [0, 0, 12]);
    }
    drawRocks() {
        if (this.extBvbi) {
            this.drawRocksBvbi();
        }
        else {
            this.drawRocksWithTextures();
        }
    }
    drawRocksWithTextures() {
        if (this.shaderFogVertexLitGrass === undefined
            || this.shaderFogAt === undefined
            || this.shaderFogSprite === undefined
            || this.shaderDiffuse === undefined) {
            console.log("undefined shaders");
            return;
        }
        const preset = this.PRESETS[this.currentPreset];
        this.gl.enable(this.gl.CULL_FACE);
        let shader;
        shader = this.shaderFogAt;
        shader.use();
        this.gl.uniform1f(shader.fogStartDistance, this.fogStartDistance);
        this.gl.uniform1f(shader.fogDistance, this.config.fogDistance);
        this.gl.uniform2f(shader.heightFogParams, this.config.fogHeightOffset, this.config.fogHeightMultiplier);
        this.setTexture2D(1, this.noTextures ? this.textureWhite : this.textureTrees, shader.sTexture);
        this.gl.uniformMatrix4fv(shader.view_matrix, false, this.getViewMatrix());
        this.setTextureCubemap(2, this.textureFogCubemap, shader.texCubemap);
        this.gl.uniform2f(shader.heightOffset, 0, -this.config.treesHeightOffset);
        this.drawInstances(shader, this.fmTree, this.textureTreesPositions, ObjectsPlacement_2.TREES_COUNT, [0.003, 0.003], [0, 0, 0]);
        shader = this.shaderFogVertexLitGrass;
        shader.use();
        this.gl.uniform1f(shader.fogStartDistance, this.fogStartDistance);
        this.gl.uniform1f(shader.fogDistance, this.config.fogDistance);
        this.gl.uniform2f(shader.heightFogParams, this.config.fogHeightOffset, this.config.fogHeightMultiplier);
        this.setTexture2D(1, this.noTextures ? this.textureWhite : this.textureRocks, shader.sTexture);
        this.gl.uniformMatrix4fv(shader.view_matrix, false, this.getViewMatrix());
        this.setTextureCubemap(2, this.textureFogCubemap, shader.texCubemap);
        this.gl.uniform4fv(this.shaderFogVertexLitGrass.colorSun, preset.colorSun);
        this.gl.uniform4fv(this.shaderFogVertexLitGrass.lightDir, preset.lightDir);
        this.gl.uniform1f(this.shaderFogVertexLitGrass.diffuseExponent, this.config.diffuseExponent);
        this.gl.uniform1f(this.shaderFogVertexLitGrass.grassAmount, this.config.grassAmount);
        this.setTexture2D(3, this.noTextures ? this.textureWhite : this.textureGrass, this.shaderFogVertexLitGrass.sTextureGrass);
        this.gl.uniform2f(shader.heightOffset, this.config.heightOffset, this.config.heightOffset * 0.25);
        this.drawInstances(shader, this.fmRock1, this.textureRocksPositions1, ObjectsPlacement_2.ROCKS1_COUNT, [0.0055, 0.004]);
        this.drawInstances(shader, this.fmRock2, this.textureRocksPositions2, ObjectsPlacement_2.ROCKS2_COUNT, [0.006, 0.004]);
        this.gl.uniform2f(shader.heightOffset, 0, 0);
        this.drawInstances(shader, this.fmRock3, this.textureRocksPositions3, ObjectsPlacement_2.ROCKS3_COUNT, [0.012, 0.004]);
        const floatingHeightOffset = 6 * Math.sin(this.timerRocksMovement * Math.PI * 2);
        this.gl.uniform2f(shader.heightOffset, floatingHeightOffset, 34);
        this.drawInstances(shader, this.fmRock1, this.textureRocksPositions4, ObjectsPlacement_2.ROCKS4_COUNT, [0.0055, 0.004]);
        this.gl.uniform2f(shader.heightOffset, 0, -14);
        this.drawInstances(shader, this.fmRock1, this.textureRocksPositions5, ObjectsPlacement_2.ROCKS5_COUNT, [0.0055, 0.004]);
        this.gl.disable(this.gl.CULL_FACE);
        shader = this.shaderFogAt;
        shader.use();
        this.gl.uniform1f(shader.fogStartDistance, this.fogStartDistance);
        this.gl.uniform1f(shader.fogDistance, this.config.fogDistance);
        this.gl.uniform2f(shader.heightFogParams, this.config.fogHeightOffset, this.config.fogHeightMultiplier);
        this.gl.uniformMatrix4fv(shader.view_matrix, false, this.getViewMatrix());
        this.setTextureCubemap(2, this.textureFogCubemap, shader.texCubemap);
        this.gl.uniform2f(shader.heightOffset, 0, -this.config.treesHeightOffset);
        this.setTexture2D(1, this.noTextures ? this.textureWhite : this.textureFern, shader.sTexture);
        this.gl.uniform2f(shader.heightOffset, this.config.heightOffset, this.config.heightOffset * 0.25);
        this.drawInstances(shader, this.fmRock1Grass, this.textureRocksPositions1, ObjectsPlacement_2.ROCKS1_COUNT, [0.0055, 0.004]);
        this.drawInstances(shader, this.fmRock2Grass, this.textureRocksPositions2, ObjectsPlacement_2.ROCKS2_COUNT, [0.006, 0.004]);
        this.gl.uniform2f(shader.heightOffset, 0, 0);
        this.drawInstances(shader, this.fmRock3Grass, this.textureRocksPositions3, ObjectsPlacement_2.ROCKS3_COUNT, [0.012, 0.004]);
        this.gl.uniform2f(shader.heightOffset, floatingHeightOffset, 34);
        this.drawInstances(shader, this.fmRock1Grass, this.textureRocksPositions4, ObjectsPlacement_2.ROCKS4_COUNT, [0.0055, 0.004]);
        this.gl.uniform2f(shader.heightOffset, 0, -14);
        this.drawInstances(shader, this.fmRock1Grass, this.textureRocksPositions5, ObjectsPlacement_2.ROCKS5_COUNT, [0.0055, 0.004]);
    }
    drawRocksBvbi() {
        if (this.shaderInstancedRocks === undefined || this.shaderInstancedFogAt === undefined) {
            return;
        }
        const preset = this.PRESETS[this.currentPreset];
        this.gl.enable(this.gl.CULL_FACE);
        this.gl.disable(this.gl.CULL_FACE);
        this.shaderInstancedFogAt.use();
        this.gl.uniform1f(this.shaderInstancedFogAt.fogStartDistance, this.fogStartDistance);
        this.gl.uniform1f(this.shaderInstancedFogAt.fogDistance, this.config.fogDistance);
        this.gl.uniform2f(this.shaderInstancedFogAt.heightFogParams, this.config.fogHeightOffset, this.config.fogHeightMultiplier);
        this.setTexture2D(0, this.noTextures ? this.textureWhite : this.textureTrees, this.shaderInstancedFogAt.sTexture);
        this.setTextureCubemap(1, this.textureFogCubemap, this.shaderInstancedFogAt.texCubemap);
        this.gl.uniform2f(this.shaderInstancedFogAt.heightOffset, 0, -this.config.treesHeightOffset);
        this.gl.uniform4fv(this.shaderInstancedFogAt.color, preset.colorAmbient);
        this.drawInstances2(this.shaderInstancedFogAt, this.fmTree, this.bufferTreesMatrices, ObjectsPlacement_2.TREES_COUNT);
        this.gl.enable(this.gl.CULL_FACE);
        this.shaderInstancedRocks.use();
        this.gl.uniform1f(this.shaderInstancedRocks.fogStartDistance, this.fogStartDistance);
        this.gl.uniform1f(this.shaderInstancedRocks.fogDistance, this.config.fogDistance);
        this.gl.uniform2f(this.shaderInstancedRocks.heightFogParams, this.config.fogHeightOffset, this.config.fogHeightMultiplier);
        this.setTexture2D(0, this.noTextures ? this.textureWhite : this.textureRocks, this.shaderInstancedRocks.sTexture);
        this.setTextureCubemap(1, this.textureFogCubemap, this.shaderInstancedRocks.texCubemap);
        this.gl.uniform4fv(this.shaderInstancedRocks.colorSun, preset.colorSun);
        this.gl.uniform4fv(this.shaderInstancedRocks.color, preset.colorAmbient);
        this.gl.uniform4fv(this.shaderInstancedRocks.lightDir, preset.lightDir);
        this.gl.uniform1f(this.shaderInstancedRocks.diffuseExponent, this.config.diffuseExponent);
        this.gl.uniform1f(this.shaderInstancedRocks.grassAmount, this.config.grassAmount);
        this.setTexture2D(2, this.noTextures ? this.textureWhite : this.textureGrass, this.shaderInstancedRocks.sTextureGrass);
        this.gl.uniform2f(this.shaderInstancedRocks.heightOffset, this.config.heightOffset / 0.0055, this.config.heightOffset * 0.25);
        this.drawInstances2(this.shaderInstancedRocks, this.fmRock1, this.bufferRocks1Matrices, ObjectsPlacement_2.ROCKS1_COUNT);
        this.gl.uniform2f(this.shaderInstancedRocks.heightOffset, this.config.heightOffset / 0.006, this.config.heightOffset * 0.25);
        this.drawInstances2(this.shaderInstancedRocks, this.fmRock2, this.bufferRocks2Matrices, ObjectsPlacement_2.ROCKS2_COUNT);
        this.gl.uniform2f(this.shaderInstancedRocks.heightOffset, 0, 0);
        this.drawInstances2(this.shaderInstancedRocks, this.fmRock3, this.bufferRocks3Matrices, ObjectsPlacement_2.ROCKS3_COUNT);
        const floatingHeightOffset = 6 * Math.sin(this.timerRocksMovement * Math.PI * 2);
        this.gl.uniform2f(this.shaderInstancedRocks.heightOffset, floatingHeightOffset / 0.0055, 34);
        this.drawInstances2(this.shaderInstancedRocks, this.fmRock1, this.bufferRocks4Matrices, ObjectsPlacement_2.ROCKS4_COUNT);
        this.gl.uniform2f(this.shaderInstancedRocks.heightOffset, 0, -14);
        this.drawInstances2(this.shaderInstancedRocks, this.fmRock1, this.bufferRocks5Matrices, ObjectsPlacement_2.ROCKS5_COUNT);
        this.gl.disable(this.gl.CULL_FACE);
        this.shaderInstancedFogAt.use();
        this.gl.uniform1f(this.shaderInstancedFogAt.fogStartDistance, this.fogStartDistance);
        this.gl.uniform1f(this.shaderInstancedFogAt.fogDistance, this.config.fogDistance);
        this.gl.uniform2f(this.shaderInstancedFogAt.heightFogParams, this.config.fogHeightOffset, this.config.fogHeightMultiplier);
        this.setTexture2D(0, this.noTextures ? this.textureWhite : this.textureFern, this.shaderInstancedFogAt.sTexture);
        this.setTextureCubemap(1, this.textureFogCubemap, this.shaderInstancedFogAt.texCubemap);
        this.gl.uniform2f(this.shaderInstancedFogAt.heightOffset, 0, -this.config.treesHeightOffset);
        this.gl.uniform4fv(this.shaderInstancedFogAt.color, preset.colorAmbient);
        this.gl.uniform2f(this.shaderInstancedFogAt.heightOffset, this.config.heightOffset / 0.0055, this.config.heightOffset * 0.25);
        this.drawInstances2(this.shaderInstancedFogAt, this.fmRock1Grass, this.bufferRocks1Matrices, ObjectsPlacement_2.ROCKS1_COUNT);
        this.gl.uniform2f(this.shaderInstancedFogAt.heightOffset, this.config.heightOffset / 0.006, this.config.heightOffset * 0.25);
        this.drawInstances2(this.shaderInstancedFogAt, this.fmRock2Grass, this.bufferRocks2Matrices, ObjectsPlacement_2.ROCKS2_COUNT);
        this.gl.uniform2f(this.shaderInstancedFogAt.heightOffset, 0, 0);
        this.drawInstances2(this.shaderInstancedFogAt, this.fmRock3Grass, this.bufferRocks3Matrices, ObjectsPlacement_2.ROCKS3_COUNT);
        this.gl.uniform2f(this.shaderInstancedFogAt.heightOffset, floatingHeightOffset / 0.0055, 34);
        this.drawInstances2(this.shaderInstancedFogAt, this.fmRock1Grass, this.bufferRocks4Matrices, ObjectsPlacement_2.ROCKS4_COUNT);
        this.gl.uniform2f(this.shaderInstancedFogAt.heightOffset, 0, -14);
        this.drawInstances2(this.shaderInstancedFogAt, this.fmRock1Grass, this.bufferRocks5Matrices, ObjectsPlacement_2.ROCKS5_COUNT);
    }
    drawInstances(shader, model, texturePositions, instancesCount, scale, translation = [0, 0, 0]) {
        const preset = this.PRESETS[this.currentPreset];
        this.setTexture2D(0, texturePositions, shader.sPositions);
        this.gl.uniform4fv(shader.color, preset.colorAmbient);
        this.gl.uniform2fv(shader.uScale, scale);
        const start = Math.floor(instancesCount * (this.timerCamera - 0.05));
        const count = Math.floor(instancesCount * 0.25);
        if (start > 0 && start + count <= instancesCount) {
            shader.drawInstanced(this, model, translation[0], translation[1], translation[2], 0, 0, 0, 1, 1, 1, start, count);
        }
        else {
            if (start <= 0) {
                shader.drawInstanced(this, model, translation[0], translation[1], translation[2], 0, 0, 0, 1, 1, 1, instancesCount + start, -start);
                shader.drawInstanced(this, model, translation[0], translation[1], translation[2], 0, 0, 0, 1, 1, 1, 0, count + start);
            }
            else {
                shader.drawInstanced(this, model, translation[0], translation[1], translation[2], 0, 0, 0, 1, 1, 1, start, instancesCount - start);
                shader.drawInstanced(this, model, translation[0], translation[1], translation[2], 0, 0, 0, 1, 1, 1, 0, count - (instancesCount - start));
            }
        }
    }
    drawInstances2(shader, model, matrices, instancesCount) {
        const preset = this.PRESETS[this.currentPreset];
        // this.gl.uniform4fv(shader.color!, preset.colorAmbient);
        const start = Math.floor(instancesCount * (this.timerCamera - 0.05));
        const count = Math.floor(instancesCount * 0.25);
        if (start > 0 && start + count <= instancesCount) {
            shader.drawInstanced(this, model, matrices, start, count);
        }
        else {
            if (start <= 0) {
                shader.drawInstanced(this, model, matrices, instancesCount + start, -start);
                shader.drawInstanced(this, model, matrices, 0, count + start);
            }
            else {
                shader.drawInstanced(this, model, matrices, start, instancesCount - start);
                shader.drawInstanced(this, model, matrices, 0, count - (instancesCount - start));
            }
        }
    }
    drawCloudModels(shader, model, positions, instancesCount, scale = 1, rotation = 0, translation = [0, 0, 0]) {
        const drawModel = (start, count) => {
            for (let i = start; i < start + count; i++) {
                const tx = positions[i * 3 + 0];
                const ty = positions[i * 3 + 1];
                const tz = positions[i * 3 + 2];
                this.drawDiffuseVBOFacingCamera(shader, model, tx + translation[0], ty + translation[1], tz + translation[2], scale, scale, scale, rotation);
            }
        };
        const start = Math.floor(instancesCount * (this.timerCamera - 0.05));
        const count = Math.floor(instancesCount * 0.25);
        if (start > 0 && start + count <= instancesCount) {
            drawModel(start, count);
        }
        else {
            if (start <= 0) {
                drawModel(instancesCount + start, -start);
                drawModel(0, count + start);
            }
            else {
                drawModel(start, instancesCount - start);
                drawModel(0, count - (instancesCount - start));
            }
        }
    }
    drawBirds() {
        const preset = this.PRESETS[this.currentPreset];
        this.shaderBirds.use();
        this.setTexture2D(0, this.noTextures ? this.textureWhite : this.textureBirds, this.shaderBirds.msTextureHandle);
        this.setTextureCubemap(1, this.textureFogCubemap, this.shaderBirds.texCubemap);
        this.gl.uniform1f(this.shaderBirds.fogStartDistance, this.fogStartDistance);
        this.gl.uniform1f(this.shaderBirds.fogDistance, this.config.fogDistance);
        this.gl.uniform2f(this.shaderBirds.heightFogParams, this.config.fogHeightOffset, this.config.fogHeightMultiplier);
        this.gl.uniformMatrix4fv(this.shaderBirds.view_matrix, false, this.getViewMatrix());
        this.gl.uniform4fv(this.shaderBirds.color, preset.colorSun);
        const timeNow = new Date().getTime();
        for (let i = 0; i < ObjectsPlacement_1.BIRD_PATHS.length; i++) {
            const { positionInterpolator, rotation } = ObjectsPlacement_1.BIRD_PATHS[i];
            positionInterpolator.iterate(timeNow);
            if (positionInterpolator.timer > 0.99) {
                positionInterpolator.reset();
            }
            this.drawBirdsFlock(9, positionInterpolator.cameraPosition[0], positionInterpolator.cameraPosition[1], positionInterpolator.cameraPosition[2] - 20, rotation, 0.4, 1);
        }
    }
    drawBirdsFlock(count, x, y, z, r, scale, seed) {
        var _a, _b;
        this.animationBird.animate(this.timerBirdAnimation1);
        this.gl.uniform2f(this.shaderBirds.uSeed, 1.1 * seed, 2.2 * seed);
        (_a = this.shaderBirds) === null || _a === void 0 ? void 0 : _a.drawInstanced(this, this.fmBird, this.animationBird.getFramesCount(), this.animationBird.getStart(), this.animationBird.getEnd(), this.animationBird.getCurrentCoeff(), x, y, z, 0, 0, r, scale, scale, scale, count);
        this.animationBird.animate((this.timerBirdAnimation1 + 0.3) % 1.0);
        this.gl.uniform2f(this.shaderBirds.uSeed, 12.5 * seed, 13.5 * seed);
        (_b = this.shaderBirds) === null || _b === void 0 ? void 0 : _b.drawInstanced(this, this.fmBird, this.animationBird.getFramesCount(), this.animationBird.getStart(), this.animationBird.getEnd(), this.animationBird.getCurrentCoeff(), x, y, z, 0, 0, r, scale, scale, scale, count);
    }
    drawSkyObject() {
        if (this.shaderSky === undefined) {
            return;
        }
        this.shaderSky.use();
        this.setTextureCubemap(0, this.textureFogCubemap, this.shaderSky.texCubemap);
        this.shaderSky.drawModel(this, this.fmSky, 0, 0, 0, 0, 0, 0, 1, 1, 1);
    }
    toggleGlare() {
        this.noGlare = !this.noGlare;
    }
    changeCameraMode() {
        if (this.cameraMode === CameraMode_1.CameraMode.Random) {
            this.cameraMode = CameraMode_1.CameraMode.Rotating;
        }
        else {
            this.cameraMode = CameraMode_1.CameraMode.Random;
        }
    }
    checkGlError(operation) {
        // Do nothing in production build.
    }
    set ready(callback) {
        this.readyCallback = callback;
    }
    drawDiffuseVBOFacingCamera(shader, model, tx, ty, tz, sx, sy, sz, rotation) {
        model.bindBuffers(this.gl);
        this.gl.enableVertexAttribArray(shader.rm_Vertex);
        this.gl.enableVertexAttribArray(shader.rm_TexCoord0);
        this.gl.vertexAttribPointer(shader.rm_Vertex, 3, this.gl.FLOAT, false, 4 * (3 + 2), 0);
        this.gl.vertexAttribPointer(shader.rm_TexCoord0, 2, this.gl.FLOAT, false, 4 * (3 + 2), 4 * 3);
        this.calculateMVPMatrixForSprite(tx, ty, tz, sx, sy, sz, rotation);
        this.gl.uniformMatrix4fv(shader.view_proj_matrix, false, this.mMVPMatrix);
        this.gl.uniformMatrix4fv(shader.model_matrix, false, this.getModelMatrix());
        this.gl.drawElements(this.gl.TRIANGLES, model.getNumIndices() * 3, this.gl.UNSIGNED_SHORT, 0);
        this.checkGlError("glDrawElements");
    }
    calculateMVPMatrixForSprite(tx, ty, tz, sx, sy, sz, rotation) {
        gl_matrix_1.mat4.identity(this.mMMatrix);
        gl_matrix_1.mat4.translate(this.mMMatrix, this.mMMatrix, [tx, ty, tz]);
        gl_matrix_1.mat4.scale(this.mMMatrix, this.mMMatrix, [sx, sy, sz]);
        gl_matrix_1.mat4.multiply(this.mMVPMatrix, this.mVMatrix, this.mMMatrix);
        this.resetMatrixRotations(this.mMVPMatrix);
        gl_matrix_1.mat4.rotateZ(this.mMVPMatrix, this.mMVPMatrix, rotation);
        gl_matrix_1.mat4.multiply(this.mMVPMatrix, this.mProjMatrix, this.mMVPMatrix);
    }
    resetMatrixRotations(matrix) {
        const d = Math.sqrt(matrix[0] * matrix[0] + matrix[1] * matrix[1] + matrix[2] * matrix[2]);
        matrix[0] = d;
        matrix[4] = 0;
        matrix[8] = 0;
        matrix[1] = 0;
        matrix[5] = d;
        matrix[9] = 0;
        matrix[2] = 0;
        matrix[6] = 0;
        matrix[10] = d;
        matrix[3] = 0;
        matrix[7] = 0;
        matrix[11] = 0;
        matrix[15] = 1;
    }
}
exports.Renderer = Renderer;
//# sourceMappingURL=Renderer.js.map