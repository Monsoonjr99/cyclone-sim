function setup(){
    setVersion("Very Sad HHW Thing v","20181118a");

    createCanvas(960,540); // 16:9 Aspect Ratio
    defineColors(); // Set the values of COLORS since color() can't be used before setup()
    background(COLORS.bg);
    paused = false;
    showStrength = false;
    basin = undefined;
    useShader = false;
    // landRendered = 2;

    tracks = createBuffer();
    tracks.strokeWeight(2);
    stormIcons = createBuffer();
    stormIcons.strokeWeight(3);
    forecastTracks = createBuffer();
    forecastTracks.strokeWeight(3);
    forecastTracks.stroke(240,240,0);
    // land = createBuffer();
    // land.noStroke();
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

    // testNoise = undefined;
    // testNoiseLine = 0;
    // testGraphics = createBuffer();
    // testGraphics.noStroke();

    UI.init();
    // init();
}

function draw(){
    background(COLORS.bg);
    // if(landRendered===0){
    //     push();
    //     textSize(48);
    //     textAlign(CENTER,CENTER);
    //     text("Rendering land...",width/2,height/2);
    //     pop();
    //     landRendered++;
    //     return;
    // }
    // if(landRendered<2){
    //     renderLand();
    //     landRendered++;
    //     return;
    // }
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
                if(keyCode===LEFT_ARROW && viewTick>=ADVISORY_TICKS){
                    viewTick = ceil(viewTick/ADVISORY_TICKS-1)*ADVISORY_TICKS;
                    refreshTracks();
                    Env.displayLayer();
                }else if(keyCode===RIGHT_ARROW){
                    if(viewTick<basin.tick-ADVISORY_TICKS) viewTick = floor(viewTick/ADVISORY_TICKS+1)*ADVISORY_TICKS;
                    else viewTick = basin.tick;
                    refreshTracks();
                    Env.displayLayer();
                }
            }
        }
        if(viewingPresent()) for(let s of basin.activeSystems) s.renderIcon();
        else for(let s of basin.seasons[getSeason(viewTick)].systems) s.renderIcon();

        // if(testNoise){
        //     for(let k=0;k<width;k+=10){
        //         testGraphics.push();
        //         let q = testNoise.get(k,testNoiseLine,basin.tick);
        //         testGraphics.colorMode(HSB);
        //         testGraphics.fill(/*map(q,-PI,0,0,300)*/q*300,100,100);
        //         testGraphics.rect(k,testNoiseLine,10,10);
        //         testGraphics.pop();
        //     }
        //     testNoiseLine+=10;
        //     testNoiseLine%=height;
        //     image(testGraphics,0,0,width,height);
        // }

        if(Env.displaying>=0 && Env.layerIsOceanic) image(envLayer,0,0,width,height);
        // image(land,0,0,width,height);
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
}

function init(){
    basin = new Basin(random()<0.5,true);

    viewTick = basin.tick;
    curSeason = getSeason(basin.tick);
    selectedStorm = undefined;
    // seed = 1540279062465;
    noiseSeed(basin.seed);
    Environment.init();
    if(basin.tick===0) Env.record();
    // landRendered = 0;
    land = new Land();
    // createLand();
    topBar.show();
    bottomBar.show();
    finisher = finishInit();
}

function* finishInit(){
    yield* land.init();
}

class Season{
    constructor(){
        this.systems = [];
        this.depressions = 0;
        this.namedStorms = 0;
        this.hurricanes = 0;
        this.majors = 0;
    }
}

function viewingPresent(){
    return viewTick === basin.tick;
}

function refreshTracks(){
    tracks.clear();
    forecastTracks.clear();
    if(viewingPresent()) for(let s of basin.activeSystems) s.renderTrack();
    else for(let s of basin.seasons[getSeason(viewTick)].systems) s.renderTrack();
}

function getNewName(season,sNum){
    let list = NAMES[(season+1)%6];
    if(sNum>=list.length){
        let gNum = sNum-list.length;
        let greeks = NAMES[6];
        if(gNum>=greeks.length) return "Name " + (sNum+1);
        return greeks[gNum];
    }
    return list[sNum];
}

function tickMoment(t){
    return moment.utc(basin.startTime+t*TICK_DURATION);
}

function getSeason(t){
    if(basin.SHem){
        let tm = tickMoment(t);
        let m = tm.month();
        let y = tm.year();
        if(m>=6) return y+1;
        return y;
    }
    return tickMoment(t).year();
}

function getCat(w){     // windspeed in knots
    if(w<34) return -1;
    if(w<64) return 0;
    if(w<83) return 1;
    if(w<96) return 2;
    if(w<113) return 3;
    if(w<137) return 4;
    return 5;
}

function hem(v){
    return basin.SHem ? -v : v;
}

function hemY(y){
    return basin.SHem ? height-y : y;
}

function tropOrSub(ty){
    return ty===TROP || ty===SUBTROP;
}

