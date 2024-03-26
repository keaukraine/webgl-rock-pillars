
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
class FullScreenUtils {
    /** Enters fullscreen. */
    enterFullScreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen({ navigationUI: "hide" });
        }
    }
    /** Exits fullscreen */
    exitFullScreen() {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    }
    /**
     * Adds cross-browser fullscreenchange event
     *
     * @param exitHandler Function to be called on fullscreenchange event
     */
    addFullScreenListener(exitHandler) {
        document.addEventListener("fullscreenchange", exitHandler, false);
    }
    /**
     * Checks fullscreen state.
     *
     * @return `true` if fullscreen is active, `false` if not
     */
    isFullScreen() {
        return !!document.fullscreenElement;
    }
}

class BinaryDataLoader {
    static async load(url) {
        const response = await fetch(url);
        return response.arrayBuffer();
    }
}

class UncompressedTextureLoader {
    static load(url, gl, minFilter = gl.LINEAR, magFilter = gl.LINEAR, clamp = false) {
        return new Promise((resolve, reject) => {
            const texture = gl.createTexture();
            if (texture === null) {
                reject("Error creating WebGL texture");
                return;
            }
            const image = new Image();
            image.src = url;
            image.onload = () => {
                gl.bindTexture(gl.TEXTURE_2D, texture);
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
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
                gl.bindTexture(gl.TEXTURE_2D, null);
                if (image && image.src) {
                    console.log(`Loaded texture ${url} [${image.width}x${image.height}]`);
                }
                resolve(texture);
            };
            image.onerror = () => reject("Cannot load image");
        });
    }
    static async loadCubemap(url, gl, extension = "png") {
        const texture = gl.createTexture();
        if (texture === null) {
            throw new Error("Error creating WebGL texture");
        }
        gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);
        gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        const promises = [
            { type: gl.TEXTURE_CUBE_MAP_POSITIVE_X, suffix: `-posx.${extension}` },
            { type: gl.TEXTURE_CUBE_MAP_NEGATIVE_X, suffix: `-negx.${extension}` },
            { type: gl.TEXTURE_CUBE_MAP_POSITIVE_Y, suffix: `-posy.${extension}` },
            { type: gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, suffix: `-negy.${extension}` },
            { type: gl.TEXTURE_CUBE_MAP_POSITIVE_Z, suffix: `-posz.${extension}` },
            { type: gl.TEXTURE_CUBE_MAP_NEGATIVE_Z, suffix: `-negz.${extension}` }
        ].map(face => new Promise((resolve, reject) => {
            const image = new Image();
            image.src = url + face.suffix;
            image.onload = () => {
                gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);
                // gl.texImage2D(face.type, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
                gl.texImage2D(face.type, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
                if (image && image.src) {
                    console.log(`Loaded texture ${url}${face.suffix} [${image.width}x${image.height}]`);
                }
                resolve();
            };
            image.onerror = () => reject("Cannot load image");
        }));
        await Promise.all(promises);
        gl.bindTexture(gl.TEXTURE_2D, null);
        return texture;
    }
}

class FullModel {
    /** Default constructor. */
    constructor() {
        /** Number of model indices. */
        this.numIndices = 0;
    }
    loadBuffer(gl, buffer, target, arrayBuffer) {
        var byteArray = new Uint8Array(arrayBuffer, 0, arrayBuffer.byteLength);
        gl.bindBuffer(target, buffer);
        gl.bufferData(target, byteArray, gl.STATIC_DRAW);
    }
    /**
     * Loads model.
     *
     * @param url Base URL to model indices and strides files.
     * @param gl WebGL context.
     * @returns Promise which resolves when model is loaded.
     */
    async load(url, gl) {
        const [dataIndices, dataStrides] = await Promise.all([
            BinaryDataLoader.load(`${url}-indices.bin`),
            BinaryDataLoader.load(`${url}-strides.bin`)
        ]);
        console.log(`Loaded ${url}-indices.bin (${dataIndices.byteLength} bytes)`);
        console.log(`Loaded ${url}-strides.bin (${dataStrides.byteLength} bytes)`);
        this.bufferIndices = gl.createBuffer();
        this.loadBuffer(gl, this.bufferIndices, gl.ELEMENT_ARRAY_BUFFER, dataIndices);
        this.numIndices = dataIndices.byteLength / 2 / 3;
        this.bufferStrides = gl.createBuffer();
        this.loadBuffer(gl, this.bufferStrides, gl.ARRAY_BUFFER, dataStrides);
    }
    /**
     * Binds buffers for a `glDrawElements()` call.
     *
     * @param gl WebGL context.
     */
    bindBuffers(gl) {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.bufferStrides);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.bufferIndices);
    }
    /**
     * Returns number of indices in model.
     *
     * @return Number of indices
     */
    getNumIndices() {
        return this.numIndices;
    }
}

class BaseShader {
    /**
     * Constructor. Compiles shader.
     *
     * @param gl WebGL context.
     */
    constructor(gl) {
        this.gl = gl;
        this.vertexShaderCode = "";
        this.fragmentShaderCode = "";
        this.fillCode();
        this.initShader();
    }
    /**
     * Creates WebGL shader from code.
     *
     * @param type Shader type.
     * @param code GLSL code.
     * @returns Shader or `undefined` if there were errors during shader compilation.
     */
    getShader(type, code) {
        const shader = this.gl.createShader(type);
        if (!shader) {
            console.warn('Error creating shader.');
            return undefined;
        }
        this.gl.shaderSource(shader, code);
        this.gl.compileShader(shader);
        if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            console.warn(this.gl.getShaderInfoLog(shader));
            return undefined;
        }
        return shader;
    }
    /**
     * Get shader unform location.
     *
     * @param uniform Uniform name.
     * @return Uniform location.
     */
    getUniform(uniform) {
        if (this.program === undefined) {
            throw new Error('No program for shader.');
        }
        const result = this.gl.getUniformLocation(this.program, uniform);
        if (result !== null) {
            return result;
        }
        else {
            throw new Error(`Cannot get uniform "${uniform}".`);
        }
    }
    /**
     * Get shader attribute location.
     *
     * @param attrib Attribute name.
     * @return Attribute location.
     */
    getAttrib(attrib) {
        if (this.program === undefined) {
            throw new Error("No program for shader.");
        }
        return this.gl.getAttribLocation(this.program, attrib);
    }
    /** Initializes shader. */
    initShader() {
        const fragmentShader = this.getShader(this.gl.FRAGMENT_SHADER, this.fragmentShaderCode);
        const vertexShader = this.getShader(this.gl.VERTEX_SHADER, this.vertexShaderCode);
        const shaderProgram = this.gl.createProgram();
        if (fragmentShader === undefined || vertexShader === undefined || shaderProgram === null) {
            return;
        }
        this.gl.attachShader(shaderProgram, vertexShader);
        this.gl.attachShader(shaderProgram, fragmentShader);
        this.gl.linkProgram(shaderProgram);
        if (!this.gl.getProgramParameter(shaderProgram, this.gl.LINK_STATUS)) {
            console.warn(this.constructor.name + ": Could not initialise shader");
        }
        else {
            console.log(this.constructor.name + ": Initialised shader");
        }
        this.gl.useProgram(shaderProgram);
        this.program = shaderProgram;
        this.fillUniformsAttributes();
    }
    /** Activates shader. */
    use() {
        if (this.program) {
            this.gl.useProgram(this.program);
        }
    }
    /** Deletes shader. */
    deleteProgram() {
        if (this.program) {
            this.gl.deleteProgram(this.program);
        }
    }
}

/**
 * Common utilities
 * @module glMatrix
 */
// Configuration Constants
var EPSILON$1 = 0.000001;
var ARRAY_TYPE$1 = typeof Float32Array !== 'undefined' ? Float32Array : Array;
if (!Math.hypot) Math.hypot = function () {
  var y = 0,
      i = arguments.length;

  while (i--) {
    y += arguments[i] * arguments[i];
  }

  return Math.sqrt(y);
};

/**
 * 3x3 Matrix
 * @module mat3
 */

/**
 * Creates a new identity mat3
 *
 * @returns {mat3} a new 3x3 matrix
 */

function create$2() {
  var out = new ARRAY_TYPE$1(9);

  if (ARRAY_TYPE$1 != Float32Array) {
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[5] = 0;
    out[6] = 0;
    out[7] = 0;
  }

  out[0] = 1;
  out[4] = 1;
  out[8] = 1;
  return out;
}

/**
 * 4x4 Matrix<br>Format: column-major, when typed out it looks like row-major<br>The matrices are being post multiplied.
 * @module mat4
 */

/**
 * Creates a new identity mat4
 *
 * @returns {mat4} a new 4x4 matrix
 */

function create$3() {
  var out = new ARRAY_TYPE$1(16);

  if (ARRAY_TYPE$1 != Float32Array) {
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[11] = 0;
    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
  }

  out[0] = 1;
  out[5] = 1;
  out[10] = 1;
  out[15] = 1;
  return out;
}
/**
 * Set a mat4 to the identity matrix
 *
 * @param {mat4} out the receiving matrix
 * @returns {mat4} out
 */

function identity$3(out) {
  out[0] = 1;
  out[1] = 0;
  out[2] = 0;
  out[3] = 0;
  out[4] = 0;
  out[5] = 1;
  out[6] = 0;
  out[7] = 0;
  out[8] = 0;
  out[9] = 0;
  out[10] = 1;
  out[11] = 0;
  out[12] = 0;
  out[13] = 0;
  out[14] = 0;
  out[15] = 1;
  return out;
}
/**
 * Multiplies two mat4s
 *
 * @param {mat4} out the receiving matrix
 * @param {ReadonlyMat4} a the first operand
 * @param {ReadonlyMat4} b the second operand
 * @returns {mat4} out
 */

function multiply$3(out, a, b) {
  var a00 = a[0],
      a01 = a[1],
      a02 = a[2],
      a03 = a[3];
  var a10 = a[4],
      a11 = a[5],
      a12 = a[6],
      a13 = a[7];
  var a20 = a[8],
      a21 = a[9],
      a22 = a[10],
      a23 = a[11];
  var a30 = a[12],
      a31 = a[13],
      a32 = a[14],
      a33 = a[15]; // Cache only the current line of the second matrix

  var b0 = b[0],
      b1 = b[1],
      b2 = b[2],
      b3 = b[3];
  out[0] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
  out[1] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
  out[2] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
  out[3] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
  b0 = b[4];
  b1 = b[5];
  b2 = b[6];
  b3 = b[7];
  out[4] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
  out[5] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
  out[6] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
  out[7] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
  b0 = b[8];
  b1 = b[9];
  b2 = b[10];
  b3 = b[11];
  out[8] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
  out[9] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
  out[10] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
  out[11] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
  b0 = b[12];
  b1 = b[13];
  b2 = b[14];
  b3 = b[15];
  out[12] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
  out[13] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
  out[14] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
  out[15] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
  return out;
}
/**
 * Translate a mat4 by the given vector
 *
 * @param {mat4} out the receiving matrix
 * @param {ReadonlyMat4} a the matrix to translate
 * @param {ReadonlyVec3} v vector to translate by
 * @returns {mat4} out
 */

function translate$2(out, a, v) {
  var x = v[0],
      y = v[1],
      z = v[2];
  var a00, a01, a02, a03;
  var a10, a11, a12, a13;
  var a20, a21, a22, a23;

  if (a === out) {
    out[12] = a[0] * x + a[4] * y + a[8] * z + a[12];
    out[13] = a[1] * x + a[5] * y + a[9] * z + a[13];
    out[14] = a[2] * x + a[6] * y + a[10] * z + a[14];
    out[15] = a[3] * x + a[7] * y + a[11] * z + a[15];
  } else {
    a00 = a[0];
    a01 = a[1];
    a02 = a[2];
    a03 = a[3];
    a10 = a[4];
    a11 = a[5];
    a12 = a[6];
    a13 = a[7];
    a20 = a[8];
    a21 = a[9];
    a22 = a[10];
    a23 = a[11];
    out[0] = a00;
    out[1] = a01;
    out[2] = a02;
    out[3] = a03;
    out[4] = a10;
    out[5] = a11;
    out[6] = a12;
    out[7] = a13;
    out[8] = a20;
    out[9] = a21;
    out[10] = a22;
    out[11] = a23;
    out[12] = a00 * x + a10 * y + a20 * z + a[12];
    out[13] = a01 * x + a11 * y + a21 * z + a[13];
    out[14] = a02 * x + a12 * y + a22 * z + a[14];
    out[15] = a03 * x + a13 * y + a23 * z + a[15];
  }

  return out;
}
/**
 * Scales the mat4 by the dimensions in the given vec3 not using vectorization
 *
 * @param {mat4} out the receiving matrix
 * @param {ReadonlyMat4} a the matrix to scale
 * @param {ReadonlyVec3} v the vec3 to scale the matrix by
 * @returns {mat4} out
 **/

function scale$3(out, a, v) {
  var x = v[0],
      y = v[1],
      z = v[2];
  out[0] = a[0] * x;
  out[1] = a[1] * x;
  out[2] = a[2] * x;
  out[3] = a[3] * x;
  out[4] = a[4] * y;
  out[5] = a[5] * y;
  out[6] = a[6] * y;
  out[7] = a[7] * y;
  out[8] = a[8] * z;
  out[9] = a[9] * z;
  out[10] = a[10] * z;
  out[11] = a[11] * z;
  out[12] = a[12];
  out[13] = a[13];
  out[14] = a[14];
  out[15] = a[15];
  return out;
}
/**
 * Rotates a mat4 by the given angle around the given axis
 *
 * @param {mat4} out the receiving matrix
 * @param {ReadonlyMat4} a the matrix to rotate
 * @param {Number} rad the angle to rotate the matrix by
 * @param {ReadonlyVec3} axis the axis to rotate around
 * @returns {mat4} out
 */

function rotate$3(out, a, rad, axis) {
  var x = axis[0],
      y = axis[1],
      z = axis[2];
  var len = Math.hypot(x, y, z);
  var s, c, t;
  var a00, a01, a02, a03;
  var a10, a11, a12, a13;
  var a20, a21, a22, a23;
  var b00, b01, b02;
  var b10, b11, b12;
  var b20, b21, b22;

  if (len < EPSILON$1) {
    return null;
  }

  len = 1 / len;
  x *= len;
  y *= len;
  z *= len;
  s = Math.sin(rad);
  c = Math.cos(rad);
  t = 1 - c;
  a00 = a[0];
  a01 = a[1];
  a02 = a[2];
  a03 = a[3];
  a10 = a[4];
  a11 = a[5];
  a12 = a[6];
  a13 = a[7];
  a20 = a[8];
  a21 = a[9];
  a22 = a[10];
  a23 = a[11]; // Construct the elements of the rotation matrix

  b00 = x * x * t + c;
  b01 = y * x * t + z * s;
  b02 = z * x * t - y * s;
  b10 = x * y * t - z * s;
  b11 = y * y * t + c;
  b12 = z * y * t + x * s;
  b20 = x * z * t + y * s;
  b21 = y * z * t - x * s;
  b22 = z * z * t + c; // Perform rotation-specific matrix multiplication

  out[0] = a00 * b00 + a10 * b01 + a20 * b02;
  out[1] = a01 * b00 + a11 * b01 + a21 * b02;
  out[2] = a02 * b00 + a12 * b01 + a22 * b02;
  out[3] = a03 * b00 + a13 * b01 + a23 * b02;
  out[4] = a00 * b10 + a10 * b11 + a20 * b12;
  out[5] = a01 * b10 + a11 * b11 + a21 * b12;
  out[6] = a02 * b10 + a12 * b11 + a22 * b12;
  out[7] = a03 * b10 + a13 * b11 + a23 * b12;
  out[8] = a00 * b20 + a10 * b21 + a20 * b22;
  out[9] = a01 * b20 + a11 * b21 + a21 * b22;
  out[10] = a02 * b20 + a12 * b21 + a22 * b22;
  out[11] = a03 * b20 + a13 * b21 + a23 * b22;

  if (a !== out) {
    // If the source and destination differ, copy the unchanged last row
    out[12] = a[12];
    out[13] = a[13];
    out[14] = a[14];
    out[15] = a[15];
  }

  return out;
}
/**
 * Rotates a matrix by the given angle around the X axis
 *
 * @param {mat4} out the receiving matrix
 * @param {ReadonlyMat4} a the matrix to rotate
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat4} out
 */

function rotateX$1(out, a, rad) {
  var s = Math.sin(rad);
  var c = Math.cos(rad);
  var a10 = a[4];
  var a11 = a[5];
  var a12 = a[6];
  var a13 = a[7];
  var a20 = a[8];
  var a21 = a[9];
  var a22 = a[10];
  var a23 = a[11];

  if (a !== out) {
    // If the source and destination differ, copy the unchanged rows
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[3];
    out[12] = a[12];
    out[13] = a[13];
    out[14] = a[14];
    out[15] = a[15];
  } // Perform axis-specific matrix multiplication


  out[4] = a10 * c + a20 * s;
  out[5] = a11 * c + a21 * s;
  out[6] = a12 * c + a22 * s;
  out[7] = a13 * c + a23 * s;
  out[8] = a20 * c - a10 * s;
  out[9] = a21 * c - a11 * s;
  out[10] = a22 * c - a12 * s;
  out[11] = a23 * c - a13 * s;
  return out;
}
/**
 * Rotates a matrix by the given angle around the Y axis
 *
 * @param {mat4} out the receiving matrix
 * @param {ReadonlyMat4} a the matrix to rotate
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat4} out
 */

function rotateY$1(out, a, rad) {
  var s = Math.sin(rad);
  var c = Math.cos(rad);
  var a00 = a[0];
  var a01 = a[1];
  var a02 = a[2];
  var a03 = a[3];
  var a20 = a[8];
  var a21 = a[9];
  var a22 = a[10];
  var a23 = a[11];

  if (a !== out) {
    // If the source and destination differ, copy the unchanged rows
    out[4] = a[4];
    out[5] = a[5];
    out[6] = a[6];
    out[7] = a[7];
    out[12] = a[12];
    out[13] = a[13];
    out[14] = a[14];
    out[15] = a[15];
  } // Perform axis-specific matrix multiplication


  out[0] = a00 * c - a20 * s;
  out[1] = a01 * c - a21 * s;
  out[2] = a02 * c - a22 * s;
  out[3] = a03 * c - a23 * s;
  out[8] = a00 * s + a20 * c;
  out[9] = a01 * s + a21 * c;
  out[10] = a02 * s + a22 * c;
  out[11] = a03 * s + a23 * c;
  return out;
}
/**
 * Rotates a matrix by the given angle around the Z axis
 *
 * @param {mat4} out the receiving matrix
 * @param {ReadonlyMat4} a the matrix to rotate
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat4} out
 */

function rotateZ$1(out, a, rad) {
  var s = Math.sin(rad);
  var c = Math.cos(rad);
  var a00 = a[0];
  var a01 = a[1];
  var a02 = a[2];
  var a03 = a[3];
  var a10 = a[4];
  var a11 = a[5];
  var a12 = a[6];
  var a13 = a[7];

  if (a !== out) {
    // If the source and destination differ, copy the unchanged last row
    out[8] = a[8];
    out[9] = a[9];
    out[10] = a[10];
    out[11] = a[11];
    out[12] = a[12];
    out[13] = a[13];
    out[14] = a[14];
    out[15] = a[15];
  } // Perform axis-specific matrix multiplication


  out[0] = a00 * c + a10 * s;
  out[1] = a01 * c + a11 * s;
  out[2] = a02 * c + a12 * s;
  out[3] = a03 * c + a13 * s;
  out[4] = a10 * c - a00 * s;
  out[5] = a11 * c - a01 * s;
  out[6] = a12 * c - a02 * s;
  out[7] = a13 * c - a03 * s;
  return out;
}
/**
 * Generates a frustum matrix with the given bounds
 *
 * @param {mat4} out mat4 frustum matrix will be written into
 * @param {Number} left Left bound of the frustum
 * @param {Number} right Right bound of the frustum
 * @param {Number} bottom Bottom bound of the frustum
 * @param {Number} top Top bound of the frustum
 * @param {Number} near Near bound of the frustum
 * @param {Number} far Far bound of the frustum
 * @returns {mat4} out
 */

function frustum(out, left, right, bottom, top, near, far) {
  var rl = 1 / (right - left);
  var tb = 1 / (top - bottom);
  var nf = 1 / (near - far);
  out[0] = near * 2 * rl;
  out[1] = 0;
  out[2] = 0;
  out[3] = 0;
  out[4] = 0;
  out[5] = near * 2 * tb;
  out[6] = 0;
  out[7] = 0;
  out[8] = (right + left) * rl;
  out[9] = (top + bottom) * tb;
  out[10] = (far + near) * nf;
  out[11] = -1;
  out[12] = 0;
  out[13] = 0;
  out[14] = far * near * 2 * nf;
  out[15] = 0;
  return out;
}

/**
 * 3 Dimensional Vector
 * @module vec3
 */

/**
 * Creates a new, empty vec3
 *
 * @returns {vec3} a new 3D vector
 */

function create$4() {
  var out = new ARRAY_TYPE$1(3);

  if (ARRAY_TYPE$1 != Float32Array) {
    out[0] = 0;
    out[1] = 0;
    out[2] = 0;
  }

  return out;
}
/**
 * Calculates the length of a vec3
 *
 * @param {ReadonlyVec3} a vector to calculate length of
 * @returns {Number} length of a
 */

function length(a) {
  var x = a[0];
  var y = a[1];
  var z = a[2];
  return Math.hypot(x, y, z);
}
/**
 * Creates a new vec3 initialized with the given values
 *
 * @param {Number} x X component
 * @param {Number} y Y component
 * @param {Number} z Z component
 * @returns {vec3} a new 3D vector
 */

function fromValues$4(x, y, z) {
  var out = new ARRAY_TYPE$1(3);
  out[0] = x;
  out[1] = y;
  out[2] = z;
  return out;
}
/**
 * Normalize a vec3
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a vector to normalize
 * @returns {vec3} out
 */

function normalize$1(out, a) {
  var x = a[0];
  var y = a[1];
  var z = a[2];
  var len = x * x + y * y + z * z;

  if (len > 0) {
    //TODO: evaluate use of glm_invsqrt here?
    len = 1 / Math.sqrt(len);
  }

  out[0] = a[0] * len;
  out[1] = a[1] * len;
  out[2] = a[2] * len;
  return out;
}
/**
 * Calculates the dot product of two vec3's
 *
 * @param {ReadonlyVec3} a the first operand
 * @param {ReadonlyVec3} b the second operand
 * @returns {Number} dot product of a and b
 */

function dot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}
/**
 * Computes the cross product of two vec3's
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a the first operand
 * @param {ReadonlyVec3} b the second operand
 * @returns {vec3} out
 */

function cross$1(out, a, b) {
  var ax = a[0],
      ay = a[1],
      az = a[2];
  var bx = b[0],
      by = b[1],
      bz = b[2];
  out[0] = ay * bz - az * by;
  out[1] = az * bx - ax * bz;
  out[2] = ax * by - ay * bx;
  return out;
}
/**
 * Alias for {@link vec3.length}
 * @function
 */

var len = length;
/**
 * Perform some operation over an array of vec3s.
 *
 * @param {Array} a the array of vectors to iterate over
 * @param {Number} stride Number of elements between the start of each vec3. If 0 assumes tightly packed
 * @param {Number} offset Number of elements to skip at the beginning of the array
 * @param {Number} count Number of vec3s to iterate over. If 0 iterates over entire array
 * @param {Function} fn Function to call for each vector in the array
 * @param {Object} [arg] additional argument to pass to fn
 * @returns {Array} a
 * @function
 */

(function () {
  var vec = create$4();
  return function (a, stride, offset, count, fn, arg) {
    var i, l;

    if (!stride) {
      stride = 3;
    }

    if (!offset) {
      offset = 0;
    }

    if (count) {
      l = Math.min(count * stride + offset, a.length);
    } else {
      l = a.length;
    }

    for (i = offset; i < l; i += stride) {
      vec[0] = a[i];
      vec[1] = a[i + 1];
      vec[2] = a[i + 2];
      fn(vec, vec, arg);
      a[i] = vec[0];
      a[i + 1] = vec[1];
      a[i + 2] = vec[2];
    }

    return a;
  };
})();

/**
 * 4 Dimensional Vector
 * @module vec4
 */

/**
 * Creates a new, empty vec4
 *
 * @returns {vec4} a new 4D vector
 */

function create$5() {
  var out = new ARRAY_TYPE$1(4);

  if (ARRAY_TYPE$1 != Float32Array) {
    out[0] = 0;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
  }

  return out;
}
/**
 * Normalize a vec4
 *
 * @param {vec4} out the receiving vector
 * @param {ReadonlyVec4} a vector to normalize
 * @returns {vec4} out
 */

function normalize$1$1(out, a) {
  var x = a[0];
  var y = a[1];
  var z = a[2];
  var w = a[3];
  var len = x * x + y * y + z * z + w * w;

  if (len > 0) {
    len = 1 / Math.sqrt(len);
  }

  out[0] = x * len;
  out[1] = y * len;
  out[2] = z * len;
  out[3] = w * len;
  return out;
}
/**
 * Perform some operation over an array of vec4s.
 *
 * @param {Array} a the array of vectors to iterate over
 * @param {Number} stride Number of elements between the start of each vec4. If 0 assumes tightly packed
 * @param {Number} offset Number of elements to skip at the beginning of the array
 * @param {Number} count Number of vec4s to iterate over. If 0 iterates over entire array
 * @param {Function} fn Function to call for each vector in the array
 * @param {Object} [arg] additional argument to pass to fn
 * @returns {Array} a
 * @function
 */

(function () {
  var vec = create$5();
  return function (a, stride, offset, count, fn, arg) {
    var i, l;

    if (!stride) {
      stride = 4;
    }

    if (!offset) {
      offset = 0;
    }

    if (count) {
      l = Math.min(count * stride + offset, a.length);
    } else {
      l = a.length;
    }

    for (i = offset; i < l; i += stride) {
      vec[0] = a[i];
      vec[1] = a[i + 1];
      vec[2] = a[i + 2];
      vec[3] = a[i + 3];
      fn(vec, vec, arg);
      a[i] = vec[0];
      a[i + 1] = vec[1];
      a[i + 2] = vec[2];
      a[i + 3] = vec[3];
    }

    return a;
  };
})();

/**
 * Quaternion
 * @module quat
 */

/**
 * Creates a new identity quat
 *
 * @returns {quat} a new quaternion
 */

function create$6() {
  var out = new ARRAY_TYPE$1(4);

  if (ARRAY_TYPE$1 != Float32Array) {
    out[0] = 0;
    out[1] = 0;
    out[2] = 0;
  }

  out[3] = 1;
  return out;
}
/**
 * Sets a quat from the given angle and rotation axis,
 * then returns it.
 *
 * @param {quat} out the receiving quaternion
 * @param {ReadonlyVec3} axis the axis around which to rotate
 * @param {Number} rad the angle in radians
 * @returns {quat} out
 **/

function setAxisAngle(out, axis, rad) {
  rad = rad * 0.5;
  var s = Math.sin(rad);
  out[0] = s * axis[0];
  out[1] = s * axis[1];
  out[2] = s * axis[2];
  out[3] = Math.cos(rad);
  return out;
}
/**
 * Performs a spherical linear interpolation between two quat
 *
 * @param {quat} out the receiving quaternion
 * @param {ReadonlyQuat} a the first operand
 * @param {ReadonlyQuat} b the second operand
 * @param {Number} t interpolation amount, in the range [0-1], between the two inputs
 * @returns {quat} out
 */

function slerp(out, a, b, t) {
  // benchmarks:
  //    http://jsperf.com/quaternion-slerp-implementations
  var ax = a[0],
      ay = a[1],
      az = a[2],
      aw = a[3];
  var bx = b[0],
      by = b[1],
      bz = b[2],
      bw = b[3];
  var omega, cosom, sinom, scale0, scale1; // calc cosine

  cosom = ax * bx + ay * by + az * bz + aw * bw; // adjust signs (if necessary)

  if (cosom < 0.0) {
    cosom = -cosom;
    bx = -bx;
    by = -by;
    bz = -bz;
    bw = -bw;
  } // calculate coefficients


  if (1.0 - cosom > EPSILON$1) {
    // standard case (slerp)
    omega = Math.acos(cosom);
    sinom = Math.sin(omega);
    scale0 = Math.sin((1.0 - t) * omega) / sinom;
    scale1 = Math.sin(t * omega) / sinom;
  } else {
    // "from" and "to" quaternions are very close
    //  ... so we can do a linear interpolation
    scale0 = 1.0 - t;
    scale1 = t;
  } // calculate final values


  out[0] = scale0 * ax + scale1 * bx;
  out[1] = scale0 * ay + scale1 * by;
  out[2] = scale0 * az + scale1 * bz;
  out[3] = scale0 * aw + scale1 * bw;
  return out;
}
/**
 * Creates a quaternion from the given 3x3 rotation matrix.
 *
 * NOTE: The resultant quaternion is not normalized, so you should be sure
 * to renormalize the quaternion yourself where necessary.
 *
 * @param {quat} out the receiving quaternion
 * @param {ReadonlyMat3} m rotation matrix
 * @returns {quat} out
 * @function
 */

