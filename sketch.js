function setup(){
    setVersion(TITLE + " v",VERSION_NUMBER);
    document.title = TITLE;

    createCanvas(960,540); // 16:9 Aspect Ratio
    defineColors(); // Set the values of COLORS since color() can't be used before setup()
    background(COLORS.bg);
    paused = false;
    showStrength = false;
    basin = undefined;
    newBasinSettings = {};
    useShader = false;
    trackMode = 0;
    doAutosave = true;
    storageQuotaExhausted = false;

    tracks = createBuffer();
    tracks.strokeWeight(2);
    stormIcons = createBuffer();
    stormIcons.strokeWeight(3);
    forecastTracks = createBuffer();
    forecastTracks.strokeWeight(3);
    forecastTracks.stroke(240,240,0);
    landBuffer = createBuffer();
    landBuffer.noStroke();
    landShader = createBuffer();
    landShader.noStroke();
    coastLine = createBuffer();
    coastLine.fill(0);
    coastLine.noStroke();
    envLayer = createBuffer();
    envLayer.colorMode(HSB);
    envLayer.strokeWeight(2);
    envLayer.noStroke();
    snow = [];
    for(let i=0;i<SNOW_LAYERS;i++){
        snow[i] = createBuffer();
        snow[i].noStroke();
        snow[i].fill(COLORS.snow);
    }

    simSpeed = 0; // The exponent for the simulation speed (0 is full-speed, 1 is half-speed, etc.)
    simSpeedFrameCounter = 0; // Counts frames of draw() while unpaused; modulo 2^simSpeed to advance sim when 0
    keyRepeatFrameCounter = 0;

    renameOldBasinSaveKeys();
    UI.init();
}

function draw(){
    try{
        background(COLORS.bg);
        if(basin){
            if(finisher){
                let t = finisher.next();
                if(t.done){
                    finisher = undefined;
                    return;
                }
                push();
                textSize(48);
                textAlign(CENTER,CENTER);
                text(t.value,width/2,height/2);
                pop();
                return;
            }
            stormIcons.clear();
            if(!paused){
                simSpeedFrameCounter++;
                simSpeedFrameCounter%=pow(2,simSpeed);
                if(simSpeedFrameCounter===0) advanceSim();
            }
            keyRepeatFrameCounter++;
            if(keyIsPressed && (keyRepeatFrameCounter>=KEY_REPEAT_COOLDOWN || keyRepeatFrameCounter===0) && keyRepeatFrameCounter%KEY_REPEATER===0){
                if(paused){
                    let oldS = basin.getSeason(viewTick);
                    if(keyCode===LEFT_ARROW && viewTick>=ADVISORY_TICKS){
                        viewTick = ceil(viewTick/ADVISORY_TICKS-1)*ADVISORY_TICKS;
                        let newS = basin.getSeason(viewTick);
                        refreshTracks(newS!==oldS);
                        Env.displayLayer();
                    }else if(keyCode===RIGHT_ARROW){
                        if(viewTick<basin.tick-ADVISORY_TICKS) viewTick = floor(viewTick/ADVISORY_TICKS+1)*ADVISORY_TICKS;
                        else viewTick = basin.tick;
                        let newS = basin.getSeason(viewTick);
                        refreshTracks(newS!==oldS);
                        Env.displayLayer();
                    }
                }
            }
            if(viewingPresent()) for(let s of basin.activeSystems) s.fetchStorm().renderIcon();
            else for(let s of basin.fetchSeason(viewTick,true).forSystems()) s.renderIcon();
    
            if(Env.displaying>=0 && Env.layerIsOceanic) image(envLayer,0,0,width,height);
            image(landBuffer,0,0,width,height);
            image(snow[floor(map(seasonalSine(viewTick,SNOW_SEASON_OFFSET),-1,1,0,SNOW_LAYERS))],0,0,width,height);
            if(useShader) image(landShader,0,0,width,height);
            if(Env.displaying>=0 && !Env.layerIsOceanic){
                image(envLayer,0,0,width,height);
                if(!Env.layerIsVector) image(coastLine,0,0,width,height);
            }
            image(tracks,0,0,width,height);
            image(forecastTracks,0,0,width,height);
            image(stormIcons,0,0,width,height);
        }
    
        UI.updateMouseOver();
        UI.renderAll();
    }catch(err){            // BSOD
        resetMatrix();
        colorMode(RGB);
        background(0,0,200);
        fill(255);
        textSize(24);
        textAlign(LEFT,TOP);
        text("Crash!",width/16,height/8);
        textSize(15);
        text(err.stack,width/16,height/4);
        console.error(err);
        noLoop();
    }
}

function init(load){
    if(load!==undefined){
        basin = new Basin(load);
    }else{
        let hem;
        if(newBasinSettings.hem===1) hem = false;
        else if(newBasinSettings.hem===2) hem = true;
        else hem = random()<0.5;
        let year = hem ? SHEM_DEFAULT_YEAR : NHEM_DEFAULT_YEAR;
        if(newBasinSettings.year!==undefined) year = newBasinSettings.year;
        let seed = newBasinSettings.seed;
        let hyper = newBasinSettings.hyper;
        let names = newBasinSettings.names;
        let hurrTerm = newBasinSettings.hurrTerm;
        basin = new Basin(false,year,hem,true,hyper,seed,names,hurrTerm);
        newBasinSettings = {};
    }

    viewTick = basin.tick;
    selectedStorm = undefined;
    noiseSeed(basin.seed);
    Environment.init();
    if(!basin.fetchSeason(-1,true)) basin.seasons[basin.getSeason(-1)] = new Season();
    if(basin.tick===0) Env.record();
    land = new Land();
    refreshTracks(true);
    primaryWrapper.show();
    finisher = finishInit();
}

function* finishInit(){
    yield* land.init();
}

function advanceSim(){
    let vp = viewingPresent();
    basin.tick++;
    let os = basin.getSeason(viewTick);
    viewTick = basin.tick;
    let curSeason = basin.getSeason(-1);
    if(!basin.fetchSeason(curSeason)){
        let e = new Season();
        for(let s of basin.activeSystems) e.addSystem(new StormRef(s.fetchStorm()));
        basin.seasons[curSeason] = e;
    }
    if(!vp || curSeason!==os) refreshTracks(curSeason!==os);
    Env.wobble();    // random change in environment for future forecast realism
    for(let i=0;i<basin.activeSystems.length;i++){
        for(let j=i+1;j<basin.activeSystems.length;j++){
            basin.activeSystems[i].interact(basin.activeSystems[j],true);
        }
        basin.activeSystems[i].update();
    }
    if(random()<0.012){
        basin.spawn(random()>0.5+0.1*seasonalSine(basin.tick));
    }
    let stormKilled = false;
    for(let i=basin.activeSystems.length-1;i>=0;i--){
        if(!basin.activeSystems[i].fetchStorm().current){
            basin.activeSystems.splice(i,1);
            stormKilled = true;
        }
    }
    if(stormKilled) refreshTracks();
    if(basin.tick%ADVISORY_TICKS==0){
        Env.displayLayer();
        Env.record();
    }
    let curTime = basin.tickMoment();
    if(doAutosave && !storageQuotaExhausted && (curTime.date()===1 || curTime.date()===15) && curTime.hour()===0) basin.save();
}