const DIAMETER = 20;
const TRACK_RESOLUTION = 10;
const TRACK_AGELIMIT = 800;
const CAT_COLORS = {};
const PERLIN_ZOOM = 100;
const CENTER_OCEAN_FACTOR = 0.15;


class Cane{
    constructor(x,y){
        this.pos = createVector(x,y);
        this.heading = p5.Vector.random2D();
        this.strength = random(25,50);
        this.rotation = random(TAU);
        this.dead = false;
        this.formationTime = time;
        this.dissipationTime = undefined;
        this.track = [];
        this.trackPoint();
    }

    update(){
        if(!this.dead){
            this.pos.add(this.heading);
            this.heading.rotate(random(-PI/16,PI/16));
            this.strength += random(-5,5.2) - getLand(this.pos.x,this.pos.y)*random(5)*pow(1.7,(this.strength-50)/40);
            this.rotation -= 0.03*pow(1.01,this.strength);
            if(this.strength > 215) this.strength = 215;
            if(this.strength < 20) this.dead = true;
            if(this.pos.x > width+DIAMETER*2 || this.pos.x < 0-DIAMETER*2 || this.pos.y > height+DIAMETER*2 || this.pos.y < 0-DIAMETER*2) this.dead = true;
            if(!this.dead && (time-this.formationTime)%TRACK_RESOLUTION===0) this.trackPoint();
            if(this.dead) this.dissipationTime = time;
        }
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
    let centerOceanBias = map(abs(x-width/2),0,width/2,-CENTER_OCEAN_FACTOR,CENTER_OCEAN_FACTOR);
    let lh = n + centerOceanBias;
    return lh > 0.5 ? lh : 0;
}

function createLand(){
    land = createGraphics(width,height);
    land.noStroke();
    land.fill(0,200,0);
    landXOff = random(512);
    landYOff = random(512);
    for(let i=0;i<width;i++){
        for(let j=0;j<height;j++){
            if(getLand(i,j)) land.rect(i,j,1,1);
        }
    }
}

function setup(){
    setVersion("Very Sad HHW Thing v","20180712a");

    canes = [];
    createCanvas(800,600);
    colorMode(RGB);
    time = 0;
    strokeWeight(2);
    stormIcons = createGraphics(width,height);

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
    image(land,0,0);
    if(random()>0.99){
        let spawnX;
        let spawnY;
        do{
            spawnX = random(0,width);
            spawnY = random(0,height);
        }while(getLand(spawnX,spawnY));
        canes.push(new Cane(spawnX,spawnY));
    }
    for(let s of canes){
        s.update();
        for(let n=0;n<s.track.length-1;n++){
            let col = CAT_COLORS[s.track[n].cat];
            stroke(col);
            let pos = s.track[n].pos;
            let nextPos = s.track[n+1].pos;
            line(pos.x,pos.y,nextPos.x,nextPos.y);
        }
        if(!s.dead){
            stormIcons.push();
            stormIcons.noStroke();
            stormIcons.fill(0);
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
            stormIcons.pop();
        }
    }
    image(stormIcons,0,0);
    for(let i=0;i<canes.length;i++){
        if(canes[i].dead && time-canes[i].dissipationTime>TRACK_AGELIMIT){
            canes.splice(i,1);
            i--;
        }
    }
    time++;
}