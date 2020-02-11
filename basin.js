class Basin{
    constructor(load,opts){
        if(!opts) opts = {};
        this.seasons = {};
        this.seasonsBusyLoading = {};
        this.seasonExpirationTimers = {};
        this.activeSystems = [];
        this.subBasins = {};
        this.addSubBasin(DEFAULT_MAIN_SUBBASIN,undefined,undefined,undefined,
            Scale.presetScales[opts.scale || 0].clone().flavor(opts.scaleFlavor || 0).colorScheme(opts.scaleColorScheme || 0),
            DesignationSystem.convertFromOldNameList(NAME_LIST_PRESETS[opts.names || 0])
        );
        let suf = ({
            6: 'L',
            7: 'E',
            8: 'W',
            10: 'U',
            11: 'F',
            12: 'R'
        })[opts.mapType];   // Quick map-type-based suffix thing until name list presets get converted to designation systems
        if(suf!==undefined) this.subBasins[DEFAULT_MAIN_SUBBASIN].designationSystem.numbering.suffix = suf;
        this.tick = 0;
        this.lastSaved = 0;
        this.godMode = opts.godMode;
        this.SHem = opts.hem;
        this.actMode = opts.actMode || 0;
        if(opts.year!==undefined) this.startYear = opts.year;
        else this.startYear = this.SHem ? SHEM_DEFAULT_YEAR : NHEM_DEFAULT_YEAR;
        this.mapType = opts.mapType || 0;
        if(MAP_TYPES[this.mapType].special==='CPac'){
            this.subBasins[DEFAULT_MAIN_SUBBASIN].designationSystem.naming.crossingMode = DESIG_CROSSMODE_KEEP;
            this.subBasins[DEFAULT_MAIN_SUBBASIN].designationSystem.numbering.crossingMode = DESIG_CROSSMODE_KEEP;
            this.addSubBasin(128,undefined,'Central Pacific',DEFAULT_MAIN_SUBBASIN,undefined,new DesignationSystem(undefined,undefined,{
                suffix: 'C',
                numCross: DESIG_CROSSMODE_KEEP,
                mainLists: [NAME_LIST_PRESETS[2]],
                nameCross: DESIG_CROSSMODE_KEEP
            }));
        }else if(MAP_TYPES[this.mapType].special==='PAGASA'){
            this.addSubBasin(128,undefined,'PAGASA AoR',DEFAULT_MAIN_SUBBASIN,undefined,new DesignationSystem(undefined,undefined,{
                secondary: true,
                numEnable: false,
                mainLists: [NAME_LIST_PRESETS[4][0],NAME_LIST_PRESETS[4][1],NAME_LIST_PRESETS[4][2],NAME_LIST_PRESETS[4][3]],
                annual: true,
                anchor: 1963,
                nameThresh: 0
            }));
        }else if(MAP_TYPES[this.mapType].special==='NIO'){
            this.subBasins[DEFAULT_MAIN_SUBBASIN].designationSystem.numbering.enabled = false;
            this.subBasins[DEFAULT_MAIN_SUBBASIN].designationSystem.numbering.prefix = undefined;
            this.subBasins[DEFAULT_MAIN_SUBBASIN].designationSystem.numbering.suffix = undefined;
            this.addSubBasin(128,undefined,'Arabian Sea',DEFAULT_MAIN_SUBBASIN,undefined,new DesignationSystem(undefined,undefined,{
                prefix: 'ARB',
                numCross: DESIG_CROSSMODE_KEEP
            }));
            this.addSubBasin(129,undefined,'Bay of Bengal',DEFAULT_MAIN_SUBBASIN,undefined,new DesignationSystem(undefined,undefined,{
                prefix: 'BOB',
                numCross: DESIG_CROSSMODE_KEEP
            }));
        }else if(MAP_TYPES[this.mapType].special==='AUS'){
            this.subBasins[DEFAULT_MAIN_SUBBASIN].designationSystem.naming.crossingMode = DESIG_CROSSMODE_KEEP;
            this.subBasins[DEFAULT_MAIN_SUBBASIN].designationSystem.numbering.crossingMode = DESIG_CROSSMODE_KEEP;
            this.addSubBasin(128,undefined,'Jakarta TCWC',DEFAULT_MAIN_SUBBASIN,undefined,new DesignationSystem(undefined,undefined,{
                numEnable: false,
                mainLists: [NAME_LIST_PRESETS[11]],
                nameCross: DESIG_CROSSMODE_KEEP
            }));
            this.addSubBasin(129,undefined,'Port Moresby TCWC',DEFAULT_MAIN_SUBBASIN,undefined,new DesignationSystem(undefined,undefined,{
                numEnable: false,
                mainLists: [NAME_LIST_PRESETS[12]],
                nameCross: DESIG_CROSSMODE_KEEP
            }));
        }
        this.seed = opts.seed || moment().valueOf();
        this.env = new Environment(this);
        this.saveName = load || AUTOSAVE_SAVE_NAME;
        if(load) this.initialized = this.load();
        else{
            Basin.deleteSave(AUTOSAVE_SAVE_NAME);
            let f = ()=>{
                noiseSeed(this.seed);
                this.env.init();
                land = new Land(this);
                this.seasons[this.getSeason(-1)] = new Season(this);
                this.env.record();
            };
            if(MAP_TYPES[this.mapType].form==='pixelmap'){
                this.initialized = loadImg(MAP_TYPES[this.mapType].path).then(img=>{
                    img.loadPixels();
                    this.mapImg = img;
                    f();
                    return this;
                }).catch(e=>{
                    console.error(e);
                });
            }else{
                f();
                this.initialized = Promise.resolve(this);
            }
        }
    }

    mount(){    // mounts the basin to the viewer
        viewTick = this.tick;
        UI.viewBasin = this;
        selectedStorm = undefined;
        paused = this.tick!==0;
        refreshTracks(true);
        primaryWrapper.show();
        renderToDo = land.draw();
    }

    advanceSim(){
        let vp = this.viewingPresent();
        let os = this.getSeason(-1);
        this.tick++;
        let vs = this.getSeason(viewTick);
        viewTick = this.tick;
        let curSeason = this.getSeason(-1);
        if(curSeason!==os){
            let e = new Season(this);
            for(let s of this.activeSystems) e.addSystem(new StormRef(this,s.fetchStorm()));
            this.seasons[curSeason] = e;
        }
        if(!vp || curSeason!==vs) refreshTracks(curSeason!==vs);
        this.env.wobble();    // random change in environment for future forecast realism
        for(let i=0;i<this.activeSystems.length;i++){   // update active storm systems
            for(let j=i+1;j<this.activeSystems.length;j++){
                this.activeSystems[i].interact(this.activeSystems[j],true);
            }
            this.activeSystems[i].update();
        }
        SPAWN_RULES[this.actMode](this);    // spawn new storm systems
        let stormKilled = false;
        for(let i=this.activeSystems.length-1;i>=0;i--){    // remove dead storm systems from activeSystems array
            if(!this.activeSystems[i].fetchStorm().current){
                this.activeSystems.splice(i,1);
                stormKilled = true;
            }
        }
        if(stormKilled) refreshTracks();    // redraw tracks whenever a storm system dies
        if(this.tick%ADVISORY_TICKS===0){   // redraw map layer and record environmental field state every advisory
            this.env.displayLayer();
            this.env.record();
        }else if(simSettings.showMagGlass) this.env.updateMagGlass();   // redraw magnifying glass if displayed (and if it wasn't already redrawn with the map layer)
        let curTime = this.tickMoment();
        if(simSettings.doAutosave && (curTime.date()===1 || curTime.date()===15) && curTime.hour()===0) this.save();    // autosave at 00z on the 1st and 15th days of every month
    }

    startTime(){
        let y = this.startYear;
        let mo = moment.utc([y]);
        if(this.SHem){
            mo.month(6);
            mo.year(y-1);
        }
        return mo.valueOf();
    }

    tickMoment(t){
        if(t===undefined) t = this.tick;
        return moment.utc(this.startTime()+t*TICK_DURATION);
    }

    tickFromMoment(m){
        if(m instanceof moment) return floor((m.valueOf()-this.startTime())/TICK_DURATION);
    }

    seasonTick(n){
        if(n===undefined) n = this.getSeason(-1);
        let m = moment.utc(this.SHem ? [n-1, 6, 1] : [n, 0, 1]);
        let t = floor((m.valueOf()-this.startTime())/TICK_DURATION);
        t = floor(t/ADVISORY_TICKS)*ADVISORY_TICKS;
        return t;
    }

    viewingPresent(){
        return viewTick === this.tick;
    }

    hem(v){
        return this.SHem ? -v : v;
    }

    hemY(y){
        return this.SHem ? HEIGHT-y : y;
    }

    spawn(...opts){
        this.activeSystems.push(new ActiveSystem(this,...opts));
    }

    addSubBasin(id,...args){
        id = parseInt(id);
        this.subBasins[id] = new SubBasin(this,id,...args);
    }

    subInBasin(sub){
        let s = this.subBasins[sub];
        if(s instanceof SubBasin) return !s.outBasin();
        if(sub===DEFAULT_OUTBASIN_SUBBASIN) return false;
        return true;
    }

    *forSubBasinChain(id){
        let s = this.subBasins[id];
        if(s instanceof SubBasin) yield* s.forChain();
        else{
            yield id;
            if(id!==DEFAULT_OUTBASIN_SUBBASIN) yield DEFAULT_MAIN_SUBBASIN;
        }
    }

    relevantPrimaryDesignationSubBasins(id){
        if(id !== undefined){
            let numbering;
            let naming;
            let altPre;
            let altSuf;
            for(let subId of this.forSubBasinChain(id)){
                let sb = this.subBasins[subId];
                if(sb instanceof SubBasin && sb.designationSystem){
                    let ds = sb.designationSystem;
                    if(!ds.secondary){
                        if(numbering===undefined){
                            if(ds.numbering.enabled) numbering = subId;
                            else{
                                if(ds.numbering.prefix!==undefined) altPre = ds.numbering.prefix;
                                if(ds.numbering.suffix!==undefined) altSuf = ds.numbering.suffix;
                            }
                        }
                        if(naming===undefined && ds.naming.mainLists.length>0) naming = subId;
                    }
                }
                if(numbering!==undefined && naming!==undefined) break;
            }
            return {numbering, naming, altPre, altSuf};
        }
    }

    getScale(sub){
        let scale;
        for(let subId of this.forSubBasinChain(sub)){
            let sb = this.subBasins[subId];
            if(sb instanceof SubBasin && sb.scale){
                scale = sb.scale;
                break;
            }
        }
        if(scale) return scale;
        let mainSB = this.subBasins[DEFAULT_MAIN_SUBBASIN];
        if(mainSB instanceof SubBasin && mainSB.scale) return mainSB.scale;
        return Scale.saffirSimpson;
    }

    getSeason(t){       // returns the year number of a season given a sim tick
        if(t===-1) t = this.tick;
        if(this.SHem){
            let tm = this.tickMoment(t);
            let m = tm.month();
            let y = tm.year();
            if(m>=6) return y+1;
            return y;
        }
        return this.tickMoment(t).year();
    }

    fetchSeason(n,isTick,loadedRequired,callback){  // returns the season object given a year number, or given a sim tick if isTick is true
        if(isTick) n = this.getSeason(n);
        let season;
        let promise;
        if(this.seasons[n]){
            season = this.seasons[n];
            promise = Promise.resolve(season);
        }else{
            if(this.seasonsBusyLoading[n]) promise = this.seasonsBusyLoading[n];
            else{
                promise = this.seasonsBusyLoading[n] = waitForAsyncProcess(()=>{
                    return db.seasons.where('[saveName+season]').equals([this.saveName,n]).last().then(res=>{
                        if(res){
                            let d = LoadData.wrap(res);
                            let seas = this.seasons[n] = new Season(this,d);
                            this.expireSeasonTimer(n);
                            this.seasonsBusyLoading[n] = undefined;
                            seas.lastAccessed = moment().valueOf();
                            return seas;
                        }else return undefined;
                    });
                },'Retrieving Season...');
            }
        }
        if(season) season.lastAccessed = moment().valueOf();
        else if(loadedRequired) throw new Error(LOADED_SEASON_REQUIRED_ERROR);
        if(callback instanceof Function) promise.then(callback);
        else if(callback) return promise;
        return season;
    }

    seasonUnloadable(n){
        n = parseInt(n);
        if(!this.seasons[n]) return false;
        let s = this.seasons[n];
        let v = this.getSeason(viewTick);
        for(let a of this.activeSystems) if(a.fetchStorm().originSeason()===n) return false;
        return !s.modified && n!==v && n!==v-1 && n!==this.getSeason(-1);
    }
    
    expireSeasonTimer(n){
        let f = ()=>{
            if(this.seasons[n]){
                if(moment().diff(this.seasons[n].lastAccessed)>=LOADED_SEASON_EXPIRATION && this.seasonUnloadable(n)) this.seasons[n] = undefined;
                else this.expireSeasonTimer(n);
            }
        };
        this.seasonExpirationTimers[n] = setTimeout(f,LOADED_SEASON_EXPIRATION);
    }

    save(){
        let reqSeasons = [];
        for(let k in this.seasons){
            if(this.seasons[k] && this.seasons[k].modified){
                let seas = this.seasons[k];
                for(let i=0;i<seas.systems.length;i++){
                    if(seas.systems[i] instanceof StormRef){
                        reqSeasons.push(this.fetchSeason(seas.systems[i].season,false,false,true));
                    }
                }
            }
        }
        return Promise.all(reqSeasons).then(()=>{
            let obj = {};
            obj.format = SAVE_FORMAT;
            let b = obj.value = {};
            b.activeSystems = [];
            for(let a of this.activeSystems){
                b.activeSystems.push(a.save());
            }
            b.envData = {};
            for(let f of this.env.fieldList){
                let fd = b.envData[f] = {};
                fd.version = this.env.fields[f].version;
                fd.accurateAfter = this.env.fields[f].accurateAfter;
                let d = fd.noiseData = [];
                for(let c of this.env.fields[f].noise){
                    d.push(c.save());
                }
            }
            b.subBasins = {};
            for(let i in this.subBasins){
                let s = this.subBasins[i];
                if(s instanceof SubBasin) b.subBasins[i] = s.save();
            }
            b.flags = 0;
            b.flags |= 0;   // former hyper mode
            b.flags <<= 1;
            b.flags |= this.godMode;
            b.flags <<= 1;
            b.flags |= this.SHem;
            for(let p of [
                'mapType',
                'tick',
                'seed',
                'startYear',
                'actMode'
            ]) b[p] = this[p];
            return db.transaction('rw',db.saves,db.seasons,()=>{
                db.saves.put(obj,this.saveName);
                for(let k in this.seasons){
                    if(this.seasons[k] && this.seasons[k].modified){
                        let seas = {};
                        seas.format = SAVE_FORMAT;
                        seas.saveName = this.saveName;
                        seas.season = parseInt(k);
                        seas.value = this.seasons[k].save();
                        let cur = db.seasons.where('[saveName+season]').equals([this.saveName,seas.season]);
                        cur.count().then(c=>{
                            if(c>1){
                                cur.delete().then(()=>{
                                    db.seasons.put(seas);
                                });
                            }else if(c===1) cur.modify((s,ref)=>{
                                ref.value = seas;
                            });
                            else db.seasons.put(seas);
                        });
                    }
                }
            }).then(()=>{
                this.lastSaved = this.tick;
                for(let k in this.seasons){
                    if(this.seasons[k]) this.seasons[k].modified = false;
                }
            });
        }).catch(e=>{
            console.warn("Could not save due to an error");
            console.error(e);
        });
    }

    load(){
        return waitForAsyncProcess(()=>{
            return db.saves.get(this.saveName).then(res=>{
                if(res && res.format>=EARLIEST_COMPATIBLE_FORMAT){
                    let data = LoadData.wrap(res);
                    let oldhyper;
                    let envData;
                    let oldNameList;
                    let oldSeqNameIndex;
                    let oldHypoCats;
                    let oldHurricaneStrengthTerm;
                    if(data.format>=FORMAT_WITH_INDEXEDDB){
                        let obj = data.value;
                        for(let a of obj.activeSystems){
                            this.activeSystems.push(new ActiveSystem(this,data.sub(a)));
                        }
                        envData = data.sub(obj.envData);
                        if(obj.subBasins){
                            for(let i in obj.subBasins){
                                let s = obj.subBasins[i];
                                if(typeof s === "object") this.addSubBasin(i,data.sub(s));
                            }
                        }
                        let flags = obj.flags;
                        this.SHem = flags & 1;
                        flags >>= 1;
                        this.godMode = flags & 1;
                        flags >>= 1;
                        oldhyper = flags & 1;
                        for(let p of [
                            'mapType',
                            'tick',
                            'seed',
                            'startYear',
                            'actMode'
                        ]) this[p] = obj[p];
                        if(obj.nameList) oldNameList = obj.nameList;
                        if(obj.sequentialNameIndex!==undefined) oldSeqNameIndex = obj.sequentialNameIndex;
                        if(obj.hypoCats) oldHypoCats = obj.hypoCats;
                        if(obj.hurricaneStrengthTerm!==undefined) oldHurricaneStrengthTerm = obj.hurricaneStrengthTerm;
                        this.lastSaved = this.tick;
                    }else{  // localstorage format backwards compatibility
                        let str = data.value.str;
                        let format = data.format;
                        let names = data.value.names;
                        if(str){
                            let parts = str.split(";");
                            let arr = decodeB36StringArray(parts.pop());
                            let flags = arr.pop() || 0;
                            this.startYear = arr.pop();
                            this.seed = arr.pop() || moment().valueOf();
                            this.lastSaved = this.tick = arr.pop() || 0;
                            oldSeqNameIndex = arr.pop();
                            oldHurricaneStrengthTerm = arr.pop() || 0;
                            this.mapType = arr.pop() || 0;
                            this.SHem = flags & 1;
                            flags >>= 1;
                            this.godMode = flags & 1;
                            flags >>= 1;
                            oldhyper = flags & 1;
                            if(this.startYear===undefined) this.startYear = this.SHem ? SHEM_DEFAULT_YEAR : NHEM_DEFAULT_YEAR;
                            if(names){
                                names = names.split(";");
                                if(names[0].indexOf(",")>-1){
                                    for(let i=0;i<names.length;i++){
                                        names[i] = names[i].split(",");
                                    }
                                    if(names[0][0]==="") names[0].shift();
                                }
                                oldNameList = names;
                            }
                            if(oldSeqNameIndex===undefined) oldSeqNameIndex = typeof oldNameList[0] === "string" ? 0 : -1;
                            let envLoadData = parts.pop();
                            if(envLoadData) envData = data.sub(envLoadData.split(','));
                            let activeSystemData = parts.pop();
                            if(activeSystemData){
                                activeSystemData = activeSystemData.split(",");
                                while(activeSystemData.length>0) this.activeSystems.push(new ActiveSystem(this,data.sub(activeSystemData.pop())));
                            }
                            if(format<FORMAT_WITH_SAVED_SEASONS) this.lastSaved = this.tick = 0; // resets tick to 0 in basins test-saved in versions prior to full saving including seasons added
                        }
                    }
                    if(this.actMode===undefined){
                        if(oldhyper) this.actMode = SIM_MODE_HYPER;
                        else this.actMode = SIM_MODE_NORMAL;
                    }
                    this.env.init(envData);
                    if(oldNameList){
                        let desSys = DesignationSystem.convertFromOldNameList(oldNameList);
                        if(!desSys.naming.annual) desSys.naming.continuousNameIndex = oldSeqNameIndex;
                        this.addSubBasin(DEFAULT_MAIN_SUBBASIN,undefined,undefined,undefined,undefined,desSys);
                    }
                    if(data.format<FORMAT_WITH_SCALES){
                        if(!this.subBasins[DEFAULT_MAIN_SUBBASIN]) this.addSubBasin(DEFAULT_MAIN_SUBBASIN);
                        let sb = this.subBasins[DEFAULT_MAIN_SUBBASIN];
                        if(sb instanceof SubBasin){
                            if(oldHypoCats) sb.scale = Scale.extendedSaffirSimpson.clone();
                            else sb.scale = Scale.saffirSimpson.clone();
                            if(oldHurricaneStrengthTerm!==undefined) sb.scale.flavor(oldHurricaneStrengthTerm===0 ? 2 : oldHurricaneStrengthTerm-1);
                        }
                    }
                }else{
                    let t = 'Could not load basin';
                    console.error(t);
                    alert(t);
                }
                return this;
            }).then(b=>{
                if(MAP_TYPES[b.mapType].form==='pixelmap'){
                    return loadImg(MAP_TYPES[b.mapType].path).then(img=>{
                        img.loadPixels();
                        b.mapImg = img;
                        return b;
                    });
                }
                return b;
            }).then(b=>{
                noiseSeed(b.seed);
                land = new Land(b);
                return b.fetchSeason(-1,true,false,true).then(s=>{
                    let arr = [];
                    for(let i=0;i<s.systems.length;i++){
                        let r = s.systems[i];
                        if(r instanceof StormRef && (r.lastApplicableAt===undefined || r.lastApplicableAt>=b.tick || simSettings.trackMode===2)){
                            arr.push(b.fetchSeason(r.season,false,false,true));
                        }
                    }
                    return Promise.all(arr);
                });
            }).then(()=>this);
        },'Loading Basin...').catch(e=>{
            console.error(e);
        });
    }

    saveAs(newName){
        let oldName = this.saveName;
        return Basin.deleteSave(newName,()=>{
            return db.transaction('rw',db.saves,db.seasons,()=>{
                db.saves.get(oldName).then(res=>{
                    db.saves.put(res,newName);
                });
                db.seasons.where('saveName').equals(oldName).modify(v=>{
                    db.seasons.put({
                        format: v.format,
                        saveName: newName,
                        season: v.season,
                        value: v.value
                    });
                });
            }).then(()=>{
                this.saveName = newName;
                this.save();
            });
        });
    }

    static deleteSave(name,callback){
        return db.transaction('rw',db.saves,db.seasons,()=>{
            db.saves.delete(name);
            db.seasons.where('saveName').equals(name).delete();
        }).then(callback).catch(e=>{
            console.error(e);
        });
    }
}

