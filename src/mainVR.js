import {
    Clock,
    Scene,
    PerspectiveCamera,
    WebGLRenderer,
    ArrowHelper,
    Vector3,
    DirectionalLight,
    Color,
    AmbientLight,
    Box3,
    BoxGeometry,
    MeshLambertMaterial,
    Group,
    GridHelper,
    Mesh,
} from 'three';
import { OrbitControls } from '../node_modules/three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from '../node_modules/three/examples/jsm/loaders/GLTFLoader.js';
import { IFCLoader } from "web-ifc-three/IFCLoader";
import { MeshUI } from './jsm/utils/MeshUI.js';
import { VRButton } from '../node_modules/three/examples/jsm/webxr/VRButton.js';
import { VRinteraction } from './jsm/controls/VRinteraction.js';
import { MeshBVHVisualizer } from 'three-mesh-bvh';
import Stats from '../node_modules/three/examples/jsm/libs/stats.module.js';


import downloadIconImage from './images/download.png';
import exampleIFCFile from './models/ifc/test.ifc';
import cabinetIFCFile from './models/ifc/cabinet.ifc';
import chairIFCFile from './models/ifc/grace.ifc';
import buildingIFCFile from './models/ifc/building.ifc';

import iconImageNewGeom from './images/newGeom.png';
import iconImageMove from './images/move.png';
import iconInspect from './images/inspect.png';

/*
This javascript initialises s scene and controls for usage in virtual reality
for desktop usage the scene and UI will look diferent 
LIMITATION! progress will be lost when switching betwen desktop and VR mode unlles i figure out how to save relavant data while in sesion
*/



document.body.setAttribute('style', 'margin: 0; overflow: hidden;');

var stats1 = new Stats();
stats1.showPanel(0); // Panel 0 = fps
stats1.domElement.style.cssText = 'position:absolute;bottom:20px;left:0px;';
document.body.appendChild(stats1.domElement);

var stats2 = new Stats();
stats2.showPanel(2); // Panel 2 = mb
stats2.domElement.style.cssText = 'position:absolute;bottom:20px;left:160px;';
document.body.appendChild(stats2.domElement);

var stats3 = new Stats();
stats3.showPanel(1); // Panel 3 = ms
stats3.domElement.style.cssText = 'position:absolute;bottom:20px;left:80px;';
document.body.appendChild(stats3.domElement);

//global varible and object declarations ****************************************************
let clock = new Clock();
let scene = new Scene();
let OverlayScene = new Scene(); //scena za elemente ki se izrisujejo nad vsemi
let camera = new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);


// setup renderer
var renderer = new WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;
renderer.autoClear = false;
document.body.appendChild(VRButton.createButton(renderer));
document.body.appendChild(renderer.domElement);
window.addEventListener('resize', onWindowResize);

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

const CameraControl = new OrbitControls(camera, renderer.domElement); CameraControl.listenToKeyEvents(window);
const gltfLoader = new GLTFLoader();
const ifcLoader = new IFCLoader();
ifcLoader.ifcManager.setWasmPath("./");
const ifc = ifcLoader.ifcManager;
let meshUI = new MeshUI(freezeCamera, unfrezeCamera);
let GUI_Group = new Group();
OverlayScene.add(meshUI.point)
let visulizeBVH = false;
let visulizers = [];
let desktopMode = false;
let desktopModeButton = undefined;
let tempVec = new Vector3();

var loadingModel = false;
var first_dblclick = true;
var enteredVRmode = true;
var saveModelsToStorage = false;

function freezeCamera() {
    CameraControl.enabled = false;
}
function unfrezeCamera() {
    CameraControl.enabled = true;
}


sceneInit(scene); //setup lighting and helper objects
//setup VR interaction controls
let VRinter = new VRinteraction(scene, camera, renderer, OverlayScene, meshUI, ifc, GUI_Group);
initUI();

let loadingFileIcon = meshUI.addSquareImageButton(0.7,"",downloadIconImage);
loadingFileIcon.set({backgroundOpacity: 0.2, borderRadius: 0.05});

