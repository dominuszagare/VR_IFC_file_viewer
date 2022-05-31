import { Vector3,
    BoxGeometry,
    Raycaster,
    Line, BufferGeometry,
    BufferAttribute, Matrix4, Quaternion,
    Mesh, MeshLambertMaterial,LineBasicMaterial,
    AdditiveBlending,
} from "three";

import { acceleratedRaycast } from 'three-mesh-bvh';
// Add the raycast function. Assumes the BVH is available on
// the `boundsTree` variable
Mesh.prototype.raycast = acceleratedRaycast;



//contains all objects and logic for the teleport tool
class TeleportTool {
    constructor(toolGroup,_userGroup,ObjectGroup,_scene,MESHUI,groundPlane) {
        this.mesh = new Mesh(new BoxGeometry(0.2, 0.2, 0.2), new MeshLambertMaterial({ color: 0x228866 }));;
        this.meshUI = MESHUI;
        this.objects = ObjectGroup; //group of objects to teleport on to

        this.raycaster = new Raycaster();
        this.groundPlane = groundPlane;
        this.archHeight = 1.5;
        this.groundHeight = 0;
        this.range = 6;

        this.tempMatrix = new Matrix4();
        this.tempVecP = new Vector3(0, 0, 0);
        this.tempVecP2 = new Vector3(0, 0, 0);
        this.tempVec = new Vector3(0, 1, 0);
        this.tempVecV = new Vector3(0, 0, 0);
        this.gravity = new Vector3(0, -9.8, 0);
        this.tempQuaternion = new Quaternion();


        this.scene = _scene;

        this.vrLocationMarker = new Mesh(new BoxGeometry(0.4, 1.6, 0.4), new MeshLambertMaterial({ color: 0x000fff }));
        this.userGroup = _userGroup;
        this.scene.add(this.vrLocationMarker);

        this.marker = new Mesh(new BoxGeometry(0.2, 0.2, 0.2), new MeshLambertMaterial({ color: 0xffff00 }));
        this.scene.add(this.marker);
        this.marker.visible = false;
        

        this.mesh.position.set(0.8, 1.5, -1);
        this.mesh.name = 'teleporter';
        toolGroup.add(this.mesh);

        //set guidline for teleportation
        this.lineSegments = 10; //make shure the number mathches (x+10)*3
        this.lineGeometryVerticies = new Float32Array((10 + 1) * 3);
        this.guideline = undefined;

        this.lineGeometryVerticies.fill(0);
        let lineGeometry = new BufferGeometry();
        lineGeometry.setAttribute('position', new BufferAttribute(this.lineGeometryVerticies, 3));
        let lineMaterial = new LineBasicMaterial({
            color: 0x888888,
            blending: AdditiveBlending,
        });
        this.guideline = new Line(lineGeometry, lineMaterial);

        this.guideline.visible = false;
        this.vrLocationMarker.visible = false;
        this.scene.add(this.guideline);

        this.toolMenuHandle = this.meshUI.createMenu(
            0.04, //height
            0.001, //menu height
            '', //handle text if empty hide handle
            false, //is it dragable ?
            false, //does it reoient itself when moved to face ray origin
            false, //is handle atached at the bottom
        );

        this.toolMenuHandle.position.x = -0.14;
        this.toolMenuHandle.position.y = 0.05;
        this.mesh.userData.UI = this.toolMenuHandle;

        
        this.moveSteps = [0.001,0.01,0.1,1,10];
        this.moveStep = 0.1;

        const moveButton = this.meshUI.addWideButton('FLOOR LEVEL', 0.04);
        this.toolMenuHandle.userData.menu.add(moveButton);
        
        this.selectorOffsetYtranslation = this.meshUI.addSliderDiscrete(0.04,100,-100,this.moveStep,() => {
            this.groundHeight = this.selectorOffsetYtranslation.userData.value;
            this.userGroup.position.y = this.groundHeight;
            this.tempVec.set(0,1,0);
            this.tempVecP.set(0,this.groundHeight,0);
            this.groundPlane.setFromNormalAndCoplanarPoint(this.tempVec,this.tempVecP);
        },"",3);
        this.selectorOffsetYtranslation.userData.value = 0; this.selectorOffsetYtranslation.userData.update();
        this.toolMenuHandle.userData.menu.add(this.selectorOffsetYtranslation);

        this.selectorTranslateStep = this.meshUI.addSliderDiscrete(0.04,4,0,1,() => {
            let value = this.selectorTranslateStep.userData.value;
            this.moveStep = this.moveSteps[value];
            if(3-value < 0){value = 3};
            this.selectorTranslateStep.userData.text.set({content: parseFloat(this.moveStep.toString()).toFixed(3-value)+"m"});
            this.selectorTranslateStep.userData.describe = "translate step floor";
            this.selectorOffsetYtranslation.userData.step = this.moveStep;
        },"0.1m",1);
        this.selectorTranslateStep.userData.value = 2; this.selectorTranslateStep.userData.update();
        this.toolMenuHandle.userData.menu.add(this.selectorTranslateStep);

        this.powerScale = this.meshUI.addSliderDiscrete(0.04,100,1,1,() => {this.range = this.powerScale.userData.value;},"RANGE",2);
        this.powerScale.userData.value = 6; this.powerScale.userData.update();
        this.toolMenuHandle.userData.menu.add(this.powerScale);

        const resetButton = this.meshUI.addWideButton('RESET TO 0', 0.04,()=>{
            this.groundHeight = 0; this.tempVec.set(0,1,0);
            this.tempVecP.set(0,this.groundHeight,0);
            this.groundPlane.setFromNormalAndCoplanarPoint(this.tempVec,this.tempVecP);
            this.userGroup.position.y = this.groundHeight;
        });
        this.toolMenuHandle.userData.menu.add(resetButton);

        this.toolMenuHandle.position.x = -0.14;
        this.toolMenuHandle.position.y = 0.05;
        this.mesh.add(this.toolMenuHandle);

    }