function fromMat3(out, m) {
  // Algorithm in Ken Shoemake's article in 1987 SIGGRAPH course notes
  // article "Quaternion Calculus and Fast Animation".
  var fTrace = m[0] + m[4] + m[8];
  var fRoot;

  if (fTrace > 0.0) {
    // |w| > 1/2, may as well choose w > 1/2
    fRoot = Math.sqrt(fTrace + 1.0); // 2w

    out[3] = 0.5 * fRoot;
    fRoot = 0.5 / fRoot; // 1/(4w)

    out[0] = (m[5] - m[7]) * fRoot;
    out[1] = (m[6] - m[2]) * fRoot;
    out[2] = (m[1] - m[3]) * fRoot;
  } else {
    // |w| <= 1/2
    var i = 0;
    if (m[4] > m[0]) i = 1;
    if (m[8] > m[i * 3 + i]) i = 2;
    var j = (i + 1) % 3;
    var k = (i + 2) % 3;
    fRoot = Math.sqrt(m[i * 3 + i] - m[j * 3 + j] - m[k * 3 + k] + 1.0);
    out[i] = 0.5 * fRoot;
    fRoot = 0.5 / fRoot;
    out[3] = (m[j * 3 + k] - m[k * 3 + j]) * fRoot;
    out[j] = (m[j * 3 + i] + m[i * 3 + j]) * fRoot;
    out[k] = (m[k * 3 + i] + m[i * 3 + k]) * fRoot;
  }

  return out;
}
/**
 * Normalize a quat
 *
 * @param {quat} out the receiving quaternion
 * @param {ReadonlyQuat} a quaternion to normalize
 * @returns {quat} out
 * @function
 */

var normalize$2 = normalize$1$1;
/**
 * Sets a quaternion to represent the shortest rotation from one
 * vector to another.
 *
 * Both vectors are assumed to be unit length.
 *
 * @param {quat} out the receiving quaternion.
 * @param {ReadonlyVec3} a the initial vector
 * @param {ReadonlyVec3} b the destination vector
 * @returns {quat} out
 */

(function () {
  var tmpvec3 = create$4();
  var xUnitVec3 = fromValues$4(1, 0, 0);
  var yUnitVec3 = fromValues$4(0, 1, 0);
  return function (out, a, b) {
    var dot$$1 = dot(a, b);

    if (dot$$1 < -0.999999) {
      cross$1(tmpvec3, xUnitVec3, a);
      if (len(tmpvec3) < 0.000001) cross$1(tmpvec3, yUnitVec3, a);
      normalize$1(tmpvec3, tmpvec3);
      setAxisAngle(out, tmpvec3, Math.PI);
      return out;
    } else if (dot$$1 > 0.999999) {
      out[0] = 0;
      out[1] = 0;
      out[2] = 0;
      out[3] = 1;
      return out;
    } else {
      cross$1(tmpvec3, a, b);
      out[0] = tmpvec3[0];
      out[1] = tmpvec3[1];
      out[2] = tmpvec3[2];
      out[3] = 1 + dot$$1;
      return normalize$2(out, out);
    }
  };
})();
/**
 * Performs a spherical linear interpolation with two control points
 *
 * @param {quat} out the receiving quaternion
 * @param {ReadonlyQuat} a the first operand
 * @param {ReadonlyQuat} b the second operand
 * @param {ReadonlyQuat} c the third operand
 * @param {ReadonlyQuat} d the fourth operand
 * @param {Number} t interpolation amount, in the range [0-1], between the two inputs
 * @returns {quat} out
 */

(function () {
  var temp1 = create$6();
  var temp2 = create$6();
  return function (out, a, b, c, d, t) {
    slerp(temp1, a, d, t);
    slerp(temp2, b, c, t);
    slerp(out, temp1, temp2, 2 * t * (1 - t));
    return out;
  };
})();
/**
 * Sets the specified quaternion with values corresponding to the given
 * axes. Each axis is a vec3 and is expected to be unit length and
 * perpendicular to all other specified axes.
 *
 * @param {ReadonlyVec3} view  the vector representing the viewing direction
 * @param {ReadonlyVec3} right the vector representing the local "right" direction
 * @param {ReadonlyVec3} up    the vector representing the local "up" direction
 * @returns {quat} out
 */

(function () {
  var matr = create$2();
  return function (out, view, right, up) {
    matr[0] = right[0];
    matr[3] = right[1];
    matr[6] = right[2];
    matr[1] = up[0];
    matr[4] = up[1];
    matr[7] = up[2];
    matr[2] = -view[0];
    matr[5] = -view[1];
    matr[8] = -view[2];
    return normalize$2(out, fromMat3(out, matr));
  };
})();

/**
 * 2 Dimensional Vector
 * @module vec2
 */

/**
 * Creates a new, empty vec2
 *
 * @returns {vec2} a new 2D vector
 */

function create$8() {
  var out = new ARRAY_TYPE$1(2);

  if (ARRAY_TYPE$1 != Float32Array) {
    out[0] = 0;
    out[1] = 0;
  }

  return out;
}
/**
 * Perform some operation over an array of vec2s.
 *
 * @param {Array} a the array of vectors to iterate over
 * @param {Number} stride Number of elements between the start of each vec2. If 0 assumes tightly packed
 * @param {Number} offset Number of elements to skip at the beginning of the array
 * @param {Number} count Number of vec2s to iterate over. If 0 iterates over entire array
 * @param {Function} fn Function to call for each vector in the array
 * @param {Object} [arg] additional argument to pass to fn
 * @returns {Array} a
 * @function
 */

(function () {
  var vec = create$8();
  return function (a, stride, offset, count, fn, arg) {
    var i, l;

    if (!stride) {
      stride = 2;
    }

    if (!offset) {
      offset = 0;
    }

    if (count) {
      l = Math.min(count * stride + offset, a.length);
    } else {
      l = a.length;
    }

    for (i = offset; i < l; i += stride) {
      vec[0] = a[i];
      vec[1] = a[i + 1];
      fn(vec, vec, arg);
      a[i] = vec[0];
      a[i + 1] = vec[1];
    }

    return a;
  };
})();

class BaseRenderer {
    constructor() {
        this.mMMatrix = create$3();
        this.mVMatrix = create$3();
        this.mMVPMatrix = create$3();
        this.mProjMatrix = create$3();
        this.matOrtho = create$3();
        this.m_boundTick = this.tick.bind(this);
        this.isWebGL2 = false;
        this.viewportWidth = 0;
        this.viewportHeight = 0;
    }
    /** Getter for current WebGL context. */
    get gl() {
        if (this.m_gl === undefined) {
            throw new Error("No WebGL context");
        }
        return this.m_gl;
    }
    /** Logs last GL error to console */
    logGLError() {
        var err = this.gl.getError();
        if (err !== this.gl.NO_ERROR) {
            console.warn(`WebGL error # + ${err}`);
        }
    }
    /**
     * Binds 2D texture.
     *
     * @param textureUnit A texture unit to use
     * @param texture A texture to be used
     * @param uniform Shader's uniform ID
     */
    setTexture2D(textureUnit, texture, uniform) {
        this.gl.activeTexture(this.gl.TEXTURE0 + textureUnit);
        this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
        this.gl.uniform1i(uniform, textureUnit);
    }
    /**
     * Binds cubemap texture.
     *
     * @param textureUnit A texture unit to use
     * @param texture A texture to be used
     * @param uniform Shader's uniform ID
     */
    setTextureCubemap(textureUnit, texture, uniform) {
        this.gl.activeTexture(this.gl.TEXTURE0 + textureUnit);
        this.gl.bindTexture(this.gl.TEXTURE_CUBE_MAP, texture);
        this.gl.uniform1i(uniform, textureUnit);
    }
    /**
     * Calculates FOV for matrix.
     *
     * @param matrix Output matrix
     * @param fovY Vertical FOV in degrees
     * @param aspect Aspect ratio of viewport
     * @param zNear Near clipping plane distance
     * @param zFar Far clipping plane distance
     */
    setFOV(matrix, fovY, aspect, zNear, zFar) {
        const fH = Math.tan(fovY / 360.0 * Math.PI) * zNear;
        const fW = fH * aspect;
        frustum(matrix, -fW, fW, -fH, fH, zNear, zFar);
    }
    /**
     * Calculates MVP matrix. Saved in this.mMVPMatrix
     */
    calculateMVPMatrix(tx, ty, tz, rx, ry, rz, sx, sy, sz) {
        identity$3(this.mMMatrix);
        rotate$3(this.mMMatrix, this.mMMatrix, 0, [1, 0, 0]);
        translate$2(this.mMMatrix, this.mMMatrix, [tx, ty, tz]);
        scale$3(this.mMMatrix, this.mMMatrix, [sx, sy, sz]);
        rotateX$1(this.mMMatrix, this.mMMatrix, rx);
        rotateY$1(this.mMMatrix, this.mMMatrix, ry);
        rotateZ$1(this.mMMatrix, this.mMMatrix, rz);
        multiply$3(this.mMVPMatrix, this.mVMatrix, this.mMMatrix);
        multiply$3(this.mMVPMatrix, this.mProjMatrix, this.mMVPMatrix);
    }
    /** Perform each frame's draw calls here. */
    drawScene() {
        this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
        this.gl.clearColor(0.0, 0.0, 0.0, 1.0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
    }
    /** Called on each frame. */
    tick() {
        requestAnimationFrame(this.m_boundTick);
        this.resizeCanvas();
        this.drawScene();
        this.animate();
    }
    /**
     * Initializes WebGL context.
     *
     * @param canvas Canvas to initialize WebGL.
     */
    initGL(canvas) {
        const gl = canvas.getContext("webgl", { alpha: false });
        if (gl === null) {
            throw new Error("Cannot initialize WebGL context");
        }
        // this.isETC1Supported = !!gl.getExtension('WEBGL_compressed_texture_etc1');
        return gl;
    }
    ;
    /**
     * Initializes WebGL 2 context
     *
     * @param canvas Canvas to initialize WebGL 2.
     */
    initGL2(canvas) {
        let gl = canvas.getContext("webgl2", { alpha: false });
        if (gl === null) {
            console.warn('Could not initialise WebGL 2, falling back to WebGL 1');
            return this.initGL(canvas);
        }
        return gl;
    }
    ;
    /**
     * Generates mipmasp for textures.
     *
     * @param textures Textures to generate mipmaps for.
     */
    generateMipmaps(...textures) {
        for (const texture of textures) {
            this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR_MIPMAP_LINEAR);
            this.gl.generateMipmap(this.gl.TEXTURE_2D);
        }
    }
    /**
     * Initializes WebGL and calls all callbacks.
     *
     * @param canvasID ID of canvas element to initialize WebGL.
     * @param requestWebGL2 Set to `true` to initialize WebGL 2 context.
     */
    init(canvasID, requestWebGL2 = false) {
        this.onBeforeInit();
        this.canvas = document.getElementById(canvasID);
        if (this.canvas === null) {
            throw new Error("Cannot find canvas element");
        }
        this.viewportWidth = this.canvas.width;
        this.viewportHeight = this.canvas.height;
        this.m_gl = !!requestWebGL2 ? this.initGL2(this.canvas) : this.initGL(this.canvas);
        if (this.m_gl) {
            this.resizeCanvas();
            this.onAfterInit();
            this.initShaders();
            this.loadData();
            this.m_boundTick();
        }
        else {
            this.onInitError();
        }
    }
    /** Adjusts viewport according to resizing of canvas. */
    resizeCanvas() {
        if (this.canvas === undefined) {
            return;
        }
        const cssToRealPixels = window.devicePixelRatio || 1;
        const displayWidth = Math.floor(this.canvas.clientWidth * cssToRealPixels);
        const displayHeight = Math.floor(this.canvas.clientHeight * cssToRealPixels);
        if (this.canvas.width != displayWidth || this.canvas.height != displayHeight) {
            this.canvas.width = displayWidth;
            this.canvas.height = displayHeight;
        }
    }
    /**
     * Logs GL error to console.
     *
     * @param operation Operation name.
     */
    checkGlError(operation) {
        let error;
        while ((error = this.gl.getError()) !== this.gl.NO_ERROR) {
            console.error(`${operation}: glError ${error}`);
        }
    }
    /** @inheritdoc */
    unbindBuffers() {
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null);
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, null);
    }
    /** @inheritdoc */
    getMVPMatrix() {
        return this.mMVPMatrix;
    }
    /** @inheritdoc */
    getOrthoMatrix() {
        return this.matOrtho;
    }
    /** @inheritdoc */
    getModelMatrix() {
        return this.mMMatrix;
    }
    /** @inheritdoc */
    getViewMatrix() {
        return this.mVMatrix;
    }
    /** @inheritdoc */
    getProjectionMatrix() {
        return this.mProjMatrix;
    }
}

class FrameBuffer {
    /** Constructor. */
    constructor(gl) {
        this.gl = gl;
        this.m_textureHandle = null;
        this.m_depthTextureHandle = null;
        this.m_framebufferHandle = null;
        this.m_depthbufferHandle = null;
    }
    /** Creates OpenGL objects */
    createGLData(width, height) {
        this.m_width = width;
        this.m_height = height;
        if (this.m_textureHandle !== null && this.m_width > 0 && this.m_height > 0) {
            this.m_framebufferHandle = this.gl.createFramebuffer(); // alternative to GLES20.glGenFramebuffers()
            if (this.m_textureHandle !== null) {
                this.gl.bindTexture(this.gl.TEXTURE_2D, this.m_textureHandle);
                this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.m_framebufferHandle);
                this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.TEXTURE_2D, this.m_textureHandle, 0);
                this.checkGlError("FB");
            }
            if (this.m_depthTextureHandle === null) {
                this.m_depthbufferHandle = this.gl.createRenderbuffer();
                this.gl.bindRenderbuffer(this.gl.RENDERBUFFER, this.m_depthbufferHandle);
                this.checkGlError("FB - glBindRenderbuffer");
                this.gl.renderbufferStorage(this.gl.RENDERBUFFER, this.gl.DEPTH_COMPONENT16, this.m_width, this.m_height);
                this.checkGlError("FB - glRenderbufferStorage");
                this.gl.framebufferRenderbuffer(this.gl.FRAMEBUFFER, this.gl.DEPTH_ATTACHMENT, this.gl.RENDERBUFFER, this.m_depthbufferHandle);
                this.checkGlError("FB - glFramebufferRenderbuffer");
            }
            else {
                this.gl.bindTexture(this.gl.TEXTURE_2D, this.m_depthTextureHandle);
                this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.m_framebufferHandle);
                this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.DEPTH_ATTACHMENT, this.gl.TEXTURE_2D, this.m_depthTextureHandle, 0);
                this.checkGlError("FB depth");
            }
            const result = this.gl.checkFramebufferStatus(this.gl.FRAMEBUFFER);
            if (result != this.gl.FRAMEBUFFER_COMPLETE) {
                console.error(`Error creating framebufer: ${result}`);
            }
            this.gl.bindRenderbuffer(this.gl.RENDERBUFFER, null);
            // this.gl.bindTexture(this.gl.TEXTURE_2D, 0);
            this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
        }
    }
    checkGlError(op) {
        let error;
        while ((error = this.gl.getError()) !== this.gl.NO_ERROR) {
            console.error(`${op}: glError ${error}`);
        }
    }
    get width() {
        return this.m_width;
    }
    set width(value) {
        this.m_width = value;
    }
    get height() {
        return this.m_height;
    }
    set height(value) {
        this.m_height = value;
    }
    get textureHandle() {
        return this.m_textureHandle;
    }
    set textureHandle(value) {
        this.m_textureHandle = value;
    }
    get depthbufferHandle() {
        return this.m_depthbufferHandle;
    }
    set depthbufferHandle(value) {
        this.m_depthbufferHandle = value;
    }
    get framebufferHandle() {
        return this.m_framebufferHandle;
    }
    set framebufferHandle(value) {
        this.m_framebufferHandle = value;
    }
    get depthTextureHandle() {
        return this.m_depthTextureHandle;
    }
    set depthTextureHandle(value) {
        this.m_depthTextureHandle = value;
    }
}

/** Utilities to create various textures. */
class TextureUtils {
    /**
     * Creates non-power-of-two (NPOT) texture.
     *
     * @param gl WebGL context.
     * @param texWidth Texture width.
     * @param texHeight Texture height.
     * @param hasAlpha Set to `true` to create texture with alpha channel.
     */
    static createNpotTexture(gl, texWidth, texHeight, hasAlpha = false) {
        const textureID = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, textureID);
        gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        let glFormat = null, glInternalFormat = null;
        if (hasAlpha) {
            glFormat = gl.RGBA;
            glInternalFormat = gl.RGBA;
        }
        else {
            glFormat = gl.RGB;
            glInternalFormat = gl.RGB;
        }
        gl.texImage2D(gl.TEXTURE_2D, 0, glInternalFormat, texWidth, texHeight, 0, glFormat, gl.UNSIGNED_BYTE, null);
        return textureID;
    }
    /**
     * Creates depth texture.
     *
     * @param gl WebGL context.
     * @param texWidth Texture width.
     * @param texHeight Texture height.
     */
    static createDepthTexture(gl, texWidth, texHeight) {
        const textureID = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, textureID);
        gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        const version = gl.getParameter(gl.VERSION) || "";
        const glFormat = gl.DEPTH_COMPONENT;
        const glInternalFormat = version.includes("WebGL 2")
            ? gl.DEPTH_COMPONENT16
            : gl.DEPTH_COMPONENT;
        const type = gl.UNSIGNED_SHORT;
        // In WebGL, we cannot pass array to depth texture.
        gl.texImage2D(gl.TEXTURE_2D, 0, glInternalFormat, texWidth, texHeight, 0, glFormat, type, null);
        return textureID;
    }
}

class CombinedAnimation {
    getStart() {
        return this.start;
    }
    getEnd() {
        return this.end;
    }
    getFramesCount() {
        return this.frames;
    }
    getCurrentCoeff() {
        return this.currentCoeff;
    }
    constructor(frames) {
        this.frames = frames;
        this.start = 0;
        this.end = 0;
        this.currentCoeff = 0;
    }
    clamp(i, low, high) {
        return Math.max(Math.min(i, high), low);
    }
    animate(coeff) {
        const clampedCoeff = this.clamp(coeff, 0.0, 1.0);
        this.start = Math.trunc(clampedCoeff * (this.frames - 1));
        if (this.start == this.frames - 1)
            this.start = this.frames - 2;
        this.end = this.start + 1;
        this.currentCoeff = (clampedCoeff * (this.frames - 1)) - this.start;
    }
}

/**
 * Simple shader using one texture.
 */
class DiffuseShader extends BaseShader {
    /** @inheritdoc */
    fillCode() {
        this.vertexShaderCode = 'uniform mat4 view_proj_matrix;\n' +
            'attribute vec4 rm_Vertex;\n' +
            'attribute vec2 rm_TexCoord0;\n' +
            'varying vec2 vTextureCoord;\n' +
            '\n' +
            'void main() {\n' +
            '  gl_Position = view_proj_matrix * rm_Vertex;\n' +
            '  vTextureCoord = rm_TexCoord0;\n' +
            '}';
        this.fragmentShaderCode = 'precision mediump float;\n' +
            'varying vec2 vTextureCoord;\n' +
            'uniform sampler2D sTexture;\n' +
            '\n' +
            'void main() {\n' +
            '  gl_FragColor = texture2D(sTexture, vTextureCoord);\n' +
            '}';
    }
    /** @inheritdoc */
    fillUniformsAttributes() {
        this.view_proj_matrix = this.getUniform('view_proj_matrix');
        this.rm_Vertex = this.getAttrib('rm_Vertex');
        this.rm_TexCoord0 = this.getAttrib('rm_TexCoord0');
        this.sTexture = this.getUniform('sTexture');
    }
    /** @inheritdoc */
    drawModel(renderer, model, tx, ty, tz, rx, ry, rz, sx, sy, sz, attribs) {
        if (this.rm_Vertex === undefined || this.rm_TexCoord0 === undefined || this.view_proj_matrix === undefined) {
            return;
        }
        const gl = renderer.gl;
        model.bindBuffers(gl);
        gl.enableVertexAttribArray(this.rm_Vertex);
        gl.enableVertexAttribArray(this.rm_TexCoord0);
        if (attribs) {
            for (const [key, value] of attribs) {
                gl.vertexAttribPointer(key, ...value);
            }
        }
        else {
            gl.vertexAttribPointer(this.rm_Vertex, 3, gl.FLOAT, false, 4 * (3 + 2), 0);
            gl.vertexAttribPointer(this.rm_TexCoord0, 2, gl.FLOAT, false, 4 * (3 + 2), 4 * 3);
        }
        renderer.calculateMVPMatrix(tx, ty, tz, rx, ry, rz, sx, sy, sz);
        gl.uniformMatrix4fv(this.view_proj_matrix, false, renderer.getMVPMatrix());
        gl.drawElements(gl.TRIANGLES, model.getNumIndices() * 3, gl.UNSIGNED_SHORT, 0);
        renderer.checkGlError("DiffuseShader glDrawElements");
    }
}

/*! *****************************************************************************
Copyright (c) Microsoft Corporation. All rights reserved.
Licensed under the Apache License, Version 2.0 (the "License"); you may not use
this file except in compliance with the License. You may obtain a copy of the
License at http://www.apache.org/licenses/LICENSE-2.0

THIS CODE IS PROVIDED ON AN *AS IS* BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
KIND, EITHER EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY IMPLIED
WARRANTIES OR CONDITIONS OF TITLE, FITNESS FOR A PARTICULAR PURPOSE,
MERCHANTABLITY OR NON-INFRINGEMENT.

See the Apache Version 2.0 License for specific language governing permissions
and limitations under the License.
***************************************************************************** */

function __awaiter(thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
}

/**
 * Common utilities
 * @module glMatrix
 */
// Configuration Constants
var EPSILON = 0.000001;
var ARRAY_TYPE = typeof Float32Array !== 'undefined' ? Float32Array : Array;
if (!Math.hypot) Math.hypot = function () {
  var y = 0,
      i = arguments.length;

  while (i--) {
    y += arguments[i] * arguments[i];
  }

  return Math.sqrt(y);
};

/**
 * 4x4 Matrix<br>Format: column-major, when typed out it looks like row-major<br>The matrices are being post multiplied.
 * @module mat4
 */

/**
 * Creates a new identity mat4
 *
 * @returns {mat4} a new 4x4 matrix
 */

function create$1() {
  var out = new ARRAY_TYPE(16);

  if (ARRAY_TYPE != Float32Array) {
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[11] = 0;
    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
  }

  out[0] = 1;
  out[5] = 1;
  out[10] = 1;
  out[15] = 1;
  return out;
}
/**
 * Creates a new mat4 initialized with values from an existing matrix
 *
 * @param {ReadonlyMat4} a matrix to clone
 * @returns {mat4} a new 4x4 matrix
 */

function clone(a) {
  var out = new ARRAY_TYPE(16);
  out[0] = a[0];
  out[1] = a[1];
  out[2] = a[2];
  out[3] = a[3];
  out[4] = a[4];
  out[5] = a[5];
  out[6] = a[6];
  out[7] = a[7];
  out[8] = a[8];
  out[9] = a[9];
  out[10] = a[10];
  out[11] = a[11];
  out[12] = a[12];
  out[13] = a[13];
  out[14] = a[14];
  out[15] = a[15];
  return out;
}
/**
 * Set a mat4 to the identity matrix
 *
 * @param {mat4} out the receiving matrix
 * @returns {mat4} out
 */

function identity(out) {
  out[0] = 1;
  out[1] = 0;
  out[2] = 0;
  out[3] = 0;
  out[4] = 0;
  out[5] = 1;
  out[6] = 0;
  out[7] = 0;
  out[8] = 0;
  out[9] = 0;
  out[10] = 1;
  out[11] = 0;
  out[12] = 0;
  out[13] = 0;
  out[14] = 0;
  out[15] = 1;
  return out;
}
/**
 * Inverts a mat4
 *
 * @param {mat4} out the receiving matrix
 * @param {ReadonlyMat4} a the source matrix
 * @returns {mat4} out
 */

