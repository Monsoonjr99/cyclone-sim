class Basin{
    constructor(load,year,SHem,godMode,hyper,seed,names,hurrTerm){
        this.seasons = {};
        this.activeSystems = [];
        this.tick = 0;
        this.godMode = godMode;
        this.SHem = SHem;
        this.hyper = hyper;
        this.startYear = year;
        this.nameList = NAME_LIST_PRESETS[names || 0];
        this.sequentialNameIndex = typeof this.nameList[0] === "string" ? 0 : -1;
        this.hurricaneStrengthTerm = hurrTerm || 0;
        this.seed = seed || moment().valueOf();
        this.envData = {};
        this.saveSlot = load || 0;
        if(load || load===0) this.load();
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
        return moment.utc(this.startTime()+t*TICK_DURATION);
    }

    seasonTick(n){
        let m = moment.utc(this.SHem ? [n-1, 6, 1] : [n, 0, 1]);
        let t = floor((m.valueOf()-this.startTime())/TICK_DURATION);
        t = floor(t/ADVISORY_TICKS)*ADVISORY_TICKS;
        return t;
    }

    spawn(...opts){
        this.activeSystems.push(new ActiveSystem(...opts));
    }

    getSeason(t){
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

    fetchSeason(n,isTick){
        if(isTick) n = this.getSeason(n);
        if(this.seasons[n]) return this.seasons[n];
        return null; // insert season loading here
    }

    storagePrefix(){
        return LOCALSTORAGE_KEY_PREFIX + this.saveSlot + '-';
    }

    save(){
        let formatKey = this.storagePrefix() + LOCALSTORAGE_KEY_FORMAT;
        let basinKey = this.storagePrefix() + LOCALSTORAGE_KEY_BASIN;
        let namesKey = this.storagePrefix() + LOCALSTORAGE_KEY_NAMES;
        localStorage.setItem(formatKey,SAVE_FORMAT.toString(SAVING_RADIX));
        let flags = 0;
        flags |= this.hyper;
        flags <<= 1;
        flags |= this.godMode;
        flags <<= 1;
        flags |= this.SHem;
        let arr = [this.hurricaneStrengthTerm,this.sequentialNameIndex,this.tick,this.seed,this.startYear,flags]; // add new properties to the beginning of this array for backwards compatibility
        arr = encodeB36StringArray(arr);
        localStorage.setItem(basinKey,arr);
        let names = this.nameList.join(";");
        if(typeof this.nameList[0]==="object" && this.nameList[0].length<2) names = "," + names;
        localStorage.setItem(namesKey,names);
        // insert seasons and env saving here
    }

    load(){
        let basinKey = this.storagePrefix() + LOCALSTORAGE_KEY_BASIN;
        let formatKey = this.storagePrefix() + LOCALSTORAGE_KEY_FORMAT;
        let namesKey = this.storagePrefix() + LOCALSTORAGE_KEY_NAMES;
        let arr = localStorage.getItem(basinKey);
        let format = parseInt(localStorage.getItem(formatKey),SAVING_RADIX);
        let names = localStorage.getItem(namesKey);
        if(arr && format>=EARLIEST_COMPATIBLE_FORMAT){
            arr = decodeB36StringArray(arr);
            let flags = arr.pop() || 0;
            this.startYear = arr.pop();
            this.seed = arr.pop() || moment().valueOf();
            this.tick = arr.pop() || 0;
            this.sequentialNameIndex = arr.pop();
            this.hurricaneStrengthTerm = arr.pop() || 0;
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
            // insert seasons and env loading here
            this.tick = 0; // temporary since saving seasons and env not yet added
        }else{
            this.godMode = true;
            this.startYear = NHEM_DEFAULT_YEAR;
        }
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
        if(loadstr) this.load(loadstr);
    }

    addSystem(s){
        this.systems.push(s);
        if(s.current) s.id = this.totalSystemCount++;
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
        for(let i=0;i<this.systems.length;i++) yield this.fetchSystemAtIndex(i);
    }

    save(){
        // WIP
        let str = "";
        let stats = [SAVE_FORMAT,this.totalSystemCount,this.depressions,this.namedStorms,this.hurricanes,this.majors,this.c5s,this.ACE*ACE_DIVISOR,this.deaths,this.damage/DAMAGE_DIVISOR,this.envRecordStarts];
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
        str += "insert storm system data here";
        return str;
    }

    load(str){
        // WIP
        let mainparts = str.split(";");
        let stats = decodeB36StringArray(mainparts[0]);
        let seasonSaveFormat = stats[0];
        this.totalSystemCount = stats[1];
        this.depressions = stats[2];
        this.namedStorms = stats[3];
        this.hurricanes = stats[4];
        this.majors = stats[5];
        this.c5s = stats[6];
        this.ACE = stats[7]/ACE_DIVISOR;
        this.deaths = stats[8];
        this.damage = stats[9]*DAMAGE_DIVISOR;
        this.envRecordStarts = stats[10];
        if(seasonSaveFormat>=EARLIEST_COMPATIBLE_FORMAT && seasonSaveFormat>=ENVDATA_COMPATIBLE_FORMAT && mainparts[1]!==""){
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
        n = round(n);
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
    let w = floor(o.w || width);
    let h = floor(o.h || height);
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
    let w = floor(o.w || width);
    let h = floor(o.h || height);
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