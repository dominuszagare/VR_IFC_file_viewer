import { MeshLambertMaterial } from "three";

class Utility{
    constructor(){

        this.selectMat = new MeshLambertMaterial({ color: 0xff00ff, transparent: true, opacity: 0.5, depthTest: false});
        this.preselectMat = new MeshLambertMaterial({ transparent: true, opacity: 0.6, color: 0xff88ff, depthTest: false});
        this.preselectModel = { id: - 1};

    }

    getCenterPoint(mesh) {
        var middle = new Vector3();
        var geometry = mesh.geometry;

        geometry.computeBoundingBox();

        middle.x = (geometry.boundingBox.max.x + geometry.boundingBox.min.x) / 2;
        middle.y = (geometry.boundingBox.max.y + geometry.boundingBox.min.y) / 2;
        middle.z = (geometry.boundingBox.max.z + geometry.boundingBox.min.z) / 2;

        mesh.localToWorld(middle);
        return middle;
    }

    saveFile(strData, filename) {
        var link = document.createElement('a');
        if (typeof link.download === 'string') {
            document.body.appendChild(link); //Firefox requires the link to be in the body
            link.download = filename;
            link.href = strData;
            link.click();
            document.body.removeChild(link); //remove the link when done
        } else {
            location.replace(uri);
        }
    }
    delay(time) {
        return new Promise(resolve => setTimeout(resolve, time));
    }
    
    compare(a,b){
        if (a.distance < b.distance)
           return -1;
        if (a.distance > b.distance)
          return 1;
        return 0;
    }

    limitSelectionByDistance(origin,group,number){
        let tmp = [];
        let limitedSelection = [];
        let distance = 0;
        group.forEach(element => { //check if we need to iterate over element children
            distance = element.position.distanceTo(origin);
            tmp.push({object: element, distance: distance})
        });
        tmp.sort(this.compare);
        if(number > group.length){number = group.length}
        for (let i = 0; i < number; i++) {
            limitedSelection.push(tmp[i].object);
        }
        return limitedSelection;
    }
}

export default Utility;