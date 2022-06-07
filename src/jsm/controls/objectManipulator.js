import { Vector3,Quaternion,Box3,IcosahedronGeometry, Plane, Raycaster, Line, BufferGeometry, Matrix4, Mesh, BoxGeometry,MeshLambertMaterial, DoubleSide } from "three";

import { acceleratedRaycast } from 'three-mesh-bvh';
// Add the raycast function. Assumes the BVH is available on
// the `boundsTree` variable
Mesh.prototype.raycast = acceleratedRaycast; 

class ObjectManipulator {
    constructor(ObjectGroup,toolGroup,_scene,MESHUI,groundPlane) {
        this.higlightMaterial = new MeshLambertMaterial({ color: 0x00B611, opacity: 0.2, transparent: true, side: DoubleSide });
        this.boundingBoxMaterial =  new MeshLambertMaterial({ color: 0x0011B6, opacity: 0.2, transparent: true, side: DoubleSide });

        this.mesh = new Mesh(new BoxGeometry(0.05, 0.1, 0.05), new MeshLambertMaterial({ color: 0x6a58f5}));
        this.meshUI = MESHUI;
        this.objects = ObjectGroup;
        this.scene = _scene;
        this.selectedObject = undefined;
        this.raycaster = new Raycaster();
        this.groundPlane = groundPlane //if ray dosent intersect any object, place object on ground
        this.tempMatrix = new Matrix4();
        this.tempVec = new Vector3(0, 1, 0);
        this.tempVecP = new Vector3(0, 0, 0);
        this.box = new Box3();
        this.position = new Vector3();
        this.quaternion = new Quaternion();
        this.offsetRotation = false;
        this.holdPosition = false;

        this.ball = new Mesh(new IcosahedronGeometry(0.02), new MeshLambertMaterial({ color: 0xffffff }));
        this.ball.visible = false;
        this.scene.add(this.ball);

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

        this.objectBoundingBox = undefined;
        this.objectModel = undefined;
        this.pointedAtObject = undefined;
        this.higlightedObject = undefined;

        this.toolMenuHandle = this.meshUI.createMenu(
            0.04, //height
            0.001, //menu height
            '', //handle text if empty hide handle
            false, //is it dragable ?
            false, //does it reoient itself when moved to face ray origin
            false, //is handle atached at the bottom
        );

        const cancelButton = this.meshUI.addWideButton('CANCEL', 0.04,()=>{this.cancelAction();});
        cancelButton.autoLayout = false;
        this.toolMenuHandle.userData.menu.add(cancelButton);
        cancelButton.position.set(-0.04*4.2,0.02,0);

        const moveButton = this.meshUI.addWideButton('MOVE XYZ', 0.04);
        moveButton.autoLayout = false;
        this.toolMenuHandle.userData.menu.add(moveButton);
        moveButton.position.set(0,-0.02,0);

        this.selectorOffsetXtranslation = this.meshUI.addSliderDiscrete(0.04,100,-100,this.moveStep,() => {this.offsetXtranslate = this.selectorOffsetXtranslation.userData.value; this.moveObject();},"",3);
        this.selectorOffsetXtranslation.userData.value = 0; this.selectorOffsetXtranslation.userData.update(); this.selectorOffsetXtranslation.autoLayout = false;
        this.toolMenuHandle.userData.menu.add(this.selectorOffsetXtranslation);
        this.selectorOffsetXtranslation.position.set(0,-0.06,0);

        this.selectorOffsetYtranslation = this.meshUI.addSliderDiscrete(0.04,100,-100,this.moveStep,() => {this.offsetYtranslate = this.selectorOffsetYtranslation.userData.value; this.moveObject();},"",3);
        this.selectorOffsetYtranslation.userData.value = 0; this.selectorOffsetXtranslation.userData.update(); this.selectorOffsetYtranslation.autoLayout = false;
        this.toolMenuHandle.userData.menu.add(this.selectorOffsetYtranslation);
        this.selectorOffsetYtranslation.position.set(0,-0.1,0);

        this.selectorOffsetZtranslation = this.meshUI.addSliderDiscrete(0.04,100,-100,this.moveStep,() => {this.offsetZtranslate = this.selectorOffsetZtranslation.userData.value; this.moveObject();},"",3);
        this.selectorOffsetZtranslation.userData.value = 0; this.selectorOffsetZtranslation.userData.update(); this.selectorOffsetZtranslation.autoLayout = false;
        this.toolMenuHandle.userData.menu.add(this.selectorOffsetZtranslation);
        this.selectorOffsetZtranslation.position.set(0,-0.14,0);

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
        this.selectorTranslateStep.position.set(0,-0.18,0);

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
            this.moveObject();
        });

        resetTranslationRotation.autoLayout = false;
        this.toolMenuHandle.userData.menu.add(resetTranslationRotation);
        resetTranslationRotation.position.set(0,-0.22,0);

        const rotateButton = this.meshUI.addWideButton('ROTATE XYZ', 0.04);
        rotateButton.autoLayout = false;
        this.toolMenuHandle.userData.menu.add(rotateButton);
        rotateButton.position.set(-0.04*4.2,-0.02,0);

        this.selectorOffsetXrotate= this.meshUI.addSliderDiscrete(0.04,1800,-1800,this.rotateStep,() => {this.offsetXrotate = this.selectorOffsetXrotate.userData.value; this.moveObject();},"",1);
        this.selectorOffsetXrotate.userData.value = 0; this.selectorOffsetXrotate.userData.update(); this.selectorOffsetXrotate.autoLayout = false;
        this.toolMenuHandle.userData.menu.add(this.selectorOffsetXrotate);
        this.selectorOffsetXrotate.position.set(-0.04*4.2,-0.06,0);

        this.selectorOffsetYrotate= this.meshUI.addSliderDiscrete(0.04,1800,-1800,this.rotateStep,() => {this.offsetYrotate = this.selectorOffsetYrotate.userData.value; this.moveObject();},"",1);
        this.selectorOffsetYrotate.userData.value = 0; this.selectorOffsetYrotate.userData.update(); this.selectorOffsetYrotate.autoLayout = false;
        this.toolMenuHandle.userData.menu.add(this.selectorOffsetYrotate);
        this.selectorOffsetYrotate.position.set(-0.04*4.2,-0.1,0);

        this.selectorOffsetZrotate = this.meshUI.addSliderDiscrete(0.04,1800,-1800,this.rotateStep,() => {this.offsetZrotate = this.selectorOffsetZrotate.userData.value; this.moveObject();},"",1);
        this.selectorOffsetZrotate.userData.value = 0; this.selectorOffsetZrotate.userData.update(); this.selectorOffsetZrotate.autoLayout = false;
        this.toolMenuHandle.userData.menu.add(this.selectorOffsetZrotate);
        this.selectorOffsetZrotate.position.set(-0.04*4.2,-0.14,0);

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
        this.selectorRotateStep.position.set(-0.04*4.2,-0.18,0);

        const confirmButton = this.meshUI.addWideButton('CONFIRM', 0.04, () => {this.objectBoundingBox.visible = false; this.toolAction();});
        confirmButton.autoLayout = false;
        this.toolMenuHandle.userData.menu.add(confirmButton);
        confirmButton.position.set(-0.04*4.2,-0.22,0);

        const deleteButton = this.meshUI.addWideButton('DELETE', 0.04, () => {
            if(this.objectBoundingBox && this.objectModel){
                this.scene.remove(this.objectModel);
                this.scene.remove(this.objectBoundingBox);
                this.objectBoundingBox = undefined;
                this.objectModel = undefined;
                this.objectSelected = false;
            }
        });
        deleteButton.autoLayout = false;
        this.toolMenuHandle.userData.menu.add(deleteButton);
        deleteButton.position.set(0,-0.26,0);

        const offseRotationButton = this.meshUI.addWideButton('OFSET ROT', 0.04, () => {
            if(this.offsetRotation){this.offsetRotation = false;}else{this.offsetRotation = true;}
            this.moveObject();
        },true);
        offseRotationButton.autoLayout = false;
        this.toolMenuHandle.userData.menu.add(offseRotationButton);
        offseRotationButton.position.set(-0.04*4.2,-0.26,0);

        const offseTranslationButton = this.meshUI.addWideButton('HOLD POZ', 0.04, () => {
            if(this.holdPosition){this.holdPosition = false;}else{this.holdPosition = true;}
            this.moveObject();
        },true);
        offseTranslationButton.autoLayout = false;
        this.toolMenuHandle.userData.menu.add(offseTranslationButton);
        offseTranslationButton.position.set(-0.04*4.2,-0.3,0);

        const snapButton = this.meshUI.addWideButton('SNAP', 0.04,()=>{
            if(this.snaping){this.snaping = false;}else {this.snaping = true}
        },true);
        snapButton.autoLayout = false;
        snapButton.position.set(0,-0.30,0);
        this.toolMenuHandle.userData.menu.add(snapButton);

        //define menu handle position
        this.toolMenuHandle.position.set(-0.14,0.05,0);
        this.mesh.userData.UI = this.toolMenuHandle;
        this.mesh.add(this.toolMenuHandle);
        this.mesh.position.set(1.2, 1.5, -1);
        this.mesh.name = 'objectManipulator';
        toolGroup.add(this.mesh);

        this.objectSelected = false;

        this.line = new Line(new BufferGeometry().setFromPoints([new Vector3(0, 0, 0), new Vector3(0, 0, -1)]));
        this.line.name = 'line';
        this.line.scale.z = 1;
        this.mesh.add(this.line);

    }

    toolAnimation(controller){
        this.tempMatrix.identity().extractRotation(controller.matrixWorld); //shoot a ray from a controller and find if it intersacts with a interactable object
        this.raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
        this.raycaster.ray.direction.set(0, 0, -1).applyMatrix4(this.tempMatrix);

        let boundingBoxes = [];
        this.objects.children.forEach(element => {
            if(this.objectModel != element){
                let box = element.getObjectByName('boundingBox');
                box.visible = true;
                boundingBoxes.push(box);
            }
        });

        if(this.higlightedObject){
            if(this.higlightedObject.material)this.higlightedObject.material = this.boundingBoxMaterial;
            this.higlightedObject = undefined;
        }

        let found = this.raycaster.intersectObjects(boundingBoxes, false); //do not use recursion to check for intersection whith all children
        if(found.length > 0){
            let intersaction = found[0];
            this.tempVecP.copy(intersaction.point);
            this.pointedAtObject = intersaction.object;
            if(!(this.objectModel && this.objectBoundingBox)){
                this.higlightedObject = this.pointedAtObject;
                this.higlightedObject.material = this.higlightMaterial;
            }

        }else{
            this.pointedAtObject = undefined;
        }

        //BVH method of raycasting-----------------------------------------------------------------------------------------------------------------------------------------------------------------
        this.raycaster.firstHitOnly = true;
        found = this.raycaster.intersectObjects(this.objects.children); //if object spawner corectly generated BVH for geometry this should work much faster
        if(found.length > 0){
            let intersaction = found[0];
            this.tempVecP.copy(intersaction.point);
        }else{
            this.tempVecP.set(0,50000,0);;
            this.raycaster.ray.intersectPlane(this.groundPlane, this.tempVecP);
        }

        this.ball.visible = true;
        this.ball.position.copy(this.tempVecP);
        this.line.visible = true;
        this.line.scale.z = this.tempVecP.distanceTo(this.raycaster.ray.origin);

        this.moveObject();
        
    }
    cancelAction(){
        if(this.objectModel && this.objectBoundingBox){
            this.objectBoundingBox.visible = false;
            this.objectModel.position.copy(this.position);
            this.objectModel.quaternion.copy(this.quaternion);

            this.scene.attach(this.objectBoundingBox);
            this.box.setFromObject(this.objectModel);
            this.tempVec.copy(this.box.max)
            this.tempVec.add(this.box.min);
            this.tempVec.x *= 0.5; this.tempVec.y *= 0.5; this.tempVec.z *= 0.5;
            this.objectBoundingBox.position.copy(this.tempVec);
            this.objectBoundingBox.scale.set((this.box.max.x - this.box.min.x)*10.1, (this.box.max.y - this.box.min.y)*10.1, (this.box.max.z - this.box.min.z)*10.1);
            this.objectModel.attach(this.objectBoundingBox);
        }
        this.toolAction();
    }

    moveObject(){
        if(this.objectModel && this.objectBoundingBox){
            this.scene.attach(this.objectBoundingBox);
            
            if(this.holdPosition){
                this.objectModel.position.copy(this.position);
            }else{
                if(this.snaping){
                    this.tempVecP.x = Math.round(this.tempVecP.x / this.moveStep) * this.moveStep;
                    this.tempVecP.y = Math.round(this.tempVecP.y / this.moveStep) * this.moveStep;
                    this.tempVecP.z = Math.round(this.tempVecP.z / this.moveStep) * this.moveStep;
                }
                this.objectModel.position.copy(this.tempVecP); //move to pointed position
            }
            if(this.offsetRotation){
                this.objectModel.quaternion.copy(this.quaternion);
            }else{
                this.objectModel.quaternion.set(0,0,0,1); //if ofset mode dont reset quaternion but set it to initial quaternion when object is selected
            }

            this.objectModel.translateX(this.offsetXtranslate);
            this.objectModel.translateY(this.offsetYtranslate)
            this.objectModel.translateZ(this.offsetZtranslate)
            //todo check if rotation order is correct
            this.objectModel.rotateX(this.offsetXrotate*Math.PI/180);
            this.objectModel.rotateY(this.offsetYrotate*Math.PI/180);
            this.objectModel.rotateZ(this.offsetZrotate*Math.PI/180);

            
            this.box.setFromObject(this.objectModel);
            this.tempVec.copy(this.box.max)
            this.tempVec.add(this.box.min);
            this.tempVec.x *= 0.5; this.tempVec.y *= 0.5; this.tempVec.z *= 0.5;
            this.objectBoundingBox.position.copy(this.tempVec);
            this.objectBoundingBox.scale.set((this.box.max.x - this.box.min.x)*10.1, (this.box.max.y - this.box.min.y)*10.1, (this.box.max.z - this.box.min.z)*10.1);
            if(this.objectBoundingBox.material)this.objectBoundingBox.material = this.higlightMaterial;
            this.objectModel.attach(this.objectBoundingBox);
        }
    }

    toolAction(){
        if(this.objectSelected == false && this.pointedAtObject){
            this.objectSelected = true;
            this.objectBoundingBox = this.pointedAtObject;
            if(this.objectBoundingBox.material)this.objectBoundingBox.material = this.higlightMaterial;
            this.objectModel = this.pointedAtObject.parent;
            this.scene.attach(this.objectModel);
            this.pointedAtObject = undefined;
            this.quaternion.copy(this.objectModel.quaternion);
            this.position.copy(this.objectModel.position);
        }else{
            if(this.objectBoundingBox)this.objectBoundingBox.material = this.boundingBoxMaterial;
            if(this.objectModel)this.objects.attach(this.objectModel);
            this.objectModel = undefined;
            this.objectBoundingBox = undefined;
            this.objectModel = undefined;
            this.objectSelected = false;
            this.pointedAtObject = undefined;
        }
    }
    toolHideHelperItems(){
        this.line.visible = false;
        this.ball.visible = false;
        this.pointedAtObject = undefined;
        this.objects.children.forEach(element => {
            if(this.objectModel != element){
                let box = element.getObjectByName('boundingBox');
                box.visible = false;
            }
        });
        //this.cancelAction(); 
    }
    toolShowHelperItems(){
        this.line.visible = true;
    }
}
export{ObjectManipulator};