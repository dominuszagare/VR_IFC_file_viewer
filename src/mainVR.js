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
    MeshLambertMaterial,
    GridHelper
} from 'three';
import { OrbitControls } from './jsm/controls/OrbitControls.js';
import { GLTFLoader } from './jsm/loaders/GLTFLoader.js';
import { IFCLoader } from "web-ifc-three/IFCLoader";
import { MeshUI } from './jsm/utils/MeshUI.js';
import { VRButton } from './jsm/webxr/VRButton.js';
import { VRinteraction } from './jsm/controls/VRinteraction.js';


import downloadIconImage from './images/download.png';
import exampleIFCFile from './models/ifc/test.ifc';
import cabinetIFCFile from './models/ifc/cabinet.ifc';
import chairIFCFile from './models/ifc/grace.ifc';

/*
This javascript initialises s scene and controls for usage in virtual reality
for desktop usage the scene and UI will look diferent 
LIMITATION! progress will be lost when switching betwen desktop and VR mode unlles i figure out how to save relavant data while in sesion
*/



document.body.setAttribute('style', 'margin: 0; overflow: hidden;');

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

const CameraControl = new OrbitControls(camera, renderer.domElement);
const gltfLoader = new GLTFLoader();
const ifcLoader = new IFCLoader();
ifcLoader.ifcManager.setWasmPath("./");
const ifc = ifcLoader.ifcManager;
let meshUI = new MeshUI(freezeCamera, unfrezeCamera);
OverlayScene.add(meshUI.point)

function freezeCamera() {
    CameraControl.enabled = false;
}
function unfrezeCamera() {
    CameraControl.enabled = true;
}
//when draging items always drag them camera plane
CameraControl.addEventListener('change', () => {
    if (!renderer.xr.isPresenting) camera.getWorldPosition(meshUI.camPoz);
});

window.addEventListener('pointerdown', () => {meshUI.onSelect();});
window.addEventListener('pointerup', () => {meshUI.onRelese();});
window.addEventListener('touchstart', () => {meshUI.onSelect();});
window.addEventListener('touchend', () => {meshUI.onRelese();});

sceneInit(scene); //setup lighting and helper objects
//setup VR interaction controls
let VRinter = new VRinteraction(scene, camera, renderer, OverlayScene, meshUI);
initUI();

let loadingFileIcon = meshUI.addSquareImageButton(0.7,"",downloadIconImage);
loadingFileIcon.set({backgroundOpacity: 0.2, borderRadius: 0.05});

function sceneInit(objectGroup) {
    objectGroup.background = new Color(0xa0afa0);
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

let fileNumber = 0;
let loadedModels = [];
let counter1 = 0; 

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
        if(file.size < 5000000){
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

function highlightIFCByRay(material, model, ifcModels, raycaster, _scene) {
    const found = raycaster.intersectObjects(ifcModels)[0];
    if (found) {

        // Gets model ID
        model.id = found.object.modelID;

        // Gets Express ID
        const index = found.faceIndex;
        const geometry = found.object.geometry;
        const id = ifc.getExpressId(geometry, index);

        // Creates subset
        ifcLoader.ifcManager.createSubset({
            modelID: model.id,
            ids: [id],
            material: material,
            scene: _scene,
            removePrevious: true
        })
    } else {
        // Removes previous highlight
        ifc.removeSubset(model.id, material);
    }
}



function loadIFC(dataURL,name,objectNum,timeout = 100) {
    try {
        ifcLoader.load(dataURL, (ifcModel) => {

            let mesh = ifcModel;
            console.log(ifcModel);

            if(!(sessionStorage.getItem("recent-file-image-"+objectNum))){
                //add to scene take a picture of the model and remove it from the scene
                console.log("new image");
    
                sessionStorage.setItem("recent-file-Data-URL-"+objectNum, dataURL); //store
                sessionStorage.setItem("recent-file-name-"+objectNum, name);
                //get object image
                var width = 300;
                var height = 300;
                scene.add(mesh);
                
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
                    renderer.render(scene, camera);
                
                    let imgData = renderer.domElement.toDataURL("image/jpeg");
                    //saveFile(imgData.replace("image/jpeg", "image/octet-stream"), "test.jpg"); //save file to disk
                    sessionStorage.setItem("recent-file-image-"+objectNum, imgData);
                    
                    scene.remove(mesh);
    
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
                        onClick: ()=>{VRinter.objectSpawnerTool.selectedObject = mesh},
                    });
                },timeout);

            }else{
                //add object to grid menu for selection
                let imgData = sessionStorage.getItem("recent-file-image-"+objectNum);
                VRinter.objectSpawnerTool.addItem({
                    text: name,
                    imageURL: imgData,
                    applayPropreties: {borderRadius: 0},
                    onClick: ()=>{VRinter.objectSpawnerTool.selectedObject = mesh},
                });
            }
    
        });
        
    } catch (error) {
        console.log(error.message);
    }
    loadingFileIcon.visible = false;
}

function initUI() {
    //make ui selectable on a flat screen for quick testing by defining behavior
    renderer.domElement.addEventListener(
        'mousemove',
        (event) => {
            const mouse = {
                x: (event.clientX / renderer.domElement.clientWidth) * 2 - 1,
                y: -(event.clientY / renderer.domElement.clientHeight) * 2 + 1,
            };
            if (!renderer.xr.isPresenting) {
                VRinter.raycaster.setFromCamera(mouse, camera);
                meshUI.raycastGUIelements(VRinter.raycaster);
                return 0;
            }
            return 1;
        },
        false,
    );

    //define UI behavior
    let menu1Handle = meshUI.createMenu(
        0.1, //handle height
        0.35, //menu height
        'OPTIONS',
        true, //is it dragable ?
        true, //does it reoient itself when moved to face ray origin
    );
    //adding buttons to menus
    menu1Handle.userData.menu.add(
        meshUI.addWideButton('LOAD FILE', 0.1, () => {
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

    menu1Handle.userData.menu.add(
        meshUI.addWideButton('LOAD CABIENT', 0.1, () => {
            loadIFC(cabinetIFCFile, "cabinet", fileNumber);
        }),
    );

    menu1Handle.userData.menu.add(
        meshUI.addWideButton('LOAD CHAIR', 0.1, () => {
            loadIFC(chairIFCFile, "chair", fileNumber);
        }),
    );
    menu1Handle.position.set(1, 1.2, -1.1);

    VRinter.userGroup.add(menu1Handle);
    
    
    

    ThreeMeshUI.update();
}


document.addEventListener("DOMContentLoaded", ()=>{
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

    loadingFileIcon.position.set(0,0,-1);
    loadingFileIcon.visible = false;
    OverlayScene.add(loadingFileIcon);
    camera.attach(loadingFileIcon);

    camera.position.z = 0;
    camera.position.y = 1.5;
    camera.position.x = 0;
    camera.lookAt(0, 1, -1);
    CameraControl.target.copy({ x: 0, y: 1, z: -1 });

    //setup animation loop
    renderer.setAnimationLoop(function () {

        VRinter.animate(clock);
        renderer.clear();
        renderer.render(scene, camera);
        renderer.clearDepth();
        renderer.render(OverlayScene, camera); //izrisovanje nad vsemi objekti
    });
    setTimeout(()=>{VRinter.objectSpawnerTool.container.userData.update();},1000);

});


