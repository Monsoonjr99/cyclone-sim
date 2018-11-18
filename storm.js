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
        this.organization = ext ? 0 : spawn ? sType==="l" ? 0.2 : 1 : random(0,0.3);
        // this.entrainedMoisture = ext ? 0.3 : spawn ? sType==="l" ? 0.5 : 0.95 : random(0.35,0.65);
        this.lowerWarmCore = ext ? 0 : 1;
        this.upperWarmCore = ext ? 0 : 1;
        this.depth = ext ? 1 : 0;
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
    }

    update(){
        this.getSteering();
        this.pos.add(this.steering);
        
        let x = this.pos.x;
        let y = this.pos.y;
        let z = basin.tick;

        // let seasSin = seasonalSine(z);
        // let latTrop = map(sqrt(constrain(hemY(this.pos.y),0,height)),0,sqrt(height),0,1+0.09*(seasSin-1)); // Temporary environmentel latitude distinction for extratropical vs. tropical
        let SST = Env.get("SST",x,y,z);
        let jet = Env.get("jetstream",x,y,z);
        jet = hemY(y)-jet;
        let lnd = land.get(x,y);
        let moisture = Env.get("moisture",x,y,z);
        let shear = Env.get("shear",x,y,z).mag()+this.interaction.shear;
        
        let targetWarmCore = (lnd ?
            this.lowerWarmCore :
            max(pow(map(SST,10,25,0,1,true),3),this.lowerWarmCore)
        )*map(jet,0,75,sq(1-this.depth),1,true);
        // if(latTrop>tempTrop) latTrop = tempTrop;
        // if(selectedStorm && this===selectedStorm.current && jet<75) console.log(targetWarmCore);
        this.lowerWarmCore = lerp(this.lowerWarmCore,targetWarmCore,this.lowerWarmCore>targetWarmCore ? map(jet,0,75,0.4,0.06,true) : 0.04);
        this.upperWarmCore = lerp(this.upperWarmCore,this.lowerWarmCore,this.lowerWarmCore>this.upperWarmCore ? 0.05 : 0.4);
        this.lowerWarmCore = constrain(this.lowerWarmCore,0,1);
        this.upperWarmCore = constrain(this.upperWarmCore,0,1);
        let tropicalness = constrain(map(this.lowerWarmCore,0.5,1,0,1),0,this.upperWarmCore);
        let nontropicalness = constrain(map(this.lowerWarmCore,0.75,0,0,1),0,1);

        // let convection = (lnd ? moisture : sq(map(SST,20,26,0,1,true)))*sqrt(tropicalness)*pow(map(cos(map(this.entrainedMoisture,0,1,PI,0)),-1,1,0,1),0.6);
        // convection = convection*pow(map(this.depth,0,1,0.8,0.85),shear);
        // let targetOrg = convection*(1-pow(0.96,map(hemY(y),0,height,1000,0)));
        // this.organization = lerp(this.organization,targetOrg,0.1);

        // let targetMoist = map(pow(0.8,shear),1,0,1-(1-this.entrainedMoisture)*pow(0.8,convection),moisture);
        // this.entrainedMoisture = lerp(this.entrainedMoisture,targetMoist,0.1);

        // this.organization += random(-3,3+seasSin/2) + random(pow(7,this.lowerWarmCore)-4) + 2.7*nontropicalness;

        this.organization *= 100;
        if(!lnd) this.organization += sq(map(SST,20,29,0,1,true))*3*tropicalness;
        if(!lnd && this.organization<40) this.organization += lerp(0,3,nontropicalness);
        if(lnd) this.organization -= pow(10,map(lnd,0.5,1,0,1));
        this.organization -= pow(2,4-((height-hemY(y))/(height*0.01)));
        this.organization -= (pow(map(this.depth,0,1,1.17,1.31),shear)-1)*map(this.depth,0,1,4.7,1.2);
        this.organization -= map(moisture,0,0.65,3,0,true)*shear;
        this.organization += sq(map(moisture,0.6,1,0,1,true))*4;
        this.organization -= pow(1.3,20-SST)*tropicalness;
        this.organization = constrain(this.organization,0,100);
        this.organization /= 100;

        let targetPressure = 1010-25*log((lnd||SST<25)?1:map(SST,25,30,1,2))/log(1.17);
        targetPressure = lerp(1010,targetPressure,pow(this.organization,3));
        this.pressure = lerp(this.pressure,targetPressure,(this.pressure>targetPressure?0.05:0.08)*tropicalness);
        // this.pressure -= random(-3,3.6+seasSin/4+(lnd?-0.5:pow(1.22,SST-26)*sq(this.organization/100)))*sqrt(tropicalness);
        this.pressure -= random(-3,3.5)*nontropicalness;
        // this.pressure += random(sqrt(1-this.organization/100))*(1025-this.pressure)*tropicalness*0.6;
        if(this.organization<0.3) this.pressure += random(-2,2.5)*tropicalness;
        this.pressure += random(constrain(970-this.pressure,0,40))*nontropicalness;
        this.pressure += 0.5*this.interaction.shear/(1+map(this.lowerWarmCore,0,1,4,0));
        this.pressure += map(jet,0,75,5*pow(1-this.depth,4),0,true);
        // if(this.pressure<875) this.pressure = lerp(this.pressure,875,0.1);

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
        // this.type = this.lowerWarmCore<0.6 ? EXTROP : ((this.organization<45 && (this.windSpeed<50 || this.lowerWarmCore<0.85)) || this.windSpeed<20) ? this.upperWarmCore<0.57 ? EXTROP : TROPWAVE : this.upperWarmCore<0.57 ? SUBTROP : TROP;

        if(this.pressure>1030 || (this.pos.x > width+DIAMETER || this.pos.x < 0-DIAMETER || this.pos.y > height+DIAMETER || this.pos.y < 0-DIAMETER) || this.interaction.kill){
            this.storm.deathTime = basin.tick;
            if(this.storm.dissipationTime===undefined) this.storm.dissipationTime = basin.tick;
            this.storm.active = false;
            this.storm.current = undefined;
            return;
        }
        this.resetInteraction();
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

        // this.steering.set(1);
        // let west = Env.get("westerlies",this.pos.x,this.pos.y,basin.tick);
        // let trades = Env.get("trades",this.pos.x,this.pos.y,basin.tick);
        // let eDir = Env.get("steering",this.pos.x,this.pos.y,basin.tick);
        // let eMag = Env.get("steeringMag",this.pos.x,this.pos.y,basin.tick);
        // this.steering.rotate(eDir);
        // this.steering.mult(eMag/(1+(sin(eDir)/2+0.5)*trades));  // Uses the sine of the direction to give poleward bias depending on the strength of the trades
        // this.steering.add(west-trades);
        // this.steering.y = hem(this.steering.y);
        // this.steering.add(0,hem(map(this.pressure,1030,900,0.4,-0.9))); // Quick and dirty method of giving stronger storms a poleward bias

        let l = Env.get("LLSteering",this.pos.x,this.pos.y,basin.tick);
        let u = Env.get("ULSteering",this.pos.x,this.pos.y,basin.tick);
        let d = sqrt(this.depth);
        let x = lerp(l.x,u.x,d);       // Deeper systems follow upper-level steering more and lower-level steering less
        let y = lerp(l.y,u.y,d);
        // u.mult(map(this.upperWarmCore,0,1,0.8,map(sqrt(map(this.pressure,1010,900,0,1,true)),0,1,0.05,1))); // Deeper and more-extratropical storms feel more upper-level steering
        // this.steering.add(u);
        this.steering.set(x,y);
        this.steering.add(this.interaction.fuji); // Fujiwhara

        // this.steering.set(Env.get("test",this.pos.x,this.pos.y,basin.tick));
    }

    interact(that,first){   // Quick and sloppy fujiwhara implementation
        let v = this.interaction.fujiStatic;
        v.set(this.pos);
        v.sub(that.pos);
        let m = v.mag();
        let r = map(that.lowerWarmCore,0,1,150,50);
        if(m<r && m>0){
            v.rotate(hem(-TAU/4+((3/m)*TAU/16)));
            // v.setMag(((1030-that.pressure)/35)*(30/m)*(4-3*that.lowerWarmCore));
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
            // s.set(1);                                       // Copy-paste from getSteering (will do something better in future)
            // let west = Env.get("westerlies",p.x,p.y,t);
            // let trades = Env.get("trades",p.x,p.y,t);
            // let eDir = Env.get("steering",p.x,p.y,t);
            // let eMag = Env.get("steeringMag",p.x,p.y,t);
            // s.rotate(eDir);
            // s.mult(eMag/(1+(hem(sin(eDir))/2+0.5)*trades));
            // s.add(west-trades);

            let l = Env.get("LLSteering",p.x,p.y,t);
            let u = Env.get("ULSteering",p.x,p.y,t);
            let d = sqrt(this.depth);
            let x = lerp(l.x,u.x,d);       // Deeper systems follow upper-level steering more and lower-level steering less
            let y = lerp(l.y,u.y,d);
            // u.mult(map(this.upperWarmCore,0,1,0.8,map(sqrt(map(this.pressure,1010,900,0,1,true)),0,1,0.05,1)));
            // s.add(u);
            s.set(x,y);

            p.add(s);
            if((f+1)%ADVISORY_TICKS===0) this.trackForecast.points.push({x:p.x,y:p.y});
        }
    }
}