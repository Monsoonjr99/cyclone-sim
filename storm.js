class Storm{
    constructor(basin,data){
        this.basin = basin instanceof Basin && basin;
        this.current = data instanceof ActiveSystem && data;
        this.id = undefined;
        if(this.current) basin.fetchSeason(-1,true,true).addSystem(this);

        this.TC = false;
        this.inBasinTC = false;
        this.sbData = {};

        this.rotation = random(TAU);

        this.designations = {};
        this.designations.primary = [];
        this.designations.secondary = [];

        this.birthTime = this.current ? basin.tick : undefined;     // tick formed as a disturbance/low
        this.formationTime = undefined;                             // tick formed as a TC
        this.enterTime = undefined;                                 // tick formed in/entered basin as a TC
        this.exitTime = undefined;                                  // tick degenerated in/left basin as a TC
        this.dissipationTime = undefined;                           // tick degenerated/dissipated as a TC
        this.deathTime = undefined;                                 // tick completely dissipated/left map

        this.record = [];
        this.peak = undefined;
        this.ACE = 0;
        this.deaths = 0;
        this.damage = 0;
        this.landfalls = 0;
        if(!this.current && data instanceof LoadData) this.load(data);
    }

    originSeason(){
        return this.basin.getSeason(this.birthTime);
    }

    aliveAt(t){
        return t >= this.birthTime && (!!this.current || t < this.deathTime);
    }

    getStormDataByTick(t,allowCurrent){
        if(!this.aliveAt(t)) return null;
        if(t===this.basin.tick){
            if(allowCurrent) return this.current;
            return this.record.length>0 ? this.record[this.record.length-1] : null;
        }
        return this.record[floor(t/ADVISORY_TICKS)-ceil(this.birthTime/ADVISORY_TICKS)];
    }

    getNameByTick(t){
        let D = this.designations;
        let str = '';
        if(this.aliveAt(t)){
            let p;
            let s = [];
            let snamed;
            for(let i=0;i<D.primary.length;i++){
                let d = D.primary[i];
                if(!(d instanceof Designation)) continue;
                let e = d.activeAt(t);
                if(e){
                    if(!p) p = d;
                    else if(!p.isName() && d.isName()) p = d;
                    else if(e>p.activeAt(t) && (!p.isName() || d.isName())) p = d;
                }
            }
            for(let i=0;i<D.secondary.length;i++){
                let d = D.secondary[i];
                if(!(d instanceof Designation)) continue;
                if(d.activeAt(t)){
                    if(d.isName() && !snamed){
                        s = [];
                        snamed = true;
                    }
                    if(d.isName() || !snamed) s.push(d);
                }
            }
            s.sort((a,b)=>a.effectiveTicks[0]-b.effectiveTicks[0]);
            let ii;
            for(let i=s.length-1;i>=0;i--){
                if(p && p.isName()) break;
                if(s[i].isName() || !p){
                    p = s[i];
                    ii = i;
                }
            }
            if(ii!==undefined) s.splice(ii,1);
            if(p){
                str += p.value;
                if(s.length>0 && (snamed || !p.isName())){
                    str += ' (';
                    for(let i=0;i<s.length;i++){
                        if(i>0) str += ', ';
                        str += s[i].value;
                    }
                    str += ')';
                }
            }
        }else{
            let p = [];
            let s = [];
            let pnamed;
            let snamed;
            for(let i=0;i<D.primary.length;i++){
                let d = D.primary[i];
                if(!(d instanceof Designation)) continue;
                if(d.isName() && !pnamed){
                    p = [];
                    pnamed = true;
                }
                if(d.isName() || !pnamed) p.push(d);
            }
            p.sort((a,b)=>a.effectiveTicks[0]-b.effectiveTicks[0]);
            for(let i=0;i<D.secondary.length;i++){
                let d = D.secondary[i];
                if(!(d instanceof Designation)) continue;
                if(d.isName() && !snamed){
                    s = [];
                    snamed = true;
                }
                if(d.isName() || !snamed) s.push(d);
            }
            s.sort((a,b)=>a.effectiveTicks[0]-b.effectiveTicks[0]);
            let ii;
            for(let i=s.length-1;i>=0;i--){
                if(p.length>0 && pnamed) break;
                if(s[i].isName() || p.length<1){
                    p = [];
                    p.push(s[i]);
                    if(s[i].isName()) pnamed = true;
                    ii = i;
                }
            }
            if(ii!==undefined) s.splice(ii,1);
            for(let i=0;i<p.length;i++){
                if(i>0) str += '-';
                if(t===-2) str += p[i].truncate();
                else str += p[i].value;
            }
            if(s.length>0 && (snamed || !pnamed) && t!==-2){
                str += ' (';
                for(let i=0;i<s.length;i++){
                    if(i>0) str += ', ';
                    str += s[i].value;
                }
                str += ')';
            }
        }
        return str;
    }

    getFullNameByTick(t){
        let basin = this.basin;
        let data = t==="peak" ? this.peak : this.getStormDataByTick(t);
        let name = this.getNameByTick(t==='peak' ? -1 : t);
        let ty = data ? data.type : null;
        let clsnNom = data ? basin.getScale(land.getSubBasin(data.pos.x,data.pos.y)).getStormNom(data) : null;
        let hasbeenTC;
        if(t==='peak') hasbeenTC = this.TC;
        else if(t>=this.formationTime) hasbeenTC = true;
        else hasbeenTC = false;
        let str = '';
        if(!name) str += 'Unnamed ';
        switch(ty){
            case TROP:
            case SUBTROP:
                str += clsnNom;
                if(name) str += ' ' + name;
                break;
            case TROPWAVE:
                if(hasbeenTC){
                    if(name) str += 'Remnants of ' + name;
                    else str += 'Remnant Low';
                }else{
                    if(name) str += 'Invest ' + name;
                    else str += 'Tropical Wave';
                }
                break;
            case EXTROP:
                if(hasbeenTC){
                    str += 'Post-Tropical Cyclone';
                    if(name) str += ' ' + name;
                }else{
                    if(name) str += 'Invest ' + name;
                    else str += 'Extratropical Cyclone';
                }
                break;
        }
        return str;
    }

    renderIcon(){
        if(this.aliveAt(viewTick)){
            let basin = this.basin;
            let adv = this.getStormDataByTick(viewTick);
            let advC = this.getStormDataByTick(viewTick,true);
            let advX = adv ? adv : advC;
            let pr = advC.pressure;
            let st = advC.windSpeed;
            let pos = advC.pos;
            let sb = land.getSubBasin(advX.pos.x,advX.pos.y);
            let scale = basin.getScale(sb);
            let scaleIconData = scale.getIcon(advX);
            let ty = advX.type;
            let name = this.getNameByTick(viewTick);
            this.rotation -= 0.03*pow(1.01,ktsToMph(min(270,st)));
            let drawArms = ()=>{
                let a = scaleIconData.arms;
                if(tropOrSub(ty) && a){
                    stormIcons.push();
                    if(basin.SHem) stormIcons.scale(1,-1);
                    stormIcons.rotate(this.rotation);
                    for(let i=0;i<a;i++){
                        if(i>0) stormIcons.rotate(2*PI/a);
                        stormIcons.beginShape();
                        stormIcons.vertex(DIAMETER*5/8,-DIAMETER);
                        stormIcons.bezierVertex(DIAMETER*5/8,-DIAMETER,-DIAMETER*3/8,-DIAMETER*7/8,-DIAMETER*1/2,0);
                        stormIcons.vertex(0,0);
                        stormIcons.bezierVertex(-DIAMETER*1/4,-DIAMETER*5/8,DIAMETER*5/8,-DIAMETER,DIAMETER*5/8,-DIAMETER);
                        stormIcons.endShape();
                    }
                    stormIcons.pop();
                }
            };
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
                drawArms();
            }
            stormIcons.fill(scaleIconData.color);
            stormIcons.noStroke();
            if(ty!==EXTROP) stormIcons.ellipse(0,0,DIAMETER);
            drawArms();
            if(ty===EXTROP){
                stormIcons.fill(COLORS.storm.extL);
                stormIcons.textSize(18);
            }else{
                stormIcons.fill(brightness(scaleIconData.color)<75 ? 240 : 0);
                stormIcons.textSize(12);
            }
            stormIcons.textStyle(NORMAL);
            stormIcons.text(tropOrSub(ty) ? scaleIconData.symbol : "L", 0, 0);
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
            if(this.inBasinTC || simSettings.trackMode===1){
                if(newestSegment){
                    if(this.record.length>1 && (selectedStorm===this || selectedStorm===undefined)){
                        let t = (this.record.length-2)*ADVISORY_TICKS+ceil(this.birthTime/ADVISORY_TICKS)*ADVISORY_TICKS;
                        let adv = this.record[this.record.length-2];
                        let col = this.basin.getScale(land.getSubBasin(adv.pos.x,adv.pos.y)).getColor(adv);
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
                        let col = this.basin.getScale(land.getSubBasin(adv.pos.x,adv.pos.y)).getColor(adv);
                        tracks.stroke(col);
                        let pos = adv.pos;
                        let nextPos = this.record[n+1].pos;
                        tracks.line(pos.x,pos.y,nextPos.x,nextPos.y);
                    }
                }
            }
            if(selectedStorm===this && this.basin.viewingPresent() && this.current){
                forecastTracks.clear();
                let p = this.current.trackForecast.points;
                for(let n=0;n<p.length;n++){
                    forecastTracks.point(p[n].x,p[n].y);
                }
            }
        }
    }

    updateStats(data){
        let basin = this.basin;
        let w = data.windSpeed;
        let p = data.pressure;
        let type = data.type;
        let year = basin.getSeason(-1);
        let cSeason = basin.fetchSeason(year,false,true);
        let prevAdvisory = this.record.length>0 ? this.record[this.record.length-1] : undefined;
        let sub = land.getSubBasin(data.pos.x,data.pos.y);
        let prevSub = prevAdvisory ? land.getSubBasin(prevAdvisory.pos.x,prevAdvisory.pos.y) : sub;
        let wasTCB4Update = prevAdvisory ? tropOrSub(prevAdvisory.type) : false;
        let isTropical = tropOrSub(type);
        let inBasinTropical = isTropical && basin.subInBasin(sub);
        let prevInBasinTropical = wasTCB4Update && basin.subInBasin(prevSub);
        if(!this.TC && isTropical){
            this.TC = true;
            this.formationTime = basin.tick;
            this.peak = undefined;
        }
        if(!this.inBasinTC && inBasinTropical){
            this.inBasinTC = true;
            this.enterTime = basin.tick;
            this.peak = undefined;
            this.ACE = 0;
            this.damage = 0;
            this.deaths = 0;
            this.landfalls = 0;
            if(wasTCB4Update) refreshTracks(true);
        }
        let newACE = 0;
        if(w>=ACE_WIND_THRESHOLD && (inBasinTropical || (isTropical && !this.inBasinTC))){
            newACE = pow(w,2)/ACE_DIVISOR;
            this.ACE += newACE;
            this.ACE = round(this.ACE*ACE_DIVISOR)/ACE_DIVISOR;
        }
        for(let subId of basin.forSubBasinChain(sub)){
            let sb = basin.subBasins[subId];
            let classification = basin.getScale(subId).get(data);
            // update classification counters for sub-basin
            if(basin.subInBasin(subId)){
                let stats = cSeason.stats(subId);
                let cCounters = stats.classificationCounters;
                if(isTropical){
                    for(let i=0;i<=classification;i++){
                        if(!this.subBasinData(subId,year,i,true)) cCounters[i]++;
                    }
                }
                stats.addACE(newACE);
            }
            // apply secondary (PAGASA-style) designations
            if(sb instanceof SubBasin && sb.designationSystem){
                let ds = sb.designationSystem;
                let desArray = this.designations.secondary;
                let numThresh = basin.getScale(subId).numberingThreshold;
                if(ds.numbering.threshold!==undefined) numThresh = ds.numbering.threshold;
                let nameThresh = basin.getScale(subId).namingThreshold;
                if(ds.naming.threshold!==undefined) nameThresh = ds.naming.threshold;
                if(ds.secondary){
                    if(ds.numbering.enabled && isTropical && classification>=numThresh && !this.subBasinData(subId,year,'num',true)){
                        let desig = ds.getNewNum();
                        if(desig) desArray.push(desig);
                    }
                    if(ds.naming.mainLists.length>0 && isTropical && classification>=nameThresh && !this.subBasinData(subId,year,'name',true)){
                        let desig = ds.getNewName();
                        if(desig) desArray.push(desig);
                    }
                }
            }
        }
        // apply primary designations
        let primaryDesSBs = basin.relevantPrimaryDesignationSubBasins(sub);
        let numberingSB = basin.subBasins[primaryDesSBs.numbering];
        let namingSB = basin.subBasins[primaryDesSBs.naming];
        let numberingDS;
        let namingDS;
        if(numberingSB instanceof SubBasin) numberingDS = numberingSB.designationSystem;
        if(namingSB instanceof SubBasin) namingDS = namingSB.designationSystem;
        let desArray = this.designations.primary;
        let designated;
        let subId;
        let ds;
        let classification;
        let threshold;
        let flag;
        for(let isNaming=0;isNaming<=1;isNaming++){
            if(isNaming){
                subId = primaryDesSBs.naming;
                threshold = basin.getScale(subId).namingThreshold;
                if(!namingDS){
                    if(isTropical && !this.subBasinData(sub,year,'name',true)) designated = true;
                    continue;
                }
                ds = namingDS.naming;
                flag = 'name';
            }else{
                subId = primaryDesSBs.numbering;
                threshold = basin.getScale(subId).numberingThreshold;
                if(!numberingDS){
                    if(isTropical && !this.subBasinData(sub,year,'num',true)) designated = true;
                    continue;
                }
                ds = numberingDS.numbering;
                flag = 'num';
            }
            classification = basin.getScale(subId).get(data);
            if(ds.threshold!==undefined) threshold = ds.threshold;
            let altPre = primaryDesSBs.altPre;
            let altSuf = primaryDesSBs.altSuf;
            if(isTropical && classification>=threshold && !this.subBasinData(subId,year,flag,true)){
                let findold = false;
                let keep = false;
                switch(ds.crossingMode){
                    case DESIG_CROSSMODE_ALWAYS:
                        findold = true;
                        break;
                    case DESIG_CROSSMODE_REGEN:
                    case DESIG_CROSSMODE_STRICT_REGEN:
                        let a = data;
                        for(let i=this.record.length-1;i>=0;i--){
                            if(tropOrSub(this.record[i].type)) a = this.record[i];
                            else break;
                        }
                        let lastFormedSB = land.getSubBasin(a.pos.x,a.pos.y);
                        lastFormedSB = basin.relevantPrimaryDesignationSubBasins(lastFormedSB);
                        if(isNaming) lastFormedSB = lastFormedSB.naming;
                        else lastFormedSB = lastFormedSB.numbering;
                        if(lastFormedSB!==subId) keep = true;
                        else if(ds.crossingMode===DESIG_CROSSMODE_REGEN) findold = true;
                        break;
                    case DESIG_CROSSMODE_KEEP:
                        keep = true;
                        break;
                }
                let reused = false;
                if(findold){
                    for(let i=0;i<desArray.length;i++){
                        let d = desArray[i];
                        if(d.subBasin===subId && (isNaming ? d.isName() : !d.isName())){
                            d.show(basin.tick);
                            reused = true;
                            designated = true;
                            break;
                        }
                    }
                }else if(keep){
                    for(let i=0;i<desArray.length;i++){
                        let d = desArray[i];
                        if(d.activeAt(basin.tick) && (isNaming ? d.isName() : !d.isName())){
                            reused = true;
                            designated = true;
                            break;
                        }
                    }
                }
                if(!reused){
                    let desig;
                    if(isNaming) desig = namingDS.getNewName();
                    else desig = numberingDS.getNewNum(altPre,altSuf);
                    if(desig){
                        desArray.push(desig);
                        designated = true;
                    }
                }
            }
        }
        if(designated){
            for(let i=0;i<desArray.length;i++){
                let d = desArray[i];
                let dSubId = d.subBasin;
                subId = d.isName() ? primaryDesSBs.naming : primaryDesSBs.numbering;
                if(dSubId!==subId && d.activeAt(basin.tick)){
                    // let dsb = basin.subBasins[dSubId];
                    // if(dsb instanceof SubBasin && dsb.designationSystem){
                    //     let dds = dsb.designationSystem;
                    //     let cm;
                    //     if(d.isName()) cm = dds.naming.crossingMode;
                    //     else cm = dds.numbering.crossingMode;
                    // }
                    flag = d.isName() ? 'name' : 'num';
                    this.subBasinData(dSubId,year,flag,false);
                }
            }
        }

        if(wasTCB4Update && !isTropical) this.dissipationTime = basin.tick;
        if(!wasTCB4Update && isTropical){
            this.dissipationTime = undefined;
            if(this.formationTime!==basin.tick) refreshTracks(true);
        }
        if(prevInBasinTropical && !inBasinTropical) this.exitTime = basin.tick;
        if(!prevInBasinTropical && inBasinTropical) this.exitTime = undefined;
        if((!this.inBasinTC && (!this.TC || isTropical)) || inBasinTropical){
            if(!this.peak) this.peak = data;
            else if(p<this.peak.pressure) this.peak = data;
        }
        cSeason.modified = true;
        basin.fetchSeason(this.originSeason(),false,true).modified = true;
    }

    subBasinData(sub,season,c,set){
        if(!this.sbData[sub]) this.sbData[sub] = {};
        let l = this.sbData[sub];
        if(typeof c === 'number'){
            if(!l.classLog) l.classLog = {};
            l = l.classLog;
            if(!l[season]) l[season] = {};
            l = l[season];
            let v = l[c];
            if(set!==undefined) l[c] = set;
            return v;
        }
        if(c==='num'){
            let v = l.numFlag;
            if(set!==undefined) l.numFlag = set;
            return v;
        }
        if(c==='name'){
            let v = l.nameFlag;
            if(set!==undefined) l.nameFlag = set;
            return v;
        }
    }

    save(){
        let obj = {};
        for(let p of [
            'id',
            'birthTime',
            'deaths',
            'damage',
            'landfalls'
        ]) obj[p] = this[p];
        obj.record = StormData.saveArr(this.record);
        obj.designations = {};
        obj.designations.primary = [];
        obj.designations.secondary = [];
        let P = this.designations.primary;
        let S = this.designations.secondary;
        for(let i=0;i<P.length;i++){
            obj.designations.primary.push(P[i].save());
        }
        for(let i=0;i<S.length;i++){
            obj.designations.secondary.push(S[i].save());
        }
        if(this.current) obj.sbData = this.sbData;
        return obj;
    }

    load(loadData){
        if(loadData instanceof LoadData){
            let basin = this.basin;
            let nameNum;
            let namedTime;
            let depNum;
            let designations;
            if(loadData.format>=FORMAT_WITH_INDEXEDDB){
                let obj = loadData.value;
                this.record = StormData.loadArr(basin,loadData.sub(obj.record));
                for(let p of [
                    'id',
                    'birthTime',
                    'deaths',
                    'damage',
                    'landfalls'
                ]) this[p] = obj[p];
                if(!this.birthTime) this.birthTime = 0;
                if(!this.deaths) this.deaths = 0;
                if(!this.damage) this.damage = 0;
                if(!this.landfalls) this.landfalls = 0;
                if(obj.depressionNum!==undefined) depNum = obj.depressionNum;
                if(obj.nameNum!==undefined) nameNum = obj.nameNum;
                if(obj.designations!==undefined) designations = obj.designations;
                if(obj.sbData){
                    this.sbData = obj.sbData;
                    if(loadData.format<FORMAT_WITH_SCALES){     // convert from pre-v0.2 values
                        for(let sub in this.sbData){
                            let l = this.sbData[sub].classLog;
                            if(l){
                                for(let s in l){
                                    let l1 = l[s];
                                    let l2 = {};
                                    for(let c in l1){
                                        let n = +c;
                                        if(l1[c]!==undefined){
                                            l2[Scale.convertOldValue(n)] = l1[c];
                                            if(c==='5') l2['6'] = l1[c];
                                        }
                                    }
                                    l[s] = l2;
                                }
                            }
                        }
                    }
                }
            }else{
                let data = loadData.value;
                data = data.split(".");
                let numData = decodeB36StringArray(data[0]);
                this.record = StormData.loadArr(basin,loadData.sub(data[1]));
                this.damage = numData.pop()*DAMAGE_DIVISOR || 0;
                this.deaths = numData.pop() || 0;
                this.birthTime = numData.pop() || 0;
                nameNum = numData.pop();
                if(nameNum<0) nameNum = undefined;
                depNum = numData.pop();
                if(depNum<0) depNum = undefined;
                this.id = numData.pop() || 0;
            }
            for(let i=0;i<this.record.length;i++){
                let d = this.record[i];
                let sub = land.getSubBasin(d.pos.x,d.pos.y);
                let trop = tropOrSub(d.type);
                let inBasinTrop = trop && basin.subInBasin(sub);
                let t = (i+ceil(this.birthTime/ADVISORY_TICKS))*ADVISORY_TICKS;
                let yr = basin.getSeason(t);
                if(trop && !this.formationTime) this.formationTime = t;
                if(trop && this.dissipationTime) this.dissipationTime = undefined;
                if(!trop && this.formationTime && !this.dissipationTime) this.dissipationTime = t;
                if(inBasinTrop && !this.enterTime) this.enterTime = t;
                if(inBasinTrop && this.exitTime) this.exitTime = undefined;
                if(!inBasinTrop && this.enterTime && !this.exitTime) this.exitTime = t;
                let clsn = Scale.extendedSaffirSimpson.get(d);  // hardcoded to extended Saffir-Simpson since this is only used for backwards-compatibility
                if(inBasinTrop && !namedTime && clsn>=1) namedTime = t;  // backwards-compatibility name conversion
                if(loadData.format<FORMAT_WITH_STORM_SUBBASIN_DATA && inBasinTrop){
                    for(let subId of basin.forSubBasinChain(sub)){
                        for(let j=0;j<=clsn;j++) this.subBasinData(subId,yr,j,true);
                    }
                    this.subBasinData(DEFAULT_MAIN_SUBBASIN,yr,'num',true);
                    if(clsn>=1) this.subBasinData(DEFAULT_MAIN_SUBBASIN,yr,'name',true);
                }
                if(trop && !this.TC){
                    this.TC = true;
                    this.peak = undefined;
                }
                if(inBasinTrop && !this.inBasinTC){
                    this.inBasinTC = true;
                    this.peak = undefined;
                    this.ACE = 0;
                }
                if((!this.inBasinTC && (!this.TC || trop)) || inBasinTrop){
                    if(!this.peak) this.peak = d;
                    else if(d.pressure<this.peak.pressure) this.peak = d;
                }
                if(d.windSpeed>=ACE_WIND_THRESHOLD && (inBasinTrop || (trop && !this.inBasinTC))){
                    this.ACE *= ACE_DIVISOR;
                    this.ACE += pow(d.windSpeed,2);
                    this.ACE /= ACE_DIVISOR;
                }
            }
            this.ACE = round(this.ACE*ACE_DIVISOR)/ACE_DIVISOR;
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
            if(this.inBasinTC && !this.exitTime) this.exitTime = this.dissipationTime;
            if(designations){
                let P = designations.primary;
                let S = designations.secondary;
                for(let i=0;i<P.length;i++){
                    this.designations.primary.push(new Designation(loadData.sub(P[i])));
                }
                for(let i=0;i<S.length;i++){
                    this.designations.secondary.push(new Designation(loadData.sub(S[i])));
                }
            }else{
                let sb = basin.subBasins[DEFAULT_MAIN_SUBBASIN];
                if(sb instanceof SubBasin && sb.designationSystem){     // converts pre-v20191004a designations; needs testing
                    if(nameNum!==undefined){
                        let desig = sb.designationSystem.getName(namedTime,basin.getSeason(namedTime),nameNum);
                        if(desig) this.designations.primary.push(desig);
                    }
                    if(depNum!==undefined){
                        let desig = sb.designationSystem.getNum(this.enterTime,depNum);
                        if(desig) this.designations.primary.push(desig);
                    }
                }
            }
        }
    }
}

