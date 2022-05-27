import {
    Vector3,
    Matrix4,
    Box3,
    Mesh,
    Quaternion,
    BoxGeometry,
    IcosahedronGeometry,
    MeshToonMaterial,
    MeshStandardMaterial,
    Raycaster,
    AdditiveBlending,
    Group,
    BufferGeometry,
    BufferAttribute,
    Line,
    LineBasicMaterial,
    Object3D,
    SphereGeometry,
    Plane,
} from 'three';
import { XRControllerModelFactory } from '../webxr/XRControllerModelFactory.js';
import {IFCLoader} from "web-ifc-three/IFCLoader";
import { GLTFLoader } from '../loaders/GLTFLoader.js';
import { PainterTool } from './painterTool.js';
import { ObjectSpawner } from './objectSpawner.js';
import { TeleportTool } from './teleportTool.js';
import { ObjectManipulator } from './objectManipulator.js';
import { Utility } from '../utils/Utility.js';

import interactiveObjectsModels from '../../models/gltf/cursor.glb';


class VRinteraction {
    constructor(scene, camera, renderer, overlay, MESHUI) {
        this.tempVecP = new Vector3(0, 1, 0);
        this.tempVecP2 = new Vector3(0, 0, 0);
        this.tempVecV = new Vector3(0, 0, 0);
        this.tempVecS = new Vector3(1, 1, 1);
        this.tempVec = new Vector3(0, 0, 0);
        this.tempPoz1 = new Vector3(0, 0, 0);
        this.tempPoz2 = new Vector3(0, 0, 0);
        this.tempQuaternion = new Quaternion(0, 0, 0, 1);
        this.tempMatrix = new Matrix4();
        this.tempGeometry = new Mesh();
        this.tempBox = new Box3(); //for colision detection
        this.tempDistance = -1;

        this.groundPlane = new Plane();
        this.groundPlane.setFromNormalAndCoplanarPoint(this.tempVecP, this.tempVecP2);

        this.cameraDistance = 6;
        this.selectionDisabled = false;
        this.animateCam = false;
        this.targetCameraQuaterion = new Quaternion();

        this.selectedExpressID = null;
        this.selectedModelID = null;
        this.loadingObjectPlaceholder = new Mesh(
            new BoxGeometry(1, 1, 1),
            new MeshStandardMaterial({ color: 0x0f0f0f }),
        );

        this.ModelGroup = new Group();
        this.userGroup = new Group();
        this.userGroup.name = 'userGroup';
        this.interactiveObjectsGroup = new Group();
        this.interactiveObjectsGroup.name = 'interactiveObjectsGroup';
        this.higlightedObjects = [];

        //objects holding temp geometry until replaced with proper models
        this.obj3Dcursor = new Mesh(new BoxGeometry(0.4, 0.4, 0.4), new MeshToonMaterial({ color: 0xff0fff }));
        this.objCursorRing = new Mesh(new BoxGeometry(0.5, 0.5, 0.5), new MeshToonMaterial({ color: 0xff0fff }));
        this.objCursor = new Mesh(new BoxGeometry(0.3, 0.3, 0.3), new MeshToonMaterial({ color: 0x000fff }));

        //contain all pencil tool logic in one place
        this.pencilTool = new PainterTool(scene,this.interactiveObjectsGroup,MESHUI);
        this.teleporterTool = new TeleportTool(this.interactiveObjectsGroup,this.userGroup,this.ModelGroup,scene,MESHUI,this.groundPlane);
        this.objectSpawnerTool = new ObjectSpawner(this.ModelGroup,this.interactiveObjectsGroup,scene,MESHUI,this.groundPlane);
        this.objectManipulatorTool = new ObjectManipulator(this.ModelGroup,this.interactiveObjectsGroup,scene,MESHUI,this.groundPlane);
        //TODO make a inspect and mesuring tool

        this.yojstickToolBase = new Mesh(new BoxGeometry(0.1, 0.1, 0.1), new MeshToonMaterial({ color: 0x440066 }));
        this.yojstickToolHandle = new Mesh(new BoxGeometry(0.1, 0.1, 0.1), new MeshToonMaterial({ color: 0x660066 }));
        
        this.yojstickToolBase.name = 'yojstickBase';
        this.userGroup.add(this.yojstickToolHandle);//handle is not selectable
        this.yojstickToolHandle.position.set(0.2, 1.5, -1);
        this.yojstickToolBase.position.set(0.2, 1.5, -1);
        this.interactiveObjectsGroup.add(this.yojstickToolBase);
        this.yojstickControl = new Mesh(new SphereGeometry(0.06), new MeshToonMaterial({ color: 0x440066 }));
        this.yojstickControl.position.set(0.2, 1.6, -1);
        this.yojstickControl.name = 'yojstickControl';
        this.interactiveObjectsGroup.add(this.yojstickControl);


        this.userHeight = new Vector3(0, 2, 0);

        this.XR = renderer.xr;
        this.camera = camera;
        this.userGroup.add(camera); //camera moves with the user group
        this.dummyCam = new Object3D();
        this.camera.add(this.dummyCam); //attach a dumy object to camera to get cam orentation
        this.scene = scene;
        this.overlay = overlay; //renders over the objects in scene ment for UI and user objects
        this.raycaster = new Raycaster();
        this.ifcLoader = new IFCLoader();
        this.gltfLoader = new GLTFLoader();
        this.controllerModelFactory = new XRControllerModelFactory();
        this.utility = new Utility();
        this.meshUI = MESHUI;

        //initial setup

        this.controller1 = this.getAndinitilizeXRcontroller(0, this.userGroup);
        this.activeControler = this.controller1;
        this.controller2 = this.getAndinitilizeXRcontroller(1, this.userGroup);
        this.addControllerModelAndGrip(this.controller1, 0, this.userGroup);
        this.addControllerModelAndGrip(this.controller2, 1, this.userGroup);
        this.initLineHelper();
        this.createOverlayObjects();
        this.controlersSetBinds(this.controller1, this.controller2);

        this.renderer = renderer;
        
        setTimeout(() => { //update UI after the scene is loaded
            this.meshUI.update();
        }, 1000)
    }

