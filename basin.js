class Basin{
    constructor(year,SHem,godMode,seed){
        this.seasons = {};
        this.activeSystems = [];
        this.tick = 0;
        this.godMode = godMode;
        this.SHem = SHem;
        this.startYear = year;
        this.seed = seed || moment().valueOf();
        this.envData = {};
        localStorage.setItem("testSeed",this.seed.toString());
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
    if(fl===undefined) fl = 0;
    if(fl>R/2) fl = 0;
    if(fl<=-R/2) fl = 0;
    let nLen = floor(log(max(max(arr),abs(min(arr)))/pow(R,fl)*2+1)/log(R))+1;
    nLen = constrain(nLen,1,R);
    let str = (nLen-1).toString(R);
    str += (fl<0 ? fl+R : fl).toString(R);
    for(let i=0;i<arr.length;i++){
        let n = arr[i];
        n /= pow(R,fl);
        n = round(n);
        n = n<0 ? abs(n)*2+1 : n*2;
        n = n.toString(R);
        if(n.length>nLen) n = n.slice(0,nLen);
        else n = n.padStart(nLen,"0");
        str += n;
    }
    return str;
}

function decodeB36StringArray(str){
    const R = 36;
    let arr = [];
    let nLen = str.slice(0,1);
    let fl = str.slice(1,2);
    nLen = parseInt(nLen,R)+1;
    fl = parseInt(fl,R);
    if(fl>R/2) fl -= R;
    for(let i=2;i<str.length;i+=nLen){
        let n = str.slice(i,i+nLen);
        n = parseInt(n,R);
        n = n%2===0 ? n/2 : -(n-1)/2;
        n *= pow(R,fl);
        arr.push(n);
    }
    return arr;
}