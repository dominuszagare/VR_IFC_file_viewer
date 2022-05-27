import { Vector3, Color, TextureLoader, Plane, Matrix4, Quaternion,Mesh,IcosahedronGeometry } from 'three';
import ThreeMeshUI from 'three-mesh-ui';
//import files....
import robotoFont_msdf from '../../fonts/Roboto-Regular-msdf.json';
import robotoFontImage from '../../fonts/Roboto-Regular.png';
import dropLogoImage from '../../images/drop.png';
import plusImage from '../../images/plus.png';
import minusImage from '../../images/minus.png';

//GUI parameters
//TODO move sphere at intersection point (low priority) to help indicate what is being selected
//TODO add menu sounds that give audio feedback to the user
//TODO create slider UI element (works similar to draging menu handle but movment is limited to 1 axis)
class MeshUI {
    constructor(frezeCam, unfreezeCam) {
        this.GUI_elements = [];
        this.HighlitedGUIelements = [];
        this.HoveredGUIobject = undefined;
        this.DragedGUIobject = undefined;

        //for draging UI elements in 3D space
        this.TempPlane = new Plane();
        this.camPoz = new Vector3(0, 1.6, 0);
        this.RayPoz = new Vector3(0, 0, 0);
        this.planeNormal = new Vector3(0, 0, 1);
        this.coplanarPoint = new Vector3(0, 0, 0);
        this.tempVec3P = new Vector3(0, 0, 0);
        this.tempVec3P2 = new Vector3(0, 0, 0);
        this.tempVec3 = new Vector3(0, 0, 0);
        this.tempMatrix4 = new Matrix4();
        this.tempQuaternion = new Quaternion();
        this.uiDistance = 4;
        this.frezeCam = frezeCam;
        this.unfreezeCam = unfreezeCam;

        this.textureLoader = new TextureLoader();
        this.point = new Mesh(new IcosahedronGeometry(0.01, 3));

        this.defaultFontFamily = robotoFont_msdf
        this.defaultFontTexture = robotoFontImage;
        this.hoveredStateAttributes = {
            state: 'hovered',
            attributes: {
                offset: 0.0008,
                backgroundColor: new Color(0x595959),
                backgroundOpacity: 1,
                fontColor: new Color(0xffffff),
            },
        };
        this.idleStateAttributes = {
            state: 'idle',
            attributes: {
                offset: 0.0005,
                backgroundColor: new Color(0x222222),
                backgroundOpacity: 1,
                fontColor: new Color(0xffffff),
            },
        };
        this.idleWhiteStateAttributes = {
            state: 'idle',
            attributes: {
                offset: 0.0005,
                backgroundColor: new Color(0xffffff),
                backgroundOpacity: 1,
                fontColor: new Color(0x222222),
            },
        };
        this.pressedStateAttributes = {
            state: 'pressed',
            attributes: {
                offset: 0.0001,
                backgroundColor: new Color(0x999999),
                backgroundOpacity: 1,
                fontColor: new Color(0xffffff),
            },
        };
    }

