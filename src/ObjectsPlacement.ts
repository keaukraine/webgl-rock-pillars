import { RendererWithExposedMethods } from "webgl-framework/dist/types/RendererWithExposedMethods";
import { CameraPositionInterpolator } from "./CameraPositionInterpolator";
import { mat4 } from "gl-matrix";

const mainRadius = 120;
const spikeLength1 = 16;
const spikeLength2 = 3;
const numSpikesXY1 = 7;
const numSpikesXY2 = 19;
const numSpikesZ1 = 4;
const numSpikesZ2 = 8;
const splineAmplitudeZ1 = 1;
const splineAmplitudeZ2 = 3;
const cameraHeightOffset = 7;

const matrixTemp = mat4.create();

const calculateModelMatrix = (tx: number, ty: number, tz: number, rx: number, ry: number, rz: number, sx: number, sy: number, sz: number) => {
    mat4.identity(matrixTemp);
    mat4.rotate(matrixTemp, matrixTemp, 0, [1, 0, 0]);
    mat4.translate(matrixTemp, matrixTemp, [tx, ty, tz]);
    mat4.scale(matrixTemp, matrixTemp, [sx, sy, sz]);
    mat4.rotateX(matrixTemp, matrixTemp, rx);
    mat4.rotateY(matrixTemp, matrixTemp, ry);
    mat4.rotateZ(matrixTemp, matrixTemp, rz);
}

const transientSplinePosition: [number, number, number] = [0, 0, 0];
export function positionOnSpline(i: number, radiusOffset: number, out?: number[]): [number, number, number] {
    const a = Math.PI * 2 * i;
    const a2 = a * numSpikesXY1;
    const a3 = a * numSpikesXY2;
    const a4 = a * numSpikesZ1;
    const a5 = a * numSpikesZ2;

    let radius = mainRadius + spikeLength1 * Math.sin(a2) + spikeLength2 * Math.sin(a3);
    radius += radiusOffset;

    let z = splineAmplitudeZ1 * Math.sin(a4) + splineAmplitudeZ2 * Math.sin(a5);
    z += cameraHeightOffset;

    transientSplinePosition[0] = Math.sin(a) * radius;
    transientSplinePosition[1] = Math.cos(a) * radius;
    transientSplinePosition[2] = z;

    if (out !== undefined) {
        out[0] = transientSplinePosition[0];
        out[1] = transientSplinePosition[1];
        out[2] = transientSplinePosition[2];
    }

    return transientSplinePosition;
};

export function addPositions(
    positions: number[][],
    instances: number,
    minDistance: number, offset: number
) {
    // this.positions = [];
    for (let i = 0; i < instances; i++) {
        let o = Math.random() - 0.5;
        if (o > 0 && o < minDistance) {
            o += minDistance;
        }
        if (o < 0 && o > -minDistance) {
            o -= minDistance;
        }
        const [x, y, z] = positionOnSpline(i / instances, o * offset);
        positions.push([x, y, z]);
    }
}

let positions: number[][] = [];

function initPositions(instances: number, minDistance: number, offset: number): [texture: Float32Array, instances: number, matrices: number[]] {
    positions = [];
    const matrices: number[][] = [];

    addPositions(positions, instances, minDistance, offset); // further from spline

    const texture = new Float32Array(positions.length * 6);
    for (let i = 0; i < positions.length; i++) {
        const [x, y, z] = positions[i];
        const scale = 0.003 + Math.random() * 0.003;
        // const scale = 0.06;
        texture[i * 3 + 0] = x; // translation X
        texture[i * 3 + 1] = y; // translation Y
        texture[i * 3 + 2] = scale; // scale
        const a = Math.random() * Math.PI * 2;
        texture[i * 3 + 0 + positions.length * 3] = Math.sin(a); // rotation sin
        texture[i * 3 + 1 + positions.length * 3] = Math.cos(a); // rotation cos
        texture[i * 3 + 2 + positions.length * 3] = 0;

        calculateModelMatrix(
            x, y, 0,
            0, 0, a,
            scale, scale, scale
        );
        // calculateModelMatrix(
        //     0, 0, 0,
        //     0, 0, a,
        //     1, 1, 1
        // );
        // mat4.identity(matrixTemp);
        matrices.push([...matrixTemp]);
    }

    return [
        texture,
        positions.length,
        (matrices as any).flat() // FIXME
    ];
}

const transientBirdsPosition: [number, number, number] = [0, 0, 0];
export function positionOnBirdsSpline(i: number): [number, number, number] {
    const a = Math.PI * 2 * i;
    const a2 = a * numSpikesXY1;
    const a3 = a * numSpikesXY2;
    const a4 = a * numSpikesZ1;
    const a5 = a * numSpikesZ2;

    const radius = mainRadius * 1.3;

    let z = splineAmplitudeZ1 * Math.sin(a4) + splineAmplitudeZ2 * Math.sin(a5);
    z += 56;

    transientBirdsPosition[0] = Math.sin(a * 4) * radius;
    transientBirdsPosition[1] = Math.cos(a * 6) * radius;
    transientBirdsPosition[2] = z;
    return transientBirdsPosition;
};

