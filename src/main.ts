import * as canvas from "./canvas";
import {anchorStormIconRotation, drawStormIcon} from "./drawing";
import * as viewer from "./mapviewwindow";
import { loadMaps } from "./worldmap";
import { liveTick, setLiveTick, tickToFormattedDate } from "./simtime";
import { GeoCoordinate } from "./geocoordinate";
import { RAD_TO_DEG } from "./util";

// import mapImageURL from 'url:../resources/nasabluemarble.jpg';

// This is currently preliminary testing code

console.log('Hello World!');
console.log('This is an alpha');

let mapImage : HTMLImageElement;
let mapData : ImageData;
let ready = false;

(async ()=>{
    let maps = await loadMaps();
    mapImage = maps.mapImage;
    if(maps.mapData !== null){
        mapData = maps.mapData;
        ready = true;
    }else
        console.error("Map data failed to load");
})();

interface TestIcon{
    latitude : number;
    longitude : number;
    sh : boolean;
    omega : number;
    motion: {x : number, y : number};
}

let test : TestIcon[] = [];
let selectedIcon : TestIcon | undefined;
let spawnIcon: TestIcon | undefined;

function getLand_test(latitude : number, longitude : number){
    const x = Math.floor(mapData.width * (longitude + 180) / 360);
    const y = Math.floor(mapData.height * (-latitude + 90) / 180);
    const greenChannel = 1;
    const val = mapData.data[4 * (mapData.width * y + x) + greenChannel];
    if(val > 0)
        return true;
    else
        return false;
}

function randomSpawn_test(){
    const lat = Math.asin(Math.random() * 2 - 1) * RAD_TO_DEG;
    const dir = Math.random() * 2 * Math.PI;
    test.push({
        latitude: lat,
        longitude: Math.random() * 360 - 180,
        sh: lat < 0,
        omega: Math.PI * 2 / 3,
        motion: {
            x: 12 * Math.cos(dir),
            y: 12 * Math.sin(dir)
        }
    });
}

function iconSize(){
    const BASE_ICON_SIZE = 40;
    const MIN_ICON_SIZE = 15;
    return Math.max(MIN_ICON_SIZE / viewer.zoomAmt(), BASE_ICON_SIZE);
}

let running = false;
let lastUpdate = 0;
let clock = <HTMLDivElement>document.querySelector('.clock');
const TEST_START_YEAR = 2024;
const TICK_FRAME_DELAY = 10; // real time milliseconds per simulated tick (has no bearing on rendering framerate)

