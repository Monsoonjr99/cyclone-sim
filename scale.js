class Scale{
    constructor(/* basin, */data){
        // this.basin = basin instanceof Basin && basin;
        let opts;
        if(data && !(data instanceof LoadData)) opts = data;
        else opts = {};
        this.displayName = opts.displayName;
        this.measure = opts.measure || SCALE_MEASURE_ONE_MIN_KNOTS;   // 0 = 1-minute wind speed; 2 = pressure (10-minute wind speed not yet implemented)
        this.classifications = [];
        let cData;
        if(opts instanceof Array) cData = opts;
        else if(opts.classifications instanceof Array) cData = opts.classifications;
        if(cData){
            for(let c of cData){
                let clsn = {};
                clsn.threshold = c.threshold;
                if(clsn.threshold===undefined){
                    if(this.measure===SCALE_MEASURE_MILLIBARS) clsn.threshold = 1000;
                    else clsn.threshold = 35;
                }
                clsn.color = c.color===undefined ? 'white' : c.color;
                clsn.subtropicalColor = c.subtropicalColor;
                clsn.symbol = c.symbol===undefined ? 'C' : c.symbol;
                clsn.arms = c.arms===undefined ? 2 : c.arms;
                clsn.subtropicalSymbol = c.subtropicalSymbol;
                clsn.stormNom = c.stormNom;
                clsn.subtropicalStormNom = c.subtropicalStormNom;
                clsn.stat = c.stat;
                clsn.cName = c.cName;
                this.classifications.push(clsn);
            }
        }
        this.colorSchemeValue = 0;
        this.colorSchemeDisplayNames = opts.colorSchemeDisplayNames || [];
        this.flavorValue = 0;
        this.flavorDisplayNames = opts.flavorDisplayNames || [];
        if(data instanceof LoadData) this.load(data);
    }

    get(stormData){
        if(stormData instanceof StormData){
            let m;
            let c = 0;
            if(this.measure===SCALE_MEASURE_MILLIBARS || this.measure===SCALE_MEASURE_INHG){    // pressure
                m = stormData.pressure;     // millibars by default
                if(this.measure===SCALE_MEASURE_INHG) m = mbToInHg(m);
                while(c+1<this.classifications.length && m<=this.classifications[c+1].threshold) c++;
            }else{                                                                              // wind speed
                m = stormData.windSpeed;    // 1-minute knots by default
                if(this.measure===SCALE_MEASURE_TEN_MIN_KNOTS || this.measure===SCALE_MEASURE_TEN_MIN_MPH || this.measure===SCALE_MEASURE_TEN_MIN_KMH) m = oneMinToTenMin(m);    // one-minute to ten-minute wind conversion
                if(this.measure===SCALE_MEASURE_ONE_MIN_MPH || this.measure===SCALE_MEASURE_TEN_MIN_MPH) m = ktsToMph(m);   // knots-to-mph conversion
                if(this.measure===SCALE_MEASURE_ONE_MIN_KMH || this.measure===SCALE_MEASURE_TEN_MIN_KMH) m = ktsToKmh(m);   // knots-to-km/h conversion
                while(c+1<this.classifications.length && m>=this.classifications[c+1].threshold) c++;
            }
            return c;
        }
    }

    getColor(){
        let c;
        let subtropical;
        if(arguments[0] instanceof StormData){
            if(arguments[0].type===EXTROP) return COLORS.storm[EXTROP];
            if(arguments[0].type===TROPWAVE) return COLORS.storm[TROPWAVE];
            c = this.get(arguments[0]);
            subtropical = arguments[0].type===SUBTROP;
        }else{
            c = arguments[0];
            subtropical = arguments[1];
        }
        if(this.classifications.length<1) return 'white';
        while(!this.classifications[c].color && c>0) c--;
        let clsn = this.classifications[c];
        let color;
        if(subtropical && clsn.subtropicalColor) color = clsn.subtropicalColor;
        else color = clsn.color;
        if(color instanceof Array) return color[this.colorSchemeValue];
        return color;
    }

    getIcon(){
        let c;
        let subtropical;
        let color;
        if(arguments[0] instanceof StormData){
            c = this.get(arguments[0]);
            subtropical = arguments[0].type===SUBTROP;
            color = this.getColor(arguments[0]);
        }else{
            c = arguments[0];
            subtropical = arguments[1];
            color = this.getColor(c,subtropical);
        }
        if(this.classifications.length<1) return {symbol: subtropical ? 'SC' : 'C', arms: 2, color: 'white'};
        while(!this.classifications[c].symbol && c>0) c--;
        let clsn = this.classifications[c];
        let symbol;
        let fetch = sym=>{
            if(sym instanceof Array) return sym[this.flavorValue];
            return sym;
        };
        if(subtropical){
            if(clsn.subtropicalSymbol) symbol = fetch(clsn.subtropicalSymbol);
            else symbol = 'S' + fetch(clsn.symbol);
        }else symbol = fetch(clsn.symbol);
        let arms = clsn.arms;
        return {symbol, arms, color};
    }

    getStormNom(){
        let c;
        let subtropical;
        if(arguments[0] instanceof StormData){
            c = this.get(arguments[0]);
            subtropical = arguments[0].type===SUBTROP;
        }else{
            c = arguments[0];
            subtropical = arguments[1];
        }
        if(this.classifications.length<1) return subtropical ? 'Subtropical Cyclone' : 'Tropical Cyclone';
        while(!this.classifications[c].stormNom && c>0) c--;
        let clsn = this.classifications[c];
        let fetch = n=>{
            if(n instanceof Array) return n[this.flavorValue];
            return n;
        };
        if(subtropical){
            if(clsn.subtropicalStormNom) return fetch(clsn.subtropicalStormNom);
            if(clsn.stormNom) return 'Subtropical ' + fetch(clsn.stormNom);
            return 'Subtropical Cyclone';
        }
        if(clsn.stormNom) return fetch(clsn.stormNom);
        return 'Tropical Cyclone';
    }

    getClassificationName(){
        let c;
        if(arguments[0] instanceof StormData) c = this.get(arguments[0]);
        else c = arguments[0];
        if(this.classifications.length<1) return 'Cyclone';
        if(this.classifications[c].cName) return this.classifications[c].cName;
        return c + '';
    }

    *statDisplay(){
        for(let i=0;i<this.classifications.length;i++){
            let clsn = this.classifications[i];
            if(clsn.stat){
                if(clsn.stat instanceof Array && clsn.stat[this.flavorValue]) yield {statName: clsn.stat[this.flavorValue], cNumber: i};
                else if(typeof clsn.stat === 'string') yield {statName: clsn.stat, cNumber: i};
            }
        }
    }

    colorScheme(v){
        if(typeof v === 'number'){
            this.colorSchemeValue = v;
            return this;
        }
        return this.colorSchemeValue;
    }

    flavor(v){
        if(typeof v === 'number'){
            this.flavorValue = v;
            return this;
        }
        return this.flavorValue;
    }

    clone(){
        let newScale = new Scale();
        for(let p of [
            'displayName',
            'measure',
            'colorSchemeValue',
            'flavorValue'
        ]) newScale[p] = this[p];
        for(let p of [
            'classifications',
            'colorSchemeDisplayNames',
            'flavorDisplayNames'
        ]) newScale[p] = JSON.parse(JSON.stringify(this[p]));
        return newScale;
    }

    save(){
        let d = {};
        for(let p of [
            'displayName',
            'measure',
            'classifications',
            'colorSchemeValue',
            'colorSchemeDisplayNames',
            'flavorValue',
            'flavorDisplayNames'
        ]) d[p] = this[p];
        return d;
    }

    load(data){
        if(data instanceof LoadData){
            let d = data.value;
            for(let p of [
                'displayName',
                'measure',
                'classifications',
                'colorSchemeValue',
                'colorSchemeDisplayNames',
                'flavorValue',
                'flavorDisplayNames'
            ]) this[p] = d[p];
        }
    }

    static convertOldValue(v){  // converts pre-v0.2 (extended) Saffir-Simpson values to Scale.extendedSaffirSimpson values
        if(v<5) return v+1;
        return v+2;
    }
}