class Season{
    constructor(basin,loaddata){
        if(basin instanceof Basin) this.basin = basin;
        this.systems = [];
        this.envData = {};
        this.idSystemCache = {};
        this.subBasinStats = {};
        this.totalSystemCount = 0;
        this.envRecordStarts = 0;
        this.modified = true;
        this.lastAccessed = moment().valueOf();
        if(loaddata instanceof LoadData) this.load(loaddata);
    }

    addSystem(s){
        this.systems.push(s);
        if(s.current) s.id = this.totalSystemCount++;
        this.modified = true;
    }

    fetchSystemById(id){
        if(this.idSystemCache[id]) return this.idSystemCache[id];
        for(let i=0;i<this.systems.length;i++){
            let s = this.systems[i];
            if(s.id===id){
                this.idSystemCache[id] = s;
                return s;
            }
        }
        return null;
    }

    fetchSystemAtIndex(i,lazy){
        if(this.systems[i] instanceof StormRef){
            if(lazy){
                let r = this.systems[i];
                if(r.lastApplicableAt===undefined || r.lastApplicableAt>=viewTick || simSettings.trackMode===2) return r.fetch();
                return undefined;
            }else return this.systems[i].fetch();
        }
        return this.systems[i];
    }

    *forSystems(lazy){
        for(let i=0;i<this.systems.length;i++){
            let s = this.fetchSystemAtIndex(i,lazy);
            if(s) yield s;
        }
    }

