import { BaseRenderer, FullModel, UncompressedTextureLoader, DiffuseShader, CombinedAnimation, TextureUtils, FrameBuffer } from "webgl-framework";
import { mat4, vec3 } from "gl-matrix";
import { CameraMode } from "./CameraMode";
import { BIRD_PATHS, positionOnSpline } from "./ObjectsPlacement";
import {
    PARTICLES_COUNT,
    PARTICLES_TEXTURE,
    ROCKS1_COUNT,
    ROCKS1_TEXTURE,
    ROCKS2_COUNT,
    ROCKS2_TEXTURE,
    ROCKS3_COUNT,
    ROCKS3_TEXTURE,
    ROCKS4_COUNT,
    ROCKS4_TEXTURE,
    ROCKS5_COUNT,
    ROCKS5_TEXTURE,
    TREES_COUNT,
    TREES_TEXTURE,
    TREES_XFORM
} from "./ObjectsPlacement";
import { FogShader } from "./shaders/FogShader";
import { FogAtShader } from "./shaders/FogAtShader";
import { SkyShader } from "./shaders/SkyShader";
import { BirdsShader } from "./shaders/BirdsShader";
import { FogVertexLitGrassShader } from "./shaders/FogVertexLitGrassShader";
import { FogSpriteShader } from "./shaders/FogSpriteShader";
import { InstancedShader } from "./shaders/InstancedShader";
import { InstancedColoredShader } from "./shaders/InstancedColoredShader";

const FOV_LANDSCAPE = 60.0; // FOV for landscape
const FOV_PORTRAIT = 70.0; // FOV for portrait
export class Renderer extends BaseRenderer {
    private lastTime = 0;

    private loaded = false;

    private fmSky = new FullModel();
    private fmRock1 = new FullModel();
    private fmRock1Grass = new FullModel();
    private fmRock2 = new FullModel();
    private fmRock2Grass = new FullModel();
    private fmRock3 = new FullModel();
    private fmRock3Grass = new FullModel();
    private fmTree = new FullModel();
    private fmBird = new FullModel();
    private fmSmoke = new FullModel();

    private noTextures = false;
    private noGlare = false;

    private textureOffscreenColor: WebGLTexture | null = null;
    private textureOffscreenDepth: WebGLTexture | null = null;

    private textureRocksPositions1: WebGLTexture | null = null;
    private textureRocksPositions2: WebGLTexture | null = null;
    private textureRocksPositions3: WebGLTexture | null = null;
    private textureRocksPositions4: WebGLTexture | null = null;
    private textureRocksPositions5: WebGLTexture | null = null;
    private textureTreesPositions: WebGLTexture | null = null;
    private textureRocks: WebGLTexture | undefined;
    private textureTrees: WebGLTexture | undefined;
    private textureFogCubemap: WebGLTexture | undefined;
    private textureBirds: WebGLTexture | undefined;
    private textureGrass: WebGLTexture | undefined;
    private textureFern: WebGLTexture | undefined;
    private textureCloud: WebGLTexture | undefined;
    private textureWhite: WebGLTexture | undefined;

    private bufferTreesMatrices: WebGLBuffer | null = null;

    private fboOffscreen: FrameBuffer | undefined;

    private mQuadTriangles: Float32Array | undefined;
    private mTriangleVerticesVignette: WebGLBuffer | undefined;

    private shaderDiffuse: DiffuseShader | undefined;

    private shaderFogAt: FogAtShader | undefined;
    private shaderSky: SkyShader | undefined;
    private shaderBirds: BirdsShader | undefined;
    private shaderFogVertexLitGrass: FogVertexLitGrassShader | undefined;
    private shaderFogSprite: FogSpriteShader | undefined;

    private shaderInstanced: InstancedShader | undefined;
    private shaderInstancedColored: InstancedColoredShader | undefined;

    private animationBird = new CombinedAnimation(5);

    private customCamera: mat4 | undefined;

    private Z_NEAR = 2.0;
    private Z_FAR = 1100.0;
    private SMOKE_SOFTNESS = 0.012;

