import * as canvas from "./canvas";
import {anchorStormIconRotation, drawStormIcon} from "./drawing";
import * as viewer from "./mapviewwindow";
import { getMaps } from "./worldmap";
import { liveTick, setLiveTick, tickToFormattedDate } from "./simtime";
import { simulationState_test, simulation_test, TestIcon, randomSpawn_test } from "./simulation";

const VERSION = "Pre-Alpha";

// This is currently preliminary testing code

console.log('Hello World!');
console.log('This is a pre-alpha (alpha v1.0 should be soon[tm])');

let mapImage : HTMLImageElement;
let ready = false;

getMaps().then(maps => {
    mapImage = maps.mapImage;
    ready = true;
});

let selectedIcon : TestIcon | undefined;
let spawnIcon: TestIcon | undefined;

function iconSize(){
    const BASE_ICON_SIZE = 40;
    const MIN_ICON_SIZE = 15;
    return Math.max(MIN_ICON_SIZE / viewer.zoomAmt(), BASE_ICON_SIZE);
}

let running = false;
let lastUpdate = 0;
let clock = <HTMLDivElement>document.querySelector('.clock');
const TEST_START_YEAR = 2026;
const TICK_FRAME_DELAY = 10; // real time milliseconds per simulated tick (has no bearing on rendering framerate)

canvas.setDraw((ctx, time)=>{
    ctx.fillStyle = '#0A379B';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if(ready){
        viewer.drawMap(ctx, mapImage);
        const mousePos = canvas.getMousePos();
        const mouseCoord = viewer.canvasToMapCoordinate(mousePos.x, mousePos.y);
        for(let i = 0; i < simulationState_test.length; i++){
            const coords = viewer.mapToCanvasCoordinates(simulationState_test[i].latitude, simulationState_test[i].longitude, 1.5);
            const symbol = (()=>{
                let val = 'D';
                for(let t of [
                    {threshold: Math.PI * 2 / 3, val: 'S'},
                    {threshold: Math.PI * 1.8, val: '1'},
                    {threshold: Math.PI * 2.3, val: '2'},
                    {threshold: Math.PI * 2.7, val: '3'},
                    {threshold: Math.PI * 3.1, val: '4'},
                    {threshold: Math.PI * 3.7, val: '5'},
                ]){
                    if(simulationState_test[i].omega >= t.threshold)
                        val = t.val;
                    else
                        break;
                }
                return val;
            })();
            const color = ({
                'D': 'rgb(20,20,230)',
                'S': 'rgb(20,230,20)',
                '1': 'rgb(230,230,20)',
                '2': 'rgb(240,170,20)',
                '3': 'rgb(240,20,20)',
                '4': 'rgb(250,40,250)',
                '5': 'rgb(250,140,250)'
            })[symbol];
	    const desLabel = (()=>{
                if(simulationState_test[i].name !== undefined)
                    return <string>simulationState_test[i].name;
                else if(simulationState_test[i].numeral !== undefined)
                    return (<number>simulationState_test[i].numeral).toString().padStart(3, "0");
                else
                    return "";
	    })();
            for(let c of coords){
                drawStormIcon(ctx, c.x, c.y, iconSize(), {
                    shem: simulationState_test[i].sh,
                    rotation: anchorStormIconRotation(simulationState_test[i], simulationState_test[i].omega, time),
                    arms: (simulationState_test[i].omega < Math.PI * 2 / 3) ? 0 : 2,
                    fill: color,
                    stroke: selectedIcon === simulationState_test[i] ? '#FFF' : undefined,
                    classificationSymbol: {
                        text: symbol
                    },
                    designationLabel: {
                        text: desLabel,
                        fillColor: '#FFF'
                    },
                    indicatorLabel: {
                        text: `${Math.round(simulationState_test[i].omega * 100) / 100}`,
                        fillColor: '#FFF'
                    }
                });
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
            simulation_test(elapsedTicksSinceLastUpdate);
            if(selectedIcon && simulationState_test.includes(selectedIcon))
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
            simulationState_test.push(spawnIcon);
            spawnIcon = undefined;
            spawnModeButton.innerText = 'Spawn';
        }else{
            let iconClicked = false;
            for(let icon of simulationState_test){
                let XY = viewer.mapToCanvasCoordinates(icon.latitude, icon.longitude);
                for(let c of XY){
                    if(Math.hypot(x - c.x, y - c.y) < iconSize() / 2){
                        if(selectedIcon === icon)
                            selectedIcon = undefined;
                        else
                            selectedIcon = icon;
                        iconClicked = true;
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

const versionLink = <HTMLAnchorElement>document.querySelector('.version-str');
versionLink.innerHTML += VERSION;

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
    for(let i = simulationState_test.length; i < 500; i++)
        randomSpawn_test();
});