    createOverlayObjects() {
        //tools and helper objects
        this.overlay.add(this.userGroup);
        this.userGroup.add(this.interactiveObjectsGroup);

        //load complex geometry first define refrences to the objects
        let teleportTool = this.teleporterTool.mesh;
        let pencilTool = this.pencilTool.mesh; //get refrence to the pencil tool model
        let locationMarker = this.teleporterTool.vrLocationMarker;
        let yojstickToolBase = this.yojstickToolBase;
        let yojstickToolHandle = this.yojstickToolHandle;
        let marker1 = this.obj3Dcursor;
        let marker2 = this.objCursorRing;
        let marker3 = this.objCursor;
        this.gltfLoader.load(interactiveObjectsModels,function (gltf) {
                teleportTool.geometry.copy(gltf.scene.children[4].geometry);
                pencilTool.geometry.copy(gltf.scene.children[5].geometry);
                locationMarker.geometry.copy(gltf.scene.children[2].geometry);
                marker1.geometry.copy(gltf.scene.children[1].geometry);
                marker2.geometry.copy(gltf.scene.children[3].geometry);
                marker3.geometry.copy(gltf.scene.children[0].geometry);
                yojstickToolBase.geometry.copy(gltf.scene.children[7].geometry);
                yojstickToolHandle.geometry.copy(gltf.scene.children[6].geometry);
            },
            undefined,
            function (error) {
                console.error(error);
            },
        );

        this.scene.add(this.ModelGroup);
        this.overlay.add(this.obj3Dcursor);
        this.overlay.add(this.objCursorRing);
        this.overlay.add(this.objCursor);
    }
    getAndinitilizeXRcontroller(num, group) {
        let controller = this.XR.getController(num);
        controller.userData.squeeze = false;
        controller.userData.select = false;
        controller.userData.grippedTool = -1; //no tool is selected
        controller.userData.grippedObject = undefined;
        controller.userData.pointingAtObject = undefined;
        group.add(controller);
        return controller;
    }
    addControllerModelAndGrip(controller, gripNum, group) {
        //function load controler model and add grip
        let controllerGrip = this.XR.getControllerGrip(gripNum);
        controllerGrip.add(this.controllerModelFactory.createControllerModel(controllerGrip));
        controller.userData.grip = controllerGrip; //test if this works for referencing grip object
        group.add(controllerGrip);
    }
    initLineHelper() {
        //pointer line helpers
        let line = new Line(new BufferGeometry().setFromPoints([new Vector3(0, 0, 0), new Vector3(0, 0, -1)]));
        line.name = 'line';
        line.scale.z = 1;
        this.controller1.add(line.clone());
        this.controller2.add(line.clone());
    }

