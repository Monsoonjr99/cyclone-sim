// Functions for drawing storm icons, tracks, etc. on the canvas

// -- Storm Icons -- //

export function drawStormIcon(ctx : CanvasRenderingContext2D, x : number, y : number, size : number, shem : boolean, rotation : number, arms : number, fill : string, stroke? : string){
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(size, size);
    if(shem)
        ctx.scale(1, -1);
    ctx.rotate(-rotation);
    ctx.fillStyle = fill;
    if(stroke)
        ctx.strokeStyle = stroke;
    ctx.lineWidth = 0.1;
    ctx.lineCap = 'round';
    function drawIcon(doFill : boolean, doStroke : boolean){
        ctx.beginPath();
        ctx.arc(0, 0, 1/2, 0, 2 * Math.PI);
        if(doStroke)
            ctx.stroke();
        if(doFill)
            ctx.fill();
        for(let i = 0; i < arms; i++){
            if(i > 0)
                ctx.rotate(2 * Math.PI / arms);
            ctx.beginPath();
            ctx.moveTo(5/8, -1);                                // tip of arm
            ctx.bezierCurveTo(5/8, -1, -1/2, -7/8, -1/2, 0);    // outer curve of arm
            ctx.lineTo(0, 0);                                   // to center of icon
            ctx.bezierCurveTo(-1/4, -5/8, 5/8, -1, 5/8, -1);    // inner curve of arm
            if(doStroke)
                ctx.stroke();
            if(doFill)
                ctx.fill();
        }
    }
    if(stroke)
        drawIcon(false, true);
    drawIcon(true, false);
    ctx.restore();
}

interface StormIconAnchor{
    alpha : number;     // offset angle
    omega : number;     // angular velocity in radians/second
}

let stormIconAnchors : WeakMap<object, StormIconAnchor> = new WeakMap();

// creates "anchors" for storm icons to allow smoothly changing their rotation speed
// returns the angle of rotation given their rotation rate and time
export function anchorStormIconRotation(key : object, omega : number, time : number){
    let anchor : StormIconAnchor;
    // attempt to fetch anchor for the given key; create new anchor if none exists
    if(stormIconAnchors.has(key))
        anchor = <StormIconAnchor>stormIconAnchors.get(key); // Typescript assertion since WeakMap.get() should not return undefined after WeakMap.has() for the same key has returned true
    else{
        anchor = {
            alpha: -omega * time / 1000, // results in an angle of 0 at the initialization time
            omega
        };
        stormIconAnchors.set(key, anchor);
    }
    // calculate the rotation angle from the offset (alpha), the rotation rate (omega), and time
    let theta = anchor.alpha + anchor.omega * time / 1000;
    // if the rotation rate has changed since the last call to anchorStormIconRotation(), calculate new alpha and update anchor values
    if(omega !== anchor.omega){
        anchor.alpha = theta - omega * time / 1000;
        anchor.omega = omega;
    }
    return theta;
}