    private timerCamera = 0;
    private SPLINE_CAMERA_PERIOD = 166000;
    private timerFogThickness = 0;
    private FOG_THICKNESS_PERIOD = 42000;
    private timerBirdAnimation1 = 0;
    private BIRD_ANIMATION_PERIOD1 = 1200;
    private timerRocksMovement = 0;
    private ROCKS_MOVEMENT_PERIOD = 8000;

    private fogStartDistance = 0;

    private currentPreset = 2;
    private PRESETS = [
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

    private cameraMode = CameraMode.Rotating;

    protected matViewInverted = mat4.create();
    protected matViewInvertedTransposed = mat4.create();
    protected matTemp = mat4.create();
    protected cameraPosition = vec3.create();
    protected cameraRotation = vec3.create();

    protected tmpPosition1: [number, number, number] = [0, 0, 0];
    protected tmpPosition2: [number, number, number] = [0, 0, 0];
    protected tmpPosition3: [number, number, number] = [0, 0, 0];

    public config = {
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
    private v1 = vec3.create();
    private v2 = vec3.create();
    private v3 = vec3.create();

    private readyCallback: (() => void) | undefined;

    constructor() {
        super();
    }

    setCustomCamera(camera: mat4 | undefined, position?: vec3, rotation?: vec3) {
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

    onBeforeInit(): void {
    }

    onAfterInit(): void {
    }

    onInitError(): void {
        document.getElementById("canvasGL")?.classList.add("hidden");
        document.getElementById("alertError")?.classList.remove("hidden");
    }

    initShaders(): void {
        this.shaderDiffuse = new DiffuseShader(this.gl);
        this.shaderFogVertexLitGrass = new FogVertexLitGrassShader(this.gl);
        this.shaderFogAt = new FogAtShader(this.gl);
        this.shaderSky = new SkyShader(this.gl);
        this.shaderBirds = new BirdsShader(this.gl);
        this.shaderFogSprite = new FogSpriteShader(this.gl);

        this.shaderInstanced = new InstancedShader(this.gl);
        this.shaderInstancedColored = new InstancedColoredShader(this.gl);
    }

    protected loadFp32Texture(
        data: ArrayBuffer,
        gl: WebGL2RenderingContext,
        width: number,
        height: number,
        minFilter = gl.LINEAR,
        magFilter = gl.LINEAR,
        clamp = false,
        numberOfComponents = 3
    ): WebGLTexture {
        const texture = gl.createTexture();

        if (texture === null) {
            throw new Error("Error creating WebGL texture");
        }

        let internalFormat = gl.RGB32F;
        let format = gl.RGB;
        if (numberOfComponents === 2) {
            internalFormat = gl.RG32F;
            format = gl.RG;
        } else if (numberOfComponents === 1) {
            internalFormat = gl.R32F;
            format = gl.RED;
        } else if (numberOfComponents === 4) {
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
        } else {
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
        }
        this.checkGlError("loadFp32Texture 2");
        gl.bindTexture(gl.TEXTURE_2D, null);

        return texture;
    }

    async loadData(): Promise<void> {
        const preset = this.PRESETS[this.currentPreset];

        this.initOffscreen();
        this.initVignette();

        const gl = this.gl as WebGL2RenderingContext;

        await Promise.all([
            this.fmSky.load("data/models/sky", this.gl),
            this.fmRock1.load("data/models/rock-8", this.gl), // pillar
            this.fmRock2.load("data/models/rock-11", this.gl), // narrow
            this.fmRock3.load("data/models/rock-6", this.gl), // wide
            this.fmTree.load("data/models/pinetree", this.gl),
            this.fmBird.load("data/models/bird-anim-uv", this.gl),
            this.fmRock1Grass.load("data/models/rock-8-grass", this.gl),
            this.fmRock2Grass.load("data/models/rock-11-grass", this.gl),
            this.fmRock3Grass.load("data/models/rock-6-grass", this.gl),
            this.fmSmoke.load("data/models/cloud", this.gl),
        ]);

        const loadPositionsTexture = (texture: Float32Array, count: number) => this.loadFp32Texture(
            texture,
            this.gl as WebGL2RenderingContext,
            count, 2,
            this.gl.NEAREST, this.gl.NEAREST,
            true,
            3
        );

        this.textureRocksPositions1 = loadPositionsTexture(ROCKS1_TEXTURE, ROCKS1_COUNT);
        this.textureRocksPositions2 = loadPositionsTexture(ROCKS2_TEXTURE, ROCKS2_COUNT);
        this.textureRocksPositions3 = loadPositionsTexture(ROCKS3_TEXTURE, ROCKS3_COUNT);
        this.textureRocksPositions4 = loadPositionsTexture(ROCKS4_TEXTURE, ROCKS4_COUNT);
        this.textureRocksPositions5 = loadPositionsTexture(ROCKS5_TEXTURE, ROCKS5_COUNT);
        this.textureTreesPositions = loadPositionsTexture(TREES_TEXTURE, TREES_COUNT);

        // console.log(TREES_XFORM);
        this.bufferTreesMatrices = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.bufferTreesMatrices);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(TREES_XFORM), gl.STATIC_DRAW);

        [
            this.textureRocks,
            this.textureTrees,
            this.textureFogCubemap,
            this.textureBirds,
            this.textureGrass,
            this.textureFern,
            this.textureCloud,
            this.textureWhite
        ] = await Promise.all([
            UncompressedTextureLoader.load("data/textures/rocks.webp", this.gl, undefined, undefined, true),
            UncompressedTextureLoader.load("data/textures/pine_leaves.webp", this.gl, undefined, undefined, true),
            UncompressedTextureLoader.loadCubemap(`data/textures/cubemaps/${preset.cubemap}/sky`, this.gl as WebGL2RenderingContext, "webp"),
            UncompressedTextureLoader.load("data/textures/bird2.webp", this.gl, undefined, undefined, true),
            UncompressedTextureLoader.load("data/textures/grass.webp", this.gl, undefined, undefined, false),
            UncompressedTextureLoader.load("data/textures/fern.webp", this.gl, undefined, undefined, false),
            UncompressedTextureLoader.load("data/textures/smoke.webp", this.gl),
            UncompressedTextureLoader.load("data/textures/white.webp", this.gl, undefined, undefined, true)
        ]);

        this.generateMipmaps(
            this.textureRocks,
            this.textureTrees,
            this.textureGrass,
            this.textureFern,
            this.textureCloud,
            this.textureBirds
        );

        this.loaded = true;
        console.log("Loaded all assets");

        this.readyCallback?.();
    }

    initOffscreen(): void {
        if (this.canvas === undefined) {
            return;
        }

        if (this.textureOffscreenColor !== null) {
            this.gl.deleteTexture(this.textureOffscreenColor);
        }
        if (this.textureOffscreenDepth !== null) {
            this.gl.deleteTexture(this.textureOffscreenDepth);
        }

        this.textureOffscreenColor = TextureUtils.createNpotTexture(this.gl, this.canvas.width, this.canvas.height, false)!;
        this.textureOffscreenDepth = TextureUtils.createDepthTexture(this.gl, this.canvas.width, this.canvas.height)!;
        this.fboOffscreen = new FrameBuffer(this.gl);
        this.fboOffscreen.textureHandle = this.textureOffscreenColor;
        this.fboOffscreen.depthTextureHandle = this.textureOffscreenDepth;
        this.fboOffscreen.width = this.canvas.width;
        this.fboOffscreen.height = this.canvas.height;
        this.fboOffscreen.createGLData(this.canvas.width, this.canvas.height);
        this.checkGlError("offscreen FBO");
    }

    resizeCanvas(): void {
        if (this.canvas === undefined) {
            return;
        }

        const { width, height } = this.canvas;

        super.resizeCanvas();

        if (this.canvas.width != width || this.canvas.height != height) {
            this.initOffscreen();
        }
    }

    private initVignette() {
        mat4.ortho(this.matOrtho, -1, 1, -1, 1, 2.0, 250);

        this.mQuadTriangles = new Float32Array([
            // X, Y, Z, U, V
            -1.0, -1.0, -5.0, 0.0, 0.0, // 0. left-bottom
            1.0, -1.0, -5.0, 1.0, 0.0, // 1. right-bottom
            -1.0, 1.0, -5.0, 0.0, 1.0, // 2. left-top
            1.0, 1.0, -5.0, 1.0, 1.0, // 3. right-top
        ]);
        this.mTriangleVerticesVignette = this.gl.createBuffer()!;
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.mTriangleVerticesVignette);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, this.mQuadTriangles, this.gl.STATIC_DRAW);
    }

    async changeScene(preset?: number): Promise<void> {
        const newPreset = preset ?? (this.currentPreset + 1) % 4;
        const texture = await UncompressedTextureLoader.loadCubemap(`data/textures/cubemaps/${this.PRESETS[newPreset].cubemap}/sky`, this.gl as WebGL2RenderingContext, "webp");
        this.gl.deleteTexture(this.textureFogCubemap!);
        this.textureFogCubemap = texture;
        this.currentPreset = newPreset;
    }

    animate(): void {
        const timeNow = new Date().getTime();

        if (this.lastTime != 0) {
            this.timerCamera = this.cameraMode === CameraMode.Rotating
                ? (timeNow % this.SPLINE_CAMERA_PERIOD) / this.SPLINE_CAMERA_PERIOD
                : 0;
            this.timerFogThickness = (timeNow % this.FOG_THICKNESS_PERIOD) / this.FOG_THICKNESS_PERIOD;
            this.timerBirdAnimation1 = (timeNow % this.BIRD_ANIMATION_PERIOD1) / this.BIRD_ANIMATION_PERIOD1;
            this.timerRocksMovement = (timeNow % this.ROCKS_MOVEMENT_PERIOD) / this.ROCKS_MOVEMENT_PERIOD;
        }

        this.lastTime = timeNow;
    }

    /** Calculates projection matrix */
    setCameraFOV(multiplier: number): void {
        var ratio;

        if (this.gl.canvas.height > 0) {
            ratio = this.gl.canvas.width / this.gl.canvas.height;
        } else {
            ratio = 1.0;
        }

        let fov = 0;
        if (this.gl.canvas.width >= this.gl.canvas.height) {
            fov = FOV_LANDSCAPE * multiplier;
        } else {
            fov = FOV_PORTRAIT * multiplier;
        }

        this.setFOV(this.mProjMatrix, fov, ratio, this.Z_NEAR, this.Z_FAR);
    }

    /**
     * Calculates camera matrix.
     *
     * @param a Position in [0...1] range
     */
    private positionCamera(a: number) {
        if (this.customCamera !== undefined) {
            this.mVMatrix = this.customCamera;
            return;
        }

            positionOnSpline(a, 0, this.tmpPosition1);
            positionOnSpline(a + 0.02, 0, this.tmpPosition2);
            positionOnSpline(a + 0.0205, 0, this.tmpPosition3);

            this.cameraPosition[0] = this.tmpPosition1[0];
            this.cameraPosition[1] = this.tmpPosition1[1];
            this.cameraPosition[2] = this.tmpPosition1[2];

            vec3.sub(this.v1, this.tmpPosition2, this.tmpPosition1);
            vec3.sub(this.v2, this.tmpPosition3, this.tmpPosition1);
            vec3.normalize(this.v1, this.v1);
            vec3.normalize(this.v2, this.v2);
            vec3.cross(this.v3, this.v1, this.v2);

            mat4.lookAt(this.mVMatrix,
                this.tmpPosition1, // eye
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
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.fboOffscreen!.framebufferHandle);
        this.gl.viewport(0, 0, this.fboOffscreen!.width!, this.fboOffscreen!.height!);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

        this.drawOffscreenObjects();

        this.gl.clearColor(0, 0, 0, 0);
        if (this.cameraMode === CameraMode.Random) {
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

    protected drawTestDepth() {
        this.gl.enable(this.gl.CULL_FACE);
        this.gl.cullFace(this.gl.BACK);
        this.gl.disable(this.gl.BLEND);

        this.shaderDiffuse!.use();

        this.setTexture2D(0, this.textureOffscreenDepth!, this.shaderDiffuse!.sTexture!);
        this.drawVignette(this.shaderDiffuse!);
    }

    protected drawVignette(shader: DiffuseShader) {
        this.unbindBuffers();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.mTriangleVerticesVignette!);

        this.gl.enableVertexAttribArray(shader.rm_Vertex!);
        this.gl.vertexAttribPointer(shader.rm_Vertex!, 3, this.gl.FLOAT, false, 20, 0);
        this.gl.enableVertexAttribArray(shader.rm_TexCoord0!);
        this.gl.vertexAttribPointer(shader.rm_TexCoord0!, 2, this.gl.FLOAT, false, 20, 4 * 3);

        this.gl.uniformMatrix4fv(shader.view_proj_matrix!, false, this.getOrthoMatrix());
        this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
    }


    private drawOffscreenObjects(): void {
        this.drawRocks();
    }

    private drawSceneObjects(): void {
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

    private drawClouds(): void {
        if (this.shaderFogSprite === undefined) {
            console.log("undefined shaders");
            return;
        }

        const preset = this.PRESETS[this.currentPreset];

        this.gl.enable(this.gl.CULL_FACE);

        const shader = this.shaderFogSprite;
        shader.use();
        this.gl.uniform1f(shader.fogStartDistance!, this.fogStartDistance);
        this.gl.uniform1f(shader.fogDistance!, this.config.fogDistance);
        this.gl.uniform2f(shader.heightFogParams!, this.config.fogHeightOffset, this.config.fogHeightMultiplier);
        this.setTexture2D(0, this.textureCloud!, shader.sTexture!);
        this.gl.uniform4fv(shader.color!, preset.cloudsColor);

        this.gl.uniform2f(shader.cameraRange!, this.Z_NEAR, this.Z_FAR); // near and far clipping planes
        this.gl.uniform2f(shader.invViewportSize!, 1.0 / this.gl.canvas.width, 1.0 / this.gl.canvas.height); // inverted screen size
        this.gl.uniform1f(shader.transitionSize!, this.SMOKE_SOFTNESS);
        this.setTexture2D(1, this.textureOffscreenDepth!, shader.sDepth!);

        this.drawCloudModels(shader, this.fmSmoke, PARTICLES_TEXTURE, PARTICLES_COUNT, this.config.cloudsScale, 0, [0, 0, 12]);
    }

    private drawRocks(): void {
        if (this.shaderFogVertexLitGrass === undefined
            || this.shaderFogAt === undefined
            || this.shaderFogSprite === undefined
            || this.shaderDiffuse === undefined
            || this.shaderInstanced === undefined
        ) {
            console.log("undefined shaders");
            return;
        }

        const preset = this.PRESETS[this.currentPreset];

        this.gl.enable(this.gl.CULL_FACE);

        let shader: FogShader;

        // shader = this.shaderFogAt;
        // shader.use();
        // this.gl.uniform1f(shader.fogStartDistance!, this.fogStartDistance);
        // this.gl.uniform1f(shader.fogDistance!, this.config.fogDistance);
        // this.gl.uniform2f(shader.heightFogParams!, this.config.fogHeightOffset, this.config.fogHeightMultiplier);
        // this.setTexture2D(1, this.noTextures ? this.textureWhite! : this.textureTrees!, shader.sTexture!);
        // this.gl.uniformMatrix4fv(shader.view_matrix!, false, this.getViewMatrix());
        // this.setTextureCubemap(2, this.textureFogCubemap!, shader.texCubemap!);
        // this.gl.uniform2f(shader.heightOffset!, 0, -this.config.treesHeightOffset);
        // this.drawInstances(
        //     shader,
        //     this.fmTree, this.textureTreesPositions!, TREES_COUNT,
        //     [0.003, 0.003],
        //     [0, 0, 0]
        // );

        this.shaderInstanced.use();
        this.setTexture2D(1, this.noTextures ? this.textureWhite! : this.textureTrees!, this.shaderInstanced.sTexture!);
        // this.shaderInstanced.drawInstanced(this, this.fmTree, this.bufferTreesMatrices!, 0, TREES_COUNT);
        this.shaderInstanced.drawModel(this, this.fmTree, this.bufferTreesMatrices!);
        this.shaderInstanced.drawInstanced(this, this.fmTree, this.bufferTreesMatrices!, 0, TREES_COUNT);
        // TODO: use this.config.treesHeightOffset when generating tree matrices

        shader = this.shaderFogVertexLitGrass;
        shader.use();
        this.gl.uniform1f(shader.fogStartDistance!, this.fogStartDistance);
        this.gl.uniform1f(shader.fogDistance!, this.config.fogDistance);
        this.gl.uniform2f(shader.heightFogParams!, this.config.fogHeightOffset, this.config.fogHeightMultiplier);
        this.setTexture2D(1, this.noTextures ? this.textureWhite! : this.textureRocks!, shader.sTexture!);
        this.gl.uniformMatrix4fv(shader.view_matrix!, false, this.getViewMatrix());
        this.setTextureCubemap(2, this.textureFogCubemap!, shader.texCubemap!);
        this.gl.uniform4fv(this.shaderFogVertexLitGrass.colorSun!, preset.colorSun);
        this.gl.uniform4fv(this.shaderFogVertexLitGrass.lightDir!, preset.lightDir);
        this.gl.uniform1f(this.shaderFogVertexLitGrass.diffuseExponent!, this.config.diffuseExponent);
        this.gl.uniform1f(this.shaderFogVertexLitGrass.grassAmount!, this.config.grassAmount);
        this.setTexture2D(3, this.noTextures ? this.textureWhite! : this.textureGrass!, this.shaderFogVertexLitGrass.sTextureGrass!);

        this.gl.uniform2f(shader.heightOffset!, this.config.heightOffset, this.config.heightOffset * 0.25);
        this.drawInstances(
            shader,
            this.fmRock1, this.textureRocksPositions1!, ROCKS1_COUNT,
            [0.0055, 0.004]
        );
        this.drawInstances(
            shader,
            this.fmRock2, this.textureRocksPositions2!, ROCKS2_COUNT,
            [0.006, 0.004]
        );

        this.gl.uniform2f(shader.heightOffset!, 0, 0);
        this.drawInstances(
            shader,
            this.fmRock3, this.textureRocksPositions3!, ROCKS3_COUNT,
            [0.012, 0.004]
        );

        const floatingHeightOffset = 6 * Math.sin(this.timerRocksMovement * Math.PI * 2);
        this.gl.uniform2f(shader.heightOffset!, floatingHeightOffset, 34);
        this.drawInstances(
            shader,
            this.fmRock1, this.textureRocksPositions4!, ROCKS4_COUNT,
            [0.0055, 0.004]
        );
        this.gl.uniform2f(shader.heightOffset!, 0, -14);
        this.drawInstances(
            shader,
            this.fmRock1, this.textureRocksPositions5!, ROCKS5_COUNT,
            [0.0055, 0.004]
        );

        this.gl.disable(this.gl.CULL_FACE);

        shader = this.shaderFogAt;
        shader.use();
        this.gl.uniform1f(shader.fogStartDistance!, this.fogStartDistance);
        this.gl.uniform1f(shader.fogDistance!, this.config.fogDistance);
        this.gl.uniform2f(shader.heightFogParams!, this.config.fogHeightOffset, this.config.fogHeightMultiplier);
        this.gl.uniformMatrix4fv(shader.view_matrix!, false, this.getViewMatrix());
        this.setTextureCubemap(2, this.textureFogCubemap!, shader.texCubemap!);
        this.gl.uniform2f(shader.heightOffset!, 0, -this.config.treesHeightOffset);

        this.setTexture2D(1, this.noTextures ? this.textureWhite! : this.textureFern!, shader.sTexture!);
        this.gl.uniform2f(shader.heightOffset!, this.config.heightOffset, this.config.heightOffset * 0.25);
        this.drawInstances(
            shader,
            this.fmRock1Grass, this.textureRocksPositions1!, ROCKS1_COUNT,
            [0.0055, 0.004]
        );
        this.drawInstances(
            shader,
            this.fmRock2Grass, this.textureRocksPositions2!, ROCKS2_COUNT,
            [0.006, 0.004]
        );

        this.gl.uniform2f(shader.heightOffset!, 0, 0);
        this.drawInstances(
            shader,
            this.fmRock3Grass, this.textureRocksPositions3!, ROCKS3_COUNT,
            [0.012, 0.004]
        );

        this.gl.uniform2f(shader.heightOffset!, floatingHeightOffset, 34);
        this.drawInstances(
            shader,
            this.fmRock1Grass, this.textureRocksPositions4!, ROCKS4_COUNT,
            [0.0055, 0.004]
        );
        this.gl.uniform2f(shader.heightOffset!, 0, -14);
        this.drawInstances(
            shader,
            this.fmRock1Grass, this.textureRocksPositions5!, ROCKS5_COUNT,
            [0.0055, 0.004]
        );
    }

    private drawInstances(
        shader: FogShader,
        model: FullModel,
        texturePositions: WebGLTexture,
        instancesCount: number,
        scale: [number, number],
        translation: [number, number, number] | undefined = [0, 0, 0]
    ): void {
        const preset = this.PRESETS[this.currentPreset];

        this.setTexture2D(0, texturePositions, shader.sPositions!);
        this.gl.uniform4fv(shader.color!, preset.colorAmbient);
        this.gl.uniform2fv(shader.uScale!, scale);

        const start = Math.floor(instancesCount * (this.timerCamera - 0.05));
        const count = Math.floor(instancesCount * 0.25);

        if (start > 0 && start + count <= instancesCount) {
            shader.drawInstanced(
                this, model,
                translation[0], translation[1], translation[2],
                0, 0, 0,
                1, 1, 1,
                start, count
            );
        } else {
            if (start <= 0) {
                shader.drawInstanced(
                    this, model,
                    translation[0], translation[1], translation[2],
                    0, 0, 0,
                    1, 1, 1,
                    instancesCount + start, -start
                );
                shader.drawInstanced(
                    this, model,
                    translation[0], translation[1], translation[2],
                    0, 0, 0,
                    1, 1, 1,
                    0, count + start
                );
            } else {
                shader.drawInstanced(
                    this, model,
                    translation[0], translation[1], translation[2],
                    0, 0, 0,
                    1, 1, 1,
                    start, instancesCount - start
                );
                shader.drawInstanced(
                    this, model,
                    translation[0], translation[1], translation[2],
                    0, 0, 0,
                    1, 1, 1,
                    0, count - (instancesCount - start)
                );
            }
        }
    }

    private drawCloudModels(
        shader: FogSpriteShader,
        model: FullModel,
        positions: Float32Array,
        instancesCount: number,
        scale = 1,
        rotation = 0,
        translation: [number, number, number] | undefined = [0, 0, 0]
    ): void {
        const drawModel = (start: number, count: number) => {
            for (let i = start; i < start + count; i++) {
                const tx = positions[i * 3 + 0];
                const ty = positions[i * 3 + 1];
                const tz = positions[i * 3 + 2];
                this.drawDiffuseVBOFacingCamera(
                    shader, model,
                    tx + translation[0], ty + translation[1], tz + translation[2],
                    scale, scale, scale,
                    rotation
                );
            }
        }

        const start = Math.floor(instancesCount * (this.timerCamera - 0.05));
        const count = Math.floor(instancesCount * 0.25);

        if (start > 0 && start + count <= instancesCount) {
            drawModel(start, count);
        } else {
            if (start <= 0) {
                drawModel(instancesCount + start, -start);
                drawModel(0, count + start);
            } else {
                drawModel(start, instancesCount - start);
                drawModel(0, count - (instancesCount - start));
            }
        }
    }

    private drawBirds(): void {
        const preset = this.PRESETS[this.currentPreset];

        this.shaderBirds!.use();
        this.setTexture2D(0, this.noTextures ? this.textureWhite! : this.textureBirds!, this.shaderBirds!.msTextureHandle!);
        this.setTextureCubemap(1, this.textureFogCubemap!, this.shaderBirds!.texCubemap!);
        this.gl.uniform1f(this.shaderBirds!.fogStartDistance!, this.fogStartDistance);
        this.gl.uniform1f(this.shaderBirds!.fogDistance!, this.config.fogDistance);
        this.gl.uniform2f(this.shaderBirds!.heightFogParams!, this.config.fogHeightOffset, this.config.fogHeightMultiplier);
        this.gl.uniformMatrix4fv(this.shaderBirds!.view_matrix!, false, this.getViewMatrix());
        this.gl.uniform4fv(this.shaderBirds!.color!, preset.colorSun);

        const timeNow = new Date().getTime();
        for (let i = 0; i < BIRD_PATHS.length; i++) {
            const { positionInterpolator, rotation } = BIRD_PATHS[i];
            positionInterpolator.iterate(timeNow);
            if (positionInterpolator.timer > 0.99) {
                positionInterpolator.reset();
            }

            this.drawBirdsFlock(9,
                positionInterpolator.cameraPosition[0],
                positionInterpolator.cameraPosition[1],
                positionInterpolator.cameraPosition[2] - 20,
                rotation,
                0.4,
                1
            );
        }
    }

    private drawBirdsFlock(count: number, x: number, y: number, z: number, r: number, scale: number, seed: number): void {
        this.animationBird.animate(this.timerBirdAnimation1);
        this.gl.uniform2f(this.shaderBirds!.uSeed!, 1.1 * seed, 2.2 * seed);
        this.shaderBirds?.drawInstanced(
            this,
            this.fmBird,
            this.animationBird.getFramesCount(), this.animationBird.getStart(), this.animationBird.getEnd(), this.animationBird.getCurrentCoeff(),
            x, y, z,
            0, 0, r,
            scale, scale, scale,
            count
        );

        this.animationBird.animate((this.timerBirdAnimation1 + 0.3) % 1.0);
        this.gl.uniform2f(this.shaderBirds!.uSeed!, 12.5 * seed, 13.5 * seed);
        this.shaderBirds?.drawInstanced(
            this,
            this.fmBird,
            this.animationBird.getFramesCount(), this.animationBird.getStart(), this.animationBird.getEnd(), this.animationBird.getCurrentCoeff(),
            x, y, z,
            0, 0, r,
            scale, scale, scale,
            count
        );
    }

    private drawSkyObject() {
        if (this.shaderSky === undefined) {
            return;
        }

        this.shaderSky.use();
        this.setTextureCubemap(0, this.textureFogCubemap!, this.shaderSky.texCubemap!);
        this.shaderSky.drawModel(
            this,
            this.fmSky,
            0, 0, 0,
            0, 0, 0,
            1, 1, 1
        );
    }

    public toggleGlare(): void {
        this.noGlare = !this.noGlare;
    }

    public changeCameraMode(): void {
        if (this.cameraMode === CameraMode.Random) {
            this.cameraMode = CameraMode.Rotating
        } else {
            this.cameraMode = CameraMode.Random;
        }
    }

    public checkGlError(operation: string): void {
        // Do nothing in production build.
    }

    public set ready(callback: () => void) {
        this.readyCallback = callback;
    }

    private drawDiffuseVBOFacingCamera(shader: FogSpriteShader, model: FullModel, tx: number, ty: number, tz: number, sx: number, sy: number, sz: number, rotation: number) {
        model.bindBuffers(this.gl);

        this.gl.enableVertexAttribArray(shader.rm_Vertex!);
        this.gl.enableVertexAttribArray(shader.rm_TexCoord0!);
        this.gl.vertexAttribPointer(shader.rm_Vertex!, 3, this.gl.FLOAT, false, 4 * (3 + 2), 0);
        this.gl.vertexAttribPointer(shader.rm_TexCoord0!, 2, this.gl.FLOAT, false, 4 * (3 + 2), 4 * 3);

        this.calculateMVPMatrixForSprite(tx, ty, tz, sx, sy, sz, rotation);

        this.gl.uniformMatrix4fv(shader.view_proj_matrix!, false, this.mMVPMatrix);
        this.gl.uniformMatrix4fv(shader.model_matrix!, false, this.getModelMatrix());
        this.gl.drawElements(this.gl.TRIANGLES, model.getNumIndices() * 3, this.gl.UNSIGNED_SHORT, 0);
        this.checkGlError("glDrawElements");
    }

    public calculateMVPMatrixForSprite(tx: number, ty: number, tz: number, sx: number, sy: number, sz: number, rotation: number) {
        mat4.identity(this.mMMatrix);
        mat4.translate(this.mMMatrix, this.mMMatrix, [tx, ty, tz]);
        mat4.scale(this.mMMatrix, this.mMMatrix, [sx, sy, sz]);
        mat4.multiply(this.mMVPMatrix, this.mVMatrix, this.mMMatrix);
        this.resetMatrixRotations(this.mMVPMatrix);
        mat4.rotateZ(this.mMVPMatrix, this.mMVPMatrix, rotation);
        mat4.multiply(this.mMVPMatrix, this.mProjMatrix, this.mMVPMatrix);
    }

    private resetMatrixRotations(matrix: mat4) {
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