function getColor(c,ty){
    switch(ty){
        case EXTROP:
            return COLORS.storm[EXTROP];
        case SUBTROP:
            if(c<1) return COLORS.storm[SUBTROP][c];
            else return COLORS.storm[c];
            break; // Don't need this because of "return", but this shuts jshint up
        case TROP:
            return COLORS.storm[c];
        case TROPWAVE:
            return COLORS.storm[TROPWAVE];
    }
}

function ktsToMph(k,rnd){
    let val = k*1.15078;
    if(rnd) val = round(val/rnd)*rnd;
    return val;
}

function ktsToKmh(k,rnd){
    let val = k*1.852;
    if(rnd) val = round(val/rnd)*rnd;
    return val;
}

function advanceSim(){
    let vp = viewingPresent();
    basin.tick++;
    viewTick = basin.tick;
    if(!vp) refreshTracks();
    curSeason = getSeason(basin.tick);
    if(!basin.seasons[curSeason]){
        let e = new Season();
        for(let s of basin.activeSystems){
            e.systems.push(s);
        }
        basin.seasons[curSeason] = e;
    }
    Env.wobble();    // random change in environment for future forecast realism
    for(let i=0;i<basin.activeSystems.length;i++){
        for(let j=i+1;j<basin.activeSystems.length;j++){
            basin.activeSystems[i].current.interact(basin.activeSystems[j].current,true);
        }
        basin.activeSystems[i].current.update();
    }
    if(random()<0.012){
        basin.activeSystems.push(new Storm(random()>0.5+0.1*seasonalSine(basin.tick)));
    }
    let stormKilled = false;
    for(let i=basin.activeSystems.length-1;i>=0;i--){
        if(!basin.activeSystems[i].active){
            basin.activeSystems.splice(i,1);
            stormKilled = true;
        }
    }
    if(stormKilled) refreshTracks();
    if(basin.tick%ADVISORY_TICKS==0){
        Env.displayLayer();
        Env.record();
    }
}

function mouseInCanvas(){
    return mouseX >= 0 && mouseX < width && mouseY >= 0 && mouseY < height;
}

function mouseClicked(){
    if(mouseInCanvas()){
        if(UI.click()) return false;
        if(basin.godMode && keyIsPressed && viewingPresent()) {
            let g = {x: mouseX, y: mouseY};
            if(key === "l" || key === "L"){
                // activeSystems.push(new StormSystem(mouseX,mouseY,10));
                g.sType = "l";
            }else if(key === "d" || key === "D"){
                // activeSystems.push(new StormSystem(mouseX,mouseY,30));
                g.sType = "d";
            }else if(key === "s" || key === "S"){
                // activeSystems.push(new StormSystem(mouseX,mouseY,50));
                g.sType = "s";
            }else if(key === "1"){
                // activeSystems.push(new StormSystem(mouseX,mouseY,80));
                g.sType = "1";
            }else if(key === "2"){
                // activeSystems.push(new StormSystem(mouseX,mouseY,105));
                g.sType = "2";
            }else if(key === "3"){
                // activeSystems.push(new StormSystem(mouseX,mouseY,120));
                g.sType = "3";
            }else if(key === "4"){
                // activeSystems.push(new StormSystem(mouseX,mouseY,145));
                g.sType = "4";
            }else if(key === "5"){
                // activeSystems.push(new StormSystem(mouseX,mouseY,170));
                g.sType = "5";
            }else if(key === "x" || key === "X"){
                g.sType = "x";
            }else return;
            basin.activeSystems.push(new Storm(false,g));
        }else if(viewingPresent()){
            let mVector = createVector(mouseX,mouseY);
            for(let i=basin.activeSystems.length-1;i>=0;i--){
                let s = basin.activeSystems[i];
                let p = s.getStormDataByTick(viewTick,true).pos;
                if(p.dist(mVector)<DIAMETER){
                    selectedStorm = s;
                    refreshTracks();
                    return false;
                }
            }
            selectedStorm = undefined;
            refreshTracks();
        }else{
            let vSeason = basin.seasons[getSeason(viewTick)];
            let mVector = createVector(mouseX,mouseY);
            for(let i=vSeason.systems.length-1;i>=0;i--){
                let s = vSeason.systems[i];
                if(s.aliveAt(viewTick)){
                    let p = s.getStormDataByTick(viewTick).pos;
                    if(p.dist(mVector)<DIAMETER){
                        selectedStorm = s;
                        refreshTracks();
                        return false;
                    }
                }
            }
            selectedStorm = undefined;
            refreshTracks();
        }
        return false;
    }
}

function keyPressed(){
    // console.log("keyPressed: " + key + " / " + keyCode);
    keyRepeatFrameCounter = -1;
    switch(key){
        case " ":
        paused = !paused;
        break;
        case "A":
        if(paused) advanceSim();
        break;
        case "W":
        showStrength = !showStrength;
        break;
        case "E":
        Env.displayNext();
        break;
        default:
        switch(keyCode){
            case KEY_LEFT_BRACKET:
            simSpeed++;
            if(simSpeed>5) simSpeed=5;
            break;
            case KEY_RIGHT_BRACKET:
            simSpeed--;
            if(simSpeed<0) simSpeed=0;
            break;
            default:
            return;
        }
    }
    return false;
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