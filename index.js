import * as THREE from 'three';
import { GLTFLoader } from './ThreeAddons/GLTFLoader.js';
import { FirstPersonControls } from './ThreeAddons/FirstPersonControls.js';
import { EffectComposer } from './ThreeAddons/EffectComposer.js';
import { RenderPass } from './ThreeAddons/RenderPass.js';
import { GlitchPass } from './ThreeAddons/NewGlitchPass.js'
import { RenderPixelatedPass } from './ThreeAddons/RenderPixelatedPass.js';
import { UnrealBloomPass } from './ThreeAddons/UnrealBloomPass.js';
import { OutputPass } from './ThreeAddons/OutputPass.js';
import { ShaderPass } from './ThreeAddons/ShaderPass.js';
import { Howl, Howler } from 'howler';

import titanicShipUrl from './assets/Titanic_Ship.glb?url';
import titanicGroundUrl from './assets/Titanic_ground.glb?url';
import ambientSoundUrl from './assets/underwater-ambience-6201.mp3?url';

let camera, controls, scene, renderer, composer;
let distToShip;
let dirLight, ambientLight, spotLight;
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
const pointer = new THREE.Vector2();
const raycaster = new THREE.Raycaster();
const targetObject = new THREE.Object3D();
let manuverable = false;

const clock = new THREE.Clock();

// Particle system state
const PARTICLE_COUNT = 800;
const PARTICLE_BOX = 60;
let particles, particlePositions, particleVelocities;

// Anemone system state
const ANEMONE_TOTAL = 5000;
const ANEMONE_RENDER_BUDGET = 800;
let anemoneMesh, anemoneMaterial;
let allAnemoneData = [];
const frustum = new THREE.Frustum();
const projScreenMatrix = new THREE.Matrix4();
const dummy = new THREE.Object3D();
let anemoneFrameSkip = 0;

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
    ambientLight = new THREE.AmbientLight(0x404040, 0.3); // soft white light
    scene.add(ambientLight);


    // camera and render settings
    camera = new THREE.PerspectiveCamera(25, SCREEN_WIDTH / SCREEN_HEIGHT, 1, 5000);
    spotLight = new THREE.SpotLight(0xfefae0, 1, 0, Math.PI / 15, 0.1, 2);
    spotLight.position.set(0, 0, 0);
    spotLight.castShadow = true;
    spotLight.shadow.mapSize.width = 1024;
    spotLight.shadow.mapSize.height = 1024;
    spotLight.shadow.camera.near = 500;
    spotLight.shadow.camera.far = 4000;
    spotLight.shadow.camera.fov = 30;
    scene.add(targetObject);
    spotLight.target = targetObject;
    camera.add(spotLight);
    scene.add(camera);
    // these are the rendering methods
    renderer = new THREE.WebGLRenderer({ antialias: true, canvas: drawingCanvas });
    renderer.setSize(SCREEN_WIDTH, SCREEN_HEIGHT);
    composer = new EffectComposer(renderer);


    // set the position of the camera
    const randPoint = ((Math.random() - 0.5) * (Math.PI / 4) + (Math.PI * -0.25));
    const multiplier = 200;
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
    
    // Create fake AO pass
    const aoPass = createAOPass(scene, camera);
    
    const glitchPass = new GlitchPass(10);
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
    bloomPass.threshold = params.threshold;
    bloomPass.strength = params.strength;
    bloomPass.radius = params.radius;
    const outputPass = new OutputPass(THREE.ReinhardToneMapping);

    composer.addPass(renderPass);
    composer.addPass(pixelPass);
    composer.addPass(aoPass);
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
    });
    mat.reflectivity = 0;
    let mesh = new THREE.Mesh(geo, mat)
    mesh.position.set(0, 0.1, 0)
    mesh.rotation.set(Math.PI / -2, 0, 0)
    scene.add(mesh)

    // load in the model
    const loader = new GLTFLoader();
    loader.load(titanicShipUrl, function (gltf) {
        scene.add(gltf.scene);
        setupAnemones(gltf.scene);
        applyBiofouling(gltf.scene);
    }, undefined, function (error) {
        console.error(error);
    });

    loader.load(titanicGroundUrl, function (gltf) {
        gltf.scene.traverse((o) => {
            if (o.isMesh) o.material = mat;
        });
        scene.add(gltf.scene);

    }, undefined, function (error) {
        console.error(error);
    });

    window.addEventListener('resize', onWindowResize);

    // start playing the sound
    sound = new Howl({
        src: [ambientSoundUrl],
        autoplay: true,
        loop: true,
        volume: 0.5
    });

    // underwater floating particles
    setupParticles();
}

