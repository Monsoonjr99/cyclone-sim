const DIAMETER = 20;    // Storm icon diameter
const CAT_COLORS = {};      // Category color scheme
const PERLIN_ZOOM = 100;    // Resolution for perlin noise
const TICK_DURATION = 3600000;  // How long in sim time does a tick last in milliseconds (1 hour)
const TRACK_RESOLUTION = 6;    // Number of ticks per advisory
const TRACK_AGELIMIT = 800;     // Number of ticks before track despawns
const START_TIME = moment.utc().startOf('year').valueOf();      // Unix timestamp for beginning of current year
const TIME_FORMAT = "MMM D, Y HH[Z]";
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
    setVersion("Very Sad HHW Thing v","20180718b");

    // stormHistory = [];
    // activeStorms = [];
    canes = [];
    createCanvas(1100,500);
    colorMode(RGB);
    tick = 0;
    paused = false;
    showStrength = false;
    depressionCount = 0;
    namedCount = 0;
    tracks = createGraphics(width,height);
    tracks.strokeWeight(2);
    stormIcons = createGraphics(width,height);
    stormIcons.noStroke();
    
    Env = new Environment();
    Env.addField("shear",5,0.5,100,40,1.5,2); // shearNoise = new NoiseChannel();
    Env.addField("steering",4,0.5,80,100,1,3); // steeringNoise = new NoiseChannel();
    Env.addField("steeringMag",4,0.5,80,100,1,3); // steeringMagNoise = new NoiseChannel();
    Env.addField("SSTAnomaly",6,0.5,150,1000,0.2,2); // SSTAnomalyNoise = new NoiseChannel();
    Env.addField("moisture",4,0.5,130,100,1,2); // moistureNoise = new NoiseChannel();

    testNoise = undefined;
    testNoiseLine = 0;
    testGraphics = createGraphics(width,height);
    testGraphics.noStroke();

    createLand();

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
    stormIcons.clear();
    image(land,0,0,width,height);
    if(!paused) advanceSim();
    for(let s of canes){
        s.spin();
        if(!s.dead){
            stormIcons.push();
            stormIcons.fill(CAT_COLORS[s.cat]);
            stormIcons.translate(s.pos.x,s.pos.y);
            stormIcons.ellipse(0,0,DIAMETER);
            if(s.cat>-1){
                stormIcons.push();
                stormIcons.rotate(s.rotation);
                stormIcons.beginShape();
                stormIcons.vertex(DIAMETER*5/8,-DIAMETER);
                stormIcons.bezierVertex(-DIAMETER*3/2,-DIAMETER*5/8,DIAMETER*3/2,DIAMETER*5/8,-DIAMETER*5/8,DIAMETER);
                stormIcons.bezierVertex(DIAMETER*5/8,0,-DIAMETER*5/8,0,DIAMETER*5/8,-DIAMETER);
                stormIcons.endShape();
                stormIcons.pop();
            }
            stormIcons.fill(0);
            stormIcons.textAlign(CENTER,CENTER);
            stormIcons.text(s.cat>0 ? s.cat : s.cat===0 ? "S" : "D", 0, 0);
            if(showStrength){
                stormIcons.textSize(10);
                stormIcons.text(floor(s.strength), 0, DIAMETER);
            }
            stormIcons.textAlign(LEFT,CENTER);
            stormIcons.textSize(14);
            stormIcons.text(s.name,DIAMETER,0);
            stormIcons.pop();
        }
    }

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

    image(tracks,0,0,width,height);
    image(stormIcons,0,0,width,height);
    fill(200,200,200,100);
    noStroke();
    rect(0,0,width,30);
    fill(0);
    textAlign(LEFT,TOP);
    textSize(18);
    text(moment.utc(START_TIME+tick*TICK_DURATION).format(TIME_FORMAT),5,5);
    let stormKilled = false;
    for(let i=0;i<canes.length;i++){
        if(canes[i].dead && tick-canes[i].dissipationTime>TRACK_AGELIMIT){
            canes.splice(i,1);
            i--;
            stormKilled = true;
        }
    }
    if(stormKilled) refreshTracks();
}