function sceneInit(objectGroup) {
    objectGroup.background = new Color(0x383838);
    const directionalLight1 = new DirectionalLight(0xffeeff, 0.8);
    directionalLight1.position.set(1, 1, 1);
    objectGroup.add(directionalLight1);
    const directionalLight2 = new DirectionalLight(0xffffff, 0.8);
    directionalLight2.position.set(-1, 0.5, -1);
    objectGroup.add(directionalLight2);
    const ambientLight = new AmbientLight(0xffffee, 0.25);
    objectGroup.add(ambientLight);

    const directionalLight3 = new DirectionalLight(0xffeeff, 0.8);
    directionalLight3.position.set(1, 1, 1);
    OverlayScene.add(directionalLight3);
    const ambientLight2 = new AmbientLight(0xffffee, 1);
    OverlayScene.add(ambientLight2);

    const arrowHelperX = new ArrowHelper(new Vector3(1, 0, 0), new Vector3(0, 0, 0), 3, 0xff0000);
    const arrowHelperY = new ArrowHelper(new Vector3(0, 1, 0), new Vector3(0, 0, 0), 3, 0x00ff00);
    const arrowHelperZ = new ArrowHelper(new Vector3(0, 0, 1), new Vector3(0, 0, 0), 3, 0x0000ff);
    const grid = new GridHelper(10, 10, 0xffffff, 0xffffff);
    scene.add(grid);
    objectGroup.add(arrowHelperX);
    objectGroup.add(arrowHelperY);
    objectGroup.add(arrowHelperZ);
}

let desktopControlerSpoofer = initDesktopControlerSpoofer();
VRinter.userGroup.add(desktopControlerSpoofer);
//create buttons to switch between tools 

function renderScene(){
    if (!renderer.xr.isPresenting) {
        if(enteredVRmode == true){
            enteredVRmode = false; unfrezeCamera(); 
            if(desktopMode == false){desktopModeButton.frame.userData.OnClick();}
            //reset user position to not break the camera control
            VRinter.userGroup.position.set(0, 0, 0);
        }
        GUI_Group.visible = true;
        GUI_Group.position.copy(camera.position);
        GUI_Group.quaternion.copy(camera.quaternion);
    }else{
        if(enteredVRmode == false){
            enteredVRmode = true; freezeCamera(); 
            if(desktopMode){desktopModeButton.frame.userData.OnClick();}
        }
        GUI_Group.visible = false;
        VRinter.animate(clock);
    }
    renderer.clear();
    renderer.render(scene, camera);
    renderer.clearDepth();
    renderer.render(OverlayScene, camera); //izrisovanje nad vsemi objekti

    stats1.update();
    stats2.update();
    stats3.update();
}


let fileNumber = 0;


//prevent default behavior like opening files in the browser
;['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    renderer.domElement.addEventListener(eventName, preventDefaults, false)
})
function preventDefaults (e) {
    e.preventDefault()
    e.stopPropagation()
}

renderer.domElement.addEventListener('drageneter',()=>{console.log("dragenter")},false);
renderer.domElement.addEventListener('dragleave',()=>{console.log("dragleave hide drop file icon"); loadingFileIcon.visible = false;},false);
renderer.domElement.addEventListener('drop',handleDrop,false);
renderer.domElement.addEventListener('dragover',()=>{console.log("dragover show drop file icon"); loadingFileIcon.visible = true;},false);

function handleDrop(e) {
    console.log("droped file hide icon");
    let dt = e.dataTransfer
    let files = dt.files
  
    handleFiles(files)
}
function handleFiles(files) {
    ([...files]).forEach(uploadFile)
}

function uploadFile(file) {
    let name = file.name;
    if( name.slice(name.length - 4) == ".ifc" || name.slice(name.length - 8) == ".ifc.txt"){
        if(file.size < 5000000 || saveModelsToStorage == false){
            let reader = new FileReader()
            reader.readAsDataURL(file)
            reader.onloadend = function() {
                loadIFC(reader.result,name.slice(0,name.length - 4),fileNumber);
                console.log("loaded "+name, file.size);
            }   
        }
        else{
            alert("File ("+file.name+") too big ("+file.size+") above 5MB TODO: upload to server storage and get URL");
            loadingFileIcon.visible = false;
        }
        
    }else{ alert("not a IFC file");}

}


