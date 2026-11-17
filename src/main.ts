import * as canvas from "./canvas";
import {anchorStormIconRotation, drawStormIcon} from "./drawing";
import * as viewer from "./mapviewwindow";
import { getMaps } from "./worldmap";
import { liveTick, setLiveTick, tickToFormattedDate } from "./simtime";
import { simulationState_test, simulation_test, TestStorm, randomSpawn_test } from "./simulation";

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

let selectedStorm : TestStorm | undefined;
let stormToSpawn: TestStorm | undefined;

function iconSize(){
    const BASE_ICON_SIZE = 40;
    const MIN_ICON_SIZE = 15;
    return Math.max(MIN_ICON_SIZE / viewer.zoomAmt(), BASE_ICON_SIZE);
}

function iconRotationRate(wind: number){
    return wind * Math.PI / 52.5;
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
                    {threshold: 35, val: 'S'},
                    {threshold: 65, val: '1'},
                    {threshold: 85, val: '2'},
                    {threshold: 100, val: '3'},
                    {threshold: 115, val: '4'},
                    {threshold: 140, val: '5'},
                ]){
                    if(simulationState_test[i].wind >= t.threshold)
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
                    rotation: anchorStormIconRotation(simulationState_test[i], iconRotationRate(simulationState_test[i].wind), time),
                    arms: (simulationState_test[i].wind < 35) ? 0 : 2,
                    fill: color,
                    stroke: selectedStorm === simulationState_test[i] ? '#FFF' : undefined,
                    classificationSymbol: {
                        text: symbol
                    },
                    designationLabel: {
                        text: desLabel,
                        fillColor: '#FFF'
                    },
                    indicatorLabel: {
                        text: `${Math.round(simulationState_test[i].wind)}`,
                        fillColor: '#FFF'
                    }
                });
            }
        }
        if(stormToSpawn){
            const latitude = mouseCoord.latitude;
            const canvasCoords = viewer.mapToCanvasCoordinates(mouseCoord.latitude, mouseCoord.longitude, 1.5);
            for(let c of canvasCoords)
                drawStormIcon(ctx, c.x, c.y, iconSize(), {
                    shem: latitude < 0,
                    rotation: anchorStormIconRotation(stormToSpawn, iconRotationRate(stormToSpawn.wind), time),
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
            if(selectedStorm && simulationState_test.includes(selectedStorm))
                viewer.focus(selectedStorm.latitude, selectedStorm.longitude);
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
        if(stormToSpawn){
            let LatLong = viewer.canvasToMapCoordinate(x, y);
            stormToSpawn.latitude = LatLong.latitude;
            stormToSpawn.longitude = LatLong.longitude;
            stormToSpawn.sh = LatLong.latitude < 0;
            simulationState_test.push(stormToSpawn);
            stormToSpawn = undefined;
            spawnModeButton.innerText = 'Spawn';
        }else{
            let stormIconClicked = false;
            for(let storm of simulationState_test){
                let XY = viewer.mapToCanvasCoordinates(storm.latitude, storm.longitude);
                for(let c of XY){
                    if(Math.hypot(x - c.x, y - c.y) < iconSize() / 2){
                        if(selectedStorm === storm)
                            selectedStorm = undefined;
                        else
                            selectedStorm = storm;
                        stormIconClicked = true;
                        break;
                    }
                }
                if(stormIconClicked)
                    break;
            }
            if(!stormIconClicked && selectedStorm)
                selectedStorm = undefined;
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
    if(stormToSpawn){
        stormToSpawn = undefined;
        spawnModeButton.innerText = 'Spawn';
    }else{
        stormToSpawn = {
            latitude: 0,
            longitude: 0,
            sh: false,
            wind: 35,
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
