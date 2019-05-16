function refreshTracks(force){
    if(simSettings.trackMode===2 && !force) return;
    tracks.clear();
    forecastTracks.clear();
    if(selectedStorm) selectedStorm.renderTrack();
    else if(simSettings.trackMode===2){
        for(let s of basin.fetchSeason(viewTick,true).forSystems()) if(s.TC) s.renderTrack();
    }else if(viewingPresent()) for(let s of basin.activeSystems) s.fetchStorm().renderTrack();
    else for(let s of basin.fetchSeason(viewTick,true).forSystems()) s.renderTrack();
}

function createBuffer(w,h,noScale){
    w = w || WIDTH;
    h = h || HEIGHT;
    let b = createGraphics(w,h);
    let metadata = {
        baseWidth: w,
        baseHeight: h,
        noScale: noScale
    };
    buffers.set(b,metadata);
    return b;
}

function rescaleCanvases(s){
    for(let [buffer, metadata] of buffers){
        buffer.resizeCanvas(floor(metadata.baseWidth*s),floor(metadata.baseHeight*s));
        if(!metadata.noScale) buffer.scale(s);
    }
    resizeCanvas(floor(WIDTH*s),floor(HEIGHT*s));
}

function toggleFullscreen(){
    if(document.fullscreenElement===canvas) document.exitFullscreen();
    else{
        canvas.requestFullscreen().then(function(){
            scaler = displayWidth/WIDTH;
            rescaleCanvases(scaler);
            if(basin){
                land.clear();
                refreshTracks(true);
                Env.displayLayer();
            }
        });
    }
}

function drawBuffer(b){
    image(b,0,0,WIDTH,HEIGHT);
}

function getMouseX(){
    return floor(mouseX/scaler);
}

function getMouseY(){
    return floor(mouseY/scaler);
}

function cbrt(n){   // Cubed root function since p5 doesn't have one nor does pow(n,1/3) work for negative numbers
    return n<0 ? -pow(abs(n),1/3) : pow(n,1/3);
}

function renameOldBasinSaveKeys(){  // Rename saved basin keys for save slot 0 from versions v20190217a and prior
    let oldPrefix = LOCALSTORAGE_KEY_PREFIX + '0-';
    let newPrefix = LOCALSTORAGE_KEY_PREFIX + LOCALSTORAGE_KEY_SAVEDBASIN + '0-';
    let f = LOCALSTORAGE_KEY_FORMAT;
    let b = LOCALSTORAGE_KEY_BASIN;
    let n = LOCALSTORAGE_KEY_NAMES;
    if(localStorage.getItem(oldPrefix+f)){
        localStorage.setItem(newPrefix+f,localStorage.getItem(oldPrefix+f));
        localStorage.removeItem(oldPrefix+f);
        localStorage.setItem(newPrefix+b,localStorage.getItem(oldPrefix+b));
        localStorage.removeItem(oldPrefix+b);
        localStorage.setItem(newPrefix+n,localStorage.getItem(oldPrefix+n));
        localStorage.removeItem(oldPrefix+n);
    }
}

document.onfullscreenchange = function(){
    if(document.fullscreenElement===null){
        scaler = 1;
        rescaleCanvases(scaler);
        if(basin){
            land.clear();
            refreshTracks(true);
            Env.displayLayer();
        }
    }
};