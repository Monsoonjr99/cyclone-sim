const DIAMETER = 20;    // Storm icon diameter
const CAT_COLORS = {};      // Category color scheme
const PERLIN_ZOOM = 100;    // Resolution for perlin noise
const TICK_DURATION = 3600000;  // How long in sim time does a tick last in milliseconds (1 hour)
const ADVISORY_TICKS = 6;    // Number of ticks per advisory
// const TRACK_AGELIMIT = 800;     // Number of ticks before track despawns
const START_TIME = moment.utc().startOf('year').valueOf();      // Unix timestamp for beginning of current year
const TIME_FORMAT = "MMM D, Y HH[Z]";
const DEPRESSION_LETTER = "H";
const LAND_BIAS_FACTORS = [
    5/8,        // Where the "center" should be for land/ocean bias (0-1 scale from west to east)
    0.15,       // Bias factor for the west edge (positive = land more likely, negative = sea more likely)
    -0.3,       // Bias factor for the "center" (as defined by LAND_BIAS_FACTORS[0])
    0.1         // Bias factor for the east edge
];
const LIST_2 = [        // Temporary Hardcoded Name List
    'Alex',
    'Bonnie',
    'Colin',
    'Danielle',
    'Earl',
    'Fiona',
    'Gaston',
    'Hermine',
    'Ian',
    'Julia',
    'Karl',
    'Lisa',
    'Martin',
    'Nicole',
    'Owen',
    'Paula',
    'Richard',
    'Shary',
    'Tobias',
    'Virginie',
    'Walter'
];

function setup(){
    setVersion("Very Sad HHW Thing v","20180721a");

    seasons = {};
    activeSystems = [];
    createCanvas(1100,500);
    colorMode(RGB);
    tick = 0;
    viewTick = 0;
    viewingPresent = true;
    curSeason = getSeason(tick);
    paused = false;
    showStrength = false;
    tracks = createGraphics(width,height);
    tracks.strokeWeight(2);
    stormIcons = createGraphics(width,height);
    stormIcons.noStroke();
    
    Env = new Environment();
    Env.addField("shear",5,0.5,100,40,1.5,2);
    Env.addField("steering",4,0.5,80,100,1,3);
    Env.addField("steeringMag",4,0.5,80,100,1,3);
    Env.addField("SSTAnomaly",6,0.5,150,1000,0.2,2);
    Env.addField("moisture",4,0.5,130,100,1,2);

    testNoise = undefined;
    testNoiseLine = 0;
    testGraphics = createGraphics(width,height);
    testGraphics.noStroke();

    createLand();

    CAT_COLORS[-2] = color(130,130,240);
    CAT_COLORS[-1] = color(20,20,230);
    CAT_COLORS[0] = color(20,230,20);
    CAT_COLORS[1] = color(230,230,20);
    CAT_COLORS[2] = color(240,170,20);
    CAT_COLORS[3] = color(240,20,20);
    CAT_COLORS[4] = color(240,20,240);
    CAT_COLORS[5] = color(230,100,230);
}

