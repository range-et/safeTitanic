import * as THREE from 'three';
import { GLTFLoader } from './ThreeAddons/GLTFLoader.js';
import { FirstPersonControls } from './ThreeAddons/FirstPersonControls.js';
import { EffectComposer } from './ThreeAddons/EffectComposer.js';
import { RenderPass } from './ThreeAddons/RenderPass.js';
import { GlitchPass } from './ThreeAddons/NewGlitchPass.js'
import { RenderPixelatedPass } from './ThreeAddons/RenderPixelatedPass.js';
import { UnrealBloomPass } from './ThreeAddons/UnrealBloomPass.js';
import { OutputPass } from './ThreeAddons/OutputPass.js';
import { Howl, Howler } from 'howler';

let camera, controls, scene, renderer, composer;
let dirLight, ambientLight, pointLight; 
let sound;
const MARGIN = 50;
let SCREEN_HEIGHT = window.innerHeight - MARGIN * 2;
let SCREEN_WIDTH = window.innerWidth - MARGIN * 2;
const params = {
    threshold: 0,
    strength: 0.5,
    radius: 0,
    exposure: 1
};

let manuverable = false;

const clock = new THREE.Clock();

const drawingCanvas = document.getElementById("drawing");
const manuveringLight = document.getElementById("lightbar");


init();
animate();


function init() {
    // scene settings
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0d1b2a);
    scene.fog = new THREE.FogExp2(0x0d1b2a, 0.01);

    // add lights
    /*
    dirLight = new THREE.DirectionalLight(0xffffff, 0.5);
    dirLight.position.set(- 1, 0, 1).normalize();
    scene.add(dirLight);
    */
    ambientLight = new THREE.AmbientLight(0x404040); // soft white light
    scene.add(ambientLight);


    // camera and render settings
    camera = new THREE.PerspectiveCamera(25, SCREEN_WIDTH / SCREEN_HEIGHT, 1, 5000);
    pointLight = new THREE.PointLight(0xfefae0, 0.5);
    pointLight.position.set(0, 0, 0);
    camera.add(pointLight);
    scene.add(camera);
    // these are the rendering methods
    renderer = new THREE.WebGLRenderer({ antialias: true, canvas: drawingCanvas });
    renderer.setSize(SCREEN_WIDTH, SCREEN_HEIGHT);
    composer = new EffectComposer(renderer);


    // set the position of the camera
    const randPoint = ((Math.random() - 0.5) * (Math.PI / 4) + (Math.PI * -0.25));
    const multiplier = 150;
    const xpos = Math.sin(randPoint) * multiplier;
    const zpos = Math.cos(randPoint) * multiplier;
    const ypos = 50;
    camera.position.x = xpos;
    camera.position.y = ypos;
    camera.position.z = zpos;
    camera.lookAt(0, 0, 0);

    controls = new FirstPersonControls(camera, renderer.domElement);
    controls.movementSpeed = 5;

    // add the render passes to the thing
    const renderPass = new RenderPass(scene, camera);
    const pixelPass = new RenderPixelatedPass(2, scene, camera);
    const glitchPass = new GlitchPass(10);
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
    bloomPass.threshold = params.threshold;
    bloomPass.strength = params.strength;
    bloomPass.radius = params.radius;
    const outputPass = new OutputPass(THREE.ReinhardToneMapping);

    composer.addPass(renderPass);
    composer.addPass(pixelPass);
    composer.addPass(bloomPass);
    composer.addPass(glitchPass);
    composer.addPass(outputPass);
    // add an infine plane to the scene
    let tex = new THREE.TextureLoader().load("https://upload.wikimedia.org/wikipedia/commons/c/c5/La_Oliva_-_FV-1_-_Dunas_07_ies.jpg")
    tex.anisotropy = 32
    tex.repeat.set(1000, 1000)
    tex.wrapT = THREE.RepeatWrapping
    tex.wrapS = THREE.RepeatWrapping
    let geo = new THREE.PlaneGeometry(10000, 10000);
    let mat = new THREE.MeshLambertMaterial({
        map: tex
    })
    let mesh = new THREE.Mesh(geo, mat)
    mesh.position.set(0, 0.1, 0)
    mesh.rotation.set(Math.PI / -2, 0, 0)
    scene.add(mesh)

    // load in the model
    const loader = new GLTFLoader();
    loader.load('./assets/Titanic.glb', function (gltf) {
        scene.add(gltf.scene);

    }, undefined, function (error) {
        console.error(error);
    });

    window.addEventListener('resize', onWindowResize);

    // start playing the sound 
    sound = new Howl({
        src: ['./assets/underwater-ambience-6201.mp3'],
        autoplay: true,
        loop: true,
        volume: 0.5
    });
}

function onWindowResize() {

    SCREEN_HEIGHT = window.innerHeight - (MARGIN * 2);
    SCREEN_WIDTH = window.innerWidth - (MARGIN * 2);

    camera.aspect = SCREEN_WIDTH / SCREEN_HEIGHT;
    camera.updateProjectionMatrix();

    renderer.setSize(SCREEN_WIDTH, SCREEN_HEIGHT);
    composer.setSize(SCREEN_WIDTH, SCREEN_HEIGHT);

}

document.addEventListener('keydown', (event) => {
    var code = event.code;
    // Alert the key name and key code on keydown
    if (code == "Space") {
        manuverable = true;
    }
}, false);

document.addEventListener('keyup', (event) => {
    var code = event.code;
    // Alert the key name and key code on keydown
    if (code == "Space") {
        manuverable = false;
    }
}, false);


function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
    if (manuverable == true) {
        controls.enabled = true;
        manuveringLight.style.backgroundColor = "aquamarine"
    } else {
        controls.enabled = false;
        manuveringLight.style.backgroundColor = "Red"
    }
    controls.update(clock.getDelta());
    // effects and things
    composer.render();
    pointLight.lookAt(0, 0, 0);
}