const DIAMETER = 20;    // Storm icon diameter
const CAT_COLORS = {};      // Category color scheme
const PERLIN_ZOOM = 100;    // Resolution for perlin noise
const TICK_DURATION = 3600000;  // How long in sim time does a tick last in milliseconds (1 hour)
const ADVISORY_TICKS = 6;    // Number of ticks per advisory
const START_TIME = moment.utc().startOf('year').valueOf();      // Unix timestamp for beginning of current year
const YEAR_LENGTH = 365.2425*24;        // The length of a year in ticks; used for seasonal activity
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
const KEY_LEFT_BRACKET = 219;
const KEY_RIGHT_BRACKET = 221;
const KEY_REPEAT_COOLDOWN = 15;
const KEY_REPEATER = 5;

function setup(){
    setVersion("Very Sad HHW Thing v","20181013a");

    seasons = {};
    activeSystems = [];
    createCanvas(960,540); // 16:9 Aspect Ratio
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
    simSpeed = 1; // The divisor for the simulation speed (1 is full-speed, 2 is half-speed, etc.)
    simSpeedFrameCounter = 0; // Counts frames of draw() while unpaused; modulo simSpeed to advance sim when 0
    keyRepeatFrameCounter = 0;
    
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
    CAT_COLORS[4] = color(250,40,250);
    CAT_COLORS[5] = color(250,140,250);
    CAT_COLORS[SUBTROP] = {};
    CAT_COLORS[SUBTROP][-1] = color(60,60,220);
    CAT_COLORS[SUBTROP][0] = color(60,220,60);

    // UI

    topBar = new UI(null,0,0,width,30,function(){
        fill(200,200,200,100);
        noStroke();
        this.fullRect();
        textSize(18);
    });

    dateUI = topBar.append(false,5,3,100,24,function(){
        let txtStr = tickMoment(viewTick).format(TIME_FORMAT) + (viewingPresent() ? '' : ' [Analysis]');
        this.setBox(undefined,undefined,textWidth(txtStr)+6);
        if(this.isHovered()) this.fullRect();
        fill(0);
        textAlign(LEFT,TOP);
        text(txtStr,3,3);
    },function(){
        dateNavigator.toggleShow();
    });

    dateNavigator = new UI(null,0,30,140,50,function(){
        fill(200,200,200,140);
        noStroke();
        this.fullRect();
    },true,false);

    for(let i=0;i<8;i++){
        let x = floor(i/2)*30+15;
        let y = i%2===0 ? 10 : 30;
        let rend = function(){
            if(this.isHovered()){
                fill(200,200,200,100);
                this.fullRect();
            }
            if(paused) fill(0);
            else fill(130);
            if(this.metadata%2===0) triangle(2,8,10,2,18,8);
            else triangle(2,2,18,2,10,8);
        };
        let clck = function(){
            if(paused){
                let m = tickMoment(viewTick);
                switch(this.metadata){
                    case 0:
                    m.add(TICK_DURATION*ADVISORY_TICKS,"ms");
                    break;
                    case 1:
                    m.subtract(TICK_DURATION*ADVISORY_TICKS,"ms");
                    break;
                    case 2:
                    m.add(1,"M");
                    break;
                    case 3:
                    m.subtract(1,"M");
                    break;
                    case 4:
                    m.add(1,"d");
                    break;
                    case 5:
                    m.subtract(1,"d");
                    break;
                    case 6:
                    m.add(1,"y");
                    break;
                    case 7:
                    m.subtract(1,"y");
                    break;
                }
                let t = floor((m.valueOf()-START_TIME)/TICK_DURATION);
                if(this.metadata%2===0 && t%ADVISORY_TICKS!==0) t = floor(t/ADVISORY_TICKS)*ADVISORY_TICKS;
                if(this.metadata%2!==0 && t%ADVISORY_TICKS!==0) t = ceil(t/ADVISORY_TICKS)*ADVISORY_TICKS;
                if(t>tick) t = tick;
                if(t<0) t = 0;
                viewTick = t;
                refreshTracks();
            }
        };
        let button = dateNavigator.append(false,x,y,20,10,rend,clck);
        button.metadata = i;
    }

    pauseButton = topBar.append(false,width-29,3,24,24,function(){
        if(this.isHovered()) this.fullRect();
        fill(0);
        if(paused) triangle(3,3,21,12,3,21);
        else{
            rect(5,3,5,18);
            rect(14,3,5,18);
        }
    },function(){
        paused = !paused;
    });

    stormSelectUI = pauseButton.append(false,-105,0,100,24,function(){
        let txtStr = "";
        if(selectedStorm){
            let sName = selectedStorm.getFullNameByTick(viewTick);
            let sData = selectedStorm.getStormDataByTick(viewTick);
            if(sData){
                let sKts = sData ? sData.windSpeed : 0;
                let sMph = ktsToMph(sKts,WINDSPEED_ROUNDING);
                let sKmh = ktsToKmh(sKts,WINDSPEED_ROUNDING);
                let sPrsr = sData ? sData.pressure: 1031;
                txtStr = sName + ": " + sKts + " kts, " + sMph + " mph, " + sKmh + " km/h / " + sPrsr + " hPa";
            }else{
                sName = selectedStorm.getFullNameByTick("peak");
                txtStr = sName + " - ACE: " + selectedStorm.ACE;
            }
        }else txtStr = paused ? "Paused" : (simSpeed===1 ? "Full-" : simSpeed===2 ? "Half-" : "1/" + simSpeed + " ") + "Speed";
        let newW = textWidth(txtStr)+6;
        this.setBox(-newW-5,undefined,newW);
        fill(200,200,200,100);
        if(this.isHovered()) this.fullRect();
        fill(0);
        textAlign(RIGHT,TOP);
        text(txtStr,this.width-3,3);
    },function(){
        if(!selectedStorm) paused = !paused;
    });
}