function loadIFC(dataURL,name,objectNum,timeout = 100) {
    try {
        if(name.length > 8){name = name.slice(0,8);}
        ifcLoader.load(dataURL, (ifcModel) => {


            let mesh = ifcModel;
            //console.log(ifcModel);
            mesh.visible = false;
            scene.add(mesh);

            if(!(sessionStorage.getItem("recent-file-image-"+objectNum))){
                //add to scene take a picture of the model and remove it from the scene
                console.log("new image");
                
                if(saveModelsToStorage) sessionStorage.setItem("recent-file-Data-URL-"+objectNum, dataURL); //store model
                sessionStorage.setItem("recent-file-name-"+objectNum, name);
                //get object image
                var width = 300;
                var height = 300;
                mesh.visible = true;
                
                camera.aspect = width / height;
                camera.updateProjectionMatrix();
                renderer.setSize(width, height);
    
                var box = new Box3()
                box.setFromObject(mesh);
                mesh.position.set(1000,10000,1000);
                var list = [];
                list.push(box.max.x);
                list.push(box.max.y);
                list.push(box.max.z);
                const max = Math.max(...list);
                camera.position.set(max*-1.2+1000, max*1.2+10000, max*-1.2+1000);
                camera.lookAt(mesh.position);
    
                setTimeout(()=>{
                    while(loadingModel){}//wait until other model is loaded
                    loadingModel = true; //block others from loading
                    renderer.render(scene, camera);
                
                    let imgData = renderer.domElement.toDataURL("image/jpeg");
                    //saveFile(imgData.replace("image/jpeg", "image/octet-stream"), "test.jpg"); //save file to disk
                    sessionStorage.setItem("recent-file-image-"+objectNum, imgData);
                    
                    mesh.visible = false;
    
                    camera.aspect = window.innerWidth / window.innerHeight;
                    camera.updateProjectionMatrix();
                    renderer.setSize(window.innerWidth , window.innerHeight);
                
                    camera.position.z = 0;
                    camera.position.y = 1.5;
                    camera.position.x = 0;
                    camera.lookAt(0, 1, -1);
                    CameraControl.target.copy({ x: 0, y: 1, z: -1 });
    
                    renderer.clear();
                    renderer.clearDepth();
                    
                    fileNumber += 1;
                    sessionStorage.setItem("fileNumber", fileNumber.toString());
                    
    
                    //update options in object spawner
                    VRinter.objectSpawnerTool.addItem({
                        text: name,
                        imageURL: imgData,
                        applayPropreties: {borderRadius: 0},
                        onClick: ()=>{
                            if(VRinter.objectSpawnerTool.selectedObject){VRinter.objectSpawnerTool.selectedObject.visible = false}
                            if(VRinter.objectSpawnerTool.selectedObject === mesh){VRinter.objectSpawnerTool.selectedObject = undefined;}else{VRinter.objectSpawnerTool.selectedObject = mesh;}
                        },
                    });
                    loadingModel = false;
                },timeout);

            }else{
                //add object to grid menu for selection
                let imgData = sessionStorage.getItem("recent-file-image-"+objectNum);
                VRinter.objectSpawnerTool.addItem({
                    text: name,
                    imageURL: imgData,
                    applayPropreties: {borderRadius: 0},
                    onClick: ()=>{
                        if(VRinter.objectSpawnerTool.selectedObject){VRinter.objectSpawnerTool.selectedObject.visible = false}
                        if(VRinter.objectSpawnerTool.selectedObject === mesh){VRinter.objectSpawnerTool.selectedObject = undefined;}else{VRinter.objectSpawnerTool.selectedObject = mesh;}
                    },
                });
            }
    
        });
        
    } catch (error) {
        console.log(error.message);
    }
    loadingFileIcon.visible = false;
}

