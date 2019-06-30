class Storm{
    constructor(data){
        this.current = data instanceof ActiveSystem && data;
        this.id = undefined;
        if(this.current) basin.fetchSeason(-1,true,true).addSystem(this);

        this.TC = false;
        this.named = false;
        this.hurricane = false;
        this.major = false;
        this.c5 = false;

        this.rotation = random(TAU);

        this.depressionNum = undefined;
        this.nameNum = undefined;
        this.name = undefined;

        this.birthTime = this.current ? basin.tick : undefined;       // Time formed as a disturbance/low
        this.formationTime = undefined;                             // Time formed as a TC
        this.dissipationTime = undefined;                           // Time degenerated/dissipated as a TC
        this.deathTime = undefined;                                 // Time completely dissipated
        this.namedTime = undefined;

        this.record = [];
        this.peak = undefined;
        this.ACE = 0;
        this.deaths = 0;
        this.damage = 0;
        if(!this.current && data instanceof LoadData) this.load(data);
    }

    originSeason(){
        return basin.getSeason(this.birthTime);
    }

    aliveAt(t){
        return t >= this.birthTime && (!!this.current || t < this.deathTime);
    }

    getStormDataByTick(t,allowCurrent){
        if(!this.aliveAt(t)) return null;
        if(t===basin.tick){
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
        let cat = data ? data.getCat() : null;
        let hurricaneTerm = HURRICANE_STRENGTH_TERM[basin.hurricaneStrengthTerm];
        return ty===TROP ?
            (cat>0 ? hurricaneTerm :
            cat>-1 ? "Tropical Storm" : "Tropical Depression") + " " + name :
        ty===SUBTROP ?
            (cat>0 ? "Subtropical " + hurricaneTerm :
            cat>-1 ? "Subtropical Storm" : "Subtropical Depression") + " " + name :
        ty===TROPWAVE ?
            name ? "Remnants of " + name : "Unnamed Tropical Wave" :
        ty===EXTROP ?
            name ? "Post-Tropical Cyclone " + name : "Unnamed Extratropical Cyclone" :
        name ? name : "Unknown Cyclone";
    }

    renderIcon(){
        if(this.aliveAt(viewTick)){
            let adv = this.getStormDataByTick(viewTick);
            let advC = this.getStormDataByTick(viewTick,true);
            let pr = advC.pressure;
            let st = advC.windSpeed;
            let pos = advC.pos;
            let cat = adv ? adv.getCat() : advC.getCat();
            let ty = adv ? adv.type : advC.type;
            let name = this.getNameByTick(viewTick);
            this.rotation -= 0.03*pow(1.01,ktsToMph(min(270,st)));
            stormIcons.push();
            stormIcons.translate(pos.x,pos.y);
            stormIcons.textAlign(CENTER,CENTER);
            if(selectedStorm===this){
                stormIcons.noFill();
                stormIcons.stroke(255);
                if(ty===EXTROP){
                    stormIcons.textSize(18);
                    stormIcons.text("L",0,0);
                }else stormIcons.ellipse(0,0,DIAMETER);
                if(cat>=0 && tropOrSub(ty)){
                    stormIcons.push();
                    if(basin.SHem) stormIcons.scale(1,-1);
                    stormIcons.rotate(this.rotation);
                    stormIcons.beginShape();
                    stormIcons.vertex(DIAMETER*5/8,-DIAMETER);
                    stormIcons.bezierVertex(-DIAMETER*3/2,-DIAMETER*5/8,DIAMETER*3/2,DIAMETER*5/8,-DIAMETER*5/8,DIAMETER);
                    stormIcons.bezierVertex(DIAMETER*5/8,0,-DIAMETER*5/8,0,DIAMETER*5/8,-DIAMETER);
                    stormIcons.endShape();
                    stormIcons.pop();
                }
            }
            stormIcons.fill(getColor(cat,ty));
            stormIcons.noStroke();
            if(ty!==EXTROP) stormIcons.ellipse(0,0,DIAMETER);
            if(cat>=0 && tropOrSub(ty)){
                stormIcons.push();
                if(basin.SHem) stormIcons.scale(1,-1);
                stormIcons.rotate(this.rotation);
                stormIcons.beginShape();
                stormIcons.vertex(DIAMETER*5/8,-DIAMETER);
                stormIcons.bezierVertex(-DIAMETER*3/2,-DIAMETER*5/8,DIAMETER*3/2,DIAMETER*5/8,-DIAMETER*5/8,DIAMETER);
                stormIcons.bezierVertex(DIAMETER*5/8,0,-DIAMETER*5/8,0,DIAMETER*5/8,-DIAMETER);
                stormIcons.endShape();
                stormIcons.pop();
            }
            if(ty===EXTROP){
                stormIcons.fill(COLORS.storm.extL);
                stormIcons.textSize(18);
            }else{
                stormIcons.fill(0);
                stormIcons.textSize(12);
            }
            stormIcons.textStyle(NORMAL);
            stormIcons.text(tropOrSub(ty) ? cat>0 ? (ty===SUBTROP ? "S" : "") + cat : cat===0 ? ty===SUBTROP ? "SS" : "S" : ty===SUBTROP ? "SD" : "D" : "L", 0, 0);
            stormIcons.fill(0);
            if(simSettings.showStrength){
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
        if(simSettings.trackMode!==3){
            if(this.TC || simSettings.trackMode===1){
                if(newestSegment){
                    if(this.record.length>1 && (selectedStorm===this || selectedStorm===undefined)){
                        let t = (this.record.length-2)*ADVISORY_TICKS+ceil(this.birthTime/ADVISORY_TICKS)*ADVISORY_TICKS;
                        let adv = this.record[this.record.length-2];
                        let col = getColor(adv.getCat(),adv.type);
                        tracks.stroke(col);
                        let pos = adv.pos;
                        let nextPos = this.record[this.record.length-1].pos;
                        if(simSettings.trackMode===1 || (t>=this.formationTime && (!this.dissipationTime || t<this.dissipationTime))) tracks.line(pos.x,pos.y,nextPos.x,nextPos.y);
                    }
                }else if(this.aliveAt(viewTick) || simSettings.trackMode===2 || selectedStorm===this){
                    for(let n=0;n<this.record.length-1;n++){
                        let t = n*ADVISORY_TICKS+ceil(this.birthTime/ADVISORY_TICKS)*ADVISORY_TICKS;
                        if(simSettings.trackMode!==1){
                            if(t<this.formationTime) continue;
                            if(t>=this.dissipationTime) break;
                        }
                        let adv = this.record[n];
                        let col = getColor(adv.getCat(),adv.type);
                        tracks.stroke(col);
                        let pos = adv.pos;
                        let nextPos = this.record[n+1].pos;
                        tracks.line(pos.x,pos.y,nextPos.x,nextPos.y);
                    }
                }
            }
            if(selectedStorm===this && basin.viewingPresent() && this.current){
                forecastTracks.clear();
                let p = this.current.trackForecast.points;
                for(let n=0;n<p.length;n++){
                    forecastTracks.point(p[n].x,p[n].y);
                }
            }
        }
    }

    updateStats(data){
        let w = data.windSpeed;
        let p = data.pressure;
        let type = data.type;
        let cat = data.getCat();
        let cSeason = basin.fetchSeason(-1,true,true);
        let prevAdvisory = this.record.length>0 ? this.record[this.record.length-1] : undefined;
        let wasTCB4Update = prevAdvisory ? tropOrSub(prevAdvisory.type) : false;
        let isTropical = tropOrSub(type);
        if(!this.TC && isTropical){
            this.TC = true;
            this.formationTime = basin.tick;
            this.depressionNum = ++cSeason.depressions;
            this.peak = undefined;
            this.name = this.depressionNum + DEPRESSION_LETTER;
        }
        if(isTropical && cat>=0){
            if(!this.named){
                this.nameNum = cSeason.namedStorms++;
                if(basin.sequentialNameIndex>=0){
                    this.nameNum = basin.sequentialNameIndex++;
                    basin.sequentialNameIndex %= basin.nameList.length;
                }
                this.name = getNewName(basin.getSeason(-1),this.nameNum);
                this.named = true;
                this.namedTime = basin.tick;
            }
            let a = pow(w,2)/ACE_DIVISOR;
            this.ACE += a;
            cSeason.ACE += a;
            this.ACE = round(this.ACE*ACE_DIVISOR)/ACE_DIVISOR;
            cSeason.ACE = round(cSeason.ACE*ACE_DIVISOR)/ACE_DIVISOR;
        }
        if(!this.hurricane && isTropical && cat>=1){
            cSeason.hurricanes++;
            this.hurricane = true;
        }
        if(!this.major && isTropical && cat>=3){
            cSeason.majors++;
            this.major = true;
        }
        if(!this.c5 && isTropical && cat>=5){
            cSeason.c5s++;
            this.c5 = true;
        }
        // if(isTropical){
        //     let lnd = land.get(data.pos.x,data.pos.y);
        //     let pop = lnd ? round(250000*(1+hemY(data.pos.y)/height)*pow(0.8,map(lnd,0.5,1,0,30))) : 0;
        //     let damPot = pow(1.062,data.windSpeed)-1;   // damage potential
        //     let dedPot = pow(1.02,data.windSpeed)-1;    // death potential
        //     let m = pow(1.5,randomGaussian());      // modifier
        //     damPot *= m;
        //     dedPot *= m;
        //     let dam = pop*damPot*20*pow(1.1,random(-1,1));
        //     let ded = round(pop*dedPot*0.00001*pow(1.1,random(-1,1)));
        //     this.damage += dam;
        //     this.damage = round(this.damage*100)/100;
        //     this.deaths += ded;
        //     cSeason.damage += dam;
        //     cSeason.damage = round(cSeason.damage*100)/100;
        //     cSeason.deaths += ded;
        // }
        if(wasTCB4Update && !isTropical) this.dissipationTime = basin.tick;
        if(!wasTCB4Update && isTropical){
            this.dissipationTime = undefined;
            if(this.formationTime!==basin.tick) refreshTracks(true);
        }
        if(!this.TC || isTropical){
            if(!this.peak) this.peak = data;
            else if(p<this.peak.pressure) this.peak = data;
        }
        cSeason.modified = true;
        basin.fetchSeason(this.originSeason(),false,true).modified = true;
    }

    save(){
        // new format

        let obj = {};
        for(let p of [
            'id',
            'depressionNum',
            'nameNum',
            'birthTime',
            'deaths',
            'damage'
        ]) obj[p] = this[p];
        obj.record = StormData.saveArr(this.record);
        return obj;

        // old format

        // let numData = [];
        // numData.push(this.id);
        // numData.push(this.depressionNum!==undefined ? this.depressionNum : -1);
        // numData.push(this.nameNum!==undefined ? this.nameNum : -1);
        // numData.push(this.birthTime);
        // numData.push(this.deaths);
        // numData.push(this.damage/DAMAGE_DIVISOR);
        // let record = StormData.saveArr(this.record);
        // numData = encodeB36StringArray(numData);
        // return numData + "." + record;
    }

    load(loadData){
        if(loadData instanceof LoadData){
            if(loadData.format>=FORMAT_WITH_INDEXEDDB){
                let obj = loadData.value;
                this.record = StormData.loadArr(loadData.sub(obj.record));
                for(let p of [
                    'id',
                    'depressionNum',
                    'nameNum',
                    'birthTime',
                    'deaths',
                    'damage'
                ]) this[p] = obj[p];
                if(!this.birthTime) this.birthTime = 0;
                if(!this.deaths) this.deaths = 0;
                if(!this.damage) this.damage = 0;
            }else{
                let data = loadData.value;
                data = data.split(".");
                let numData = decodeB36StringArray(data[0]);
                this.record = StormData.loadArr(loadData.sub(data[1]));
                this.damage = numData.pop()*DAMAGE_DIVISOR || 0;
                this.deaths = numData.pop() || 0;
                this.birthTime = numData.pop() || 0;
                this.nameNum = numData.pop();
                if(this.nameNum<0) this.nameNum = undefined;
                this.depressionNum = numData.pop();
                if(this.depressionNum<0) this.depressionNum = undefined;
                this.id = numData.pop() || 0;
            }
            if(this.depressionNum!==undefined) this.TC = true;
            if(this.nameNum!==undefined) this.named = true;
            for(let i=0;i<this.record.length;i++){
                let d = this.record[i];
                let trop = tropOrSub(d.type);
                let t = (i+ceil(this.birthTime/ADVISORY_TICKS))*ADVISORY_TICKS;
                if(trop && !this.formationTime) this.formationTime = t;
                if(trop && this.dissipationTime) this.dissipationTime = undefined;
                if(!trop && this.formationTime && !this.dissipationTime) this.dissipationTime = t;
                let cat = d.getCat();
                if(trop && !this.namedTime && cat>=0) this.namedTime = t;
                if(trop && !this.hurricane && cat>=1) this.hurricane = true;
                if(trop && !this.major && cat>=3) this.major = true;
                if(trop && !this.c5 && cat>=5) this.c5 = true;
                if(!this.TC || trop){
                    if(!this.peak) this.peak = d;
                    else if(d.pressure<this.peak.pressure) this.peak = d;
                }
                if(trop && cat>=0){
                    this.ACE *= ACE_DIVISOR;
                    this.ACE += pow(d.windSpeed,2);
                    this.ACE /= ACE_DIVISOR;
                }
            }
            for(let a of basin.activeSystems){
                if(a.storm instanceof StormRef){
                    if(a.storm.season === loadData.season && a.storm.refId === this.id){
                        this.current = a;
                        a.storm = this;
                    }
                }
            }
            if(!this.current) this.deathTime = (this.record.length-1+ceil(this.birthTime/ADVISORY_TICKS))*ADVISORY_TICKS+1;
            if(this.TC && !this.dissipationTime) this.dissipationTime = this.deathTime;
            if(this.nameNum!==undefined) this.name = getNewName(basin.getSeason(this.namedTime),this.nameNum);
            else if(this.depressionNum!==undefined) this.name = this.depressionNum+DEPRESSION_LETTER;
        }
    }
}

class StormRef{
    constructor(s){
        if(s instanceof Storm){
            this.season = s.originSeason();
            this.refId = s.id;
            this.lastApplicableAt = s.deathTime;    // this property will optimize season loading, but for now I won't bother saving it in localStorage
            this.ref = undefined;
        }else if(s instanceof LoadData){
            this.season = undefined;
            this.refId = undefined;
            this.ref = undefined;
            this.lastApplicableAt = undefined;
            this.load(s);
        }
    }

    fetch(){
        if(this.ref && basin.seasons[this.season]) return this.ref;
        let seas = basin.fetchSeason(this.season);
        if(seas) this.ref = seas.fetchSystemById(this.refId);
        else{
            basin.fetchSeason(this.season,false,false,s=>{
                this.ref = s.fetchSystemById(this.refId);
            });
            return null;
        }
        return this.ref;
    }

    save(){
        // new format

        let obj = {};
        for(let p of ['refId','season','lastApplicableAt']) obj[p] = this[p];
        return obj;

        // old format

        // let arr = [];
        // arr.push(this.refId);
        // arr.push(this.season);
        // return encodeB36StringArray(arr);
    }

    load(data){
        if(data instanceof LoadData){
            if(data.format>=FORMAT_WITH_INDEXEDDB){
                for(let p of ['refId','season','lastApplicableAt']) this[p] = data.value[p];
            }else{
                let str = data.value;
                let arr = decodeB36StringArray(str);
                this.season = arr.pop();
                this.refId = arr.pop();
            }
        }
    }
}

class StormData{
    constructor(x,y,p,w,t){
        this.pos = undefined;
        this.pressure = undefined;
        this.windSpeed = undefined; // in knots
        this.type = undefined;
        if(x instanceof LoadData){
            this.load(x,y);
        }else{
            this.pos = createVector(x,y);
            this.pressure = p;
            this.windSpeed = w;
            this.type = t<STORM_TYPES ? t : EXTROP;
        }
    }

    getCat(){
        let w = this.windSpeed;
        if(w<34) return -1;
        if(w<64) return 0;
        if(w<83) return 1;
        if(w<96) return 2;
        if(w<113) return 3;
        if(w<137) return 4;
        return 5;
    }

    save(inArr){
        // new format

        let obj = {};
        obj.pos = {x: this.pos.x, y: this.pos.y};
        for(let p of ['pressure','windSpeed','type']) obj[p] = this[p];
        return obj;

        // old format

        // let arr = [];
        // if(!inArr){
        //     let opts = {};
        //     arr.push(encodePoint(this.pos,opts));
        // }
        // arr.push(this.pressure);
        // arr.push(this.windSpeed);
        // arr.push(this.type);
        // return encodeB36StringArray(arr);
    }

    load(data,posInArr){
        if(data instanceof LoadData){
            if(data.format>=FORMAT_WITH_INDEXEDDB){
                let obj = data.value;
                this.pos = createVector(obj.pos.x,obj.pos.y);
                for(let p of ['pressure','windSpeed','type']) this[p] = obj[p];
            }else{
                let str = data.value;
                let arr = decodeB36StringArray(str);
                this.type = arr.pop();
                this.windSpeed = arr.pop();
                this.pressure = arr.pop();
                if(posInArr) this.pos = posInArr;
                else{
                    let opts = {
                        p5Vec: true
                    };
                    this.pos = decodePoint(arr.pop(),opts);
                }
            }
        }
    }

    static saveArr(arr){
        // new format

        let x = [];
        let y = [];
        let pressure = [];
        let windSpeed = [];
        let type = [];
        for(let d of arr){
            if(d instanceof StormData){
                x.push(d.pos.x);
                y.push(d.pos.y);
                pressure.push(constrain(d.pressure,0,pow(2,16)-1));
                windSpeed.push(constrain(d.windSpeed,0,pow(2,16)-1));
                type.push(d.type);
            }
        }
        let obj = {};
        obj.pos = {x: new Float32Array(x), y: new Float32Array(y)};
        obj.pressure = new Uint16Array(pressure);
        obj.windSpeed = new Uint16Array(windSpeed);
        obj.type = new Uint8ClampedArray(type);
        return obj;

        // old format

        // let opts = {};
        // let positions = [];
        // let theRest = [];
        // for(let i=0;i<arr.length;i++){
        //     positions.push(arr[i].pos);
        //     theRest.push(arr[i].save(true));
        // }
        // return encodePointArray(positions,opts) + "/" + theRest.join("/");
    }

    static loadArr(data){
        if(data instanceof LoadData){
            if(data.format>=FORMAT_WITH_INDEXEDDB){
                let obj = data.value;
                let arr = [];
                let x = [...obj.pos.x];
                let y = [...obj.pos.y];
                let pressure = [...obj.pressure];
                let windSpeed = [...obj.windSpeed];
                let type = [...obj.type];
                for(let i=0;i<x.length;i++){
                    arr[i] = new StormData(x[i],y[i],pressure[i],windSpeed[i],type[i]);
                }
                return arr;
            }else{
                let str = data.value;
                let arr = str.split("/");
                let opts = {
                    p5Vec: true
                };
                let positions = decodePointArray(arr.shift(),opts);
                for(let i=0;i<arr.length;i++){
                    arr[i] = new StormData(data.sub(arr[i]),positions[i]);
                }
                return arr;
            }
        }
    }
}

class ActiveSystem extends StormData{
    constructor(ext,spawn){
        if(ext instanceof LoadData){
            super();
            this.organization = undefined;
            this.lowerWarmCore = undefined;
            this.upperWarmCore = undefined;
            this.depth = undefined;
        }else{
            let sType = spawn ? spawn.sType : undefined;
            if(sType==="x") ext = true;
            let subt = false;
            if(sType==="sd"){
                sType = "d";
                subt = true;
            }
            if(sType==="ss"){
                sType = "s";
                subt = true;
            }
            let x, y, tooClose;
            if(spawn){
                x = spawn.x;
                y = spawn.y;
            }else{
                do{
                    tooClose = false;
                    x = random()<0.2 && !ext ?
                            WIDTH-1:
                            random(0,WIDTH-1);
                    y = basin.hemY(ext ? Env.get("jetstream",x,0,basin.tick)+random(-75,75) : random(HEIGHT*0.7,HEIGHT*0.9));
                    for(let i=0;i<basin.activeSystems.length;i++){
                        let p = basin.activeSystems[i].pos;
                        if(sqrt(sq(x-p.x)+sq(y-p.y))<50) tooClose = true;
                    }
                }while(tooClose);
            }
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
                sType==="l" ? TROPWAVE :
                subt ? SUBTROP : TROP :
            TROPWAVE;
            super(x,y,p,w,ty);
            this.organization = ext ? 0 : spawn ? sType==="l" ? 0.2 : 1 : random(0,0.3);
            this.lowerWarmCore = ext ? 0 : subt ? 0.6 : 1;
            this.upperWarmCore = ext ? 0 : subt ? 0.5 : 1;
            this.depth = ext ? 1 : 0;
        }
        this.steering = createVector(0); // A vector that updates with the environmental steering
        this.interaction = {}; // Data for interaction with other storms (e.g. Fujiwhara)
        this.interaction.fuji = createVector(0); // A vector for Fujiwhara interaction
        this.interaction.fujiStatic = createVector(0); // A vector for 'static' use in the 'interact' method for Fujiwhara interaction
        this.interaction.shear = 0;
        this.interaction.kill = false;
        this.trackForecast = {}; // Simple track forecast for now
        this.trackForecast.stVec = createVector(0);
        this.trackForecast.pVec = createVector(0);
        this.trackForecast.points = [];
        if(ext instanceof LoadData){
            this.storm = undefined;
            this.load(ext);
        }else{
            this.storm = new Storm(this);
            if(basin.tick%ADVISORY_TICKS===0) this.advisory();
        }
    }

    update(){
        this.getSteering();
        this.pos.add(this.steering);
        
        let x = this.pos.x;
        let y = this.pos.y;
        let z = basin.tick;

        let SST = Env.get("SST",x,y,z);
        let jet = Env.get("jetstream",x,y,z);
        jet = basin.hemY(y)-jet;
        let lnd = land.get(x,y);
        let moisture = Env.get("moisture",x,y,z);
        let shear = Env.get("shear",x,y,z).mag()+this.interaction.shear;
        
        let targetWarmCore = (lnd ?
            this.lowerWarmCore :
            max(pow(map(SST,10,25,0,1,true),3),this.lowerWarmCore)
        )*map(jet,0,75,sq(1-this.depth),1,true);
        this.lowerWarmCore = lerp(this.lowerWarmCore,targetWarmCore,this.lowerWarmCore>targetWarmCore ? map(jet,0,75,0.4,0.06,true) : 0.04);
        this.upperWarmCore = lerp(this.upperWarmCore,this.lowerWarmCore,this.lowerWarmCore>this.upperWarmCore ? 0.05 : 0.4);
        this.lowerWarmCore = constrain(this.lowerWarmCore,0,1);
        this.upperWarmCore = constrain(this.upperWarmCore,0,1);
        let tropicalness = constrain(map(this.lowerWarmCore,0.5,1,0,1),0,this.upperWarmCore);
        let nontropicalness = constrain(map(this.lowerWarmCore,0.75,0,0,1),0,1);

        this.organization *= 100;
        if(!lnd) this.organization += sq(map(SST,20,29,0,1,true))*3*tropicalness;
        if(!lnd && this.organization<40) this.organization += lerp(0,3,nontropicalness);
        // if(lnd) this.organization -= pow(10,map(lnd,0.5,1,-3,1));
        // if(lnd && this.organization<70 && moisture>0.3) this.organization += pow(5,map(moisture,0.3,0.5,-1,1,true))*tropicalness;
        this.organization -= pow(2,4-((HEIGHT-basin.hemY(y))/(HEIGHT*0.01)));
        this.organization -= (pow(map(this.depth,0,1,1.17,1.31),shear)-1)*map(this.depth,0,1,4.7,1.2);
        this.organization -= map(moisture,0,0.65,3,0,true)*shear;
        this.organization += sq(map(moisture,0.6,1,0,1,true))*4;
        this.organization -= pow(1.3,20-SST)*tropicalness;
        this.organization = constrain(this.organization,0,100);
        this.organization /= 100;

        let targetPressure = 1010-25*log((lnd||SST<25)?1:map(SST,25,30,1,2))/log(1.17);
        targetPressure = lerp(1010,targetPressure,pow(this.organization,3));
        this.pressure = lerp(this.pressure,targetPressure,(this.pressure>targetPressure?0.05:0.08)*tropicalness);
        this.pressure -= random(-3,3.5)*nontropicalness;
        if(this.organization<0.3) this.pressure += random(-2,2.5)*tropicalness;
        this.pressure += random(constrain(970-this.pressure,0,40))*nontropicalness;
        this.pressure += 0.5*this.interaction.shear/(1+map(this.lowerWarmCore,0,1,4,0));
        this.pressure += map(jet,0,75,5*pow(1-this.depth,4),0,true);

        let targetWind = map(this.pressure,1030,900,1,160)*map(this.lowerWarmCore,1,0,1,0.6);
        this.windSpeed = lerp(this.windSpeed,targetWind,0.15);

        let targetDepth = map(
            this.upperWarmCore,
            0,1,
            1,map(
                this.organization,
                0,1,
                this.depth*pow(0.95,shear),max(map(this.pressure,1010,950,0,0.7,true),this.depth)
            )
        );
        this.depth = lerp(this.depth,targetDepth,0.05);

        switch(this.type){
            case TROP:
                this.type = this.lowerWarmCore<0.55 ? EXTROP : ((this.organization<0.4 && this.windSpeed<50) || this.windSpeed<20) ? this.upperWarmCore<0.56 ? EXTROP : TROPWAVE : this.upperWarmCore<0.56 ? SUBTROP : TROP;
                break;
            case SUBTROP:
                this.type = this.lowerWarmCore<0.55 ? EXTROP : ((this.organization<0.4 && this.windSpeed<50) || this.windSpeed<20) ? this.upperWarmCore<0.57 ? EXTROP : TROPWAVE : this.upperWarmCore<0.57 ? SUBTROP : TROP;
                break;
            case TROPWAVE:
                this.type = this.lowerWarmCore<0.55 ? EXTROP : (this.organization<0.45 || this.windSpeed<25) ? this.upperWarmCore<0.56 ? EXTROP : TROPWAVE : this.upperWarmCore<0.56 ? SUBTROP : TROP;
                break;
            default:
                this.type = this.lowerWarmCore<0.6 ? EXTROP : (this.organization<0.45 || this.windSpeed<25) ? this.upperWarmCore<0.57 ? EXTROP : TROPWAVE : this.upperWarmCore<0.57 ? SUBTROP : TROP;
        }

        if(this.pressure>1030 || (this.pos.x >= WIDTH || this.pos.x < 0 || this.pos.y >= HEIGHT || this.pos.y < 0) || this.interaction.kill){
            this.fetchStorm().deathTime = basin.tick;
            if(this.fetchStorm().dissipationTime===undefined) this.fetchStorm().dissipationTime = basin.tick;
            this.fetchStorm().current = undefined;
            return;
        }

        let rType = this.fetchStorm().getStormDataByTick(basin.tick);
        rType = rType && rType.type;
        if(tropOrSub(rType!==null ? rType : this.type)){
            let pop = lnd ? round(250000*(1+basin.hemY(y)/HEIGHT)*pow(0.8,map(lnd,0.5,1,0,30))) : 0;
            let damPot = pow(1.062,this.windSpeed)-1;   // damage potential
            let dedPot = pow(1.02,this.windSpeed)-1;    // death potential
            let m = pow(1.5,randomGaussian());      // modifier
            damPot *= m;
            dedPot *= m;
            let dam = pop*damPot*3.3*pow(1.1,random(-1,1));
            let ded = round(pop*dedPot*0.0000017*pow(1.1,random(-1,1)));
            this.fetchStorm().damage += dam;
            this.fetchStorm().damage = round(this.fetchStorm().damage*100)/100;
            this.fetchStorm().deaths += ded;
            let s = basin.fetchSeason(-1,true,true);
            s.damage += dam;
            s.damage = round(s.damage*100)/100;
            s.deaths += ded;
            s.modified = true;
        }

        this.resetInteraction();
        if(basin.tick%ADVISORY_TICKS===0) this.advisory();
    }

    advisory(){
        let x = floor(this.pos.x);
        let y = floor(this.pos.y);
        let p = floor(this.pressure);
        let w = round(this.windSpeed/WINDSPEED_ROUNDING)*WINDSPEED_ROUNDING;
        let ty = this.type;
        let adv = new StormData(x,y,p,w,ty);
        this.fetchStorm().updateStats(adv);
        this.fetchStorm().record.push(adv);
        this.doTrackForecast();
        this.fetchStorm().renderTrack(true);
    }

    getSteering(){
        let l = Env.get("LLSteering",this.pos.x,this.pos.y,basin.tick);
        let u = Env.get("ULSteering",this.pos.x,this.pos.y,basin.tick);
        let d = sqrt(this.depth);
        let x = lerp(l.x,u.x,d);       // Deeper systems follow upper-level steering more and lower-level steering less
        let y = lerp(l.y,u.y,d);
        this.steering.set(x,y);
        this.steering.add(this.interaction.fuji); // Fujiwhara
    }

    interact(that,first){   // Quick and sloppy fujiwhara implementation
        let v = this.interaction.fujiStatic;
        v.set(this.pos);
        v.sub(that.pos);
        let m = v.mag();
        let r = map(that.lowerWarmCore,0,1,150,50);
        if(m<r && m>0){
            v.rotate(basin.hem(-TAU/4+((3/m)*TAU/16)));
            v.setMag(map(m,r,0,0,map(constrain(that.pressure,990,1030),1030,990,0.2,2.2)));
            this.interaction.fuji.add(v);
            this.interaction.shear += map(m,r,0,0,map(that.pressure,1030,900,0,6));
            if((m<map(this.pressure,1030,1000,r/5,r/15) || m<5) && this.pressure>that.pressure) this.interaction.kill = true;
        }
        if(first) that.interact(this);
    }

    resetInteraction(){
        let i = this.interaction;
        i.fuji.set(0);
        i.shear = 0;
    }

    doTrackForecast(){
        let p = this.trackForecast.pVec;
        let s = this.trackForecast.stVec;
        this.trackForecast.points = [];
        p.set(this.pos);
        for(let f=0;f<120;f++){
            let t = basin.tick+f;
            // Copy-paste from getSteering (will do something better in future)
            let l = Env.get("LLSteering",p.x,p.y,t);
            let u = Env.get("ULSteering",p.x,p.y,t);
            let d = sqrt(this.depth);
            let x = lerp(l.x,u.x,d);       // Deeper systems follow upper-level steering more and lower-level steering less
            let y = lerp(l.y,u.y,d);
            s.set(x,y);

            p.add(s);
            if((f+1)%ADVISORY_TICKS===0) this.trackForecast.points.push({x:p.x,y:p.y});
        }
    }

    fetchStorm(){
        if(this.storm instanceof StormRef){
            console.error('ActiveSystem still needs to fetch StormRefs');
            let s = this.storm.fetch();
            if(!s) return new Storm();
            this.storm = s;
            this.storm.deathTime = undefined;
            if(this.storm.record.length>0 && tropOrSub(this.storm.record[this.storm.record.length-1].type)) this.storm.dissipationTime = undefined;
            this.storm.current = this;
        }
        return this.storm;
    }

    save(){
        // new format

        let obj = super.save();
        for(let p of [
            'organization',
            'lowerWarmCore',
            'upperWarmCore',
            'depth'
        ]) obj[p] = this[p];
        obj.ref = new StormRef(this.fetchStorm()).save();
        return obj;

        // old format

        // let base = super.save();
        // let activeData = [];
        // activeData.push(this.organization);
        // activeData.push(this.lowerWarmCore);
        // activeData.push(this.upperWarmCore);
        // activeData.push(this.depth);
        // activeData = encodeB36StringArray(activeData,ACTIVESYSTEM_SAVE_FLOAT);
        // let ref = new StormRef(this.fetchStorm());
        // ref = ref.save();
        // return base + "." + activeData + "." + ref;
    }

    load(data){
        if(data instanceof LoadData){
            if(data.format>=FORMAT_WITH_INDEXEDDB){
                let obj = data.value;
                super.load(data);
                for(let p of [
                    'organization',
                    'lowerWarmCore',
                    'upperWarmCore',
                    'depth'
                ]) this[p] = obj[p];
                this.storm = new StormRef(data.sub(obj.ref));
            }else{
                let str = data.value;
                let parts = str.split(".");
                super.load(data.sub(parts[0]));
                let activeData = decodeB36StringArray(parts[1]);
                this.depth = activeData.pop();
                this.upperWarmCore = activeData.pop();
                this.lowerWarmCore = activeData.pop();
                this.organization = activeData.pop();
                this.storm = new StormRef(data.sub(parts[2]));
            }
        }
    }
}

function getNewName(season,sNum){
    let list;
    if(basin.sequentialNameIndex<0){
        let numoflists = basin.nameList.length-1;
        list = basin.nameList[(season+1)%numoflists];
        if(sNum>=list.length){
            let gNum = sNum-list.length;
            let greeks = basin.nameList[numoflists];
            if(gNum>=greeks.length) return "Unnamed";
            return greeks[gNum];
        }
        return list[sNum];
    }
    return basin.nameList[sNum];
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
            return COLORS.storm[TROP][c];
        case TROP:
            return COLORS.storm[TROP][c];
        case TROPWAVE:
            return COLORS.storm[TROPWAVE];
    }
}