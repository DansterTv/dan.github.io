import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import '/css/style.css';

//PosProcessing
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { FXAAShader } from "three/examples/jsm/shaders/FXAAShader.js";
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

import { LuminosityShader } from 'three/examples/jsm/shaders/LuminosityShader.js';
import { SAOPass } from 'three/examples/jsm/postprocessing/SAOPass.js';

import { CustomOutlinePass } from "./CustomOutlinePass.js";
import FindSurfaces from "./FindSurfaces.js";

//#region Elementos Escena
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x6e6e6e); // Color blanco
const camera = new THREE.PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 0.5, 500 );

const renderer = new THREE.WebGLRenderer({
    antialias:true,
    alpha:true
});

renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );
//#endregion

//#region Shaders

const composer = new EffectComposer( renderer );

const renderPass = new RenderPass( scene, camera );
composer.addPass( renderPass );

// - - - SAO - - - 
const saoPass = new SAOPass( scene, camera, true, true, new THREE.Vector2( window.innerWidth, window.innerHeight ));

saoPass['params']['output'] = SAOPass.OUTPUT.SAO
saoPass['params']['saoBias'] = 1
saoPass['params']['saoIntensity'] = .002
saoPass['params']['saoScale'] = 1
saoPass['params']['saoKernelRadius'] = 10
saoPass['params']['saoMinResolution'] = 0
saoPass['params']['saoBlur'] = false
saoPass['params']['saoBlurRadius'] = 8
saoPass['params']['saoBlurStdDev'] = 4
saoPass['params']['saoBlurDepthCutoff'] = .001

composer.addPass( saoPass );

const outputPass = new OutputPass();
composer.addPass( outputPass );

const luminosityPass = new ShaderPass( LuminosityShader );
//composer.addPass( luminosityPass );

const effectFXAA = new ShaderPass(FXAAShader);
effectFXAA.uniforms["resolution"].value.set(
  1 / window.innerWidth,
  1 / window.innerHeight
);

effectFXAA.renderToScreen = true;
composer.addPass(effectFXAA);

function animate() {
    requestAnimationFrame( animate );
    composer.render();
}

//#endregion

//#region - - - - - - - - - - Outline - - - - - - - - - - 

const customOutline = new CustomOutlinePass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  scene,
  camera
);
composer.addPass(customOutline);

// Diseño Responsivo
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
  effectFXAA.setSize(window.innerWidth, window.innerHeight);
  customOutline.setSize(window.innerWidth, window.innerHeight);

  effectFXAA.uniforms["resolution"].value.set(
    1 / window.innerWidth,
    1 / window.innerHeight
  );
}
window.addEventListener("resize", onWindowResize, false);

//#endregion

//#region Materiales

//#endregion

//#region Iluminacion
const directionalLight = new THREE.DirectionalLight( 0xffffff, 1 );

//Rotacion Luz Direccional
const angle = Math.PI / 5; // Ángulo de rotación en radianes
const radius = 2; // Radio de la órbita

const x = Math.sin(angle) * radius;
const z = Math.cos(angle) * radius;

directionalLight.position.set(x, 0, z);

scene.add( directionalLight );

const light = new THREE.AmbientLight(0x404040, 10); // soft white light
scene.add( light );

//#endregion

//#region GLTF Loader
const surfaceFinder = new FindSurfaces();
const loader = new GLTFLoader();
var objectCasa; 
var Cargo = false;

loader.load(
    'models/Mechoopad.gltf',
    ( gltf ) => {
        // called when the resource is loaded
        scene.add( gltf.scene );
        renderer.render(scene, camera)

        objectCasa = gltf.scene;

		gltf.animations; // Array<THREE.AnimationClip>
		gltf.scene; // THREE.Group
		gltf.scenes; // Array<THREE.Group>
		gltf.cameras; // Array<THREE.Camera>
		gltf.asset; // Object

        surfaceFinder.surfaceId = 0;

		console.log( `Archivo cargado` );
        Cargo = true;

        scene.traverse((node) => {
            if (node.type == "Mesh") {
              const colorsTypedArray = surfaceFinder.getSurfaceIdAttribute(node);
              node.geometry.setAttribute(
                "color",
                new THREE.BufferAttribute(colorsTypedArray, 4)
              );
            }
          });

          customOutline.updateMaxSurfaceId(surfaceFinder.surfaceId + 1);
        
    },
    ( xhr ) => {
        // called while loading is progressing
        console.log( `${( xhr.loaded / xhr.total * 100 )}% loaded` );
    },
    ( error ) => {
        // called when loading has errors
        console.error( 'An error happened', error );
    },
);
//#endregion

//#region Orbit Camara y animaciones
const controls = new OrbitControls( camera, renderer.domElement );
camera.position.set( 0, 10, 30 );
controls.update();

function animateOrbit() {

	requestAnimationFrame( animateOrbit );

	// required if controls.enableDamping or controls.autoRotate are set to true
	controls.update();

	renderer.render( scene, camera );

}

function animateLoop() {
    requestAnimationFrame( animateLoop );
    if (Cargo)
        objectCasa.rotation.y += 0.01;
}
//#endregion

//#region Detectar si WebGL es soportado por el navegador.
import WebGL from 'three/addons/capabilities/WebGL.js';

if ( WebGL.isWebGLAvailable() ) {

	// Initiate function or other initializations here
	animateOrbit();
    animate();
    //animateLoop();

} else {

	const warning = WebGL.getWebGLErrorMessage();
	document.getElementById( 'container' ).appendChild( warning );
}
//#endregion