Scale.saffirSimpson = new Scale({
    displayName: 'Saffir-Simpson',
    colorSchemeDisplayNames: ['Classic','Wiki'],
    flavorDisplayNames: ['Hurricane','Typhoon','Cyclone'],
    classifications: [
        {
            threshold: 0,
            color: ['rgb(20,20,230)','#5ebaff'],
            subtropicalColor: ['rgb(60,60,220)','#5ebaff'],
            symbol: 'D',
            arms: 0,
            stormNom: 'Tropical Depression',
            subtropicalStormNom: 'Subtropical Depression',
            stat: 'Depressions',
            cName: 'Depression'
        },
        {
            threshold: 34,
            color: ['rgb(20,230,20)','#00faf4'],
            subtropicalColor: ['rgb(60,220,60)','#00faf4'],
            symbol: 'S',
            stormNom: 'Tropical Storm',
            subtropicalStormNom: 'Subtropical Storm',
            stat: 'Named Storms',
            cName: 'Storm'
        },
        {
            threshold: 64,
            color: ['rgb(230,230,20)','#ffffcc'],
            symbol: '1',
            stormNom: ['Hurricane','Typhoon','Cyclone'],
            stat: ['Hurricanes','Typhoons','Cyclones'],
            cName: 'Category 1'
        },
        {
            threshold: 83,
            color: ['rgb(240,170,20)','#ffe775'],
            symbol: '2',
            cName: 'Category 2'
        },
        {
            threshold: 96,
            color: ['rgb(240,20,20)','#ffc140'],
            symbol: '3',
            stormNom: ['Major Hurricane','Typhoon','Cyclone'],
            stat: ['Major Hurricanes','Category 3+','Category 3+'],
            cName: 'Category 3'
        },
        {
            threshold: 113,
            color: ['rgb(250,40,250)','#ff8f20'],
            symbol: '4',
            cName: 'Category 4'
        },
        {
            threshold: 130,
            color: ['rgb(250,40,250)','#ff8f20'],
            symbol: '4',
            stormNom: ['Major Hurricane','Super Typhoon','Cyclone'],
            stat: [undefined,'Super Typhoons'],
            cName: 'Category 4 STY'
        },
        {
            threshold: 137,
            color: ['rgb(250,140,250)','#ff6060'],
            symbol: '5',
            stat: 'Category 5s',
            cName: 'Category 5'
        }
    ]
});