    stats(sub){
        let s = this.subBasinStats[sub];
        if(s instanceof SeasonStats) return s;
        let n = this.subBasinStats[sub] = new SeasonStats(this.basin,sub);
        return n;
    }

    save(forceStormRefs){
        let basin = this.basin;
        let val = {};
        for(let p of [
            'totalSystemCount',
            'envRecordStarts'
        ]) val[p] = this[p];
        val.stats = {};
        for(let sub in this.subBasinStats){
            let s = this.subBasinStats[sub];
            if(s instanceof SeasonStats) val.stats[sub] = s.save();
        }
        val.envData = {};
        for(let f of basin.env.fieldList){
            let fd = val.envData[f] = {};
            for(let i=0;i<basin.env.fields[f].noise.length;i++){
                let nd = fd[i] = {};
                let x = [];
                let y = [];
                let z = [];
                for(let e of this.envData[f][i]){
                    x.push(e.x);
                    y.push(e.y);
                    z.push(e.z);
                }
                nd.x = new Float32Array(x);
                nd.y = new Float32Array(y);
                nd.z = new Float32Array(z);
            }
        }
        val.systems = [];
        for(let i=0;i<this.systems.length;i++){
            let s = this.systems[i];
            if(s instanceof StormRef && (forceStormRefs || s.fetch() && (s.fetch().inBasinTC || s.fetch().current))){
                val.systems.push({isRef:true,val:s.save()});
            }else if(s.inBasinTC || s.current){
                val.systems.push({isRef:false,val:s.save()});
            }
        }
        return val;
    }

