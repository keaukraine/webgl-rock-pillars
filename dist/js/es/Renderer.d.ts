import { BaseRenderer, DiffuseShader } from "webgl-framework";
import { mat4, vec3 } from "gl-matrix";
export declare class Renderer extends BaseRenderer {
    private lastTime;
    private loaded;
    private fmSky;
    private fmRock1;
    private fmRock1Grass;
    private fmRock2;
    private fmRock2Grass;
    private fmRock3;
    private fmRock3Grass;
    private fmTree;
    private fmBird;
    private fmSmoke;
    private noTextures;
    private noGlare;
    private textureOffscreenColor;
    private textureOffscreenDepth;
    private textureRocksPositions1;
    private textureRocksPositions2;
    private textureRocksPositions3;
    private textureRocksPositions4;
    private textureRocksPositions5;
    private textureTreesPositions;
    private textureRocks;
    private textureTrees;
    private textureFogCubemap;
    private textureBirds;
    private textureGrass;
    private textureFern;
    private textureCloud;
    private textureWhite;
    private bufferTreesMatrices;
    private fboOffscreen;
    private mQuadTriangles;
    private mTriangleVerticesVignette;
    private shaderDiffuse;
    private shaderFogAt;
    private shaderSky;
    private shaderBirds;
    private shaderFogVertexLitGrass;
    private shaderFogSprite;
    private shaderInstanced;
    private shaderInstancedColored;
    private shaderInstancedFog;
    private shaderInstancedFogAt;
    private animationBird;
    private customCamera;
    private Z_NEAR;
    private Z_FAR;
    private SMOKE_SOFTNESS;
    private timerCamera;
    private SPLINE_CAMERA_PERIOD;
    private timerFogThickness;
    private FOG_THICKNESS_PERIOD;
    private timerBirdAnimation1;
    private BIRD_ANIMATION_PERIOD1;
    private timerRocksMovement;
    private ROCKS_MOVEMENT_PERIOD;
    private fogStartDistance;
    private currentPreset;
    private PRESETS;
    private cameraMode;
    protected matViewInverted: mat4;
    protected matViewInvertedTransposed: mat4;
    protected matTemp: mat4;
    protected cameraPosition: vec3;
    protected cameraRotation: vec3;
    protected tmpPosition1: [number, number, number];
    protected tmpPosition2: [number, number, number];
    protected tmpPosition3: [number, number, number];
    config: {
        fogStartDistance: number;
        fogDistance: number;
        fogHeightOffset: number;
        fogHeightMultiplier: number;
        heightOffset: number;
        treesHeightOffset: number;
        lightDir: number[];
        diffuseExponent: number;
        grassAmount: number;
        cloudsColor: number[];
        cloudsScale: number;
        preset: number;
    };
    private v1;
    private v2;
    private v3;
    private readyCallback;
    constructor();
    setCustomCamera(camera: mat4 | undefined, position?: vec3, rotation?: vec3): void;
    resetCustomCamera(): void;
    onBeforeInit(): void;
    onAfterInit(): void;
    onInitError(): void;
    initShaders(): void;
    protected loadFp32Texture(data: ArrayBuffer, gl: WebGL2RenderingContext, width: number, height: number, minFilter?: number, magFilter?: number, clamp?: boolean, numberOfComponents?: number): WebGLTexture;
    loadData(): Promise<void>;
    initOffscreen(): void;
    resizeCanvas(): void;
    private initVignette;
    changeScene(preset?: number): Promise<void>;
    animate(): void;
    /** Calculates projection matrix */
    setCameraFOV(multiplier: number): void;
    /**
     * Calculates camera matrix.
     *
     * @param a Position in [0...1] range
     */
    private positionCamera;
    /** Issues actual draw calls */
    drawScene(): void;
    protected drawTestDepth(): void;
    protected drawVignette(shader: DiffuseShader): void;
    private drawOffscreenObjects;
    private drawSceneObjects;
    private drawClouds;
    private drawRocks;
    private drawInstances;
    private drawCloudModels;
    private drawBirds;
    private drawBirdsFlock;
    private drawSkyObject;
    toggleGlare(): void;
    changeCameraMode(): void;
    checkGlError(operation: string): void;
    set ready(callback: () => void);
    private drawDiffuseVBOFacingCamera;
    calculateMVPMatrixForSprite(tx: number, ty: number, tz: number, sx: number, sy: number, sz: number, rotation: number): void;
    private resetMatrixRotations;
}