    controlersSetBinds(controller1, controller2) {
        controller1.addEventListener('squeezestart', () => {
            this.squeezeStartController(controller1);
        });
        controller1.addEventListener('squeezeend', () => {
            this.squeezeEndController(controller1);
        });
        controller1.addEventListener('selectstart', () => {
            this.selectStartController(controller1);
        });
        controller1.addEventListener('selectend', () => {
            this.selectEndController(controller1);
        });
        controller2.addEventListener('squeezestart', () => {
            this.squeezeStartController(controller2);
        });
        controller2.addEventListener('squeezeend', () => {
            this.squeezeEndController(controller2);
        });
        controller2.addEventListener('selectstart', () => {
            this.selectStartController(controller2);
        });
        controller2.addEventListener('selectend', () => {
            this.selectEndController(controller2);
        });
    }
    squeezeStartController(controller) {
        controller.userData.squeeze = true;
        this.gripObject(controller);
        if (this.activeControler == controller) {
            this.meshUI.onSelectAlternative(); //<--preform button alternative function if howering over one
        }
        //switch active controller
        if (controller.userData.grippedObject == undefined) {
            this.activeControler = controller;
        } else {
            if (controller == this.controller1) this.activeControler = this.controller2;
            if (controller == this.controller2) this.activeControler = this.controller1;
        }

    }
    squeezeEndController(controller) {
        controller.userData.squeeze = false;
        this.hideHelperItems(controller); //hides relevant items
        this.controlerReleseObject(controller);
    }
    selectStartController(controller) {
        controller.userData.select = true;
        if (controller.userData.grippedObject != undefined) {
            this.toolActionOnSelect(controller);
        }
        if (this.activeControler == controller) {
            this.meshUI.onSelect(); //<--preform button function if howering over one
        }
        //switch active controller
        if (controller.userData.grippedObject == undefined) {
            this.activeControler = controller;
        } else {
            if (controller == this.controller1) this.activeControler = this.controller2;
            if (controller == this.controller2) this.activeControler = this.controller1;
        }
    }
    selectEndController(controller) {
        controller.userData.select = false;
        if (this.activeControler == controller) {
            this.meshUI.onRelese();
        }
        if (controller.userData.grippedObject != undefined) {
            this.toolActionOnSelectEnd(controller);
        }

    }

    onControllerSelectRelease(controller) {
        //!Cant grab anything outside the interactiveObjectsGroup. So after relese always return it to the interactiveObjectsGroup
        if (controller.userData.grippedObject != undefined) {
            let object = controller.userData.grippedObject;
            console.log(object);
        }
    }
    
    gripObject(controller) {
        //check if object can be grabed
        //const found = this.ControllerGetObjects(controller,this.interactiveObjectsGroup);
        let object = controller.userData.pointingAtObject;
        if (object != undefined) {

            object.userData.returnTo = undefined;
            controller.userData.grippedObject = object;
            switch (object.name) {
                case 'teleporter':
                    object.userData.returnTo = object.parent; //save parent
                    object.setRotationFromQuaternion(controller.getWorldQuaternion(this.tempQuaternion));
                    this.tempQuaternion.copy(this.userGroup.quaternion);
                    object.applyQuaternion(this.tempQuaternion.invert()); //rotate to aling with local cordinates
                    object.position.copy(controller.position);
                    controller.attach(object);
                    controller.userData.grippedTool = 0;
                    break;
                case 'pencil':
                    object.userData.returnTo = object.parent; //save parent
                    object.setRotationFromQuaternion(controller.getWorldQuaternion(this.tempQuaternion));
                    this.tempQuaternion.copy(this.userGroup.quaternion);
                    object.applyQuaternion(this.tempQuaternion.invert()); //rotate to aling with local cordinates
                    object.position.copy(controller.position);
                    controller.attach(object);
                    controller.userData.grippedTool = 1;
                    break;
                case 'yojstickBase':
                    object.position.copy(controller.position);
                    object.userData.returnTo = object.parent; //save parent
                    this.yojstickControl.position.copy(this.yojstickToolBase.position);
                    this.yojstickControl.position.y += 0.1;
                    controller.attach(object);
                    controller.attach(this.yojstickControl);
                    controller.userData.grippedTool = 2;
                    break;
                case 'yojstickControl':
                    controller.getWorldPosition(this.tempVecP);
                    object.getWorldPosition(this.tempVecP2);
                    this.tempVecP.sub(this.tempVecP2);
                    if(this.tempVecP.length() < 0.06){
                        object.position.copy(controller.position);
                        object.userData.returnTo = object.parent; //save parent
                        controller.attach(object);
                        controller.userData.grippedTool = 3;
                    }
                    break;
                case 'objectSpawner':
                    object.userData.returnTo = object.parent; //save parent
                    object.setRotationFromQuaternion(controller.getWorldQuaternion(this.tempQuaternion));
                    this.tempQuaternion.copy(this.userGroup.quaternion);
                    object.applyQuaternion(this.tempQuaternion.invert()); //rotate to aling with local cordinates
                    object.position.copy(controller.position);
                    
                    controller.attach(object);
                    controller.userData.grippedTool = 4;
                    break;
                case 'objectManipulator':
                    object.userData.returnTo = object.parent; //save parent
                    object.setRotationFromQuaternion(controller.getWorldQuaternion(this.tempQuaternion));
                    this.tempQuaternion.copy(this.userGroup.quaternion);
                    object.applyQuaternion(this.tempQuaternion.invert()); //rotate to aling with local cordinates
                    object.position.copy(controller.position);
                    controller.attach(object);
                    controller.userData.grippedTool = 5;
                    break;

            
                default:
                    break;
            }

            this.showHelperItmes(controller); //show relavant intems depending on context

        }
        //console.log(controller); <--checking what data controler object holds
    }

