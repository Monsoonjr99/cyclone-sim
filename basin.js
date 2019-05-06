class Basin{
    constructor(load,year,SHem,godMode,hyper,seed,names,hurrTerm,mapType){
        this.seasons = {};
        this.seasonExpirationTimers = {};
        this.activeSystems = [];
        this.tick = 0;
        this.lastSaved = 0;
        this.godMode = godMode;
        this.SHem = SHem;
        this.hyper = hyper;
        this.startYear = year;
        this.nameList = NAME_LIST_PRESETS[names || 0];
        this.sequentialNameIndex = typeof this.nameList[0] === "string" ? 0 : -1;
        this.hurricaneStrengthTerm = hurrTerm || 0;
        this.mapType = mapType || 0;
        this.seed = seed || moment().valueOf();
        this.envData = {};
        this.envData.loadData = [];
        this.saveSlot = load || 0;
        if(load || load===0) this.load();
        else Basin.deleteSave(0);
        // localStorage.setItem("testSeed",this.seed.toString());
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

    seasonTick(n){
        if(n===undefined) n = this.getSeason(-1);
        let m = moment.utc(this.SHem ? [n-1, 6, 1] : [n, 0, 1]);
        let t = floor((m.valueOf()-this.startTime())/TICK_DURATION);
        t = floor(t/ADVISORY_TICKS)*ADVISORY_TICKS;
        return t;
    }

    spawn(...opts){
        this.activeSystems.push(new ActiveSystem(...opts));
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

    fetchSeason(n,isTick){  // returns the season object given a year number, or given a sim tick if isTick is true
        if(isTick) n = this.getSeason(n);
        let season;
        if(this.seasons[n]) season = this.seasons[n];
        else{
            let sKey = this.storagePrefix() + LOCALSTORAGE_KEY_SEASON + n;
            let str = localStorage.getItem(sKey);
            if(str){
                season = this.seasons[n] = new Season(str);
                this.expireSeasonTimer(n);
            }
        }
        if(season) season.lastAccessed = moment().valueOf();
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

    static storagePrefix(s){
        return LOCALSTORAGE_KEY_PREFIX + LOCALSTORAGE_KEY_SAVEDBASIN + s + '-';
    }

    storagePrefix(){
        return Basin.storagePrefix(this.saveSlot);
    }

    save(){
        let lastSaved = this.lastSaved;
        let savedSeasons = [];
        modifyLocalStorage(()=>{
            let formatKey = this.storagePrefix() + LOCALSTORAGE_KEY_FORMAT;
            let basinKey = this.storagePrefix() + LOCALSTORAGE_KEY_BASIN;
            let namesKey = this.storagePrefix() + LOCALSTORAGE_KEY_NAMES;
            localStorage.setItem(formatKey,SAVE_FORMAT.toString(SAVING_RADIX));
            let str = "";
            for(let i=this.activeSystems.length-1;i>=0;i--){
                str += this.activeSystems[i].save();
                if(i>0) str += ",";
            }
            str += ";";
            for(let i=Env.fieldList.length-1;i>=0;i--){
                let f = Env.fieldList[i];
                for(let j=Env.fields[f].noise.length-1;j>=0;j--){
                    str += this.envData[f][j].save();
                    if(i>0 || j>0) str += ",";
                }
            }
            str += ";";
            let flags = 0;
            flags |= this.hyper;
            flags <<= 1;
            flags |= this.godMode;
            flags <<= 1;
            flags |= this.SHem;
            let arr = [this.mapType,this.hurricaneStrengthTerm,this.sequentialNameIndex,this.tick,this.seed,this.startYear,flags]; // add new properties to the beginning of this array for backwards compatibility
            str += encodeB36StringArray(arr);
            localStorage.setItem(basinKey,str);
            let names = this.nameList.join(";");
            if(typeof this.nameList[0]==="object" && this.nameList[0].length<2) names = "," + names;
            localStorage.setItem(namesKey,names);
            for(let k in this.seasons){
                if(this.seasons[k] && this.seasons[k].modified){
                    let seasonKey = this.storagePrefix() + LOCALSTORAGE_KEY_SEASON + k;
                    savedSeasons.push(k);
                    localStorage.setItem(seasonKey,this.seasons[k].save());
                }
            }
            this.lastSaved = this.tick;
        },()=>{
            this.lastSaved = lastSaved;
            for(let k of savedSeasons) this.seasons[k].modified = true;
            alert("localStorage quota for origin " + origin + " exceeded; unable to save");
        });
    }

    load(){
        let basinKey = this.storagePrefix() + LOCALSTORAGE_KEY_BASIN;
        let formatKey = this.storagePrefix() + LOCALSTORAGE_KEY_FORMAT;
        let namesKey = this.storagePrefix() + LOCALSTORAGE_KEY_NAMES;
        let str = localStorage.getItem(basinKey);
        let format = parseInt(localStorage.getItem(formatKey),SAVING_RADIX);
        let names = localStorage.getItem(namesKey);
        if(str && format>=EARLIEST_COMPATIBLE_FORMAT){
            let parts = str.split(";");
            let arr = decodeB36StringArray(parts.pop());
            let flags = arr.pop() || 0;
            this.startYear = arr.pop();
            this.seed = arr.pop() || moment().valueOf();
            this.lastSaved = this.tick = arr.pop() || 0;
            this.sequentialNameIndex = arr.pop();
            this.hurricaneStrengthTerm = arr.pop() || 0;
            this.mapType = arr.pop() || 0;
            this.SHem = flags & 1;
            flags >>= 1;
            this.godMode = flags & 1;
            flags >>= 1;
            this.hyper = flags & 1;
            if(this.startYear===undefined) this.startYear = this.SHem ? SHEM_DEFAULT_YEAR : NHEM_DEFAULT_YEAR;
            if(names){
                names = names.split(";");
                if(names[0].indexOf(",")>-1){
                    for(let i=0;i<names.length;i++){
                        names[i] = names[i].split(",");
                    }
                    if(names[0][0]==="") names[0].shift();
                }
                this.nameList = names;
            }
            if(this.sequentialNameIndex===undefined) this.sequentialNameIndex = typeof this.nameList[0] === "string" ? 0 : -1;
            let envLoadData = parts.pop();
            this.envData.loadData = envLoadData ? envLoadData.split(",") : this.envData.loadData;
            let activeSystemData = parts.pop();
            if(activeSystemData){
                activeSystemData = activeSystemData.split(",");
                while(activeSystemData.length>0) this.activeSystems.push(new ActiveSystem(activeSystemData.pop()));
            }
            if(format<FORMAT_WITH_SAVED_SEASONS) this.lastSaved = this.tick = 0; // resets tick to 0 in basins test-saved in versions prior to full saving including seasons added
        }else{
            this.godMode = true;
            this.startYear = NHEM_DEFAULT_YEAR;
        }
    }

    saveAs(newSlot){
        let oldPre = this.storagePrefix();
        let newPre = Basin.storagePrefix(newSlot);
        modifyLocalStorage(()=>{
            Basin.deleteSave(newSlot);
            for(let i=0;i<localStorage.length;i++){
                let k = localStorage.key(i);
                if(k.startsWith(oldPre)){
                    let suffix = k.slice(oldPre.length);
                    localStorage.setItem(newPre+suffix,localStorage.getItem(k));
                }
            }
        },()=>{
            newSlot = this.saveSlot;
        },()=>{
            this.saveSlot = newSlot;
            this.save();
        });
    }

    static deleteSave(s){
        for(let i=localStorage.length-1;i>=0;i--){
            let k = localStorage.key(i);
            if(k.startsWith(Basin.storagePrefix(s))){
                localStorage.removeItem(k);
            }
        }
        storageQuotaExhausted = false;
    }
}

class Season{
    constructor(loadstr){
        this.systems = [];
        this.envData = {};
        this.idSystemCache = {};
        this.totalSystemCount = 0;
        this.depressions = 0;
        this.namedStorms = 0;
        this.hurricanes = 0;
        this.majors = 0;
        this.c5s = 0;
        this.ACE = 0;
        this.deaths = 0;
        this.damage = 0;
        this.envRecordStarts = 0;
        this.modified = true;
        this.lastAccessed = moment().valueOf();
        if(loadstr) this.load(loadstr);
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

    fetchSystemAtIndex(i){
        if(this.systems[i] instanceof StormRef) return this.systems[i].fetch();
        return this.systems[i];
    }

    *forSystems(){
        for(let i=0;i<this.systems.length;i++){
            let s = this.fetchSystemAtIndex(i);
            if(s) yield s;
        }
    }

    save(){
        let str = "";
        let stats = [];
        stats.push(this.totalSystemCount);
        stats.push(this.depressions);
        stats.push(this.namedStorms);
        stats.push(this.hurricanes);
        stats.push(this.majors);
        stats.push(this.c5s);
        stats.push(this.ACE*ACE_DIVISOR);
        stats.push(this.deaths);
        stats.push(this.damage/DAMAGE_DIVISOR);
        stats.push(this.envRecordStarts);
        stats.push(SAVE_FORMAT);
        str += encodeB36StringArray(stats);
        str += ";";
        if(this.envData){
            let mapR = r=>n=>map(n,-r,r,0,ENVDATA_SAVE_MULT);
            for(let f of Env.fieldList){
                for(let i=0;i<Env.fields[f].noise.length;i++){
                    let a = this.envData[f][i];
                    let c = Env.fields[f].noise[i];
                    let k = a[0];
                    let m = a.slice(1);
                    k = [k.x,k.y,k.z];
                    str += encodeB36StringArray(k,ENVDATA_SAVE_FLOAT);
                    str += ".";
                    let opts = {};
                    opts.h = opts.w = ENVDATA_SAVE_MULT;
                    let xyrange = (c.wobbleMax/c.zoom)*ADVISORY_TICKS;
                    let zrange = (c.zWobbleMax/c.zZoom)*ADVISORY_TICKS;
                    opts.mapY = opts.mapX = mapR(xyrange);
                    opts.mapZ = mapR(zrange);
                    str += encodePointArray(m,opts);
                    str += ",";
                }
            }
        }else str += ";";
        if(str.charAt(str.length-1)===",") str = str.slice(0,str.length-1) + ";";
        for(let i=0;i<this.systems.length;i++){
            let s = this.systems[i];
            if(s instanceof StormRef && s.fetch() && (s.fetch().TC || s.fetch().current)){
                str += "~" + s.save();
            }else if(s.TC || s.current){
                str += "," + s.save();
            }
        }
        this.modified = false;
        return str;
    }

    load(str){
        let mainparts = str.split(";");
        let stats = decodeB36StringArray(mainparts[0]);
        let seasonSaveFormat = stats.pop();
        if(seasonSaveFormat===undefined || seasonSaveFormat<EARLIEST_COMPATIBLE_FORMAT){
            this.envData = null;
            return;
        }
        this.envRecordStarts = stats.pop() || 0;
        this.damage = stats.pop()*DAMAGE_DIVISOR || 0;
        this.deaths = stats.pop() || 0;
        this.ACE = stats.pop()/ACE_DIVISOR || 0;
        this.c5s = stats.pop() || 0;
        this.majors = stats.pop() || 0;
        this.hurricanes = stats.pop() || 0;
        this.namedStorms = stats.pop() || 0;
        this.depressions = stats.pop() || 0;
        this.totalSystemCount = stats.pop() || 0;
        if(seasonSaveFormat>=ENVDATA_COMPATIBLE_FORMAT && mainparts[1]!==""){
            let e = mainparts[1].split(",");
            let i = 0;
            let mapR = r=>n=>map(n,0,ENVDATA_SAVE_MULT,-r,r);
            for(let f of Env.fieldList){
                for(let j=0;j<Env.fields[f].noise.length;j++,i++){
                    let c = Env.fields[f].noise[j];
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
            if(s.charAt(0)==="~") this.systems.push(new StormRef(s.slice(1)));
            else if(s.charAt(0)===",") this.systems.push(new Storm(s.slice(1)));
        }
        this.modified = false;
    }
}

// saving/loading helper functions

function encodeB36StringArray(arr,fl){
    const R = SAVING_RADIX;
    const numLen = n=>constrain(floor(log(abs(n)/pow(R,fl)*2+(n<0?1:0))/log(R))+1,1,R);
    if(fl===undefined) fl = 0;
    if(fl>R/2) fl = 0;
    if(fl<=-R/2) fl = 0;
    let str = (fl<0 ? fl+R : fl).toString(R);
    let nLen;
    let lenRun;
    let strpart = "";
    for(let i=0;i<arr.length;i++){
        let n = arr[i];
        let newLen = numLen(n);
        if(newLen!==nLen || lenRun>=R){
            if(lenRun!==undefined){
                str += ((lenRun-1).toString(R)) + ((nLen-1).toString(R)) + strpart;
                strpart = "";
            }
            nLen = newLen;
            lenRun = 1;
        }else lenRun++;
        n /= pow(R,fl);
        n = floor(n);
        n = n<0 ? abs(n)*2+1 : n*2;
        n = n.toString(R);
        if(n.length>R) n = n.slice(0,R);
        strpart += n;
    }
    if(lenRun!==undefined) str += ((lenRun-1).toString(R)) + ((nLen-1).toString(R)) + strpart;
    return str;
}

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

function encodePoint(x,y,z,o){
    if(typeof x === "object"){
        o = y;
        z = x.z || 0;
        y = x.y || 0;
        x = x.x || 0;
    }else{
        x = x || 0;
        y = y || 0;
        z = z || 0;
    }
    if(!o) o = {};
    let w = floor(o.w || WIDTH);
    let h = floor(o.h || HEIGHT);
    if(o.mapX instanceof Function) x = o.mapX(x);
    if(o.mapY instanceof Function) y = o.mapY(y);
    if(o.mapZ instanceof Function) z = o.mapZ(z);
    x = abs(x);
    y = abs(y);
    z = abs(z);
    return floor(z)*w*h+floor(y)*w+floor(x);
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

function encodePointArray(a,o){
    let arr = [];
    for(let i=0;i<a.length;i++){
        arr[i] = encodePoint(a[i],o);
    }
    return encodeB36StringArray(arr);
}

function decodePointArray(s,o){
    let arr = decodeB36StringArray(s);
    for(let i=0;i<arr.length;i++){
        arr[i] = decodePoint(arr[i],o);
    }
    return arr;
}

function modifyLocalStorage(action,error,callback){
    let lsCache = {};
    for(let i=0;i<localStorage.length;i++){
        let k = localStorage.key(i);
        if(k.startsWith(LOCALSTORAGE_KEY_PREFIX)) lsCache[k] = localStorage.getItem(k);
    }
    try{
        action();
    }catch(e){
        for(let i=localStorage.length-1;i>=0;i--){
            let k = localStorage.key(i);
            if(k.startsWith(LOCALSTORAGE_KEY_PREFIX)) localStorage.removeItem(k);
        }
        for(let k in lsCache){
            localStorage.setItem(k,lsCache[k]);
        }
        storageQuotaExhausted = true;
        if(error) error(e);
        else console.error(e);
        return;
    }
    lsCache = undefined;
    if(callback) callback();
}