export const [ROCKS1_TEXTURE, ROCKS1_COUNT] = initPositions(97, 0.7, 23);
export const [ROCKS2_TEXTURE, ROCKS2_COUNT] = initPositions(119, 0.72, 25);
export const [ROCKS3_TEXTURE, ROCKS3_COUNT] = initPositions(60, 0.75, 60); // outer, large, non-floating
export const [ROCKS4_TEXTURE, ROCKS4_COUNT] = initPositions(40, 0, 10); // central tall floating
export const [ROCKS5_TEXTURE, ROCKS5_COUNT] = initPositions(70, 0, 30); // central non-floating
export const [TREES_TEXTURE, TREES_COUNT, TREES_XFORM] = initPositions(1360, 0.0, 60);
export const [PARTICLES_TEXTURE, PARTICLES_COUNT] = initPositions(40, 0.0, 40);

const birds1 = new CameraPositionInterpolator();
birds1.reverse = true;
birds1.speed = 1000;
birds1.minDuration = 20000 / 1.3;
birds1.position = {
    start: {
        position: new Float32Array([-21.162155151367188, 257.8841247558594, 45]),
        rotation: new Float32Array([0.09479612112045288, 3.1140060424804688, 0])
    },
    end: {
        position: new Float32Array([13.270217895507812, -567.8276977539062, 47]),
        rotation: new Float32Array([0.09479612112045288, 3.1140060424804688, 0])
    },
};

const birds2 = new CameraPositionInterpolator();
birds2.reverse = true;
birds2.speed = 1000;
birds2.minDuration = 30000 / 1.3;
birds2.position = {
    start: {
        position: new Float32Array([-183.71414184570312, 99.32198333740234, 45]),
        rotation: new Float32Array([0.17399953305721283, 1.7340009212493896, 0])
    },
    end: {
        position: new Float32Array([181.34555053710938, 29.235549926757812, 51]),
        rotation: new Float32Array([0.17399953305721283, 1.7340009212493896, 0])
    },
};

const birds3 = new CameraPositionInterpolator();
birds3.reverse = true;
birds3.speed = 1000;
birds3.minDuration = 24000 / 1.3;
birds3.position = {
    start: {
        position: new Float32Array([-257.13592529296875, 193.58749389648438, 45]),
        rotation: new Float32Array([0.13199906051158905, 2.6340126991271973, 0])
    },
    end: {
        position: new Float32Array([88.29415893554688, -352.470458984375, 44]),
        rotation: new Float32Array([0.13199906051158905, 2.6340126991271973, 0])
    }
};

const birds4 = new CameraPositionInterpolator();
birds4.reverse = true;
birds4.speed = 1000;
birds4.minDuration = 22000 / 1.3;
birds4.position = {
    start: {
        position: new Float32Array([-167.41603088378906, -272.6703796386719, 44]),
        rotation: new Float32Array([0.09000006318092346, 0.9119994640350342, 0])
    },
    end: {
        position: new Float32Array([213.55006408691406, 31.966976165771484, 44]),
        rotation: new Float32Array([0.09000006318092346, 0.9119994640350342, 0])
    }
};

const birds5 = new CameraPositionInterpolator();
birds5.reverse = true;
birds5.speed = 1000;
birds5.minDuration = 27000 / 1.3;
birds5.position = {
    start: {
        position: new Float32Array([249.5919189453125, 274.224365234375, 45]),
        rotation: new Float32Array([0.12599891424179077, 4.177173137664795, 0])
    },
    end: {
        position: new Float32Array([-359.8509216308594, -126.64541625976562, 46]),
        rotation: new Float32Array([0.03599891439080238, 0.9239869713783264, 0])
    },
};

const birds6 = new CameraPositionInterpolator();
birds6.reverse = true;
birds6.speed = 1000;
birds6.minDuration = 28000 / 1.3;
birds6.position = {
    start: {
        position: new Float32Array([-293.573486328125, -56.97015380859375, 44]),
        rotation: new Float32Array([0.1500007063150406, 1.7520021200180054, 0])
    },
    end: {
        position: new Float32Array([204.3482666015625, -165.2449188232422, 44]),
        rotation: new Float32Array([0.1500007063150406, 1.7520021200180054, 0])
    }
};

export interface BirdPath {
    positionInterpolator: CameraPositionInterpolator;
    rotation: number;
}

export const BIRD_PATHS: BirdPath[] = [
    {
        positionInterpolator: birds1,
        rotation: 0
    },
    {
        positionInterpolator: birds2,
        rotation: 1.3
    },
    {
        positionInterpolator: birds3,
        rotation: 0.4
    },
    {
        positionInterpolator: birds4,
        rotation: 2.4
    },
    {
        positionInterpolator: birds5,
        rotation: 5.2
    },
    {
        positionInterpolator: birds6,
        rotation: 1.3
    },
];