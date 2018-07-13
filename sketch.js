const DIAMETER = 20;
const TRACK_RESOLUTION = 10;
const TRACK_AGELIMIT = 800;
const CAT_COLORS = {};
const PERLIN_ZOOM = 100;
const LAND_BIAS_FACTORS = [
    5/8,        // Where the "center" should be for land/ocean bias (0-1 scale from west to east)
    0.15,       // Bias factor for the west edge (positive = land more likely, negative = sea more likely)
    -0.3,       // Bias factor for the "center" (as defined by LAND_BIAS_FACTORS[0])
    0.1         // Bias factor for the east edge
];

function mouseInCanvas(){
    return mouseX >= 0 && mouseX < width && mouseY >= 0 && mouseY < height;
}

class Cane{
    constructor(x,y,s){
        this.pos = createVector(x,y);
        this.heading = p5.Vector.random2D();
        this.strength = s || random(25,50);
        this.rotation = random(TAU);
        this.dead = false;
        this.formationTime = simTime;
        this.dissipationTime = undefined;
        this.track = [];
        this.trackPoint();
    }

    update(){
        if(!this.dead){
            this.pos.add(this.heading);
            this.heading.rotate(random(-PI/16,PI/16));
            this.strength += random(-5,5.2) - getLand(this.pos.x,this.pos.y)*random(5)*pow(1.7,(this.strength-50)/40);
            if(this.strength > 215) this.strength = 215;
            if(this.strength < 20) this.dead = true;
            if(this.pos.x > width+DIAMETER*2 || this.pos.x < 0-DIAMETER*2 || this.pos.y > height+DIAMETER*2 || this.pos.y < 0-DIAMETER*2) this.dead = true;
            if(!this.dead && (simTime-this.formationTime)%TRACK_RESOLUTION===0) this.trackPoint();
            if(this.dead) this.dissipationTime = simTime;
        }
    }

    spin(){
        if(!this.dead) this.rotation -= 0.03*pow(1.01,this.strength);
    }

    trackPoint(){
        this.track.push({pos:createVector(this.pos.x,this.pos.y),cat:this.cat});
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

function getLand(x,y){
    noiseDetail(9);
    let n = noise(x/PERLIN_ZOOM+landXOff,y/PERLIN_ZOOM+landYOff);
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
    landXOff = random(512);
    landYOff = random(512);
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

function incTime(){
    simTime++;
    dateTime.add(30,"minutes");
}

function advanceSim(){
    incTime();
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

function setup(){
    setVersion("Very Sad HHW Thing v","20180713a");

    canes = [];
    createCanvas(1100,500);
    colorMode(RGB);
    simTime = 0;
    dateTime = moment.utc("20180101","YYYYMMDD");
    paused = false;
    showStrength = false;
    strokeWeight(2);
    stormIcons = createGraphics(width,height);
    stormIcons.noStroke();

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
        for(let n=0;n<s.track.length-1;n++){
            let col = CAT_COLORS[s.track[n].cat];
            stroke(col);
            let pos = s.track[n].pos;
            let nextPos = s.track[n+1].pos;
            line(pos.x,pos.y,nextPos.x,nextPos.y);
        }
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
                stormIcons.text(round(s.strength), 0, DIAMETER);
            }
            stormIcons.pop();
        }
    }
    image(stormIcons,0,0,width,height);
    fill(200,200,200,100);
    noStroke();
    rect(0,0,width,30);
    fill(0);
    textAlign(LEFT,TOP);
    textSize(18);
    text(dateTime.format("MMMM D, Y HH:mm[Z]"),5,5);
    for(let i=0;i<canes.length;i++){
        if(canes[i].dead && (simTime-canes[i].dissipationTime>TRACK_AGELIMIT || frameRate()<25)){
            canes.splice(i,1);
            i--;
        }
    }
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
    if(key === " "){
        paused = !paused;
    }else if(key === "A" && paused){
        advanceSim();
    }else if(key === "W"){
        showStrength = !showStrength;
    }
    return false;
}