function initDesktopControlerSpoofer(){
    let controller = new Mesh(new BoxGeometry(0.01, 0.01, 0.01), new MeshLambertMaterial({ color: 0x440066 }));
    controller.visible = false;
    
    controller.userData.squeeze = false;
    controller.userData.select = false;
    controller.userData.grippedTool = -1; //no tool is selected
    controller.userData.grippedObject = undefined;
    controller.userData.pointingAtObject = undefined;
    controller.userData.connected = true;
    controller.userData.intersectingGUI = false;

    //set binds
    window.addEventListener('mousedown', () => {VRinter.selectStartController(controller);});
    window.addEventListener('mouseup', () => {VRinter.selectEndController(controller);});
    window.addEventListener('dblclick', () => {
        if(first_dblclick){meshUI.onSelectAlternative(); first_dblclick = false;}
        else{meshUI.onReleseAlternative(); first_dblclick = true;}
    });

      

    /*window.addEventListener('squeezestart', () => {});
    window.addEventListener('squeezeend', () => {VRinter.squeezeEndController(controller);});
    window.addEventListener('selectstart', () => {VRinter.selectStartController(controller);});
    window.addEventListener('selectend', () => {VRinter.selectEndController(controller);});*/

    OverlayScene.add(controller);
    
    return controller;
}

