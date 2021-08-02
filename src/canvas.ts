let canvas : HTMLCanvasElement = document.querySelector('.primary-canvas');
let ctx : CanvasRenderingContext2D = canvas.getContext('2d');

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