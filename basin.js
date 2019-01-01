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
        this.saveSlot = load ? load : 0;
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

    storagePrefix(){
        return LOCALSTORAGE_SAVE_PREFIX + this.saveSlot + '-';
    }

    save(){
        localStorage.setItem(this.storagePrefix()+'format',SAVE_FORMAT);
        let key = this.storagePrefix() + 'basin';
        let flags = 0;
        flags |= this.godMode;
        flags <<= 1;
        flags |= this.SHem;
        let arr = [this.tick,this.seed,this.startYear,flags];
        arr = encodeB36StringArray(arr);
        localStorage.setItem(key,arr);
        // insert seasons and env saving here
    }

    load(){
        let key = this.storagePrefix() + 'basin';
        let arr = localStorage.getItem(key);
        if(arr){
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

function getSeason(t){
    if(basin.SHem){
        let tm = tickMoment(t);
        let m = tm.month();
        let y = tm.year();
        if(m>=6) return y+1;
        return y;
    }
    return tickMoment(t).year();
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