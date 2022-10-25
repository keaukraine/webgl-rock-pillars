"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const webgl_framework_1 = require("webgl-framework");
const Renderer_1 = require("./Renderer");
const FreeMovement_1 = require("./FreeMovement");
const dat_gui_1 = require("dat.gui");
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
    renderer = new Renderer_1.Renderer();
    renderer.ready = () => {
        initUI();
    };
    renderer.init("canvasGL", true);
    const canvas = document.getElementById("canvasGL");
    new FreeMovement_1.FreeMovement(renderer, {
        canvas,
        movementSpeed: 35,
        rotationSpeed: 0.006
    });
    const fullScreenUtils = new webgl_framework_1.FullScreenUtils();
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
    const gui = new dat_gui_1.GUI();
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