    calculateArc(inVec, t, p, v, g) {
        //izracuna pozicijo loka zoge v casu (t) k jo vrzemo s hitrostjo (v) v smeri (inVec) iz tocke (p) ce je gravitacija (g)
        inVec.copy(p);
        inVec.addScaledVector(v, t);
        inVec.addScaledVector(g, 0.5 * t ** 2);
        return inVec;
    }
    drawArcGuideline(p, v, t, g) {
        //go through time steps and calculate arc points
        this.archHeight = 1;
        for (let i = 0; i <= this.lineSegments; i++) {
            this.calculateArc(this.tempVec, (i * t) / this.lineSegments, p, v, g);
            this.tempVec.toArray(this.lineGeometryVerticies, i * 3);
            if((this.tempVec.y - this.groundHeight) > this.archHeight)this.archHeight = (this.tempVec.y - this.groundHeight);
        }
        this.guideline.geometry.attributes.position.needsUpdate = true; //reminds treejs to update the vertex buffer
    }


    toolShowHelperItems(){
        this.guideline.visible = true;
        this.vrLocationMarker.visible = true;
    }
    toolHideHelperItems(){
        this.guideline.visible = false;
        this.vrLocationMarker.visible = false;
        this.marker.visible = false;
    }
        
    toolAnimation(controller){

        const v = controller.userData.grippedObject.getWorldDirection(this.tempVecV);
        const p = controller.userData.grippedObject.getWorldPosition(this.tempVecP);

        v.multiplyScalar(this.range);
        const t = (-v.y + Math.sqrt(v.y ** 2 - 2 * (p.y-this.groundHeight) * this.gravity.y)) / this.gravity.y; //po kolikem casu zoga pride na y=0

        this.drawArcGuideline(p, v, t, this.gravity);
        this.calculateArc(this.tempVec, t, p, v, this.gravity);
        this.marker.position.copy(this.tempVec);

        controller.getWorldDirection(this.tempVec);
        this.tempVecV.set(this.tempVecV.x,0,this.tempVecV.z);
        this.tempVecP2.set(0,1,0)
        let angle = 0;
        if(this.tempVecV.z == 0 && this.tempVecV.x > 0){angle = Math.PI*1.5;}
        else if(this.tempVecV.z == 0 && this.tempVecV.x < 0){angle = Math.PI/2;}
        else if(this.tempVecV.z < 0 && this.tempVecV.x < 0){angle = Math.atan(this.tempVecV.x/this.tempVecV.z)-Math.PI}
        else if(this.tempVecV.z > 0 && this.tempVecV.x > 0){angle = Math.atan(this.tempVecV.x/this.tempVecV.z)}
        else if(this.tempVecV.x == 0 && this.tempVecV.z < 0){angle = Math.PI}
        else if(this.tempVecV.z > 0 && this.tempVecV.x < 0){angle = Math.atan(this.tempVecV.z/(this.tempVecV.x*-1))-Math.PI/2}
        else if(this.tempVecV.z < 0 && this.tempVecV.x > 0){angle = Math.atan((this.tempVecV.z*-1)/this.tempVecV.x)+Math.PI/2}
        this.vrLocationMarker.setRotationFromAxisAngle(this.tempVecP2,angle);

        //afix the marker to the floor if near the ground
        //BVH method of raycasting-----------------------------------------------------------------------------------------------------------------------------------------------------------------
        this.tempMatrix.identity().extractRotation(this.marker.matrixWorld);
        this.raycaster.ray.origin.setFromMatrixPosition(this.marker.matrixWorld);
        this.raycaster.ray.origin.y += this.archHeight;
        this.raycaster.ray.direction.set(0, -1, 0).applyMatrix4(this.tempMatrix);
        this.raycaster.firstHitOnly = true;
        let found = this.raycaster.intersectObjects(this.objects.children); //if object spawner corectly generated BVH for geometry this should work much faster
        if(found.length > 0){
            let intersaction = found[0];
            if((intersaction.point.y - this.groundHeight) > -3){ //snap to ground
                //this.vrLocationMarker.position.copy(intersaction.point);
                this.vrLocationMarker.position.copy(intersaction.point);
            }else{this.vrLocationMarker.position.copy(this.marker.position);}
        }else{this.vrLocationMarker.position.copy(this.marker.position);}
        
    }
    toolAction(){
        //TODO teleport animation interpolate to new position

        this.userGroup.position.copy(this.vrLocationMarker.position);
        this.groundHeight = this.vrLocationMarker.position.y;
        this.tempVec.set(0,1,0);
        this.tempVecP.set(0,this.groundHeight,0);
        this.groundPlane.setFromNormalAndCoplanarPoint(this.tempVec,this.tempVecP);
        this.selectorOffsetYtranslation.userData.value = this.groundHeight;
        this.selectorOffsetYtranslation.userData.update();
    }
}
export{TeleportTool};