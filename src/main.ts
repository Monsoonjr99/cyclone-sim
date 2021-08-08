import * as canvas from "./canvas";
import {anchorStormIconRotation, drawStormIcon} from "./drawing";

// This is currently preliminary testing code

console.log('Hello World!');
console.log('Currently testing canvas UI');

let panX = 0;
let panY = 0;
let zoomAmt = 0;

function zoom(){
    return Math.pow(1.5, zoomAmt);
}

let test = [];

let omegaTest = Math.PI * 2 / 3;
let redIconKey = {};

canvas.setDraw((ctx, time)=>{
    drawStormIcon(ctx, canvas.width/2 * zoom() + panX, canvas.height/2 * zoom() + panY, 300 * zoom(), false, anchorStormIconRotation(redIconKey, omegaTest, time), 2, '#F00');
    for(let i = 0; i < test.length; i++)
        drawStormIcon(ctx, test[i].x * zoom() + panX, test[i].y * zoom() + panY, 150 * zoom(), test[i].sh, anchorStormIconRotation(test[i], omegaTest * 1.2, time), 2, '#00F');
});

canvas.handleClick((x, y)=>{
    if(Math.hypot(((x - panX) / zoom()) - canvas.width/2, ((y - panY) / zoom()) - canvas.height/2) < 150){
        if(omegaTest >= 4 * Math.PI)
            omegaTest = Math.PI * 2 / 3;
        else
            omegaTest += Math.PI / 3;
    }else{
        test.push({
            x: (x - panX) / zoom(),
            y: (y - panY) / zoom(),
            sh: Math.random() < 0.5
        });
    }
});

canvas.handleDrag((dx, dy, end)=>{
    panX += dx;
    panY += dy;
});

canvas.handleScroll(amt=>{
    zoomAmt -= amt;
});

canvas.startAnimation();