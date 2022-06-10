import { Vector3, IcosahedronGeometry, Raycaster, Line, BufferGeometry, Matrix4, Mesh, BoxGeometry,MeshLambertMaterial,Box3, DoubleSide } from "three";

import cubeThumbnailImage from "../../images/cubeThumbnail.jpg"

import { MeshBVH, acceleratedRaycast } from 'three-mesh-bvh';
// Add the raycast function. Assumes the BVH is available on
// the `boundsTree` variable
Mesh.prototype.raycast = acceleratedRaycast; 

//creates a THREE.Object3D in toolGroup whith object spawning logic atached
class ObjectSpawner {
    constructor(ObjectGroup,toolGroup,_scene,MESHUI,groundPlane,_overlay) {
        this.mesh = new Mesh(new BoxGeometry(0.05, 0.1, 0.05), new MeshLambertMaterial({ color: 0x660066 }));
        this.meshUI = MESHUI;
        this.objects = ObjectGroup;
        this.scene = _scene;
        this.overlay = _overlay;
        this.selectedObject = undefined;
        this.raycaster = new Raycaster();
        this.groundPlane = groundPlane //if ray dosent intersect any object, place object on ground
        this.tempMatrix = new Matrix4();
        this.tempVec = new Vector3(0, 1, 0);
        this.tempVecP = new Vector3(0, 50000, 0);
        this.box = new Box3();

        this.frameCount = 0;
        this.offsetXtranslate = 0;
        this.offsetYtranslate = 0;
        this.offsetZtranslate = 0;
        this.offsetXrotate = 0;
        this.offsetYrotate = 0;
        this.offsetZrotate = 0;

        this.rotateSteps = [0.1,1,5,10,15,30,45,60,90];
        this.moveSteps = [0.001,0.01,0.1,1,10];
        this.rotateStep = 90;
        this.moveStep = 0.1;
        this.snaping = false;

        this.objectBoundingBox = new Mesh(new BoxGeometry(0.1, 0.1, 0.1), new MeshLambertMaterial({ color: 0x0011B6, opacity: 0.2, transparent: true, side: DoubleSide }));
        //this.objectModel = new Mesh(new BoxGeometry(0.1, 0.1, 0.1), new MeshLambertMaterial({ color: 0x0011A6, opacity: 0.2, transparent: true, side: DoubleSide }));
        //this.scene.add(this.objectModel);
        this.overlay.add(this.objectBoundingBox);
        this.objectBoundingBox.visible = false;
        this.objectBoundingBox.name = 'boundingBox';

        const cubeMesh =  new Mesh(new BoxGeometry(1, 1, 1), new MeshLambertMaterial({color: 0x00ff00}));
        const icosphere = new Mesh(new IcosahedronGeometry(1), new MeshLambertMaterial({color: 0x00ff00}));
        let testItem = {
            text: "cube", //item must have these properties 
            imageURL: cubeThumbnailImage,
            applayPropreties: {borderRadius: 0},
            mesh: cubeMesh,
            onClick: () => {
                if(this.selectedObject){this.selectedObject.visible = false}
                if(this.selectedObject === cubeMesh){this.selectedObject = undefined;}else{this.selectedObject = cubeMesh;}
            },
        };
        let items = [];
        items.push(testItem);

        this.toolMenuHandle = this.meshUI.createMenu(
            0.04, //height
            0.001, //menu height
            '', //handle text if empty hide handle
            false, //is it dragable ?
            false, //does it reoient itself when moved to face ray origin
            false, //is handle atached at the bottom
        );

        this.container = this.meshUI.createButtonGrid(items,0.082,0.04,3,true,true,()=>{this.showPlaceholder(this.tempVecP);});
        this.toolMenuHandle.userData.menu.add(this.container);

        const moveButton = this.meshUI.addWideButton('MOVE XYZ', 0.04);
        moveButton.autoLayout = false;
        this.toolMenuHandle.userData.menu.add(moveButton);
        moveButton.position.set(-0.04*4.2,0.02,0);

        this.selectorOffsetXtranslation = this.meshUI.addSliderDiscrete(0.04,100,-100,this.moveStep,() => {this.offsetXtranslate = this.selectorOffsetXtranslation.userData.value; this.showPlaceholder(this.tempVecP);},"",3);
        this.selectorOffsetXtranslation.userData.value = 0; this.selectorOffsetXtranslation.userData.update(); this.selectorOffsetXtranslation.autoLayout = false;
        this.toolMenuHandle.userData.menu.add(this.selectorOffsetXtranslation);
        this.selectorOffsetXtranslation.position.set(-0.04*4.2,-0.02,0);

        this.selectorOffsetYtranslation = this.meshUI.addSliderDiscrete(0.04,100,-100,this.moveStep,() => {this.offsetYtranslate = this.selectorOffsetYtranslation.userData.value; this.showPlaceholder(this.tempVecP);},"",3);
        this.selectorOffsetYtranslation.userData.value = 0; this.selectorOffsetXtranslation.userData.update(); this.selectorOffsetYtranslation.autoLayout = false;
        this.toolMenuHandle.userData.menu.add(this.selectorOffsetYtranslation);
        this.selectorOffsetYtranslation.position.set(-0.04*4.2,-0.06,0);

        this.selectorOffsetZtranslation = this.meshUI.addSliderDiscrete(0.04,100,-100,this.moveStep,() => {this.offsetZtranslate = this.selectorOffsetZtranslation.userData.value; this.showPlaceholder(this.tempVecP);},"",3);
        this.selectorOffsetZtranslation.userData.value = 0; this.selectorOffsetZtranslation.userData.update(); this.selectorOffsetZtranslation.autoLayout = false;
        this.toolMenuHandle.userData.menu.add(this.selectorOffsetZtranslation);
        this.selectorOffsetZtranslation.position.set(-0.04*4.2,-0.1,0);

        this.selectorTranslateStep = this.meshUI.addSliderDiscrete(0.04,4,0,1,() => {
            let value = this.selectorTranslateStep.userData.value;
            this.moveStep = this.moveSteps[value];
            if(3-value < 0){value = 3};
            this.selectorTranslateStep.userData.text.set({content: parseFloat(this.moveStep.toString()).toFixed(3-value)+"m"});
            this.selectorTranslateStep.userData.describe = "translate step";
            this.selectorOffsetXtranslation.userData.step = this.moveStep;
            this.selectorOffsetYtranslation.userData.step = this.moveStep;
            this.selectorOffsetZtranslation.userData.step = this.moveStep;

        },"0.1m",1);
        this.selectorTranslateStep.userData.value = 2; this.selectorTranslateStep.userData.update();
        this.selectorTranslateStep.autoLayout = false;
        this.toolMenuHandle.userData.menu.add(this.selectorTranslateStep);
        this.selectorTranslateStep.position.set(-0.04*4.2,-0.14,0);

        const rotateButton = this.meshUI.addWideButton('ROTATE XYZ', 0.04);
        rotateButton.autoLayout = false;
        this.toolMenuHandle.userData.menu.add(rotateButton);
        rotateButton.position.set(-0.04*4.2,-0.18,0);

        this.selectorOffsetXrotate= this.meshUI.addSliderDiscrete(0.04,1800,-1800,this.rotateStep,() => {this.offsetXrotate = this.selectorOffsetXrotate.userData.value; this.showPlaceholder(this.tempVecP);},"",1);
        this.selectorOffsetXrotate.userData.value = 0; this.selectorOffsetXrotate.userData.update(); this.selectorOffsetXrotate.autoLayout = false;
        this.toolMenuHandle.userData.menu.add(this.selectorOffsetXrotate);
        this.selectorOffsetXrotate.position.set(-0.04*4.2,-0.22,0);

        this.selectorOffsetYrotate= this.meshUI.addSliderDiscrete(0.04,1800,-1800,this.rotateStep,() => {this.offsetYrotate = this.selectorOffsetYrotate.userData.value; this.showPlaceholder(this.tempVecP);},"",1);
        this.selectorOffsetYrotate.userData.value = 0; this.selectorOffsetYrotate.userData.update(); this.selectorOffsetYrotate.autoLayout = false;
        this.toolMenuHandle.userData.menu.add(this.selectorOffsetYrotate);
        this.selectorOffsetYrotate.position.set(-0.04*4.2,-0.26,0);

        this.selectorOffsetZrotate = this.meshUI.addSliderDiscrete(0.04,1800,-1800,this.rotateStep,() => {this.offsetZrotate = this.selectorOffsetZrotate.userData.value; this.showPlaceholder(this.tempVecP);},"",1);
        this.selectorOffsetZrotate.userData.value = 0; this.selectorOffsetZrotate.userData.update(); this.selectorOffsetZrotate.autoLayout = false;
        this.toolMenuHandle.userData.menu.add(this.selectorOffsetZrotate);
        this.selectorOffsetZrotate.position.set(-0.04*4.2,-0.30,0);

        this.selectorRotateStep = this.meshUI.addSliderDiscrete(0.04,8,0,1,() => {
            let value = this.selectorRotateStep.userData.value;
            this.rotateStep = this.rotateSteps[value];
            this.selectorRotateStep.userData.text.set({content: parseFloat(this.rotateStep.toString()).toFixed(1)+"deg"});
            this.selectorRotateStep.userData.describe = "rotate step";
            this.selectorOffsetXrotate.userData.step = this.rotateStep;
            this.selectorOffsetYrotate.userData.step = this.rotateStep;
            this.selectorOffsetZrotate.userData.step = this.rotateStep;

        },"90.0deg");
        this.selectorRotateStep.userData.value = 8; this.selectorRotateStep.userData.update();
        this.selectorRotateStep.autoLayout = false;
        this.toolMenuHandle.userData.menu.add(this.selectorRotateStep);
        this.selectorRotateStep.position.set(-0.04*4.2,-0.34,0);

        this.hold = false;
        this.holdButton = this.meshUI.addWideButton('HOLD', 0.04,()=>{
            if(this.hold){
                this.hold = false
                this.objectBoundingBox.visible = false;
                this.selectedObject.visible = false;
            }else{this.hold = true}},true);
        this.holdButton.autoLayout = false;
        this.holdButton.position.set(0,-0.30,0);
        this.toolMenuHandle.userData.menu.add(this.holdButton);

        const confirmButton = this.meshUI.addWideButton('CONFIRM', 0.04,()=>{
            this.toolAction(); 
            this.objectBoundingBox.visible = false;
            this.selectedObject.visible = false;
        });
        confirmButton.autoLayout = false;
        confirmButton.position.set(0,-0.34,0);
        this.toolMenuHandle.userData.menu.add(confirmButton);

        const snapButton = this.meshUI.addWideButton('SNAP', 0.04,()=>{
            if(this.snaping){this.snaping = false;}else {this.snaping = true}
        },true);
        snapButton.autoLayout = false;
        snapButton.position.set(0,-0.38,0);
        this.toolMenuHandle.userData.menu.add(snapButton);
        
        this.toolMenuHandle.position.set(-0.14,0.05,0);
        this.mesh.userData.UI = this.toolMenuHandle;
        this.mesh.add(this.toolMenuHandle);
        this.mesh.position.set(0.2, 1.5, -1);
        this.mesh.name = 'objectSpawner';
        toolGroup.add(this.mesh);

        const resetTranslationRotation = this.meshUI.addWideButton('RESET TO 0', 0.04, () => {
            this.offsetXtranslate = 0;
            this.offsetYtranslate = 0;
            this.offsetZtranslate = 0;
            this.offsetXrotate = 0;
            this.offsetYrotate = 0;
            this.offsetZrotate = 0;
            this.selectorOffsetXtranslation.userData.value = 0; this.selectorOffsetXtranslation.userData.update();
            this.selectorOffsetYtranslation.userData.value = 0; this.selectorOffsetYtranslation.userData.update();
            this.selectorOffsetZtranslation.userData.value = 0; this.selectorOffsetZtranslation.userData.update();
            this.selectorOffsetXrotate.userData.value = 0; this.selectorOffsetXrotate.userData.update();
            this.selectorOffsetYrotate.userData.value = 0; this.selectorOffsetYrotate.userData.update();
            this.selectorOffsetZrotate.userData.value = 0; this.selectorOffsetZrotate.userData.update();
            this.showPlaceholder(this.tempVecP);
        });
        resetTranslationRotation.autoLayout = false;
        this.toolMenuHandle.userData.menu.add(resetTranslationRotation);
        resetTranslationRotation.position.set(-0.04*4.2,-0.38,0);


        let line = new Line(new BufferGeometry().setFromPoints([new Vector3(0, 0, 0), new Vector3(0, 0, -1)]));
        line.name = 'line';
        line.scale.z = 1;
    }

