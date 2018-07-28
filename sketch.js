const DIAMETER = 20;    // Storm icon diameter
const CAT_COLORS = {};      // Category color scheme
const PERLIN_ZOOM = 100;    // Resolution for perlin noise
const TICK_DURATION = 3600000;  // How long in sim time does a tick last in milliseconds (1 hour)
const ADVISORY_TICKS = 6;    // Number of ticks per advisory
const START_TIME = moment.utc().startOf('year').valueOf();      // Unix timestamp for beginning of current year
const TIME_FORMAT = "HH[z] MMM DD Y";
const DEPRESSION_LETTER = "H";
const WINDSPEED_ROUNDING = 5;
const LAND_BIAS_FACTORS = [
    5/8,        // Where the "center" should be for land/ocean bias (0-1 scale from west to east)
    0.15,       // Bias factor for the west edge (positive = land more likely, negative = sea more likely)
    -0.3,       // Bias factor for the "center" (as defined by LAND_BIAS_FACTORS[0])
    0.1         // Bias factor for the east edge
];
const EXTROP = "extratropical";
const SUBTROP = "subtropical";
const TROP = "tropical";
const TROPWAVE = "tropical wave";
const STORM_TYPES = [EXTROP,SUBTROP,TROP,TROPWAVE];
const NAMES = [        // Temporary Hardcoded Name List
    ['Ana','Bill','Claudette','Danny','Elsa','Fred','Grace','Henri','Ida','Julian','Kate','Larry','Mindy','Nicholas','Odette','Peter','Rose','Sam','Teresa','Victor','Wanda'],
    ['Alex','Bonnie','Colin','Danielle','Earl','Fiona','Gaston','Hermine','Ian','Julia','Karl','Lisa','Martin','Nicole','Owen','Paula','Richard','Shary','Tobias','Virginie','Walter'],
    ['Arlene','Bret','Cindy','Don','Emily','Franklin','Gert','Harold','Idalia','Jose','Katia','Lee','Margot','Nigel','Ophelia','Philippe','Rina','Sean','Tammy','Vince','Whitney'],
    ['Alberto','Beryl','Chris','Debby','Ernesto','Florence','Gordon','Helene','Isaac','Joyce','Kirk','Leslie','Michael','Nadine','Oscar','Patty','Rafael','Sara','Tony','Valerie','William'],
    ['Andrea','Barry','Chantal','Dorian','Erin','Fernand','Gabrielle','Humberto','Imelda','Jerry','Karen','Lorenzo','Melissa','Nestor','Olga','Pablo','Rebekah','Sebastien','Tanya','Van','Wendy'],
    ['Arthur','Bertha','Cristobal','Dolly','Edouard','Fay','Gonzalo','Hanna','Isaias','Josephine','Kyle','Laura','Marco','Nana','Omar','Paulette','Rene','Sally','Teddy','Vicky','Wilfred'],
    ['Alpha','Beta','Gamma','Delta','Epsilon','Zeta','Eta','Theta','Iota','Kappa','Lambda','Mu','Nu','Xi','Omicron','Pi','Rho','Sigma','Tau','Upsilon','Phi','Chi','Psi','Omega']
];

