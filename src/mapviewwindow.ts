// this file defines the "camera" viewing the world map and
// supplies conversions between latitude/longitude coordinates (PL for Phi-Lambda) and canvas coordinates (XY)

import {width as canvasWidth, height as canvasHeight} from "./canvas";

// definition constants of latitude/longitude scale bounds
const PHI_MAX = 90;
const LAMBDA_MAX = 180;

// coordinate types
interface PLCoord{
    phi : number;
    lambda : number;
}

interface XYCoord{
    x : number,
    y : number
}

// define PL of the center of the view window and zoom level
let center : PLCoord = {
    phi: 0,
    lambda: 0
};
let zoomLvl = 0;

// zoom-related constants
const MAX_ZOOM_LEVEL = 12;
const ZOOM_SCALER_BASE = 0.7;

// calculate actual zoom scaler for a zoom level
export function zoomAmt(){
    return Math.pow(ZOOM_SCALER_BASE, zoomLvl);
}

// properly mathematical mod for calculations
function mod(a : number, b : number){
    return (a % b + b) % b;
}

// normalize lambda for values outside of [-180, 180)
function normalizeLambda(lambda : number){
    return mod(lambda + LAMBDA_MAX, 2 * LAMBDA_MAX) - LAMBDA_MAX;
}

// boundaries and dimensions of view window in PL coordinates
interface mapViewWindowBox{
    north : number;
    south : number;
    west : number;
    east : number;
    width : number;
    height : number;
}

function viewBox() : mapViewWindowBox{
    let windowRatio = canvasWidth / canvasHeight;
    let height = zoomAmt() * 2 * PHI_MAX;
    let width = height * windowRatio;
    return {
        north: center.phi + height / 2,
        south: center.phi - height / 2,
        west: normalizeLambda(center.lambda - width / 2),
        east: normalizeLambda(center.lambda + width / 2),
        width,
        height
    };
}

// constrain how far north/south the center may be so the edge of the view window doesn't go beyond the north/south pole
function clipPhi(){
    let limit = PHI_MAX * (1 - zoomAmt());
    center.phi = Math.min(Math.max(center.phi, -limit), limit);
}

// coordinate conversions
export function canvasToMapCoordinate(x : number, y : number) : PLCoord{
    let box = viewBox();
    return {
        phi: box.north - box.height * y / canvasHeight,
        lambda: normalizeLambda(box.west + box.width * x / canvasWidth)
    };
}

export function mapToCanvasCoordinates(phi : number, lambda : number) : XYCoord[]{
    let coords : XYCoord[] = [];
    let box = viewBox();
    let y = canvasHeight * (box.north - phi) / box.height;
    // loop through all x coordinates that match lambda
    for(
        let x = canvasWidth * mod(lambda - box.west, 2 * LAMBDA_MAX) / box.width;
        x < canvasWidth;
        x += 2 * LAMBDA_MAX / box.width * canvasWidth
        )
        coords.push({x, y});
    return coords;
}

// controls
export function changeZoom(v : number, anchorX? : number, anchorY? : number){
    let box0 = viewBox();
    zoomLvl += v;
    if(zoomLvl < 0)
        zoomLvl = 0;
    else if(zoomLvl > MAX_ZOOM_LEVEL)
        zoomLvl = MAX_ZOOM_LEVEL;
    else if(anchorX !== undefined && anchorY !== undefined){
        let box1 = viewBox();
        let dwidth = box1.width - box0.width; // change in lambda width
        let dheight = box1.height - box0.height; // change in phi height
        center.phi += dheight * (anchorY - canvasHeight / 2) / canvasHeight;
        center.lambda -= dwidth * (anchorX - canvasWidth / 2) / canvasWidth;
        center.lambda = normalizeLambda(center.lambda);
    }
    clipPhi();
}

export function panPL(dphi : number, dlambda : number){
    center.phi += dphi;
    clipPhi();
    center.lambda = normalizeLambda(center.lambda + dlambda);
}

export function panXY(dx : number, dy : number){
    let box = viewBox();
    let dlambda = box.width * -dx / canvasWidth;
    let dphi = box.height * dy / canvasHeight;
    panPL(dphi, dlambda);
}