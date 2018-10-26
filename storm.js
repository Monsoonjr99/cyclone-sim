class Storm{
    constructor(extropical,godModeSpawn){
        let isNewStorm = extropical !== undefined;
        this.current = undefined;
        this.active = false;
        if(isNewStorm){
            this.current = new ActiveSystem(this,extropical,godModeSpawn);
            this.active = true;
            basin.seasons[curSeason].systems.push(this);
        }

        this.TC = false;
        this.named = false;
        this.hurricane = false;
        this.major = false;

        this.rotation = random(TAU);

        this.depressionNum = undefined;
        this.name = undefined;

        this.birthTime = isNewStorm ? basin.tick : undefined;             // Time formed as a disturbance/low
        this.formationTime = undefined;                             // Time formed as a TC
        this.dissipationTime = undefined;                           // Time degenerated/dissipated as a TC
        this.deathTime = undefined;                                 // Time completely dissipated
        this.namedTime = undefined;

        this.record = [];
        this.peak = undefined;
        this.ACE = 0;
        if(isNewStorm && basin.tick%ADVISORY_TICKS===0) this.current.advisory();
    }

    aliveAt(t){
        return t >= this.birthTime && (this.active || t < this.deathTime);
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
        if(this.TC && (selectedStorm===undefined || selectedStorm===this)){
            if(newestSegment){
                if(this.record.length>1){
                    let adv = this.record[this.record.length-2];
                    let col = getColor(adv.cat,adv.type);
                    tracks.stroke(col);
                    let pos = adv.pos;
                    let nextPos = this.record[this.record.length-1].pos;
                    tracks.line(pos.x,pos.y,nextPos.x,nextPos.y);
                }
            }else if(this.aliveAt(viewTick) || selectedStorm===this){
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
        if(selectedStorm===this && viewingPresent() && this.active){
            forecastTracks.clear();
            let p = this.current.trackForecast.points;
            for(let n=0;n<p.length;n++){
                forecastTracks.point(p[n].x,p[n].y);
            }
        }
    }

    updateStats(data){
        let w = data.windSpeed;
        let p = data.pressure;
        let type = data.type;
        let cat = getCat(w);
        let cSeason = basin.seasons[curSeason];
        let prevAdvisory = this.record.length>0 ? this.record[this.record.length-1] : undefined;
        let wasTCB4Update = prevAdvisory ? tropOrSub(prevAdvisory.type) : false;
        let isTropical = tropOrSub(type);
        if(!this.TC && isTropical){
            // cSeason.systems.push(this);
            this.TC = true;
            this.formationTime = basin.tick;
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
                this.namedTime = basin.tick;
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
        if(wasTCB4Update && !isTropical) this.dissipationTime = basin.tick;
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
        let y = spawn ? spawn.y : hemY(ext ? random(height*0.1,height*0.4) : random(height*0.7,height*0.9));
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
        this.trackForecast = {}; // Simple track forecast for now
        this.trackForecast.stVec = createVector(0);
        this.trackForecast.pVec = createVector(0);
        this.trackForecast.points = [];
    }

    update(){
        this.getSteering();
        this.pos.add(this.steering);
        this.interaction.set(0);
        let seasSin = seasonalSine(basin.tick);
        let latTrop = map(sqrt(constrain(hemY(this.pos.y),0,height)),0,sqrt(height),0,1+0.1*(seasSin-1)); // Temporary environmentel latitude distinction for extratropical vs. tropical
        this.lowerWarmCore = lerp(this.lowerWarmCore,latTrop,this.lowerWarmCore>latTrop ? 0.06 : 0.04);
        this.upperWarmCore = lerp(this.upperWarmCore,this.lowerWarmCore,this.lowerWarmCore>this.upperWarmCore ? 0.007 : 0.4);
        this.lowerWarmCore = constrain(this.lowerWarmCore,0,1);
        this.upperWarmCore = constrain(this.upperWarmCore,0,1);
        let tropicalness = constrain(map(this.lowerWarmCore,0.5,1,0,1),0,this.upperWarmCore);
        let nontropicalness = constrain(map(this.lowerWarmCore,0.75,0,0,1),0,1);
        this.organization += random(-3,3+seasSin) + random(pow(7,this.lowerWarmCore)-4) + 2.7*nontropicalness;
        this.organization -= getLand(this.pos.x,this.pos.y)*random(7);
        this.organization -= pow(2,4-((height-hemY(this.pos.y))/(height*0.01)));
        this.organization = constrain(this.organization,0,100);
        this.pressure -= random(-3,4.3+seasSin)*tropicalness;
        this.pressure -= random(-3,3)*nontropicalness;
        this.pressure += random(sqrt(1-this.organization/100))*(1025-this.pressure)*tropicalness*0.6;
        this.pressure += random(constrain(970-this.pressure,0,40))*nontropicalness;
        if(this.pressure<875) this.pressure = lerp(this.pressure,875,0.1);
        this.windSpeed = map(this.pressure,1030,900,1,160)*map(this.lowerWarmCore,1,0,1,0.6);
        this.type = this.lowerWarmCore<0.6 ? EXTROP : ((this.organization<45 && this.windSpeed<50) || this.windSpeed<20) ? this.upperWarmCore<0.57 ? EXTROP : TROPWAVE : this.upperWarmCore<0.57 ? SUBTROP : TROP;
        if(this.pressure>1030 || (this.pos.x > width+DIAMETER || this.pos.x < 0-DIAMETER || this.pos.y > height+DIAMETER || this.pos.y < 0-DIAMETER)){
            this.storm.deathTime = basin.tick;
            if(this.storm.dissipationTime===undefined) this.storm.dissipationTime = basin.tick;
            this.storm.active = false;
            this.storm.current = undefined;
            return;
        }
        if(basin.tick%ADVISORY_TICKS===0) this.advisory();
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
        this.doTrackForecast();
        this.storm.renderTrack(true);
    }

    getSteering(){
        // let dir = Env.get("steering",this.pos.x,this.pos.y,tick);
        // let mag = Env.get("steeringMag",this.pos.x,this.pos.y,tick);
        // this.steering.set(1);
        // this.steering.rotate(dir);
        // this.steering.mult(mag);
        this.steering.set(1);
        let west = Env.get("westerlies",this.pos.x,this.pos.y,basin.tick);
        let trades = Env.get("trades",this.pos.x,this.pos.y,basin.tick);
        let eDir = Env.get("steering",this.pos.x,this.pos.y,basin.tick);
        let eMag = Env.get("steeringMag",this.pos.x,this.pos.y,basin.tick);
        this.steering.rotate(eDir);
        this.steering.mult(eMag/(1+(hem(sin(eDir))/2+0.5)*trades));  // Uses the sine of the direction to give poleward bias depending on the strength of the trades
        this.steering.add(west-trades);
        this.steering.add(0,hem(map(this.pressure,1030,900,0.3,-1.5))); // Quick and dirty method of giving stronger storms a poleward bias
        this.steering.add(this.interaction); // Fujiwhara
    }

    interact(that,first){   // Quick and sloppy fujiwhara implementation
        this.interactStatic.set(this.pos);
        this.interactStatic.sub(that.pos);
        let m = this.interactStatic.mag();
        if(m<200 && m>0){
            this.interactStatic.rotate(hem(-TAU/4+((10/m)*TAU/16)));
            this.interactStatic.setMag(((1030-that.pressure)/35)*(30/m)*(4-3*that.lowerWarmCore));
            this.interaction.add(this.interactStatic);
        }
        if(first) that.interact(this);
    }

    doTrackForecast(){
        let p = this.trackForecast.pVec;
        let s = this.trackForecast.stVec;
        this.trackForecast.points = [];
        p.set(this.pos);
        for(let f=0;f<120;f++){
            s.set(1);                                       // Copy-paste from getSteering (will do something better in future)
            let t = basin.tick+f;
            let west = Env.get("westerlies",p.x,p.y,t);
            let trades = Env.get("trades",p.x,p.y,t);
            let eDir = Env.get("steering",p.x,p.y,t);
            let eMag = Env.get("steeringMag",p.x,p.y,t);
            s.rotate(eDir);
            s.mult(eMag/(1+(hem(sin(eDir))/2+0.5)*trades));
            s.add(west-trades);
            p.add(s);
            if((f+1)%ADVISORY_TICKS===0) this.trackForecast.points.push({x:p.x,y:p.y});
        }
    }
}