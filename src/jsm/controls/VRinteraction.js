import {
    Vector3,
    Matrix4,
    Box3,
    Mesh,
    Quaternion,
    BoxGeometry,
    IcosahedronGeometry,
    MeshLambertMaterial,
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
import { XRControllerModelFactory } from '../../../node_modules/three/examples/jsm/webxr/XRControllerModelFactory.js';
import { XRHandModelFactory } from '../../../node_modules/three/examples/jsm/webxr/XRHandModelFactory.js';
import {IFCLoader} from "web-ifc-three/IFCLoader";
import { GLTFLoader } from '../../../node_modules/three/examples/jsm/loaders/GLTFLoader.js';
import { PainterTool } from './painterTool.js';
import { ObjectSpawner } from './objectSpawner.js';
import { TeleportTool } from './teleportTool.js';
import { ObjectManipulator } from './objectManipulator.js';

import interactiveObjectsModels from '../../models/gltf/cursor.glb';
import { Sphere } from 'three';
import { InspectTool } from './inspectTool.js';


class VRinteraction {
    constructor(scene, camera, renderer, overlay, MESHUI, ifc) {
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
        //this.obj3Dcursor = new Mesh(new BoxGeometry(0.4, 0.4, 0.4), new MeshLambertMaterial({ color: 0xff0fff }));
        //this.objCursorRing = new Mesh(new BoxGeometry(0.5, 0.5, 0.5), new MeshLambertMaterial({ color: 0xff0fff }));
        //this.objCursor = new Mesh(new BoxGeometry(0.3, 0.3, 0.3), new MeshLambertMaterial({ color: 0x000fff }));

        //contain all pencil tool logic in one place
        this.pencilTool = new PainterTool(scene,this.interactiveObjectsGroup,MESHUI);
        this.teleporterTool = new TeleportTool(this.interactiveObjectsGroup,this.userGroup,this.ModelGroup,overlay,MESHUI,this.groundPlane);
        this.objectSpawnerTool = new ObjectSpawner(this.ModelGroup,this.interactiveObjectsGroup,scene,MESHUI,this.groundPlane, overlay);
        this.objectManipulatorTool = new ObjectManipulator(this.ModelGroup,this.interactiveObjectsGroup,scene,MESHUI,this.groundPlane, overlay);
        this.inspectTool = new InspectTool(scene,this.interactiveObjectsGroup,this.ModelGroup,MESHUI,ifc,overlay);
        //TODO make a inspect and mesuring tool

        this.yojstickToolBase = new Mesh(new BoxGeometry(0.1, 0.1, 0.1), new MeshLambertMaterial({ color: 0x440066 }));
        this.yojstickToolHandle = new Mesh(new BoxGeometry(0.1, 0.1, 0.1), new MeshLambertMaterial({ color: 0x660066 }));
        
        this.yojstickToolBase.name = 'yojstickBase';
        this.userGroup.add(this.yojstickToolHandle);//handle is not selectable
        this.yojstickToolHandle.position.set(0.2, 0.8, -0.8);
        this.yojstickToolBase.position.set(0.2, 0.8, -0.8);
        this.interactiveObjectsGroup.add(this.yojstickToolBase);
        this.yojstickControl = new Mesh(new SphereGeometry(0.06), new MeshLambertMaterial({ color: 0x440066 }));
        this.yojstickControl.position.set(0.2, 0.9, -0.8);
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
        this.handModelFactory = new XRHandModelFactory();
        this.meshUI = MESHUI;

        //initial setup
        this.controller1 = this.getAndinitilizeXRcontroller(0, this.userGroup);
        this.activeControler = this.controller1;
        this.controller2 = this.getAndinitilizeXRcontroller(1, this.userGroup);

        this.hand1 = this.getAndinitilizeXRhand(0, this.userGroup)
        this.hand2 = this.getAndinitilizeXRhand(1, this.userGroup)
        
        this.initControlersHelpers();
        this.createOverlayObjects();

        this.renderer = renderer;
        
        setTimeout(() => { //update UI after the scene is loaded
            this.meshUI.update();
        }, 2000)
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
        //let marker1 = this.obj3Dcursor;
        //let marker2 = this.objCursorRing;
        //let marker3 = this.objCursor;
        this.gltfLoader.load(interactiveObjectsModels,function (gltf) {
                teleportTool.geometry.copy(gltf.scene.children[4].geometry);
                pencilTool.geometry.copy(gltf.scene.children[5].geometry);
                locationMarker.geometry.copy(gltf.scene.children[2].geometry);
                //marker1.geometry.copy(gltf.scene.children[1].geometry);
                //marker2.geometry.copy(gltf.scene.children[3].geometry);
                //marker3.geometry.copy(gltf.scene.children[0].geometry);
                yojstickToolBase.geometry.copy(gltf.scene.children[7].geometry);
                yojstickToolHandle.geometry.copy(gltf.scene.children[6].geometry);
            },
            undefined,
            function (error) {
                console.error(error);
            },
        );

        this.scene.add(this.ModelGroup);
        //this.overlay.add(this.obj3Dcursor);
        //this.overlay.add(this.objCursorRing);
        //this.overlay.add(this.objCursor);
    }


    getAndinitilizeXRhand(num, group){
        let handModel = this.XR.getHand( num ); //skeleton of a hand
        console.log(handModel);
        handModel.add(this.handModelFactory.createHandModel( handModel));

        let hand = new Mesh(new IcosahedronGeometry(0.015), new MeshLambertMaterial({ color: 0x00ff00 }));
        handModel.add(hand);
        hand.visible = true;
        hand.userData.handModel = handModel; //add refrence to the hand model
        hand.userData.quaternionSum = new Quaternion(0,0,0);
        hand.userData.quaternionArray = [];
        hand.userData.quaternionIndex = 0;

        hand.userData.num = num;
        hand.userData.pointing = false; //pointer finger not curled into the hand with other fingers
        hand.userData.squeeze = false; //all fingers curled into the hand
        hand.userData.select = false; //fingers pinched together
        hand.userData.grippedTool = -1; //no tool is selected
        hand.userData.grippedObject = undefined;
        hand.userData.pointingAtObject = undefined;
        hand.userData.pressedObject = undefined; //pointer finger is intersecting with an object
        hand.userData.connected = true;
        hand.userData.selectCooldown = false;
        hand.userData.squeezeCooldown = false;
        hand.userData.intersectingGUI = false;

        group.add(handModel);
        return hand;
    }

    checkForHandActions(hand){
        if(hand.userData.connected == false){
            return;
        }
        if(!hand.userData.handModel.joints[ 'index-finger-tip' ]){
            return;
        }
        this.controller1.userData.connected = false; this.controller1.visible = false;
        this.controller2.userData.connected = false; this.controller2.visible = false;
        
        //console.log(hand);
        const indexTip = hand.userData.handModel.joints[ 'index-finger-tip' ];
        const indexPalm = hand.userData.handModel.joints[ 'index-finger-metacarpal' ];
        const middleTip = hand.userData.handModel.joints[ 'middle-finger-tip' ];
        const middlePalm = hand.userData.handModel.joints[ 'middle-finger-metacarpal' ];
        const ringTip = hand.userData.handModel.joints[ 'ring-finger-tip' ];
        const ringPalm = hand.userData.handModel.joints[ 'ring-finger-metacarpal' ];
        const pinkyTip = hand.userData.handModel.joints[ 'pinky-finger-tip' ];
        const pinkyPalm = hand.userData.handModel.joints[ 'pinky-finger-metacarpal' ];
        const thumbTip = hand.userData.handModel.joints[ 'thumb-tip' ];
        const indexIntermidiate = hand.userData.handModel.joints[ 'index-finger-phalanx-intermediate'];
        const middleIntermidiate = hand.userData.handModel.joints[ 'middle-finger-phalanx-intermediate'];


		const distanceIndex = indexTip.position.distanceTo( indexPalm.position);
        const distanceMiddle = middleTip.position.distanceTo( middlePalm.position );
        const distanceRing = ringTip.position.distanceTo( ringPalm.position );
        const distancePinky = pinkyTip.position.distanceTo( pinkyPalm.position);
        const distancePinch = thumbTip.position.distanceTo( indexTip.position);
        const distanceThumbTrigger = thumbTip.position.distanceTo( indexIntermidiate.position);
        //const distanceTrigger2 = 1;//thumbTip.position.distanceTo( middleIntermidiate.position);

        if(distanceMiddle < 0.05 && distanceRing < 0.05 && distancePinky < 0.05 && distanceIndex > 0.1){
            hand.userData.pointing = true;
        }else{   
            hand.userData.pointing = false;
        }
        hand.userData.quaternionSum.x += indexPalm.quaternion.x;
        hand.userData.quaternionSum.y += indexPalm.quaternion.y; 
        hand.userData.quaternionSum.z += indexPalm.quaternion.z;
        hand.userData.quaternionSum.w += indexPalm.quaternion.w;

        if(hand.userData.quaternionArray[hand.userData.quaternionIndex]){
            hand.userData.quaternionArray[hand.userData.quaternionIndex].copy(indexPalm.quaternion);
        }else{
            hand.userData.quaternionArray.push(indexPalm.quaternion.clone());
        }


        hand.position.copy(indexPalm.position); //update hand position to match the model

        hand.userData.quaternionIndex += 1;
        if(hand.userData.quaternionIndex > 10){
            hand.userData.quaternionIndex = 0;
        }
        if(hand.userData.quaternionArray[hand.userData.quaternionIndex]){
            hand.userData.quaternionSum.x -= hand.userData.quaternionArray[hand.userData.quaternionIndex].x;
            hand.userData.quaternionSum.y -= hand.userData.quaternionArray[hand.userData.quaternionIndex].y;
            hand.userData.quaternionSum.z -= hand.userData.quaternionArray[hand.userData.quaternionIndex].z;
            hand.userData.quaternionSum.w -= hand.userData.quaternionArray[hand.userData.quaternionIndex].w;
        }

        hand.quaternion.set(hand.userData.quaternionSum.x/10,hand.userData.quaternionSum.y/10,hand.userData.quaternionSum.z/10,hand.userData.quaternionSum.w/10);
        if(hand.userData.num == 0){ //right hand
            hand.translateZ(-0.13);
            hand.translateX(-0.01);
            hand.translateY(-0.01);
            hand.rotateZ(Math.PI/-2);
            hand.rotateX(Math.PI/-6);
        }else{
            hand.translateZ(-0.13);
            hand.translateX(0.01);
            hand.translateY(-0.01);
            hand.rotateZ(Math.PI/2);
            hand.rotateX(Math.PI/-6);
        }
         //rotate hand to match the model
        //hand.rotateX(-Math.PI/4);

        //grab action
        if(hand.userData.squeeze == false && distanceMiddle < 0.05 && distanceRing < 0.05 && distancePinky < 0.05){
            hand.userData.squeeze = true;
            this.squeezeStartController(hand);
        }
        if (hand.userData.squeeze == true && distanceMiddle > 0.06 && distanceRing > 0.06 && distancePinky > 0.06){
            hand.userData.squeeze = false;
            this.squeezeEndController(hand);
        }
        if(hand.userData.select == false && distanceThumbTrigger < 0.02){
            hand.userData.select = true;
            hand.scale.set(0.5,0.5,0.5);
            this.selectStartController(hand);
            
        }
        if(hand.userData.select == true && distanceThumbTrigger > 0.03){
            hand.userData.select = false;
            hand.scale.set(1,1,1);
            this.selectEndController(hand);
        }
    }

    getAndinitilizeXRcontroller(num, group) {
        let controller = this.XR.getController(num);
        console.log(controller);
        
        let controllerGrip = this.XR.getControllerGrip(num);
        controllerGrip.add(this.controllerModelFactory.createControllerModel(controllerGrip));
        controller.userData.grip = controllerGrip; //test if this works for referencing grip object

        controller.userData.squeeze = false;
        controller.userData.select = false;
        controller.userData.grippedTool = -1; //no tool is selected
        controller.userData.grippedObject = undefined;
        controller.userData.pointingAtObject = undefined;
        controller.userData.connected = false;
        controller.userData.intersectingGUI = false;

        //set binds
        controller.addEventListener('connected',()=>{controller.userData.connected = true; controller.visible = true;});
        controller.addEventListener('disconnected',()=>{controller.userData.connected = false; controller.visible = false;});
        controller.addEventListener('squeezestart', () => {this.squeezeStartController(controller);});
        controller.addEventListener('squeezeend', () => {this.squeezeEndController(controller);});
        controller.addEventListener('selectstart', () => {this.selectStartController(controller);});
        controller.addEventListener('selectend', () => {this.selectEndController(controller);});

        group.add(controllerGrip);
        group.add(controller);
        
        return controller;
    }

    initControlersHelpers() {
        //pointer line helpers
        let line = new Line(new BufferGeometry().setFromPoints([new Vector3(0, 0, 0), new Vector3(0, 0, -1)]));
        line.name = 'line';
        line.scale.z = 1;
        //let sphere = new Sphere(new Vector3(0,0,0),0.06); //create a sphere for coliding with objects
        //sphere.name = 'sphere';


        this.controller1.add(line.clone()); //this.controller1.add(sphere.clone());
        this.controller2.add(line.clone()); //this.controller2.add(sphere.clone());
        this.hand1.add(line.clone()); //this.hand1.add(sphere.clone());
        this.hand2.add(line.clone()); //this.hand2.add(sphere.clone());
    }

    squeezeStartController(controller) {
        if(controller.userData.connected == false){return;}
        controller.userData.squeeze = true;
        this.gripObject(controller);
        if (this.activeControler == controller && controller.userData.intersectingGUI) {
            this.meshUI.onSelectAlternative(); //<--preform button alternative function if howering over one
        }
        //switch active controller
        this.activeControler = controller;

    }
    squeezeEndController(controller) {
        if(controller.userData.connected == false){return;}
        controller.userData.squeeze = false;
        this.hideHelperItems(controller); //hides relevant items
        this.controlerReleseObject(controller);
        if (this.activeControler == controller) {
            this.meshUI.onReleseAlternative(); 
        }
    }
    selectStartController(controller) {
        if(controller.userData.connected == false){return;}
        controller.userData.select = true;
        if (controller.userData.grippedObject != undefined && controller.userData.intersectingGUI == false) {
            this.toolActionOnSelect(controller);
        }
        if (this.activeControler == controller && controller.userData.intersectingGUI) {
            this.meshUI.onSelect(); //<--preform button function if howering over one
        }
        //switch active controller
        this.activeControler = controller;
    }
    selectEndController(controller) {
        if(controller.userData.connected == false){return;}
        controller.userData.select = false;
        if (this.activeControler == controller) {
            this.meshUI.onRelese();
        }
        if (controller.userData.grippedObject != undefined) {
            this.toolActionOnSelectEnd(controller);
        }
    }

    onControllerSelectRelease(controller) {
        if(controller.userData.connected == false){return;}
        //!Cant grab anything outside the interactiveObjectsGroup. So after relese always return it to the interactiveObjectsGroup
        if (controller.userData.grippedObject != undefined) {
            let object = controller.userData.grippedObject;
            console.log(object);
        }
    }
    
    gripObject(controller) {
        //check if object can be grabed
        //const found = this.ControllerGetObjects(controller,this.interactiveObjectsGroup);
        if(controller.userData.connected == false){return;}
        let object = controller.userData.pointingAtObject;
        if (object != undefined) {

            object.userData.returnTo = undefined;
            object.userData.returnToPosition = undefined;
            object.userData.returnToRotation = undefined;
            controller.userData.grippedObject = object;
            switch (object.name) {
                case 'teleporter':
                    object.userData.returnToPosition = object.position.clone();
                    object.userData.returnToRotation = object.quaternion.clone();
                    object.userData.returnTo = object.parent; //save parent
                    object.setRotationFromQuaternion(controller.getWorldQuaternion(this.tempQuaternion));
                    this.tempQuaternion.copy(this.userGroup.quaternion);
                    object.applyQuaternion(this.tempQuaternion.invert()); //rotate to aling with local cordinates
                    object.position.copy(controller.position);
                    controller.attach(object);
                    controller.userData.grippedTool = 0;
                    break;
                case 'pencil':
                    object.userData.returnToPosition = object.position.clone();
                    object.userData.returnToRotation = object.quaternion.clone();
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
                    object.userData.returnToPosition = object.position.clone();
                    object.userData.returnToRotation = object.quaternion.clone();
                    object.userData.returnTo = object.parent; //save parent
                    object.setRotationFromQuaternion(controller.getWorldQuaternion(this.tempQuaternion));
                    this.tempQuaternion.copy(this.userGroup.quaternion);
                    object.applyQuaternion(this.tempQuaternion.invert()); //rotate to aling with local cordinates
                    object.position.copy(controller.position);
                    
                    controller.attach(object);
                    controller.userData.grippedTool = 4;
                    break;
                case 'objectManipulator':
                    object.userData.returnToPosition = object.position.clone();
                    object.userData.returnToRotation = object.quaternion.clone();
                    object.userData.returnTo = object.parent; //save parent
                    object.setRotationFromQuaternion(controller.getWorldQuaternion(this.tempQuaternion));
                    this.tempQuaternion.copy(this.userGroup.quaternion);
                    object.applyQuaternion(this.tempQuaternion.invert()); //rotate to aling with local cordinates
                    object.position.copy(controller.position);
                    controller.attach(object);
                    controller.userData.grippedTool = 5;
                    break;
                case 'inspectTool':
                    object.userData.returnToPosition = object.position.clone();
                    object.userData.returnToRotation = object.quaternion.clone();
                    object.userData.returnTo = object.parent; //save parent
                    object.setRotationFromQuaternion(controller.getWorldQuaternion(this.tempQuaternion));
                    this.tempQuaternion.copy(this.userGroup.quaternion);
                    object.applyQuaternion(this.tempQuaternion.invert()); //rotate to aling with local cordinates
                    object.position.copy(controller.position);
                    controller.attach(object);
                    controller.userData.grippedTool = 6;
                    break;
            
                default:
                    break;
            }

            this.showHelperItmes(controller); //show relavant intems depending on context

        }
        //console.log(controller); <--checking what data controler object holds
    }

    showHelperItmes(controller) {
        if(controller.userData.connected == false){return;}
        //glede na oporabljeno orodje prikazi dolocene objekte menije ...
        if (controller.userData.grippedTool == 0) {
            this.teleporterTool.toolShowHelperItems();
        }
        if(controller.userData.grippedTool == 5){
            this.objectManipulatorTool.toolShowHelperItems();
        }
        if(controller.userData.grippedTool == 6){
            this.inspectTool.toolShowHelperItems();
        }
    }
    hideHelperItems(controller) {
        if(controller.userData.connected == false){return;}
        if (controller.userData.grippedTool == 0) {
            this.teleporterTool.toolHideHelperItems();
        }
        if (controller.userData.grippedTool == 4) {
            this.objectSpawnerTool.toolHideHelperItems();
        }
        if (controller.userData.grippedTool == 5) {
            this.objectManipulatorTool.toolHideHelperItems();
        }
        if(controller.userData.grippedTool == 6){
            this.inspectTool.toolHideHelperItems();
        }
    }

    controlerReleseObject(controller) {
        if(controller.userData.connected == false){return;}
        if (controller.userData.grippedObject !== undefined) {
            const object = controller.userData.grippedObject;
            const parent = object.userData.returnTo;

            if(parent){
                parent.attach(object);
                if(object.userData.returnToPosition)object.position.copy(object.userData.returnToPosition);
                if(object.userData.returnToRotation)object.quaternion.copy(object.userData.returnToRotation);
            }//release object back to its parent
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
        if(controller.userData.connected == false){return;}
        //initial action when main button is pressed
        if (controller.userData.grippedTool == 0) {
            this.teleporterTool.toolAction();
        } else if (controller.userData.grippedTool == 1) {
            this.pencilTool.updatePivotPosition();
        } else if (controller.userData.grippedTool == 4) {
            this.objectSpawnerTool.toolAction();
        } else if (controller.userData.grippedTool == 5) {
            this.objectManipulatorTool.toolAction();
        } else if (controller.userData.grippedTool == 6) {
            this.inspectTool.toolAction();
        }
    }
    toolActionOnSelectEnd(controller) {
        if(controller.userData.connected == false){return;}
        if (controller.userData.grippedTool == 1) { //when finishing a stroke
            this.pencilTool.toolActionEnd();
        }
    }
    handleToolsAnimations(controller) {
        if(controller.userData.connected == false){return;}
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
            if(this.tempVecP.length() > 0.3){
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
        } else if (controller.userData.grippedTool == 6){
            this.inspectTool.toolAnimation(controller);
        }
    }

    controlerNearby(controller,group){
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
        if(controller.userData.connected == false){return;}
        //show that object can be interacted with by changing its collor when its being pointed at
        //if (controller.userData.grippedObject !== undefined) return;
        const line = controller.getObjectByName('line');
        let found = this.controlerNearby(controller,group);
        
        if (found.length === 0 && controller === this.activeControler) { //if not enoraching on any object try raycasting
            this.tempMatrix.identity().extractRotation(controller.matrixWorld); //shoot a ray from a controller and find if it intersacts with a interactable object
            this.raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
            this.raycaster.ray.direction.set(0, 0, -1).applyMatrix4(this.tempMatrix);

            let ret = this.meshUI.raycastGUIelements(this.raycaster); //check if the raycast hits any gui elements
            if(ret){
                controller.userData.intersectingGUI = true;
            }else{ controller.userData.intersectingGUI = false;}

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
            if(line)line.scale.z = intersection.distance;
            return intersection;
        } else if (this.activeControler !== controller) {
            if(line)line.scale.z = 0.1;
            controller.userData.pointingAtObject = undefined;
        } else {
            if(line)line.scale.z = 5;
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
            this.controlerGetObject(this.hand1, this.higlightedObjects, this.interactiveObjectsGroup);
            this.controlerGetObject(this.hand2, this.higlightedObjects, this.interactiveObjectsGroup);

            this.checkForHandActions(this.hand1);
            this.checkForHandActions(this.hand2);

            this.handleToolsAnimations(this.controller1);
            this.handleToolsAnimations(this.controller2);
            this.handleToolsAnimations(this.hand1);
            this.handleToolsAnimations(this.hand2);

        }

        /*
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
        */

    }
}
export { VRinteraction };