function createAOPass(scene, camera) {
    // Simple screen-space AO that darkens areas based on local depth variations
    const aoShader = {
        uniforms: {
            tDiffuse: { value: null },
            resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
            aoIntensity: { value: 0.4 },
            aoRadius: { value: 2.0 }
        },
        vertexShader: `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform sampler2D tDiffuse;
            uniform vec2 resolution;
            uniform float aoIntensity;
            uniform float aoRadius;
            varying vec2 vUv;
            
            void main() {
                vec4 color = texture2D(tDiffuse, vUv);
                
                // Simple screen-space darkening based on local color variation
                // This simulates AO by darkening areas with high contrast (edges/crevices)
                vec2 texelSize = aoRadius / resolution;
                float ao = 0.0;
                
                // Sample surrounding pixels
                float samples = 0.0;
                for (float x = -1.0; x <= 1.0; x += 1.0) {
                    for (float y = -1.0; y <= 1.0; y += 1.0) {
                        vec2 offset = vec2(x, y) * texelSize;
                        vec3 sampleColor = texture2D(tDiffuse, vUv + offset).rgb;
                        
                        // Calculate luminance difference
                        float sampleLum = dot(sampleColor, vec3(0.299, 0.587, 0.114));
                        float centerLum = dot(color.rgb, vec3(0.299, 0.587, 0.114));
                        
                        // If surrounding is darker, add to AO
                        if (sampleLum < centerLum) {
                            ao += (centerLum - sampleLum);
                        }
                        samples += 1.0;
                    }
                }
                
                ao = ao / samples;
                ao = smoothstep(0.0, 0.3, ao); // Normalize and make subtle
                
                // Darken based on AO
                color.rgb *= (1.0 - ao * aoIntensity);
                
                gl_FragColor = color;
            }
        `
    };
    
    return new ShaderPass(aoShader);
}

function setupParticles() {
    const geo = new THREE.BufferGeometry();
    particlePositions = new Float32Array(PARTICLE_COUNT * 3);
    particleVelocities = new Float32Array(PARTICLE_COUNT * 3);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
        const i3 = i * 3;
        particlePositions[i3]     = (Math.random() - 0.5) * PARTICLE_BOX;
        particlePositions[i3 + 1] = (Math.random() - 0.5) * PARTICLE_BOX;
        particlePositions[i3 + 2] = (Math.random() - 0.5) * PARTICLE_BOX;
        particleVelocities[i3]     = (Math.random() - 0.5) * 0.02;
        particleVelocities[i3 + 1] = (Math.random() - 0.5) * 0.01 + 0.005;
        particleVelocities[i3 + 2] = (Math.random() - 0.5) * 0.02;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));

    // Circular particles via shader — discard outside radius
    const mat = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
            color: { value: new THREE.Color(0xaaccff) },
            opacity: { value: 0.6 }
        },
        vertexShader: `
            void main() {
                vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                gl_PointSize = 0.1 * (300.0 / -mvPosition.z);
                gl_Position = projectionMatrix * mvPosition;
            }
        `,
        fragmentShader: `
            uniform vec3 color;
            uniform float opacity;
            void main() {
                float dist = length(gl_PointCoord - vec2(0.5));
                if (dist > 0.5) discard;
                float alpha = opacity * smoothstep(0.5, 0.2, dist);
                gl_FragColor = vec4(color, alpha);
            }
        `
    });

    particles = new THREE.Points(geo, mat);
    scene.add(particles);
}

function updateParticles() {
    if (!particles) return;
    particles.position.copy(camera.position);

    const half = PARTICLE_BOX / 2;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
        const i3 = i * 3;
        particlePositions[i3]     += particleVelocities[i3];
        particlePositions[i3 + 1] += particleVelocities[i3 + 1];
        particlePositions[i3 + 2] += particleVelocities[i3 + 2];

        for (let a = 0; a < 3; a++) {
            if (particlePositions[i3 + a] > half)  particlePositions[i3 + a] = -half;
            if (particlePositions[i3 + a] < -half) particlePositions[i3 + a] = half;
        }
    }
    particles.geometry.attributes.position.needsUpdate = true;
}

