import { TubePainter } from "../utils/TubePainter.js";
import { Group, IcosahedronGeometry, Vector3, Mesh, BoxGeometry, MeshLambertMaterial, Raycaster,Matrix4} from "three";

import { acceleratedRaycast } from 'three-mesh-bvh';
import ThreeMeshUI from 'three-mesh-ui';
// Add the raycast function. Assumes the BVH is available on
// the `boundsTree` variable
Mesh.prototype.raycast = acceleratedRaycast

class InspectTool{
    //give the tool a mesh to use
    constructor(_scene, objects, MESHUI, ifc, overlay,guiGroup, XR){
        this.ifcManager = ifc;
        this.meshUI = MESHUI;
        this.mesh = new Mesh(new BoxGeometry(0.01, 0.01, 0.01), new MeshLambertMaterial({ color: 0x888888 }))
        this.scene = _scene;
        this.objects = objects;
        this.tempMatrix = new Matrix4();
        this.raycaster = new Raycaster();
        this.GUI_Group = guiGroup;
        this.xr = XR;

        this.higlightMaterial = new MeshLambertMaterial({ color: 0x880022, transparent: true, opacity: 0.5 });

        this.infoWindow = new ThreeMeshUI.Block({
            width: 1.5,
            height: 2,
            justifyContent: 'start',
            offset: 0.0001,
            hiddenOverflow: true,
        });
        let overflowWindow = new ThreeMeshUI.Block({
            width: 1.5,
            height: 3,
            fontSize: 0.07,
            fontFamily: this.meshUI.defaultFontFamily,
            fontTexture: this.meshUI.defaultFontTexture,
            justifyContent: 'start',
            textAlign: 'left',
            offset: 0.0001,
            hiddenOverflow: true,
            
        });
        this.infoWindowText = new ThreeMeshUI.Text({ content: '', offset: 0.001,});
        overflowWindow.add(this.infoWindowText);
        this.infoWindow.add(overflowWindow);
        this.infoWindow.visible = false;
        overlay.add(this.infoWindow);

      
        this.mesh.userData.UI = this.toolMenuHandle;
        this.mesh.add(this.toolMenuHandle);
        this.mesh.position.set(-0.2, 1.5, -1);
        this.mesh.name = 'inspectTool';
        this.pivot = new Mesh(new IcosahedronGeometry(0.01, 3));
        this.pivot.name = 'pivot';

        overlay.add(this.pivot);
    }
    toolAnimation(controller){

        this.tempMatrix.identity().extractRotation(controller.matrixWorld); //shoot a ray from a controller and find if it intersacts with a interactable object
        this.raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
        this.raycaster.ray.direction.set(0, 0, -1).applyMatrix4(this.tempMatrix);

        if(this.xr.isPresenting){this.infoWindow.lookAt(this.raycaster.ray.origin);}
        else{
            this.infoWindow.quaternion.copy(this.GUI_Group.quaternion);
        }
        


        let d = this.infoWindow.position.distanceTo(this.raycaster.ray.origin)
        this.infoWindow.scale.set(d/4,d/4,d/4);

        this.highlightIFCByRay(this.higlightMaterial, this.scene);

    }
    async toolAction(){
        try {
            this.raycaster.firstHitOnly = true;
            let found = this.raycaster.intersectObjects(this.objects.children,false)[0];
            if (found) {
                //console.log(found, found.object.modelID, );
                this.pivot.position.copy(found.point);
                if(!found.object.modelID || !found.object.userData.original){return;}
                let originalModel = found.object.userData.original;
                originalModel.position.copy(found.object.position);
                originalModel.quaternion.copy(found.object.quaternion);

                let hit = this.raycaster.intersectObjects([originalModel],false)[0];
                const index = hit.faceIndex;
                const geometry = hit.object.geometry;
                const ifc = this.ifcManager;
                const id = ifc.getExpressId(geometry, index);
                const modelID = hit.object.modelID;
                console.log('info', id, modelID);
                const props = await ifc.getItemProperties(modelID, id);
                const info = JSON.stringify(props, null, 2);
                console.log(info);
                this.infoWindow.position.copy(found.point);
                this.infoWindow.lookAt(this.raycaster.ray.origin);
                this.infoWindow.visible = true;
                let d = this.infoWindow.position.distanceTo(this.raycaster.ray.origin)
                this.infoWindow.translateX(0.8*(d/4));
                this.infoWindowText.set({content: info});
                this.meshUI.update();

            }
            
        } catch (error) {
            console.log(error.message);  
        }
    }
    toolHideHelperItems(){
        this.infoWindow.visible = false;

    }
    toolShowHelperItems(){

    }
    highlightIFCByRay(material,_scene) {
        this.raycaster.firstHitOnly = true;
        let found = this.raycaster.intersectObjects(this.objects.children,false)[0];
        try {
            if (found) {
                // Gets model ID
                if(!found.object.modelID || !found.object.userData.original){return;}
                this.pivot.position.copy(found.point);

                /*
                let originalModel = found.object.userData.original;
                originalModel.position.copy(found.object.position);
                originalModel.quaternion.copy(found.object.quaternion);
                this.model = originalModel.modelID;

                let hit = this.raycaster.intersectObjects([originalModel],false)[0];
                const modelID = hit.object.modelID;
                // Gets Express ID
                const index = hit.faceIndex;
                const geometry = hit.object.geometry;
                const id = this.ifcManager.getExpressId(geometry, index);

                // Creates subset
                
                this.ifcManager.createSubset({
                    modelID: found.object.modelID,
                    ids: [id],
                    material: material,
                    scene: _scene,
                    removePrevious: true
                })
                */
                
            } else if(this.model) {
                // Removes previous highlight
                this.ifcManager.removeSubset(this.model, material);
                this.model = undefined;
            }
            
        } catch (error) {
            console.log(error.message);
        }
    }
    

}
export{InspectTool}
