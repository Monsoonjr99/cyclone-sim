function viewingPresent(){
    return viewTick === basin.tick;
}

function refreshTracks(){
    tracks.clear();
    forecastTracks.clear();
    if(viewingPresent()) for(let s of basin.activeSystems) s.renderTrack();
    else for(let s of basin.seasons[getSeason(viewTick)].systems) s.renderTrack();
}

function tickMoment(t){
    return moment.utc(basin.startTime()+t*TICK_DURATION);
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

function cbrt(n){   // Cubed root function since p5 doesn't have one nor does pow(n,1/3) work for negative numbers
    return n<0 ? -pow(abs(n),1/3) : pow(n,1/3);
}