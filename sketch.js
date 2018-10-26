function setup(){
    setVersion("Very Sad HHW Thing v","20181026a");

    createCanvas(960,540); // 16:9 Aspect Ratio
    defineColors(); // Set the values of COLORS since color() can't be used before setup()
    background(COLORS.bg);
    paused = false;
    showStrength = false;

    tracks = createBuffer();
    tracks.strokeWeight(2);
    stormIcons = createBuffer();
    stormIcons.strokeWeight(3);
    forecastTracks = createBuffer();
    forecastTracks.strokeWeight(3);
    forecastTracks.stroke(240,240,0);
    land = createBuffer();
    land.noStroke();
    snow = [];
    for(let i=0;i<SNOW_LAYERS;i++){
        snow[i] = createBuffer();
        snow[i].noStroke();
        snow[i].fill(COLORS.snow);
    }

    simSpeed = 0; // The exponent for the simulation speed (0 is full-speed, 1 is half-speed, etc.)
    simSpeedFrameCounter = 0; // Counts frames of draw() while unpaused; modulo 2^simSpeed to advance sim when 0
    keyRepeatFrameCounter = 0;

    testNoise = undefined;
    testNoiseLine = 0;
    testGraphics = createBuffer();
    testGraphics.noStroke();

    initUI();
    init();
}

function draw(){
    if(landRendered===0){
        push();
        textSize(48);
        textAlign(CENTER,CENTER);
        text("Rendering land...",width/2,height/2);
        pop();
        landRendered++;
        return;
    }
    if(landRendered<2){
        renderLand();
        landRendered++;
        return;
    }
    background(COLORS.bg);
    stormIcons.clear();
    image(land,0,0,width,height);
    image(snow[floor(map(seasonalSine(viewTick,SNOW_SEASON_OFFSET),-1,1,0,SNOW_LAYERS))],0,0,width,height);
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
            }else if(keyCode===RIGHT_ARROW){
                if(viewTick<basin.tick-ADVISORY_TICKS) viewTick = floor(viewTick/ADVISORY_TICKS+1)*ADVISORY_TICKS;
                else viewTick = basin.tick;
                refreshTracks();
            }
        }
    }
    if(viewingPresent()) for(let s of basin.activeSystems) s.renderIcon();
    else for(let s of basin.seasons[getSeason(viewTick)].systems) s.renderIcon();

    if(testNoise){
        for(let k=0;k<width;k+=10){
            testGraphics.push();
            let q = testNoise.get(k,testNoiseLine,basin.tick);
            testGraphics.colorMode(HSB);
            testGraphics.fill(/*map(q,-PI,0,0,300)*/q*300,100,100);
            testGraphics.rect(k,testNoiseLine,10,10);
            testGraphics.pop();
        }
        testNoiseLine+=10;
        testNoiseLine%=height;
        image(testGraphics,0,0,width,height);
    }

    image(tracks,0,0,width,height);
    image(forecastTracks,0,0,width,height);
    image(stormIcons,0,0,width,height);

    UI.updateMouseOver();
    UI.renderAll();
}

function init(){
    basin = new Basin(random()<0.5,true);

    viewTick = 0;
    curSeason = getSeason(basin.tick);
    selectedStorm = undefined;
    // seed = 1540279062465;

    noiseSeed(basin.seed);

    Env = new Environment();    // Sad environmental stuff that is barely even used so far
    Env.addField("shear",new NoiseChannel(5,0.5,100,40,1.5,2));
    Env.addField("steering",new NoiseChannel(4,0.5,80,100,1,3),function(x,y,z){
        // let h = map(y,0,height,1,-1);
        // let mainDir = map(h<0?-sqrt(-h):sqrt(h),1,-1,0,-PI);
        // let noiseDir = map(this.noise.get(x,y,z),0,1,-PI,PI);
        // let noiseMult = map(y,0,height,3/4,1/4)/*-1/2*sq(h)+1/2*/;
        // return mainDir+noiseDir*noiseMult;
        return map(this.noise.get(x,y,z),0,1,0,TAU*2);
    },true);
    Env.addField("steeringMag",new NoiseChannel(4,0.5,80,100,1,3),function(x,y,z){
        // return map(y,0,height,4,2)*map(this.noise.get(x,y,z),0,1,0.7,1.3);
        return pow(1.5,map(this.noise.get(x,y,z),0,1,-4,4))*2;
    },true);
    Env.addField("westerlies",new NoiseChannel(4,0.5,80,100,1,3),function(x,y,z){
        let h = cos(map(y,0,height,0,PI))/2+0.5;
        return constrain(pow(h+map(this.noise.get(x,y,z),0,1,-0.3,0.3),2)*4,0,4);
    });
    Env.addField("trades",new NoiseChannel(4,0.5,80,100,1,3),function(x,y,z){
        let h = cos(map(y,0,height,PI,0))/2+0.5;
        return constrain(pow(h+map(this.noise.get(x,y,z),0,1,-0.3,0.3),2)*3,0,3);
    });
    Env.addField("SSTAnomaly",new NoiseChannel(6,0.5,150,1000,0.2,2));
    Env.addField("moisture",new NoiseChannel(4,0.5,130,100,1,2));

    landRendered = 0;
    createLand();
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
    Env.wobble();
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