import { TubePainter } from "../utils/TubePainter.js";
import { Group, IcosahedronGeometry, Vector3, Mesh, BoxGeometry, MeshLambertMaterial, Raycaster,Matrix4} from "three";

import { acceleratedRaycast } from 'three-mesh-bvh';
import ThreeMeshUI from 'three-mesh-ui';
// Add the raycast function. Assumes the BVH is available on
// the `boundsTree` variable
Mesh.prototype.raycast = acceleratedRaycast

class InspectTool{
    //give the tool a mesh to use
    constructor(_scene, toolGroup, objects, MESHUI, ifc, overlay){
        this.ifcManager = ifc;
        this.meshUI = MESHUI;
        this.mesh = new Mesh(new BoxGeometry(0.05, 0.01, 0.05), new MeshLambertMaterial({ color: 0x888888 }))
        this.scene = _scene;
        this.objects = objects;
        this.tempMatrix = new Matrix4();
        this.raycaster = new Raycaster();

        this.higlightMaterial = new MeshLambertMaterial({ color: 0x880022, transparent: true, opacity: 0.5 });

        this.infoWindow = new ThreeMeshUI.Block({
            width: 1,
            height: 2,
            fontSize: 0.5,
            borderRadius: 0.02,
            fontFamily: this.meshUI.defaultFontFamily,
            fontTexture: this.meshUI.defaultFontTexture,
            justifyContent: 'center',
            offset: 0.0001,
        });
        this.infoWindowText = new ThreeMeshUI.Text({ content: '', offset: 0.001 });
        this.infoWindow.add(this.infoWindowText);
        this.infoWindow.visible = false;
        //overlay.add(this.infoWindow);

      
        this.mesh.userData.UI = this.toolMenuHandle;
        this.mesh.add(this.toolMenuHandle);
        this.mesh.position.set(-0.2, 1.5, -1);
        this.mesh.name = 'inspectTool';
        this.pivot = new Mesh(new IcosahedronGeometry(0.01, 3));
        this.pivot.name = 'pivot';

        overlay.add(this.pivot);
        toolGroup.add(this.mesh);
    }
    toolAnimation(controller){

        this.tempMatrix.identity().extractRotation(controller.matrixWorld); //shoot a ray from a controller and find if it intersacts with a interactable object
        this.raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
        this.raycaster.ray.direction.set(0, 0, -1).applyMatrix4(this.tempMatrix);

        this.highlightIFCByRay(this.higlightMaterial, this.scene);

    }
    toolAction(){
        this.raycaster.firstHitOnly = true;
        let found = this.raycaster.intersectObjects(this.objects.children,false)[0];
        if (found) {
            console.log('get info', found);

            this.pivot.position.copy(found.point);
            if(!found.object.modelID){return;}
            const ifc = this.ifcManager;
            const modelID = found.object.id;
            const index = found.faceIndex;
            const geometry = found.object.geometry;
            const id = this.ifcManager.getExpressId(geometry, index);
            const props = ifc.getItemProperties(modelID, id);
            const info = JSON.stringify(props, null, 2);
            console.log(info);
        }

    }
    toolHideHelperItems(){

    }
    toolShowHelperItems(){

    }
    highlightIFCByRay(material,_scene) {
        this.raycaster.firstHitOnly = true;
        let found = this.raycaster.intersectObjects(this.objects.children,false)[0];
        try {
            if (found) {
                // Gets model ID
                this.pivot.position.copy(found.point);
                if(!found.object.modelID){return;}
                this.model = found.object;
                
        
                // Gets Express ID
                const index = found.faceIndex;
                const geometry = found.object.geometry;
                const id = this.ifcManager.getExpressId(geometry, index);

                // Creates subset
                
                this.ifcManager.createSubset({
                    modelID: this.model.modelID,
                    ids: [id],
                    material: material,
                    scene: _scene,
                    removePrevious: true
                })
                
            } else if(this.model) {
                // Removes previous highlight
                this.ifcManager.removeSubset(this.model.modelID, material);
                this.model = undefined;
            }
            
        } catch (error) {
            console.log(error.message);
        }
    }
    

}
export{InspectTool}