    //returns a button with all needed constructs
    addWideButton(textString, height, onClick = undefined, toggle = false) {
        let fontSize = height / 2;
        let margin = height / 20;
        let borderRadius = height / 6;
        let button = new ThreeMeshUI.Block({
            width: height * 4.2,
            height: height,
            fontSize: fontSize,
            margin: margin,
            borderRadius: borderRadius,
            fontFamily: this.defaultFontFamily,
            fontTexture: this.defaultFontTexture,
            justifyContent: 'center',
            offset: 0.0001,
        });
        const text = new ThreeMeshUI.Text({ content: textString, offset: 0.001 });
        button.add(text);
        if(onClick != undefined){
            button.setupState(this.hoveredStateAttributes);
            button.setupState(this.pressedStateAttributes);
            this.GUI_elements.push(button.frame);
        }
        button.setupState(this.idleStateAttributes);
        button.name = 'button';
        button.frame.userData.button = button;
        button.frame.userData.OnClick = onClick;
        button.frame.userData.OnClickAlternative = undefined;
        button.frame.userData.toggle = toggle;
        button.frame.userData.on = false;
        button.setState('idle');

        return button;
    }
    addSquareImageButton(height, textString, imageURL, onClick = undefined, toggle = false) {
        let fontSize = height / 4;
        let margin = height / 20;
        let borderRadius = height / 6;
        let button = new ThreeMeshUI.Block({
            width: height,
            height: height,
            fontSize: fontSize,
            margin: margin,
            borderRadius: borderRadius,
            fontFamily: this.defaultFontFamily,
            fontTexture: this.defaultFontTexture,
            justifyContent: 'center',
            offset: 0.001,
            borderOpacity: 1,
        });
        const text = new ThreeMeshUI.Text({ content: textString, offset: 0.001 });
        button.add(text);
        button.setupState(this.hoveredStateAttributes);
        button.setupState(this.idleWhiteStateAttributes);
        button.setupState(this.pressedStateAttributes);
        button.name = 'buttonSquare';
        button.frame.userData.button = button;
        button.frame.userData.OnClick = onClick;
        button.frame.userData.OnClickAlternative = undefined;
        button.frame.userData.toggle = toggle;
        button.frame.userData.on = false;
        if(imageURL.length == 0){button.setupState(this.idleStateAttributes);}else{
            this.textureLoader.load(imageURL, (texture) => {
                button.set({ backgroundTexture: texture });
            });
        }
        this.GUI_elements.push(button.frame);
        button.setState('idle');

        return button;
    }

    //TODO crete rotation gizmo ui

    //TODO create a continuos non discrete version that can be horizontal or vertical
    addSliderDiscrete(height, max, min, step, onChange = undefined, _describe = "", percision = 2) {
        let fontSize = height / 2;
        let margin = height / 20;
        let borderRadius = height / 6;
        let slider = new ThreeMeshUI.Block({
            width: height * 4.2,
            height: height,
            fontSize: fontSize,
            margin: margin,
            borderRadius: borderRadius,
            fontFamily: this.defaultFontFamily,
            fontTexture: this.defaultFontTexture,
            justifyContent: 'center',
            offset: 0.0001,
        });
        slider.userData.text = new ThreeMeshUI.Text({ content: _describe, offset: 0.001 });
        slider.userData.describe = _describe;
        slider.userData.max = max;
        slider.userData.min = min;
        slider.userData.step = step;
        slider.userData.value = 0.0;
        slider.userData.onChange = onChange;
        slider.userData.update = ()=>{
            let value = slider.userData.value
            let describe = slider.userData.describe;
            if(value < slider.userData.min){value = slider.userData.min;}
            if(value > slider.userData.max){value = slider.userData.max;}
            if(value == slider.userData.max){up.visible = false;}
            else{up.visible = true;}
            if(value == slider.userData.min){down.visible = false;}
            else{down.visible = true;}
            if(describe.length > 0){slider.userData.text.set({content: describe});}else{slider.userData.text.set({content: parseFloat(value.toString()).toFixed(percision)});}
            slider.userData.value = value;
        }
        slider.add(slider.userData.text);

        let up = this.addSquareImageButton(height,'',plusImage,()=>{
            slider.userData.value += slider.userData.step;
            slider.userData.update();
            if(onChange)onChange();
        });
        slider.add(up);
        up.autoLayout = false;
        up.position.set(height * 2.1-(height/2), 0, 0);
        let down = this.addSquareImageButton(height,'',minusImage,()=>{
            slider.userData.value -= slider.userData.step;
            slider.userData.update();
            if(onChange)onChange();
        });
        slider.add(down);
        down.autoLayout = false;
        down.position.set(height * -2.1+(height/2), 0, 0);
        slider.userData.update();
        
        return slider;
    }

