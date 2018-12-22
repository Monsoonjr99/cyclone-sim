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