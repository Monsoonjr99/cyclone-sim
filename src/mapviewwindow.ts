// this file defines the "camera" viewing the world map and
// supplies conversions between latitude/longitude coordinates and canvas coordinates (XY)

import {width as canvasWidth, height as canvasHeight} from "./canvas";
import { clamp, mod } from "./util";
import { LATITUDE_MAX, LONGITUDE_MAX, LatLongCoord, GeoCoordinate, normalizeLongitude } from "./geocoordinate";

interface CanvasCoord{
    x : number,
    y : number
}

// define LatLong of the center of the view window and zoom level
let center = new GeoCoordinate(0, 0);
let zoomLvl = 0;

// zoom-related constants
const MAX_ZOOM_LEVEL = 8;
const ZOOM_SCALER_BASE = 0.7;

// calculate actual zoom scaler for a zoom level
export function zoomAmt(){
    return Math.pow(ZOOM_SCALER_BASE, zoomLvl);
}

// boundaries and dimensions of view window in LatLong coordinates
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
    let height = zoomAmt() * 2 * LATITUDE_MAX;
    let width = height * windowRatio;
    return {
        north: center.latitude + height / 2,
        south: center.latitude - height / 2,
        west: normalizeLongitude(center.longitude - width / 2),
        east: normalizeLongitude(center.longitude + width / 2),
        width,
        height
    };
}

// constrain how far north/south the center may be so the edge of the view window doesn't go beyond the north/south pole
function clampViewerLatitude(latitude: number){
    let limit = LATITUDE_MAX * (1 - zoomAmt());
    return clamp(latitude, -limit, limit);
}

// coordinate conversions
export function canvasToMapCoordinate(x : number, y : number){
    let box = viewBox();
    return new GeoCoordinate(box.north - box.height * y / canvasHeight, box.west + box.width * x / canvasWidth);
}

export function mapToCanvasCoordinates(latitude : number, longitude : number, clip = 1) : CanvasCoord[]{
    let coords : CanvasCoord[] = [];
    let box = viewBox();
    let y = canvasHeight * (box.north - latitude) / box.height;
    // "clip" defines how far beyond the left/right edges of the canvas to return x values for, in terms of the canvas width
    // a clip of 1 returns x values only in the range [0, canvasWidth)
    // while 2 returns x values in the range [-canvasWidth/2, 3*canvasWidth/2)
    let clipWest = normalizeLongitude(box.west - box.width * (clip - 1) / 2);
    let clipLeft = -canvasWidth * (clip - 1) / 2;
    let clipRight = canvasWidth * (clip + 1) / 2;
    // loop through all x coordinates that match longitude
    for(
        let x = clipLeft + canvasWidth * mod(longitude - clipWest, 2 * LONGITUDE_MAX) / box.width;
        x < clipRight;
        x += 2 * LONGITUDE_MAX / box.width * canvasWidth
        )
        coords.push({x, y});
    return coords;
}

// controls
export function changeZoom(v : number, anchorX? : number, anchorY? : number){
    let box0 = viewBox();
    zoomLvl += v;
    let lat = center.latitude;
    let long = center.longitude;
    if(zoomLvl < 0)
        zoomLvl = 0;
    else if(zoomLvl > MAX_ZOOM_LEVEL)
        zoomLvl = MAX_ZOOM_LEVEL;
    else if(anchorX !== undefined && anchorY !== undefined){
        let box1 = viewBox();
        let dwidth = box1.width - box0.width; // change in longitude width
        let dheight = box1.height - box0.height; // change in latitude height
        lat += dheight * (anchorY - canvasHeight / 2) / canvasHeight;
        long -= dwidth * (anchorX - canvasWidth / 2) / canvasWidth;
    }
    lat = clampViewerLatitude(lat);
    if(lat !== center.latitude || long !== center.longitude)
        center = new GeoCoordinate(lat, long);
}

export function changeZoomByRatio(ratio : number){
    const oldAmt = zoomAmt();
    const newAmt = oldAmt * ratio;
    const newLvl = Math.log(newAmt) / Math.log(ZOOM_SCALER_BASE);
    const LvlDiff = newLvl - zoomLvl;
    changeZoom(LvlDiff);
}

export function focus(latitude: number, longitude: number){
    center = new GeoCoordinate(clampViewerLatitude(latitude), longitude);
}

export function panLatLong(dlatitude : number, dlongitude : number){
    center = new GeoCoordinate(clampViewerLatitude(center.latitude + dlatitude), center.longitude + dlongitude);
}

export function panXY(dx : number, dy : number){
    let box = viewBox();
    let dlongitude = box.width * -dx / canvasWidth;
    let dlatitude = box.height * dy / canvasHeight;
    panLatLong(dlatitude, dlongitude);
}

// map rendering
export function drawMap(ctx : CanvasRenderingContext2D, mapImg : HTMLImageElement){
    const box = viewBox();
    const imgX = (longitude : number)=>(longitude + LONGITUDE_MAX) / (2 * LONGITUDE_MAX) * mapImg.width;
    const imgY = (latitude : number)=>(LATITUDE_MAX - latitude) / (2 * LATITUDE_MAX) * mapImg.height;
    const srcY = imgY(box.north);
    const srcH = box.height / (2 * LATITUDE_MAX) * mapImg.height;
    for(let x = -canvasWidth * (box.west + LONGITUDE_MAX) / box.width; x < canvasWidth; x += 2 * LONGITUDE_MAX / box.width * canvasWidth){
        let dstX : number;
        let srcX : number;
        let dstW : number;
        let srcW : number;
        if(x < 0){
            dstX = 0;
            srcX = imgX(box.west);
        }else{
            dstX = x;
            srcX = 0;
        }
        const xRight = x + 2 * LONGITUDE_MAX / box.width * canvasWidth;
        if(xRight >= canvasWidth){
            dstW = canvasWidth - dstX;
            srcW = imgX(box.east) - srcX;
        }else{
            dstW = xRight - dstX;
            srcW = mapImg.width - srcX;
        }
        ctx.drawImage(mapImg, srcX, srcY, srcW, srcH, dstX, 0, dstW, canvasHeight);
    }
}