    load(data){
        let basin = this.basin;
        if(data instanceof LoadData && data.format>=EARLIEST_COMPATIBLE_FORMAT){
            let oldStats = {};
            if(data.format>=FORMAT_WITH_INDEXEDDB){
                let obj = data.value;
                for(let p of [
                    'totalSystemCount',
                    'envRecordStarts'
                ]) this[p] = obj[p] || 0;
                if(data.format<FORMAT_WITH_SUBBASIN_SEASON_STATS){
                    for(let p of [
                        'depressions',
                        'namedStorms',
                        'hurricanes',
                        'majors',
                        'c5s',
                        'c8s',
                        'hypercanes',
                        'ACE',
                        'deaths',
                        'damage',
                        'landfalls'
                    ]) oldStats[p] = obj[p];
                }
                if(obj.stats){
                    for(let sub in obj.stats) this.subBasinStats[sub] = new SeasonStats(basin,sub,data.sub(obj.stats[sub]));
                }
                if(data.format>ENVDATA_COMPATIBLE_FORMAT && obj.envData){
                    for(let f of basin.env.fieldList){
                        let fd = this.envData[f] = {};
                        for(let i=0;i<basin.env.fields[f].noise.length;i++){
                            let nd = fd[i] = [];
                            let sd = obj.envData[f][i];
                            let x = [...sd.x];
                            let y = [...sd.y];
                            let z = [...sd.z];
                            for(let j=0;j<x.length;j++){
                                nd.push({
                                    x: x[j],
                                    y: y[j],
                                    z: z[j]
                                });
                            }
                        }
                    }
                }
                for(let i=0;i<obj.systems.length;i++){
                    let s = obj.systems[i];
                    if(s.isRef) this.systems.push(new StormRef(basin,data.sub(s.val)));
                    else{
                        let v = data.sub(s.val);
                        v.season = data.season;
                        this.systems.push(new Storm(basin,v));
                    }
                }
            }else{  // localstorage format backwards compatibility
                let str = data.value;
                let mainparts = str.split(";");
                let stats = decodeB36StringArray(mainparts[0]);
                data.format = stats.pop();
                if(data.format===undefined){
                    this.envData = null;
                    return;
                }
                this.envRecordStarts = stats.pop() || 0;
                oldStats.damage = stats.pop()*DAMAGE_DIVISOR || 0;
                oldStats.deaths = stats.pop() || 0;
                oldStats.ACE = stats.pop()/ACE_DIVISOR || 0;
                oldStats.c5s = stats.pop() || 0;
                oldStats.majors = stats.pop() || 0;
                oldStats.hurricanes = stats.pop() || 0;
                oldStats.namedStorms = stats.pop() || 0;
                oldStats.depressions = stats.pop() || 0;
                this.totalSystemCount = stats.pop() || 0;
                if(data.format>=ENVDATA_COMPATIBLE_FORMAT && mainparts[1]!==""){
                    let e = mainparts[1].split(",");
                    let i = 0;
                    let mapR = r=>n=>map(n,0,ENVDATA_SAVE_MULT,-r,r);
                    for(let f of basin.env.fieldList){
                        for(let j=0;j<basin.env.fields[f].noise.length;j++,i++){
                            let c = basin.env.fields[f].noise[j];
                            let s = e[i].split(".");
                            let k = decodeB36StringArray(s[0]);
                            k = {x:k[0],y:k[1],z:k[2]};
                            let opts = {};
                            opts.h = opts.w = ENVDATA_SAVE_MULT;
                            let xyrange = (c.wobbleMax/c.zoom)*ADVISORY_TICKS;
                            let zrange = (c.zWobbleMax/c.zZoom)*ADVISORY_TICKS;
                            opts.mapY = opts.mapX = mapR(xyrange);
                            opts.mapZ = mapR(zrange);
                            let m = decodePointArray(s[1],opts);
                            for(let n=0;n<m.length;n++){
                                let p1;
                                if(n===0) p1 = k;
                                else p1 = m[n-1];
                                let p2 = m[n];
                                m[n] = {
                                    x: p1.x + p2.x,
                                    y: p1.y + p2.y,
                                    z: p1.z + p2.z
                                };
                            }
                            m.unshift(k);
                            if(!this.envData[f]) this.envData[f] = {};
                            this.envData[f][j] = m;
                        }
                    }
                }else this.envData = null;
                let storms = mainparts[2];
                for(let i=0,i1=0;i1<storms.length;i=i1){
                    i1 = storms.slice(i+1).search(/[~,]/g);
                    i1 = i1<0 ? storms.length : i+1+i1;
                    let s = storms.slice(i,i1);
                    if(s.charAt(0)==="~") this.systems.push(new StormRef(basin,data.sub(s.slice(1))));
                    else if(s.charAt(0)===","){
                        let v = data.sub(s.slice(1));
                        v.season = data.season;
                        this.systems.push(new Storm(basin,v));
                    }
                }
            }
            if(data.format<FORMAT_WITH_SUBBASIN_SEASON_STATS){
                let s = this.stats(DEFAULT_MAIN_SUBBASIN);
                for(let p of [
                    'ACE',
                    'deaths',
                    'damage',
                    'landfalls'
                ]) s[p] = oldStats[p] || 0;
                let cCounters = s.classificationCounters;
                cCounters[0] = oldStats.depressions || 0;
                cCounters[1] = oldStats.namedStorms || 0;
                cCounters[2] = oldStats.hurricanes || 0;
                cCounters[4] = oldStats.majors || 0;
                cCounters[7] = oldStats.c5s || 0;
                if(basin.getScale(DEFAULT_MAIN_SUBBASIN).classifications.length>8){
                    cCounters[10] = oldStats.c8s || 0;
                    cCounters[13] = oldStats.hypercanes || 0;
                }
                let dCounters = s.designationCounters;
                dCounters.number = oldStats.depressions || 0;
                dCounters.name = oldStats.namedStorms || 0;
            }
            if(data.format===SAVE_FORMAT) this.modified = false;
            else{
                db.transaction('rw',db.seasons,()=>{
                    let seas = {};
                    seas.format = SAVE_FORMAT;
                    seas.saveName = data.saveName;
                    seas.season = data.season;
                    seas.value = this.save(true);
                    let cur = db.seasons.where('[saveName+season]').equals([data.saveName,data.season]);
                    cur.count().then(c=>{
                        if(c>0) cur.modify((s,ref)=>{
                            ref.value = seas;
                        });
                        else db.seasons.put(seas);
                    });
                }).then(()=>{
                    this.modified = false;
                }).catch(e=>{
                    console.error(e);
                });
            }
        }else this.envData = null;
    }
}

