// -- Storm Icons -- //

export function drawStormIcon(ctx : CanvasRenderingContext2D, x : number, y : number, size : number, shem : boolean, rotation : number, arms : number, color : string){
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(size, size);
    if(shem)
        ctx.scale(1, -1);
    ctx.rotate(-rotation);
    ctx.fillStyle = color;
    for(let i = 0; i < arms; i++){
        if(i > 0)
            ctx.rotate(2 * Math.PI / arms);
        ctx.beginPath();
        ctx.moveTo(5/8, -1);                                // tip of arm
        ctx.bezierCurveTo(5/8, -1, -1/2, -7/8, -1/2, 0);    // outer curve of arm
        ctx.lineTo(0, 0);                                   // to center of icon
        ctx.bezierCurveTo(-1/4, -5/8, 5/8, -1, 5/8, -1);    // inner curve of arm
        ctx.fill();
    }
    ctx.beginPath();
    ctx.arc(0, 0, 1/2, 0, 2 * Math.PI);
    ctx.fill();
    ctx.restore();
}