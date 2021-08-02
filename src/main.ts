import * as canvas from "./canvas";

console.log('Hello World!');
console.log('Currently testing canvas');

canvas.setDraw((ctx, time)=>{
    ctx.fillStyle = '#F00';
    ctx.font = '48px Verdana';
    ctx.translate(canvas.width/2, canvas.height/2);
    ctx.rotate(-2 * Math.PI * time / 4000);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Test text', 0, 0);
});

canvas.startAnimation();