class SeasonStats{
    constructor(basin,sub,data){
        this.basin = basin instanceof Basin && basin;
        this.subBasinId = sub;
        if(this.basin) this.subBasin = this.basin.subBasins[this.subBasinId];

        this.ACE = 0;
        this.deaths = 0;
        this.damage = 0;
        this.landfalls = 0;

        this.classificationCounters = {};       // counters for systems by classification on the sub-basin's scale (e.g. tropical depression, tropical storm, etc.)
        let clsns = this.basin.getScale(this.subBasinId).classifications.length;
        for(let i=0;i<clsns;i++) this.classificationCounters[i] = 0;

        this.designationCounters = {};
        this.designationCounters.number = 0;    // counter for numerical designations
        this.designationCounters.name = 0;      // counter for annual-based name designations

        if(data instanceof LoadData) this.load(data);
    }

    addACE(v){
        this.ACE = round((this.ACE + v) * ACE_DIVISOR) / ACE_DIVISOR;
    }

    save(){
        let d = {};
        if(this.subBasin instanceof SubBasin ? !this.subBasin.outBasin() : this.subBasinId!==DEFAULT_OUTBASIN_SUBBASIN){
            for(let p of [
                'ACE',
                'deaths',
                'damage',
                'landfalls'
            ]) d[p] = this[p];
            d.cCounters = {};
            for(let i in this.classificationCounters) d.cCounters[i] = this.classificationCounters[i];
        }
        d.dCounters = {};
        d.dCounters.number = this.designationCounters.number;
        d.dCounters.name = this.designationCounters.name;
        return d;
    }