function setup(){
    setVersion("Very Sad HHW Thing v","20180728a");

    seasons = {};
    activeSystems = [];
    createCanvas(1100,500);
    colorMode(RGB);
    tick = 0;
    viewTick = 0;
    curSeason = getSeason(tick);
    paused = false;
    showStrength = false;
    tracks = createBuffer();
    tracks.strokeWeight(2);
    stormIcons = createBuffer();
    stormIcons.noStroke();
    godMode = true;
    SHem = false;
    selectedStorm = undefined;
    
    Env = new Environment();
    Env.addField("shear",5,0.5,100,40,1.5,2);
    Env.addField("steering",4,0.5,80,100,1,3);
    Env.addField("steeringMag",4,0.5,80,100,1,3);
    Env.addField("SSTAnomaly",6,0.5,150,1000,0.2,2);
    Env.addField("moisture",4,0.5,130,100,1,2);

    testNoise = undefined;
    testNoiseLine = 0;
    testGraphics = createBuffer();
    testGraphics.noStroke();

    createLand();

    CAT_COLORS[EXTROP] = color(220,220,220);
    CAT_COLORS[TROPWAVE] = color(130,130,240);
    CAT_COLORS[-2] = color(130,130,240);
    CAT_COLORS[-1] = color(20,20,230);
    CAT_COLORS[0] = color(20,230,20);
    CAT_COLORS[1] = color(230,230,20);
    CAT_COLORS[2] = color(240,170,20);
    CAT_COLORS[3] = color(240,20,20);
    CAT_COLORS[4] = color(240,20,240);
    CAT_COLORS[5] = color(230,100,230);
    CAT_COLORS[SUBTROP] = {};
    CAT_COLORS[SUBTROP][-1] = color(60,60,220);
    CAT_COLORS[SUBTROP][0] = color(60,220,60);
}