canvas.setDraw((ctx, time)=>{
    ctx.fillStyle = '#0A379B';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if(ready){
        viewer.drawMap(ctx, mapImage);
        const mousePos = canvas.getMousePos();
        const mouseCoord = viewer.canvasToMapCoordinate(mousePos.x, mousePos.y);
        for(let i = 0; i < test.length; i++){
            const coords = viewer.mapToCanvasCoordinates(test[i].latitude, test[i].longitude, 1.5);
            // const overland = getLand_test(test[i].latitude, test[i].longitude);
            // const dirFromMouse = GeoCoordinate.directionToward(test[i], mouseCoord) * Math.PI / 180;
            // const distFromMouse = GeoCoordinate.dist(test[i], mouseCoord);
            // const brightness = Math.floor((0.3 + 0.7 * distFromMouse / (180 * 60)) * 255).toString(16).padStart(2, '0').toUpperCase();
            const symbol = test[i].omega < Math.PI * 2 / 3 ? 'D' : test[i].omega < Math.PI * 1.8 ? 'S' : test[i].omega < Math.PI * 2.3 ? '1' : test[i].omega < Math.PI * 2.7 ? '2' : test[i].omega < Math.PI * 3.1 ? '3' : test[i].omega < Math.PI * 3.7 ? '4' : '5';
            const color = ({
                'D': 'rgb(20,20,230)',
                'S': 'rgb(20,230,20)',
                '1': 'rgb(230,230,20)',
                '2': 'rgb(240,170,20)',
                '3': 'rgb(240,20,20)',
                '4': 'rgb(250,40,250)',
                '5': 'rgb(250,140,250)'
            })[symbol];
            for(let c of coords){
                drawStormIcon(ctx, c.x, c.y, iconSize(), {
                    shem: test[i].sh,
                    rotation: anchorStormIconRotation(test[i], test[i].omega, time),
                    arms: (test[i].omega < Math.PI * 2 / 3) ? 0 : 2,
                    fill: color,
                    stroke: selectedIcon === test[i] ? '#FFF' : undefined,
                    classificationSymbol: {
                        text: symbol
                    },
                    designationLabel: {
                        text: 'Foo',
                        fillColor: '#FFF'
                    },
                    indicatorLabel: {
                        text: `${Math.round(test[i].omega * 100) / 100}`,
                        fillColor: '#FFF'
                    }
                });
                // ctx.strokeStyle = '#0F0';
                // ctx.lineWidth = 3;
                // ctx.beginPath();
                // ctx.moveTo(c.x, c.y);
                // ctx.lineTo(c.x + 40 * Math.sin(dirFromMouse), c.y - 40 * Math.cos(dirFromMouse));
                // ctx.stroke();
            }
        }
        if(spawnIcon){
            const latitude = mouseCoord.latitude;
            const canvasCoords = viewer.mapToCanvasCoordinates(mouseCoord.latitude, mouseCoord.longitude, 1.5);
            for(let c of canvasCoords)
                drawStormIcon(ctx, c.x, c.y, iconSize(), {
                    shem: latitude < 0,
                    rotation: anchorStormIconRotation(spawnIcon, spawnIcon.omega, time),
                    fill: '#FFF',
                    classificationSymbol: {
                        text: 'S'
                    }
                });
        }

        if(running){
            let elapsedTicksSinceLastUpdate = Math.floor((time - lastUpdate) / TICK_FRAME_DELAY);
            setLiveTick(liveTick + elapsedTicksSinceLastUpdate);
            lastUpdate += elapsedTicksSinceLastUpdate * TICK_FRAME_DELAY;
            // test "simulation"
            for(let i = 0; i < elapsedTicksSinceLastUpdate; i++){
                for(let j = test.length - 1; j >= 0; j--){
                    const testIcon = test[j];
                    const newPos = GeoCoordinate.addMovement(testIcon, testIcon.motion);
                    const newDir = Math.PI / 2 - GeoCoordinate.directionToward(newPos, testIcon) * Math.PI / 180 + Math.PI;
                    const oldDir = Math.atan2(testIcon.motion.y, testIcon.motion.x);
                    testIcon.latitude = newPos.latitude;
                    testIcon.longitude = newPos.longitude;
                    // testIcon.latitude -= testIcon.motion.y;
                    // testIcon.longitude += testIcon.motion.x;
                    // if(testIcon.latitude >= 90 || testIcon.latitude <= -90){
                    //     testIcon.motion.y *= -1;
                    //     testIcon.longitude += 180;
                    // }
                    // testIcon.latitude = Math.max(Math.min(testIcon.latitude, 90), -90);
                    // if(testIcon.longitude >= 180)
                    //     testIcon.longitude -= 360;
                    // else if(testIcon.longitude < -180)
                    //     testIcon.longitude += 360;
                    const rotateMotionBy = newDir - oldDir + (Math.random() - 0.5) * (Math.PI / 8);
                    testIcon.motion = {x: testIcon.motion.x * Math.cos(rotateMotionBy) - testIcon.motion.y * Math.sin(rotateMotionBy), y: testIcon.motion.x * Math.sin(rotateMotionBy) + testIcon.motion.y * Math.cos(rotateMotionBy)};
                    const isOverLand = getLand_test(testIcon.latitude, testIcon.longitude);
                    if(isOverLand)
                        testIcon.omega += (Math.random() - 0.7) * (Math.PI / 12);
                    else
                        testIcon.omega += (Math.random() - 0.48) * (Math.PI / 12);
                    testIcon.omega = Math.min(testIcon.omega, 4 * Math.PI);
                    if(testIcon.omega <= Math.PI / 6)
                        test.splice(j, 1);
                }
                if(Math.random() < 0.01)
                    randomSpawn_test();
            }
            if(selectedIcon && test.includes(selectedIcon))
                viewer.focus(selectedIcon.latitude, selectedIcon.longitude);
        }
        clock.innerText = tickToFormattedDate(liveTick, TEST_START_YEAR);
    }else{
        drawStormIcon(ctx, canvas.width/2, canvas.height/2, 300, {
            rotation: 2 * Math.PI * time / 2500,
            fill: '#00F'
        });
    }
});

