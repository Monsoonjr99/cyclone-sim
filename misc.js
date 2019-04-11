function viewingPresent(){
    return viewTick === basin.tick;
}

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

function hem(v){
    return basin.SHem ? -v : v;
}

function hemY(y){
    return basin.SHem ? height-y : y;
}

function createBuffer(w,h){
    let d = displayDensity();
    w = w || width;
    h = h || height;
    return createGraphics(w*d,h*d);
}

function drawBuffer(img,dx,dy,dw,dh,sx,sy,sw,sh){
    let d = displayDensity();
    iw = img.width;
    ih = img.height;
    dx = dx || 0;
    dy = dy || 0;
    dw = dw || iw;
    dh = dh || ih;
    sx = sx || 0;
    sy = sy || 0;
    sw = sw || iw;
    sh = sh || ih;
    sx *= d;
    sy *= d;
    sw *= d;
    sh *= d;
    image(img,dx,dy,dw,dh,sx,sy,sw,sh);
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