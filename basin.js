class Basin{
    constructor(SHem,godMode,seed){
        this.seasons = {};
        this.activeSystems = [];
        this.tick = 0;
        this.godMode = godMode;
        this.SHem = SHem;
        let mo = moment().utc();
        if(this.SHem){
            let y = mo.year();
            let m = mo.month();
            mo.startOf('year').month(6);
            if(m>=6) this.startTime = mo.valueOf();
            else this.startTime = mo.year(y-1).valueOf();
        }else{
            this.startTime = mo.startOf('year').valueOf();
        }
        this.seed = seed || moment().valueOf();
        this.envData = {};
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