// This module handles a canvas element that automatically resizes with the browser window, some basic animation control, and event handling for UI

let canvas : HTMLCanvasElement = <HTMLCanvasElement>document.querySelector('.primary-canvas');
let ctx : CanvasRenderingContext2D = <CanvasRenderingContext2D>canvas.getContext('2d');

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

const MOUSE_DRAG_THRESHOLD = 20;

let clickHandler : (x : number, y : number)=>void;
let dragHandler : (dx : number, dy : number, dragEnd : boolean)=>void;
let scrollHandler : (amt : number, x : number, y : number)=>void;
let pinchHandler : (ratio: number)=>void;

// Initial mousedown coordinate for determining when to begin a drag
let dragStartX : number;
let dragStartY : number;

// Canvas (clientXY * pixelRatio) mouse position for handlers and getMousePos()
let mouseCanvasX = 0;
let mouseCanvasY = 0;

// Mouse movement amount in canvas coordinate space
let mouseMovementX = 0;
let mouseMovementY = 0;

// Distance between two touches on a touchscreen in a "pinch" gesture
let pinchDistance = 0;

function updateMouseCoordinates(e: MouseEvent | Touch){
    let oldX = mouseCanvasX;
    let oldY = mouseCanvasY;
    mouseCanvasX = e.clientX * pixelRatio;
    mouseCanvasY = e.clientY * pixelRatio;
    mouseMovementX = mouseCanvasX - oldX;
    mouseMovementY = mouseCanvasY - oldY;
}

// Handle mouse events
canvas.addEventListener('mousedown', e=>{
    updateMouseCoordinates(e);
    if(e.button === 0){
        mouseIsDown = true;
        dragStartX = e.clientX;
        dragStartY = e.clientY;
    }
});

canvas.addEventListener('mousemove', e=>{
    updateMouseCoordinates(e);
    if(mouseIsDown && (mouseBeingDragged || Math.hypot(e.clientX - dragStartX, e.clientY - dragStartY) >= MOUSE_DRAG_THRESHOLD)){
        mouseBeingDragged = true;
        canvas.style.cursor = 'grabbing';
        if(dragHandler)
            dragHandler(mouseMovementX, mouseMovementY, false);
    }
});

canvas.addEventListener('mouseup', e=>{
    updateMouseCoordinates(e);
    if(e.button === 0){
        if(mouseBeingDragged && dragHandler)
            dragHandler(mouseMovementX, mouseMovementY, true);
        else if(clickHandler)
            clickHandler(mouseCanvasX, mouseCanvasY);
        mouseIsDown = false;
        mouseBeingDragged = false;
        canvas.style.cursor = 'auto';
    }
});

canvas.addEventListener('mouseleave', e=>{
    updateMouseCoordinates(e);
    if(mouseBeingDragged && dragHandler){
        dragHandler(mouseMovementX, mouseMovementY, true);
        mouseIsDown = false;
        mouseBeingDragged = false;
        canvas.style.cursor = 'auto';
    }
});

canvas.addEventListener('wheel', e=>{
    updateMouseCoordinates(e);
    if(scrollHandler)
        scrollHandler(e.deltaY / 125, mouseCanvasX, mouseCanvasY);
});

// Handle touchscreen events
canvas.addEventListener('touchstart', e=>{
    if(e.touches.length === 1){
        const touch = e.touches[0];
        updateMouseCoordinates(touch);
        mouseIsDown = true;
        dragStartX = touch.clientX;
        dragStartY = touch.clientY;
    }else if(e.touches.length === 2){
        pinchDistance = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
    }
    e.preventDefault();
});

canvas.addEventListener('touchmove', e=>{
    if(e.touches.length === 1){
        const touch = e.touches[0];
        updateMouseCoordinates(touch);
        if(mouseIsDown && (mouseBeingDragged || Math.hypot(touch.clientX - dragStartX, touch.clientY - dragStartY) >= MOUSE_DRAG_THRESHOLD)){
            mouseBeingDragged = true;
            if(dragHandler)
                dragHandler(mouseMovementX, mouseMovementY, false);
        }
    }else if(e.touches.length > 1){
        const newDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        const pinchRatio = newDist / pinchDistance;
        pinchDistance = newDist;
        if(pinchHandler)
            pinchHandler(pinchRatio);
    }
    e.preventDefault();
});

canvas.addEventListener('touchend', e=>{
    if(e.touches.length < 1){
        if(!mouseBeingDragged && clickHandler)
            clickHandler(mouseCanvasX, mouseCanvasY);
        mouseIsDown = false;
        mouseBeingDragged = false;
    }else if(e.touches.length === 1){
        const touch = e.touches[0];
        updateMouseCoordinates(touch);
    }
    e.preventDefault();
});

canvas.addEventListener('touchcancel', e=>{
    mouseIsDown = false;
    mouseBeingDragged = false;
});

export function handleClick(handler : (x : number, y : number)=>void){
    clickHandler = handler;
}

export function handleDrag(handler : (dx : number, dy : number, dragEnd : boolean)=>void){
    dragHandler = handler;
}

export function handleScroll(handler : (amt : number, x : number, y : number)=>void){
    scrollHandler = handler;
}

export function handlePinch(handler : (ratio: number)=>void){
    pinchHandler = handler;
}

// general mouse position function for use outside of handlers (i.e. drawing relative to current mouse position)
export function getMousePos(){
    return {
        x: mouseCanvasX,
        y: mouseCanvasY
    };
}