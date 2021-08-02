import * as canvas from "./canvas";
import {drawStormIcon} from "./drawing";

console.log('Hello World!');
console.log('Currently testing canvas');

canvas.setDraw((ctx, time)=>{
    drawStormIcon(ctx, canvas.width/2, canvas.height/2, 300, false, 2 * Math.PI * time / 3000, 2, '#F00');
});

canvas.startAnimation();