    createMenu(height, menuHeight, text = '', draggable = true, reorient = false, handleAtBottom = false) {
        let fontSize = height / 2;
        let margin = height / 20;
        let width = height * 4.2;
        let borderRadius = height / 6;
        let grabHandleButton = new ThreeMeshUI.Block({
            width: width - height,
            height: height,
            fontSize: fontSize,
            margin: margin,
            fontFamily: this.defaultFontFamily,
            fontTexture: this.defaultFontTexture,
            justifyContent: 'center',
            borderRadius: borderRadius,
            offset: 0.0001,
        });

        //create handle for menu
        if (draggable) {
            grabHandleButton.setupState(this.hoveredStateAttributes);
            grabHandleButton.setupState(this.idleStateAttributes);
            grabHandleButton.setupState(this.pressedStateAttributes);
            
            grabHandleButton.name = 'menuHandle';
            grabHandleButton.frame.userData.button = grabHandleButton;
            grabHandleButton.frame.userData.reorient = reorient;
            grabHandleButton.frame.userData.toggle = false;
            grabHandleButton.frame.userData.on = false;
            grabHandleButton.frame.userData.OnClick = () => {this.StartDragingItem(grabHandleButton);};
            grabHandleButton.frame.userData.OnClickAlternative = undefined;

            this.GUI_elements.push(grabHandleButton.frame);
        }
        if (text.length != 0) {
            const text0 = new ThreeMeshUI.Text({ content: text, offset: 0.001 });
            grabHandleButton.add(text0);
        } else {
            grabHandleButton.frame.visible = false;
        }

        grabHandleButton.setState('idle');

        let menuWindow = new ThreeMeshUI.Block({
            width: width,
            height: menuHeight,
            fontSize: fontSize,
            margin: margin,
            justifyContent: 'start',
            borderOpacity: 1,
            offset: 0.0001,
        });
        //add menu to the handle
        grabHandleButton.add(menuWindow);

        menuWindow.setupState( {
            state: 'hidden-on',
            attributes: { hiddenOverflow: true }
        } )
        menuWindow.setState( 'hidden-on' );

        menuWindow.autoLayout = false;
        menuWindow.visible = false;
        if (handleAtBottom) {
            menuWindow.position.set(height / 2, menuHeight/2 + height / 2, 0);
        } else {
            menuWindow.position.set(height / 2, menuHeight/-2 - height / 2, 0);
        }
        grabHandleButton.userData.menu = menuWindow;

        let showHideButton = new ThreeMeshUI.Block({
            width: height,
            height: height,
            justifyContent: 'center',
            offset: 0.001,
        });
        showHideButton.setupState(this.hoveredStateAttributes);
        showHideButton.setupState(this.idleWhiteStateAttributes);
        showHideButton.setupState(this.pressedStateAttributes);
        showHideButton.frame.userData.button = showHideButton;
        showHideButton.frame.userData.toggle = false;
        showHideButton.frame.userData.on = false;
        showHideButton.frame.userData.OnClick = () => {
            if (menuWindow.visible) menuWindow.visible = false;
            else menuWindow.visible = true;
        }; //hide show menu
        this.GUI_elements.push(showHideButton.frame);
        //add show hide button to handle
    
        grabHandleButton.add(showHideButton);
        showHideButton.autoLayout = false;
        showHideButton.position.set((width - height) / 2 + height / 2, 0, 0); //on right
        showHideButton.setState('idle');
        this.textureLoader.load(dropLogoImage, (texture) => {
            showHideButton.set({ backgroundTexture: texture });
        });
        return grabHandleButton;
    }
    createButtonGrid(items, itemWidth, height = 1, rows=1, toggle = false, exclusive = false) {
        //create a hiden overfolw button grid with a scrollbar
        let width = height* 4.2;
        let borderRadius = height / 6;
        let container = new ThreeMeshUI.Block( {
            height: itemWidth*rows,
            width: width,
            padding: 0.001,
            justifyContent: 'center',
            borderRadius: borderRadius,
            offset: 0.001,
        } );
        container.userData.height = itemWidth*rows;
        container.userData.selectedItem = undefined;
        container.userData.selectedButton = undefined;
        container.userData.hideSlider = ()=>{selector.visible = false;}
        container.userData.showSlider = ()=>{selector.visible = true;}
        var x = 0;
        var y =  0;
        var row = 0;
        var Offset = 0;
        var buttons = [];

        let selector = this.addSliderDiscrete(height,0,0,1,() => {
            let value = selector.userData.value;
            x = 0;
            y =  0;
            row = 0;
            Offset = value*-1;
            for(let b of buttons){
                if(x*itemWidth + itemWidth > width){
                    y -= itemWidth;
                    if(row == rows-1){Offset += x; y = 0;}
                    x = 0;
                    row += 1;
                }
                if((x+Offset+1)*itemWidth < width && (x+Offset+1)*itemWidth > 0){
                    b.visible = true;
                    b.position.set((x+Offset)*itemWidth - width/2 + itemWidth/2, y - itemWidth/2 + container.userData.height/2, 0.001);
                }
                else{
                    b.visible = false;
                    b.position.set((x+Offset)*itemWidth - width/2 + itemWidth/2, y - itemWidth/2 + container.userData.height/2, 0.001);
                }
                
                x += 1;
            }
            
        },"",0);
        selector.autoLayout = false;
        selector.position.set(0,itemWidth*(rows*-1) - height/2 + container.userData.height/2,0.002);
        container.add(selector);


        container.userData.addButton = (item)=>{
            if(x*itemWidth + itemWidth > width){
                y -= itemWidth;
                if(row == rows-1){Offset += x; y = 0;}
                x = 0;
                row += 1;
            }
            let button = this.addSquareImageButton(itemWidth, item.text, item.imageURL, () => {
                if(item.onClick)item.onClick();
                container.userData.selectedItem = item;
                container.userData.selectedButton = button; //will this work? refrencing varible in a function that defines it
                if(exclusive){ //turn off all other buttons
                    for(const b of buttons){
                        if(button != b){
                            b.frame.userData.on = false;
                            b.setState('idle');
                        }
                    }
                    //ThreeMeshUI.update();
                }
            },toggle);
            if(Offset != 0){button.visible = false;}
            button.frame.userData.item = item; //save item in userData for later use
            container.add(button);
            buttons.push(button);
            button.set(item.applayPropreties);
            button.autoLayout = false;
            button.position.set((x+Offset)*itemWidth - width/2 + itemWidth/2, y + itemWidth/2, 0.001);
            x += 1;

            selector.userData.max = Offset
            selector.userData.value = Offset;
            selector.userData.update();
            selector.userData.onChange();
        }
        container.userData.update = ()=>{
            selector.userData.update();
            selector.userData.onChange();
        }

        for(const item of items){
            container.userData.addButton(item);
        }
        return container
    }