    load(data){
        if(data instanceof LoadData){
            let d = data.value;
            if(this.subBasin instanceof SubBasin ? !this.subBasin.outBasin() : this.subBasinId!==DEFAULT_OUTBASIN_SUBBASIN){
                for(let p of [
                    'ACE',
                    'deaths',
                    'damage',
                    'landfalls'
                ]) this[p] = d[p];
                if(d.cCounters){
                    for(let i in d.cCounters){
                        if(data.format>=FORMAT_WITH_SCALES) this.classificationCounters[i] = d.cCounters[i];
                        else{   // convert pre-v0.2 values
                            this.classificationCounters[Scale.convertOldValue(+i)] = d.cCounters[i];
                            if(i==='5') this.classificationCounters['6'] = d.cCounters[i];
                        }
                    }
                }
            }
            if(d.dCounters){
                this.designationCounters.number = d.dCounters.number;
                this.designationCounters.name = d.dCounters.name;
            }
        }
    }
}

class SubBasin{
    constructor(basin,id,data,dName,parent,scale,desSys){
        this.basin = basin instanceof Basin && basin;
        this.id = id || DEFAULT_MAIN_SUBBASIN;
        this.parent = undefined;
        if(parent) this.parent = parent;
        else if(this.id!==DEFAULT_MAIN_SUBBASIN && this.id!==DEFAULT_OUTBASIN_SUBBASIN && parent!==false) this.parent = DEFAULT_MAIN_SUBBASIN;
        this.displayName = undefined;
        if(dName) this.displayName = dName;
        this.designationSystem = undefined;
        this.scale = undefined;
        if(desSys instanceof DesignationSystem){
            desSys.subBasin = this;
            this.designationSystem = desSys;
        }
        if(scale instanceof Scale) this.scale = scale;
        if(data instanceof LoadData) this.load(data);
    }

