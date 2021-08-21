import * as canvas from "./canvas";
import {anchorStormIconRotation, drawStormIcon} from "./drawing";
import * as viewer from "./mapviewwindow";
import { loadImg } from "./util";
import mapImageURL from 'url:../resources/nasabluemarble.jpg';

import {foo} from './simtime';

console.log(foo);

// This is currently preliminary testing code

console.log('Hello World!');
console.log('Currently testing map viewer');

let mapImage : HTMLImageElement;
let ready = false;

(async ()=>{
    mapImage = await loadImg(mapImageURL);
    ready = true;
})();

interface TestIcon{
    phi : number;
    lambda : number;
    sh : boolean;
    omega : number;
}

let test : TestIcon[] = [];
let selectedIcon : TestIcon;

function iconSize(){
    const BASE_ICON_SIZE = 40;
    const MIN_ICON_SIZE = 15;
    return Math.max(MIN_ICON_SIZE / viewer.zoomAmt(), BASE_ICON_SIZE);
}

canvas.setDraw((ctx, time)=>{
    ctx.fillStyle = '#0A379B';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if(ready){
        viewer.drawMap(ctx, mapImage);
        for(let i = 0; i < test.length; i++){
            let coords = viewer.mapToCanvasCoordinates(test[i].phi, test[i].lambda, 1.5);
            for(let c of coords)
                drawStormIcon(ctx, c.x, c.y, iconSize(), test[i].sh, anchorStormIconRotation(test[i], test[i].omega, time), 2, '#F00', selectedIcon === test[i] ? '#FFF' : undefined);
        }
    }else{
        drawStormIcon(ctx, canvas.width/2, canvas.height/2, 300, false, 2 * Math.PI * time / 2500, 2, '#00F');
    }
});

canvas.handleClick((x, y)=>{
    if(ready){
        let iconClicked = false;
        for(let icon of test){
            let XY = viewer.mapToCanvasCoordinates(icon.phi, icon.lambda);
            for(let c of XY){
                if(Math.hypot(x - c.x, y - c.y) < iconSize()){
                    if(selectedIcon === icon)
                        selectedIcon = undefined;
                    else
                        selectedIcon = icon;
                    iconClicked = true;
                    if(icon.omega >= 4 * Math.PI)
                        icon.omega = Math.PI * 2 / 3;
                    else
                        icon.omega += Math.PI / 3;
                    break;
                }
            }
            if(iconClicked)
                break;
        }
        if(!iconClicked){
            if(selectedIcon)
                selectedIcon = undefined;
            else{
                let PL = viewer.canvasToMapCoordinate(x, y);
                test.push({
                    phi: PL.phi,
                    lambda: PL.lambda,
                    sh: PL.phi < 0,
                    omega: Math.PI * 2 / 3
                });
            }
        }
    }
});

canvas.handleDrag((dx, dy, end)=>{
    if(ready)
        viewer.panXY(dx, dy);
});

canvas.handleScroll((amt, x, y)=>{
    if(ready)
        viewer.changeZoom(-amt, x, y);
});

canvas.startAnimation();