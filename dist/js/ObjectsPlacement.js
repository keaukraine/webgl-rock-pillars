"use strict";
var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BIRD_PATHS = exports.TREES_COUNT = exports.TREES_TEXTURE = exports.ROCKS5_COUNT = exports.ROCKS5_TEXTURE = exports.ROCKS4_COUNT = exports.ROCKS4_TEXTURE = exports.ROCKS3_COUNT = exports.ROCKS3_TEXTURE = exports.ROCKS2_COUNT = exports.ROCKS2_TEXTURE = exports.ROCKS1_COUNT = exports.ROCKS1_TEXTURE = exports.TREES_XFORM = exports.ROCKS5_XFORM = exports.ROCKS4_XFORM = exports.ROCKS3_XFORM = exports.ROCKS2_XFORM = exports.ROCKS1_XFORM = exports.PARTICLES_COUNT = exports.PARTICLES_TEXTURE = exports.positionOnBirdsSpline = exports.addPositions = exports.positionOnSpline = void 0;
const CameraPositionInterpolator_1 = require("./CameraPositionInterpolator");
const gl_matrix_1 = require("gl-matrix");
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
const matrixTemp = gl_matrix_1.mat4.create();
const calculateModelMatrix = (tx, ty, tz, rx, ry, rz, sx, sy, sz) => {
    gl_matrix_1.mat4.identity(matrixTemp);
    gl_matrix_1.mat4.rotate(matrixTemp, matrixTemp, 0, [1, 0, 0]);
    gl_matrix_1.mat4.translate(matrixTemp, matrixTemp, [tx, ty, tz]);
    gl_matrix_1.mat4.scale(matrixTemp, matrixTemp, [sx, sy, sz]);
    gl_matrix_1.mat4.rotateX(matrixTemp, matrixTemp, rx);
    gl_matrix_1.mat4.rotateY(matrixTemp, matrixTemp, ry);
    gl_matrix_1.mat4.rotateZ(matrixTemp, matrixTemp, rz);
};
const transientSplinePosition = [0, 0, 0];
function positionOnSpline(i, radiusOffset, out) {
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
}
exports.positionOnSpline = positionOnSpline;
;
function addPositions(positions, instances, minDistance, offset) {
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
exports.addPositions = addPositions;
let positions = [];
function initPositions(instances, minDistance, offset, heightOffset = 0, scales = [0, 1]) {
    positions = [];
    const matrices = [];
    addPositions(positions, instances, minDistance, offset); // further from spline
    const texture = new Float32Array(positions.length * 6);
    for (let i = 0; i < positions.length; i++) {
        let [x, y, z] = positions[i];
        z = heightOffset;
        // const scale = 0.003 + Math.random() * 0.003;
        const scale = scales[0] + Math.random() * scales[1];
        texture[i * 3 + 0] = x; // translation X
        texture[i * 3 + 1] = y; // translation Y
        texture[i * 3 + 2] = scale; // scale
        const a = Math.random() * Math.PI * 2;
        texture[i * 3 + 0 + positions.length * 3] = Math.sin(a); // rotation sin
        texture[i * 3 + 1 + positions.length * 3] = Math.cos(a); // rotation cos
        texture[i * 3 + 2 + positions.length * 3] = 0;
        calculateModelMatrix(x, y, z, 0, 0, a, scale, scale, scale);
        matrices.push([...matrixTemp]);
    }
    return [
        texture,
        positions.length,
        matrices.flat() // FIXME
    ];
}
const transientBirdsPosition = [0, 0, 0];
function positionOnBirdsSpline(i) {
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
}
exports.positionOnBirdsSpline = positionOnBirdsSpline;
;
_a = initPositions(40, 0.0, 40), exports.PARTICLES_TEXTURE = _a[0], exports.PARTICLES_COUNT = _a[1];
_b = initPositions(97, 0.7, 23, 0, [0.0055, 0.004]), exports.ROCKS1_XFORM = _b[2];
_c = initPositions(119, 0.72, 25, 0, [0.006, 0.004]), exports.ROCKS2_XFORM = _c[2];
_d = initPositions(60, 0.75, 60, 0, [0.012, 0.004]), exports.ROCKS3_XFORM = _d[2]; // outer, large, non-floating
_e = initPositions(40, 0, 10, 0, [0.0055, 0.004]), exports.ROCKS4_XFORM = _e[2]; // central tall floating
_f = initPositions(70, 0, 300, 0, [0.0055, 0.004]), exports.ROCKS5_XFORM = _f[2]; // central non-floating
_g = initPositions(1360, 0.0, 60, 0, [0.003, 0.003]), exports.TREES_XFORM = _g[2];
_h = initPositions(97, 0.7, 23), exports.ROCKS1_TEXTURE = _h[0], exports.ROCKS1_COUNT = _h[1];
_j = initPositions(119, 0.72, 25), exports.ROCKS2_TEXTURE = _j[0], exports.ROCKS2_COUNT = _j[1];
_k = initPositions(60, 0.75, 60), exports.ROCKS3_TEXTURE = _k[0], exports.ROCKS3_COUNT = _k[1]; // outer, large, non-floating
_l = initPositions(40, 0, 10), exports.ROCKS4_TEXTURE = _l[0], exports.ROCKS4_COUNT = _l[1]; // central tall floating
_m = initPositions(70, 0, 30), exports.ROCKS5_TEXTURE = _m[0], exports.ROCKS5_COUNT = _m[1]; // central non-floating
_o = initPositions(1360, 0.0, 60), exports.TREES_TEXTURE = _o[0], exports.TREES_COUNT = _o[1];
const birds1 = new CameraPositionInterpolator_1.CameraPositionInterpolator();
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
const birds2 = new CameraPositionInterpolator_1.CameraPositionInterpolator();
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
const birds3 = new CameraPositionInterpolator_1.CameraPositionInterpolator();
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
const birds4 = new CameraPositionInterpolator_1.CameraPositionInterpolator();
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
const birds5 = new CameraPositionInterpolator_1.CameraPositionInterpolator();
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
const birds6 = new CameraPositionInterpolator_1.CameraPositionInterpolator();
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
exports.BIRD_PATHS = [
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
//# sourceMappingURL=ObjectsPlacement.js.map