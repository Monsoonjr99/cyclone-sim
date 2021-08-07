// This module handles a canvas element that automatically resizes with the browser window, some basic animation control, and event handling for UI

let canvas : HTMLCanvasElement = document.querySelector('.primary-canvas');
let ctx : CanvasRenderingContext2D = canvas.getContext('2d');

// Animations //

// the draw function to be used in animation -- defined by user with setDraw()
let drawFunction : (ctx : CanvasRenderingContext2D, time : number) => void;

// used to define drawFunction
export function setDraw(drawFunc : (ctx : CanvasRenderingContext2D, time : number) => void){
    drawFunction = drawFunc;
}

function drawFrame(time : number){
    if(drawFunction){
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.save();
        drawFunction(ctx, time);
        ctx.restore();
    }
}

// holds ID from requestAnimationFrame
let animationFrameID : number;

// calls requestAnimationFrame to begin animation on the canvas
export function startAnimation(){
    function animationFrameCallback(time : number){
        drawFrame(time);
        animationFrameID = requestAnimationFrame(animationFrameCallback);
    }
    animationFrameID = requestAnimationFrame(animationFrameCallback);
}

// stops a running animation
export function stopAnimation(){
    cancelAnimationFrame(animationFrameID);
}

// Dimensions and Auto-scaling //

export const pixelRatio = Math.ceil(window.devicePixelRatio);
export let width = canvas.width;
export let height = canvas.height;

function updateDimensions(){
    width = canvas.width = window.innerWidth * pixelRatio;
    height = canvas.height = window.innerHeight * pixelRatio;
    drawFrame(performance.now());
}

window.addEventListener('resize', updateDimensions);

updateDimensions();

// UI Event Handling //

let mouseIsDown = false;
let mouseBeingDragged = false;

let clickHandler : (x : number, y : number)=>void;
let dragHandler : (dx : number, dy : number, dragEnd : boolean)=>void;
let scrollHandler : (amt : number)=>void;

// Ratio for converting e.movementX/e.movementY from screen coordinates to canvas coordinates
const screenToCanvas = pixelRatio / window.devicePixelRatio;

canvas.addEventListener('mousedown', e=>{
    if(e.button === 0)
        mouseIsDown = true;
});

canvas.addEventListener('mousemove', e=>{
    if(mouseIsDown){
        mouseBeingDragged = true;
        if(dragHandler)
            dragHandler(e.movementX * screenToCanvas, e.movementY * screenToCanvas, false);
    }
});

canvas.addEventListener('mouseup', e=>{
    if(e.button === 0){
        if(mouseBeingDragged && dragHandler)
            dragHandler(e.movementX * screenToCanvas, e.movementY * screenToCanvas, true);
        else if(clickHandler)
            clickHandler(e.clientX * pixelRatio, e.clientY * pixelRatio);
        mouseIsDown = false;
        mouseBeingDragged = false;
    }
});

canvas.addEventListener('wheel', e=>{
    if(scrollHandler)
        scrollHandler(e.deltaY / 125);
});

export function handleClick(handler : (x : number, y : number)=>void){
    clickHandler = handler;
}

export function handleDrag(handler : (/* beginX : number, beginY : number, xOffset : number, yOffset : number, */dx : number, dy : number, dragEnd : boolean)=>void){
    dragHandler = handler;
}

export function handleScroll(handler : (amt : number)=>void){
    scrollHandler = handler;
}