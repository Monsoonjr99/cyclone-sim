window.onload = function(){
    console.log('Hello World!');
    console.log('Currently testing UI CSS');
    let canvas : HTMLCanvasElement = document.querySelector('.primary-canvas');
    canvas.width = Math.floor(innerWidth * devicePixelRatio);
    canvas.height = Math.floor(innerHeight * devicePixelRatio);
    let ctx : CanvasRenderingContext2D = canvas.getContext('2d');
    ctx.fillStyle = '#F00';
    ctx.font = '28px Verdana';
    ctx.fillText('Test text 3', 600, 250);
};