function draw(){
    background(0,127,255);
    stormIcons.clear();
    image(land,0,0,width,height);
    if(!paused) advanceSim();
    if(viewingPresent()) for(let s of activeSystems) s.renderIcon();
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

    // let stormKilled = false;
    // for(let i=0;i<activeSystems.length;i++){
    //     if(activeSystems[i].dead){
    //         activeSystems.splice(i,1);
    //         i--;
    //         stormKilled = true;
    //     }
    // }
    // if(stormKilled) refreshTracks();

    image(tracks,0,0,width,height);
    image(stormIcons,0,0,width,height);
    fill(200,200,200,100);
    noStroke();
    rect(0,0,width,30);
    fill(0);
    textAlign(LEFT,TOP);
    textSize(18);
    text(tickMoment(viewTick).format(TIME_FORMAT) + (viewingPresent() ? '' : ' [Analysis]'),5,5);
    if(selectedStorm){
        textAlign(RIGHT,TOP);
        let sName = selectedStorm.getFullNameByTick(viewTick);
        let sData = selectedStorm.getStormDataByTick(viewTick);
        if(sData){
            let sCat = sData.cat;
            let sKts = sData ? sData.windSpeed : 0;
            let sMph = ktsToMph(sKts,WINDSPEED_ROUNDING);
            let sKmh = ktsToKmh(sKts,WINDSPEED_ROUNDING);
            let sPrsr = sData ? sData.pressure: 1031;
            text(sName + ": " + sKts + " kts, " + sMph + " mph, " + sKmh + " km/h / " + sPrsr + " hPa",width-5,5);
        }else text(sName || "Unnamed",width-5,5);
    }
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

// class StormSystem{                  // Old Class (being replaced by "Storm", "StormData", and "ActiveSystem")
//     constructor(x,y,s){
//         this.pos = createVector(x,y);
//         this.heading = p5.Vector.random2D().mult(2);
//         this.strength = s || random(15,50);
//         this.TC = this.isTropical;        // If the system has been a TC at any point in its life, not necessarily at present
//         this.depressionNum = undefined;
//         this.name = undefined;
//         this.named = false;
//         if(this.TC){
//             seasons[curSeason].systems.push(this);
//             this.depressionNum = ++seasons[curSeason].depressions;
//             if(this.isNameable){
//                 this.name = LIST_2[seasons[curSeason].namedStorms++ % LIST_2.length];
//                 this.named = true;
//             }else this.name = this.depressionNum + DEPRESSION_LETTER;
//         }
//         this.hurricane = this.isHurricane;
//         this.major = this.isMajor;
//         this.rotation = random(TAU);
//         this.dead = false;
//         this.birthTime = tick;                                      // Time formed as a disturbance/low
//         this.formationTime = this.TC ? tick : undefined;            // Time formed as a TC
//         this.dissipationTime = undefined;                           // Time degenerated/dissipated as a TC
//         this.deathTime = undefined;                                 // Time completely dissipated
//         this.namedTime = this.named ? tick : undefined;
//         this.record = [];
//         if(tick%ADVISORY_TICKS===0) this.advisory();
//     }

//     update(){
//         if(!this.dead){
//             let cSeason = seasons[curSeason];
//             let wasTCB4Update = this.isTropical;
//             this.pos.add(this.heading);
//             this.heading.rotate(random(-PI/16,PI/16));
//             this.strength += random(-5,5.4) - getLand(this.pos.x,this.pos.y)*random(5)*pow(1.7,(this.strength-50)/40);
//             if(!this.TC && this.isTropical){
//                 cSeason.systems.push(this);
//                 this.TC = true;
//                 this.formationTime = tick;
//                 this.depressionNum = ++cSeason.depressions;
//                 this.name = this.depressionNum + DEPRESSION_LETTER;
//                 if(getSeason(this.birthTime)<curSeason) seasons[curSeason-1].systems.push(this); // Register precursor if it formed in previous season, but crossed into current season before becoming tropical
//             }
//             if(!this.named && this.isNameable){
//                 this.name = LIST_2[cSeason.namedStorms++ % LIST_2.length];
//                 this.named = true;
//                 this.namedTime = tick;
//             }
//             if(!this.hurricane && this.isHurricane){
//                 cSeason.hurricanes++;
//                 this.hurricane = true;
//             }
//             if(!this.major && this.isMajor){
//                 cSeason.majors++;
//                 this.major = true;
//             }
//             if(wasTCB4Update && !this.isTropical) this.dissipationTime = tick;
//             if(!wasTCB4Update && this.isTropical) this.dissipationTime = undefined;
//             if(this.strength > 215) this.strength = 215;
//             if(this.strength < 0) this.dead = true;
//             if(this.pos.x > width+DIAMETER*2 || this.pos.x < 0-DIAMETER*2 || this.pos.y > height+DIAMETER*2 || this.pos.y < 0-DIAMETER*2) this.dead = true;
//             if(!this.dead && tick%ADVISORY_TICKS===0) this.advisory();
//             if(this.dead){
//                 if(wasTCB4Update) this.dissipationTime = tick;
//                 this.deathTime = tick;
//             }
//         }
//     }

//     aliveAt(t){
//         return t >= this.birthTime && (!this.dead || t < this.deathTime);
//     }

//     renderIcon(){
//         if(this.aliveAt(viewTick)){
//             let vp = viewingPresent();
//             let trAdv = vp ? undefined : this.record[floor(viewTick/ADVISORY_TICKS)-ceil(this.birthTime/ADVISORY_TICKS)];
//             let st = vp ? this.strength : trAdv.strength;
//             let pos = vp ? this.pos : trAdv.pos;
//             let cat = vp ? this.cat : trAdv.cat;
//             let name = vp ? this.name : viewTick<this.formationTime ? undefined : viewTick<this.namedTime ? this.depressionNum+DEPRESSION_LETTER : this.name;
//             this.rotation -= 0.03*pow(1.01,st);
//             stormIcons.push();
//             stormIcons.fill(CAT_COLORS[cat]);
//             stormIcons.translate(pos.x,pos.y);
//             stormIcons.ellipse(0,0,DIAMETER);
//             if(cat>-1){
//                 stormIcons.push();
//                 stormIcons.rotate(this.rotation);
//                 stormIcons.beginShape();
//                 stormIcons.vertex(DIAMETER*5/8,-DIAMETER);
//                 stormIcons.bezierVertex(-DIAMETER*3/2,-DIAMETER*5/8,DIAMETER*3/2,DIAMETER*5/8,-DIAMETER*5/8,DIAMETER);
//                 stormIcons.bezierVertex(DIAMETER*5/8,0,-DIAMETER*5/8,0,DIAMETER*5/8,-DIAMETER);
//                 stormIcons.endShape();
//                 stormIcons.pop();
//             }
//             stormIcons.fill(0);
//             stormIcons.textAlign(CENTER,CENTER);
//             stormIcons.text(cat>0 ? cat : cat===0 ? "S" : cat===-1 ? "D" : "L", 0, 0);
//             if(showStrength){
//                 stormIcons.textSize(10);
//                 stormIcons.text(floor(st), 0, DIAMETER);
//             }
//             if(name){
//                 stormIcons.textAlign(LEFT,CENTER);
//                 stormIcons.textSize(14);
//                 stormIcons.text(name,DIAMETER,0);
//             }
//             stormIcons.pop();
//         }
//     }

//     advisory(){
//         let p = {};
//         p.pos = {};
//         p.pos.x = floor(this.pos.x);
//         p.pos.y = floor(this.pos.y);
//         p.strength = this.strength;
//         p.cat = this.cat;
//         let n = this.record.length-1;
//         if(n>=0){
//             let col = CAT_COLORS[this.record[n].cat];
//             tracks.stroke(col);
//             let prevPos = this.record[n].pos;
//             tracks.line(prevPos.x,prevPos.y,p.pos.x,p.pos.y);
//         }
//         this.record.push(p);
//     }

//     renderTrack(){
//         if(this.aliveAt(viewTick)){
//             for(let n=0;n<this.record.length-1;n++){
//                 let col = CAT_COLORS[this.record[n].cat];
//                 tracks.stroke(col);
//                 let pos = this.record[n].pos;
//                 let nextPos = this.record[n+1].pos;
//                 tracks.line(pos.x,pos.y,nextPos.x,nextPos.y);
//             }
//         }
//     }

//     get cat(){
//         if(this.strength<20) return -2;
//         if(this.strength<39) return -1;
//         if(this.strength<74) return 0;
//         if(this.strength<96) return 1;
//         if(this.strength<111) return 2;
//         if(this.strength<130) return 3;
//         if(this.strength<157) return 4;
//         return 5;
//     }

//     get isTropical(){
//         return this.cat > -2;
//     }

//     get isNameable(){
//         return this.cat > -1;
//     }

//     get isHurricane(){
//         return this.cat > 0;
//     }

//     get isMajor(){
//         return this.cat > 2;
//     }
// }

class Storm{
    constructor(extropical,godModeSpawn){
        let isNewStorm = extropical !== undefined;
        this.current = undefined;
        this.active = false;
        if(isNewStorm){
            this.current = new ActiveSystem(this,extropical,godModeSpawn);
            this.active = true;
        }

        this.TC = false;
        this.named = false;
        this.hurricane = false;
        this.major = false;

        this.rotation = random(TAU);

        this.depressionNum = undefined;
        this.name = undefined;

        this.birthTime = isNewStorm ? tick : undefined;             // Time formed as a disturbance/low
        this.formationTime = undefined;                             // Time formed as a TC
        this.dissipationTime = undefined;                           // Time degenerated/dissipated as a TC
        this.deathTime = undefined;                                 // Time completely dissipated
        this.namedTime = undefined;

        this.record = [];
        if(isNewStorm && tick%ADVISORY_TICKS===0) this.current.advisory();
    }

    aliveAt(t){
        return t >= this.birthTime && (this.active || t < this.deathTime);
    }

    getStormDataByTick(t,allowCurrent){
        if(!this.aliveAt(t)) return null;
        if(t===tick){
            if(allowCurrent) return this.current;
            return this.record.length>0 ? this.record[this.record.length-1] : null;
        }
        return this.record[floor(t/ADVISORY_TICKS)-ceil(this.birthTime/ADVISORY_TICKS)];
    }

    getNameByTick(t){
        return this.aliveAt(t) ? t<this.formationTime ? undefined : t<this.namedTime ? this.depressionNum+DEPRESSION_LETTER : this.name : this.name;
    }

    getFullNameByTick(t){
        let data = this.getStormDataByTick(t);
        let name = this.getNameByTick(t);
        let ty = data ? data.type : null;
        let cat = data ? data.cat : null;
        return ty===TROP ?
            (cat>0 ? "Hurricane" :
            cat>-1 ? "Tropical Storm" : "Tropical Depression") + " " + name :
        ty===SUBTROP ?
            (cat>0 ? "Subtropical Hurricane" :
            cat>-1 ? "Subtropical Storm" : "Subtropical Depression") + " " + name :
        ty===TROPWAVE ?
            name ? "Remnants of " + name : "Unnamed Tropical Wave" :
        ty===EXTROP ?
            name ? "Post-Tropical Cyclone " + name : "Unnamed Extratropical Cyclone" :
        name;
    }

    renderIcon(){
        if(this.aliveAt(viewTick)){
            let adv = this.getStormDataByTick(viewTick);
            let advC = this.getStormDataByTick(viewTick,true);
            let pr = advC.pressure;
            let st = advC.windSpeed;
            let pos = advC.pos;
            let cat = adv ? adv.cat : advC.cat;
            let ty = adv ? adv.type : advC.type;
            let name = this.getNameByTick(viewTick);
            this.rotation -= 0.03*pow(1.01,ktsToMph(st));
            stormIcons.push();
            stormIcons.translate(pos.x,pos.y);
            stormIcons.textAlign(CENTER,CENTER);
            if(selectedStorm===this){
                let selDiameter = DIAMETER*1.1;
                stormIcons.fill(255);
                if(ty===EXTROP){
                    stormIcons.textSize(18);
                    stormIcons.textStyle(BOLD);
                    stormIcons.text("L",0,0);
                }else stormIcons.ellipse(0,0,selDiameter);
                if(cat>=0 && tropOrSub(ty)){
                    stormIcons.push();
                    stormIcons.rotate(this.rotation);
                    stormIcons.beginShape();
                    stormIcons.vertex(selDiameter*5/8,-selDiameter);
                    stormIcons.bezierVertex(-selDiameter*3/2,-selDiameter*5/8,selDiameter*3/2,selDiameter*5/8,-selDiameter*5/8,selDiameter);
                    stormIcons.bezierVertex(selDiameter*5/8,0,-selDiameter*5/8,0,selDiameter*5/8,-selDiameter);
                    stormIcons.endShape();
                    stormIcons.pop();
                }
            }
            stormIcons.fill(getColor(cat,ty));
            if(ty!==EXTROP) stormIcons.ellipse(0,0,DIAMETER);
            if(cat>=0 && tropOrSub(ty)){
                stormIcons.push();
                stormIcons.rotate(this.rotation);
                stormIcons.beginShape();
                stormIcons.vertex(DIAMETER*5/8,-DIAMETER);
                stormIcons.bezierVertex(-DIAMETER*3/2,-DIAMETER*5/8,DIAMETER*3/2,DIAMETER*5/8,-DIAMETER*5/8,DIAMETER);
                stormIcons.bezierVertex(DIAMETER*5/8,0,-DIAMETER*5/8,0,DIAMETER*5/8,-DIAMETER);
                stormIcons.endShape();
                stormIcons.pop();
            }
            stormIcons.fill(ty===EXTROP ? "red" : 0);
            if(ty===EXTROP) stormIcons.textSize(18);
            else stormIcons.textSize(12);
            stormIcons.textStyle(NORMAL);
            stormIcons.text(tropOrSub(ty) ? cat>0 ? (ty===SUBTROP ? "S" : "") + cat : cat===0 ? ty===SUBTROP ? "SS" : "S" : ty===SUBTROP ? "SD" : "D" : "L", 0, 0);
            stormIcons.fill(0);
            if(showStrength){
                stormIcons.textSize(10);
                stormIcons.text(floor(st) + " / " + floor(pr), 0, DIAMETER);
            }
            if(name){
                stormIcons.textAlign(LEFT,CENTER);
                stormIcons.textSize(14);
                stormIcons.text(name,DIAMETER,0);
            }
            stormIcons.pop();
        }
    }

    renderTrack(newestSegment){
        if(newestSegment){
            if(this.record.length>1){
                let adv = this.record[this.record.length-2];
                let col = getColor(adv.cat,adv.type);
                tracks.stroke(col);
                let pos = adv.pos;
                let nextPos = this.record[this.record.length-1].pos;
                tracks.line(pos.x,pos.y,nextPos.x,nextPos.y);
            }
        }else if(this.aliveAt(viewTick)){
            for(let n=0;n<this.record.length-1;n++){
                let adv = this.record[n];
                let col = getColor(adv.cat,adv.type); //CAT_COLORS[tropOrSub(adv.type) ? adv.cat : -2];
                tracks.stroke(col);
                let pos = adv.pos;
                let nextPos = this.record[n+1].pos;
                tracks.line(pos.x,pos.y,nextPos.x,nextPos.y);
            }
        }
    }

    updateStats(w,type){
        let cSeason = seasons[curSeason];
        let prevAdvisory = this.record.length>0 ? this.record[this.record.length-1] : undefined;
        let wasTCB4Update = prevAdvisory ? tropOrSub(prevAdvisory.type) : false;
        let isTropical = tropOrSub(type);
        if(!this.TC && isTropical){
            cSeason.systems.push(this);
            this.TC = true;
            this.formationTime = tick;
            this.depressionNum = ++cSeason.depressions;
            this.name = this.depressionNum + DEPRESSION_LETTER;
            if(getSeason(this.birthTime)<curSeason) seasons[curSeason-1].systems.push(this); // Register precursor if it formed in previous season, but crossed into current season before becoming tropical
        }
        if(!this.named && isTropical && getCat(w)>=0){
            this.name = getNewName(curSeason,cSeason.namedStorms++); //LIST_2[cSeason.namedStorms++ % LIST_2.length];
            this.named = true;
            this.namedTime = tick;
        }
        if(!this.hurricane && isTropical && getCat(w)>=1){
            cSeason.hurricanes++;
            this.hurricane = true;
        }
        if(!this.major && isTropical && getCat(w)>=3){
            cSeason.majors++;
            this.major = true;
        }
        if(wasTCB4Update && !isTropical) this.dissipationTime = tick;
        if(!wasTCB4Update && isTropical) this.dissipationTime = undefined;
    }
}

class StormData{
    constructor(x,y,p,w,t){
        this.pos = createVector(x,y);
        this.pressure = p;
        this.windSpeed = w;
        this.cat = getCat(this.windSpeed);
        this.type = !STORM_TYPES.includes(t) ? EXTROP : t;
    }
}

class ActiveSystem extends StormData{
    constructor(storm,ext,spawn){
        let sType = spawn ? spawn.sType : undefined;
        if(sType==="x") ext = true;
        let x = spawn ? spawn.x : ext ? 0 : width;
        let y = spawn ? spawn.y : ext ? random(0,height/3) : random(2*height/3,height);
        let p = spawn ?
            sType==="x" ? 1005 :
            sType==="l" ? 1015 :
            sType==="d" ? 1005 :
            sType==="s" ? 995 :
            sType==="1" ? 985 :
            sType==="2" ? 975 :
            sType==="3" ? 960 :
            sType==="4" ? 945 :
            sType==="5" ? 925 : 1000 :
        random(1000,1020);
        let w = spawn ?
            sType==="x" ? 15 :
            sType==="l" ? 15 :
            sType==="d" ? 25 :
            sType==="s" ? 45 :
            sType==="1" ? 70 :
            sType==="2" ? 90 :
            sType==="3" ? 105 :
            sType==="4" ? 125 :
            sType==="5" ? 145 : 35 :
        random(15,35);
        let ty = ext ? EXTROP : spawn ?
            sType==="l" ? TROPWAVE : TROP :
        TROPWAVE;
        super(x,y,p,w,ty);
        this.storm = storm;
        this.organization = ext ? 0 : spawn ? sType==="l" ? 20 : 100 : random(0,40);
        this.coreTemp = ext ? 10 : 28;
        this.heading = createVector(ext ? 1 : -1,0).mult(2); // Heading is temporary for testing and will be replaced with environmental steering
    }

    update(){
        this.pos.add(this.heading);
        this.heading.rotate(random(-PI/16,PI/16));
        let envTemp = map(sqrt(map(this.pos.y,0,height,0,9)),0,3,5,30); // Temporary environmentel latitude distinction for extratropical vs. tropical
        let coreTempDiff = envTemp-this.coreTemp;
        if(abs(coreTempDiff)>0.5) this.coreTemp += random(coreTempDiff/25);
        else this.coreTemp += random(-0.1,0.1);
        this.organization += random(-3,3) + random(map(this.coreTemp,20,30,-3,3));
        this.organization -= getLand(this.pos.x,this.pos.y)*random(7);
        this.organization = constrain(this.organization,0,100);
        this.pressure -= random(-3,5);
        this.pressure += random(100-this.organization)*pow(map(this.pressure,1030,970,0,1),2)*constrain(map(this.coreTemp,15,30,0,1),0,1);
        this.pressure += random(constrain(970-this.pressure,0,40))*constrain(map(this.coreTemp,20,5,0,1),0,1);
        if(this.pressure<870) this.pressure = 870;
        this.windSpeed = map(this.pressure,1030,900,1,160)*map(this.coreTemp,30,5,1,0.6);
        this.type = this.coreTemp<20 ? EXTROP : (this.organization<45 && this.windSpeed<50) ? this.coreTemp<25 ? EXTROP : TROPWAVE : this.coreTemp<25 ? SUBTROP : TROP;
        if(this.pressure>1030 || (this.pos.x > width+DIAMETER || this.pos.x < 0-DIAMETER || this.pos.y > height+DIAMETER || this.pos.y < 0-DIAMETER)){
            this.storm.deathTime = tick;
            if(this.storm.dissipationTime===undefined) this.storm.dissipationTime = tick;
            this.storm.active = false;
            this.storm.current = undefined;
            return;
        }
        if(tick%ADVISORY_TICKS===0) this.advisory();
    }

    advisory(){
        let x = floor(this.pos.x);
        let y = floor(this.pos.y);
        let p = round(this.pressure);
        let w = round(this.windSpeed/WINDSPEED_ROUNDING)*WINDSPEED_ROUNDING;
        let ty = this.type;
        this.storm.record.push(new StormData(x,y,p,w,ty));
        this.storm.updateStats(w,ty);
        this.storm.renderTrack(true);
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

function viewingPresent(){
    return viewTick === tick;
}

function refreshTracks(){
    tracks.clear();
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
    land = createBuffer();
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
            if(s.TC) e.systems.push(s);
        }
        seasons[curSeason] = e;
    }
    Env.wobble();
    for(let s of activeSystems){
        // s.update();
        s.current.update();
    }
    if(random()>/*0.99*/0.98){
        // let spawnX;
        // let spawnY;
        // do{
        //     spawnX = random(0,width);
        //     spawnY = random(0,height);
        // }while(getLand(spawnX,spawnY));
        // activeSystems.push(new StormSystem(spawnX,spawnY));
        activeSystems.push(new Storm(random()>0.5));
    }
    let stormKilled = false;
    for(let i=activeSystems.length-1;i>=0;i--){
        if(!activeSystems[i].active /*activeSystems[i].dead*/){
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
                    return false;
                }
            }
            selectedStorm = undefined;
        }else{
            let vSeason = seasons[getSeason(viewTick)];
            let mVector = createVector(mouseX,mouseY);
            for(let i=vSeason.systems.length-1;i>=0;i--){
                let s = vSeason.systems[i];
                if(s.aliveAt(viewTick)){
                    let p = s.getStormDataByTick(viewTick).pos;
                    if(p.dist(mVector)<DIAMETER){
                        selectedStorm = s;
                        return false;
                    }
                }
            }
            selectedStorm = undefined;
        }
        return false;
    }
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

function createBuffer(w,h){
    let d = displayDensity();
    w = w || width;
    h = h || height;
    return createGraphics(w*d,h*d);
}