function setupAnemones(shipScene) {
    // Collect surface positions from ship meshes
    const positions = [];
    shipScene.traverse((child) => {
        if (!child.isMesh) return;
        const geo = child.geometry;
        if (!geo || !geo.attributes.position) return;

        child.updateWorldMatrix(true, false);
        const posAttr = geo.attributes.position;
        const indexAttr = geo.index;

        const vA = new THREE.Vector3(), vB = new THREE.Vector3(), vC = new THREE.Vector3();
        const triCount = indexAttr ? indexAttr.count / 3 : posAttr.count / 3;

        for (let t = 0; t < triCount; t++) {
            let iA, iB, iC;
            if (indexAttr) {
                iA = indexAttr.getX(t * 3);
                iB = indexAttr.getX(t * 3 + 1);
                iC = indexAttr.getX(t * 3 + 2);
            } else {
                iA = t * 3; iB = t * 3 + 1; iC = t * 3 + 2;
            }
            vA.fromBufferAttribute(posAttr, iA);
            vB.fromBufferAttribute(posAttr, iB);
            vC.fromBufferAttribute(posAttr, iC);

            vA.applyMatrix4(child.matrixWorld);
            vB.applyMatrix4(child.matrixWorld);
            vC.applyMatrix4(child.matrixWorld);

            positions.push({ a: vA.clone(), b: vB.clone(), c: vC.clone() });
        }
    });

    if (positions.length === 0) return;

    // Realistic deep-sea organism colors — rusticles, barnacles, tube worms
    const colors = [
        new THREE.Color(0x5C3A1E), // rusticle brown
        new THREE.Color(0x4A3728), // dark barnacle
        new THREE.Color(0x6B5B4A), // weathered hull
        new THREE.Color(0x3B4A3A), // deep algae
        new THREE.Color(0x7A6455), // pale sediment
        new THREE.Color(0x4E3E30), // dark rust
    ];

    const _normal = new THREE.Vector3();
    const _up = new THREE.Vector3(0, 1, 0);

    for (let i = 0; i < ANEMONE_TOTAL; i++) {
        const tri = positions[Math.floor(Math.random() * positions.length)];
        const r1 = Math.random(), r2 = Math.random();
        const sqrtR1 = Math.sqrt(r1);
        // Random point on triangle via barycentric coords
        const point = new THREE.Vector3()
            .addScaledVector(tri.a, 1 - sqrtR1)
            .addScaledVector(tri.b, sqrtR1 * (1 - r2))
            .addScaledVector(tri.c, sqrtR1 * r2);

        // Compute face normal — anemones stick out perpendicular to the surface
        const edge1 = new THREE.Vector3().subVectors(tri.b, tri.a);
        const edge2 = new THREE.Vector3().subVectors(tri.c, tri.a);
        _normal.crossVectors(edge1, edge2).normalize();

        // Quaternion that rotates local Y-up to face normal direction
        const rot = new THREE.Quaternion().setFromUnitVectors(_up, _normal);
        // Add random twist around the normal
        const twist = new THREE.Quaternion().setFromAxisAngle(_normal, Math.random() * Math.PI * 2);
        rot.premultiply(twist);

        const scale = 0.15 + Math.random() * 0.35;
        const color = colors[Math.floor(Math.random() * colors.length)];

        allAnemoneData.push({ pos: point, rot, scale, color });
    }

    // Small tapered cone — barnacle/rusticle shaped
    const anemoneGeo = new THREE.ConeGeometry(0.15, 0.6, 5);
    anemoneGeo.translate(0, 0.3, 0); // pivot at base

    // Shader material with subtle sway and instanced color
    anemoneMaterial = new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 0 },
            fogColor: { value: scene.fog.color },
            fogDensity: { value: scene.fog.density }
        },
        vertexShader: `
            attribute vec3 instanceColorAttr;
            varying vec3 vColor;
            varying float vFogFactor;
            uniform float time;
            uniform float fogDensity;

            void main() {
                vColor = instanceColorAttr;
                vec3 pos = position;
                // Subtle sway at the tips only
                float swayAmount = smoothstep(0.2, 0.6, position.y) * 0.05;
                float instanceOffset = float(gl_InstanceID) * 1.37;
                pos.x += sin(time * 0.5 + instanceOffset) * swayAmount;
                pos.z += cos(time * 0.4 + instanceOffset * 0.7) * swayAmount;

                vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(pos, 1.0);
                gl_Position = projectionMatrix * mvPosition;

                // Fog
                float fogDepth = length(mvPosition.xyz);
                vFogFactor = 1.0 - exp(-fogDensity * fogDensity * fogDepth * fogDepth);
            }
        `,
        fragmentShader: `
            varying vec3 vColor;
            varying float vFogFactor;
            uniform vec3 fogColor;

            void main() {
                gl_FragColor = vec4(mix(vColor, fogColor.rgb, vFogFactor), 1.0);
            }
        `
    });

    anemoneMesh = new THREE.InstancedMesh(anemoneGeo, anemoneMaterial, ANEMONE_RENDER_BUDGET);
    anemoneMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    // Set up instance color attribute
    const colorArray = new Float32Array(ANEMONE_RENDER_BUDGET * 3);
    anemoneGeo.setAttribute('instanceColorAttr', new THREE.InstancedBufferAttribute(colorArray, 3));
    anemoneMesh.count = 0;
    scene.add(anemoneMesh);
}