    addItem(item){
        this.toolMenuHandle.userData.menu.visible = false;
        this.container.userData.addButton(item);
        //hide element 
    }

        
    showPlaceholder(poz){
        //show placeholder at ray intersection
        if(this.selectedObject){
            if(this.snaping){
                poz.x = Math.round(poz.x / this.moveStep) * this.moveStep;
                poz.y = Math.round(poz.y / this.moveStep) * this.moveStep;
                poz.z = Math.round(poz.z / this.moveStep) * this.moveStep;
            } 
            
            this.selectedObject.position.copy(poz);
            this.selectedObject.translateX(this.offsetXtranslate);
            this.selectedObject.translateY(this.offsetYtranslate)
            this.selectedObject.translateZ(this.offsetZtranslate)
            //todo check if rotation order is correct
            this.selectedObject.rotateX(this.offsetXrotate*Math.PI/180);
            this.selectedObject.rotateY(this.offsetYrotate*Math.PI/180);
            this.selectedObject.rotateZ(this.offsetZrotate*Math.PI/180);

            this.box.setFromObject(this.selectedObject);
            this.tempVec.copy(this.box.max)
            this.tempVec.add(this.box.min);
            this.tempVec.x *= 0.5; this.tempVec.y *= 0.5; this.tempVec.z *= 0.5;
            this.objectBoundingBox.position.copy(this.tempVec);
            this.objectBoundingBox.scale.set((this.box.max.x - this.box.min.x)*10.1, (this.box.max.y - this.box.min.y)*10.1, (this.box.max.z - this.box.min.z)*10.1);

            this.objectBoundingBox.visible = true;
            this.selectedObject.visible = true;
        }else{
            if(this.selectedObject)this.selectedObject.visible = false;
            if(this.objectBoundingBox)this.objectBoundingBox.visible = false;
        }
    }

