import * as canvas from "./canvas";
import {drawStormIcon} from "./drawing";

console.log('Hello World!');
console.log('Currently testing canvas UI');

let panX = 0;
let panY = 0;
let zoom = 0;

let test = [];

canvas.setDraw((ctx, time)=>{
    drawStormIcon(ctx, canvas.width/2 + panX, canvas.height/2 + panY, 300 * Math.pow(1.5, zoom), false, 2 * Math.PI * time / 3000, 2, '#F00');
    for(let i = 0; i < test.length; i++)
        drawStormIcon(ctx, test[i].x + panX, test[i].y + panY, 150 * Math.pow(1.5, zoom), test[i].sh, 2 * Math.PI * (time - test[i].t) / 2500, 2, '#00F');
});

canvas.handleClick((x, y)=>{
    test.push({
        x: x - panX,
        y: y - panY,
        t: performance.now(),
        sh: Math.random() < 0.5
    });
});

canvas.handleDrag((dx, dy, end)=>{
    panX += dx;
    panY += dy;
});

canvas.handleScroll(amt=>{
    zoom -= amt;
});

canvas.startAnimation();