function draw(){
    background(0,127,255);
    viewingPresent = viewTick === tick;
    stormIcons.clear();
    image(land,0,0,width,height);
    if(!paused) advanceSim();
    if(viewingPresent) for(let s of activeSystems) s.renderIcon();
    else for(let s of seasons[getSeason(viewTick)].systems) s.renderIcon();

    if(testNoise){
        for(let k=0;k<width;k+=10){
            testGraphics.push();
            let q = testNoise.get(k,testNoiseLine,tick);
            testGraphics.colorMode(HSB);
            testGraphics.fill(q*300,100,100);
            testGraphics.rect(k,testNoiseLine,10,10);
            testGraphics.pop();
        }
        testNoiseLine+=10;
        testNoiseLine%=height;
        image(testGraphics,0,0,width,height);
    }

    let stormKilled = false;
    for(let i=0;i<activeSystems.length;i++){
        if(activeSystems[i].dead/*  && tick-activeSystems[i].deathTime>TRACK_AGELIMIT */){
            activeSystems.splice(i,1);
            i--;
            stormKilled = true;
        }
    }
    if(stormKilled) refreshTracks();

    image(tracks,0,0,width,height);
    image(stormIcons,0,0,width,height);
    fill(200,200,200,100);
    noStroke();
    rect(0,0,width,30);
    fill(0);
    textAlign(LEFT,TOP);
    textSize(18);
    text(tickMoment(viewTick).format(TIME_FORMAT) + (viewingPresent ? '' : ' [Analysis]'),5,5);
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

class StormSystem{
    constructor(x,y,s){
        this.pos = createVector(x,y);
        this.heading = p5.Vector.random2D().mult(2);
        this.strength = s || random(15,50);
        this.TC = this.isTropical;        // If the system has been a TC at any point in its life, not necessarily at present
        this.depressionNum = undefined;
        this.name = undefined;
        this.named = false;
        if(this.TC){
            seasons[curSeason].systems.push(this);
            this.depressionNum = ++seasons[curSeason].depressions;
            if(this.isNameable){
                this.name = LIST_2[seasons[curSeason].namedStorms++ % LIST_2.length];
                this.named = true;
            }else this.name = this.depressionNum + DEPRESSION_LETTER;
        }
        this.hurricane = this.isHurricane;
        this.major = this.isMajor;
        this.rotation = random(TAU);
        this.dead = false;
        this.birthTime = tick;                                      // Time formed as a disturbance/low
        this.formationTime = this.TC ? tick : undefined;            // Time formed as a TC
        this.dissipationTime = undefined;                           // Time degenerated/dissipated as a TC
        this.deathTime = undefined;                                 // Time completely dissipated
        this.namedTime = this.named ? tick : undefined;
        this.record = [];
        if(tick%ADVISORY_TICKS===0) this.advisory();
        activeSystems.push(this);
    }

    update(){
        if(!this.dead){
            let cSeason = seasons[curSeason];
            let wasTCB4Update = this.isTropical;
            this.pos.add(this.heading);
            this.heading.rotate(random(-PI/16,PI/16));
            this.strength += random(-5,5.4) - getLand(this.pos.x,this.pos.y)*random(5)*pow(1.7,(this.strength-50)/40);
            if(!this.TC && this.isTropical){
                cSeason.systems.push(this);
                this.TC = true;
                this.formationTime = tick;
                this.depressionNum = ++cSeason.depressions;
                this.name = this.depressionNum + DEPRESSION_LETTER;
                if(getSeason(this.birthTime)<curSeason) seasons[curSeason-1].systems.push(this); // Register precursor if it formed in previous season, but crossed into current season before becoming tropical
            }
            if(!this.named && this.isNameable){
                this.name = LIST_2[cSeason.namedStorms++ % LIST_2.length];
                this.named = true;
                this.namedTime = tick;
            }
            if(!this.hurricane && this.isHurricane){
                cSeason.hurricanes++;
                this.hurricane = true;
            }
            if(!this.major && this.isMajor){
                cSeason.majors++;
                this.major = true;
            }
            if(wasTCB4Update && !this.isTropical) this.dissipationTime = tick;
            if(!wasTCB4Update && this.isTropical) this.dissipationTime = undefined;
            if(this.strength > 215) this.strength = 215;
            if(this.strength < 0) this.dead = true;
            if(this.pos.x > width+DIAMETER*2 || this.pos.x < 0-DIAMETER*2 || this.pos.y > height+DIAMETER*2 || this.pos.y < 0-DIAMETER*2) this.dead = true;
            if(!this.dead && tick%ADVISORY_TICKS===0) this.advisory();
            if(this.dead){
                if(wasTCB4Update) this.dissipationTime = tick;
                this.deathTime = tick;
            }
        }
    }

    aliveAt(t){
        return t >= this.birthTime && (!this.dead || t < this.deathTime);
    }

    renderIcon(){
        if(this.aliveAt(viewTick)){
            let trAdv = viewingPresent ? undefined : this.record[floor(viewTick/ADVISORY_TICKS)-ceil(this.birthTime/ADVISORY_TICKS)];
            let st = viewingPresent ? this.strength : trAdv.strength;
            let pos = viewingPresent ? this.pos : trAdv.pos;
            let cat = viewingPresent ? this.cat : trAdv.cat;
            let name = viewingPresent ? this.name : viewTick<this.formationTime ? undefined : viewTick<this.namedTime ? this.depressionNum+DEPRESSION_LETTER : this.name;
            this.rotation -= 0.03*pow(1.01,st);
            stormIcons.push();
            stormIcons.fill(CAT_COLORS[cat]);
            stormIcons.translate(pos.x,pos.y);
            stormIcons.ellipse(0,0,DIAMETER);
            if(cat>-1){
                stormIcons.push();
                stormIcons.rotate(this.rotation);
                stormIcons.beginShape();
                stormIcons.vertex(DIAMETER*5/8,-DIAMETER);
                stormIcons.bezierVertex(-DIAMETER*3/2,-DIAMETER*5/8,DIAMETER*3/2,DIAMETER*5/8,-DIAMETER*5/8,DIAMETER);
                stormIcons.bezierVertex(DIAMETER*5/8,0,-DIAMETER*5/8,0,DIAMETER*5/8,-DIAMETER);
                stormIcons.endShape();
                stormIcons.pop();
            }
            stormIcons.fill(0);
            stormIcons.textAlign(CENTER,CENTER);
            stormIcons.text(cat>0 ? cat : cat===0 ? "S" : cat===-1 ? "D" : "L", 0, 0);
            if(showStrength){
                stormIcons.textSize(10);
                stormIcons.text(floor(st), 0, DIAMETER);
            }
            if(name){
                stormIcons.textAlign(LEFT,CENTER);
                stormIcons.textSize(14);
                stormIcons.text(name,DIAMETER,0);
            }
            stormIcons.pop();
        }
    }

    advisory(){
        let p = {};
        p.pos = {};
        p.pos.x = floor(this.pos.x);
        p.pos.y = floor(this.pos.y);
        p.strength = this.strength;
        p.cat = this.cat;
        let n = this.record.length-1;
        if(n>=0){
            let col = CAT_COLORS[this.record[n].cat];
            tracks.stroke(col);
            let prevPos = this.record[n].pos;
            tracks.line(prevPos.x,prevPos.y,p.pos.x,p.pos.y);
        }
        this.record.push(p);
    }

    renderTrack(){
        if(this.aliveAt(viewTick)){
            for(let n=0;n<this.record.length-1;n++){
                let col = CAT_COLORS[this.record[n].cat];
                tracks.stroke(col);
                let pos = this.record[n].pos;
                let nextPos = this.record[n+1].pos;
                tracks.line(pos.x,pos.y,nextPos.x,nextPos.y);
            }
        }
    }

    get cat(){
        if(this.strength<20) return -2;
        if(this.strength<39) return -1;
        if(this.strength<74) return 0;
        if(this.strength<96) return 1;
        if(this.strength<111) return 2;
        if(this.strength<130) return 3;
        if(this.strength<157) return 4;
        return 5;
    }

    get isTropical(){
        return this.cat > -2;
    }

    get isNameable(){
        return this.cat > -1;
    }

    get isHurricane(){
        return this.cat > 0;
    }

    get isMajor(){
        return this.cat > 2;
    }

    get namedAdvisory(){
        return floor(this.namedTime/ADVISORY_TICKS);
    }

    get formationAdvisory(){
        return floor(this.formationTime/ADVISORY_TICKS);
    }
}

// class StormRender{

// }

// class StormData{

// }

class NoiseChannel{
    constructor(octaves,falloff,zoom,zZoom,wMax,zWMax,wRFac){
        const OFFSET_RANDOM_FACTOR = 4096;
        this.octaves = octaves || 4;
        this.falloff = falloff || 0.5;
        this.zoom = zoom || 100;
        this.zZoom = zZoom || this.zoom;
        this.xOff = random(OFFSET_RANDOM_FACTOR);
        this.yOff = random(OFFSET_RANDOM_FACTOR);
        this.zOff = random(OFFSET_RANDOM_FACTOR);
        this.wobbleVector = p5.Vector.random2D();
        this.wobbleMax = wMax || 1;
        this.zWobbleMax = zWMax || this.wobbleMax;
        this.wobbleRotFactor = wRFac || PI/16;
        this.wobbleSave = {};
        this.save();
    }

    get(x,y,z){
        x = x || 0;
        y = y || 0;
        z = z || 0;
        noiseDetail(this.octaves,this.falloff);
        return noise(x/this.zoom+this.xOff,y/this.zoom+this.yOff,z/this.zZoom+this.zOff);
    }

    wobble(){
        this.wobbleVector.setMag(random(0.0001,this.wobbleMax));
        this.xOff += this.wobbleVector.x/this.zoom;
        this.yOff += this.wobbleVector.y/this.zoom;
        this.zOff += random(-this.zWobbleMax,this.zWobbleMax)/this.zZoom;
        this.wobbleVector.rotate(random(-this.wobbleRotFactor,this.wobbleRotFactor));
    }

    save(){
        let m = this.wobbleSave;
        m.wobbleX = this.wobbleVector.x;
        m.wobbleY = this.wobbleVector.y;
        m.xOff = this.xOff;
        m.yOff = this.yOff;
        m.zOff = this.zOff;
    }

    load(){
        let m = this.wobbleSave;
        this.wobbleVector.set(m.wobbleX,m.wobbleY);
        this.xOff = m.xOff;
        this.yOff = m.yOff;
        this.zOff = m.zOff;
    }
}

class Environment{
    constructor(){
        this.fields = {};
    }

    addField(name,...fieldArgs){
        this.fields[name] = new NoiseChannel(...fieldArgs);
    }

    wobble(){
        for(let i in this.fields) this.fields[i].wobble();
    }

    startForecast(){
        for(let i in this.fields) this.fields[i].save();
    }

    resetForecast(){
        for(let i in this.fields) this.fields[i].load();
    }

    get(field,x,y,z){
        return this.fields[field].get(x,y,z);
    }

    test(field){
        if(field) testNoise = this.fields[field];
        else testNoise = undefined;
        testGraphics.clear();
    }

    testChaos(n){
        this.resetForecast();
        for(let i=0;i<n;i++) this.wobble();
    }
}

function refreshTracks(){
    tracks.clear();
    if(viewingPresent) for(let s of activeSystems) s.renderTrack();
    else for(let s of seasons[getSeason(viewTick)].systems) s.renderTrack();
}

function getLand(x,y){
    let n = landNoise.get(x,y);
    let landBiasAnchor = width * LAND_BIAS_FACTORS[0];
    let landBias = x < landBiasAnchor ?
        map(x,0,landBiasAnchor,LAND_BIAS_FACTORS[1],LAND_BIAS_FACTORS[2]) :
        map(x-landBiasAnchor,0,width-landBiasAnchor,LAND_BIAS_FACTORS[2],LAND_BIAS_FACTORS[3]);
    let lh = n + landBias;
    return lh > 0.5 ? lh : 0;
}

function createLand(){
    land = createGraphics(width,height);
    land.noStroke();
    landNoise = new NoiseChannel(9,0.5,100);
    for(let i=0;i<width;i++){
        for(let j=0;j<height;j++){
            let landVal = getLand(i,j);
            if(landVal){
                if(landVal > 1){
                    land.fill(240);
                }else if(landVal > 0.9){
                    land.fill(190,190,190);
                }else if(landVal > 0.8){
                    land.fill(160,160,160);
                }else if(landVal > 0.7){
                    land.fill(180,130,40);
                }else if(landVal > 0.6){
                    land.fill(20,170,20);
                }else if(landVal > 0.55){
                    land.fill(0,200,0);
                }else{
                    land.fill(250,250,90);
                }
                land.rect(i,j,1,1);
            }
        }
    }
}

function tickMoment(t){
    return moment.utc(START_TIME+t*TICK_DURATION);
}

function getSeason(t){
    return tickMoment(t).year();
}

function advanceSim(){
    tick++;
    viewTick = tick;
    if(!viewingPresent) refreshTracks();
    curSeason = getSeason(tick);
    if(!seasons[curSeason]){
        let e = new Season();
        for(let s of activeSystems){
            if(s.TC) e.systems.push(s);
        }
        seasons[curSeason] = e;
    }
    Env.wobble();
    for(let s of activeSystems){
        s.update();
    }
    if(random()>0.99){
        let spawnX;
        let spawnY;
        do{
            spawnX = random(0,width);
            spawnY = random(0,height);
        }while(getLand(spawnX,spawnY));
        new StormSystem(spawnX,spawnY);
    }
}

function mouseInCanvas(){
    return mouseX >= 0 && mouseX < width && mouseY >= 0 && mouseY < height;
}

function mouseClicked(){
    if(mouseInCanvas()){
        if(keyIsPressed && viewingPresent) {
            if(key === "l" || key === "L"){
                new StormSystem(mouseX,mouseY,10);
            }else if(key === "d" || key === "D"){
                new StormSystem(mouseX,mouseY,30);
            }else if(key === "s" || key === "S"){
                new StormSystem(mouseX,mouseY,50);
            }else if(key === "1"){
                new StormSystem(mouseX,mouseY,80);
            }else if(key === "2"){
                new StormSystem(mouseX,mouseY,105);
            }else if(key === "3"){
                new StormSystem(mouseX,mouseY,120);
            }else if(key === "4"){
                new StormSystem(mouseX,mouseY,145);
            }else if(key === "5"){
                new StormSystem(mouseX,mouseY,170);
            }
        }
        return false;
    }
}

function keyPressed(){
    switch(key){
        case " ":
        paused = !paused;
        if(!viewingPresent){
            viewTick = tick;
            refreshTracks();
        }
        break;
        case "A":
        if(paused) advanceSim();
        break;
        case "W":
        showStrength = !showStrength;
        break;
        default:
        switch(keyCode){
            case LEFT_ARROW:
            if(paused && viewTick>=ADVISORY_TICKS) viewTick = ceil(viewTick/ADVISORY_TICKS-1)*ADVISORY_TICKS;
            refreshTracks();
            break;
            case RIGHT_ARROW:
            if(paused && viewTick<tick-ADVISORY_TICKS) viewTick = floor(viewTick/ADVISORY_TICKS+1)*ADVISORY_TICKS;
            else viewTick = tick;
            refreshTracks();
            break;
            default:
            return;
        }
    }
    return false;
}