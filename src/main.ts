import * as canvas from "./canvas";
import {anchorStormIconRotation, drawStormIcon} from "./drawing";
import * as viewer from "./mapviewwindow";

// This is currently preliminary testing code

console.log('Hello World!');
console.log('Currently testing map viewer');

let test = [];

let omegaTest = Math.PI * 2 / 3;
let redIcon = {phi: 0, lambda: 0, shem: Math.random() < 0.5, sel: false};

canvas.setDraw((ctx, time)=>{
    ctx.fillStyle = '#0A379B';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    let redIconCoords = viewer.mapToCanvasCoordinates(redIcon.phi, redIcon.lambda);
    for(let c of redIconCoords)
        drawStormIcon(ctx, c.x, c.y, 20 / viewer.zoomAmt(), redIcon.shem, anchorStormIconRotation(redIcon, omegaTest, time), 2, '#F00', redIcon.sel ? '#FFF' : undefined);
    for(let i = 0; i < test.length; i++){
        let coords = viewer.mapToCanvasCoordinates(test[i].phi, test[i].lambda);
        for(let c of coords)
            drawStormIcon(ctx, c.x, c.y, 10 / viewer.zoomAmt(), test[i].sh, anchorStormIconRotation(test[i], omegaTest * 1.2, time), 2, '#FFF');
    }
});

canvas.handleClick((x, y)=>{
    let redIconCoords = viewer.mapToCanvasCoordinates(redIcon.phi, redIcon.lambda);
    let redIconClicked = false;
    for(let c of redIconCoords){
        if(Math.hypot(x - c.x, y - c.y) < 10 / viewer.zoomAmt())
            redIconClicked = true;
    }
    if(redIconClicked){
        if(omegaTest >= 4 * Math.PI)
            omegaTest = Math.PI * 2 / 3;
        else
            omegaTest += Math.PI / 3;
        redIcon.sel = !redIcon.sel;
    }else{
        let PL = viewer.canvasToMapCoordinate(x, y);
        test.push({
            phi: PL.phi,
            lambda: PL.lambda,
            sh: PL.phi < 0
        });
    }
});

canvas.handleDrag((dx, dy, end)=>{
    viewer.panXY(dx, dy);
});

canvas.handleScroll(amt=>{
    viewer.changeZoom(-amt);
});

canvas.startAnimation();