Scale.extendedSaffirSimpson = new Scale({
    displayName: 'Extended Saffir-Simpson',
    colorSchemeDisplayNames: ['Classic','Wiki'],
    flavorDisplayNames: ['Hurricane','Typhoon','Cyclone'],
    classifications: [
        {
            threshold: 0,
            color: ['rgb(20,20,230)','#5ebaff'],
            subtropicalColor: ['rgb(60,60,220)','#5ebaff'],
            symbol: 'D',
            arms: 0,
            stormNom: 'Tropical Depression',
            subtropicalStormNom: 'Subtropical Depression',
            stat: 'Depressions',
            cName: 'Depression'
        },
        {
            threshold: 34,
            color: ['rgb(20,230,20)','#00faf4'],
            subtropicalColor: ['rgb(60,220,60)','#00faf4'],
            symbol: 'S',
            stormNom: 'Tropical Storm',
            subtropicalStormNom: 'Subtropical Storm',
            stat: 'Named Storms',
            cName: 'Storm'
        },
        {
            threshold: 64,
            color: ['rgb(230,230,20)','#ffffcc'],
            symbol: '1',
            stormNom: ['Hurricane','Typhoon','Cyclone'],
            stat: ['Hurricanes','Typhoons','Cyclones'],
            cName: 'Category 1'
        },
        {
            threshold: 83,
            color: ['rgb(240,170,20)','#ffe775'],
            symbol: '2',
            cName: 'Category 2'
        },
        {
            threshold: 96,
            color: ['rgb(240,20,20)','#ffc140'],
            symbol: '3',
            stormNom: ['Major Hurricane','Typhoon','Cyclone'],
            stat: ['Major Hurricanes','Category 3+','Category 3+'],
            cName: 'Category 3'
        },
        {
            threshold: 113,
            color: ['rgb(250,40,250)','#ff8f20'],
            symbol: '4',
            cName: 'Category 4'
        },
        {
            threshold: 130,
            color: ['rgb(250,40,250)','#ff8f20'],
            symbol: '4',
            stormNom: ['Major Hurricane','Super Typhoon','Cyclone'],
            stat: [undefined,'Super Typhoons'],
            cName: 'Category 4 STY'
        },
        {
            threshold: 137,
            color: ['rgb(250,140,250)','#ff6060'],
            symbol: '5',
            stat: 'Category 5+',
            cName: 'Category 5'
        },
        {
            threshold: 165,
            color: ['rgb(250,200,250)','#8b0000'],
            symbol: '6',
            cName: 'Category 6'
        },
        {
            threshold: 198,
            color: ['rgb(240,90,90)','#cc0033'],
            symbol: '7',
            cName: 'Category 7'
        },
        {
            threshold: 255,
            color: ['rgb(190,60,60)','#cc0066'],
            symbol: '8',
            stat: 'Category 8+',
            cName: 'Category 8'
        },
        {
            threshold: 318,
            color: ['rgb(130,10,10)','#9B30FF'],
            symbol: '9',
            cName: 'Category 9'
        },
        {
            threshold: 378,
            color: ['rgb(120,10,120)','#F9A7B0'],
            symbol: '10',
            cName: 'Category 10'
        },
        {
            threshold: 434,
            color: ['rgb(20,0,140)','#ff99ff'],
            symbol: 'HY',
            stormNom: ['Hypercane','Hyperphoon','Hyperclone'],
            stat: ['Hypercanes','Hyperphoons','Hyperclones'],
            cName: 'Hypercane'
        }
    ]
});

