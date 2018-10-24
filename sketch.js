function setup(){
    setVersion("Very Sad HHW Thing v","20181024a");

    createCanvas(960,540); // 16:9 Aspect Ratio
    colorMode(RGB);
    paused = false;
    showStrength = false;
    tracks = createBuffer();
    tracks.strokeWeight(2);
    stormIcons = createBuffer();
    stormIcons.strokeWeight(3);
    forecastTracks = createBuffer();
    forecastTracks.strokeWeight(3);
    forecastTracks.stroke(240,240,0);
    simSpeed = 0; // The exponent for the simulation speed (0 is full-speed, 1 is half-speed, etc.)
    simSpeedFrameCounter = 0; // Counts frames of draw() while unpaused; modulo 2^simSpeed to advance sim when 0
    keyRepeatFrameCounter = 0;

    testNoise = undefined;
    testNoiseLine = 0;
    testGraphics = createBuffer();
    testGraphics.noStroke();

    CAT_COLORS[EXTROP] = color(220,220,220);
    CAT_COLORS[TROPWAVE] = color(130,130,240);
    CAT_COLORS[-2] = color(130,130,240);
    CAT_COLORS[-1] = color(20,20,230);
    CAT_COLORS[0] = color(20,230,20);
    CAT_COLORS[1] = color(230,230,20);
    CAT_COLORS[2] = color(240,170,20);
    CAT_COLORS[3] = color(240,20,20);
    CAT_COLORS[4] = color(250,40,250);
    CAT_COLORS[5] = color(250,140,250);
    CAT_COLORS[SUBTROP] = {};
    CAT_COLORS[SUBTROP][-1] = color(60,60,220);
    CAT_COLORS[SUBTROP][0] = color(60,220,60);

    initUI();
    init();
}

function draw(){
    background(0,127,255);
    stormIcons.clear();
    image(land,0,0,width,height);
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
                if(viewTick<tick-ADVISORY_TICKS) viewTick = floor(viewTick/ADVISORY_TICKS+1)*ADVISORY_TICKS;
                else viewTick = tick;
                refreshTracks();
            }
        }
    }
    if(viewingPresent()) for(let s of activeSystems) s.renderIcon();
    else for(let s of seasons[getSeason(viewTick)].systems) s.renderIcon();

    if(testNoise){
        for(let k=0;k<width;k+=10){
            testGraphics.push();
            let q = testNoise.get(k,testNoiseLine,tick);
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
    seasons = {};
    activeSystems = [];
    tick = 0;
    viewTick = 0;
    curSeason = getSeason(tick);
    godMode = true;
    SHem = false;
    selectedStorm = undefined;
    seed = moment().valueOf();
    // seed = 1540279062465;

    noiseSeed(seed);

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
    return viewTick === tick;
}

function refreshTracks(){
    tracks.clear();
    forecastTracks.clear();
    if(viewingPresent()) for(let s of activeSystems) s.renderTrack();
    else for(let s of seasons[getSeason(viewTick)].systems) s.renderTrack();
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
    return moment.utc(START_TIME+t*TICK_DURATION);
}

function getSeason(t){
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

function tropOrSub(ty){
    return ty===TROP || ty===SUBTROP;
}

function getColor(c,ty){
    switch(ty){
        case EXTROP:
            return CAT_COLORS[EXTROP];
        case SUBTROP:
            if(c<1) return CAT_COLORS[SUBTROP][c];
            else return CAT_COLORS[c];
            break; // Don't need this because of "return", but this shuts jshint up
        case TROP:
            return CAT_COLORS[c];
        case TROPWAVE:
            return CAT_COLORS[TROPWAVE];
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
    tick++;
    viewTick = tick;
    if(!vp) refreshTracks();
    curSeason = getSeason(tick);
    if(!seasons[curSeason]){
        let e = new Season();
        for(let s of activeSystems){
            e.systems.push(s);
        }
        seasons[curSeason] = e;
    }
    Env.wobble();
    for(let i=0;i<activeSystems.length;i++){
        for(let j=i+1;j<activeSystems.length;j++){
            activeSystems[i].current.interact(activeSystems[j].current,true);
        }
        activeSystems[i].current.update();
    }
    if(random()<0.012){
        activeSystems.push(new Storm(random()>0.5+0.1*seasonalSine(tick)));
    }
    let stormKilled = false;
    for(let i=activeSystems.length-1;i>=0;i--){
        if(!activeSystems[i].active){
            activeSystems.splice(i,1);
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
        if(godMode && keyIsPressed && viewingPresent()) {
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
            activeSystems.push(new Storm(false,g));
        }else if(viewingPresent()){
            let mVector = createVector(mouseX,mouseY);
            for(let i=activeSystems.length-1;i>=0;i--){
                let s = activeSystems[i];
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
            let vSeason = seasons[getSeason(viewTick)];
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