    outBasin(origin){
        if(this.id===DEFAULT_MAIN_SUBBASIN) return false;
        if(this.parent===DEFAULT_MAIN_SUBBASIN) return false;
        if(this.parent===undefined) return true;
        if(this.parent===origin) return true;
        let p = this.basin.subBasins[this.parent];
        if(p instanceof SubBasin) return p.outBasin(origin || this.id);
        if(this.parent===DEFAULT_OUTBASIN_SUBBASIN) return true;
        return false;
    }

    getDisplayName(){
        if(this.displayName) return this.displayName;
        if(this.id===DEFAULT_MAIN_SUBBASIN) return 'Main Basin';
        return 'SubBasin ' + this.id;
    }

    *forParents(origin){
        if(this.id!==DEFAULT_MAIN_SUBBASIN && this.parent!==undefined && this.parent!==origin){
            yield this.parent;
            if(this.parent!==DEFAULT_MAIN_SUBBASIN){
                let p = this.basin.subBasins[this.parent];
                if(p instanceof SubBasin) yield* p.forParents(origin || this.id);
                else if(this.parent!==DEFAULT_OUTBASIN_SUBBASIN) yield DEFAULT_MAIN_SUBBASIN;
            }
        }
    }

    *forChain(){
        yield this.id;
        yield* this.forParents();
    }

