import { TubePainter } from "../utils/TubePainter.js";
import { Group, IcosahedronGeometry, Vector3, Mesh, BoxGeometry, MeshLambertMaterial} from "three";

import yellowIconImage from "../../images/yellow.png"
import blueIconImage from "../../images/blue.png"
import greenIconImage from "../../images/green.png"
import redIconImage from "../../images/red.png"
import whiteIconImage from "../../images/white.png"


class PainterTool{
    //give the tool a mesh to use
    constructor(_scene, toolGroup, MESHUI){
        this.meshUI = MESHUI;
        this.mesh = new Mesh(new BoxGeometry(0.05, 0.2, 0.05), new MeshLambertMaterial({ color: 0x888888 }))
        this.scene = _scene;

        //TODO save pencil strokes to painterStrokes group on controler squezeEnd and selectEnd while holding pencil tool
        this.painterStrokesGroup = new Group(); //group holding all strokes meshes
        this.painterStrokes = [];
        this.strokeNum = 0;
        this.tempVec = new Vector3();
        this.painter = new TubePainter();

        this.selectedItem = undefined;
        this.selectedColor = 0xffffff;
        this.painterSize = 0.1;

        let items = [];
        items.push({
            text: "",
            imageURL: yellowIconImage,
            applayPropreties: {borderRadius: 0.02},
            onClick: ()=>{this.selectedColor = 0xfff708; this.painter.setColor(this.selectedColor);},
        });
        items.push({
            text: "",
            imageURL: blueIconImage,
            applayPropreties: {borderRadius: 0.02},
            onClick: ()=>{this.selectedColor = 0x0000ff; this.painter.setColor(this.selectedColor);},
        });
        items.push({
            text: "",
            imageURL: redIconImage,
            applayPropreties: {borderRadius: 0.02},
            onClick: ()=>{this.selectedColor = 0xff3108; this.painter.setColor(this.selectedColor);},
        });
        items.push({
            text: "",
            imageURL: greenIconImage,
            applayPropreties: {borderRadius: 0.02},
            onClick: ()=>{this.selectedColor = 0x00ff00; this.painter.setColor(this.selectedColor);},
        });
        items.push({
            text: "",
            imageURL: whiteIconImage,
            applayPropreties: {borderRadius: 0.02},
            onClick: ()=>{this.selectedColor = 0xffffff; this.painter.setColor(this.selectedColor);},
        });

        this.toolMenuHandle = this.meshUI.createMenu(
            0.04, //height
            0.0001, //menu height
            '', //handle text if empty hide handle
            false, //is it dragable ?
            false, //does it reoient itself when moved to face ray origin
            false, //is handle atached at the bottom
        );

        //TODO create better color and size selector
        this.selectorSize = this.meshUI.addSliderDiscrete(0.04,10,0.1,0.1,() => {
            let value = this.selectorSize.userData.value;
            this.painter.setSize(value);
            this.painterSize = value;
        });
        this.selectorSize.userData.value = 1;
        this.painter.setSize(1);
        this.selectorSize.userData.update();

        this.toolMenuHandle.userData.menu.add(this.selectorSize)
        this.coolorGrid = this.meshUI.createButtonGrid(items,0.04,0.04,2,true,true);
        this.coolorGrid.userData.hideSlider();
        this.toolMenuHandle.userData.menu.add(this.coolorGrid);

        this.toolMenuHandle.position.x = -0.12;
        this.toolMenuHandle.position.y = 0.05;
        this.mesh.userData.UI = this.toolMenuHandle;
        this.mesh.add(this.toolMenuHandle);
        this.mesh.position.set(0.5, 1.5, -1);
        this.mesh.name = 'pencil';
        this.pivot = new Mesh(new IcosahedronGeometry(0.01, 3));
        this.pivot.name = 'pivot';
        this.pivot.position.z = -0.05;
        this.mesh.add(this.pivot);
        toolGroup.add(this.mesh);
        this.scene.add(this.painter.mesh);
        this.scene.add(this.painterStrokesGroup);
        

        this.undoRedo = this.meshUI.addSliderDiscrete(0.04,0,0,1,() => {
            //hide objects before index
            this.strokeNum = this.undoRedo.userData.value;
            for (let i = 0; i < this.painterStrokes.length; i++) {
                if(i <= this.strokeNum){
                    this.painterStrokes[i].visible = true;
                }else{
                    this.painterStrokes[i].visible = false;
                }
            }
        },"undo/redo");
        this.toolMenuHandle.userData.menu.add(this.undoRedo)


        this.toolActionEnd();

    }
    toolAction(){
        this.tempVec.setFromMatrixPosition(this.pivot.matrixWorld);
        this.painter.lineTo(this.tempVec);
        this.painter.update();
    }
    toolActionEnd(){
        //TODO limit the number of strokes
        let stroke = this.painter.mesh;
        this.strokeNum += 1;
        if(this.painterStrokes.length > this.strokeNum){
            this.painterStrokes[this.strokeNum].copy(stroke);
        }
        else{
            this.painterStrokesGroup.add(stroke);
            this.painterStrokes.push(stroke);
            this.undoRedo.userData.max = this.painterStrokes.length - 1;
        }
        this.undoRedo.userData.value = this.strokeNum;
        this.undoRedo.userData.update();
        console.log("new stroke", this.undoRedo.userData.value, this.strokeNum);

        //increase undoRedo index
        this.scene.remove(this.painter.mesh);
        this.painter = new TubePainter();
        this.painter.setSize(this.selectorSize.userData.value);
        this.tempVec.setFromMatrixPosition(this.pivot.matrixWorld);
        this.painter.moveTo(this.tempVec);
        this.scene.add(this.painter.mesh);
        

    }
    updatePivotPosition(){
        this.tempVec.setFromMatrixPosition(this.pivot.matrixWorld);
        this.painter.moveTo(this.tempVec);
        this.painter.setColor(this.selectedColor);
    }

}
export{PainterTool}