class StormRef{
    constructor(basin,s){
        if(basin instanceof Basin) this.basin = basin;
        if(s instanceof Storm){
            this.season = s.originSeason();
            this.refId = s.id;
            this.lastApplicableAt = s.deathTime;
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
        let basin = this.basin;
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
        let obj = {};
        for(let p of ['refId','season','lastApplicableAt']) obj[p] = this[p];
        return obj;
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
    constructor(basin,x,y,p,w,t){
        if(basin instanceof Basin) this.basin = basin;
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

    save(){
        let obj = {};
        obj.pos = {x: this.pos.x, y: this.pos.y};
        for(let p of ['pressure','windSpeed','type']) obj[p] = this[p];
        return obj;
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
    }

    static loadArr(basin,data){
        if(basin instanceof Basin && data instanceof LoadData){
            if(data.format>=FORMAT_WITH_INDEXEDDB){
                let obj = data.value;
                let arr = [];
                let x = [...obj.pos.x];
                let y = [...obj.pos.y];
                let pressure = [...obj.pressure];
                let windSpeed = [...obj.windSpeed];
                let type = [...obj.type];
                for(let i=0;i<x.length;i++){
                    arr[i] = new StormData(basin,x[i],y[i],pressure[i],windSpeed[i],type[i]);
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
                    arr[i] = new StormData(basin,data.sub(arr[i]),positions[i]);
                }
                return arr;
            }
        }
    }
}

class ActiveSystem extends StormData{
    constructor(basin,ext,spawn){
        if(!(basin instanceof Basin)) return;
        if(ext instanceof LoadData){
            super(basin);
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
                    y = basin.hemY(ext ? basin.env.get("jetstream",x,0,basin.tick)+random(-75,75) : random(HEIGHT*0.7,HEIGHT*0.9));
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
                sType==="5" ? 925 :
                sType==='6' ? 890 :
                sType==='7' ? 840 :
                sType==='8' ? 800 :
                sType==='9' ? 765 :
                sType==='10' ? 730 :
                sType==='y' ? 690 : 1000 :
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
                sType==="5" ? 145 :
                sType==='6' ? 170 :
                sType==='7' ? 210 : 
                sType==='8' ? 270 :
                sType==='9' ? 330 :
                sType==='10' ? 400 :
                sType==='y' ? 440 : 35 :
            random(15,35);
            let ty = ext ? EXTROP : spawn ?
                sType==="l" ? TROPWAVE :
                subt ? SUBTROP : TROP :
            TROPWAVE;
            super(basin,x,y,p,w,ty);
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
            this.storm = new Storm(basin,this);
            if(basin.tick%ADVISORY_TICKS===0) this.advisory();
        }
    }

    update(){
        let basin = this.basin;
        let prevland = land.get(this.pos.x,this.pos.y);
        this.getSteering();
        this.pos.add(this.steering);
        
        let x = this.pos.x;
        let y = this.pos.y;
        let z = basin.tick;

        let SST = basin.env.get("SST",x,y,z);
        let jet = basin.env.get("jetstream",x,y,z);
        jet = basin.hemY(y)-jet;
        let lnd = land.get(x,y);
        let moisture = basin.env.get("moisture",x,y,z);
        let shear = basin.env.get("shear",x,y,z).mag()+this.interaction.shear;
        
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
            if(this.fetchStorm().TC && this.fetchStorm().dissipationTime===undefined) this.fetchStorm().dissipationTime = basin.tick;
            if(this.fetchStorm().inBasinTC && this.fetchStorm().exitTime===undefined) this.fetchStorm().exitTime = basin.tick;
            this.fetchStorm().current = undefined;
            return;
        }

        let rType = this.fetchStorm().getStormDataByTick(basin.tick);
        rType = rType && rType.type;
        if(tropOrSub(rType!==null ? rType : this.type)){
            let pop = lnd ? round(250000*(1+basin.hemY(y)/HEIGHT)*pow(0.8,map(lnd,0.5,1,0,30))) : 0;
            let damPot = pow(1.062,this.windSpeed)-1;   // damage potential
            let dedPot = pow(1.045,this.windSpeed)-1;    // death potential
            let m = pow(1.5,randomGaussian());      // modifier
            damPot *= m;
            dedPot *= m;
            let dam = pop*damPot*3.3*pow(1.1,random(-1,1));
            let ded = round(pop*dedPot*0.0000017*pow(1.1,random(-1,1)));
            let lf = 0;
            if(!prevland && lnd) lf = 1;
            let sub = land.getSubBasin(x,y);
            if(!this.fetchStorm().inBasinTC || basin.subInBasin(sub)){
                this.fetchStorm().damage += dam;
                this.fetchStorm().damage = round(this.fetchStorm().damage*100)/100;
                this.fetchStorm().deaths += ded;
                this.fetchStorm().landfalls += lf;
            }
            let seas = basin.fetchSeason(-1,true,true);
            for(let subId of basin.forSubBasinChain(sub)){
                if(basin.subInBasin(subId)){
                    let s = seas.stats(subId);
                    s.damage += dam;
                    s.damage = round(s.damage*100)/100;
                    s.deaths += ded;
                    s.landfalls += lf;
                }
            }
            seas.modified = true;
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
        let adv = new StormData(this.basin,x,y,p,w,ty);
        this.fetchStorm().updateStats(adv);
        this.fetchStorm().record.push(adv);
        this.doTrackForecast();
        this.fetchStorm().renderTrack(true);
    }

    getSteering(){
        let basin = this.basin;
        let l = basin.env.get("LLSteering",this.pos.x,this.pos.y,basin.tick);
        let u = basin.env.get("ULSteering",this.pos.x,this.pos.y,basin.tick);
        let d = sqrt(this.depth);
        let x = lerp(l.x,u.x,d);       // Deeper systems follow upper-level steering more and lower-level steering less
        let y = lerp(l.y,u.y,d);
        this.steering.set(x,y);
        this.steering.add(this.interaction.fuji); // Fujiwhara
    }

    interact(that,first){   // Quick and sloppy fujiwhara implementation
        let basin = this.basin;
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
        let basin = this.basin;
        let p = this.trackForecast.pVec;
        let s = this.trackForecast.stVec;
        this.trackForecast.points = [];
        p.set(this.pos);
        for(let f=0;f<120;f++){
            let t = basin.tick+f;
            // Copy-paste from getSteering (will do something better in future)
            let l = basin.env.get("LLSteering",p.x,p.y,t);
            let u = basin.env.get("ULSteering",p.x,p.y,t);
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
            if(!s) return new Storm(this.basin);
            this.storm = s;
            this.storm.deathTime = undefined;
            let r = this.storm.record;
            if(r.length>0 && tropOrSub(r[r.length-1].type)){
                this.storm.dissipationTime = undefined;
                if(land.inBasin(r[r.length-1].pos.x,r[r.length-1].pos.y)) this.storm.exitTime = undefined;
            }
            this.storm.current = this;
        }
        return this.storm;
    }

    save(){
        let obj = super.save();
        for(let p of [
            'organization',
            'lowerWarmCore',
            'upperWarmCore',
            'depth'
        ]) obj[p] = this[p];
        obj.ref = new StormRef(this.basin,this.fetchStorm()).save();
        return obj;
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
                this.storm = new StormRef(this.basin,data.sub(obj.ref));
            }else{
                let str = data.value;
                let parts = str.split(".");
                super.load(data.sub(parts[0]));
                let activeData = decodeB36StringArray(parts[1]);
                this.depth = activeData.pop();
                this.upperWarmCore = activeData.pop();
                this.lowerWarmCore = activeData.pop();
                this.organization = activeData.pop();
                this.storm = new StormRef(this.basin,data.sub(parts[2]));
            }
        }
    }
}

function tropOrSub(ty){
    return ty===TROP || ty===SUBTROP;
}