    save(){
        let d = {};
        for(let p of [
            'parent',
            'displayName'
        ]) d[p] = this[p];
        d.desSys = undefined;
        d.scale = undefined;
        if(this.designationSystem instanceof DesignationSystem) d.desSys = this.designationSystem.save();
        if(this.scale instanceof Scale) d.scale = this.scale.save();
        return d;
    }

    load(data){
        if(data instanceof LoadData){
            let d = data.value;
            for(let p of [
                'parent',
                'displayName'
            ]) this[p] = d[p];
            if(d.desSys) this.designationSystem = new DesignationSystem(this,data.sub(d.desSys));
            if(d.scale) this.scale = new Scale(data.sub(d.scale));
        }
    }
}

// saving/loading helpers

function setupDatabase(){
    db = new Dexie("cyclone-sim");
    db.version(1).stores({
        saves: '',
        seasons: '++,saveName,season',
        settings: ''
    });
    db.version(2).stores({
        saves: ',format',
        seasons: '++,format,saveName,[saveName+season]'
    });
}

class LoadData{
    constructor(format,value){
        this.format = format;
        this.value = value;
    }

    sub(v){
        return new LoadData(this.format,v);
    }

    static wrap(obj){
        let d = new LoadData(obj.format,obj.value);
        for(let k in obj){
            if(k!=='format' && k!=='value') d[k] = obj[k];
        }
        return d;
    }
}

// legacy localstorage decoders (for backwards compatibility)

function decodeB36StringArray(str){
    const R = SAVING_RADIX;
    let arr = [];
    let fl = str.slice(0,1);
    fl = parseInt(fl,R);
    if(fl>R/2) fl -= R;
    for(let i=1,runLen=0,run=0,nLen;i<str.length;i+=nLen,run++){
        if(run>=runLen){
            runLen = str.slice(i,++i);
            nLen = str.slice(i,++i);
            runLen = parseInt(runLen,R)+1;
            nLen = parseInt(nLen,R)+1;
            run = 0;
        }
        let n = str.slice(i,i+nLen);
        n = parseInt(n,R);
        n = n%2===0 ? n/2 : -(n-1)/2;
        n *= pow(R,fl);
        arr.push(n);
    }
    return arr;
}

function decodePoint(n,o){
    if(!o) o = {};
    let w = floor(o.w || WIDTH);
    let h = floor(o.h || HEIGHT);
    let z = floor(n/(w*h));
    n %= w*h;
    let y = floor(n/w);
    n %= w;
    let x = n;
    if(o.mapX instanceof Function) x = o.mapX(x);
    if(o.mapY instanceof Function) y = o.mapY(y);
    if(o.mapZ instanceof Function) z = o.mapZ(z);
    if(o.p5Vec) return createVector(x,y,z);
    return {x,y,z};
}

function decodePointArray(s,o){
    let arr = decodeB36StringArray(s);
    for(let i=0;i<arr.length;i++){
        arr[i] = decodePoint(arr[i],o);
    }
    return arr;
}