function initUI() {
    //make ui selectable on a flat screen for quick testing by defining behavior
    renderer.domElement.addEventListener(
        'mousemove',
        (event) => {
            if(desktopControlerSpoofer){
                const mouse = {
                    x: (event.clientX / renderer.domElement.clientWidth) * 2 - 1,
                    y: -(event.clientY / renderer.domElement.clientHeight) * 2 + 1,
                };

                //emulate vr controler so we can use the same code for both desktop and vr
                VRinter.raycaster.setFromCamera(mouse, camera);
                desktopControlerSpoofer.position.copy(VRinter.raycaster.ray.origin);
                tempVec.copy(VRinter.raycaster.ray.origin); tempVec.sub(VRinter.raycaster.ray.direction);
                desktopControlerSpoofer.lookAt(tempVec);

                VRinter.cleanHiglighted(VRinter.higlightedObjects);
                VRinter.controlerGetObject(desktopControlerSpoofer,VRinter.higlightedObjects,VRinter.interactiveObjectsGroup);
                VRinter.handleToolsAnimations(desktopControlerSpoofer);
            }
        },
        false,
    );

    let menu2Handle = meshUI.createMenu(
        0.04, //handle height
        0.32, //menu height
        'OPTIONS',
        false, //is it dragable ?
        false, //does it reoient itself when moved to face ray origin
    );
    menu2Handle.position.set(0, 0.28, -0.4);
    GUI_Group.add(menu2Handle);
    
    menu2Handle.userData.menu.add(
        meshUI.addWideButton('LOAD FILE', 0.04, () => {
            console.log('open file dialog');
            // creating input on-the-fly
            var input = document.createElement("input");
            input.type = 'file';
            input.onchange = e => {
                let files = Array.from(input.files);
                console.log('load files',files);
                ([...files]).forEach(uploadFile);
            };
            input.click();
        })
    );

    menu2Handle.userData.menu.add(
        meshUI.addWideButton('LOAD CABIENT', 0.04, () => {
            loadIFC(cabinetIFCFile, "cabinet", fileNumber);
        }),
    );
    menu2Handle.userData.menu.add(
        meshUI.addWideButton('LOAD CHAIR', 0.04, () => {
            loadIFC(chairIFCFile, "chair", fileNumber);
        }),
    );
    menu2Handle.userData.menu.add(
        meshUI.addWideButton('LOAD BUILDING', 0.04, () => {
            loadIFC(buildingIFCFile, "building", fileNumber);
        }),
    );
    menu2Handle.userData.menu.add(
        meshUI.addWideButton('SHOW BVH', 0.04, () => {
            if(visulizeBVH == false){
                VRinter.ModelGroup.children.forEach(object => {
                    console.log(object.name);
                    let visualizer = new MeshBVHVisualizer( object, 22 );
                    scene.add( visualizer );
                    visualizer.visible = true;
                    visulizers.push(visualizer);
                });
                visulizeBVH = true;
            }else{
                visulizeBVH = false
                visulizers.forEach(visualizer => {scene.remove(visualizer);});
                visulizers = [];
            }
        },true)
    );


    

    let spawnToolHandle = meshUI.createMenu(
        0.04, //height 0.168 width
        0.001, //menu height
        'OBJECTS', //handle text if empty hide handle
        true, //is it dragable ?
        false, //does it reoient itself when moved to face ray origin
        false, //is handle atached at the bottom
        false, //does it have a drop down button
    );
    spawnToolHandle.position.set(0.367, 0.28, -0.4); spawnToolHandle.visible = false;
    GUI_Group.add(spawnToolHandle);

    let moveToolHandle = meshUI.createMenu(0.04,0.001,'MOVE',true,false,false,false);
    moveToolHandle.position.set(0.367, 0.28, -0.4); moveToolHandle.visible = false;
    GUI_Group.add(moveToolHandle);

    let toolsHandle = meshUI.createMenu(0.03,0.26,'TOOLS',true,false,false,false);
    toolsHandle.position.set(-0.367, 0.29, -0.4); toolsHandle.visible = false; toolsHandle.userData.menu.visible = true;
    toolsHandle.userData.menu.set({width: 0.096}); toolsHandle.userData.menu.position.x = 0;
    GUI_Group.add(toolsHandle);

    let toolButtons = [];

    let objectSpawnerButton = meshUI.addSquareImageButton(0.08,'',iconImageNewGeom,()=>{
        toolButtons.forEach(button => {if(button != objectSpawnerButton){button.frame.userData.on = false; button.userData.handle.visible = false; button.setState('idle');}}); //setState to idle
        if(desktopControlerSpoofer.userData.grippedTool ==  4){
            controlerSpoofferRelease();
        }else{
            controlerSpoofferRelease(); objectSpawnerButton.userData.handle.visible = true;
            desktopControlerSpoofer.userData.pointingAtObject = VRinter.objectSpawnerTool.mesh;
            controlerSpofferGrab();
        }

    },true);
    toolButtons.push(objectSpawnerButton); objectSpawnerButton.userData.handle = spawnToolHandle;
    toolsHandle.userData.menu.add(objectSpawnerButton);

    let objectManipulatorButton = meshUI.addSquareImageButton(0.08,'',iconImageMove,()=>{
        toolButtons.forEach(button => {if(button != objectManipulatorButton){button.frame.userData.on = false; button.userData.handle.visible = false; button.setState('idle');}}); //setState to idle
        if(desktopControlerSpoofer.userData.grippedTool ==  5){
            controlerSpoofferRelease();
        }else{
            controlerSpoofferRelease(); objectManipulatorButton.userData.handle.visible = true;
            desktopControlerSpoofer.userData.pointingAtObject = VRinter.objectManipulatorTool.mesh;
            controlerSpofferGrab();

        }
    },true);
    toolButtons.push(objectManipulatorButton); objectManipulatorButton.userData.handle = moveToolHandle;
    toolsHandle.userData.menu.add(objectManipulatorButton);

    
    let inspectButton = meshUI.addSquareImageButton(0.08,'',iconInspect,()=>{
        toolButtons.forEach(button => {if(button != inspectButton){button.frame.userData.on = false; button.userData.handle.visible = false; button.setState('idle');}}); //setState to idle
        if(desktopControlerSpoofer.userData.grippedTool ==  6){
            controlerSpoofferRelease();
        }else{
            controlerSpoofferRelease(); inspectButton.userData.handle.visible = true;
            desktopControlerSpoofer.userData.pointingAtObject = VRinter.inspectTool.mesh;
            controlerSpofferGrab();

        }
    },true);
    toolButtons.push(inspectButton); inspectButton.userData.handle = VRinter.inspectTool.infoWindow;
    toolsHandle.userData.menu.add(inspectButton);

    OverlayScene.add(GUI_Group);
    //camera.attach(GUI_Group);

    desktopModeButton = meshUI.addWideButton('DESKTOP MODE', 0.04, () => {
        if(desktopMode){
            controlerSpoofferRelease();
            toolButtons.forEach(button => {button.frame.userData.on = false; button.userData.handle.visible = false; button.setState('idle');}); //deselect all
            desktopMode = false; desktopModeButton.frame.userData.on = false; desktopModeButton.setState('idle');
            VRinter.userGroup.visible = true;

            spawnToolHandle.visible = false; toolsHandle.visible = false; moveToolHandle.visible = false;
            VRinter.objectSpawnerTool.toolMenuHandle.position.set(-0.14,0.05,0); 
            VRinter.objectSpawnerTool.mesh.add(VRinter.objectSpawnerTool.toolMenuHandle);

            VRinter.objectManipulatorTool.toolMenuHandle.position.set(-0.14,0.05,0); 
            VRinter.objectManipulatorTool.mesh.add(VRinter.objectManipulatorTool.toolMenuHandle);
        }else{
            VRinter.objectSpawnerTool.toolMenuHandle.position.set(0,0,0); //VRinter.objectSpawnerTool.toolMenuHandle.quaternion.set(0,0,0,1);
            spawnToolHandle.add(VRinter.objectSpawnerTool.toolMenuHandle);
             
            VRinter.objectManipulatorTool.toolMenuHandle.position.set(0,0,0); //VRinter.objectSpawnerTool.toolMenuHandle.quaternion.set(0,0,0,1);
            moveToolHandle.add(VRinter.objectManipulatorTool.toolMenuHandle);
            
            toolsHandle.visible = true;
            VRinter.userGroup.visible = false;
            desktopMode = true; desktopModeButton.frame.userData.on = true; desktopModeButton.setState('pressed');
        }
        //rip menus from tool handles and insert them to new handles
        //return menus back to original position and handle
        //hide or disable enter VR button
    },true)
    menu2Handle.userData.menu.add(desktopModeButton);

    menu2Handle.userData.menu.add(meshUI.addWideButton('SAVE MODEL', 0.04, () => {
        if(saveModelsToStorage){saveModelsToStorage = false;}else{saveModelsToStorage = true;}
    },true));

    menu2Handle.userData.menu.visible = true;

    ThreeMeshUI.update();
}

