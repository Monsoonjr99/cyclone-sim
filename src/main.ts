import * as canvas from "./canvas";
import {anchorStormIconRotation, drawStormIcon} from "./drawing";
import * as viewer from "./mapviewwindow";
import { loadImg } from "./util";
import { liveTick, setLiveTick, tickToFormattedDate } from "./simtime";

import mapImageURL from 'url:../resources/nasabluemarble.jpg';

// This is currently preliminary testing code

console.log('Hello World!');
console.log('Currently testing time');

let mapImage : HTMLImageElement;
let ready = false;

(async ()=>{
    mapImage = await loadImg(mapImageURL);
    ready = true;
})();

interface TestIcon{
    phi : number;
    lambda : number;
    sh : boolean;
    omega : number;
}

let test : TestIcon[] = [];
let selectedIcon : TestIcon;
let spawnIcon: TestIcon;

function iconSize(){
    const BASE_ICON_SIZE = 40;
    const MIN_ICON_SIZE = 15;
    return Math.max(MIN_ICON_SIZE / viewer.zoomAmt(), BASE_ICON_SIZE);
}

let running = false;
let lastUpdate = 0;
let clock: HTMLDivElement = document.querySelector('.clock');
const TEST_START_YEAR = 2021;
const TICK_FRAME_DELAY = 10; // real time milliseconds per simulated tick (has no bearing on rendering framerate)

canvas.setDraw((ctx, time)=>{
    ctx.fillStyle = '#0A379B';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if(ready){
        viewer.drawMap(ctx, mapImage);
        for(let i = 0; i < test.length; i++){
            let coords = viewer.mapToCanvasCoordinates(test[i].phi, test[i].lambda, 1.5);
            for(let c of coords)
                drawStormIcon(ctx, c.x, c.y, iconSize(), test[i].sh, anchorStormIconRotation(test[i], test[i].omega, time), 2, '#F00', selectedIcon === test[i] ? '#FFF' : undefined);
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
                        if(icon.omega >= 4 * Math.PI)
                            icon.omega = Math.PI * 2 / 3;
                        else
                            icon.omega += Math.PI / 3;
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

canvas.startAnimation();

// UI stuff

const panelCollapseButton: HTMLButtonElement = document.querySelector('.panel-collapse');

panelCollapseButton.addEventListener('mouseup', e=>{
    const PANEL_COLLAPSED = 'panel-collapsed';
    let panel: HTMLDivElement = document.querySelector('.panel');
    if(panel.classList.contains(PANEL_COLLAPSED)){
        panel.classList.remove(PANEL_COLLAPSED);
        panelCollapseButton.innerText = '<';
    }else{
        panel.classList.add(PANEL_COLLAPSED);
        panelCollapseButton.innerText = '>';
    }
});

const spawnModeButton: HTMLButtonElement = document.querySelector('#spawn-button');

spawnModeButton.addEventListener('mouseup', e=>{
    if(spawnIcon)
        spawnIcon = undefined;
    else
        spawnIcon = {
            phi: 0,
            lambda: 0,
            sh: false,
            omega: Math.PI * 2 / 3
        };
});

const runPauseButton: HTMLButtonElement = document.querySelector('#run-pause-button');

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