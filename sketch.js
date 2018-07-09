const DIAMETER = 20;
const TRACK_RESOLUTION = 10;
const TRACK_AGELIMIT = 800;
const CAT_COLORS = {};

class Cane{
    constructor(x,y){
        this.pos = createVector(x,y);
        this.heading = p5.Vector.random2D();
        this.strength = floor(random(25,51));
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
            this.strength += random()>.9 ? floor(random(-15,16)) : 0;
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

function setup(){
    canes = [];
    createCanvas(800,600);
    colorMode(RGB);
    time = 0;

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
    if(random()>0.99) canes.push(new Cane(random(0,width),random(0,height)));
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
            push();
            noStroke();
            fill(0);
            fill(CAT_COLORS[s.cat]);
            translate(s.pos.x,s.pos.y);
            ellipse(0,0,DIAMETER);
            if(s.cat>-1){
                push();
                rotate(s.rotation);
                beginShape();
                vertex(DIAMETER*5/8,-DIAMETER);
                bezierVertex(-DIAMETER*3/2,-DIAMETER*5/8,DIAMETER*3/2,DIAMETER*5/8,-DIAMETER*5/8,DIAMETER);
                bezierVertex(DIAMETER*5/8,0,-DIAMETER*5/8,0,DIAMETER*5/8,-DIAMETER);
                endShape();
                pop();
            }
            fill(0);
            textAlign(CENTER,CENTER);
            text(s.cat>0 ? s.cat : s.cat===0 ? "S" : "D", 0, 0);
            pop();
        }
    }
    for(let i=0;i<canes.length;i++){
        if(canes[i].dead && time-canes[i].dissipationTime>TRACK_AGELIMIT){
            canes.splice(i,1);
            i--;
        }
    }
    time++;
}