function controlerSpoofferRelease(){
    desktopControlerSpoofer.userData.squeeze = false;
    VRinter.hideHelperItems(desktopControlerSpoofer); //hides relevant items
    if(desktopControlerSpoofer.userData.grippedObject)if(desktopControlerSpoofer.userData.grippedObject.userData.UI)desktopControlerSpoofer.userData.grippedObject.userData.UI.userData.menu.visible = false;
    VRinter.controlerReleseObject(desktopControlerSpoofer);
}

function controlerSpofferGrab(){
    desktopControlerSpoofer.userData.squeeze = true;
    VRinter.gripObject(desktopControlerSpoofer);
    if(desktopControlerSpoofer.userData.grippedObject)if(desktopControlerSpoofer.userData.grippedObject.userData.UI)desktopControlerSpoofer.userData.grippedObject.userData.UI.userData.menu.visible = true;
}


document.addEventListener("DOMContentLoaded", ()=>{

    loadingFileIcon.position.set(0,0,-1);
    loadingFileIcon.visible = false;
    GUI_Group.add(loadingFileIcon);

    loadingModel = false;
    fileNumber = parseInt(sessionStorage.getItem("fileNumber"));
    if(!(fileNumber)){
        fileNumber = 0;
        //add models to selection
        sessionStorage.setItem("recent-file-Data-URL-"+fileNumber, exampleIFCFile); //store
        sessionStorage.setItem("recent-file-name-"+fileNumber, "test");
        fileNumber += 1;

        
    }
    if(fileNumber > 0){
        console.log("fileNumber",fileNumber);
        for(let i = 0; i < fileNumber; i++){
            let name = sessionStorage.getItem("recent-file-name-"+i);
            let fileDataURL = sessionStorage.getItem("recent-file-Data-URL-"+i);
            loadIFC(fileDataURL,name,i);
        }
    }

    camera.position.z = 0;
    camera.position.y = 1.5;
    camera.position.x = 0;
    camera.lookAt(0, 1, -1);
    CameraControl.target.copy({ x: 0, y: 1, z: -1 });

    //setup program loop
    renderer.setAnimationLoop(()=>{
        renderScene();
    });
    setTimeout(()=>{VRinter.objectSpawnerTool.container.userData.update();},1000);

});