    toolAnimation(controller){        /*
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
        if(controller.userData.select){
            this.toolHideHelperItems();
        }else{
            this.tempMatrix.identity().extractRotation(controller.matrixWorld); //shoot a ray from a controller and find if it intersacts with a interactable object
            this.raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
            this.raycaster.ray.direction.set(0, 0, -1).applyMatrix4(this.tempMatrix);

            //BVH method of raycasting-----------------------------------------------------------------------------------------------------------------------------------------------------------------
            this.raycaster.firstHitOnly = true;
            let found = this.raycaster.intersectObjects(this.objects.children); //if object spawner corectly generated BVH for geometry this should work much faster
            if(found.length > 0){
                let intersaction = found[0];
                this.tempVecP.copy(intersaction.point);
            }else{
                this.tempVecP.set(0,50000,0);;
                this.raycaster.ray.intersectPlane(this.groundPlane, this.tempVecP);
            }
            this.showPlaceholder(this.tempVecP);
        }
    }
    toolAction(){
        if(this.selectedObject){
            let mesh = this.selectedObject.clone();
            let box = this.objectBoundingBox.clone();
            this.overlay.add(box);
            box.userData.mesh = mesh;
            mesh.userData.box = box;
            box.visible = false;

            if(mesh.material.emissive){
                mesh.material.emissive.r = 0;
                mesh.material.emissive.b = 0;
            }
            let geom = mesh.geometry;
            geom.boundsTree = new MeshBVH( geom );
            this.objects.add(mesh);
        }
    }
    toolHideHelperItems(){
        if(!this.hold && this.selectedObject){
            this.objectBoundingBox.visible = false;
            this.selectedObject.visible = false;
        }
    }
}
export{ObjectSpawner};