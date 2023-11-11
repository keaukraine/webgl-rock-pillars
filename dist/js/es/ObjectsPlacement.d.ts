import { CameraPositionInterpolator } from "./CameraPositionInterpolator";
export declare function positionOnSpline(i: number, radiusOffset: number, out?: number[]): [number, number, number];
export declare function addPositions(positions: number[][], instances: number, minDistance: number, offset: number): void;
export declare function positionOnBirdsSpline(i: number): [number, number, number];
export declare const ROCKS1_TEXTURE: Float32Array, ROCKS1_COUNT: number;
export declare const ROCKS2_TEXTURE: Float32Array, ROCKS2_COUNT: number;
export declare const ROCKS3_TEXTURE: Float32Array, ROCKS3_COUNT: number;
export declare const ROCKS4_TEXTURE: Float32Array, ROCKS4_COUNT: number;
export declare const ROCKS5_TEXTURE: Float32Array, ROCKS5_COUNT: number;
export declare const TREES_TEXTURE: Float32Array, TREES_COUNT: number, TREES_XFORM: number[];
export declare const PARTICLES_TEXTURE: Float32Array, PARTICLES_COUNT: number;
export interface BirdPath {
    positionInterpolator: CameraPositionInterpolator;
    rotation: number;
}
export declare const BIRD_PATHS: BirdPath[];