Scale.australian = new Scale({
    measure: SCALE_MEASURE_TEN_MIN_KNOTS,
    displayName: 'Australian',
    colorSchemeDisplayNames: ['Classic','Wiki'],
    flavorDisplayNames: ['Cyclone'],
    classifications: [
        {
            threshold: 0,
            color: ['rgb(20,20,230)','#5ebaff'],
            subtropicalColor: ['rgb(60,60,220)','#5ebaff'],
            symbol: 'D',
            arms: 0,
            stormNom: 'Tropical Depression',
            subtropicalStormNom: 'Subtropical Depression',
            stat: 'Depressions',
            cName: 'Depression'
        },
        {
            threshold: 34,
            color: ['rgb(20,230,20)','#00faf4'],
            subtropicalColor: ['rgb(60,220,60)','#00faf4'],
            symbol: '1',
            stormNom: 'Tropical Cyclone',
            subtropicalStormNom: 'Subtropical Cyclone',
            stat: 'Cyclones',
            cName: 'Category 1'
        },
        {
            threshold: 48,
            color: ['rgb(180,230,20)','#ccffff'],
            subtropicalColor: ['rgb(180,220,85)','#ccffff'],
            symbol: '2',
            stat: 'Category 2+',
            cName: 'Category 2'
        },
        {
            threshold: 64,
            color: ['rgb(230,230,20)','#ffffcc'],
            symbol: '3',
            stat: 'Category 3+',
            cName: 'Category 3'
        },
        {
            threshold: 86,
            color: ['rgb(240,20,20)','#ffc140'],
            symbol: '4',
            stat: 'Category 4+',
            cName: 'Category 4'
        },
        {
            threshold: 108,
            color: ['rgb(250,140,250)','#ff6060'],
            symbol: '5',
            stat: 'Category 5s',
            cName: 'Category 5'
        }
    ]
});

Scale.typhoonCommittee = new Scale({
    measure: SCALE_MEASURE_TEN_MIN_KNOTS,
    displayName: 'WMO Typhoon Committee',
    colorSchemeDisplayNames: ['Classic','Wiki'],
    flavorDisplayNames: ['Typhoon'],
    classifications: [
        {
            threshold: 0,
            color: ['rgb(20,20,230)','#5ebaff'],
            subtropicalColor: ['rgb(60,60,220)','#5ebaff'],
            symbol: 'D',
            arms: 0,
            stormNom: 'Tropical Depression',
            subtropicalStormNom: 'Subtropical Depression',
            stat: 'Depressions',
            cName: 'Depression'
        },
        {
            threshold: 34,
            color: ['rgb(20,230,20)','#00faf4'],
            subtropicalColor: ['rgb(60,220,60)','#00faf4'],
            symbol: 'S',
            stormNom: 'Tropical Storm',
            subtropicalStormNom: 'Subtropical Storm',
            stat: 'Named Storms',
            cName: 'Storm'
        },
        {
            threshold: 48,
            color: ['rgb(180,230,20)','#ccffff'],
            subtropicalColor: ['rgb(180,220,85)','#ccffff'],
            symbol: 'STS',
            subtropicalSymbol: 'SSS',
            stormNom: 'Severe Tropical Storm',
            subtropicalStormNom: 'Severe Subtropical Storm',
            stat: 'Severe',
            cName: 'Severe'
        },
        {
            threshold: 64,
            color: ['rgb(240,130,20)','#fdaf9a'],
            symbol: 'TY',
            stormNom: 'Typhoon',
            stat: 'Typhoons',
            cName: 'Typhoon'
        }
    ]
});

Scale.presetScales = [
    Scale.saffirSimpson,
    Scale.extendedSaffirSimpson,
    Scale.australian,
    Scale.typhoonCommittee
];