function draw(){
    background(0,127,255);
    stormIcons.clear();
    image(land,0,0,width,height);
    if(!paused){
        simSpeedFrameCounter++;
        simSpeedFrameCounter%=simSpeed;
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
    // fill(200,200,200,100);
    // noStroke();
    // rect(0,0,width,30);
    // fill(0);
    // textAlign(LEFT,TOP);
    // textSize(18);
    // text(tickMoment(viewTick).format(TIME_FORMAT) + (viewingPresent() ? '' : ' [Analysis]'),5,5);
    UI.updateMouseOver();
    UI.renderAll();
    // textAlign(RIGHT,TOP);
    // if(selectedStorm){
    //     let sName = selectedStorm.getFullNameByTick(viewTick);
    //     let sData = selectedStorm.getStormDataByTick(viewTick);
    //     if(sData){
    //         let sKts = sData ? sData.windSpeed : 0;
    //         let sMph = ktsToMph(sKts,WINDSPEED_ROUNDING);
    //         let sKmh = ktsToKmh(sKts,WINDSPEED_ROUNDING);
    //         let sPrsr = sData ? sData.pressure: 1031;
    //         text(sName + ": " + sKts + " kts, " + sMph + " mph, " + sKmh + " km/h / " + sPrsr + " hPa",width-5,5);
    //     }else{
    //         sName = selectedStorm.getFullNameByTick("peak");
    //         text(sName + " - ACE: " + selectedStorm.ACE,width-5,5);
    //     }
    // }else text(paused ? "Paused" : (simSpeed===1 ? "Full-" : simSpeed===2 ? "Half-" : "1/" + simSpeed + " ") + "Speed",width-5,5);
    // if(keyIsPressed) console.log("draw: " + key + " / " + keyCode);
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

class Storm{
    constructor(extropical,godModeSpawn){
        let isNewStorm = extropical !== undefined;
        this.current = undefined;
        this.active = false;
        if(isNewStorm){
            this.current = new ActiveSystem(this,extropical,godModeSpawn);
            this.active = true;
            seasons[curSeason].systems.push(this);
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
        this.peak = undefined;
        this.ACE = 0;
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
        let data = t==="peak" ? this.peak : this.getStormDataByTick(t);
        let name = t==="peak" ? this.name : this.getNameByTick(t);
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
        if(this.TC){
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
    }

    updateStats(data){
        let w = data.windSpeed;
        let p = data.pressure;
        let type = data.type;
        let cat = getCat(w);
        let cSeason = seasons[curSeason];
        let prevAdvisory = this.record.length>0 ? this.record[this.record.length-1] : undefined;
        let wasTCB4Update = prevAdvisory ? tropOrSub(prevAdvisory.type) : false;
        let isTropical = tropOrSub(type);
        if(!this.TC && isTropical){
            // cSeason.systems.push(this);
            this.TC = true;
            this.formationTime = tick;
            this.depressionNum = ++cSeason.depressions;
            this.peak = undefined;
            this.name = this.depressionNum + DEPRESSION_LETTER;
            refreshTracks();
            // if(getSeason(this.birthTime)<curSeason) seasons[curSeason-1].systems.push(this); // Register precursor if it formed in previous season, but crossed into current season before becoming tropical
        }
        if(isTropical && cat>=0){
            if(!this.named){
                this.name = getNewName(curSeason,cSeason.namedStorms++); //LIST_2[cSeason.namedStorms++ % LIST_2.length];
                this.named = true;
                this.namedTime = tick;
            }
            this.ACE += pow(w,2)/10000;
            this.ACE = round(this.ACE*10000)/10000;
        }
        if(!this.hurricane && isTropical && cat>=1){
            cSeason.hurricanes++;
            this.hurricane = true;
        }
        if(!this.major && isTropical && cat>=3){
            cSeason.majors++;
            this.major = true;
        }
        if(wasTCB4Update && !isTropical) this.dissipationTime = tick;
        if(!wasTCB4Update && isTropical) this.dissipationTime = undefined;
        if(!this.TC || isTropical){
            if(!this.peak) this.peak = data;
            else if(p<this.peak.pressure) this.peak = data;
        }
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
        let y = spawn ? spawn.y : ext ? random(height*0.1,height*0.4) : random(height*0.7,height*0.9);
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
        this.lowerWarmCore = ext ? 0 : 1;
        this.upperWarmCore = ext ? 0 : 1;
        this.steering = createVector(0); // A vector that updates with the environmental steering
        this.interaction = createVector(0); // A vector that responds to interaction with other storms (e.g. fujiwhara)
        this.interactStatic = createVector(0); // A vector for 'static' use in the 'interact' method
    }

    update(){
        this.getSteering();
        this.pos.add(this.steering);
        this.interaction.set(0);
        let seasSin = seasonalSine(tick);
        let latTrop = map(sqrt(constrain(this.pos.y,0,height)),0,sqrt(height),0,1+0.1*(seasSin-1)); // Temporary environmentel latitude distinction for extratropical vs. tropical
        this.lowerWarmCore = lerp(this.lowerWarmCore,latTrop,0.04);
        this.upperWarmCore = lerp(this.upperWarmCore,this.lowerWarmCore,this.lowerWarmCore>this.upperWarmCore ? 0.02 : 0.3);
        this.lowerWarmCore = constrain(this.lowerWarmCore+random(-0.005,0.005),0,1);
        this.upperWarmCore = constrain(this.upperWarmCore+random(-0.005,0.005),0,1);
        let tropicalness = constrain(map(this.lowerWarmCore,0.5,1,0,1),0,this.upperWarmCore);
        let nontropicalness = constrain(map(this.lowerWarmCore,0.75,0,0,1),0,1);
        this.organization += random(-3,3+seasSin) + random(pow(7,this.upperWarmCore)-4);
        this.organization -= getLand(this.pos.x,this.pos.y)*random(7);
        this.organization -= pow(2,4-((height-this.pos.y)/(height*0.01)));
        this.organization = constrain(this.organization,0,100);
        this.pressure -= random(-3,4.3+seasSin);
        this.pressure += random(sqrt(1-this.organization/100))*(1025-this.pressure)*tropicalness*0.6;
        this.pressure += random(constrain(970-this.pressure,0,40))*nontropicalness;
        if(this.pressure<875) this.pressure = lerp(this.pressure,875,0.1);
        this.windSpeed = map(this.pressure,1030,900,1,160)*map(this.lowerWarmCore,1,0,1,0.6);
        this.type = this.lowerWarmCore<0.6 ? EXTROP : ((this.organization<45 && this.windSpeed<50) || this.windSpeed<20) ? this.upperWarmCore<0.5 ? EXTROP : TROPWAVE : this.upperWarmCore<0.5 ? SUBTROP : TROP;
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
        let adv = new StormData(x,y,p,w,ty);
        this.storm.updateStats(adv);
        this.storm.record.push(adv);
        this.storm.renderTrack(true);
    }

    getSteering(){
        // let dir = Env.get("steering",this.pos.x,this.pos.y,tick);
        // let mag = Env.get("steeringMag",this.pos.x,this.pos.y,tick);
        // this.steering.set(1);
        // this.steering.rotate(dir);
        // this.steering.mult(mag);
        this.steering.set(1);
        let west = Env.get("westerlies",this.pos.x,this.pos.y,tick);
        let trades = Env.get("trades",this.pos.x,this.pos.y,tick);
        let eDir = Env.get("steering",this.pos.x,this.pos.y,tick);
        let eMag = Env.get("steeringMag",this.pos.x,this.pos.y,tick);
        this.steering.rotate(eDir);
        this.steering.mult(eMag/(1+(sin(eDir)/2+0.5)*trades));  // Uses the sine of the direction to give northward bias depending on the strength of the trades
        this.steering.add(west-trades);
        this.steering.add(0,map(this.pressure,1030,900,0.3,-1.5)); // Quick and dirty method of giving stronger storms a northward bias
        this.steering.add(this.interaction); // Fujiwhara
    }

    interact(that,first){   // Quick and sloppy fujiwhara implementation
        this.interactStatic.set(this.pos);
        this.interactStatic.sub(that.pos);
        let m = this.interactStatic.mag();
        if(m<100 && m>0){
            this.interactStatic.rotate(-TAU/4+((5/m)*TAU/16));
            this.interactStatic.setMag((((1030-this.pressure)+(1030-that.pressure))/70)*20/m);
            this.interaction.add(this.interactStatic);
        }
        if(first) that.interact(this);
    }
}

class UI{
    constructor(parent,x,y,w,h,renderer,onclick,showing){
        if(parent instanceof UI){
            this.parent = parent;
            this.parent.children.push(this);
        }
        this.relX = x;
        this.relY = y;
        this.width = w;
        this.height = h;
        if(renderer instanceof Function) this.renderFunc = renderer;
        this.clickFunc = onclick;
        this.children = [];
        this.showing = showing===undefined ? true : showing;
        if(!this.parent) UI.elements.push(this);
    }

    getX(){
        if(this.parent) return this.parent.getX() + this.relX;
        return this.relX;
    }

    getY(){
        if(this.parent) return this.parent.getY() + this.relY;
        return this.relY;
    }

    render(){
        if(this.showing){
            translate(this.relX,this.relY);
            if(this.renderFunc) this.renderFunc();
            if(this.children.length===1){
                this.children[0].render();
            }else{
                for(let c of this.children){
                    push();
                    c.render();
                    pop();
                }
            }
        }
    }

    fullRect(){
        rect(0,0,this.width,this.height);   // Easy method for use in the render function
    }

    setBox(x,y,w,h){    // Should be used inside of the renderer function
        if(x===undefined) x = this.relX;
        if(y===undefined) y = this.relY;
        if(w===undefined) w = this.width;
        if(h===undefined) h = this.height;
        translate(x-this.relX,y-this.relY);
        this.relX = x;
        this.relY = y;
        this.width = w;
        this.height = h;
    }

    append(chain,...opts){
        if(chain!==false && this.children.length>chain) return this.children[chain].append(0,...opts);
        return new UI(this,...opts);
    }

    checkMouseOver(){
        if(this.showing){
            if(this.children.length>0){
                let cmo = null;
                for(let i=this.children.length-1;i>=0;i--){
                    cmo = this.children[i].checkMouseOver();
                    if(cmo) return cmo;
                }
            }
            let left = this.getX();
            let right = left + this.width;
            let top = this.getY();
            let bottom = top + this.height;
            if(this.clickFunc && mouseX>=left && mouseX<right && mouseY>=top && mouseY<bottom) return this;
        }
        return null;
    }

    isHovered(){
        return UI.mouseOver===this;     // onclick parameter in constructor is required in order for hovering to work; use any truthy non-function value if clicking the UI does nothing
    }

    clicked(){
        if(this.clickFunc instanceof Function) this.clickFunc();
    }

    show(){
        this.showing = true;
    }

    hide(){
        this.showing = false;
    }

    toggleShow(){
        this.showing = !this.showing;
    }

    remove(){
        let mouseIsHere = false;
        if(this.checkMouseOver()){
            UI.mouseOver = undefined;
            mouseIsHere = true;
        }
        if(this.parent){
            for(let i=this.parent.children.length-1;i>=0;i--){
                if(this.parent.children[i]===this){
                    this.parent.children.splice(i,1);
                    break;
                }
            }
        }else{
            for(let i=UI.elements.length-1;i>=0;i--){
                if(UI.elements[i]===this){
                    UI.elements.splice(i,1);
                    break;
                }
            }
        }
        if(mouseIsHere) UI.updateMouseOver();
    }

    dropChildren(){
        let mouseIsHere = false;
        if(this.checkMouseOver()){
            UI.mouseOver = undefined;
            mouseIsHere = true;
        }
        this.children = [];
        if(mouseIsHere) UI.updateMouseOver();
    }
}

UI.elements = [];
UI.renderAll = function(){
    for(let u of UI.elements){
        push();
        u.render();
        pop();
    }
};
UI.mouseOver = undefined;
UI.updateMouseOver = function(){
    if(UI.mouseOver && UI.mouseOver.checkMouseOver()===UI.mouseOver) return UI.mouseOver;
    for(let i=UI.elements.length-1;i>=0;i--){
        let u = UI.elements[i];
        let mo = u.checkMouseOver();
        if(mo){
            UI.mouseOver = mo;
            return mo;
        }
    }
    UI.mouseOver = null;
    return null;
};
UI.click = function(){
    UI.updateMouseOver();
    if(UI.mouseOver){
        UI.mouseOver.clicked();
        return true;
    }
    return false;
};

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

class EnvField{
    constructor(noiseC,mapFunc,dependent){
        if(noiseC instanceof NoiseChannel) this.noise = noiseC;
        if(mapFunc instanceof Function) this.mapFunc = mapFunc;
        this.dependent = dependent;
    }

    get(x,y,z){
        let val = 0;
        if(this.mapFunc) val += this.mapFunc(x,y,z);
        if(this.noise && (!this.dependent || !this.mapFunc)) val += this.noise.get(x,y,z);
        return val;
    }

    wobble(){
        if(this.noise) this.noise.wobble();
    }

    save(){
        if(this.noise) this.noise.save();
    }

    load(){
        if(this.noise) this.noise.load();
    }
}

class Environment{
    constructor(){
        this.fields = {};
    }

    addField(name,...fieldArgs){
        this.fields[name] = new EnvField(...fieldArgs);
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

function seasonalSine(t){
    return sin((TAU*(t-(5*YEAR_LENGTH/12)))/YEAR_LENGTH);
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
    if(random()<0.015){
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
            if(simSpeed<1) simSpeed=1;
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