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