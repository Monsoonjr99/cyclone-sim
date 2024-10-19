import * as canvas from "./canvas";
import {anchorStormIconRotation, drawStormIcon} from "./drawing";
import * as viewer from "./mapviewwindow";
import { loadMaps } from "./worldmap";
import { liveTick, setLiveTick, tickToFormattedDate } from "./simtime";

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
    phi : number;
    lambda : number;
    sh : boolean;
    omega : number;
    motion: {x : number, y : number};
}

let test : TestIcon[] = [];
let selectedIcon : TestIcon | undefined;
let spawnIcon: TestIcon | undefined;

function getLand_test(phi : number, lambda : number){
    const x = Math.floor(mapData.width * (lambda + 180) / 360);
    const y = Math.floor(mapData.height * (-phi + 90) / 180);
    const greenChannel = 1;
    const val = mapData.data[4 * (mapData.width * y + x) + greenChannel];
    if(val > 0)
        return true;
    else
        return false;
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
        for(let i = 0; i < test.length; i++){
            const coords = viewer.mapToCanvasCoordinates(test[i].phi, test[i].lambda, 1.5);
            const overland = getLand_test(test[i].phi, test[i].lambda);
            for(let c of coords)
                drawStormIcon(ctx, c.x, c.y, iconSize(), test[i].sh, anchorStormIconRotation(test[i], test[i].omega, time), (test[i].omega < Math.PI * 2 / 3) ? 0 : 2, overland ? '#00F' : '#F00', selectedIcon === test[i] ? '#FFF' : undefined);
        }
        if(spawnIcon){
            let mousePos = canvas.getMousePos();
            let phi = viewer.canvasToMapCoordinate(mousePos.x, mousePos.y).phi;
            drawStormIcon(ctx, mousePos.x, mousePos.y, iconSize(), phi < 0, anchorStormIconRotation(spawnIcon, spawnIcon.omega, time), 2, '#FFF');
        }

        if(running){
            let elapsedTicksSinceLastUpdate = Math.floor((time - lastUpdate) / TICK_FRAME_DELAY);
            setLiveTick(liveTick + elapsedTicksSinceLastUpdate);
            lastUpdate += elapsedTicksSinceLastUpdate * TICK_FRAME_DELAY;
            // test "simulation"
            for(let i = 0; i < elapsedTicksSinceLastUpdate; i++){
                for(let j = 0; j < test.length; j++){
                    const testIcon = test[j];
                    testIcon.phi -= testIcon.motion.y;
                    testIcon.lambda += testIcon.motion.x;
                    if(testIcon.phi >= 90 || testIcon.phi <= -90){
                        testIcon.motion.y *= -1;
                        testIcon.lambda += 180;
                    }
                    testIcon.phi = Math.max(Math.min(testIcon.phi, 90), -90);
                    if(testIcon.lambda >= 180)
                        testIcon.lambda -= 360;
                    else if(testIcon.lambda < -180)
                        testIcon.lambda += 360;
                    const rotateMotionBy = (Math.random() - 0.5) * (Math.PI / 8);
                    testIcon.motion = {x: testIcon.motion.x * Math.cos(rotateMotionBy) - testIcon.motion.y * Math.sin(rotateMotionBy), y: testIcon.motion.x * Math.sin(rotateMotionBy) + testIcon.motion.y * Math.cos(rotateMotionBy)};
                    const isOverLand = getLand_test(testIcon.phi, testIcon.lambda);
                    if(isOverLand)
                        testIcon.omega += (Math.random() - 0.7) * (Math.PI / 12);
                    else
                        testIcon.omega += (Math.random() - 0.48) * (Math.PI / 12);
                    testIcon.omega = Math.max(Math.min(testIcon.omega, 4 * Math.PI), Math.PI / 6);
                }
            }
        }
        clock.innerText = tickToFormattedDate(liveTick, TEST_START_YEAR);
    }else{
        drawStormIcon(ctx, canvas.width/2, canvas.height/2, 300, false, 2 * Math.PI * time / 2500, 2, '#00F');
    }
});

canvas.handleClick((x, y)=>{
    if(ready){
        if(spawnIcon){
            let PL = viewer.canvasToMapCoordinate(x, y);
            spawnIcon.phi = PL.phi;
            spawnIcon.lambda = PL.lambda;
            spawnIcon.sh = PL.phi < 0;
            test.push(spawnIcon);
            spawnIcon = undefined;
            spawnModeButton.innerText = 'Spawn';
        }else{
            let iconClicked = false;
            for(let icon of test){
                let XY = viewer.mapToCanvasCoordinates(icon.phi, icon.lambda);
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
            phi: 0,
            lambda: 0,
            sh: false,
            omega: Math.PI * 2 / 3,
            motion: {
                x: -0.2,
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
})