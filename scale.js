class Scale{
    constructor(basin,data){
        this.basin = basin instanceof Basin && basin;
        // WIP
        if(data instanceof LoadData) this.load(data);
    }

    save(){
        let d = {};
        // WIP
        return d;
    }

    load(data){
        if(data instanceof LoadData){
            // WIP
        }
    }
}