canvas.handleClick((x, y)=>{
    if(ready){
        if(spawnIcon){
            let LatLong = viewer.canvasToMapCoordinate(x, y);
            spawnIcon.latitude = LatLong.latitude;
            spawnIcon.longitude = LatLong.longitude;
            spawnIcon.sh = LatLong.latitude < 0;
            test.push(spawnIcon);
            spawnIcon = undefined;
            spawnModeButton.innerText = 'Spawn';
        }else{
            let iconClicked = false;
            for(let icon of test){
                let XY = viewer.mapToCanvasCoordinates(icon.latitude, icon.longitude);
                for(let c of XY){
                    if(Math.hypot(x - c.x, y - c.y) < iconSize() / 2){
                        if(selectedIcon === icon)
                            selectedIcon = undefined;
                        else
                            selectedIcon = icon;
                        iconClicked = true;
                        // if(icon.omega >= 4 * Math.PI)
                        //     icon.omega = Math.PI * 2 / 3;
                        // else
                        //     icon.omega += Math.PI / 3;
                        break;
                    }
                }
                if(iconClicked)
                    break;
            }
            if(!iconClicked && selectedIcon)
                selectedIcon = undefined;
        }
    }
});

canvas.handleDrag((dx, dy, end)=>{
    if(ready)
        viewer.panXY(dx, dy);
});

canvas.handleScroll((amt, x, y)=>{
    if(ready)
        viewer.changeZoom(-amt, x, y);
});

canvas.handlePinch((ratio)=>{
    if(ready)
        viewer.changeZoomByRatio(1 / ratio);
});

canvas.startAnimation();

// UI stuff

const panelCollapseButton = <HTMLButtonElement>document.querySelector('.panel-collapse');

panelCollapseButton.addEventListener('mouseup', e=>{
    const PANEL_COLLAPSED = 'panel-collapsed';
    let panel = <HTMLDivElement>document.querySelector('.panel');
    if(panel.classList.contains(PANEL_COLLAPSED)){
        panel.classList.remove(PANEL_COLLAPSED);
        panelCollapseButton.innerText = '<';
    }else{
        panel.classList.add(PANEL_COLLAPSED);
        panelCollapseButton.innerText = '>';
    }
});

const spawnModeButton = <HTMLButtonElement>document.querySelector('#spawn-button');

spawnModeButton.addEventListener('mouseup', e=>{
    if(spawnIcon){
        spawnIcon = undefined;
        spawnModeButton.innerText = 'Spawn';
    }else{
        spawnIcon = {
            latitude: 0,
            longitude: 0,
            sh: false,
            omega: Math.PI * 2 / 3,
            motion: {
                x: -12,
                y: 0
            }
        };
        spawnModeButton.innerText = 'Cancel Spawn';
    }
});

const runPauseButton = <HTMLButtonElement>document.querySelector('#run-pause-button');

runPauseButton.addEventListener('mouseup', e=>{
    if(running){
        running = false;
        runPauseButton.innerText = 'Run';
    }else{
        lastUpdate = performance.now();
        running = true;
        runPauseButton.innerText = 'Pause';
    }
});

const debugButton = <HTMLButtonElement>document.querySelector('#debug-button');

debugButton.addEventListener('mouseup', e=>{
    for(let i = test.length; i < 500; i++)
        randomSpawn_test();
});