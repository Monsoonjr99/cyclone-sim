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
        ctx.moveTo(5/8, -1);
        ctx.bezierCurveTo(5/8, -1, -3/8, -7/8, -1/2, 0);
        // Current Bezier curves borrowed from v0.x Cyclone Simulator
        // The (-3/8, -7/8) second control point of this Bezier curve makes the edge not quite tangential with the circle,
        // so it will be fixed with one of two options:
        // Candidate 1 ("Thicc" icon) -- (-1/2, -7/8)
        // Candidate 2 ("Thinn" icon) -- (-1/2, -3/4)
        ctx.lineTo(0, 0);
        ctx.bezierCurveTo(-1/4, -5/8, 5/8, -1, 5/8, -1);
        ctx.fill();
    }
    ctx.beginPath();
    ctx.arc(0, 0, 1/2, 0, 2 * Math.PI);
    ctx.fill();
    ctx.restore();
}