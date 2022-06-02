import {
    Clock,
    Scene,
    PerspectiveCamera,
    OrthographicCamera,
    WebGLRenderer,
    ArrowHelper,
    Vector3,
    DirectionalLight,
    Color,
    AmbientLight,
    Group,
    Raycaster,
    Matrix4,
    Mesh,
    BoxGeometry,
    Quaternion,
    MeshLambertMaterial,
    MeshPhongMaterial,
} from 'three';
import { OrbitControls } from '../node_modules/three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from '../node_modules/three/examples/jsm/controls/TransformControls.js';
import { GLTFLoader } from '../node_modules/three/examples/jsm/loaders/GLTFLoader.js';
import InfiniteGridHelper from './jsm/utils/infiniteGridHelper.js';
import {IFCLoader} from "web-ifc-three/IFCLoader";
import { MeshUI } from './jsm/utils/MeshUI.js';

document.body.setAttribute('style', 'margin: 0; overflow: hidden;');

//global varible and object declarations ****************************************************
let clock = new Clock();
let scene = new Scene();
let OverlayScene = new Scene();
let raycaster = new Raycaster();
let cameraPersp, cameraOrtho, currentCamera, CameraOrbitControl, transfromControls;
let tempMatrix = new Matrix4();
let tempVector = new Vector3();
let tempQuaternion = new Quaternion(0, 0, 0, 1);
let arrowHelper;
let userInteractiveObjects = new Group(); //vsebuje predmete ki jih lahko uporabnik postyavlja okoli sebe in se premikajo z uporabnikom
let GUI_Group = new Group();

function freezeCamera() {
    CameraOrbitControl.enabled = false;
}
function unfrezeCamera() {
    CameraOrbitControl.enabled = true;
}

let meshUI = new MeshUI(freezeCamera, unfrezeCamera);

//setup renderer
let renderer = new WebGLRenderer({ antialias: true });
renderer.autoClear = false;
const gltfLoader = new GLTFLoader();

//GUI parameters
let MouseDown = false;
let ToolMode = 0;
let ManipulatedObject; //hranimo referenco na objekt ki ga manipuliramo
let ManipulationToolFlags = 0;

function render() {

    GUI_Group.position.copy(currentCamera.position);
    GUI_Group.setRotationFromQuaternion(currentCamera.quaternion);

    meshUI.update();
    renderer.clear();
    renderer.render(scene, currentCamera);
    renderer.clearDepth();
    renderer.render(OverlayScene, currentCamera); //izrisovanje nad vsemi obejktu
}

function onWindowResize() {
    cameraPersp.aspect = window.innerWidth / window.innerHeight;
    cameraPersp.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    render();
}

