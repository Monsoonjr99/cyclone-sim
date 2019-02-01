class Basin{
    constructor(load,year,SHem,godMode,seed){
        this.seasons = {};
        this.activeSystems = [];
        this.tick = 0;
        this.godMode = godMode;
        this.SHem = SHem;
        this.startYear = year;
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
        localStorage.setItem(formatKey,SAVE_FORMAT);
        let flags = 0;
        flags |= this.godMode;
        flags <<= 1;
        flags |= this.SHem;
        let arr = [this.tick,this.seed,this.startYear,flags];
        arr = encodeB36StringArray(arr);
        localStorage.setItem(basinKey,arr);
        // insert seasons and env saving here
    }

    load(){
        let basinKey = this.storagePrefix() + LOCALSTORAGE_KEY_BASIN;
        let formatKey = this.storagePrefix() + LOCALSTORAGE_KEY_FORMAT;
        let arr = localStorage.getItem(basinKey);
        let format = parseInt(localStorage.getItem(formatKey));
        if(arr && format>=EARLIEST_COMPATIBLE_FORMAT){
            arr = decodeB36StringArray(arr);
            this.tick = arr[0];
            this.seed = arr[1];
            this.startYear = arr[2];
            let flags = arr[3];
            this.SHem = flags & 1;
            flags >>= 1;
            this.godMode = flags & 1;
            // insert seasons and env loading here
            this.tick = 0; // temporary since saving seasons and env not yet added
        }else{
            this.godMode = true;
            this.startYear = NHEM_DEFAULT_YEAR;
        }
    }
}

class Season{
    constructor(){
        this.systems = [];
        this.depressions = 0;
        this.namedStorms = 0;
        this.hurricanes = 0;
        this.majors = 0;
        this.c5s = 0;
        this.ACE = 0;
        this.deaths = 0;
        this.damage = 0;
    }
}

// saving/loading helper functions

function encodeB36StringArray(arr,fl){
    const R = 36;
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
    const R = 36;
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