    showHelperItmes(controller) {
        //glede na oporabljeno orodje prikazi dolocene objekte menije ...
        if (controller.userData.grippedTool == 0) {
            this.teleporterTool.toolShowHelperItems();
        }
        if(controller.userData.grippedTool == 5){
            this.objectManipulatorTool.toolShowHelperItems();
        }
    }
    hideHelperItems(controller) {
        if (controller.userData.grippedTool == 0) {
            this.teleporterTool.toolHideHelperItems();
        }
        if (controller.userData.grippedTool == 4) {
            this.objectSpawnerTool.toolHideHelperItems();
        }
        if (controller.userData.grippedTool == 5) {
            this.objectManipulatorTool.toolHideHelperItems();
        }
    }

    controlerReleseObject(controller) {
        if (controller.userData.grippedObject !== undefined) {
            const object = controller.userData.grippedObject;
            const parent = object.userData.returnTo;

            if(parent)parent.attach(object); //release object back to its parent
            controller.userData.grippedObject = undefined; //clear object
            controller.userData.grippedTool = -1;

            if(object.name === "yojstickControl" || object.name === "yojstickBase"){
                if(parent)parent.attach(this.yojstickControl);
                this.yojstickControl.position.copy(this.yojstickToolBase.position);
                this.yojstickControl.position.y += 0.1;
            }
        }
    }
    //TODO snap elevation of teleport marker to local geometry and test
    toolActionOnSelect(controller) {
        //initial action when main button is pressed
        if (controller.userData.grippedTool == 0) {
            this.teleporterTool.toolAction();
        } else if (controller.userData.grippedTool == 1) {
            this.pencilTool.updatePivotPosition();
        } else if (controller.userData.grippedTool == 2) {
            this.yojstickToolBase.updatePivotPosition();
            this.yojstickControl.updatePivotPosition();
        } else if (controller.userData.grippedTool == 4) {
            this.objectSpawnerTool.toolAction();
        } else if (controller.userData.grippedTool == 5) {
            this.objectManipulatorTool.toolAction();
        }
    }
    toolActionOnSelectEnd(controller) {
        if (controller.userData.grippedTool == 1) { //when finishing a stroke
            this.pencilTool.toolActionEnd();
        }
    }
    handleToolsAnimations(controller) {
        //will execute each frame (be cerful to not perform expensive operations)
        if (controller.userData.grippedTool == 1 && controller.userData.select) {//when controler triger is pressed and pencil is gripped
            this.pencilTool.toolAction();
        } else if (controller.userData.grippedTool == 0) { //when griping teleporter recalculate the arc
            this.teleporterTool.toolAnimation(controller);
        }
        else if(controller.userData.grippedTool === 3){//when griping yojstick control
            //if distance is to large release the object
            controller.getWorldPosition(this.tempVecP);
            this.yojstickToolBase.getWorldPosition(this.tempVecP2);
            this.tempVecP.sub(this.tempVecP2);
            if(this.tempVecP.length() > 0.5){
                this.controlerReleseObject(controller);
            }
            else{
                this.tempVecP.y = 0;
                //TODO create sensitivity setting for yojstick
                this.userGroup.position.add(this.tempVecP); //move the user group to the yojstick control
            }
        } else if(controller.userData.grippedTool === 2){//when griping yojstick base
            this.yojstickToolHandle.position.copy(controller.position);
        } else if (controller.userData.grippedTool == 4) {
            this.objectSpawnerTool.toolAnimation(controller);
        } else if (controller.userData.grippedTool == 5) {
            this.objectManipulatorTool.toolAnimation(controller);
        }
    }

