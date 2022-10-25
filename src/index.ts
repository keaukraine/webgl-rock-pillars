import { FullScreenUtils } from "webgl-framework";
import { Renderer } from "./Renderer";
import { FreeMovement } from "./FreeMovement";
import { GUI } from 'dat.gui'

function ready(fn: () => void) {
    if (document.readyState !== "loading") {
        fn();
    } else {
        document.addEventListener("DOMContentLoaded", fn);
    }
}


let renderer: Renderer;

ready(() => {
    renderer = new Renderer();
    renderer.ready = () => {
        initUI();
    };
    renderer.init("canvasGL", true);
    const canvas = document.getElementById("canvasGL")!;
    new FreeMovement(
        renderer,
        {
            canvas,
            movementSpeed: 35,
            rotationSpeed: 0.006
        }
    );

    const fullScreenUtils = new FullScreenUtils();

    const toggleFullscreenElement = document.getElementById("toggleFullscreen")!;
    toggleFullscreenElement.addEventListener("click", () => {
        if (document.body.classList.contains("fs")) {
            fullScreenUtils.exitFullScreen();
        } else {
            fullScreenUtils.enterFullScreen();
        }
        fullScreenUtils.addFullScreenListener(function () {
            if (fullScreenUtils.isFullScreen()) {
                document.body.classList.add("fs");
            } else {
                document.body.classList.remove("fs");
            }
        });
    });
});

function initUI(): void {
    document.getElementById("message")?.classList.add("hidden");
    document.getElementById("canvasGL")?.classList.remove("transparent");
    setTimeout(() => document.querySelector(".promo")?.classList.remove("transparent"), 4000);
    setTimeout(() => document.querySelector("#toggleFullscreen")?.classList.remove("transparent"), 1800);

    const gui = new GUI();

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
