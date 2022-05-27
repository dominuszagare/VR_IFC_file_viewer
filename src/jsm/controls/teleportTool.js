import { Vector3,
    BoxGeometry,
    Raycaster,
    Line, BufferGeometry,
    BufferAttribute, Matrix4, Quaternion,
    Mesh, MeshLambertMaterial,LineBasicMaterial,
    AdditiveBlending} from "three";


//contains all objects and logic for the teleport tool
class TeleportTool {
    constructor(toolGroup,_userGroup,ObjectGroup,_scene,MESHUI,groundPlane) {
        this.mesh = new Mesh(new BoxGeometry(0.2, 0.2, 0.2), new MeshLambertMaterial({ color: 0x228866 }));;
        this.meshUI = MESHUI;
        this.objects = ObjectGroup; //group of objects to teleport on to
        this.raycaster = new Raycaster();
        this.groundPlane = groundPlane;

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

        this.offsetYtranslate = 0;
        this.moveSteps = [0.001,0.01,0.1,1,10];
        this.moveStep = 0.1;

        const moveButton = this.meshUI.addWideButton('FLOOR LEVEL', 0.04);
        this.toolMenuHandle.userData.menu.add(moveButton);
        
        this.selectorOffsetYtranslation = this.meshUI.addSliderDiscrete(0.04,100,-100,this.moveStep,() => {
            this.offsetYtranslate = this.selectorOffsetYtranslation.userData.value;
            this.userGroup.position.y = this.offsetYtranslate;
            this.tempVec.set(0,1,0);
            this.tempVecP.set(0,this.offsetYtranslate,0);
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
        for (let i = 0; i <= this.lineSegments; i++) {
            this.calculateArc(this.tempVec, (i * t) / this.lineSegments, p, v, g);
            this.tempVec.toArray(this.lineGeometryVerticies, i * 3);
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
    }
        
    toolAnimation(controller){
        //use raycaster sparingly there is a lot of objects in the scene
        /*
        this.tempMatrix.identity().extractRotation(controller.matrixWorld); //shoot a ray from a controller and find if it intersacts with a interactable object
        this.raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
        this.raycaster.ray.direction.set(0, 0, -1).applyMatrix4(this.tempMatrix);
        let found = this.raycaster.intersectObjects(this.objects.children, false); //do not use recursion to check for intersection whith all children 
        */

        

        const v = controller.userData.grippedObject.getWorldDirection(this.tempVecV);
        const p = controller.userData.grippedObject.getWorldPosition(this.tempVecP);

        v.multiplyScalar(12);
        const t = (-v.y + Math.sqrt(v.y ** 2 - 2 * (p.y-this.offsetYtranslate) * this.gravity.y)) / this.gravity.y; //po kolikem casu zoga pride na y=0

        this.drawArcGuideline(p, v, t, this.gravity);
        this.calculateArc(this.tempVec, t, p, v, this.gravity);
        this.vrLocationMarker.position.copy(this.tempVec);

        controller.getWorldDirection(this.tempVec);
        this.tempVecV.set(this.tempVecV.x,0,this.tempVecV.z);
        this.tempVecP2.set(0,1,0)
        let angle = 0;
        if(this.tempVecV.z == 0 && this.tempVecV.x > 0){angle = Math.PI*1.5;}
        else if(this.tempVecV.z == 0 && this.tempVecV.x < 0){angle = Math.PI/2;}
        else if(this.tempVecV.z < 0 && this.tempVecV.x < 0){angle = Math.atan(this.tempVecV.x/this.tempVecV.z)-Math.PI}
        else if(this.tempVecV.z > 0 && this.tempVecV.x > 0){angle = Math.atan(this.tempVecV.x/this.tempVecV.z)}
        else if(this.tempVecV.x == 0 && this.tempVecV.z > 0){angle = 0}
        else if(this.tempVecV.x == 0 && this.tempVecV.z < 0){angle = Math.PI}
        else if(this.tempVecV.z > 0 && this.tempVecV.x < 0){angle = Math.atan(this.tempVecV.z/(this.tempVecV.x*-1))-Math.PI/2}
        else if(this.tempVecV.z < 0 && this.tempVecV.x > 0){angle = Math.atan((this.tempVecV.z*-1)/this.tempVecV.x)+Math.PI/2}
        this.vrLocationMarker.setRotationFromAxisAngle(this.tempVecP2,angle);
        
    }
    toolAction(){
        //TODO teleport animation interpolate to new position

        this.userGroup.position.copy(this.vrLocationMarker.position);
    }
}
export{TeleportTool};