function invert(out, a) {
  var a00 = a[0],
      a01 = a[1],
      a02 = a[2],
      a03 = a[3];
  var a10 = a[4],
      a11 = a[5],
      a12 = a[6],
      a13 = a[7];
  var a20 = a[8],
      a21 = a[9],
      a22 = a[10],
      a23 = a[11];
  var a30 = a[12],
      a31 = a[13],
      a32 = a[14],
      a33 = a[15];
  var b00 = a00 * a11 - a01 * a10;
  var b01 = a00 * a12 - a02 * a10;
  var b02 = a00 * a13 - a03 * a10;
  var b03 = a01 * a12 - a02 * a11;
  var b04 = a01 * a13 - a03 * a11;
  var b05 = a02 * a13 - a03 * a12;
  var b06 = a20 * a31 - a21 * a30;
  var b07 = a20 * a32 - a22 * a30;
  var b08 = a20 * a33 - a23 * a30;
  var b09 = a21 * a32 - a22 * a31;
  var b10 = a21 * a33 - a23 * a31;
  var b11 = a22 * a33 - a23 * a32; // Calculate the determinant

  var det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;

  if (!det) {
    return null;
  }

  det = 1.0 / det;
  out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
  out[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
  out[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
  out[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
  out[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
  out[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
  out[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
  out[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
  out[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
  out[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
  out[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
  out[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
  out[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
  out[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
  out[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
  out[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;
  return out;
}
/**
 * Multiplies two mat4s
 *
 * @param {mat4} out the receiving matrix
 * @param {ReadonlyMat4} a the first operand
 * @param {ReadonlyMat4} b the second operand
 * @returns {mat4} out
 */

function multiply(out, a, b) {
  var a00 = a[0],
      a01 = a[1],
      a02 = a[2],
      a03 = a[3];
  var a10 = a[4],
      a11 = a[5],
      a12 = a[6],
      a13 = a[7];
  var a20 = a[8],
      a21 = a[9],
      a22 = a[10],
      a23 = a[11];
  var a30 = a[12],
      a31 = a[13],
      a32 = a[14],
      a33 = a[15]; // Cache only the current line of the second matrix

  var b0 = b[0],
      b1 = b[1],
      b2 = b[2],
      b3 = b[3];
  out[0] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
  out[1] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
  out[2] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
  out[3] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
  b0 = b[4];
  b1 = b[5];
  b2 = b[6];
  b3 = b[7];
  out[4] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
  out[5] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
  out[6] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
  out[7] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
  b0 = b[8];
  b1 = b[9];
  b2 = b[10];
  b3 = b[11];
  out[8] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
  out[9] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
  out[10] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
  out[11] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
  b0 = b[12];
  b1 = b[13];
  b2 = b[14];
  b3 = b[15];
  out[12] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
  out[13] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
  out[14] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
  out[15] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
  return out;
}
/**
 * Translate a mat4 by the given vector
 *
 * @param {mat4} out the receiving matrix
 * @param {ReadonlyMat4} a the matrix to translate
 * @param {ReadonlyVec3} v vector to translate by
 * @returns {mat4} out
 */

function translate(out, a, v) {
  var x = v[0],
      y = v[1],
      z = v[2];
  var a00, a01, a02, a03;
  var a10, a11, a12, a13;
  var a20, a21, a22, a23;

  if (a === out) {
    out[12] = a[0] * x + a[4] * y + a[8] * z + a[12];
    out[13] = a[1] * x + a[5] * y + a[9] * z + a[13];
    out[14] = a[2] * x + a[6] * y + a[10] * z + a[14];
    out[15] = a[3] * x + a[7] * y + a[11] * z + a[15];
  } else {
    a00 = a[0];
    a01 = a[1];
    a02 = a[2];
    a03 = a[3];
    a10 = a[4];
    a11 = a[5];
    a12 = a[6];
    a13 = a[7];
    a20 = a[8];
    a21 = a[9];
    a22 = a[10];
    a23 = a[11];
    out[0] = a00;
    out[1] = a01;
    out[2] = a02;
    out[3] = a03;
    out[4] = a10;
    out[5] = a11;
    out[6] = a12;
    out[7] = a13;
    out[8] = a20;
    out[9] = a21;
    out[10] = a22;
    out[11] = a23;
    out[12] = a00 * x + a10 * y + a20 * z + a[12];
    out[13] = a01 * x + a11 * y + a21 * z + a[13];
    out[14] = a02 * x + a12 * y + a22 * z + a[14];
    out[15] = a03 * x + a13 * y + a23 * z + a[15];
  }

  return out;
}
/**
 * Scales the mat4 by the dimensions in the given vec3 not using vectorization
 *
 * @param {mat4} out the receiving matrix
 * @param {ReadonlyMat4} a the matrix to scale
 * @param {ReadonlyVec3} v the vec3 to scale the matrix by
 * @returns {mat4} out
 **/

function scale$1(out, a, v) {
  var x = v[0],
      y = v[1],
      z = v[2];
  out[0] = a[0] * x;
  out[1] = a[1] * x;
  out[2] = a[2] * x;
  out[3] = a[3] * x;
  out[4] = a[4] * y;
  out[5] = a[5] * y;
  out[6] = a[6] * y;
  out[7] = a[7] * y;
  out[8] = a[8] * z;
  out[9] = a[9] * z;
  out[10] = a[10] * z;
  out[11] = a[11] * z;
  out[12] = a[12];
  out[13] = a[13];
  out[14] = a[14];
  out[15] = a[15];
  return out;
}
/**
 * Rotates a mat4 by the given angle around the given axis
 *
 * @param {mat4} out the receiving matrix
 * @param {ReadonlyMat4} a the matrix to rotate
 * @param {Number} rad the angle to rotate the matrix by
 * @param {ReadonlyVec3} axis the axis to rotate around
 * @returns {mat4} out
 */

function rotate(out, a, rad, axis) {
  var x = axis[0],
      y = axis[1],
      z = axis[2];
  var len = Math.hypot(x, y, z);
  var s, c, t;
  var a00, a01, a02, a03;
  var a10, a11, a12, a13;
  var a20, a21, a22, a23;
  var b00, b01, b02;
  var b10, b11, b12;
  var b20, b21, b22;

  if (len < EPSILON) {
    return null;
  }

  len = 1 / len;
  x *= len;
  y *= len;
  z *= len;
  s = Math.sin(rad);
  c = Math.cos(rad);
  t = 1 - c;
  a00 = a[0];
  a01 = a[1];
  a02 = a[2];
  a03 = a[3];
  a10 = a[4];
  a11 = a[5];
  a12 = a[6];
  a13 = a[7];
  a20 = a[8];
  a21 = a[9];
  a22 = a[10];
  a23 = a[11]; // Construct the elements of the rotation matrix

  b00 = x * x * t + c;
  b01 = y * x * t + z * s;
  b02 = z * x * t - y * s;
  b10 = x * y * t - z * s;
  b11 = y * y * t + c;
  b12 = z * y * t + x * s;
  b20 = x * z * t + y * s;
  b21 = y * z * t - x * s;
  b22 = z * z * t + c; // Perform rotation-specific matrix multiplication

  out[0] = a00 * b00 + a10 * b01 + a20 * b02;
  out[1] = a01 * b00 + a11 * b01 + a21 * b02;
  out[2] = a02 * b00 + a12 * b01 + a22 * b02;
  out[3] = a03 * b00 + a13 * b01 + a23 * b02;
  out[4] = a00 * b10 + a10 * b11 + a20 * b12;
  out[5] = a01 * b10 + a11 * b11 + a21 * b12;
  out[6] = a02 * b10 + a12 * b11 + a22 * b12;
  out[7] = a03 * b10 + a13 * b11 + a23 * b12;
  out[8] = a00 * b20 + a10 * b21 + a20 * b22;
  out[9] = a01 * b20 + a11 * b21 + a21 * b22;
  out[10] = a02 * b20 + a12 * b21 + a22 * b22;
  out[11] = a03 * b20 + a13 * b21 + a23 * b22;

  if (a !== out) {
    // If the source and destination differ, copy the unchanged last row
    out[12] = a[12];
    out[13] = a[13];
    out[14] = a[14];
    out[15] = a[15];
  }

  return out;
}
/**
 * Rotates a matrix by the given angle around the X axis
 *
 * @param {mat4} out the receiving matrix
 * @param {ReadonlyMat4} a the matrix to rotate
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat4} out
 */

function rotateX(out, a, rad) {
  var s = Math.sin(rad);
  var c = Math.cos(rad);
  var a10 = a[4];
  var a11 = a[5];
  var a12 = a[6];
  var a13 = a[7];
  var a20 = a[8];
  var a21 = a[9];
  var a22 = a[10];
  var a23 = a[11];

  if (a !== out) {
    // If the source and destination differ, copy the unchanged rows
    out[0] = a[0];
    out[1] = a[1];
    out[2] = a[2];
    out[3] = a[3];
    out[12] = a[12];
    out[13] = a[13];
    out[14] = a[14];
    out[15] = a[15];
  } // Perform axis-specific matrix multiplication


  out[4] = a10 * c + a20 * s;
  out[5] = a11 * c + a21 * s;
  out[6] = a12 * c + a22 * s;
  out[7] = a13 * c + a23 * s;
  out[8] = a20 * c - a10 * s;
  out[9] = a21 * c - a11 * s;
  out[10] = a22 * c - a12 * s;
  out[11] = a23 * c - a13 * s;
  return out;
}
/**
 * Rotates a matrix by the given angle around the Y axis
 *
 * @param {mat4} out the receiving matrix
 * @param {ReadonlyMat4} a the matrix to rotate
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat4} out
 */

function rotateY(out, a, rad) {
  var s = Math.sin(rad);
  var c = Math.cos(rad);
  var a00 = a[0];
  var a01 = a[1];
  var a02 = a[2];
  var a03 = a[3];
  var a20 = a[8];
  var a21 = a[9];
  var a22 = a[10];
  var a23 = a[11];

  if (a !== out) {
    // If the source and destination differ, copy the unchanged rows
    out[4] = a[4];
    out[5] = a[5];
    out[6] = a[6];
    out[7] = a[7];
    out[12] = a[12];
    out[13] = a[13];
    out[14] = a[14];
    out[15] = a[15];
  } // Perform axis-specific matrix multiplication


  out[0] = a00 * c - a20 * s;
  out[1] = a01 * c - a21 * s;
  out[2] = a02 * c - a22 * s;
  out[3] = a03 * c - a23 * s;
  out[8] = a00 * s + a20 * c;
  out[9] = a01 * s + a21 * c;
  out[10] = a02 * s + a22 * c;
  out[11] = a03 * s + a23 * c;
  return out;
}
/**
 * Rotates a matrix by the given angle around the Z axis
 *
 * @param {mat4} out the receiving matrix
 * @param {ReadonlyMat4} a the matrix to rotate
 * @param {Number} rad the angle to rotate the matrix by
 * @returns {mat4} out
 */

function rotateZ(out, a, rad) {
  var s = Math.sin(rad);
  var c = Math.cos(rad);
  var a00 = a[0];
  var a01 = a[1];
  var a02 = a[2];
  var a03 = a[3];
  var a10 = a[4];
  var a11 = a[5];
  var a12 = a[6];
  var a13 = a[7];

  if (a !== out) {
    // If the source and destination differ, copy the unchanged last row
    out[8] = a[8];
    out[9] = a[9];
    out[10] = a[10];
    out[11] = a[11];
    out[12] = a[12];
    out[13] = a[13];
    out[14] = a[14];
    out[15] = a[15];
  } // Perform axis-specific matrix multiplication


  out[0] = a00 * c + a10 * s;
  out[1] = a01 * c + a11 * s;
  out[2] = a02 * c + a12 * s;
  out[3] = a03 * c + a13 * s;
  out[4] = a10 * c - a00 * s;
  out[5] = a11 * c - a01 * s;
  out[6] = a12 * c - a02 * s;
  out[7] = a13 * c - a03 * s;
  return out;
}
/**
 * Returns the translation vector component of a transformation
 *  matrix. If a matrix is built with fromRotationTranslation,
 *  the returned vector will be the same as the translation vector
 *  originally supplied.
 * @param  {vec3} out Vector to receive translation component
 * @param  {ReadonlyMat4} mat Matrix to be decomposed (input)
 * @return {vec3} out
 */

function getTranslation(out, mat) {
  out[0] = mat[12];
  out[1] = mat[13];
  out[2] = mat[14];
  return out;
}
/**
 * Generates a orthogonal projection matrix with the given bounds.
 * The near/far clip planes correspond to a normalized device coordinate Z range of [-1, 1],
 * which matches WebGL/OpenGL's clip volume.
 *
 * @param {mat4} out mat4 frustum matrix will be written into
 * @param {number} left Left bound of the frustum
 * @param {number} right Right bound of the frustum
 * @param {number} bottom Bottom bound of the frustum
 * @param {number} top Top bound of the frustum
 * @param {number} near Near bound of the frustum
 * @param {number} far Far bound of the frustum
 * @returns {mat4} out
 */

function orthoNO(out, left, right, bottom, top, near, far) {
  var lr = 1 / (left - right);
  var bt = 1 / (bottom - top);
  var nf = 1 / (near - far);
  out[0] = -2 * lr;
  out[1] = 0;
  out[2] = 0;
  out[3] = 0;
  out[4] = 0;
  out[5] = -2 * bt;
  out[6] = 0;
  out[7] = 0;
  out[8] = 0;
  out[9] = 0;
  out[10] = 2 * nf;
  out[11] = 0;
  out[12] = (left + right) * lr;
  out[13] = (top + bottom) * bt;
  out[14] = (far + near) * nf;
  out[15] = 1;
  return out;
}
/**
 * Alias for {@link mat4.orthoNO}
 * @function
 */

var ortho = orthoNO;
/**
 * Generates a look-at matrix with the given eye position, focal point, and up axis.
 * If you want a matrix that actually makes an object look at another object, you should use targetTo instead.
 *
 * @param {mat4} out mat4 frustum matrix will be written into
 * @param {ReadonlyVec3} eye Position of the viewer
 * @param {ReadonlyVec3} center Point the viewer is looking at
 * @param {ReadonlyVec3} up vec3 pointing up
 * @returns {mat4} out
 */

function lookAt(out, eye, center, up) {
  var x0, x1, x2, y0, y1, y2, z0, z1, z2, len;
  var eyex = eye[0];
  var eyey = eye[1];
  var eyez = eye[2];
  var upx = up[0];
  var upy = up[1];
  var upz = up[2];
  var centerx = center[0];
  var centery = center[1];
  var centerz = center[2];

  if (Math.abs(eyex - centerx) < EPSILON && Math.abs(eyey - centery) < EPSILON && Math.abs(eyez - centerz) < EPSILON) {
    return identity(out);
  }

  z0 = eyex - centerx;
  z1 = eyey - centery;
  z2 = eyez - centerz;
  len = 1 / Math.hypot(z0, z1, z2);
  z0 *= len;
  z1 *= len;
  z2 *= len;
  x0 = upy * z2 - upz * z1;
  x1 = upz * z0 - upx * z2;
  x2 = upx * z1 - upy * z0;
  len = Math.hypot(x0, x1, x2);

  if (!len) {
    x0 = 0;
    x1 = 0;
    x2 = 0;
  } else {
    len = 1 / len;
    x0 *= len;
    x1 *= len;
    x2 *= len;
  }

  y0 = z1 * x2 - z2 * x1;
  y1 = z2 * x0 - z0 * x2;
  y2 = z0 * x1 - z1 * x0;
  len = Math.hypot(y0, y1, y2);

  if (!len) {
    y0 = 0;
    y1 = 0;
    y2 = 0;
  } else {
    len = 1 / len;
    y0 *= len;
    y1 *= len;
    y2 *= len;
  }

  out[0] = x0;
  out[1] = y0;
  out[2] = z0;
  out[3] = 0;
  out[4] = x1;
  out[5] = y1;
  out[6] = z1;
  out[7] = 0;
  out[8] = x2;
  out[9] = y2;
  out[10] = z2;
  out[11] = 0;
  out[12] = -(x0 * eyex + x1 * eyey + x2 * eyez);
  out[13] = -(y0 * eyex + y1 * eyey + y2 * eyez);
  out[14] = -(z0 * eyex + z1 * eyey + z2 * eyez);
  out[15] = 1;
  return out;
}

/**
 * 3 Dimensional Vector
 * @module vec3
 */

/**
 * Creates a new, empty vec3
 *
 * @returns {vec3} a new 3D vector
 */

function create() {
  var out = new ARRAY_TYPE(3);

  if (ARRAY_TYPE != Float32Array) {
    out[0] = 0;
    out[1] = 0;
    out[2] = 0;
  }

  return out;
}
/**
 * Adds two vec3's
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a the first operand
 * @param {ReadonlyVec3} b the second operand
 * @returns {vec3} out
 */

function add(out, a, b) {
  out[0] = a[0] + b[0];
  out[1] = a[1] + b[1];
  out[2] = a[2] + b[2];
  return out;
}
/**
 * Subtracts vector b from vector a
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a the first operand
 * @param {ReadonlyVec3} b the second operand
 * @returns {vec3} out
 */

function subtract(out, a, b) {
  out[0] = a[0] - b[0];
  out[1] = a[1] - b[1];
  out[2] = a[2] - b[2];
  return out;
}
/**
 * Scales a vec3 by a scalar number
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a the vector to scale
 * @param {Number} b amount to scale the vector by
 * @returns {vec3} out
 */

function scale(out, a, b) {
  out[0] = a[0] * b;
  out[1] = a[1] * b;
  out[2] = a[2] * b;
  return out;
}
/**
 * Normalize a vec3
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a vector to normalize
 * @returns {vec3} out
 */

function normalize(out, a) {
  var x = a[0];
  var y = a[1];
  var z = a[2];
  var len = x * x + y * y + z * z;

  if (len > 0) {
    //TODO: evaluate use of glm_invsqrt here?
    len = 1 / Math.sqrt(len);
  }

  out[0] = a[0] * len;
  out[1] = a[1] * len;
  out[2] = a[2] * len;
  return out;
}
/**
 * Computes the cross product of two vec3's
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a the first operand
 * @param {ReadonlyVec3} b the second operand
 * @returns {vec3} out
 */

function cross(out, a, b) {
  var ax = a[0],
      ay = a[1],
      az = a[2];
  var bx = b[0],
      by = b[1],
      bz = b[2];
  out[0] = ay * bz - az * by;
  out[1] = az * bx - ax * bz;
  out[2] = ax * by - ay * bx;
  return out;
}
/**
 * Transforms the vec3 with a mat4.
 * 4th vector component is implicitly '1'
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a the vector to transform
 * @param {ReadonlyMat4} m matrix to transform with
 * @returns {vec3} out
 */

function transformMat4(out, a, m) {
  var x = a[0],
      y = a[1],
      z = a[2];
  var w = m[3] * x + m[7] * y + m[11] * z + m[15];
  w = w || 1.0;
  out[0] = (m[0] * x + m[4] * y + m[8] * z + m[12]) / w;
  out[1] = (m[1] * x + m[5] * y + m[9] * z + m[13]) / w;
  out[2] = (m[2] * x + m[6] * y + m[10] * z + m[14]) / w;
  return out;
}
/**
 * Alias for {@link vec3.subtract}
 * @function
 */

var sub = subtract;
/**
 * Perform some operation over an array of vec3s.
 *
 * @param {Array} a the array of vectors to iterate over
 * @param {Number} stride Number of elements between the start of each vec3. If 0 assumes tightly packed
 * @param {Number} offset Number of elements to skip at the beginning of the array
 * @param {Number} count Number of vec3s to iterate over. If 0 iterates over entire array
 * @param {Function} fn Function to call for each vector in the array
 * @param {Object} [arg] additional argument to pass to fn
 * @returns {Array} a
 * @function
 */

(function () {
  var vec = create();
  return function (a, stride, offset, count, fn, arg) {
    var i, l;

    if (!stride) {
      stride = 3;
    }

    if (!offset) {
      offset = 0;
    }

    if (count) {
      l = Math.min(count * stride + offset, a.length);
    } else {
      l = a.length;
    }

    for (i = offset; i < l; i += stride) {
      vec[0] = a[i];
      vec[1] = a[i + 1];
      vec[2] = a[i + 2];
      fn(vec, vec, arg);
      a[i] = vec[0];
      a[i + 1] = vec[1];
      a[i + 2] = vec[2];
    }

    return a;
  };
})();

var CameraMode;
(function (CameraMode) {
    CameraMode[CameraMode["Rotating"] = 0] = "Rotating";
    CameraMode[CameraMode["Random"] = 1] = "Random";
})(CameraMode || (CameraMode = {}));

class CameraPositionInterpolator {
    constructor() {
        this._speed = 0;
        this.duration = 0;
        this._minDuration = 3000;
        this._timer = 0;
        this.lastTime = 0;
        this._reverse = false;
        this._cameraPosition = create();
        this._cameraRotation = create();
        this._matrix = create$1();
    }
    get cameraPosition() {
        return this._cameraPosition;
    }
    get cameraRotation() {
        return this._cameraRotation;
    }
    set reverse(value) {
        this._reverse = value;
    }
    set minDuration(value) {
        this._minDuration = value;
    }
    get matrix() {
        return this._matrix;
    }
    get speed() {
        return this._speed;
    }
    set speed(value) {
        this._speed = value;
    }
    get position() {
        return this._position;
    }
    set position(value) {
        this._position = value;
        this.duration = Math.max(this.getLength() / this.speed, this._minDuration);
    }
    get timer() {
        return this._timer;
    }
    getLength() {
        if (this.position === undefined) {
            return 0;
        }
        const start = this.position.start.position;
        const end = this.position.end.position;
        return Math.sqrt(Math.pow((end[0] - start[0]), 2) + Math.pow((end[1] - start[1]), 2) + Math.pow((end[2] - start[2]), 2));
    }
    iterate(timeNow) {
        if (this.lastTime != 0) {
            const elapsed = timeNow - this.lastTime;
            this._timer += elapsed / this.duration;
            if (this._timer > 1.0) {
                this._timer = 1.0;
            }
        }
        this.lastTime = timeNow;
        this.updateMatrix();
    }
    reset() {
        this._timer = 0;
        this.updateMatrix();
    }
    updateMatrix() {
        if (this._position === undefined) {
            return;
        }
        const start = this._reverse ? this._position.end : this._position.start;
        const end = this._reverse ? this._position.start : this._position.end;
        this._cameraPosition[0] = start.position[0] + this._timer * (end.position[0] - start.position[0]);
        this._cameraPosition[1] = start.position[1] + this._timer * (end.position[1] - start.position[1]);
        this._cameraPosition[2] = start.position[2] + this._timer * (end.position[2] - start.position[2]);
        this._cameraRotation[0] = start.rotation[0] + this._timer * (end.rotation[0] - start.rotation[0]);
        this._cameraRotation[1] = start.rotation[1] + this._timer * (end.rotation[1] - start.rotation[1]);
        this._cameraRotation[2] = start.rotation[2] + this._timer * (end.rotation[2] - start.rotation[2]);
        identity(this.matrix);
        rotateX(this.matrix, this.matrix, this._cameraRotation[0] - Math.PI / 2.0);
        rotateZ(this.matrix, this.matrix, this._cameraRotation[1]);
        rotateY(this.matrix, this.matrix, this._cameraRotation[2]);
        translate(this.matrix, this.matrix, [-this._cameraPosition[0], -this._cameraPosition[1], -this._cameraPosition[2]]);
    }
}

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
const matrixTemp = create$1();
const calculateModelMatrix = (tx, ty, tz, rx, ry, rz, sx, sy, sz) => {
    identity(matrixTemp);
    rotate(matrixTemp, matrixTemp, 0, [1, 0, 0]);
    translate(matrixTemp, matrixTemp, [tx, ty, tz]);
    scale$1(matrixTemp, matrixTemp, [sx, sy, sz]);
    rotateX(matrixTemp, matrixTemp, rx);
    rotateY(matrixTemp, matrixTemp, ry);
    rotateZ(matrixTemp, matrixTemp, rz);
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
        const mat4x3 = [
            matrixTemp[0], matrixTemp[1], matrixTemp[2], matrixTemp[3],
            matrixTemp[4], matrixTemp[5], matrixTemp[6], matrixTemp[7],
            matrixTemp[8], matrixTemp[9], matrixTemp[10], matrixTemp[11],
            matrixTemp[12], matrixTemp[13], matrixTemp[14], matrixTemp[15]
        ];
        console.log([...mat4x3]);
        // mat4x3.length = 12;
        matrices.push([...mat4x3]);
    }
    return [
        texture,
        positions.length,
        matrices.flat() // FIXME
    ];
}
const [PARTICLES_TEXTURE, PARTICLES_COUNT] = initPositions(40, 0.0, 40);
const [, , ROCKS1_XFORM] = initPositions(97, 0.7, 23, 0, [0.0055, 0.004]);
const [, , ROCKS2_XFORM] = initPositions(119, 0.72, 25, 0, [0.006, 0.004]);
const [, , ROCKS3_XFORM] = initPositions(60, 0.75, 60, 0, [0.012, 0.004]); // outer, large, non-floating
const [, , ROCKS4_XFORM] = initPositions(40, 0, 10, 0, [0.0055, 0.004]); // central tall floating
const [, , ROCKS5_XFORM] = initPositions(70, 0, 300, 0, [0.0055, 0.004]); // central non-floating
const [, , TREES_XFORM] = initPositions(1360, 0.0, 60, 0, [0.003, 0.003]);
const [ROCKS1_TEXTURE, ROCKS1_COUNT] = initPositions(97, 0.7, 23);
const [ROCKS2_TEXTURE, ROCKS2_COUNT] = initPositions(119, 0.72, 25);
const [ROCKS3_TEXTURE, ROCKS3_COUNT] = initPositions(60, 0.75, 60); // outer, large, non-floating
const [ROCKS4_TEXTURE, ROCKS4_COUNT] = initPositions(40, 0, 10); // central tall floating
const [ROCKS5_TEXTURE, ROCKS5_COUNT] = initPositions(70, 0, 30); // central non-floating
const [TREES_TEXTURE, TREES_COUNT] = initPositions(1360, 0.0, 60);
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
const BIRD_PATHS = [
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

const ShaderCommonFunctions = {
    RANDOM: `
    /** From https://thebookofshaders.com/10/ */
    float random_vec2 (vec2 st) {
        return fract(sin(dot(st.xy,vec2(12.9898, 78.233))) * 43758.5453123);
    }

    /** Optimized version of the same random() from The Book of Shaders */
    float random (float st) {
        return fract(sin(st) * 43758.5453123);
    }
    `,
    INVERSE_RANDOM: `
    /** From https://thebookofshaders.com/10/ */
    float random_vec2 (vec2 st) {
        return 1.0 - fract(sin(dot(st.xy,vec2(12.9898, 78.233))) * 43758.5453123);
    }

    /** Optimized version of the same random() from The Book of Shaders */
    float random (float st) {
        return 1.0 - fract(sin(st) * 43758.5453123);
    }
    `,
    GRADIENT_NOISE: `
    vec2 random2(vec2 st){
        st = vec2( dot(st,vec2(127.1,311.7)),
                  dot(st,vec2(269.5,183.3)) );
        return -1.0 + 2.0*fract(sin(st)*43758.5453123);
    }

    // Gradient Noise by Inigo Quilez - iq/2013
    // https://www.shadertoy.com/view/XdXGW8
    // The MIT License
    // Copyright © 2013 Inigo Quilez
    // Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions: The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software. THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
    // https://www.youtube.com/c/InigoQuilez
    // https://iquilezles.org    
    float noise(vec2 st) {
        vec2 i = floor(st);
        vec2 f = fract(st);
    
        vec2 u = f*f*(3.0-2.0*f);
    
        return mix( mix( dot( random2(i + vec2(0.0,0.0) ), f - vec2(0.0,0.0) ),
                         dot( random2(i + vec2(1.0,0.0) ), f - vec2(1.0,0.0) ), u.x),
                    mix( dot( random2(i + vec2(0.0,1.0) ), f - vec2(0.0,1.0) ),
                         dot( random2(i + vec2(1.0,1.0) ), f - vec2(1.0,1.0) ), u.x), u.y);
    }    
    `,
    ROTATION: `
    /** https://www.neilmendoza.com/glsl-rotation-about-an-arbitrary-axis/ */
    mat4 rotationMatrix(vec3 axis, float angle)
    {
        // axis = normalize(axis);
        float s = sin(angle);
        float c = cos(angle);
        float oc = 1.0 - c;
        
        return mat4(oc * axis.x * axis.x + c,           oc * axis.x * axis.y - axis.z * s,  oc * axis.z * axis.x + axis.y * s,  0.0,
                    oc * axis.x * axis.y + axis.z * s,  oc * axis.y * axis.y + c,           oc * axis.y * axis.z - axis.x * s,  0.0,
                    oc * axis.z * axis.x - axis.y * s,  oc * axis.y * axis.z + axis.x * s,  oc * axis.z * axis.z + c,           0.0,
                    0.0,                                0.0,                                0.0,                                1.0);
    }  

    /** Optimized version to rotate only around Z axis */
    mat4 rotationAroundZ(float angle)
    {
        float s = sin(angle);
        float c = cos(angle);
        
        return mat4(c,  -s,   0.0, 0.0,
                    s,   c,   0.0, 0.0,
                    0.0, 0.0, 1.0, 0.0,
                    0.0, 0.0, 0.0, 1.0);
    }
    `
};

class InstancedTexturePositionsShader extends DiffuseShader {
    fillCode() {
        this.vertexShaderCode = `#version 300 es
            precision highp float;

            uniform mat4 view_proj_matrix;

            uniform vec2 uScale; // x: base scale for models; y: max random additional scale
            uniform sampler2D sPositions;
            uniform int uPositionOffset;

            out mediump vec2 vTexCoord;

            in vec2 rm_TexCoord0;
            in vec4 rm_Vertex;

            ${ShaderCommonFunctions.RANDOM}
            ${ShaderCommonFunctions.ROTATION}

            const float PI2 = 6.28318530718;

            void main(void)
            {
                ${InstancedTexturePositionsShader.COMMON_TRANSFORMS}

                gl_Position = view_proj_matrix * vertex;
                vTexCoord = rm_TexCoord0;
            }`;
        this.fragmentShaderCode = `#version 300 es
            precision mediump float;
            uniform sampler2D sTexture;

            in mediump vec2 vTexCoord;
            out vec4 fragColor;

            void main(void)
            {
                fragColor = texture(sTexture, vTexCoord);
            }`;
    }
    fillUniformsAttributes() {
        super.fillUniformsAttributes();
        this.uScale = this.getUniform("uScale");
        this.sPositions = this.getUniform("sPositions");
        this.uPositionOffset = this.getUniform("uPositionOffset");
    }
    /** @inheritdoc */
    drawModel(renderer, model, tx, ty, tz, rx, ry, rz, sx, sy, sz) {
        if (this.rm_Vertex === undefined
            || this.rm_TexCoord0 === undefined
            || this.view_proj_matrix === undefined) {
            return;
        }
        const gl = renderer.gl;
        model.bindBuffers(gl);
        gl.enableVertexAttribArray(this.rm_Vertex);
        gl.enableVertexAttribArray(this.rm_TexCoord0);
        gl.vertexAttribPointer(this.rm_Vertex, 3, gl.HALF_FLOAT, false, 12, 0);
        gl.vertexAttribPointer(this.rm_TexCoord0, 2, gl.HALF_FLOAT, false, 12, 6);
        renderer.calculateMVPMatrix(tx, ty, tz, rx, ry, rz, sx, sy, sz);
        gl.uniformMatrix4fv(this.view_proj_matrix, false, renderer.getMVPMatrix());
        gl.drawElements(gl.TRIANGLES, model.getNumIndices() * 3, gl.UNSIGNED_SHORT, 0);
        renderer.checkGlError("VertexLitInstancedShader glDrawElements");
    }
    drawInstanced(renderer, model, tx, ty, tz, rx, ry, rz, sx, sy, sz, offset, instances) {
        if (this.rm_Vertex === undefined
            || this.rm_TexCoord0 === undefined
            || this.view_proj_matrix === undefined) {
            return;
        }
        const gl = renderer.gl;
        model.bindBuffers(gl);
        gl.enableVertexAttribArray(this.rm_Vertex);
        gl.enableVertexAttribArray(this.rm_TexCoord0);
        gl.vertexAttribPointer(this.rm_Vertex, 3, gl.HALF_FLOAT, false, 12, 0);
        gl.vertexAttribPointer(this.rm_TexCoord0, 2, gl.HALF_FLOAT, false, 12, 6);
        renderer.calculateMVPMatrix(tx, ty, tz, rx, ry, rz, sx, sy, sz);
        gl.uniformMatrix4fv(this.view_proj_matrix, false, renderer.getMVPMatrix());
        gl.uniform1i(this.uPositionOffset, offset);
        gl.drawElementsInstanced(gl.TRIANGLES, model.getNumIndices() * 3, gl.UNSIGNED_SHORT, 0, instances);
        renderer.checkGlError("InstancedVegetationShader glDrawElements");
    }
}
InstancedTexturePositionsShader.COMMON_TRANSFORMS = `
    vec4 vertex = rm_Vertex;
    float fInstance = float(gl_InstanceID);
    int x = uPositionOffset + gl_InstanceID;
    vec4 translationAndScale = texelFetch(sPositions, ivec2(x, 0), 0); // xy=translation, z=scale
    vec4 rotations = texelFetch(sPositions, ivec2(x, 1), 0); // x=sin a; y=cos a
    vec2 translation = translationAndScale.xy;
    float scale = uScale.x + translationAndScale.z * uScale.y;
    float s = rotations.x;
    float c = rotations.y;
    mat4 rotationMatrix = mat4(
        c,  -s,   0.0, 0.0,
        s,   c,   0.0, 0.0,
        0.0, 0.0, 1.0, 0.0,
        0.0, 0.0, 0.0, 1.0
    );

    vertex *= rotationMatrix;
    vertex *= vec4(scale, scale, scale, 1.0);
    vertex.xy += translation;
    `;

class InstancedTexturePositionsColoredShader extends InstancedTexturePositionsShader {
    fillCode() {
        super.fillCode();
        this.fragmentShaderCode = `#version 300 es
            precision mediump float;
            uniform sampler2D sTexture;
            uniform vec4 color;

            in mediump vec2 vTexCoord;
            out vec4 fragColor;

            void main(void)
            {
                fragColor = texture(sTexture, vTexCoord) * color;
            }`;
    }
    fillUniformsAttributes() {
        super.fillUniformsAttributes();
        this.color = this.getUniform("color");
    }
}

var _a$1;
class FogShader extends InstancedTexturePositionsColoredShader {
    fillCode() {
        this.vertexShaderCode = `#version 300 es
            precision highp float;

            uniform mat4 view_proj_matrix;

            uniform mat4 view_matrix;
            uniform mat4 model_matrix;
            out vec3 texCoord;

            uniform vec2 uScale; // x: base scale for models; y: max random additional scale
            uniform sampler2D sPositions;
            uniform int uPositionOffset;

            in vec2 rm_TexCoord0;
            in vec4 rm_Vertex;

            ${ShaderCommonFunctions.RANDOM}
            ${ShaderCommonFunctions.ROTATION}

            const float PI2 = 6.28318530718;

            ${FogShader.FOG_VERTEX_UNIFORMS_VARYINGS}

            void main(void)
            {
                ${InstancedTexturePositionsShader.COMMON_TRANSFORMS}
                vertex.z += rotations.x * heightOffset.x + heightOffset.y;

                gl_Position = view_proj_matrix * vertex;
                vTexCoord = rm_TexCoord0;

                ${FogShader.FOG_VERTEX_MAIN}
            }`;
        this.fragmentShaderCode = `#version 300 es
            precision mediump float;
            uniform sampler2D sTexture;
            uniform vec4 color;

            in mediump vec2 vTexCoord;
            out vec4 fragColor;

            ${FogShader.FOG_FRAGMENT_UNIFORMS_VARYINGS}

            void main(void)
            {
                ${FogShader.FOG_FRAGMENT_MAIN}
                vec4 diffuse = texture(sTexture, vTexCoord) * color;
                fragColor = mix(diffuse, fogColor, fogAmount);
            }`;
    }
    fillUniformsAttributes() {
        super.fillUniformsAttributes();
        this.fogStartDistance = this.getUniform("fogStartDistance");
        this.fogDistance = this.getUniform("fogDistance");
        this.heightFogParams = this.getUniform("heightFogParams");
        this.heightOffset = this.getUniform("heightOffset");
        this.view_matrix = this.getUniform("view_matrix");
        this.texCubemap = this.getUniform("texCubemap");
    }
}
_a$1 = FogShader;
FogShader.FOG_VERTEX_UNIFORMS_VARYINGS = `
        uniform vec2 heightOffset; // x: random positive/negative offset; y: fixed offset
        uniform float fogDistance;
        uniform float fogStartDistance;
        out float vFogAmount;
        out float vFogZ;
        out mediump vec2 vTexCoord;
        const float ZERO = 0.0;
        const float ONE = 1.0;
    `;
FogShader.FOG_FRAGMENT_UNIFORMS_VARYINGS = `
        in float vFogAmount;
        in float vFogZ;
        uniform vec2 heightFogParams;
        in vec3 texCoord;
        uniform samplerCube texCubemap;
        const float ZERO = 0.0;
        const float ONE = 1.0;
    `;
FogShader.FOG_AMOUNT_VERTEX = `
        float distanceFog = clamp((length(gl_Position) - fogStartDistance) / fogDistance, ZERO, ONE);
        vFogAmount = clamp(distanceFog, ZERO, ONE);
    `;
FogShader.FOG_VERTEX_MAIN = `
        ${_a$1.FOG_AMOUNT_VERTEX}
        vFogZ = vertex.z;
        texCoord = inverse(mat3(view_matrix)) * (view_matrix * vertex).xyz;
    `;
FogShader.FOG_AMOUNT_FRAGMENT = `
        float heightFog = clamp(1.0 - ((vFogZ + heightFogParams.x) * heightFogParams.y), ZERO, ONE);
        float fogAmount = clamp(vFogAmount + heightFog, ZERO, ONE);
    `;
FogShader.FOG_FRAGMENT_MAIN = `
        ${_a$1.FOG_AMOUNT_FRAGMENT}
        vec4 fogColor = texture(texCubemap, texCoord);
    `;

class FogAtShader extends FogShader {
    fillCode() {
        super.fillCode();
        this.fragmentShaderCode = `#version 300 es
            precision mediump float;
            uniform sampler2D sTexture;
            uniform vec4 color;

            in mediump vec2 vTexCoord;
            out vec4 fragColor;

            ${FogShader.FOG_FRAGMENT_UNIFORMS_VARYINGS}

            void main(void)
            {
                ${FogShader.FOG_FRAGMENT_MAIN}
                vec4 diffuse = texture(sTexture, vTexCoord) * color;
                if (diffuse.a < 0.5) {
                    discard;
                } else {
                    fragColor = mix(diffuse, fogColor, fogAmount);
                }
            }`;
    }
}

class SkyShader extends BaseShader {
    fillCode() {
        this.vertexShaderCode = `#version 300 es
            precision highp float;
            uniform mat4 view_proj_matrix;
            in vec4 rm_Vertex;
            out vec3 texCoord;
            uniform mat4 view_matrix;

            void main() {
                gl_Position = view_proj_matrix * rm_Vertex;
                vec4 p = view_matrix * rm_Vertex;
                texCoord = inverse(mat3(view_matrix)) * p.xyz;
            }`;
        this.fragmentShaderCode = `#version 300 es
            precision mediump float;
            in vec3 texCoord;
            out vec4 color;
            uniform samplerCube texCubemap;

            void main(void) {
                color = texture(texCubemap, texCoord);
            }
        `;
    }
    fillUniformsAttributes() {
        this.view_proj_matrix = this.getUniform("view_proj_matrix");
        this.view_matrix = this.getUniform("view_matrix");
        this.texCubemap = this.getUniform("texCubemap");
        this.rm_Vertex = this.getAttrib("rm_Vertex");
    }
    drawModel(renderer, model, tx, ty, tz, rx, ry, rz, sx, sy, sz) {
        if (this.rm_Vertex === undefined || this.view_proj_matrix === undefined || this.view_matrix === undefined || this.texCubemap === undefined) {
            return;
        }
        const gl = renderer.gl;
        model.bindBuffers(gl);
        gl.enableVertexAttribArray(this.rm_Vertex);
        // gl.enableVertexAttribArray(this.rm_TexCoord0);
        gl.vertexAttribPointer(this.rm_Vertex, 3, gl.FLOAT, false, 4 * (3 + 2), 0);
        // gl.vertexAttribPointer(this.rm_TexCoord0, 2, gl.FLOAT, false, 4 * (3 + 2), 4 * 3);
        // gl.vertexAttribDivisor(this.rm_Vertex, 0);
        renderer.calculateMVPMatrix(tx, ty, tz, rx, ry, rz, sx, sy, sz);
        gl.uniformMatrix4fv(this.view_proj_matrix, false, renderer.getMVPMatrix());
        gl.uniformMatrix4fv(this.view_matrix, false, renderer.getViewMatrix());
        gl.drawElements(gl.TRIANGLES, model.getNumIndices() * 3, gl.UNSIGNED_SHORT, 0);
        renderer.checkGlError("SkyShader glDrawElements");
    }
}

class BirdsShader extends BaseShader {
    fillCode() {
        this.vertexShaderCode = `#version 300 es
            precision highp float;
            uniform highp mat4 uMVPMatrix;
            in highp vec4 aPosition1;
            in highp vec4 aPosition2;
            uniform float m;
            in highp vec2 aTextureCoord;
            out mediump vec2 vTextureCoord;
            uniform vec2 uSeed;

            ${FogShader.FOG_VERTEX_UNIFORMS_VARYINGS}
            out vec3 texCoord;
            uniform mat4 view_matrix;
            uniform mat4 model_matrix;
            ${ShaderCommonFunctions.RANDOM}

            void main() {
              float fInstance = float(gl_InstanceID);
              vec4 vertex = mix(aPosition1, aPosition2, m);
              float r1 = random(fInstance + uSeed.x);
              float r2 = random(fInstance + uSeed.y);
              vec3 translation = vec3(
                150. * r1,
                300. * r2,
                42. * r1
              );
              vertex.xyz += translation;
              gl_Position = uMVPMatrix * vertex;
              vTextureCoord = aTextureCoord;
              vertex = model_matrix * vertex;
              ${FogShader.FOG_VERTEX_MAIN}
            }`;
        this.fragmentShaderCode = `#version 300 es
            precision mediump float;
            in mediump vec2 vTextureCoord;
            uniform sampler2D sTexture;
            out vec4 fragColor;
            uniform vec4 color;
            ${FogShader.FOG_FRAGMENT_UNIFORMS_VARYINGS}

            void main() {
              ${FogShader.FOG_FRAGMENT_MAIN}
              vec4 base = texture(sTexture, vTextureCoord);
              if (base.a < 0.95) {
                discard;
              } else {
                fragColor = mix(base * color, fogColor, fogAmount);
              }
            }`;
    }
    fillUniformsAttributes() {
        this.maPosition1Handle = this.getAttrib("aPosition1");
        this.maPosition2Handle = this.getAttrib("aPosition2");
        this.maTextureHandle = this.getAttrib("aTextureCoord");
        this.muMVPMatrixHandle = this.getUniform("uMVPMatrix");
        this.msTextureHandle = this.getUniform("sTexture");
        this.mMHandle = this.getUniform("m");
        this.uSeed = this.getUniform("uSeed");
        this.color = this.getUniform("color");
        this.fogStartDistance = this.getUniform("fogStartDistance");
        this.fogDistance = this.getUniform("fogDistance");
        this.heightFogParams = this.getUniform("heightFogParams");
        this.view_matrix = this.getUniform("view_matrix");
        this.model_matrix = this.getUniform("model_matrix");
        this.texCubemap = this.getUniform("texCubemap");
    }
    clamp(i, low, high) {
        return Math.max(Math.min(i, high), low);
    }
    drawModel(renderer, model, frames, frame1, frame2, m, tx, ty, tz, rx, ry, rz, sx, sy, sz) {
        if (this.muMVPMatrixHandle === undefined || this.msTextureHandle === undefined || this.mMHandle === undefined || this.maPosition1Handle === undefined || this.maPosition2Handle === undefined || this.maTextureHandle === undefined) {
            return;
        }
        const gl = renderer.gl;
        model.bindBuffers(gl);
        const stride = (2 + frames * 3) * 4;
        const offsetUV = (frames * 3) * 4;
        gl.enableVertexAttribArray(this.maPosition1Handle);
        gl.enableVertexAttribArray(this.maPosition2Handle);
        gl.enableVertexAttribArray(this.maTextureHandle);
        gl.vertexAttribPointer(this.maPosition1Handle, 3, gl.FLOAT, false, stride, 3 * (frame1) * 4);
        gl.vertexAttribPointer(this.maPosition2Handle, 3, gl.FLOAT, false, stride, 3 * (frame2) * 4);
        gl.vertexAttribPointer(this.maTextureHandle, 2, gl.FLOAT, false, stride, offsetUV);
        renderer.calculateMVPMatrix(tx, ty, tz, rx, ry, rz, sx, sy, sz);
        gl.uniformMatrix4fv(this.muMVPMatrixHandle, false, renderer.getMVPMatrix());
        gl.uniform1f(this.mMHandle, this.clamp(m, 0.0, 1.0));
        gl.drawElements(gl.TRIANGLES, model.getNumIndices() * 3, gl.UNSIGNED_SHORT, 0);
        renderer.checkGlError("glDrawElements");
    }
    drawInstanced(renderer, model, frames, frame1, frame2, m, tx, ty, tz, rx, ry, rz, sx, sy, sz, instances) {
        if (this.muMVPMatrixHandle === undefined || this.msTextureHandle === undefined || this.mMHandle === undefined || this.maPosition1Handle === undefined || this.maPosition2Handle === undefined || this.maTextureHandle === undefined) {
            return;
        }
        const gl = renderer.gl;
        model.bindBuffers(gl);
        const stride = (2 + frames * 3) * 4;
        const offsetUV = (frames * 3) * 4;
        gl.enableVertexAttribArray(this.maPosition1Handle);
        gl.enableVertexAttribArray(this.maPosition2Handle);
        gl.enableVertexAttribArray(this.maTextureHandle);
        gl.vertexAttribPointer(this.maPosition1Handle, 3, gl.FLOAT, false, stride, 3 * (frame1) * 4);
        gl.vertexAttribPointer(this.maPosition2Handle, 3, gl.FLOAT, false, stride, 3 * (frame2) * 4);
        gl.vertexAttribPointer(this.maTextureHandle, 2, gl.FLOAT, false, stride, offsetUV);
        renderer.calculateMVPMatrix(tx, ty, tz, rx, ry, rz, sx, sy, sz);
        gl.uniformMatrix4fv(this.muMVPMatrixHandle, false, renderer.getMVPMatrix());
        gl.uniformMatrix4fv(this.model_matrix, false, renderer.getModelMatrix());
        gl.uniform1f(this.mMHandle, this.clamp(m, 0.0, 1.0));
        gl.drawElementsInstanced(gl.TRIANGLES, model.getNumIndices() * 3, gl.UNSIGNED_SHORT, 0, instances);
        renderer.checkGlError("glDrawElementsInstanced");
    }
}

class FogVertexLitShader extends FogShader {
    fillCode() {
        this.vertexShaderCode = `#version 300 es
            precision highp float;

            uniform mat4 view_proj_matrix;

            uniform mat4 view_matrix;
            uniform mat4 model_matrix;
            out vec3 texCoord;

            uniform vec2 uScale; // x: base scale for models; y: max random additional scale
            uniform sampler2D sPositions;
            uniform int uPositionOffset;

            in vec2 rm_TexCoord0;
            in vec4 rm_Vertex;
            in vec3 rm_Normal;

            ${ShaderCommonFunctions.RANDOM}
            ${ShaderCommonFunctions.ROTATION}

            const float PI2 = 6.28318530718;

            ${FogShader.FOG_VERTEX_UNIFORMS_VARYINGS}

            uniform vec4 color;
            uniform vec4 colorSun;
            uniform vec4 lightDir;
            uniform float diffuseExponent;
            out vec4 vDiffuseColor;

            void main(void)
            {
                ${InstancedTexturePositionsShader.COMMON_TRANSFORMS}
                vertex.z += rotations.x * heightOffset.x + heightOffset.y;

                gl_Position = view_proj_matrix * vertex;
                vTexCoord = rm_TexCoord0;

                ${FogShader.FOG_VERTEX_MAIN}

                vec4 normal = vec4(rm_Normal, 0.0) * rotationMatrix;
                float d = pow(max(0.0, dot(normal, lightDir)), diffuseExponent);

                vDiffuseColor = mix(colorSun, color, d);
            }`;
        this.fragmentShaderCode = `#version 300 es
            precision mediump float;
            uniform sampler2D sTexture;

            in mediump vec2 vTexCoord;
            out vec4 fragColor;

            ${FogShader.FOG_FRAGMENT_UNIFORMS_VARYINGS}

            in vec4 vDiffuseColor;

            void main(void)
            {
                ${FogShader.FOG_FRAGMENT_MAIN}
                vec4 diffuse = texture(sTexture, vTexCoord) * vDiffuseColor;
                fragColor = mix(diffuse, fogColor, fogAmount);
            }`;
    }
    fillUniformsAttributes() {
        super.fillUniformsAttributes();
        this.colorSun = this.getUniform("colorSun");
        this.lightDir = this.getUniform("lightDir");
        this.diffuseExponent = this.getUniform("diffuseExponent");
        this.rm_Normal = this.getAttrib("rm_Normal");
    }
    drawInstanced(renderer, model, tx, ty, tz, rx, ry, rz, sx, sy, sz, offset, instances) {
        if (this.rm_Vertex === undefined
            || this.rm_TexCoord0 === undefined
            || this.rm_Normal === undefined
            || this.view_proj_matrix === undefined
            || this.view_matrix === undefined) {
            return;
        }
        const gl = renderer.gl;
        model.bindBuffers(gl);
        gl.enableVertexAttribArray(this.rm_Vertex);
        gl.enableVertexAttribArray(this.rm_TexCoord0);
        gl.enableVertexAttribArray(this.rm_Normal);
        gl.vertexAttribPointer(this.rm_Vertex, 3, gl.HALF_FLOAT, false, 16, 0);
        gl.vertexAttribPointer(this.rm_TexCoord0, 2, gl.HALF_FLOAT, false, 16, 6);
        gl.vertexAttribPointer(this.rm_Normal, 3, gl.HALF_FLOAT, false, 16, 10);
        renderer.calculateMVPMatrix(tx, ty, tz, rx, ry, rz, sx, sy, sz);
        gl.uniformMatrix4fv(this.view_proj_matrix, false, renderer.getMVPMatrix());
        gl.uniformMatrix4fv(this.view_matrix, false, renderer.getViewMatrix());
        gl.uniform1i(this.uPositionOffset, offset);
        gl.drawElementsInstanced(gl.TRIANGLES, model.getNumIndices() * 3, gl.UNSIGNED_SHORT, 0, instances);
        renderer.checkGlError("InstancedVegetationShader glDrawElements");
    }
}

class FogVertexLitGrassShader extends FogVertexLitShader {
    fillCode() {
        this.vertexShaderCode = `#version 300 es
            precision highp float;

            uniform mat4 view_proj_matrix;

            uniform mat4 view_matrix;
            uniform mat4 model_matrix;
            out vec3 texCoord;

            uniform vec2 uScale; // x: base scale for models; y: max random additional scale
            uniform sampler2D sPositions;
            uniform int uPositionOffset;

            in vec2 rm_TexCoord0;
            in vec4 rm_Vertex;
            in vec3 rm_Normal;

            ${ShaderCommonFunctions.RANDOM}
            ${ShaderCommonFunctions.ROTATION}

            const float PI2 = 6.28318530718;

            ${FogShader.FOG_VERTEX_UNIFORMS_VARYINGS}

            uniform vec4 color;
            uniform vec4 colorSun;
            uniform vec4 lightDir;
            uniform float diffuseExponent;
            out vec4 vDiffuseColor;
            out float vGrass;
            uniform float grassAmount;

            void main(void)
            {
                ${InstancedTexturePositionsShader.COMMON_TRANSFORMS}
                vertex.z += rotations.x * heightOffset.x + heightOffset.y;

                gl_Position = view_proj_matrix * vertex;
                vTexCoord = rm_TexCoord0;

                ${FogShader.FOG_VERTEX_MAIN}

                vec4 normal = vec4(rm_Normal, 0.0) * rotationMatrix;

                float d = pow(max(0.0, dot(normal, lightDir)), diffuseExponent);

                vDiffuseColor = mix(colorSun, color, d);
                vGrass = smoothstep(0.2, 0.3, normal.z * grassAmount);
            }`;
        this.fragmentShaderCode = `#version 300 es
            precision mediump float;
            uniform sampler2D sTexture;
            uniform sampler2D sTextureGrass;

            in mediump vec2 vTexCoord;
            out vec4 fragColor;

            ${FogShader.FOG_FRAGMENT_UNIFORMS_VARYINGS}

            in vec4 vDiffuseColor;
            in float vGrass;

            void main(void)
            {
                ${FogShader.FOG_FRAGMENT_MAIN}
                vec4 rock = texture(sTexture, vTexCoord);
                vec4 grass = texture(sTextureGrass, vTexCoord * 5.0);
                vec4 mixed = mix(rock, grass, vGrass);
                vec4 diffuse = mixed * vDiffuseColor;
                fragColor = mix(diffuse, fogColor, fogAmount);
                // fragColor.rgb = texCoord;
            }`;
    }
    fillUniformsAttributes() {
        super.fillUniformsAttributes();
        this.sTextureGrass = this.getUniform("sTextureGrass");
        this.grassAmount = this.getUniform("grassAmount");
    }
}

class FogSpriteShader extends DiffuseShader {
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

            ${FogShader.FOG_VERTEX_UNIFORMS_VARYINGS}

            void main(void)
            {
                vec4 vertex = model_matrix * rm_Vertex;
                gl_Position = view_proj_matrix * rm_Vertex;
                vTexCoord = rm_TexCoord0;
                ${FogShader.FOG_VERTEX_MAIN}
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

            ${FogShader.FOG_FRAGMENT_UNIFORMS_VARYINGS}

            void main(void)
            {
                vec2 coords = gl_FragCoord.xy * uInvViewportSize; // calculate depth texture coordinates
                float geometryZ = calc_depth(texture(sDepth, coords).r); // lineriarize particle depth
                float sceneZ = calc_depth(gl_FragCoord.z); // lineriarize scene depth
                float a = clamp(geometryZ - sceneZ, 0.0, 1.0); // linear clamped diff between scene and particle depth
                float b = smoothstep(0.0, uTransitionSize, a); // apply smoothstep to make soft transition

                ${FogShader.FOG_AMOUNT_FRAGMENT}
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

class InstancedShader extends BaseShader {
    constructor(gl) {
        super(gl);
        this.extBvbi = this.gl.getExtension("WEBGL_draw_instanced_base_vertex_base_instance");
    }
    fillCode() {
        this.vertexShaderCode = `#version 300 es
            precision highp float;

            ${InstancedShader.COMMON_UNIFORMS_ATTRIBUTES}

            in mediump vec2 rm_TexCoord0;
            in vec4 rm_Vertex;
            out mediump vec2 vTexCoord;

            void main(void) {
                ${InstancedShader.COMMON_TRANSFORMS}

                gl_Position = view_proj_matrix * rm_Vertex;
                vTexCoord = rm_TexCoord0;
            }`;
        this.fragmentShaderCode = `#version 300 es
            precision mediump float;
            uniform sampler2D sTexture;

            in mediump vec2 vTexCoord;
            out vec4 fragColor;

            void main(void) {
                fragColor = texture(sTexture, vTexCoord);
                // fragColor.r = 1.; // FIXME
            }`;
    }
    fillUniformsAttributes() {
        this.viewMatrix = this.getUniform("viewMatrix");
        this.projMatrix = this.getUniform("projMatrix");
        this.modelMatrix = this.getAttrib("modelMatrix");
        this.sTexture = this.getUniform("sTexture");
        this.rm_TexCoord0 = this.getAttrib("rm_TexCoord0");
        this.rm_Vertex = this.getAttrib("rm_Vertex");
    }
    /** @inheritdoc */
    drawModel(renderer, model, bufferMatrices) {
        if (this.rm_Vertex === undefined
            || this.rm_TexCoord0 === undefined
            || this.modelMatrix === undefined) {
            return;
        }
        const gl = this.gl;
        model.bindBuffers(gl);
        gl.enableVertexAttribArray(this.rm_Vertex);
        gl.enableVertexAttribArray(this.rm_TexCoord0);
        gl.vertexAttribPointer(this.rm_Vertex, 3, gl.HALF_FLOAT, false, 12, 0);
        gl.vertexAttribPointer(this.rm_TexCoord0, 2, gl.HALF_FLOAT, false, 12, 6);
        gl.bindBuffer(gl.ARRAY_BUFFER, bufferMatrices);
        // set all 4 attributes for matrix
        const bytesPerMatrix = 3 * 16;
        for (let i = 0; i < 3; ++i) {
            const loc = this.modelMatrix + i;
            gl.enableVertexAttribArray(loc);
            // note the stride and offset
            const offset = i * 16; // 4 floats per row, 4 bytes per float
            gl.vertexAttribPointer(loc, // location
            4, // size (num values to pull from buffer per iteration)
            gl.FLOAT, // type of data in buffer
            false, // normalize
            bytesPerMatrix, // stride, num bytes to advance to get to next set of values
            offset);
            // this line says this attribute only changes for each 1 instance
            gl.vertexAttribDivisor(loc, 1);
        }
        gl.uniformMatrix4fv(this.viewMatrix, false, renderer.getViewMatrix());
        gl.uniformMatrix4fv(this.projMatrix, false, renderer.getProjectionMatrix());
        gl.drawElements(gl.TRIANGLES, model.getNumIndices() * 3, gl.UNSIGNED_SHORT, 0);
        // Reset attrib divisor for matrix attribs
        for (let i = 0; i < 4; ++i) {
            const loc = this.modelMatrix + i;
            gl.vertexAttribDivisor(loc, 0);
        }
        renderer.checkGlError("VertexLitInstancedShader glDrawElements");
    }
    drawAllInstances(renderer, model, bufferMatrices, instances) {
        if (this.rm_Vertex === undefined
            || this.rm_TexCoord0 === undefined
            || this.modelMatrix === undefined) {
            return;
        }
        const gl = renderer.gl;
        model.bindBuffers(gl);
        gl.enableVertexAttribArray(this.rm_Vertex);
        gl.enableVertexAttribArray(this.rm_TexCoord0);
        gl.vertexAttribPointer(this.rm_Vertex, 3, gl.HALF_FLOAT, false, 12, 0);
        gl.vertexAttribPointer(this.rm_TexCoord0, 2, gl.HALF_FLOAT, false, 12, 6);
        gl.bindBuffer(gl.ARRAY_BUFFER, bufferMatrices);
        // set all 4 attributes for matrix
        const bytesPerMatrix = 3 * 16;
        for (let i = 0; i < 3; ++i) {
            const loc = this.modelMatrix + i;
            gl.enableVertexAttribArray(loc);
            // note the stride and offset
            const offset = i * 16; // 4 floats per row, 4 bytes per float
            gl.vertexAttribPointer(loc, // location
            4, // size (num values to pull from buffer per iteration)
            gl.FLOAT, // type of data in buffer
            false, // normalize
            bytesPerMatrix, // stride, num bytes to advance to get to next set of values
            offset);
            // this line says this attribute only changes for each 1 instance
            gl.vertexAttribDivisor(loc, 1);
        }
        renderer.calculateMVPMatrix(0, 0, 0, 0, 0, 0, 1, 1, 1);
        gl.uniformMatrix4fv(this.viewMatrix, false, renderer.getViewMatrix());
        gl.uniformMatrix4fv(this.projMatrix, false, renderer.getProjectionMatrix());
        gl.drawElementsInstanced(gl.TRIANGLES, model.getNumIndices() * 3, gl.UNSIGNED_SHORT, 0, instances);
        // Reset attrib divisor for matrix attribs
        for (let i = 0; i < 4; ++i) {
            const loc = this.modelMatrix + i;
            gl.vertexAttribDivisor(loc, 0);
        }
        renderer.checkGlError("InstancedShader drawAllInstances");
    }
    drawInstanced(renderer, model, bufferMatrices, baseInstance, instances) {
        if (this.rm_Vertex === undefined
            || this.rm_TexCoord0 === undefined
            || this.modelMatrix === undefined
            || !this.extBvbi) {
            return;
        }
        const gl = renderer.gl;
        model.bindBuffers(gl);
        gl.enableVertexAttribArray(this.rm_Vertex);
        gl.enableVertexAttribArray(this.rm_TexCoord0);
        gl.vertexAttribPointer(this.rm_Vertex, 3, gl.HALF_FLOAT, false, 12, 0);
        gl.vertexAttribPointer(this.rm_TexCoord0, 2, gl.HALF_FLOAT, false, 12, 6);
        gl.bindBuffer(gl.ARRAY_BUFFER, bufferMatrices);
        // set all 4 attributes for matrix
        const bytesPerMatrix = 3 * 16;
        for (let i = 0; i < 3; ++i) {
            const loc = this.modelMatrix + i;
            gl.enableVertexAttribArray(loc);
            // note the stride and offset
            const offset = i * 16; // 4 floats per row, 4 bytes per float
            gl.vertexAttribPointer(loc, // location
            4, // size (num values to pull from buffer per iteration)
            gl.FLOAT, // type of data in buffer
            false, // normalize
            bytesPerMatrix, // stride, num bytes to advance to get to next set of values
            offset);
            // this line says this attribute only changes for each 1 instance
            gl.vertexAttribDivisor(loc, 1);
        }
        renderer.calculateMVPMatrix(0, 0, 0, 0, 0, 0, 1, 1, 1);
        gl.uniformMatrix4fv(this.viewMatrix, false, renderer.getViewMatrix());
        gl.uniformMatrix4fv(this.projMatrix, false, renderer.getProjectionMatrix());
        const count = model.getNumIndices() * 3;
        const offset = 0;
        const instanceCount = instances;
        const baseVertex = 0;
        this.extBvbi.drawElementsInstancedBaseVertexBaseInstanceWEBGL(gl.TRIANGLES, count, gl.UNSIGNED_SHORT, offset, instanceCount, baseVertex, baseInstance);
        // Reset attrib divisor for matrix attribs
        for (let i = 0; i < 3; ++i) {
            const loc = this.modelMatrix + i;
            gl.vertexAttribDivisor(loc, 0);
        }
        renderer.checkGlError("InstancedShader glDrawElements");
    }
}
InstancedShader.COMMON_UNIFORMS_ATTRIBUTES = `
        uniform mat4 viewMatrix;
        uniform mat4 projMatrix;
        in mat4x3 modelMatrix;
    `;
InstancedShader.COMMON_TRANSFORMS = `
        mat4 modelMatrix4 = mat4(modelMatrix);
        mat4 view_proj_matrix = projMatrix * viewMatrix * modelMatrix4;
    `;

class InstancedColoredShader extends InstancedShader {
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

var _a;
class FogInstancedShader extends InstancedColoredShader {
    fillCode() {
        this.vertexShaderCode = `#version 300 es
            precision highp float;

            in vec2 rm_TexCoord0;
            in vec4 rm_Vertex;

            ${InstancedShader.COMMON_UNIFORMS_ATTRIBUTES}
            ${FogInstancedShader.FOG_VERTEX_UNIFORMS_VARYINGS}

            void main(void) {
                mat4 modelMatrix4 = mat4(modelMatrix);
                vec4 vertex = modelMatrix4 * rm_Vertex;
                // GLSL is column-major: mat[col][row]
                // modelMatrix[0][1] is sine of model rotation angle
                vertex.z += modelMatrix4[0][1] * heightOffset.x + heightOffset.y;

                gl_Position = projMatrix * viewMatrix * vertex;
                vTexCoord = rm_TexCoord0;

                ${FogInstancedShader.FOG_VERTEX_MAIN}
            }`;
        this.fragmentShaderCode = `#version 300 es
            precision mediump float;
            uniform sampler2D sTexture;
            uniform vec4 color;

            in mediump vec2 vTexCoord;
            out vec4 fragColor;

            ${FogInstancedShader.FOG_FRAGMENT_UNIFORMS_VARYINGS}

            void main(void) {
                ${FogInstancedShader.FOG_FRAGMENT_MAIN}
                vec4 diffuse = texture(sTexture, vTexCoord) * color;
                fragColor = mix(diffuse, fogColor, fogAmount);
            }`;
    }
    fillUniformsAttributes() {
        super.fillUniformsAttributes();
        this.fogStartDistance = this.getUniform("fogStartDistance");
        this.fogDistance = this.getUniform("fogDistance");
        this.heightFogParams = this.getUniform("heightFogParams");
        this.heightOffset = this.getUniform("heightOffset");
        this.texCubemap = this.getUniform("texCubemap");
    }
}
_a = FogInstancedShader;
FogInstancedShader.FOG_VERTEX_UNIFORMS_VARYINGS = `
        uniform vec2 heightOffset; // x: random positive/negative offset; y: fixed offset
        uniform float fogDistance;
        uniform float fogStartDistance;
        out float vFogAmount;
        out float vFogZ;
        out vec3 texCoord;
        out mediump vec2 vTexCoord;
        const float ZERO = 0.0;
        const float ONE = 1.0;
    `;
FogInstancedShader.FOG_FRAGMENT_UNIFORMS_VARYINGS = `
        in float vFogAmount;
        in float vFogZ;
        uniform vec2 heightFogParams;
        in vec3 texCoord;
        uniform samplerCube texCubemap;
        const float ZERO = 0.0;
        const float ONE = 1.0;
    `;
FogInstancedShader.FOG_AMOUNT_VERTEX = `
        float distanceFog = clamp((length(gl_Position) - fogStartDistance) / fogDistance, ZERO, ONE);
        vFogAmount = clamp(distanceFog, ZERO, ONE);
    `;
FogInstancedShader.FOG_VERTEX_MAIN = `
        ${_a.FOG_AMOUNT_VERTEX}
        vFogZ = vertex.z;
        texCoord = inverse(mat3(viewMatrix)) * (viewMatrix * vertex).xyz;
    `;
FogInstancedShader.FOG_AMOUNT_FRAGMENT = `
        float heightFog = clamp(1.0 - ((vFogZ + heightFogParams.x) * heightFogParams.y), ZERO, ONE);
        float fogAmount = clamp(vFogAmount + heightFog, ZERO, ONE);
    `;
FogInstancedShader.FOG_FRAGMENT_MAIN = `
        ${_a.FOG_AMOUNT_FRAGMENT}
        vec4 fogColor = texture(texCubemap, texCoord);
    `;

class FogInstancedAtShader extends FogInstancedShader {
    fillCode() {
        super.fillCode();
        this.fragmentShaderCode = `#version 300 es
            precision mediump float;
            uniform sampler2D sTexture;
            uniform vec4 color;

            in mediump vec2 vTexCoord;
            out vec4 fragColor;

            ${FogInstancedShader.FOG_FRAGMENT_UNIFORMS_VARYINGS}

            void main(void) {
                ${FogInstancedShader.FOG_FRAGMENT_MAIN}
                vec4 diffuse = texture(sTexture, vTexCoord) * color;
                if (diffuse.a < 0.5) {
                    discard;
                } else {
                    fragColor = mix(diffuse, fogColor, fogAmount);
                }
            }`;
    }
}

class FogInstancedVertexLitGrassShader extends FogInstancedShader {
    fillCode() {
        this.vertexShaderCode = `#version 300 es
            precision highp float;

            in vec2 rm_TexCoord0;
            in vec4 rm_Vertex;
            in vec3 rm_Normal;

            ${InstancedShader.COMMON_UNIFORMS_ATTRIBUTES}
            ${FogInstancedShader.FOG_VERTEX_UNIFORMS_VARYINGS}

            uniform vec4 color;
            uniform vec4 colorSun;
            uniform vec4 lightDir;
            uniform float diffuseExponent;
            out vec4 vDiffuseColor;
            out float vGrass;
            uniform float grassAmount;

            void main(void) {
                mat4 modelMatrix4 = mat4(modelMatrix);
                vec4 vertex = modelMatrix4 * rm_Vertex;
                // GLSL is column-major: mat[col][row]
                // modelMatrix[0][1] is sine of model rotation angle
                vertex.z += modelMatrix4[0][1] * heightOffset.x + heightOffset.y;

                gl_Position = projMatrix * viewMatrix * vertex;
                vTexCoord = rm_TexCoord0;

                ${FogInstancedShader.FOG_VERTEX_MAIN}

                vec4 normal = normalize(modelMatrix4 * vec4(rm_Normal, 0.0));

                float d = pow(max(0.0, dot(normal, lightDir)), diffuseExponent);

                vDiffuseColor = mix(colorSun, color, d);
                vGrass = smoothstep(0.2, 0.3, normal.z * grassAmount);
            }`;
        this.fragmentShaderCode = `#version 300 es
            precision mediump float;
            uniform sampler2D sTexture;
            uniform vec4 color;

            in mediump vec2 vTexCoord;
            out vec4 fragColor;

            uniform sampler2D sTextureGrass;
            in vec4 vDiffuseColor;
            in float vGrass;

            ${FogInstancedShader.FOG_FRAGMENT_UNIFORMS_VARYINGS}

            void main(void) {
                ${FogInstancedShader.FOG_FRAGMENT_MAIN}
                vec4 rock = texture(sTexture, vTexCoord);
                vec4 grass = texture(sTextureGrass, vTexCoord * 5.0);
                vec4 mixed = mix(rock, grass, vGrass);
                vec4 diffuse = mixed * vDiffuseColor;
                fragColor = mix(diffuse, fogColor, fogAmount);
            }`;
    }
    fillUniformsAttributes() {
        super.fillUniformsAttributes();
        this.colorSun = this.getUniform("colorSun");
        this.lightDir = this.getUniform("lightDir");
        this.diffuseExponent = this.getUniform("diffuseExponent");
        this.rm_Normal = this.getAttrib("rm_Normal");
        this.sTextureGrass = this.getUniform("sTextureGrass");
        this.grassAmount = this.getUniform("grassAmount");
    }
    drawInstanced(renderer, model, bufferMatrices, baseInstance, instances) {
        if (this.rm_Vertex === undefined
            || this.rm_TexCoord0 === undefined
            || this.rm_Normal === undefined
            || this.modelMatrix === undefined
            || !this.extBvbi) {
            return;
        }
        const gl = renderer.gl;
        model.bindBuffers(gl);
        gl.enableVertexAttribArray(this.rm_Vertex);
        gl.enableVertexAttribArray(this.rm_TexCoord0);
        gl.enableVertexAttribArray(this.rm_Normal);
        gl.vertexAttribPointer(this.rm_Vertex, 3, gl.HALF_FLOAT, false, 16, 0);
        gl.vertexAttribPointer(this.rm_TexCoord0, 2, gl.HALF_FLOAT, false, 16, 6);
        gl.vertexAttribPointer(this.rm_Normal, 3, gl.HALF_FLOAT, false, 16, 10);
        gl.bindBuffer(gl.ARRAY_BUFFER, bufferMatrices);
        // set all 4 attributes for matrix
        const bytesPerMatrix = 4 * 16;
        for (let i = 0; i < 4; ++i) {
            const loc = this.modelMatrix + i;
            gl.enableVertexAttribArray(loc);
            // note the stride and offset
            const offset = i * 16; // 4 floats per row, 4 bytes per float
            gl.vertexAttribPointer(loc, // location
            4, // size (num values to pull from buffer per iteration)
            gl.FLOAT, // type of data in buffer
            false, // normalize
            bytesPerMatrix, // stride, num bytes to advance to get to next set of values
            offset);
            // this line says this attribute only changes for each 1 instance
            gl.vertexAttribDivisor(loc, 1);
        }
        renderer.calculateMVPMatrix(0, 0, 0, 0, 0, 0, 1, 1, 1);
        gl.uniformMatrix4fv(this.viewMatrix, false, renderer.getViewMatrix());
        gl.uniformMatrix4fv(this.projMatrix, false, renderer.getProjectionMatrix());
        const count = model.getNumIndices() * 3;
        const offset = 0;
        const instanceCount = instances;
        const baseVertex = 0;
        this.extBvbi.drawElementsInstancedBaseVertexBaseInstanceWEBGL(gl.TRIANGLES, count, gl.UNSIGNED_SHORT, offset, instanceCount, baseVertex, baseInstance);
        // Reset attrib divisor for matrix attribs
        for (let i = 0; i < 4; ++i) {
            const loc = this.modelMatrix + i;
            gl.vertexAttribDivisor(loc, 0);
        }
        renderer.checkGlError("InstancedShader glDrawElements");
    }
}

const FOV_LANDSCAPE = 60.0; // FOV for landscape
const FOV_PORTRAIT = 70.0; // FOV for portrait
class Renderer extends BaseRenderer {
    constructor() {
        super();
        this.lastTime = 0;
        this.loaded = false;
        this.fmSky = new FullModel();
        this.fmRock1 = new FullModel();
        this.fmRock1Grass = new FullModel();
        this.fmRock2 = new FullModel();
        this.fmRock2Grass = new FullModel();
        this.fmRock3 = new FullModel();
        this.fmRock3Grass = new FullModel();
        this.fmTree = new FullModel();
        this.fmBird = new FullModel();
        this.fmSmoke = new FullModel();
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
        this.animationBird = new CombinedAnimation(5);
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
        this.cameraMode = CameraMode.Rotating;
        this.matViewInverted = create$1();
        this.matViewInvertedTransposed = create$1();
        this.matTemp = create$1();
        this.cameraPosition = create();
        this.cameraRotation = create();
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
        this.v1 = create();
        this.v2 = create();
        this.v3 = create();
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
        this.shaderDiffuse = new DiffuseShader(this.gl);
        this.shaderFogVertexLitGrass = new FogVertexLitGrassShader(this.gl);
        this.shaderFogAt = new FogAtShader(this.gl);
        this.shaderSky = new SkyShader(this.gl);
        this.shaderBirds = new BirdsShader(this.gl);
        this.shaderFogSprite = new FogSpriteShader(this.gl);
        this.extBvbi = this.gl.getExtension("WEBGL_multi_draw_instanced_base_vertex_base_instance");
        if (this.extBvbi) {
            console.log("Base vertex base index is available.");
            this.shaderInstancedFogAt = new FogInstancedAtShader(this.gl);
            this.shaderInstancedRocks = new FogInstancedVertexLitGrassShader(this.gl);
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
                gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(TREES_XFORM), gl.STATIC_DRAW);
                this.bufferRocks1Matrices = gl.createBuffer();
                gl.bindBuffer(gl.ARRAY_BUFFER, this.bufferRocks1Matrices);
                gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(ROCKS1_XFORM), gl.STATIC_DRAW);
                this.bufferRocks2Matrices = gl.createBuffer();
                gl.bindBuffer(gl.ARRAY_BUFFER, this.bufferRocks2Matrices);
                gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(ROCKS2_XFORM), gl.STATIC_DRAW);
                this.bufferRocks3Matrices = gl.createBuffer();
                gl.bindBuffer(gl.ARRAY_BUFFER, this.bufferRocks3Matrices);
                gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(ROCKS3_XFORM), gl.STATIC_DRAW);
                this.bufferRocks4Matrices = gl.createBuffer();
                gl.bindBuffer(gl.ARRAY_BUFFER, this.bufferRocks4Matrices);
                gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(ROCKS4_XFORM), gl.STATIC_DRAW);
                this.bufferRocks5Matrices = gl.createBuffer();
                gl.bindBuffer(gl.ARRAY_BUFFER, this.bufferRocks5Matrices);
                gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(ROCKS5_XFORM), gl.STATIC_DRAW);
            }
            else {
                this.textureRocksPositions1 = loadPositionsTexture(ROCKS1_TEXTURE, ROCKS1_COUNT);
                this.textureRocksPositions2 = loadPositionsTexture(ROCKS2_TEXTURE, ROCKS2_COUNT);
                this.textureRocksPositions3 = loadPositionsTexture(ROCKS3_TEXTURE, ROCKS3_COUNT);
                this.textureRocksPositions4 = loadPositionsTexture(ROCKS4_TEXTURE, ROCKS4_COUNT);
                this.textureRocksPositions5 = loadPositionsTexture(ROCKS5_TEXTURE, ROCKS5_COUNT);
                this.textureTreesPositions = loadPositionsTexture(TREES_TEXTURE, TREES_COUNT);
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
                UncompressedTextureLoader.load("data/textures/rocks.webp", this.gl, undefined, undefined, true),
                UncompressedTextureLoader.load("data/textures/pine_leaves.webp", this.gl, undefined, undefined, true),
                UncompressedTextureLoader.loadCubemap(`data/textures/cubemaps/${preset.cubemap}/sky`, this.gl, "webp"),
                UncompressedTextureLoader.load("data/textures/bird2.webp", this.gl, undefined, undefined, true),
                UncompressedTextureLoader.load("data/textures/grass.webp", this.gl, undefined, undefined, false),
                UncompressedTextureLoader.load("data/textures/fern.webp", this.gl, undefined, undefined, false),
                UncompressedTextureLoader.load("data/textures/smoke.webp", this.gl),
                UncompressedTextureLoader.load("data/textures/white.webp", this.gl, undefined, undefined, true)
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
        this.textureOffscreenColor = TextureUtils.createNpotTexture(this.gl, this.canvas.width, this.canvas.height, false);
        this.textureOffscreenDepth = TextureUtils.createDepthTexture(this.gl, this.canvas.width, this.canvas.height);
        this.fboOffscreen = new FrameBuffer(this.gl);
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
        ortho(this.matOrtho, -1, 1, -1, 1, 2.0, 250);
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
            const texture = yield UncompressedTextureLoader.loadCubemap(`data/textures/cubemaps/${this.PRESETS[newPreset].cubemap}/sky`, this.gl, "webp");
            this.gl.deleteTexture(this.textureFogCubemap);
            this.textureFogCubemap = texture;
            this.currentPreset = newPreset;
        });
    }
    animate() {
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
        positionOnSpline(a, 0, this.tmpPosition1);
        positionOnSpline(a + 0.02, 0, this.tmpPosition2);
        positionOnSpline(a + 0.0205, 0, this.tmpPosition3);
        this.cameraPosition[0] = this.tmpPosition1[0];
        this.cameraPosition[1] = this.tmpPosition1[1];
        this.cameraPosition[2] = this.tmpPosition1[2];
        sub(this.v1, this.tmpPosition2, this.tmpPosition1);
        sub(this.v2, this.tmpPosition3, this.tmpPosition1);
        normalize(this.v1, this.v1);
        normalize(this.v2, this.v2);
        cross(this.v3, this.v1, this.v2);
        lookAt(this.mVMatrix, this.tmpPosition1, // eye
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
        this.drawCloudModels(shader, this.fmSmoke, PARTICLES_TEXTURE, PARTICLES_COUNT, this.config.cloudsScale, 0, [0, 0, 12]);
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
        this.drawInstances(shader, this.fmTree, this.textureTreesPositions, TREES_COUNT, [0.003, 0.003], [0, 0, 0]);
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
        this.drawInstances(shader, this.fmRock1, this.textureRocksPositions1, ROCKS1_COUNT, [0.0055, 0.004]);
        this.drawInstances(shader, this.fmRock2, this.textureRocksPositions2, ROCKS2_COUNT, [0.006, 0.004]);
        this.gl.uniform2f(shader.heightOffset, 0, 0);
        this.drawInstances(shader, this.fmRock3, this.textureRocksPositions3, ROCKS3_COUNT, [0.012, 0.004]);
        const floatingHeightOffset = 6 * Math.sin(this.timerRocksMovement * Math.PI * 2);
        this.gl.uniform2f(shader.heightOffset, floatingHeightOffset, 34);
        this.drawInstances(shader, this.fmRock1, this.textureRocksPositions4, ROCKS4_COUNT, [0.0055, 0.004]);
        this.gl.uniform2f(shader.heightOffset, 0, -14);
        this.drawInstances(shader, this.fmRock1, this.textureRocksPositions5, ROCKS5_COUNT, [0.0055, 0.004]);
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
        this.drawInstances(shader, this.fmRock1Grass, this.textureRocksPositions1, ROCKS1_COUNT, [0.0055, 0.004]);
        this.drawInstances(shader, this.fmRock2Grass, this.textureRocksPositions2, ROCKS2_COUNT, [0.006, 0.004]);
        this.gl.uniform2f(shader.heightOffset, 0, 0);
        this.drawInstances(shader, this.fmRock3Grass, this.textureRocksPositions3, ROCKS3_COUNT, [0.012, 0.004]);
        this.gl.uniform2f(shader.heightOffset, floatingHeightOffset, 34);
        this.drawInstances(shader, this.fmRock1Grass, this.textureRocksPositions4, ROCKS4_COUNT, [0.0055, 0.004]);
        this.gl.uniform2f(shader.heightOffset, 0, -14);
        this.drawInstances(shader, this.fmRock1Grass, this.textureRocksPositions5, ROCKS5_COUNT, [0.0055, 0.004]);
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
        this.drawInstances2(this.shaderInstancedFogAt, this.fmTree, this.bufferTreesMatrices, TREES_COUNT);
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
        this.drawInstances2(this.shaderInstancedRocks, this.fmRock1, this.bufferRocks1Matrices, ROCKS1_COUNT);
        this.gl.uniform2f(this.shaderInstancedRocks.heightOffset, this.config.heightOffset / 0.006, this.config.heightOffset * 0.25);
        this.drawInstances2(this.shaderInstancedRocks, this.fmRock2, this.bufferRocks2Matrices, ROCKS2_COUNT);
        this.gl.uniform2f(this.shaderInstancedRocks.heightOffset, 0, 0);
        this.drawInstances2(this.shaderInstancedRocks, this.fmRock3, this.bufferRocks3Matrices, ROCKS3_COUNT);
        const floatingHeightOffset = 6 * Math.sin(this.timerRocksMovement * Math.PI * 2);
        this.gl.uniform2f(this.shaderInstancedRocks.heightOffset, floatingHeightOffset / 0.0055, 34);
        this.drawInstances2(this.shaderInstancedRocks, this.fmRock1, this.bufferRocks4Matrices, ROCKS4_COUNT);
        this.gl.uniform2f(this.shaderInstancedRocks.heightOffset, 0, -14);
        this.drawInstances2(this.shaderInstancedRocks, this.fmRock1, this.bufferRocks5Matrices, ROCKS5_COUNT);
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
        this.drawInstances2(this.shaderInstancedFogAt, this.fmRock1Grass, this.bufferRocks1Matrices, ROCKS1_COUNT);
        this.gl.uniform2f(this.shaderInstancedFogAt.heightOffset, this.config.heightOffset / 0.006, this.config.heightOffset * 0.25);
        this.drawInstances2(this.shaderInstancedFogAt, this.fmRock2Grass, this.bufferRocks2Matrices, ROCKS2_COUNT);
        this.gl.uniform2f(this.shaderInstancedFogAt.heightOffset, 0, 0);
        this.drawInstances2(this.shaderInstancedFogAt, this.fmRock3Grass, this.bufferRocks3Matrices, ROCKS3_COUNT);
        this.gl.uniform2f(this.shaderInstancedFogAt.heightOffset, floatingHeightOffset / 0.0055, 34);
        this.drawInstances2(this.shaderInstancedFogAt, this.fmRock1Grass, this.bufferRocks4Matrices, ROCKS4_COUNT);
        this.gl.uniform2f(this.shaderInstancedFogAt.heightOffset, 0, -14);
        this.drawInstances2(this.shaderInstancedFogAt, this.fmRock1Grass, this.bufferRocks5Matrices, ROCKS5_COUNT);
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
        this.PRESETS[this.currentPreset];
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
        for (let i = 0; i < BIRD_PATHS.length; i++) {
            const { positionInterpolator, rotation } = BIRD_PATHS[i];
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
        if (this.cameraMode === CameraMode.Random) {
            this.cameraMode = CameraMode.Rotating;
        }
        else {
            this.cameraMode = CameraMode.Random;
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
        identity(this.mMMatrix);
        translate(this.mMMatrix, this.mMMatrix, [tx, ty, tz]);
        scale$1(this.mMMatrix, this.mMMatrix, [sx, sy, sz]);
        multiply(this.mMVPMatrix, this.mVMatrix, this.mMMatrix);
        this.resetMatrixRotations(this.mMVPMatrix);
        rotateZ(this.mMVPMatrix, this.mMVPMatrix, rotation);
        multiply(this.mMVPMatrix, this.mProjMatrix, this.mMVPMatrix);
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

/**
 * A Flying Camera allows free motion around the scene using FPS style controls (WASD + mouselook)
 * This type of camera is good for displaying large scenes
 */
class FpsCamera {
    constructor(options) {
        var _a, _b;
        this._dirty = true;
        this._angles = create();
        this._position = create();
        this.speed = 100;
        this.rotationSpeed = 0.025;
        this._cameraMat = create$1();
        this._viewMat = create$1();
        this.projectionMat = create$1();
        this.pressedKeys = new Array();
        this.canvas = options.canvas;
        this.speed = (_a = options.movementSpeed) !== null && _a !== void 0 ? _a : 100;
        this.rotationSpeed = (_b = options.rotationSpeed) !== null && _b !== void 0 ? _b : 0.025;
        // Set up the appropriate event hooks
        let moving = false;
        let lastX, lastY;
        window.addEventListener("keydown", event => this.pressedKeys[event.keyCode] = true);
        window.addEventListener("keyup", event => this.pressedKeys[event.keyCode] = false);
        this.canvas.addEventListener('contextmenu', event => event.preventDefault());
        this.canvas.addEventListener('mousedown', event => {
            if (event.which === 3) {
                moving = true;
            }
            lastX = event.pageX;
            lastY = event.pageY;
        });
        this.canvas.addEventListener('mousemove', event => {
            if (moving) {
                let xDelta = event.pageX - lastX;
                let yDelta = event.pageY - lastY;
                lastX = event.pageX;
                lastY = event.pageY;
                this.angles[1] += xDelta * this.rotationSpeed;
                if (this.angles[1] < 0) {
                    this.angles[1] += Math.PI * 2;
                }
                if (this.angles[1] >= Math.PI * 2) {
                    this.angles[1] -= Math.PI * 2;
                }
                this.angles[0] += yDelta * this.rotationSpeed;
                if (this.angles[0] < -Math.PI * 0.5) {
                    this.angles[0] = -Math.PI * 0.5;
                }
                if (this.angles[0] > Math.PI * 0.5) {
                    this.angles[0] = Math.PI * 0.5;
                }
                this._dirty = true;
            }
        });
        this.canvas.addEventListener('mouseup', event => moving = false);
    }
    get angles() {
        return this._angles;
    }
    set angles(value) {
        this._angles = value;
        this._dirty = true;
    }
    get position() {
        return this._position;
    }
    set position(value) {
        this._position = value;
        this._dirty = true;
    }
    get viewMat() {
        if (this._dirty) {
            var mv = this._viewMat;
            identity(mv);
            rotateX(mv, mv, this.angles[0] - Math.PI / 2.0);
            rotateZ(mv, mv, this.angles[1]);
            rotateY(mv, mv, this.angles[2]);
            translate(mv, mv, [-this.position[0], -this.position[1], -this.position[2]]);
            this._dirty = false;
        }
        return this._viewMat;
    }
    update(frameTime) {
        const dir = create();
        let speed = (this.speed / 1000) * frameTime;
        if (this.pressedKeys[16]) { // Shift, speed up
            speed *= 5;
        }
        // This is our first person movement code. It's not really pretty, but it works
        if (this.pressedKeys['W'.charCodeAt(0)]) {
            dir[1] += speed;
        }
        if (this.pressedKeys['S'.charCodeAt(0)]) {
            dir[1] -= speed;
        }
        if (this.pressedKeys['A'.charCodeAt(0)]) {
            dir[0] -= speed;
        }
        if (this.pressedKeys['D'.charCodeAt(0)]) {
            dir[0] += speed;
        }
        if (this.pressedKeys[32]) { // Space, moves up
            dir[2] += speed;
        }
        if (this.pressedKeys['C'.charCodeAt(0)]) { // C, moves down
            dir[2] -= speed;
        }
        if (dir[0] !== 0 || dir[1] !== 0 || dir[2] !== 0) {
            let cam = this._cameraMat;
            identity(cam);
            rotateX(cam, cam, this.angles[0]);
            rotateZ(cam, cam, this.angles[1]);
            invert(cam, cam);
            transformMat4(dir, dir, cam);
            // Move the camera in the direction we are facing
            add(this.position, this.position, dir);
            this._dirty = true;
        }
    }
}

var MovementMode;
(function (MovementMode) {
    MovementMode[MovementMode["Free"] = 0] = "Free";
    MovementMode[MovementMode["Predefined"] = 1] = "Predefined";
})(MovementMode || (MovementMode = {}));
class FreeMovement {
    constructor(renderer, options) {
        this.renderer = renderer;
        this.options = options;
        this.matCamera = create$1();
        this.matInvCamera = new Float32Array(16);
        this.vec3Eye = new Float32Array(3);
        this.vec3Rotation = new Float32Array(3);
        this.mode = MovementMode.Predefined;
        this.setupControls();
    }
    setupControls() {
        document.addEventListener("dblclick", (event) => {
            var _a;
            //if (event.code === "Enter"
            {
                if (this.mode === MovementMode.Predefined) {
                    this.matCamera = clone(this.renderer.getViewMatrix());
                    this.renderer.setCustomCamera(this.matCamera);
                    this.mode = MovementMode.Free;
                    invert(this.matInvCamera, this.matCamera);
                    getTranslation(this.vec3Eye, this.matInvCamera);
                    normalize(this.vec3Rotation, this.vec3Eye);
                    scale(this.vec3Rotation, this.vec3Rotation, -1);
                    this.fpsCamera = (_a = this.fpsCamera) !== null && _a !== void 0 ? _a : new FpsCamera(this.options);
                    this.fpsCamera.position = this.vec3Eye;
                    const callback = (time) => {
                        if (this.mode !== MovementMode.Free) {
                            return;
                        }
                        this.fpsCamera.update(16);
                        this.matCamera = this.fpsCamera.viewMat;
                        this.renderer.setCustomCamera(this.matCamera, this.fpsCamera.position, this.fpsCamera.angles);
                        requestAnimationFrame(callback);
                    };
                    callback();
                }
                else {
                    this.renderer.resetCustomCamera();
                    this.mode = MovementMode.Predefined;
                }
            }
        });
        document.addEventListener("keypress", (event) => {
            var _a;
            if (event.code === "Enter") {
                if (this.mode === MovementMode.Predefined) {
                    this.matCamera = clone(this.renderer.getViewMatrix());
                    this.renderer.setCustomCamera(this.matCamera);
                    this.mode = MovementMode.Free;
                    invert(this.matInvCamera, this.matCamera);
                    getTranslation(this.vec3Eye, this.matInvCamera);
                    normalize(this.vec3Rotation, this.vec3Eye);
                    scale(this.vec3Rotation, this.vec3Rotation, -1);
                    this.fpsCamera = (_a = this.fpsCamera) !== null && _a !== void 0 ? _a : new FpsCamera(this.options);
                    this.fpsCamera.position = this.vec3Eye;
                    const callback = (time) => {
                        if (this.mode !== MovementMode.Free) {
                            return;
                        }
                        this.fpsCamera.update(16);
                        this.matCamera = this.fpsCamera.viewMat;
                        this.renderer.setCustomCamera(this.matCamera, this.fpsCamera.position, this.fpsCamera.angles);
                        requestAnimationFrame(callback);
                    };
                    callback();
                }
                else {
                    this.renderer.resetCustomCamera();
                    this.mode = MovementMode.Predefined;
                }
            }
        });
    }
    ;
}

/**
 * dat-gui JavaScript Controller Library
 * https://github.com/dataarts/dat.gui
 *
 * Copyright 2011 Data Arts Team, Google Creative Lab
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 */

function ___$insertStyle(css) {
  if (!css) {
    return;
  }
  if (typeof window === 'undefined') {
    return;
  }

  var style = document.createElement('style');

  style.setAttribute('type', 'text/css');
  style.innerHTML = css;
  document.head.appendChild(style);

  return css;
}

function colorToString (color, forceCSSHex) {
  var colorFormat = color.__state.conversionName.toString();
  var r = Math.round(color.r);
  var g = Math.round(color.g);
  var b = Math.round(color.b);
  var a = color.a;
  var h = Math.round(color.h);
  var s = color.s.toFixed(1);
  var v = color.v.toFixed(1);
  if (forceCSSHex || colorFormat === 'THREE_CHAR_HEX' || colorFormat === 'SIX_CHAR_HEX') {
    var str = color.hex.toString(16);
    while (str.length < 6) {
      str = '0' + str;
    }
    return '#' + str;
  } else if (colorFormat === 'CSS_RGB') {
    return 'rgb(' + r + ',' + g + ',' + b + ')';
  } else if (colorFormat === 'CSS_RGBA') {
    return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
  } else if (colorFormat === 'HEX') {
    return '0x' + color.hex.toString(16);
  } else if (colorFormat === 'RGB_ARRAY') {
    return '[' + r + ',' + g + ',' + b + ']';
  } else if (colorFormat === 'RGBA_ARRAY') {
    return '[' + r + ',' + g + ',' + b + ',' + a + ']';
  } else if (colorFormat === 'RGB_OBJ') {
    return '{r:' + r + ',g:' + g + ',b:' + b + '}';
  } else if (colorFormat === 'RGBA_OBJ') {
    return '{r:' + r + ',g:' + g + ',b:' + b + ',a:' + a + '}';
  } else if (colorFormat === 'HSV_OBJ') {
    return '{h:' + h + ',s:' + s + ',v:' + v + '}';
  } else if (colorFormat === 'HSVA_OBJ') {
    return '{h:' + h + ',s:' + s + ',v:' + v + ',a:' + a + '}';
  }
  return 'unknown format';
}

var ARR_EACH = Array.prototype.forEach;
var ARR_SLICE = Array.prototype.slice;
var Common = {
  BREAK: {},
  extend: function extend(target) {
    this.each(ARR_SLICE.call(arguments, 1), function (obj) {
      var keys = this.isObject(obj) ? Object.keys(obj) : [];
      keys.forEach(function (key) {
        if (!this.isUndefined(obj[key])) {
          target[key] = obj[key];
        }
      }.bind(this));
    }, this);
    return target;
  },
  defaults: function defaults(target) {
    this.each(ARR_SLICE.call(arguments, 1), function (obj) {
      var keys = this.isObject(obj) ? Object.keys(obj) : [];
      keys.forEach(function (key) {
        if (this.isUndefined(target[key])) {
          target[key] = obj[key];
        }
      }.bind(this));
    }, this);
    return target;
  },
  compose: function compose() {
    var toCall = ARR_SLICE.call(arguments);
    return function () {
      var args = ARR_SLICE.call(arguments);
      for (var i = toCall.length - 1; i >= 0; i--) {
        args = [toCall[i].apply(this, args)];
      }
      return args[0];
    };
  },
  each: function each(obj, itr, scope) {
    if (!obj) {
      return;
    }
    if (ARR_EACH && obj.forEach && obj.forEach === ARR_EACH) {
      obj.forEach(itr, scope);
    } else if (obj.length === obj.length + 0) {
      var key = void 0;
      var l = void 0;
      for (key = 0, l = obj.length; key < l; key++) {
        if (key in obj && itr.call(scope, obj[key], key) === this.BREAK) {
          return;
        }
      }
    } else {
      for (var _key in obj) {
        if (itr.call(scope, obj[_key], _key) === this.BREAK) {
          return;
        }
      }
    }
  },
  defer: function defer(fnc) {
    setTimeout(fnc, 0);
  },
  debounce: function debounce(func, threshold, callImmediately) {
    var timeout = void 0;
    return function () {
      var obj = this;
      var args = arguments;
      function delayed() {
        timeout = null;
        if (!callImmediately) func.apply(obj, args);
      }
      var callNow = callImmediately || !timeout;
      clearTimeout(timeout);
      timeout = setTimeout(delayed, threshold);
      if (callNow) {
        func.apply(obj, args);
      }
    };
  },
  toArray: function toArray(obj) {
    if (obj.toArray) return obj.toArray();
    return ARR_SLICE.call(obj);
  },
  isUndefined: function isUndefined(obj) {
    return obj === undefined;
  },
  isNull: function isNull(obj) {
    return obj === null;
  },
  isNaN: function (_isNaN) {
    function isNaN(_x) {
      return _isNaN.apply(this, arguments);
    }
    isNaN.toString = function () {
      return _isNaN.toString();
    };
    return isNaN;
  }(function (obj) {
    return isNaN(obj);
  }),
  isArray: Array.isArray || function (obj) {
    return obj.constructor === Array;
  },
  isObject: function isObject(obj) {
    return obj === Object(obj);
  },
  isNumber: function isNumber(obj) {
    return obj === obj + 0;
  },
  isString: function isString(obj) {
    return obj === obj + '';
  },
  isBoolean: function isBoolean(obj) {
    return obj === false || obj === true;
  },
  isFunction: function isFunction(obj) {
    return obj instanceof Function;
  }
};

var INTERPRETATIONS = [
{
  litmus: Common.isString,
  conversions: {
    THREE_CHAR_HEX: {
      read: function read(original) {
        var test = original.match(/^#([A-F0-9])([A-F0-9])([A-F0-9])$/i);
        if (test === null) {
          return false;
        }
        return {
          space: 'HEX',
          hex: parseInt('0x' + test[1].toString() + test[1].toString() + test[2].toString() + test[2].toString() + test[3].toString() + test[3].toString(), 0)
        };
      },
      write: colorToString
    },
    SIX_CHAR_HEX: {
      read: function read(original) {
        var test = original.match(/^#([A-F0-9]{6})$/i);
        if (test === null) {
          return false;
        }
        return {
          space: 'HEX',
          hex: parseInt('0x' + test[1].toString(), 0)
        };
      },
      write: colorToString
    },
    CSS_RGB: {
      read: function read(original) {
        var test = original.match(/^rgb\(\s*(\S+)\s*,\s*(\S+)\s*,\s*(\S+)\s*\)/);
        if (test === null) {
          return false;
        }
        return {
          space: 'RGB',
          r: parseFloat(test[1]),
          g: parseFloat(test[2]),
          b: parseFloat(test[3])
        };
      },
      write: colorToString
    },
    CSS_RGBA: {
      read: function read(original) {
        var test = original.match(/^rgba\(\s*(\S+)\s*,\s*(\S+)\s*,\s*(\S+)\s*,\s*(\S+)\s*\)/);
        if (test === null) {
          return false;
        }
        return {
          space: 'RGB',
          r: parseFloat(test[1]),
          g: parseFloat(test[2]),
          b: parseFloat(test[3]),
          a: parseFloat(test[4])
        };
      },
      write: colorToString
    }
  }
},
{
  litmus: Common.isNumber,
  conversions: {
    HEX: {
      read: function read(original) {
        return {
          space: 'HEX',
          hex: original,
          conversionName: 'HEX'
        };
      },
      write: function write(color) {
        return color.hex;
      }
    }
  }
},
{
  litmus: Common.isArray,
  conversions: {
    RGB_ARRAY: {
      read: function read(original) {
        if (original.length !== 3) {
          return false;
        }
        return {
          space: 'RGB',
          r: original[0],
          g: original[1],
          b: original[2]
        };
      },
      write: function write(color) {
        return [color.r, color.g, color.b];
      }
    },
    RGBA_ARRAY: {
      read: function read(original) {
        if (original.length !== 4) return false;
        return {
          space: 'RGB',
          r: original[0],
          g: original[1],
          b: original[2],
          a: original[3]
        };
      },
      write: function write(color) {
        return [color.r, color.g, color.b, color.a];
      }
    }
  }
},
{
  litmus: Common.isObject,
  conversions: {
    RGBA_OBJ: {
      read: function read(original) {
        if (Common.isNumber(original.r) && Common.isNumber(original.g) && Common.isNumber(original.b) && Common.isNumber(original.a)) {
          return {
            space: 'RGB',
            r: original.r,
            g: original.g,
            b: original.b,
            a: original.a
          };
        }
        return false;
      },
      write: function write(color) {
        return {
          r: color.r,
          g: color.g,
          b: color.b,
          a: color.a
        };
      }
    },
    RGB_OBJ: {
      read: function read(original) {
        if (Common.isNumber(original.r) && Common.isNumber(original.g) && Common.isNumber(original.b)) {
          return {
            space: 'RGB',
            r: original.r,
            g: original.g,
            b: original.b
          };
        }
        return false;
      },
      write: function write(color) {
        return {
          r: color.r,
          g: color.g,
          b: color.b
        };
      }
    },
    HSVA_OBJ: {
      read: function read(original) {
        if (Common.isNumber(original.h) && Common.isNumber(original.s) && Common.isNumber(original.v) && Common.isNumber(original.a)) {
          return {
            space: 'HSV',
            h: original.h,
            s: original.s,
            v: original.v,
            a: original.a
          };
        }
        return false;
      },
      write: function write(color) {
        return {
          h: color.h,
          s: color.s,
          v: color.v,
          a: color.a
        };
      }
    },
    HSV_OBJ: {
      read: function read(original) {
        if (Common.isNumber(original.h) && Common.isNumber(original.s) && Common.isNumber(original.v)) {
          return {
            space: 'HSV',
            h: original.h,
            s: original.s,
            v: original.v
          };
        }
        return false;
      },
      write: function write(color) {
        return {
          h: color.h,
          s: color.s,
          v: color.v
        };
      }
    }
  }
}];
var result = void 0;
var toReturn = void 0;
var interpret = function interpret() {
  toReturn = false;
  var original = arguments.length > 1 ? Common.toArray(arguments) : arguments[0];
  Common.each(INTERPRETATIONS, function (family) {
    if (family.litmus(original)) {
      Common.each(family.conversions, function (conversion, conversionName) {
        result = conversion.read(original);
        if (toReturn === false && result !== false) {
          toReturn = result;
          result.conversionName = conversionName;
          result.conversion = conversion;
          return Common.BREAK;
        }
      });
      return Common.BREAK;
    }
  });
  return toReturn;
};

var tmpComponent = void 0;
var ColorMath = {
  hsv_to_rgb: function hsv_to_rgb(h, s, v) {
    var hi = Math.floor(h / 60) % 6;
    var f = h / 60 - Math.floor(h / 60);
    var p = v * (1.0 - s);
    var q = v * (1.0 - f * s);
    var t = v * (1.0 - (1.0 - f) * s);
    var c = [[v, t, p], [q, v, p], [p, v, t], [p, q, v], [t, p, v], [v, p, q]][hi];
    return {
      r: c[0] * 255,
      g: c[1] * 255,
      b: c[2] * 255
    };
  },
  rgb_to_hsv: function rgb_to_hsv(r, g, b) {
    var min = Math.min(r, g, b);
    var max = Math.max(r, g, b);
    var delta = max - min;
    var h = void 0;
    var s = void 0;
    if (max !== 0) {
      s = delta / max;
    } else {
      return {
        h: NaN,
        s: 0,
        v: 0
      };
    }
    if (r === max) {
      h = (g - b) / delta;
    } else if (g === max) {
      h = 2 + (b - r) / delta;
    } else {
      h = 4 + (r - g) / delta;
    }
    h /= 6;
    if (h < 0) {
      h += 1;
    }
    return {
      h: h * 360,
      s: s,
      v: max / 255
    };
  },
  rgb_to_hex: function rgb_to_hex(r, g, b) {
    var hex = this.hex_with_component(0, 2, r);
    hex = this.hex_with_component(hex, 1, g);
    hex = this.hex_with_component(hex, 0, b);
    return hex;
  },
  component_from_hex: function component_from_hex(hex, componentIndex) {
    return hex >> componentIndex * 8 & 0xFF;
  },
  hex_with_component: function hex_with_component(hex, componentIndex, value) {
    return value << (tmpComponent = componentIndex * 8) | hex & ~(0xFF << tmpComponent);
  }
};

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) {
  return typeof obj;
} : function (obj) {
  return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
};











var classCallCheck = function (instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
};

var createClass = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);
    if (staticProps) defineProperties(Constructor, staticProps);
    return Constructor;
  };
}();







var get = function get(object, property, receiver) {
  if (object === null) object = Function.prototype;
  var desc = Object.getOwnPropertyDescriptor(object, property);

  if (desc === undefined) {
    var parent = Object.getPrototypeOf(object);

    if (parent === null) {
      return undefined;
    } else {
      return get(parent, property, receiver);
    }
  } else if ("value" in desc) {
    return desc.value;
  } else {
    var getter = desc.get;

    if (getter === undefined) {
      return undefined;
    }

    return getter.call(receiver);
  }
};

var inherits = function (subClass, superClass) {
  if (typeof superClass !== "function" && superClass !== null) {
    throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
  }

  subClass.prototype = Object.create(superClass && superClass.prototype, {
    constructor: {
      value: subClass,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });
  if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
};











var possibleConstructorReturn = function (self, call) {
  if (!self) {
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  }

  return call && (typeof call === "object" || typeof call === "function") ? call : self;
};

var Color = function () {
  function Color() {
    classCallCheck(this, Color);
    this.__state = interpret.apply(this, arguments);
    if (this.__state === false) {
      throw new Error('Failed to interpret color arguments');
    }
    this.__state.a = this.__state.a || 1;
  }
  createClass(Color, [{
    key: 'toString',
    value: function toString() {
      return colorToString(this);
    }
  }, {
    key: 'toHexString',
    value: function toHexString() {
      return colorToString(this, true);
    }
  }, {
    key: 'toOriginal',
    value: function toOriginal() {
      return this.__state.conversion.write(this);
    }
  }]);
  return Color;
}();
function defineRGBComponent(target, component, componentHexIndex) {
  Object.defineProperty(target, component, {
    get: function get$$1() {
      if (this.__state.space === 'RGB') {
        return this.__state[component];
      }
      Color.recalculateRGB(this, component, componentHexIndex);
      return this.__state[component];
    },
    set: function set$$1(v) {
      if (this.__state.space !== 'RGB') {
        Color.recalculateRGB(this, component, componentHexIndex);
        this.__state.space = 'RGB';
      }
      this.__state[component] = v;
    }
  });
}
function defineHSVComponent(target, component) {
  Object.defineProperty(target, component, {
    get: function get$$1() {
      if (this.__state.space === 'HSV') {
        return this.__state[component];
      }
      Color.recalculateHSV(this);
      return this.__state[component];
    },
    set: function set$$1(v) {
      if (this.__state.space !== 'HSV') {
        Color.recalculateHSV(this);
        this.__state.space = 'HSV';
      }
      this.__state[component] = v;
    }
  });
}
Color.recalculateRGB = function (color, component, componentHexIndex) {
  if (color.__state.space === 'HEX') {
    color.__state[component] = ColorMath.component_from_hex(color.__state.hex, componentHexIndex);
  } else if (color.__state.space === 'HSV') {
    Common.extend(color.__state, ColorMath.hsv_to_rgb(color.__state.h, color.__state.s, color.__state.v));
  } else {
    throw new Error('Corrupted color state');
  }
};
Color.recalculateHSV = function (color) {
  var result = ColorMath.rgb_to_hsv(color.r, color.g, color.b);
  Common.extend(color.__state, {
    s: result.s,
    v: result.v
  });
  if (!Common.isNaN(result.h)) {
    color.__state.h = result.h;
  } else if (Common.isUndefined(color.__state.h)) {
    color.__state.h = 0;
  }
};
Color.COMPONENTS = ['r', 'g', 'b', 'h', 's', 'v', 'hex', 'a'];
defineRGBComponent(Color.prototype, 'r', 2);
defineRGBComponent(Color.prototype, 'g', 1);
defineRGBComponent(Color.prototype, 'b', 0);
defineHSVComponent(Color.prototype, 'h');
defineHSVComponent(Color.prototype, 's');
defineHSVComponent(Color.prototype, 'v');
Object.defineProperty(Color.prototype, 'a', {
  get: function get$$1() {
    return this.__state.a;
  },
  set: function set$$1(v) {
    this.__state.a = v;
  }
});
Object.defineProperty(Color.prototype, 'hex', {
  get: function get$$1() {
    if (this.__state.space !== 'HEX') {
      this.__state.hex = ColorMath.rgb_to_hex(this.r, this.g, this.b);
      this.__state.space = 'HEX';
    }
    return this.__state.hex;
  },
  set: function set$$1(v) {
    this.__state.space = 'HEX';
    this.__state.hex = v;
  }
});

var Controller = function () {
  function Controller(object, property) {
    classCallCheck(this, Controller);
    this.initialValue = object[property];
    this.domElement = document.createElement('div');
    this.object = object;
    this.property = property;
    this.__onChange = undefined;
    this.__onFinishChange = undefined;
  }
  createClass(Controller, [{
    key: 'onChange',
    value: function onChange(fnc) {
      this.__onChange = fnc;
      return this;
    }
  }, {
    key: 'onFinishChange',
    value: function onFinishChange(fnc) {
      this.__onFinishChange = fnc;
      return this;
    }
  }, {
    key: 'setValue',
    value: function setValue(newValue) {
      this.object[this.property] = newValue;
      if (this.__onChange) {
        this.__onChange.call(this, newValue);
      }
      this.updateDisplay();
      return this;
    }
  }, {
    key: 'getValue',
    value: function getValue() {
      return this.object[this.property];
    }
  }, {
    key: 'updateDisplay',
    value: function updateDisplay() {
      return this;
    }
  }, {
    key: 'isModified',
    value: function isModified() {
      return this.initialValue !== this.getValue();
    }
  }]);
  return Controller;
}();

var EVENT_MAP = {
  HTMLEvents: ['change'],
  MouseEvents: ['click', 'mousemove', 'mousedown', 'mouseup', 'mouseover'],
  KeyboardEvents: ['keydown']
};
var EVENT_MAP_INV = {};
Common.each(EVENT_MAP, function (v, k) {
  Common.each(v, function (e) {
    EVENT_MAP_INV[e] = k;
  });
});
var CSS_VALUE_PIXELS = /(\d+(\.\d+)?)px/;
function cssValueToPixels(val) {
  if (val === '0' || Common.isUndefined(val)) {
    return 0;
  }
  var match = val.match(CSS_VALUE_PIXELS);
  if (!Common.isNull(match)) {
    return parseFloat(match[1]);
  }
  return 0;
}
var dom = {
  makeSelectable: function makeSelectable(elem, selectable) {
    if (elem === undefined || elem.style === undefined) return;
    elem.onselectstart = selectable ? function () {
      return false;
    } : function () {};
    elem.style.MozUserSelect = selectable ? 'auto' : 'none';
    elem.style.KhtmlUserSelect = selectable ? 'auto' : 'none';
    elem.unselectable = selectable ? 'on' : 'off';
  },
  makeFullscreen: function makeFullscreen(elem, hor, vert) {
    var vertical = vert;
    var horizontal = hor;
    if (Common.isUndefined(horizontal)) {
      horizontal = true;
    }
    if (Common.isUndefined(vertical)) {
      vertical = true;
    }
    elem.style.position = 'absolute';
    if (horizontal) {
      elem.style.left = 0;
      elem.style.right = 0;
    }
    if (vertical) {
      elem.style.top = 0;
      elem.style.bottom = 0;
    }
  },
  fakeEvent: function fakeEvent(elem, eventType, pars, aux) {
    var params = pars || {};
    var className = EVENT_MAP_INV[eventType];
    if (!className) {
      throw new Error('Event type ' + eventType + ' not supported.');
    }
    var evt = document.createEvent(className);
    switch (className) {
      case 'MouseEvents':
        {
          var clientX = params.x || params.clientX || 0;
          var clientY = params.y || params.clientY || 0;
          evt.initMouseEvent(eventType, params.bubbles || false, params.cancelable || true, window, params.clickCount || 1, 0,
          0,
          clientX,
          clientY,
          false, false, false, false, 0, null);
          break;
        }
      case 'KeyboardEvents':
        {
          var init = evt.initKeyboardEvent || evt.initKeyEvent;
          Common.defaults(params, {
            cancelable: true,
            ctrlKey: false,
            altKey: false,
            shiftKey: false,
            metaKey: false,
            keyCode: undefined,
            charCode: undefined
          });
          init(eventType, params.bubbles || false, params.cancelable, window, params.ctrlKey, params.altKey, params.shiftKey, params.metaKey, params.keyCode, params.charCode);
          break;
        }
      default:
        {
          evt.initEvent(eventType, params.bubbles || false, params.cancelable || true);
          break;
        }
    }
    Common.defaults(evt, aux);
    elem.dispatchEvent(evt);
  },
  bind: function bind(elem, event, func, newBool) {
    var bool = newBool || false;
    if (elem.addEventListener) {
      elem.addEventListener(event, func, bool);
    } else if (elem.attachEvent) {
      elem.attachEvent('on' + event, func);
    }
    return dom;
  },
  unbind: function unbind(elem, event, func, newBool) {
    var bool = newBool || false;
    if (elem.removeEventListener) {
      elem.removeEventListener(event, func, bool);
    } else if (elem.detachEvent) {
      elem.detachEvent('on' + event, func);
    }
    return dom;
  },
  addClass: function addClass(elem, className) {
    if (elem.className === undefined) {
      elem.className = className;
    } else if (elem.className !== className) {
      var classes = elem.className.split(/ +/);
      if (classes.indexOf(className) === -1) {
        classes.push(className);
        elem.className = classes.join(' ').replace(/^\s+/, '').replace(/\s+$/, '');
      }
    }
    return dom;
  },
  removeClass: function removeClass(elem, className) {
    if (className) {
      if (elem.className === className) {
        elem.removeAttribute('class');
      } else {
        var classes = elem.className.split(/ +/);
        var index = classes.indexOf(className);
        if (index !== -1) {
          classes.splice(index, 1);
          elem.className = classes.join(' ');
        }
      }
    } else {
      elem.className = undefined;
    }
    return dom;
  },
  hasClass: function hasClass(elem, className) {
    return new RegExp('(?:^|\\s+)' + className + '(?:\\s+|$)').test(elem.className) || false;
  },
  getWidth: function getWidth(elem) {
    var style = getComputedStyle(elem);
    return cssValueToPixels(style['border-left-width']) + cssValueToPixels(style['border-right-width']) + cssValueToPixels(style['padding-left']) + cssValueToPixels(style['padding-right']) + cssValueToPixels(style.width);
  },
  getHeight: function getHeight(elem) {
    var style = getComputedStyle(elem);
    return cssValueToPixels(style['border-top-width']) + cssValueToPixels(style['border-bottom-width']) + cssValueToPixels(style['padding-top']) + cssValueToPixels(style['padding-bottom']) + cssValueToPixels(style.height);
  },
  getOffset: function getOffset(el) {
    var elem = el;
    var offset = { left: 0, top: 0 };
    if (elem.offsetParent) {
      do {
        offset.left += elem.offsetLeft;
        offset.top += elem.offsetTop;
        elem = elem.offsetParent;
      } while (elem);
    }
    return offset;
  },
  isActive: function isActive(elem) {
    return elem === document.activeElement && (elem.type || elem.href);
  }
};

var BooleanController = function (_Controller) {
  inherits(BooleanController, _Controller);
  function BooleanController(object, property) {
    classCallCheck(this, BooleanController);
    var _this2 = possibleConstructorReturn(this, (BooleanController.__proto__ || Object.getPrototypeOf(BooleanController)).call(this, object, property));
    var _this = _this2;
    _this2.__prev = _this2.getValue();
    _this2.__checkbox = document.createElement('input');
    _this2.__checkbox.setAttribute('type', 'checkbox');
    function onChange() {
      _this.setValue(!_this.__prev);
    }
    dom.bind(_this2.__checkbox, 'change', onChange, false);
    _this2.domElement.appendChild(_this2.__checkbox);
    _this2.updateDisplay();
    return _this2;
  }
  createClass(BooleanController, [{
    key: 'setValue',
    value: function setValue(v) {
      var toReturn = get(BooleanController.prototype.__proto__ || Object.getPrototypeOf(BooleanController.prototype), 'setValue', this).call(this, v);
      if (this.__onFinishChange) {
        this.__onFinishChange.call(this, this.getValue());
      }
      this.__prev = this.getValue();
      return toReturn;
    }
  }, {
    key: 'updateDisplay',
    value: function updateDisplay() {
      if (this.getValue() === true) {
        this.__checkbox.setAttribute('checked', 'checked');
        this.__checkbox.checked = true;
        this.__prev = true;
      } else {
        this.__checkbox.checked = false;
        this.__prev = false;
      }
      return get(BooleanController.prototype.__proto__ || Object.getPrototypeOf(BooleanController.prototype), 'updateDisplay', this).call(this);
    }
  }]);
  return BooleanController;
}(Controller);

var OptionController = function (_Controller) {
  inherits(OptionController, _Controller);
  function OptionController(object, property, opts) {
    classCallCheck(this, OptionController);
    var _this2 = possibleConstructorReturn(this, (OptionController.__proto__ || Object.getPrototypeOf(OptionController)).call(this, object, property));
    var options = opts;
    var _this = _this2;
    _this2.__select = document.createElement('select');
    if (Common.isArray(options)) {
      var map = {};
      Common.each(options, function (element) {
        map[element] = element;
      });
      options = map;
    }
    Common.each(options, function (value, key) {
      var opt = document.createElement('option');
      opt.innerHTML = key;
      opt.setAttribute('value', value);
      _this.__select.appendChild(opt);
    });
    _this2.updateDisplay();
    dom.bind(_this2.__select, 'change', function () {
      var desiredValue = this.options[this.selectedIndex].value;
      _this.setValue(desiredValue);
    });
    _this2.domElement.appendChild(_this2.__select);
    return _this2;
  }
  createClass(OptionController, [{
    key: 'setValue',
    value: function setValue(v) {
      var toReturn = get(OptionController.prototype.__proto__ || Object.getPrototypeOf(OptionController.prototype), 'setValue', this).call(this, v);
      if (this.__onFinishChange) {
        this.__onFinishChange.call(this, this.getValue());
      }
      return toReturn;
    }
  }, {
    key: 'updateDisplay',
    value: function updateDisplay() {
      if (dom.isActive(this.__select)) return this;
      this.__select.value = this.getValue();
      return get(OptionController.prototype.__proto__ || Object.getPrototypeOf(OptionController.prototype), 'updateDisplay', this).call(this);
    }
  }]);
  return OptionController;
}(Controller);

var StringController = function (_Controller) {
  inherits(StringController, _Controller);
  function StringController(object, property) {
    classCallCheck(this, StringController);
    var _this2 = possibleConstructorReturn(this, (StringController.__proto__ || Object.getPrototypeOf(StringController)).call(this, object, property));
    var _this = _this2;
    function onChange() {
      _this.setValue(_this.__input.value);
    }
    function onBlur() {
      if (_this.__onFinishChange) {
        _this.__onFinishChange.call(_this, _this.getValue());
      }
    }
    _this2.__input = document.createElement('input');
    _this2.__input.setAttribute('type', 'text');
    dom.bind(_this2.__input, 'keyup', onChange);
    dom.bind(_this2.__input, 'change', onChange);
    dom.bind(_this2.__input, 'blur', onBlur);
    dom.bind(_this2.__input, 'keydown', function (e) {
      if (e.keyCode === 13) {
        this.blur();
      }
    });
    _this2.updateDisplay();
    _this2.domElement.appendChild(_this2.__input);
    return _this2;
  }
  createClass(StringController, [{
    key: 'updateDisplay',
    value: function updateDisplay() {
      if (!dom.isActive(this.__input)) {
        this.__input.value = this.getValue();
      }
      return get(StringController.prototype.__proto__ || Object.getPrototypeOf(StringController.prototype), 'updateDisplay', this).call(this);
    }
  }]);
  return StringController;
}(Controller);

function numDecimals(x) {
  var _x = x.toString();
  if (_x.indexOf('.') > -1) {
    return _x.length - _x.indexOf('.') - 1;
  }
  return 0;
}
var NumberController = function (_Controller) {
  inherits(NumberController, _Controller);
  function NumberController(object, property, params) {
    classCallCheck(this, NumberController);
    var _this = possibleConstructorReturn(this, (NumberController.__proto__ || Object.getPrototypeOf(NumberController)).call(this, object, property));
    var _params = params || {};
    _this.__min = _params.min;
    _this.__max = _params.max;
    _this.__step = _params.step;
    if (Common.isUndefined(_this.__step)) {
      if (_this.initialValue === 0) {
        _this.__impliedStep = 1;
      } else {
        _this.__impliedStep = Math.pow(10, Math.floor(Math.log(Math.abs(_this.initialValue)) / Math.LN10)) / 10;
      }
    } else {
      _this.__impliedStep = _this.__step;
    }
    _this.__precision = numDecimals(_this.__impliedStep);
    return _this;
  }
  createClass(NumberController, [{
    key: 'setValue',
    value: function setValue(v) {
      var _v = v;
      if (this.__min !== undefined && _v < this.__min) {
        _v = this.__min;
      } else if (this.__max !== undefined && _v > this.__max) {
        _v = this.__max;
      }
      if (this.__step !== undefined && _v % this.__step !== 0) {
        _v = Math.round(_v / this.__step) * this.__step;
      }
      return get(NumberController.prototype.__proto__ || Object.getPrototypeOf(NumberController.prototype), 'setValue', this).call(this, _v);
    }
  }, {
    key: 'min',
    value: function min(minValue) {
      this.__min = minValue;
      return this;
    }
  }, {
    key: 'max',
    value: function max(maxValue) {
      this.__max = maxValue;
      return this;
    }
  }, {
    key: 'step',
    value: function step(stepValue) {
      this.__step = stepValue;
      this.__impliedStep = stepValue;
      this.__precision = numDecimals(stepValue);
      return this;
    }
  }]);
  return NumberController;
}(Controller);

function roundToDecimal(value, decimals) {
  var tenTo = Math.pow(10, decimals);
  return Math.round(value * tenTo) / tenTo;
}
var NumberControllerBox = function (_NumberController) {
  inherits(NumberControllerBox, _NumberController);
  function NumberControllerBox(object, property, params) {
    classCallCheck(this, NumberControllerBox);
    var _this2 = possibleConstructorReturn(this, (NumberControllerBox.__proto__ || Object.getPrototypeOf(NumberControllerBox)).call(this, object, property, params));
    _this2.__truncationSuspended = false;
    var _this = _this2;
    var prevY = void 0;
    function onChange() {
      var attempted = parseFloat(_this.__input.value);
      if (!Common.isNaN(attempted)) {
        _this.setValue(attempted);
      }
    }
    function onFinish() {
      if (_this.__onFinishChange) {
        _this.__onFinishChange.call(_this, _this.getValue());
      }
    }
    function onBlur() {
      onFinish();
    }
    function onMouseDrag(e) {
      var diff = prevY - e.clientY;
      _this.setValue(_this.getValue() + diff * _this.__impliedStep);
      prevY = e.clientY;
    }
    function onMouseUp() {
      dom.unbind(window, 'mousemove', onMouseDrag);
      dom.unbind(window, 'mouseup', onMouseUp);
      onFinish();
    }
    function onMouseDown(e) {
      dom.bind(window, 'mousemove', onMouseDrag);
      dom.bind(window, 'mouseup', onMouseUp);
      prevY = e.clientY;
    }
    _this2.__input = document.createElement('input');
    _this2.__input.setAttribute('type', 'text');
    dom.bind(_this2.__input, 'change', onChange);
    dom.bind(_this2.__input, 'blur', onBlur);
    dom.bind(_this2.__input, 'mousedown', onMouseDown);
    dom.bind(_this2.__input, 'keydown', function (e) {
      if (e.keyCode === 13) {
        _this.__truncationSuspended = true;
        this.blur();
        _this.__truncationSuspended = false;
        onFinish();
      }
    });
    _this2.updateDisplay();
    _this2.domElement.appendChild(_this2.__input);
    return _this2;
  }
  createClass(NumberControllerBox, [{
    key: 'updateDisplay',
    value: function updateDisplay() {
      this.__input.value = this.__truncationSuspended ? this.getValue() : roundToDecimal(this.getValue(), this.__precision);
      return get(NumberControllerBox.prototype.__proto__ || Object.getPrototypeOf(NumberControllerBox.prototype), 'updateDisplay', this).call(this);
    }
  }]);
  return NumberControllerBox;
}(NumberController);

function map(v, i1, i2, o1, o2) {
  return o1 + (o2 - o1) * ((v - i1) / (i2 - i1));
}
var NumberControllerSlider = function (_NumberController) {
  inherits(NumberControllerSlider, _NumberController);
  function NumberControllerSlider(object, property, min, max, step) {
    classCallCheck(this, NumberControllerSlider);
    var _this2 = possibleConstructorReturn(this, (NumberControllerSlider.__proto__ || Object.getPrototypeOf(NumberControllerSlider)).call(this, object, property, { min: min, max: max, step: step }));
    var _this = _this2;
    _this2.__background = document.createElement('div');
    _this2.__foreground = document.createElement('div');
    dom.bind(_this2.__background, 'mousedown', onMouseDown);
    dom.bind(_this2.__background, 'touchstart', onTouchStart);
    dom.addClass(_this2.__background, 'slider');
    dom.addClass(_this2.__foreground, 'slider-fg');
    function onMouseDown(e) {
      document.activeElement.blur();
      dom.bind(window, 'mousemove', onMouseDrag);
      dom.bind(window, 'mouseup', onMouseUp);
      onMouseDrag(e);
    }
    function onMouseDrag(e) {
      e.preventDefault();
      var bgRect = _this.__background.getBoundingClientRect();
      _this.setValue(map(e.clientX, bgRect.left, bgRect.right, _this.__min, _this.__max));
      return false;
    }
    function onMouseUp() {
      dom.unbind(window, 'mousemove', onMouseDrag);
      dom.unbind(window, 'mouseup', onMouseUp);
      if (_this.__onFinishChange) {
        _this.__onFinishChange.call(_this, _this.getValue());
      }
    }
    function onTouchStart(e) {
      if (e.touches.length !== 1) {
        return;
      }
      dom.bind(window, 'touchmove', onTouchMove);
      dom.bind(window, 'touchend', onTouchEnd);
      onTouchMove(e);
    }
    function onTouchMove(e) {
      var clientX = e.touches[0].clientX;
      var bgRect = _this.__background.getBoundingClientRect();
      _this.setValue(map(clientX, bgRect.left, bgRect.right, _this.__min, _this.__max));
    }
    function onTouchEnd() {
      dom.unbind(window, 'touchmove', onTouchMove);
      dom.unbind(window, 'touchend', onTouchEnd);
      if (_this.__onFinishChange) {
        _this.__onFinishChange.call(_this, _this.getValue());
      }
    }
    _this2.updateDisplay();
    _this2.__background.appendChild(_this2.__foreground);
    _this2.domElement.appendChild(_this2.__background);
    return _this2;
  }
  createClass(NumberControllerSlider, [{
    key: 'updateDisplay',
    value: function updateDisplay() {
      var pct = (this.getValue() - this.__min) / (this.__max - this.__min);
      this.__foreground.style.width = pct * 100 + '%';
      return get(NumberControllerSlider.prototype.__proto__ || Object.getPrototypeOf(NumberControllerSlider.prototype), 'updateDisplay', this).call(this);
    }
  }]);
  return NumberControllerSlider;
}(NumberController);

var FunctionController = function (_Controller) {
  inherits(FunctionController, _Controller);
  function FunctionController(object, property, text) {
    classCallCheck(this, FunctionController);
    var _this2 = possibleConstructorReturn(this, (FunctionController.__proto__ || Object.getPrototypeOf(FunctionController)).call(this, object, property));
    var _this = _this2;
    _this2.__button = document.createElement('div');
    _this2.__button.innerHTML = text === undefined ? 'Fire' : text;
    dom.bind(_this2.__button, 'click', function (e) {
      e.preventDefault();
      _this.fire();
      return false;
    });
    dom.addClass(_this2.__button, 'button');
    _this2.domElement.appendChild(_this2.__button);
    return _this2;
  }
  createClass(FunctionController, [{
    key: 'fire',
    value: function fire() {
      if (this.__onChange) {
        this.__onChange.call(this);
      }
      this.getValue().call(this.object);
      if (this.__onFinishChange) {
        this.__onFinishChange.call(this, this.getValue());
      }
    }
  }]);
  return FunctionController;
}(Controller);

var ColorController = function (_Controller) {
  inherits(ColorController, _Controller);
  function ColorController(object, property) {
    classCallCheck(this, ColorController);
    var _this2 = possibleConstructorReturn(this, (ColorController.__proto__ || Object.getPrototypeOf(ColorController)).call(this, object, property));
    _this2.__color = new Color(_this2.getValue());
    _this2.__temp = new Color(0);
    var _this = _this2;
    _this2.domElement = document.createElement('div');
    dom.makeSelectable(_this2.domElement, false);
    _this2.__selector = document.createElement('div');
    _this2.__selector.className = 'selector';
    _this2.__saturation_field = document.createElement('div');
    _this2.__saturation_field.className = 'saturation-field';
    _this2.__field_knob = document.createElement('div');
    _this2.__field_knob.className = 'field-knob';
    _this2.__field_knob_border = '2px solid ';
    _this2.__hue_knob = document.createElement('div');
    _this2.__hue_knob.className = 'hue-knob';
    _this2.__hue_field = document.createElement('div');
    _this2.__hue_field.className = 'hue-field';
    _this2.__input = document.createElement('input');
    _this2.__input.type = 'text';
    _this2.__input_textShadow = '0 1px 1px ';
    dom.bind(_this2.__input, 'keydown', function (e) {
      if (e.keyCode === 13) {
        onBlur.call(this);
      }
    });
    dom.bind(_this2.__input, 'blur', onBlur);
    dom.bind(_this2.__selector, 'mousedown', function () {
      dom.addClass(this, 'drag').bind(window, 'mouseup', function () {
        dom.removeClass(_this.__selector, 'drag');
      });
    });
    dom.bind(_this2.__selector, 'touchstart', function () {
      dom.addClass(this, 'drag').bind(window, 'touchend', function () {
        dom.removeClass(_this.__selector, 'drag');
      });
    });
    var valueField = document.createElement('div');
    Common.extend(_this2.__selector.style, {
      width: '122px',
      height: '102px',
      padding: '3px',
      backgroundColor: '#222',
      boxShadow: '0px 1px 3px rgba(0,0,0,0.3)'
    });
    Common.extend(_this2.__field_knob.style, {
      position: 'absolute',
      width: '12px',
      height: '12px',
      border: _this2.__field_knob_border + (_this2.__color.v < 0.5 ? '#fff' : '#000'),
      boxShadow: '0px 1px 3px rgba(0,0,0,0.5)',
      borderRadius: '12px',
      zIndex: 1
    });
    Common.extend(_this2.__hue_knob.style, {
      position: 'absolute',
      width: '15px',
      height: '2px',
      borderRight: '4px solid #fff',
      zIndex: 1
    });
    Common.extend(_this2.__saturation_field.style, {
      width: '100px',
      height: '100px',
      border: '1px solid #555',
      marginRight: '3px',
      display: 'inline-block',
      cursor: 'pointer'
    });
    Common.extend(valueField.style, {
      width: '100%',
      height: '100%',
      background: 'none'
    });
    linearGradient(valueField, 'top', 'rgba(0,0,0,0)', '#000');
    Common.extend(_this2.__hue_field.style, {
      width: '15px',
      height: '100px',
      border: '1px solid #555',
      cursor: 'ns-resize',
      position: 'absolute',
      top: '3px',
      right: '3px'
    });
    hueGradient(_this2.__hue_field);
    Common.extend(_this2.__input.style, {
      outline: 'none',
      textAlign: 'center',
      color: '#fff',
      border: 0,
      fontWeight: 'bold',
      textShadow: _this2.__input_textShadow + 'rgba(0,0,0,0.7)'
    });
    dom.bind(_this2.__saturation_field, 'mousedown', fieldDown);
    dom.bind(_this2.__saturation_field, 'touchstart', fieldDown);
    dom.bind(_this2.__field_knob, 'mousedown', fieldDown);
    dom.bind(_this2.__field_knob, 'touchstart', fieldDown);
    dom.bind(_this2.__hue_field, 'mousedown', fieldDownH);
    dom.bind(_this2.__hue_field, 'touchstart', fieldDownH);
    function fieldDown(e) {
      setSV(e);
      dom.bind(window, 'mousemove', setSV);
      dom.bind(window, 'touchmove', setSV);
      dom.bind(window, 'mouseup', fieldUpSV);
      dom.bind(window, 'touchend', fieldUpSV);
    }
    function fieldDownH(e) {
      setH(e);
      dom.bind(window, 'mousemove', setH);
      dom.bind(window, 'touchmove', setH);
      dom.bind(window, 'mouseup', fieldUpH);
      dom.bind(window, 'touchend', fieldUpH);
    }
    function fieldUpSV() {
      dom.unbind(window, 'mousemove', setSV);
      dom.unbind(window, 'touchmove', setSV);
      dom.unbind(window, 'mouseup', fieldUpSV);
      dom.unbind(window, 'touchend', fieldUpSV);
      onFinish();
    }
    function fieldUpH() {
      dom.unbind(window, 'mousemove', setH);
      dom.unbind(window, 'touchmove', setH);
      dom.unbind(window, 'mouseup', fieldUpH);
      dom.unbind(window, 'touchend', fieldUpH);
      onFinish();
    }
    function onBlur() {
      var i = interpret(this.value);
      if (i !== false) {
        _this.__color.__state = i;
        _this.setValue(_this.__color.toOriginal());
      } else {
        this.value = _this.__color.toString();
      }
    }
    function onFinish() {
      if (_this.__onFinishChange) {
        _this.__onFinishChange.call(_this, _this.__color.toOriginal());
      }
    }
    _this2.__saturation_field.appendChild(valueField);
    _this2.__selector.appendChild(_this2.__field_knob);
    _this2.__selector.appendChild(_this2.__saturation_field);
    _this2.__selector.appendChild(_this2.__hue_field);
    _this2.__hue_field.appendChild(_this2.__hue_knob);
    _this2.domElement.appendChild(_this2.__input);
    _this2.domElement.appendChild(_this2.__selector);
    _this2.updateDisplay();
    function setSV(e) {
      if (e.type.indexOf('touch') === -1) {
        e.preventDefault();
      }
      var fieldRect = _this.__saturation_field.getBoundingClientRect();
      var _ref = e.touches && e.touches[0] || e,
          clientX = _ref.clientX,
          clientY = _ref.clientY;
      var s = (clientX - fieldRect.left) / (fieldRect.right - fieldRect.left);
      var v = 1 - (clientY - fieldRect.top) / (fieldRect.bottom - fieldRect.top);
      if (v > 1) {
        v = 1;
      } else if (v < 0) {
        v = 0;
      }
      if (s > 1) {
        s = 1;
      } else if (s < 0) {
        s = 0;
      }
      _this.__color.v = v;
      _this.__color.s = s;
      _this.setValue(_this.__color.toOriginal());
      return false;
    }
    function setH(e) {
      if (e.type.indexOf('touch') === -1) {
        e.preventDefault();
      }
      var fieldRect = _this.__hue_field.getBoundingClientRect();
      var _ref2 = e.touches && e.touches[0] || e,
          clientY = _ref2.clientY;
      var h = 1 - (clientY - fieldRect.top) / (fieldRect.bottom - fieldRect.top);
      if (h > 1) {
        h = 1;
      } else if (h < 0) {
        h = 0;
      }
      _this.__color.h = h * 360;
      _this.setValue(_this.__color.toOriginal());
      return false;
    }
    return _this2;
  }
  createClass(ColorController, [{
    key: 'updateDisplay',
    value: function updateDisplay() {
      var i = interpret(this.getValue());
      if (i !== false) {
        var mismatch = false;
        Common.each(Color.COMPONENTS, function (component) {
          if (!Common.isUndefined(i[component]) && !Common.isUndefined(this.__color.__state[component]) && i[component] !== this.__color.__state[component]) {
            mismatch = true;
            return {};
          }
        }, this);
        if (mismatch) {
          Common.extend(this.__color.__state, i);
        }
      }
      Common.extend(this.__temp.__state, this.__color.__state);
      this.__temp.a = 1;
      var flip = this.__color.v < 0.5 || this.__color.s > 0.5 ? 255 : 0;
      var _flip = 255 - flip;
      Common.extend(this.__field_knob.style, {
        marginLeft: 100 * this.__color.s - 7 + 'px',
        marginTop: 100 * (1 - this.__color.v) - 7 + 'px',
        backgroundColor: this.__temp.toHexString(),
        border: this.__field_knob_border + 'rgb(' + flip + ',' + flip + ',' + flip + ')'
      });
      this.__hue_knob.style.marginTop = (1 - this.__color.h / 360) * 100 + 'px';
      this.__temp.s = 1;
      this.__temp.v = 1;
      linearGradient(this.__saturation_field, 'left', '#fff', this.__temp.toHexString());
      this.__input.value = this.__color.toString();
      Common.extend(this.__input.style, {
        backgroundColor: this.__color.toHexString(),
        color: 'rgb(' + flip + ',' + flip + ',' + flip + ')',
        textShadow: this.__input_textShadow + 'rgba(' + _flip + ',' + _flip + ',' + _flip + ',.7)'
      });
    }
  }]);
  return ColorController;
}(Controller);
var vendors = ['-moz-', '-o-', '-webkit-', '-ms-', ''];
function linearGradient(elem, x, a, b) {
  elem.style.background = '';
  Common.each(vendors, function (vendor) {
    elem.style.cssText += 'background: ' + vendor + 'linear-gradient(' + x + ', ' + a + ' 0%, ' + b + ' 100%); ';
  });
}
function hueGradient(elem) {
  elem.style.background = '';
  elem.style.cssText += 'background: -moz-linear-gradient(top,  #ff0000 0%, #ff00ff 17%, #0000ff 34%, #00ffff 50%, #00ff00 67%, #ffff00 84%, #ff0000 100%);';
  elem.style.cssText += 'background: -webkit-linear-gradient(top,  #ff0000 0%,#ff00ff 17%,#0000ff 34%,#00ffff 50%,#00ff00 67%,#ffff00 84%,#ff0000 100%);';
  elem.style.cssText += 'background: -o-linear-gradient(top,  #ff0000 0%,#ff00ff 17%,#0000ff 34%,#00ffff 50%,#00ff00 67%,#ffff00 84%,#ff0000 100%);';
  elem.style.cssText += 'background: -ms-linear-gradient(top,  #ff0000 0%,#ff00ff 17%,#0000ff 34%,#00ffff 50%,#00ff00 67%,#ffff00 84%,#ff0000 100%);';
  elem.style.cssText += 'background: linear-gradient(top,  #ff0000 0%,#ff00ff 17%,#0000ff 34%,#00ffff 50%,#00ff00 67%,#ffff00 84%,#ff0000 100%);';
}

var css = {
  load: function load(url, indoc) {
    var doc = indoc || document;
    var link = doc.createElement('link');
    link.type = 'text/css';
    link.rel = 'stylesheet';
    link.href = url;
    doc.getElementsByTagName('head')[0].appendChild(link);
  },
  inject: function inject(cssContent, indoc) {
    var doc = indoc || document;
    var injected = document.createElement('style');
    injected.type = 'text/css';
    injected.innerHTML = cssContent;
    var head = doc.getElementsByTagName('head')[0];
    try {
      head.appendChild(injected);
    } catch (e) {
    }
  }
};

var saveDialogContents = "<div id=\"dg-save\" class=\"dg dialogue\">\n\n  Here's the new load parameter for your <code>GUI</code>'s constructor:\n\n  <textarea id=\"dg-new-constructor\"></textarea>\n\n  <div id=\"dg-save-locally\">\n\n    <input id=\"dg-local-storage\" type=\"checkbox\"/> Automatically save\n    values to <code>localStorage</code> on exit.\n\n    <div id=\"dg-local-explain\">The values saved to <code>localStorage</code> will\n      override those passed to <code>dat.GUI</code>'s constructor. This makes it\n      easier to work incrementally, but <code>localStorage</code> is fragile,\n      and your friends may not see the same values you do.\n\n    </div>\n\n  </div>\n\n</div>";

var ControllerFactory = function ControllerFactory(object, property) {
  var initialValue = object[property];
  if (Common.isArray(arguments[2]) || Common.isObject(arguments[2])) {
    return new OptionController(object, property, arguments[2]);
  }
  if (Common.isNumber(initialValue)) {
    if (Common.isNumber(arguments[2]) && Common.isNumber(arguments[3])) {
      if (Common.isNumber(arguments[4])) {
        return new NumberControllerSlider(object, property, arguments[2], arguments[3], arguments[4]);
      }
      return new NumberControllerSlider(object, property, arguments[2], arguments[3]);
    }
    if (Common.isNumber(arguments[4])) {
      return new NumberControllerBox(object, property, { min: arguments[2], max: arguments[3], step: arguments[4] });
    }
    return new NumberControllerBox(object, property, { min: arguments[2], max: arguments[3] });
  }
  if (Common.isString(initialValue)) {
    return new StringController(object, property);
  }
  if (Common.isFunction(initialValue)) {
    return new FunctionController(object, property, '');
  }
  if (Common.isBoolean(initialValue)) {
    return new BooleanController(object, property);
  }
  return null;
};

function requestAnimationFrame$1(callback) {
  setTimeout(callback, 1000 / 60);
}
var requestAnimationFrame$1$1 = window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.oRequestAnimationFrame || window.msRequestAnimationFrame || requestAnimationFrame$1;

var CenteredDiv = function () {
  function CenteredDiv() {
    classCallCheck(this, CenteredDiv);
    this.backgroundElement = document.createElement('div');
    Common.extend(this.backgroundElement.style, {
      backgroundColor: 'rgba(0,0,0,0.8)',
      top: 0,
      left: 0,
      display: 'none',
      zIndex: '1000',
      opacity: 0,
      WebkitTransition: 'opacity 0.2s linear',
      transition: 'opacity 0.2s linear'
    });
    dom.makeFullscreen(this.backgroundElement);
    this.backgroundElement.style.position = 'fixed';
    this.domElement = document.createElement('div');
    Common.extend(this.domElement.style, {
      position: 'fixed',
      display: 'none',
      zIndex: '1001',
      opacity: 0,
      WebkitTransition: '-webkit-transform 0.2s ease-out, opacity 0.2s linear',
      transition: 'transform 0.2s ease-out, opacity 0.2s linear'
    });
    document.body.appendChild(this.backgroundElement);
    document.body.appendChild(this.domElement);
    var _this = this;
    dom.bind(this.backgroundElement, 'click', function () {
      _this.hide();
    });
  }
  createClass(CenteredDiv, [{
    key: 'show',
    value: function show() {
      var _this = this;
      this.backgroundElement.style.display = 'block';
      this.domElement.style.display = 'block';
      this.domElement.style.opacity = 0;
      this.domElement.style.webkitTransform = 'scale(1.1)';
      this.layout();
      Common.defer(function () {
        _this.backgroundElement.style.opacity = 1;
        _this.domElement.style.opacity = 1;
        _this.domElement.style.webkitTransform = 'scale(1)';
      });
    }
  }, {
    key: 'hide',
    value: function hide() {
      var _this = this;
      var hide = function hide() {
        _this.domElement.style.display = 'none';
        _this.backgroundElement.style.display = 'none';
        dom.unbind(_this.domElement, 'webkitTransitionEnd', hide);
        dom.unbind(_this.domElement, 'transitionend', hide);
        dom.unbind(_this.domElement, 'oTransitionEnd', hide);
      };
      dom.bind(this.domElement, 'webkitTransitionEnd', hide);
      dom.bind(this.domElement, 'transitionend', hide);
      dom.bind(this.domElement, 'oTransitionEnd', hide);
      this.backgroundElement.style.opacity = 0;
      this.domElement.style.opacity = 0;
      this.domElement.style.webkitTransform = 'scale(1.1)';
    }
  }, {
    key: 'layout',
    value: function layout() {
      this.domElement.style.left = window.innerWidth / 2 - dom.getWidth(this.domElement) / 2 + 'px';
      this.domElement.style.top = window.innerHeight / 2 - dom.getHeight(this.domElement) / 2 + 'px';
    }
  }]);
  return CenteredDiv;
}();

var styleSheet = ___$insertStyle(".dg ul{list-style:none;margin:0;padding:0;width:100%;clear:both}.dg.ac{position:fixed;top:0;left:0;right:0;height:0;z-index:0}.dg:not(.ac) .main{overflow:hidden}.dg.main{-webkit-transition:opacity .1s linear;-o-transition:opacity .1s linear;-moz-transition:opacity .1s linear;transition:opacity .1s linear}.dg.main.taller-than-window{overflow-y:auto}.dg.main.taller-than-window .close-button{opacity:1;margin-top:-1px;border-top:1px solid #2c2c2c}.dg.main ul.closed .close-button{opacity:1 !important}.dg.main:hover .close-button,.dg.main .close-button.drag{opacity:1}.dg.main .close-button{-webkit-transition:opacity .1s linear;-o-transition:opacity .1s linear;-moz-transition:opacity .1s linear;transition:opacity .1s linear;border:0;line-height:19px;height:20px;cursor:pointer;text-align:center;background-color:#000}.dg.main .close-button.close-top{position:relative}.dg.main .close-button.close-bottom{position:absolute}.dg.main .close-button:hover{background-color:#111}.dg.a{float:right;margin-right:15px;overflow-y:visible}.dg.a.has-save>ul.close-top{margin-top:0}.dg.a.has-save>ul.close-bottom{margin-top:27px}.dg.a.has-save>ul.closed{margin-top:0}.dg.a .save-row{top:0;z-index:1002}.dg.a .save-row.close-top{position:relative}.dg.a .save-row.close-bottom{position:fixed}.dg li{-webkit-transition:height .1s ease-out;-o-transition:height .1s ease-out;-moz-transition:height .1s ease-out;transition:height .1s ease-out;-webkit-transition:overflow .1s linear;-o-transition:overflow .1s linear;-moz-transition:overflow .1s linear;transition:overflow .1s linear}.dg li:not(.folder){cursor:auto;height:27px;line-height:27px;padding:0 4px 0 5px}.dg li.folder{padding:0;border-left:4px solid rgba(0,0,0,0)}.dg li.title{cursor:pointer;margin-left:-4px}.dg .closed li:not(.title),.dg .closed ul li,.dg .closed ul li>*{height:0;overflow:hidden;border:0}.dg .cr{clear:both;padding-left:3px;height:27px;overflow:hidden}.dg .property-name{cursor:default;float:left;clear:left;width:40%;overflow:hidden;text-overflow:ellipsis}.dg .cr.function .property-name{width:100%}.dg .c{float:left;width:60%;position:relative}.dg .c input[type=text]{border:0;margin-top:4px;padding:3px;width:100%;float:right}.dg .has-slider input[type=text]{width:30%;margin-left:0}.dg .slider{float:left;width:66%;margin-left:-5px;margin-right:0;height:19px;margin-top:4px}.dg .slider-fg{height:100%}.dg .c input[type=checkbox]{margin-top:7px}.dg .c select{margin-top:5px}.dg .cr.function,.dg .cr.function .property-name,.dg .cr.function *,.dg .cr.boolean,.dg .cr.boolean *{cursor:pointer}.dg .cr.color{overflow:visible}.dg .selector{display:none;position:absolute;margin-left:-9px;margin-top:23px;z-index:10}.dg .c:hover .selector,.dg .selector.drag{display:block}.dg li.save-row{padding:0}.dg li.save-row .button{display:inline-block;padding:0px 6px}.dg.dialogue{background-color:#222;width:460px;padding:15px;font-size:13px;line-height:15px}#dg-new-constructor{padding:10px;color:#222;font-family:Monaco, monospace;font-size:10px;border:0;resize:none;box-shadow:inset 1px 1px 1px #888;word-wrap:break-word;margin:12px 0;display:block;width:440px;overflow-y:scroll;height:100px;position:relative}#dg-local-explain{display:none;font-size:11px;line-height:17px;border-radius:3px;background-color:#333;padding:8px;margin-top:10px}#dg-local-explain code{font-size:10px}#dat-gui-save-locally{display:none}.dg{color:#eee;font:11px 'Lucida Grande', sans-serif;text-shadow:0 -1px 0 #111}.dg.main::-webkit-scrollbar{width:5px;background:#1a1a1a}.dg.main::-webkit-scrollbar-corner{height:0;display:none}.dg.main::-webkit-scrollbar-thumb{border-radius:5px;background:#676767}.dg li:not(.folder){background:#1a1a1a;border-bottom:1px solid #2c2c2c}.dg li.save-row{line-height:25px;background:#dad5cb;border:0}.dg li.save-row select{margin-left:5px;width:108px}.dg li.save-row .button{margin-left:5px;margin-top:1px;border-radius:2px;font-size:9px;line-height:7px;padding:4px 4px 5px 4px;background:#c5bdad;color:#fff;text-shadow:0 1px 0 #b0a58f;box-shadow:0 -1px 0 #b0a58f;cursor:pointer}.dg li.save-row .button.gears{background:#c5bdad url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAsAAAANCAYAAAB/9ZQ7AAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAQJJREFUeNpiYKAU/P//PwGIC/ApCABiBSAW+I8AClAcgKxQ4T9hoMAEUrxx2QSGN6+egDX+/vWT4e7N82AMYoPAx/evwWoYoSYbACX2s7KxCxzcsezDh3evFoDEBYTEEqycggWAzA9AuUSQQgeYPa9fPv6/YWm/Acx5IPb7ty/fw+QZblw67vDs8R0YHyQhgObx+yAJkBqmG5dPPDh1aPOGR/eugW0G4vlIoTIfyFcA+QekhhHJhPdQxbiAIguMBTQZrPD7108M6roWYDFQiIAAv6Aow/1bFwXgis+f2LUAynwoIaNcz8XNx3Dl7MEJUDGQpx9gtQ8YCueB+D26OECAAQDadt7e46D42QAAAABJRU5ErkJggg==) 2px 1px no-repeat;height:7px;width:8px}.dg li.save-row .button:hover{background-color:#bab19e;box-shadow:0 -1px 0 #b0a58f}.dg li.folder{border-bottom:0}.dg li.title{padding-left:16px;background:#000 url(data:image/gif;base64,R0lGODlhBQAFAJEAAP////Pz8////////yH5BAEAAAIALAAAAAAFAAUAAAIIlI+hKgFxoCgAOw==) 6px 10px no-repeat;cursor:pointer;border-bottom:1px solid rgba(255,255,255,0.2)}.dg .closed li.title{background-image:url(data:image/gif;base64,R0lGODlhBQAFAJEAAP////Pz8////////yH5BAEAAAIALAAAAAAFAAUAAAIIlGIWqMCbWAEAOw==)}.dg .cr.boolean{border-left:3px solid #806787}.dg .cr.color{border-left:3px solid}.dg .cr.function{border-left:3px solid #e61d5f}.dg .cr.number{border-left:3px solid #2FA1D6}.dg .cr.number input[type=text]{color:#2FA1D6}.dg .cr.string{border-left:3px solid #1ed36f}.dg .cr.string input[type=text]{color:#1ed36f}.dg .cr.function:hover,.dg .cr.boolean:hover{background:#111}.dg .c input[type=text]{background:#303030;outline:none}.dg .c input[type=text]:hover{background:#3c3c3c}.dg .c input[type=text]:focus{background:#494949;color:#fff}.dg .c .slider{background:#303030;cursor:ew-resize}.dg .c .slider-fg{background:#2FA1D6;max-width:100%}.dg .c .slider:hover{background:#3c3c3c}.dg .c .slider:hover .slider-fg{background:#44abda}\n");

css.inject(styleSheet);
var CSS_NAMESPACE = 'dg';
var HIDE_KEY_CODE = 72;
var CLOSE_BUTTON_HEIGHT = 20;
var DEFAULT_DEFAULT_PRESET_NAME = 'Default';
var SUPPORTS_LOCAL_STORAGE = function () {
  try {
    return !!window.localStorage;
  } catch (e) {
    return false;
  }
}();
var SAVE_DIALOGUE = void 0;
var autoPlaceVirgin = true;
var autoPlaceContainer = void 0;
var hide = false;
var hideableGuis = [];
var GUI = function GUI(pars) {
  var _this = this;
  var params = pars || {};
  this.domElement = document.createElement('div');
  this.__ul = document.createElement('ul');
  this.domElement.appendChild(this.__ul);
  dom.addClass(this.domElement, CSS_NAMESPACE);
  this.__folders = {};
  this.__controllers = [];
  this.__rememberedObjects = [];
  this.__rememberedObjectIndecesToControllers = [];
  this.__listening = [];
  params = Common.defaults(params, {
    closeOnTop: false,
    autoPlace: true,
    width: GUI.DEFAULT_WIDTH
  });
  params = Common.defaults(params, {
    resizable: params.autoPlace,
    hideable: params.autoPlace
  });
  if (!Common.isUndefined(params.load)) {
    if (params.preset) {
      params.load.preset = params.preset;
    }
  } else {
    params.load = { preset: DEFAULT_DEFAULT_PRESET_NAME };
  }
  if (Common.isUndefined(params.parent) && params.hideable) {
    hideableGuis.push(this);
  }
  params.resizable = Common.isUndefined(params.parent) && params.resizable;
  if (params.autoPlace && Common.isUndefined(params.scrollable)) {
    params.scrollable = true;
  }
  var useLocalStorage = SUPPORTS_LOCAL_STORAGE && localStorage.getItem(getLocalStorageHash(this, 'isLocal')) === 'true';
  var saveToLocalStorage = void 0;
  var titleRow = void 0;
  Object.defineProperties(this,
  {
    parent: {
      get: function get$$1() {
        return params.parent;
      }
    },
    scrollable: {
      get: function get$$1() {
        return params.scrollable;
      }
    },
    autoPlace: {
      get: function get$$1() {
        return params.autoPlace;
      }
    },
    closeOnTop: {
      get: function get$$1() {
        return params.closeOnTop;
      }
    },
    preset: {
      get: function get$$1() {
        if (_this.parent) {
          return _this.getRoot().preset;
        }
        return params.load.preset;
      },
      set: function set$$1(v) {
        if (_this.parent) {
          _this.getRoot().preset = v;
        } else {
          params.load.preset = v;
        }
        setPresetSelectIndex(this);
        _this.revert();
      }
    },
    width: {
      get: function get$$1() {
        return params.width;
      },
      set: function set$$1(v) {
        params.width = v;
        setWidth(_this, v);
      }
    },
    name: {
      get: function get$$1() {
        return params.name;
      },
      set: function set$$1(v) {
        params.name = v;
        if (titleRow) {
          titleRow.innerHTML = params.name;
        }
      }
    },
    closed: {
      get: function get$$1() {
        return params.closed;
      },
      set: function set$$1(v) {
        params.closed = v;
        if (params.closed) {
          dom.addClass(_this.__ul, GUI.CLASS_CLOSED);
        } else {
          dom.removeClass(_this.__ul, GUI.CLASS_CLOSED);
        }
        this.onResize();
        if (_this.__closeButton) {
          _this.__closeButton.innerHTML = v ? GUI.TEXT_OPEN : GUI.TEXT_CLOSED;
        }
      }
    },
    load: {
      get: function get$$1() {
        return params.load;
      }
    },
    useLocalStorage: {
      get: function get$$1() {
        return useLocalStorage;
      },
      set: function set$$1(bool) {
        if (SUPPORTS_LOCAL_STORAGE) {
          useLocalStorage = bool;
          if (bool) {
            dom.bind(window, 'unload', saveToLocalStorage);
          } else {
            dom.unbind(window, 'unload', saveToLocalStorage);
          }
          localStorage.setItem(getLocalStorageHash(_this, 'isLocal'), bool);
        }
      }
    }
  });
  if (Common.isUndefined(params.parent)) {
    this.closed = params.closed || false;
    dom.addClass(this.domElement, GUI.CLASS_MAIN);
    dom.makeSelectable(this.domElement, false);
    if (SUPPORTS_LOCAL_STORAGE) {
      if (useLocalStorage) {
        _this.useLocalStorage = true;
        var savedGui = localStorage.getItem(getLocalStorageHash(this, 'gui'));
        if (savedGui) {
          params.load = JSON.parse(savedGui);
        }
      }
    }
    this.__closeButton = document.createElement('div');
    this.__closeButton.innerHTML = GUI.TEXT_CLOSED;
    dom.addClass(this.__closeButton, GUI.CLASS_CLOSE_BUTTON);
    if (params.closeOnTop) {
      dom.addClass(this.__closeButton, GUI.CLASS_CLOSE_TOP);
      this.domElement.insertBefore(this.__closeButton, this.domElement.childNodes[0]);
    } else {
      dom.addClass(this.__closeButton, GUI.CLASS_CLOSE_BOTTOM);
      this.domElement.appendChild(this.__closeButton);
    }
    dom.bind(this.__closeButton, 'click', function () {
      _this.closed = !_this.closed;
    });
  } else {
    if (params.closed === undefined) {
      params.closed = true;
    }
    var titleRowName = document.createTextNode(params.name);
    dom.addClass(titleRowName, 'controller-name');
    titleRow = addRow(_this, titleRowName);
    var onClickTitle = function onClickTitle(e) {
      e.preventDefault();
      _this.closed = !_this.closed;
      return false;
    };
    dom.addClass(this.__ul, GUI.CLASS_CLOSED);
    dom.addClass(titleRow, 'title');
    dom.bind(titleRow, 'click', onClickTitle);
    if (!params.closed) {
      this.closed = false;
    }
  }
  if (params.autoPlace) {
    if (Common.isUndefined(params.parent)) {
      if (autoPlaceVirgin) {
        autoPlaceContainer = document.createElement('div');
        dom.addClass(autoPlaceContainer, CSS_NAMESPACE);
        dom.addClass(autoPlaceContainer, GUI.CLASS_AUTO_PLACE_CONTAINER);
        document.body.appendChild(autoPlaceContainer);
        autoPlaceVirgin = false;
      }
      autoPlaceContainer.appendChild(this.domElement);
      dom.addClass(this.domElement, GUI.CLASS_AUTO_PLACE);
    }
    if (!this.parent) {
      setWidth(_this, params.width);
    }
  }
  this.__resizeHandler = function () {
    _this.onResizeDebounced();
  };
  dom.bind(window, 'resize', this.__resizeHandler);
  dom.bind(this.__ul, 'webkitTransitionEnd', this.__resizeHandler);
  dom.bind(this.__ul, 'transitionend', this.__resizeHandler);
  dom.bind(this.__ul, 'oTransitionEnd', this.__resizeHandler);
  this.onResize();
  if (params.resizable) {
    addResizeHandle(this);
  }
  saveToLocalStorage = function saveToLocalStorage() {
    if (SUPPORTS_LOCAL_STORAGE && localStorage.getItem(getLocalStorageHash(_this, 'isLocal')) === 'true') {
      localStorage.setItem(getLocalStorageHash(_this, 'gui'), JSON.stringify(_this.getSaveObject()));
    }
  };
  this.saveToLocalStorageIfPossible = saveToLocalStorage;
  function resetWidth() {
    var root = _this.getRoot();
    root.width += 1;
    Common.defer(function () {
      root.width -= 1;
    });
  }
  if (!params.parent) {
    resetWidth();
  }
};
GUI.toggleHide = function () {
  hide = !hide;
  Common.each(hideableGuis, function (gui) {
    gui.domElement.style.display = hide ? 'none' : '';
  });
};
GUI.CLASS_AUTO_PLACE = 'a';
GUI.CLASS_AUTO_PLACE_CONTAINER = 'ac';
GUI.CLASS_MAIN = 'main';
GUI.CLASS_CONTROLLER_ROW = 'cr';
GUI.CLASS_TOO_TALL = 'taller-than-window';
GUI.CLASS_CLOSED = 'closed';
GUI.CLASS_CLOSE_BUTTON = 'close-button';
GUI.CLASS_CLOSE_TOP = 'close-top';
GUI.CLASS_CLOSE_BOTTOM = 'close-bottom';
GUI.CLASS_DRAG = 'drag';
GUI.DEFAULT_WIDTH = 245;
GUI.TEXT_CLOSED = 'Close Controls';
GUI.TEXT_OPEN = 'Open Controls';
GUI._keydownHandler = function (e) {
  if (document.activeElement.type !== 'text' && (e.which === HIDE_KEY_CODE || e.keyCode === HIDE_KEY_CODE)) {
    GUI.toggleHide();
  }
};
dom.bind(window, 'keydown', GUI._keydownHandler, false);
Common.extend(GUI.prototype,
{
  add: function add(object, property) {
    return _add(this, object, property, {
      factoryArgs: Array.prototype.slice.call(arguments, 2)
    });
  },
  addColor: function addColor(object, property) {
    return _add(this, object, property, {
      color: true
    });
  },
  remove: function remove(controller) {
    this.__ul.removeChild(controller.__li);
    this.__controllers.splice(this.__controllers.indexOf(controller), 1);
    var _this = this;
    Common.defer(function () {
      _this.onResize();
    });
  },
  destroy: function destroy() {
    if (this.parent) {
      throw new Error('Only the root GUI should be removed with .destroy(). ' + 'For subfolders, use gui.removeFolder(folder) instead.');
    }
    if (this.autoPlace) {
      autoPlaceContainer.removeChild(this.domElement);
    }
    var _this = this;
    Common.each(this.__folders, function (subfolder) {
      _this.removeFolder(subfolder);
    });
    dom.unbind(window, 'keydown', GUI._keydownHandler, false);
    removeListeners(this);
  },
  addFolder: function addFolder(name) {
    if (this.__folders[name] !== undefined) {
      throw new Error('You already have a folder in this GUI by the' + ' name "' + name + '"');
    }
    var newGuiParams = { name: name, parent: this };
    newGuiParams.autoPlace = this.autoPlace;
    if (this.load &&
    this.load.folders &&
    this.load.folders[name]) {
      newGuiParams.closed = this.load.folders[name].closed;
      newGuiParams.load = this.load.folders[name];
    }
    var gui = new GUI(newGuiParams);
    this.__folders[name] = gui;
    var li = addRow(this, gui.domElement);
    dom.addClass(li, 'folder');
    return gui;
  },
  removeFolder: function removeFolder(folder) {
    this.__ul.removeChild(folder.domElement.parentElement);
    delete this.__folders[folder.name];
    if (this.load &&
    this.load.folders &&
    this.load.folders[folder.name]) {
      delete this.load.folders[folder.name];
    }
    removeListeners(folder);
    var _this = this;
    Common.each(folder.__folders, function (subfolder) {
      folder.removeFolder(subfolder);
    });
    Common.defer(function () {
      _this.onResize();
    });
  },
  open: function open() {
    this.closed = false;
  },
  close: function close() {
    this.closed = true;
  },
  hide: function hide() {
    this.domElement.style.display = 'none';
  },
  show: function show() {
    this.domElement.style.display = '';
  },
  onResize: function onResize() {
    var root = this.getRoot();
    if (root.scrollable) {
      var top = dom.getOffset(root.__ul).top;
      var h = 0;
      Common.each(root.__ul.childNodes, function (node) {
        if (!(root.autoPlace && node === root.__save_row)) {
          h += dom.getHeight(node);
        }
      });
      if (window.innerHeight - top - CLOSE_BUTTON_HEIGHT < h) {
        dom.addClass(root.domElement, GUI.CLASS_TOO_TALL);
        root.__ul.style.height = window.innerHeight - top - CLOSE_BUTTON_HEIGHT + 'px';
      } else {
        dom.removeClass(root.domElement, GUI.CLASS_TOO_TALL);
        root.__ul.style.height = 'auto';
      }
    }
    if (root.__resize_handle) {
      Common.defer(function () {
        root.__resize_handle.style.height = root.__ul.offsetHeight + 'px';
      });
    }
    if (root.__closeButton) {
      root.__closeButton.style.width = root.width + 'px';
    }
  },
  onResizeDebounced: Common.debounce(function () {
    this.onResize();
  }, 50),
  remember: function remember() {
    if (Common.isUndefined(SAVE_DIALOGUE)) {
      SAVE_DIALOGUE = new CenteredDiv();
      SAVE_DIALOGUE.domElement.innerHTML = saveDialogContents;
    }
    if (this.parent) {
      throw new Error('You can only call remember on a top level GUI.');
    }
    var _this = this;
    Common.each(Array.prototype.slice.call(arguments), function (object) {
      if (_this.__rememberedObjects.length === 0) {
        addSaveMenu(_this);
      }
      if (_this.__rememberedObjects.indexOf(object) === -1) {
        _this.__rememberedObjects.push(object);
      }
    });
    if (this.autoPlace) {
      setWidth(this, this.width);
    }
  },
  getRoot: function getRoot() {
    var gui = this;
    while (gui.parent) {
      gui = gui.parent;
    }
    return gui;
  },
  getSaveObject: function getSaveObject() {
    var toReturn = this.load;
    toReturn.closed = this.closed;
    if (this.__rememberedObjects.length > 0) {
      toReturn.preset = this.preset;
      if (!toReturn.remembered) {
        toReturn.remembered = {};
      }
      toReturn.remembered[this.preset] = getCurrentPreset(this);
    }
    toReturn.folders = {};
    Common.each(this.__folders, function (element, key) {
      toReturn.folders[key] = element.getSaveObject();
    });
    return toReturn;
  },
  save: function save() {
    if (!this.load.remembered) {
      this.load.remembered = {};
    }
    this.load.remembered[this.preset] = getCurrentPreset(this);
    markPresetModified(this, false);
    this.saveToLocalStorageIfPossible();
  },
  saveAs: function saveAs(presetName) {
    if (!this.load.remembered) {
      this.load.remembered = {};
      this.load.remembered[DEFAULT_DEFAULT_PRESET_NAME] = getCurrentPreset(this, true);
    }
    this.load.remembered[presetName] = getCurrentPreset(this);
    this.preset = presetName;
    addPresetOption(this, presetName, true);
    this.saveToLocalStorageIfPossible();
  },
  revert: function revert(gui) {
    Common.each(this.__controllers, function (controller) {
      if (!this.getRoot().load.remembered) {
        controller.setValue(controller.initialValue);
      } else {
        recallSavedValue(gui || this.getRoot(), controller);
      }
      if (controller.__onFinishChange) {
        controller.__onFinishChange.call(controller, controller.getValue());
      }
    }, this);
    Common.each(this.__folders, function (folder) {
      folder.revert(folder);
    });
    if (!gui) {
      markPresetModified(this.getRoot(), false);
    }
  },
  listen: function listen(controller) {
    var init = this.__listening.length === 0;
    this.__listening.push(controller);
    if (init) {
      updateDisplays(this.__listening);
    }
  },
  updateDisplay: function updateDisplay() {
    Common.each(this.__controllers, function (controller) {
      controller.updateDisplay();
    });
    Common.each(this.__folders, function (folder) {
      folder.updateDisplay();
    });
  }
});
function addRow(gui, newDom, liBefore) {
  var li = document.createElement('li');
  if (newDom) {
    li.appendChild(newDom);
  }
  if (liBefore) {
    gui.__ul.insertBefore(li, liBefore);
  } else {
    gui.__ul.appendChild(li);
  }
  gui.onResize();
  return li;
}
function removeListeners(gui) {
  dom.unbind(window, 'resize', gui.__resizeHandler);
  if (gui.saveToLocalStorageIfPossible) {
    dom.unbind(window, 'unload', gui.saveToLocalStorageIfPossible);
  }
}
function markPresetModified(gui, modified) {
  var opt = gui.__preset_select[gui.__preset_select.selectedIndex];
  if (modified) {
    opt.innerHTML = opt.value + '*';
  } else {
    opt.innerHTML = opt.value;
  }
}
function augmentController(gui, li, controller) {
  controller.__li = li;
  controller.__gui = gui;
  Common.extend(controller, {
    options: function options(_options) {
      if (arguments.length > 1) {
        var nextSibling = controller.__li.nextElementSibling;
        controller.remove();
        return _add(gui, controller.object, controller.property, {
          before: nextSibling,
          factoryArgs: [Common.toArray(arguments)]
        });
      }
      if (Common.isArray(_options) || Common.isObject(_options)) {
        var _nextSibling = controller.__li.nextElementSibling;
        controller.remove();
        return _add(gui, controller.object, controller.property, {
          before: _nextSibling,
          factoryArgs: [_options]
        });
      }
    },
    name: function name(_name) {
      controller.__li.firstElementChild.firstElementChild.innerHTML = _name;
      return controller;
    },
    listen: function listen() {
      controller.__gui.listen(controller);
      return controller;
    },
    remove: function remove() {
      controller.__gui.remove(controller);
      return controller;
    }
  });
  if (controller instanceof NumberControllerSlider) {
    var box = new NumberControllerBox(controller.object, controller.property, { min: controller.__min, max: controller.__max, step: controller.__step });
    Common.each(['updateDisplay', 'onChange', 'onFinishChange', 'step', 'min', 'max'], function (method) {
      var pc = controller[method];
      var pb = box[method];
      controller[method] = box[method] = function () {
        var args = Array.prototype.slice.call(arguments);
        pb.apply(box, args);
        return pc.apply(controller, args);
      };
    });
    dom.addClass(li, 'has-slider');
    controller.domElement.insertBefore(box.domElement, controller.domElement.firstElementChild);
  } else if (controller instanceof NumberControllerBox) {
    var r = function r(returned) {
      if (Common.isNumber(controller.__min) && Common.isNumber(controller.__max)) {
        var oldName = controller.__li.firstElementChild.firstElementChild.innerHTML;
        var wasListening = controller.__gui.__listening.indexOf(controller) > -1;
        controller.remove();
        var newController = _add(gui, controller.object, controller.property, {
          before: controller.__li.nextElementSibling,
          factoryArgs: [controller.__min, controller.__max, controller.__step]
        });
        newController.name(oldName);
        if (wasListening) newController.listen();
        return newController;
      }
      return returned;
    };
    controller.min = Common.compose(r, controller.min);
    controller.max = Common.compose(r, controller.max);
  } else if (controller instanceof BooleanController) {
    dom.bind(li, 'click', function () {
      dom.fakeEvent(controller.__checkbox, 'click');
    });
    dom.bind(controller.__checkbox, 'click', function (e) {
      e.stopPropagation();
    });
  } else if (controller instanceof FunctionController) {
    dom.bind(li, 'click', function () {
      dom.fakeEvent(controller.__button, 'click');
    });
    dom.bind(li, 'mouseover', function () {
      dom.addClass(controller.__button, 'hover');
    });
    dom.bind(li, 'mouseout', function () {
      dom.removeClass(controller.__button, 'hover');
    });
  } else if (controller instanceof ColorController) {
    dom.addClass(li, 'color');
    controller.updateDisplay = Common.compose(function (val) {
      li.style.borderLeftColor = controller.__color.toString();
      return val;
    }, controller.updateDisplay);
    controller.updateDisplay();
  }
  controller.setValue = Common.compose(function (val) {
    if (gui.getRoot().__preset_select && controller.isModified()) {
      markPresetModified(gui.getRoot(), true);
    }
    return val;
  }, controller.setValue);
}
function recallSavedValue(gui, controller) {
  var root = gui.getRoot();
  var matchedIndex = root.__rememberedObjects.indexOf(controller.object);
  if (matchedIndex !== -1) {
    var controllerMap = root.__rememberedObjectIndecesToControllers[matchedIndex];
    if (controllerMap === undefined) {
      controllerMap = {};
      root.__rememberedObjectIndecesToControllers[matchedIndex] = controllerMap;
    }
    controllerMap[controller.property] = controller;
    if (root.load && root.load.remembered) {
      var presetMap = root.load.remembered;
      var preset = void 0;
      if (presetMap[gui.preset]) {
        preset = presetMap[gui.preset];
      } else if (presetMap[DEFAULT_DEFAULT_PRESET_NAME]) {
        preset = presetMap[DEFAULT_DEFAULT_PRESET_NAME];
      } else {
        return;
      }
      if (preset[matchedIndex] && preset[matchedIndex][controller.property] !== undefined) {
        var value = preset[matchedIndex][controller.property];
        controller.initialValue = value;
        controller.setValue(value);
      }
    }
  }
}
function _add(gui, object, property, params) {
  if (object[property] === undefined) {
    throw new Error('Object "' + object + '" has no property "' + property + '"');
  }
  var controller = void 0;
  if (params.color) {
    controller = new ColorController(object, property);
  } else {
    var factoryArgs = [object, property].concat(params.factoryArgs);
    controller = ControllerFactory.apply(gui, factoryArgs);
  }
  if (params.before instanceof Controller) {
    params.before = params.before.__li;
  }
  recallSavedValue(gui, controller);
  dom.addClass(controller.domElement, 'c');
  var name = document.createElement('span');
  dom.addClass(name, 'property-name');
  name.innerHTML = controller.property;
  var container = document.createElement('div');
  container.appendChild(name);
  container.appendChild(controller.domElement);
  var li = addRow(gui, container, params.before);
  dom.addClass(li, GUI.CLASS_CONTROLLER_ROW);
  if (controller instanceof ColorController) {
    dom.addClass(li, 'color');
  } else {
    dom.addClass(li, _typeof(controller.getValue()));
  }
  augmentController(gui, li, controller);
  gui.__controllers.push(controller);
  return controller;
}
function getLocalStorageHash(gui, key) {
  return document.location.href + '.' + key;
}
function addPresetOption(gui, name, setSelected) {
  var opt = document.createElement('option');
  opt.innerHTML = name;
  opt.value = name;
  gui.__preset_select.appendChild(opt);
  if (setSelected) {
    gui.__preset_select.selectedIndex = gui.__preset_select.length - 1;
  }
}
function showHideExplain(gui, explain) {
  explain.style.display = gui.useLocalStorage ? 'block' : 'none';
}
function addSaveMenu(gui) {
  var div = gui.__save_row = document.createElement('li');
  dom.addClass(gui.domElement, 'has-save');
  gui.__ul.insertBefore(div, gui.__ul.firstChild);
  dom.addClass(div, 'save-row');
  var gears = document.createElement('span');
  gears.innerHTML = '&nbsp;';
  dom.addClass(gears, 'button gears');
  var button = document.createElement('span');
  button.innerHTML = 'Save';
  dom.addClass(button, 'button');
  dom.addClass(button, 'save');
  var button2 = document.createElement('span');
  button2.innerHTML = 'New';
  dom.addClass(button2, 'button');
  dom.addClass(button2, 'save-as');
  var button3 = document.createElement('span');
  button3.innerHTML = 'Revert';
  dom.addClass(button3, 'button');
  dom.addClass(button3, 'revert');
  var select = gui.__preset_select = document.createElement('select');
  if (gui.load && gui.load.remembered) {
    Common.each(gui.load.remembered, function (value, key) {
      addPresetOption(gui, key, key === gui.preset);
    });
  } else {
    addPresetOption(gui, DEFAULT_DEFAULT_PRESET_NAME, false);
  }
  dom.bind(select, 'change', function () {
    for (var index = 0; index < gui.__preset_select.length; index++) {
      gui.__preset_select[index].innerHTML = gui.__preset_select[index].value;
    }
    gui.preset = this.value;
  });
  div.appendChild(select);
  div.appendChild(gears);
  div.appendChild(button);
  div.appendChild(button2);
  div.appendChild(button3);
  if (SUPPORTS_LOCAL_STORAGE) {
    var explain = document.getElementById('dg-local-explain');
    var localStorageCheckBox = document.getElementById('dg-local-storage');
    var saveLocally = document.getElementById('dg-save-locally');
    saveLocally.style.display = 'block';
    if (localStorage.getItem(getLocalStorageHash(gui, 'isLocal')) === 'true') {
      localStorageCheckBox.setAttribute('checked', 'checked');
    }
    showHideExplain(gui, explain);
    dom.bind(localStorageCheckBox, 'change', function () {
      gui.useLocalStorage = !gui.useLocalStorage;
      showHideExplain(gui, explain);
    });
  }
  var newConstructorTextArea = document.getElementById('dg-new-constructor');
  dom.bind(newConstructorTextArea, 'keydown', function (e) {
    if (e.metaKey && (e.which === 67 || e.keyCode === 67)) {
      SAVE_DIALOGUE.hide();
    }
  });
  dom.bind(gears, 'click', function () {
    newConstructorTextArea.innerHTML = JSON.stringify(gui.getSaveObject(), undefined, 2);
    SAVE_DIALOGUE.show();
    newConstructorTextArea.focus();
    newConstructorTextArea.select();
  });
  dom.bind(button, 'click', function () {
    gui.save();
  });
  dom.bind(button2, 'click', function () {
    var presetName = prompt('Enter a new preset name.');
    if (presetName) {
      gui.saveAs(presetName);
    }
  });
  dom.bind(button3, 'click', function () {
    gui.revert();
  });
}
function addResizeHandle(gui) {
  var pmouseX = void 0;
  gui.__resize_handle = document.createElement('div');
  Common.extend(gui.__resize_handle.style, {
    width: '6px',
    marginLeft: '-3px',
    height: '200px',
    cursor: 'ew-resize',
    position: 'absolute'
  });
  function drag(e) {
    e.preventDefault();
    gui.width += pmouseX - e.clientX;
    gui.onResize();
    pmouseX = e.clientX;
    return false;
  }
  function dragStop() {
    dom.removeClass(gui.__closeButton, GUI.CLASS_DRAG);
    dom.unbind(window, 'mousemove', drag);
    dom.unbind(window, 'mouseup', dragStop);
  }
  function dragStart(e) {
    e.preventDefault();
    pmouseX = e.clientX;
    dom.addClass(gui.__closeButton, GUI.CLASS_DRAG);
    dom.bind(window, 'mousemove', drag);
    dom.bind(window, 'mouseup', dragStop);
    return false;
  }
  dom.bind(gui.__resize_handle, 'mousedown', dragStart);
  dom.bind(gui.__closeButton, 'mousedown', dragStart);
  gui.domElement.insertBefore(gui.__resize_handle, gui.domElement.firstElementChild);
}
function setWidth(gui, w) {
  gui.domElement.style.width = w + 'px';
  if (gui.__save_row && gui.autoPlace) {
    gui.__save_row.style.width = w + 'px';
  }
  if (gui.__closeButton) {
    gui.__closeButton.style.width = w + 'px';
  }
}
function getCurrentPreset(gui, useInitialValues) {
  var toReturn = {};
  Common.each(gui.__rememberedObjects, function (val, index) {
    var savedValues = {};
    var controllerMap = gui.__rememberedObjectIndecesToControllers[index];
    Common.each(controllerMap, function (controller, property) {
      savedValues[property] = useInitialValues ? controller.initialValue : controller.getValue();
    });
    toReturn[index] = savedValues;
  });
  return toReturn;
}
function setPresetSelectIndex(gui) {
  for (var index = 0; index < gui.__preset_select.length; index++) {
    if (gui.__preset_select[index].value === gui.preset) {
      gui.__preset_select.selectedIndex = index;
    }
  }
}
function updateDisplays(controllerArray) {
  if (controllerArray.length !== 0) {
    requestAnimationFrame$1$1.call(window, function () {
      updateDisplays(controllerArray);
    });
  }
  Common.each(controllerArray, function (c) {
    c.updateDisplay();
  });
}
var GUI$1 = GUI;

function ready(fn) {
    if (document.readyState !== "loading") {
        fn();
    }
    else {
        document.addEventListener("DOMContentLoaded", fn);
    }
}
let renderer;
ready(() => {
    renderer = new Renderer();
    renderer.ready = () => {
        initUI();
    };
    renderer.init("canvasGL", true);
    const canvas = document.getElementById("canvasGL");
    new FreeMovement(renderer, {
        canvas,
        movementSpeed: 35,
        rotationSpeed: 0.006
    });
    const fullScreenUtils = new FullScreenUtils();
    const toggleFullscreenElement = document.getElementById("toggleFullscreen");
    toggleFullscreenElement.addEventListener("click", () => {
        if (document.body.classList.contains("fs")) {
            fullScreenUtils.exitFullScreen();
        }
        else {
            fullScreenUtils.enterFullScreen();
        }
        fullScreenUtils.addFullScreenListener(function () {
            if (fullScreenUtils.isFullScreen()) {
                document.body.classList.add("fs");
            }
            else {
                document.body.classList.remove("fs");
            }
        });
    });
});
function initUI() {
    var _a, _b;
    (_a = document.getElementById("message")) === null || _a === void 0 ? void 0 : _a.classList.add("hidden");
    (_b = document.getElementById("canvasGL")) === null || _b === void 0 ? void 0 : _b.classList.remove("transparent");
    setTimeout(() => { var _a; return (_a = document.querySelector(".promo")) === null || _a === void 0 ? void 0 : _a.classList.remove("transparent"); }, 4000);
    setTimeout(() => { var _a; return (_a = document.querySelector("#toggleFullscreen")) === null || _a === void 0 ? void 0 : _a.classList.remove("transparent"); }, 1800);
    const gui = new GUI$1();
    gui.add(renderer.config, "preset", { "Sunrise": 0, "Day": 1, "Sunset": 2, "Night": 3 })
        .onChange(value => renderer.changeScene(value));
    gui.add(renderer.config, "heightOffset", 0, 20);
    gui.add(renderer.config, "treesHeightOffset", 4, 15);
    gui.add(renderer.config, "grassAmount", 0, 5).step(0.1);
    gui.add(renderer.config, "fogStartDistance", 0, 150);
    gui.add(renderer.config, "fogDistance", 0, 200);
    gui.add(renderer.config, "fogHeightOffset", -5, 5);
    gui.add(renderer.config, "fogHeightMultiplier", 0, 1).step(0.01);
}
//# sourceMappingURL=index.js.map