function updateAnemones() {
    if (!anemoneMesh || allAnemoneData.length === 0) return;

    // Only re-cull every 3 frames
    anemoneFrameSkip++;
    if (anemoneFrameSkip < 3) return;
    anemoneFrameSkip = 0;

    camera.updateMatrixWorld();
    projScreenMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    frustum.setFromProjectionMatrix(projScreenMatrix);

    const colorAttr = anemoneMesh.geometry.attributes.instanceColorAttr;
    let visibleCount = 0;

    for (let i = 0; i < allAnemoneData.length && visibleCount < ANEMONE_RENDER_BUDGET; i++) {
        const ad = allAnemoneData[i];
        if (!frustum.containsPoint(ad.pos)) continue;

        dummy.position.copy(ad.pos);
        dummy.quaternion.copy(ad.rot);
        dummy.scale.setScalar(ad.scale);
        dummy.updateMatrix();
        anemoneMesh.setMatrixAt(visibleCount, dummy.matrix);

        colorAttr.setXYZ(visibleCount, ad.color.r, ad.color.g, ad.color.b);
        visibleCount++;
    }

    anemoneMesh.count = visibleCount;
    anemoneMesh.instanceMatrix.needsUpdate = true;
    colorAttr.needsUpdate = true;
}

function applyBiofouling(shipScene) {
    // Generate a procedural noise bump texture
    const size = 256;
    const data = new Uint8Array(size * size);
    for (let i = 0; i < size * size; i++) {
        // Simple multi-frequency noise
        const x = (i % size) / size;
        const y = Math.floor(i / size) / size;
        const n1 = Math.sin(x * 47.3) * Math.cos(y * 31.7) * 0.5 + 0.5;
        const n2 = Math.sin(x * 123.4 + y * 78.9) * 0.3 + 0.5;
        const n3 = Math.random() * 0.2;
        data[i] = Math.floor((n1 * 0.4 + n2 * 0.4 + n3 * 0.2) * 255);
    }

    const bumpTex = new THREE.DataTexture(data, size, size, THREE.RedFormat);
    bumpTex.wrapS = THREE.RepeatWrapping;
    bumpTex.wrapT = THREE.RepeatWrapping;
    bumpTex.repeat.set(4, 4);
    bumpTex.needsUpdate = true;

    shipScene.traverse((child) => {
        if (!child.isMesh || !child.material) return;
        const mat = child.material;
        mat.bumpMap = bumpTex;
        mat.bumpScale = 0.3;
        // Tint slightly green/brown for algae/corrosion
        if (mat.color) {
            mat.color.lerp(new THREE.Color(0x2a3a2a), 0.15);
        }
        mat.needsUpdate = true;
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
    distToShip = Math.pow(camera.position.x, 2) + Math.pow(camera.position.y, 2) + Math.pow(camera.position.z, 2);
    if (distToShip <= 25000000 && camera.position.y > 1 && manuverable == true) {
        controls.enabled = true;
        manuveringLight.style.backgroundColor = "aquamarine"
    } else {
        controls.enabled = false;
        manuveringLight.style.backgroundColor = "Red"
    }
    controls.update(clock.getDelta());

    // update underwater particles and anemones
    updateParticles();
    updateAnemones();
    if (anemoneMaterial) {
        anemoneMaterial.uniforms.time.value = clock.getElapsedTime();
    }

    // effects and things
    composer.render();
    // update the picking ray with the camera and pointer position
    raycaster.setFromCamera(pointer, camera);
    // calculate objects intersecting the picking ray
    const intersects = raycaster.intersectObjects(scene.children);
    for (let i = 0; i < intersects.length; i++) {
        targetObject.position.set(intersects[i].point.x, intersects[i].point.y, intersects[i].point.z);
    }
}

function closeOverlay() {
    document.getElementById("overlay").style.display = "none";
    document.getElementById("instruction").style.display = "none";
}
document.getElementById("startButton").onclick = closeOverlay;

function openOverlay() {
    document.getElementById("overlay").style.display = "block";
    document.getElementById("about").style.display = "block";
}


function onPointerMove(event) {

    // calculate pointer position in normalized device coordinates
    // (-1 to +1) for both components

    pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    pointer.y = - (event.clientY / window.innerHeight) * 2 + 1;

}


window.addEventListener('pointermove', onPointerMove);
const drawingCanvas = document.getElementById("drawing");
const manuveringLight = document.getElementById("lightbar");
document.getElementById("startButton").onclick = closeOverlay;
document.getElementById("startButton2").onclick = closeOverlay;
document.getElementById("aboutBtn").onclick = openOverlay;
init();
animate();