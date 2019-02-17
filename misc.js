function viewingPresent(){
    return viewTick === basin.tick;
}

function refreshTracks(force){
    if(trackMode===2 && !force) return;
    tracks.clear();
    forecastTracks.clear();
    if(selectedStorm) selectedStorm.renderTrack();
    else if(trackMode===2){
        for(let s of basin.fetchSeason(viewTick,true).forSystems()) if(s.TC) s.renderTrack();
    }else if(viewingPresent()) for(let s of basin.activeSystems) s.storm.renderTrack();
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

function cbrt(n){   // Cubed root function since p5 doesn't have one nor does pow(n,1/3) work for negative numbers
    return n<0 ? -pow(abs(n),1/3) : pow(n,1/3);
}