    StartDragingItem(item){
        this.DragedGUIobject = item;
        this.DragedGUIobject.getWorldPosition(this.coplanarPoint);
        this.uiDistance = this.coplanarPoint.distanceTo(this.RayPoz);
        this.frezeCam();
    }
    //raycast GUI elements and execute draging, howering, and clicking logic
    raycastGUIelements(raycaster, renderFunction=undefined) {
        //clean up elements
        if (this.HighlitedGUIelements.length > 0) {
            let object = this.HighlitedGUIelements.pop();
            if (object.userData.toggle && object.userData.on) {
                object.userData.button.setState('pressed');
            } else {
                object.userData.button.setState('idle');
            }
            ThreeMeshUI.update();
            if(renderFunction)renderFunction(); //usaly requset a new frame to make changes visible
        }
        if (this.HighlitedGUIelements.length == 0) {
            this.HoveredGUIobject = undefined;
        }

        if (this.DragedGUIobject != undefined) {
            
            this.tempVec3P.copy(raycaster.ray.origin); //origin is in world cordinates
            this.tempVec3.copy(raycaster.ray.direction);
            this.tempVec3.x *= this.uiDistance;
            this.tempVec3.y *= this.uiDistance;
            this.tempVec3.z *= this.uiDistance;
            this.tempVec3P.add(this.tempVec3); //world position of the point

            if(this.DragedGUIobject.name == 'menuHandle'){
                this.DragedGUIobject.parent.getWorldPosition(this.tempVec3);
                this.tempVec3P.sub(this.tempVec3); //get vector in local space substract the parent position
                this.tempQuaternion.copy(this.DragedGUIobject.parent.quaternion);
                this.tempVec3P.applyQuaternion(this.tempQuaternion.invert()); //rotate vector to aling with local cordinates
                this.DragedGUIobject.position.copy(this.tempVec3P);

                if (this.DragedGUIobject.frame.userData.reorient) {
                    //reorient the object so its loking to the ray origin
                    this.DragedGUIobject.lookAt(raycaster.ray.origin);
                }
            }

            renderFunction();

        } else {
            if(this.GUI_elements.length > 0){
                let visibleGUIelements = []; //raycast seka samo elemente ki so vidni nevidne ignoriraj
                this.GUI_elements.forEach((element) => {
                    if(element.parent.parent.parent && element.parent.parent && element.parent ){
                        if(element.parent.parent.parent.visible && element.parent.parent.visible && element.parent.visible){
                            visibleGUIelements.push(element);
                        }
                    }
                    else if(element.parent.parent && element.parent){
                        if (element.parent.parent.visible && element.parent.visible) visibleGUIelements.push(element);
                    }
                    else if(element.parent && element.parent.visible){
                        visibleGUIelements.push(element);
                    }
                });

                const ui = raycaster.intersectObjects(visibleGUIelements, false);
                if (ui.length > 0) {
                    this.RayPoz.copy(raycaster.ray.origin);
                    let object = ui[0].object;
                    this.point.position.copy(ui[0].point);
                    this.point.visible = true;
                    if (object.userData.button != undefined) {
                        if (this.HoveredGUIobject != object) {
                            object.userData.button.setState('hovered');
                            this.HoveredGUIobject = object;
                            this.HighlitedGUIelements.push(object);

                            renderFunction();
                            ThreeMeshUI.update();
                        }
                    }
                }else{
                    this.point.visible = false;
                }
            }
        }
    }
    //ob pritisku gumba izvedi funkcijo gumba nad katerim smo
    onSelect(renderFunction = undefined) {
        this.point.visible = false;
        if (this.HoveredGUIobject != undefined) {
            this.HoveredGUIobject.userData.button.setState('pressed');
            if (this.HoveredGUIobject.userData != undefined) {
                this.HoveredGUIobject.userData.OnClick();
            }
            if (this.HoveredGUIobject.userData.on) {
                this.HoveredGUIobject.userData.on = false;
            } else {
                this.HoveredGUIobject.userData.on = true;
            }
            ThreeMeshUI.update();
            if(renderFunction)renderFunction(); //show changes
        }
    }
    onSelectAlternative(renderFunction = undefined) {
        this.point.visible = false;
        if (this.HoveredGUIobject != undefined) {
            this.HoveredGUIobject.userData.button.setState('pressed');
            if (this.HoveredGUIobject.userData.OnClickAlternative != undefined) {
                this.HoveredGUIobject.userData.OnClickAlternative();
            }
            if (this.HoveredGUIobject.userData.on) {
                this.HoveredGUIobject.userData.on = false;
            } else {
                this.HoveredGUIobject.userData.on = true;
            }
            ThreeMeshUI.update();
            if(renderFunction)renderFunction(); //show changes
        }
    }
    onRelese() {
        this.DragedGUIobject = undefined;
        this.unfreezeCam();
    }
    update(){
        ThreeMeshUI.update();
    }
}
export { MeshUI };
