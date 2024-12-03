// Functions for drawing storm icons, tracks, etc. on the canvas

const DEFAULT_FONT_FAMILY = "Verdana, Geneva, Tahoma, sans-serif";

// -- Storm Icons -- //

const stormIconBody = new Path2D();
stormIconBody.arc(0, 0, 1/2, 0, 2 * Math.PI);

const stormIconArm = new Path2D();
stormIconArm.moveTo(5/8, -1);                                // tip of arm
stormIconArm.bezierCurveTo(5/8, -1, -1/2, -7/8, -1/2, 0);    // outer curve of arm
stormIconArm.lineTo(0, 0);                                   // to center of icon
stormIconArm.bezierCurveTo(-1/4, -5/8, 5/8, -1, 5/8, -1);    // inner curve of arm

type iconLabelOptions = {
    text: string,
    fillColor?: string,
    strokeColor?: string,
    fontFamily?: string,
    fontSize?: number
};

const defaultIconLabelOptions = {
    text: '',
    fillColor: '#000',
    fontFamily: DEFAULT_FONT_FAMILY,
    fontSize: {classificationSymbol: 12, designationLabel: 14, indicatorLabel: 10}
};

const iconLabelScaleFactor = 20; // defines the number of font pixels equivalent to the diameter of the storm icon body
const designationLabelOffset = 1;
const indicatorLabelOffset = 1.25;

export function drawStormIcon(
    ctx : CanvasRenderingContext2D, x : number, y : number, size: number,
    {
        shem = false, rotation = 0, arms = 2, fill = "#F00", stroke, classificationSymbol, designationLabel, indicatorLabel
    }: {
        shem?: boolean, rotation?: number, arms?: number, fill?: string, stroke?: string, classificationSymbol?: iconLabelOptions, designationLabel?: iconLabelOptions, indicatorLabel?: iconLabelOptions
    } = {}
){
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(size, size);
    ctx.lineCap = 'round';

    ctx.save();
    if(shem)
        ctx.scale(1, -1);
    ctx.rotate(-rotation);
    ctx.fillStyle = fill;
    if(stroke)
        ctx.strokeStyle = stroke;
    ctx.lineWidth = 0.1;

    function drawIconShape(doStroke : boolean){
        const _draw = (path: Path2D) => doStroke ? ctx.stroke(path) : ctx.fill(path);
        _draw(stormIconBody);
        for(let i = 0; i < arms; i++){
            _draw(stormIconArm);
            ctx.rotate(2 * Math.PI / arms);
        }
    }

    if(stroke)
        drawIconShape(true);
    drawIconShape(false);
    ctx.restore();

    ctx.scale(1 / iconLabelScaleFactor, 1 / iconLabelScaleFactor); // more useful scale for defining font sizes
    ctx.lineWidth = 0.3;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    function applyLabel(options: iconLabelOptions, xOffset: number, yOffset: number, defaultFontSize: number){
        ctx.font = `${options.fontSize || defaultFontSize}px ${options.fontFamily || defaultIconLabelOptions.fontFamily}`;
        ctx.fillStyle = options.fillColor || defaultIconLabelOptions.fillColor;
        ctx.fillText(options.text, xOffset, yOffset);
        if(options.strokeColor){
            ctx.strokeStyle = options.strokeColor;
            ctx.strokeText(options.text, xOffset, yOffset);
        }
    }

    if(classificationSymbol)
        applyLabel(classificationSymbol, 0, 0, defaultIconLabelOptions.fontSize.classificationSymbol);

    if(indicatorLabel)
        applyLabel(indicatorLabel, 0, iconLabelScaleFactor * indicatorLabelOffset, defaultIconLabelOptions.fontSize.indicatorLabel);

    ctx.textAlign = 'left';
    if(designationLabel)
        applyLabel(designationLabel, iconLabelScaleFactor * designationLabelOffset, 0, defaultIconLabelOptions.fontSize.designationLabel);

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