class Cane{
    constructor(x,y,s){
        depressionCount++;
        this.pos = createVector(x,y);
        this.heading = p5.Vector.random2D().mult(2);
        this.strength = s || random(25,50);
        if(this.cat >= 0){
            this.name = LIST_2[namedCount++ % LIST_2.length];
            this.named = true;
        }else{
            this.name = depressionCount + "H";
            this.named = false;
        }
        this.rotation = random(TAU);
        this.dead = false;
        this.formationTime = tick;
        this.dissipationTime = undefined;
        this.track = [];
        if(tick%TRACK_RESOLUTION===0) this.trackPoint();
    }

    update(){
        if(!this.dead){
            this.pos.add(this.heading);
            this.heading.rotate(random(-PI/16,PI/16));
            this.strength += random(-5,5.4) - getLand(this.pos.x,this.pos.y)*random(5)*pow(1.7,(this.strength-50)/40);
            if(!this.named && this.cat >= 0){
                this.name = LIST_2[namedCount++ % LIST_2.length];
                this.named = true;
            }
            if(this.strength > 215) this.strength = 215;
            if(this.strength < 20) this.dead = true;
            if(this.pos.x > width+DIAMETER*2 || this.pos.x < 0-DIAMETER*2 || this.pos.y > height+DIAMETER*2 || this.pos.y < 0-DIAMETER*2) this.dead = true;
            if(!this.dead && tick%TRACK_RESOLUTION===0) this.trackPoint();
            if(this.dead) this.dissipationTime = tick;
        }
    }

    spin(){
        if(!this.dead) this.rotation -= 0.03*pow(1.01,this.strength);
    }

    trackPoint(){
        let p = {pos:createVector(this.pos.x,this.pos.y),cat:this.cat};
        let n = this.track.length-1;
        if(n>0){
            let col = CAT_COLORS[this.track[n].cat];
            tracks.stroke(col);
            let prevPos = this.track[n].pos;
            tracks.line(prevPos.x,prevPos.y,p.pos.x,p.pos.y);
        }
        this.track.push(p);
    }

    renderTrack(){
        for(let n=0;n<this.track.length-1;n++){
            let col = CAT_COLORS[this.track[n].cat];
            tracks.stroke(col);
            let pos = this.track[n].pos;
            let nextPos = this.track[n+1].pos;
            tracks.line(pos.x,pos.y,nextPos.x,nextPos.y);
        }
    }

    get cat(){
        if(this.strength<39) return -1;
        if(this.strength<74) return 0;
        if(this.strength<96) return 1;
        if(this.strength<111) return 2;
        if(this.strength<130) return 3;
        if(this.strength<157) return 4;
        return 5;
    }
}

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
    for(let s of canes) s.renderTrack();
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

function advanceSim(){
    tick++;
    Env.wobble();
    for(let s of canes){
        s.update();
    }
    if(random()>0.99){
        let spawnX;
        let spawnY;
        do{
            spawnX = random(0,width);
            spawnY = random(0,height);
        }while(getLand(spawnX,spawnY));
        canes.push(new Cane(spawnX,spawnY));
    }
}

function mouseInCanvas(){
    return mouseX >= 0 && mouseX < width && mouseY >= 0 && mouseY < height;
}

function mouseClicked(){
    if(mouseInCanvas() && keyIsPressed) {
        if(key === "d" || key === "D"){
            canes.push(new Cane(mouseX,mouseY,30));
        }else if(key === "s" || key === "S"){
            canes.push(new Cane(mouseX,mouseY,50));
        }else if(key === "1"){
            canes.push(new Cane(mouseX,mouseY,80));
        }else if(key === "2"){
            canes.push(new Cane(mouseX,mouseY,105));
        }else if(key === "3"){
            canes.push(new Cane(mouseX,mouseY,120));
        }else if(key === "4"){
            canes.push(new Cane(mouseX,mouseY,145));
        }else if(key === "5"){
            canes.push(new Cane(mouseX,mouseY,170));
        }
    }
    return false;
}

function keyPressed(){
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
        return;
    }
    return false;
}