    controlerCheckColision(controller,group){ 
        let colision = [];
        for (const child of group.children) { //ceck if the controller is inside the sphere of influance
            controller.getWorldPosition(this.tempVecP);
            child.getWorldPosition(this.tempVecP2);
            this.tempVecP.sub(this.tempVecP2);
            if(this.tempVecP.length() < 0.06){colision.push({ object: child, distance: 0.001 }); return colision;}
        }

        return colision;
    }
    //shoots a ray from a controler and checks if it intersects any interactive objects also checks if the tip of the controler is touching the object
    controlerGetObject(controller, higlightedObjects, group) {
        //show that object can be interacted with by changing its collor when its being pointed at
        if (controller.userData.grippedObject !== undefined) return;
        const line = controller.getObjectByName('line');
        let found = this.controlerCheckColision(controller,group);
        
        if (found.length === 0 && controller === this.activeControler) { //if not enoraching on any object try raycasting
            this.tempMatrix.identity().extractRotation(controller.matrixWorld); //shoot a ray from a controller and find if it intersacts with a interactable object
            this.raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
            this.raycaster.ray.direction.set(0, 0, -1).applyMatrix4(this.tempMatrix);

            this.meshUI.raycastGUIelements(this.raycaster); //check if the raycast hits any gui elements

            found = this.raycaster.intersectObjects(group.children, false); //do not use recursion to check for children of group.children
        }

        if (found.length > 0) {

            const intersection = found[0];
            const object = intersection.object;
            controller.userData.pointingAtObject = object;
            if(object.material.emissive){
                object.material.emissive.r = 1; //TODO change to a method that gives objects a white contur 
                higlightedObjects.push(object);
            }
            line.scale.z = intersection.distance;
            return intersection;
        } else if (this.activeControler !== controller) {
            line.scale.z = 0.1;
            controller.userData.pointingAtObject = undefined;
        } else {
            line.scale.z = 5;
            controller.userData.pointingAtObject = undefined;
        }


        
    }

    cleanHiglighted(higlightedObjects) {
        //remove changes to material
        while (higlightedObjects.length) {
            const object = higlightedObjects.pop();
            object.material.emissive.r = 0;
            object.material.emissive.b = 0;
        }
    }

    animate(clock) {

        if (this.renderer.xr.isPresenting) {
            this.cleanHiglighted(this.higlightedObjects);
            this.controlerGetObject(this.controller1, this.higlightedObjects, this.interactiveObjectsGroup);
            this.controlerGetObject(this.controller2, this.higlightedObjects, this.interactiveObjectsGroup);

            this.handleToolsAnimations(this.controller1);
            this.handleToolsAnimations(this.controller2);
        }

        const delta = clock.getDelta();
        let camera = this.camera;
        if (this.loadingObjectPlaceholder.visible) {
            this.loadingObjectPlaceholder.rotation.x += delta * 0.5;
            this.loadingObjectPlaceholder.rotation.y += delta * 0.2;
            this.tempVecS.set(this.cameraDistance / 30, this.cameraDistance / 30, this.cameraDistance / 30);
            this.loadingObjectPlaceholder.scale.copy(this.tempVecS);
        }
        this.cameraDistance = camera.position.distanceTo(this.obj3Dcursor.position);
        this.objCursorRing.scale.copy(this.tempVecS);
        this.objCursor.scale.copy(this.tempVecS);
        this.objCursor.lookAt(camera.position);
        this.tempVecS.set(this.cameraDistance / 60, this.cameraDistance / 60, this.cameraDistance / 60);
        this.obj3Dcursor.scale.copy(this.tempVecS);
        this.objCursorRing.lookAt(camera.position);

        if (this.animateCam) {
            if (camera.quaternion.equals(this.targetCameraQuaterion)) {
                this.animateCam = false;
            }
            const step = 8 * delta;
            camera.quaternion.rotateTowards(this.targetCameraQuaterion, step);
        }
    }
}
export { VRinteraction };