function init() {
    renderer.setPixelRatio(window.devicePixelRatio);
    document.body.appendChild(renderer.domElement);

    const aspect = window.innerWidth / window.innerHeight;
    cameraPersp = new PerspectiveCamera(75, aspect, 0.1, 1000);
    cameraOrtho = new OrthographicCamera(-600 * aspect, 600 * aspect, 600, -600, 0.01, 30000);
    currentCamera = cameraPersp;

    //camera initial position
    currentCamera.position.set(0, 0, 2);
    currentCamera.lookAt(0, 0, 0);

    CameraOrbitControl = new OrbitControls(currentCamera, renderer.domElement);
    CameraOrbitControl.update();
    CameraOrbitControl.addEventListener('change', render);

    transfromControls = new TransformControls(currentCamera, renderer.domElement);
    transfromControls.addEventListener('dragging-changed', function (event) {
        CameraOrbitControl.enabled = !event.value;
    });
    scene.add(transfromControls);
    transfromControls.addEventListener('change', render);

    //scene setup
    scene.background = new Color(0xa0afa0);
    const directionalLight1 = new DirectionalLight(0xffeeff, 0.8);
    directionalLight1.position.set(1, 1, 1);
    scene.add(directionalLight1);
    const directionalLight2 = new DirectionalLight(0xffffff, 0.8);
    directionalLight2.position.set(-1, 0.5, -1);
    scene.add(directionalLight2);
    const ambientLight = new AmbientLight(0xffffee, 0.25);
    scene.add(ambientLight);

    arrowHelper = new ArrowHelper(new Vector3(1, 0, 0), new Vector3(0, 0, 0), 0.2, 0xff0000, 0.5, 0.2);
    const grid = new InfiniteGridHelper(10, 100);
    scene.add(grid);
    scene.add(arrowHelper);
    scene.add(userInteractiveObjects);

    //interactive objects
    let simpleCube = new Mesh(new BoxGeometry(1, 1, 1), new MeshLambertMaterial({ color: 0x550fff }));
    simpleCube.position.set(-1, 0.5, -2);
    userInteractiveObjects.add(simpleCube.clone());

    //GUI -------------------------------------------------------------------------------------------------------------------
    OverlayScene.add(GUI_Group);
    let menu1Handle = meshUI.createMenu(
        0.2, //handle height
        1.4, //menu height
        'OPTIONS',
        true, //is it dragable ?
        false, //does it reoient itself when moved to face ray origin
    );
    menu1Handle.position.set(2, 2, -3);
    GUI_Group.add(menu1Handle);

    //nastavimo obliko gumb in njegovo funkcionalnost

    menu1Handle.userData.menu.add(
        meshUI.addWideButton('LOAD IFC', 0.2, function () {
            loadIFC('../models/ifc/rac_advanced_sample_project.ifc');
        }),
    );

    menu1Handle.userData.menu.add(
        meshUI.addWideButton('SPAWN CUBE', 0.2, function () {
            let simpleCube = new Mesh(new BoxGeometry(1, 1, 1), new MeshLambertMaterial({ color: 0x45045f }));
            userInteractiveObjects.add(simpleCube.clone());
        }),
    );

    menu1Handle.userData.menu.add(
        meshUI.addWideButton('SWITCH MODE', 0.2, function () {
            ToolMode++;
            if (ToolMode > 2) {
                ToolMode = 0;
            }
            if (ToolMode === 0) {
                transfromControls.setMode('translate');
            }
            if (ToolMode === 1) {
                transfromControls.setMode('rotate');
            }
            if (ToolMode === 2) {
                transfromControls.setMode('scale');
            }
        }),
    );

    menu1Handle.userData.menu.add(
        meshUI.addWideButton(
            'SNAP MODE',
            0.2,
            function () {
                if (ManipulationToolFlags && 1) {
                    ManipulationToolFlags &= !1;
                    transfromControls.setTranslationSnap(null);
                    transfromControls.setRotationSnap(null);
                } else {
                    ManipulationToolFlags |= 1;
                    transfromControls.setTranslationSnap(0.2);
                    transfromControls.setRotationSnap(0.2);
                }
            },
            true,
        ),
    );

    menu1Handle.userData.menu.add(
        meshUI.addWideButton('DELETE', 0.2, function () {
            transfromControls.detach(ManipulatedObject);
            userInteractiveObjects.remove(ManipulatedObject);
            ManipulatedObject = undefined;
        }),
    );

    menu1Handle.userData.menu.add(
        meshUI.addWideButton('SWITCH TO VR', 0.2, function () {
            window.location.href = './indexVR.html';
        }),
    );

    //binding
    onWindowResize();
    window.addEventListener('resize', onWindowResize);

    //perforamnce monitor
    (function () {
        var script = document.createElement('script');
        script.onload = function () {
            var stats = new Stats();
            document.body.appendChild(stats.dom);
            requestAnimationFrame(function loop() {
                stats.update();
                requestAnimationFrame(loop);
            });
        };
        script.src = '//mrdoob.github.io/stats.js/build/stats.min.js';
        document.head.appendChild(script);
    })();
}

function onMouseMove(event) {
    const mouse = {
        x: (event.clientX / renderer.domElement.clientWidth) * 2 - 1,
        y: -(event.clientY / renderer.domElement.clientHeight) * 2 + 1,
    };

    raycaster.setFromCamera(mouse, currentCamera);
    meshUI.raycastGUIelements(raycaster, render);

    if (MouseDown) {
        return 1;
    }

    // DONT RAYCAST IF MOUSE IS BEING HELD DOWN TO AVOID FUNNY BUISSNES!
    //furter optimise raycasting by limiting selection to the closest objects

    const intersects = raycaster.intersectObjects(userInteractiveObjects.children, false);
    if (intersects.length > 0) {
        arrowHelper.visible = true;
        tempVector.copy(intersects[0].face.normal);
        tempVector.transformDirection(intersects[0].object.matrixWorld);

        arrowHelper.setDirection(tempVector);
        arrowHelper.position.copy(intersects[0].point);
        render();
    } else {
        arrowHelper.visible = false;
    }

    return 0;
}

function onMouseClick() {
    MouseDown = true;
    meshUI.onSelect(render);
}

function onMouseRelese() {
    MouseDown = false;
    meshUI.onRelese();
}

function onDoubleClick(event) {
    const mouse = {
        x: (event.clientX / renderer.domElement.clientWidth) * 2 - 1,
        y: -(event.clientY / renderer.domElement.clientHeight) * 2 + 1,
    };
    raycaster.setFromCamera(mouse, currentCamera);

    const intersects = raycaster.intersectObjects(userInteractiveObjects.children, false);
    if (intersects.length > 0) {
        const object = intersects[0].object;
        if (object === ManipulatedObject) {
            transfromControls.detach(ManipulatedObject);
            ManipulatedObject = undefined;
            return;
        }
        if (ManipulatedObject !== undefined) {
            transfromControls.detach(ManipulatedObject);
        }
        transfromControls.attach(object);
        ManipulatedObject = object;
    }
}

init();
render();

renderer.domElement.addEventListener('dblclick', onDoubleClick, false);
renderer.domElement.addEventListener('mousedown', onMouseClick, false);
renderer.domElement.addEventListener('mouseup', onMouseRelese, false);
renderer.domElement.addEventListener('mousemove', onMouseMove, false);
