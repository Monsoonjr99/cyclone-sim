class NoiseChannel{
    constructor(octaves,falloff,zoom,zZoom,wMax,zWMax,wRFac){
        this.octaves = octaves || 4;
        this.falloff = falloff || 0.5;
        this.zoom = zoom || 100;
        this.zZoom = zZoom || this.zoom;
        this.meta = undefined;
        this.wobbleMax = wMax || 1;
        this.zWobbleMax = zWMax || this.wobbleMax;
        this.wobbleRotFactor = wRFac || PI/16;
    }

    get(x,y,z){
        x = x || 0;
        y = y || 0;
        z = z || 0;
        let xo;
        let yo;
        let zo;
        if(this.meta){
            let m = this.meta.fetch(z);
            if(!m) throw ENVDATA_NOT_FOUND_ERROR;
            xo = m.x;
            yo = m.y;
            zo = m.z;
        }else{
            xo = 0;
            yo = 0;
            zo = 0;
        }
        noiseDetail(this.octaves,this.falloff);
        return noise(x/this.zoom+xo,y/this.zoom+yo,z/this.zZoom+zo);
    }

    bind(meta){
        if(meta instanceof NCMetadata) this.meta = meta;
    }

    wobble(){
        if(this.meta){
            let m = this.meta;
            let v = m.wobbleVector;
            v.setMag(random(0.0001,this.wobbleMax));
            m.xOff += v.x/this.zoom;
            m.yOff += v.y/this.zoom;
            m.zOff += random(-this.zWobbleMax,this.zWobbleMax)/this.zZoom;
            v.rotate(random(-this.wobbleRotFactor,this.wobbleRotFactor));
        }
    }

    record(){
        if(this.meta) this.meta.record();
    }
}

class NCMetadata{
    constructor(field,index,loadstr){
        this.field = field;
        this.index = index;
        this.channel = null;
        this.wobbleVector = p5.Vector.random2D();
        let r = NC_OFFSET_RANDOM_FACTOR;
        this.xOff = random(r);
        this.yOff = random(r);
        this.zOff = random(r);
        this.history = {};
        if(loadstr) this.load(loadstr);
        if(!basin.envData[this.field]) basin.envData[this.field] = {};
        basin.envData[this.field][this.index] = this;
    }

    init(){
        if(Env){
            this.channel = Env.fields[this.field].noise[this.index];
            this.channel.bind(this);
        }
    }

    getHistoryCache(s,refresh){
        if(!refresh && this.history.season===s) return this.history.arr;
        this.history.season = s;
        let d = basin.fetchSeason(s);
        this.history.recordStarts = d.envRecordStarts;
        if(d.envData && d.envData[this.field] && d.envData[this.field][this.index]){
            d = d.envData[this.field][this.index];
            let h = this.history.arr = [];
            for(let i=0;i<d.length;i++){
                if(i===0) h.push(d[0]);
                else{
                    let o = h[i-1];
                    let n = d[i];
                    h.push({
                        x: o.x + n.x,
                        y: o.y + n.y,
                        z: o.z + n.z
                    });
                }
            }
        }else this.history.arr = null;
        return this.history.arr;
    }

    fetch(t){
        if(t>=basin.tick) return {
            x: this.xOff,
            y: this.yOff,
            z: this.zOff
        };
        else{
            t = floor(t/ADVISORY_TICKS)*ADVISORY_TICKS;
            let s = basin.getSeason(t);
            t = (t-basin.seasonTick(s))/ADVISORY_TICKS;
            if(!this.getHistoryCache(s)) return null;
            t -= this.history.recordStarts;
            return this.history.arr[t];
        }
    }

    record(){
        let h = this.getHistoryCache(basin.getSeason(-1));
        if(!h) h = this.history.arr = [];
        h.push({
            x: this.xOff,
            y: this.yOff,
            z: this.zOff
        });
        let seas = basin.fetchSeason(-1,true);
        let s = seas;
        let startingRecord;
        if(!s.envData){
            s.envData = {};
            startingRecord = true;
        }
        s = s.envData;
        if(!s[this.field]){
            s[this.field] = {};
            startingRecord = true;
        }
        s = s[this.field];
        if(!s[this.index]){
            s[this.index] = [];
            startingRecord = true;
        }
        s = s[this.index];
        if(startingRecord) this.history.recordStarts = seas.envRecordStarts = (floor(basin.tick/ADVISORY_TICKS)*ADVISORY_TICKS-basin.seasonTick())/ADVISORY_TICKS;
        if(s.length===0) s.push(h[0]);
        else{
            let o = h[h.length-2];
            let n = h[h.length-1];
            s.push({
                x: n.x - o.x,
                y: n.y - o.y,
                z: n.z - o.z
            });
        }
        seas.modified = true;
    }

    save(){
        let arr = [];
        arr.push(this.wobbleVector.y);
        arr.push(this.wobbleVector.x);
        arr.push(this.zOff);
        arr.push(this.yOff);
        arr.push(this.xOff);
        return encodeB36StringArray(arr,ENVDATA_SAVE_FLOAT);
    }

    load(str){
        let arr = decodeB36StringArray(str);
        this.xOff = arr.pop() || this.xOff;
        this.yOff = arr.pop() || this.yOff;
        this.zOff = arr.pop() || this.zOff;
        let wx = arr.pop();
        let wy = arr.pop();
        if(wx!==undefined && wy!==undefined) this.wobbleVector = createVector(wx,wy);
    }
}

class EnvField{
    constructor(name,mapFunc,opts,...noiseC){
        this.name = name;
        this.noise = [];
        this.isVectorField = opts.vector;
        this.noWobble = opts.noWobble;
        this.hueMap = opts.hueMap || [0,1,0,300];
        this.magMap = opts.magMap || [0,1,0,10];
        this.invisible = opts.invisible;
        this.oceanic = opts.oceanic;
        if(this.isVectorField) this.vec = createVector();
        if(mapFunc instanceof Function) this.mapFunc = mapFunc;
        let a = null;
        for(let i=0;i<noiseC.length;i++){
            if(noiseC[i] instanceof Array){
                a = noiseC[i];
                let c = new NoiseChannel(...a);
                this.noise.push(c);
            }else if(noiseC[i]==='' && a instanceof Array){
                let c = new NoiseChannel(...a);
                this.noise.push(c);
            }
        }
        for(let i=0;i<this.noise.length;i++){
            if(!basin.envData[this.name]) basin.envData[this.name] = {};
            if(!basin.envData[this.name][i]) new NCMetadata(this.name,i,basin.envData.loadData.pop());
        }
    }

    get(x,y,z,noHem){
        try{
            if(!noHem) y = basin.hemY(y);
            if(this.mapFunc){
                let s = this.noise;
                let n = function(num,x1,y1,z1){
                    x1 = x1===undefined ? x : x1;
                    y1 = y1===undefined ? y : y1;
                    z1 = z1===undefined ? z : z1;
                    return s[num].get(x1,y1,z1);
                };
                return this.mapFunc(n,x,y,z);
            }
            if(this.isVectorField){
                this.vec.set(1);
                this.vec.rotate(map(this.noise[0].get(x,y,z),0,1,0,4*TAU));
                return this.vec;
            }
            return this.noise[0].get(x,y,z);
        }catch(err){
            if(!noHem && err===ENVDATA_NOT_FOUND_ERROR) return null;
            throw err;
        }
    }

    wobble(){
        if(!this.noWobble){
            for(let i=0;i<this.noise.length;i++){
                this.noise[i].wobble();
            }
        }
    }

    render(){
        envLayer.noFill();
        let tileSize = ceil(ENV_LAYER_TILE_SIZE*scaler);
        for(let i=0;i<WIDTH;i+=ENV_LAYER_TILE_SIZE){
            for(let j=0;j<HEIGHT;j+=ENV_LAYER_TILE_SIZE){
                let x = i+ENV_LAYER_TILE_SIZE/2;
                let y = j+ENV_LAYER_TILE_SIZE/2;
                if(!this.oceanic || land.tileContainsOcean(x,y)){
                    let v = this.get(x,y,viewTick);
                    if(this.isVectorField){
                        envLayer.push();
                        envLayer.stroke(0);
                        envLayer.scale(scaler);
                        envLayer.translate(x,y);
                        if(v!==null){
                            envLayer.rotate(v.heading());
                            let mg = v.mag();
                            let mp = this.magMap;
                            let l = map(mg,mp[0],mp[1],mp[2],mp[3]);
                            envLayer.line(0,0,l,0);
                            envLayer.noStroke();
                            envLayer.fill(0);
                            envLayer.triangle(l+5,0,l,3,l,-3);
                        }else{
                            envLayer.line(-3,-3,3,3);
                            envLayer.line(-3,3,3,-3);
                        }
                        envLayer.pop();
                    }else{
                        if(v!==null){
                            let h = this.hueMap;
                            if(h instanceof Function) envLayer.fill(h(v));
                            else envLayer.fill(map(v,h[0],h[1],h[2],h[3]),100,100);
                        }else envLayer.fill(0,0,50);
                        envLayer.rect(i*scaler,j*scaler,tileSize,tileSize);
                        if(v===null){
                            envLayer.fill(0,0,60);
                            envLayer.triangle(i*scaler,j*scaler,i*scaler+tileSize,j*scaler,i*scaler,j*scaler+tileSize);
                        }
                    }
                }
                
            }
        }
    }

    record(){
        if(!this.noWobble){
            for(let i=0;i<this.noise.length;i++){
                this.noise[i].record();
            }
        }
    }
}

class Environment{
    constructor(){
        this.fields = {};
        this.fieldList = [];
        this.displaying = -1;
        this.layerIsOceanic = false;
        this.layerIsVector = false;
    }

    addField(name,...fieldArgs){
        this.fields[name] = new EnvField(name,...fieldArgs);
        this.fieldList.push(name);
    }

    wobble(){
        for(let i in this.fields) this.fields[i].wobble();
    }

    record(){
        for(let i in this.fields) this.fields[i].record();
    }

    get(field,x,y,z,noHem){
        return this.fields[field].get(x,y,z,noHem);
    }

    displayLayer(){
        envLayer.clear();
        if(this.displaying>=0) this.fields[this.fieldList[this.displaying]].render();
    }

    displayNext(){
        do this.displaying++;
        while(this.displaying<this.fieldList.length && this.fields[this.fieldList[this.displaying]].invisible);
        if(this.displaying>=this.fieldList.length) this.displaying = -1;
        else{
            this.layerIsOceanic = this.fields[this.fieldList[this.displaying]].oceanic;
            this.layerIsVector = this.fields[this.fieldList[this.displaying]].isVectorField;
        }
        this.displayLayer();
    }
}

Environment.init = function(){
    Env = new Environment();    // Environmental fields that determine storm strength and steering

    Env.addField(
        "jetstream",
        function(n,x,y,z){
            let s = seasonalSine(z);
            let l = map(sqrt(map(s,-1,1,0,1)),0,1,basin.hyper?0.47:0.55,basin.hyper?0.25:0.35);
            let v = n(0,x-z*3,0,z);
            let r = map(s,-1,1,basin.hyper?0.45:0.5,basin.hyper?0.25:0.35);
            v = map(v,0,1,-r,r);
            return (l+v)*HEIGHT;
        },
        {
            invisible: true
        },
        [4,0.5,160,300,1,2]
    );

    Env.addField(
        "LLSteering",
        function(n,x,y,z){
            this.vec.set(1);    // reset vector

            // Jetstream
            let j = Env.get("jetstream",x,y,z,true);
            // Cosine curve from 0 at poleward side of map to 1 at equatorward side
            let h = map(cos(map(y,0,HEIGHT,0,PI)),-1,1,1,0);
            // westerlies
            let west = constrain(pow(1-h+map(n(0),0,1,-0.3,0.3)+map(j,0,HEIGHT,-0.4,0.4),2)*4,0,4);
            // ridging and trades
            let ridging = constrain(n(1)+map(j,0,HEIGHT,0.3,-0.3),0,1);
            let trades = constrain(pow(h+map(ridging,0,1,-0.3,0.3),2)*3,0,3);
            let tAngle = map(h,0.9,1,511*PI/512,17*PI/16); // trades angle
            // noise angle
            let a = map(n(3),0,1,0,4*TAU);
            // noise magnitude
            let m = pow(1.5,map(n(2),0,1,-8,4));

            // apply to vector
            this.vec.rotate(a);
            this.vec.mult(m);
            this.vec.add(west+trades*cos(tAngle),trades*sin(tAngle));
            this.vec.y = basin.hem(this.vec.y); // hemisphere flip
            return this.vec;
        },
        {
            vector:true,
            magMap:[0,3,0,16]
        },
        [4,0.5,80,100,1,3],
        '',
        '',
        [4,0.5,170,300,1,3]
    );

    Env.addField(
        "ULSteering",
        function(n,x,y,z){
            this.vec.set(1);                                                                // reset vector

            const dx = 10;                                                                  // delta for derivative

            let m = n(1);

            let s = seasonalSine(z);
            let j0 = Env.get("jetstream",x,y,z,true);                                       // y-position of jetstream
            let j1 = Env.get("jetstream",x+dx,y,z,true);                                    // y-position of jetstream dx to the east for derivative
            let j = abs(y-j0);                                                              // distance of point north/south of jetstream
            let jet = pow(2,3-j/40);                                                        // power of jetstream at point
            let jOP = pow(0.7,jet);                                                         // factor for how strong other variables should be if 'overpowered' by jetstream
            let jAngle = atan((j1-j0)/dx)+map(y-j0,-50,50,PI/4,-PI/4,true);                 // angle of jetstream at point
            let trof = y>j0 ? pow(1.7,map(jAngle,-PI/2,PI/2,3,-5))*pow(0.7,j/20)*jOP : 0;   // pole-eastward push from jetstream dips
            let tAngle = -PI/16;                                                            // angle of push from jetstream dips
            let ridging = 0.45-j0/HEIGHT-map(sqrt(map(s,-1,1,0,1)),0,1,0.15,0);             // how much 'ridge' or 'trough' there is from jetstream
            // power of winds equatorward of jetstream
            let hadley = (map(ridging,-0.3,0.2,basin.hyper?3:5,1.5,true)+map(m,0,1,-1.5,1.5))*jOP*(y>j0?1:0);
            let hAngle = map(ridging,-0.3,0.2,-PI/16,-15*PI/16,true);                       // angle of winds equatorward of jetstream
            let ferrel = 2*jOP*(y<j0?1:0);                                                  // power of winds poleward of jetstream
            let fAngle = 5*PI/8;                                                            // angle of winds poleward of jetstream

            let a = map(n(0),0,1,0,4*TAU);                                                  // noise angle
            m = pow(1.5,map(m,0,1,-8,4))*jOP;                                               // noise magnitude

            // apply noise
            this.vec.rotate(a);
            this.vec.mult(m);

            // apply UL winds
            this.vec.add(jet*cos(jAngle),jet*sin(jAngle));                                  // apply jetstream
            this.vec.add(trof*cos(tAngle),trof*sin(tAngle));                                // apply trough push
            this.vec.add(hadley*cos(hAngle),hadley*sin(hAngle));                            // apply winds equatorward of jetstream
            this.vec.add(ferrel*cos(fAngle),ferrel*sin(fAngle));                            // apply winds poleward of jetstream

            this.vec.y = basin.hem(this.vec.y);                                                   // hemisphere flip
            return this.vec;
        },
        {
            vector: true,
            magMap: [0,8,0,25]
        },
        [4,0.5,180,300,1,2],
        [4,0.5,90,100,1,3]
    );

    Env.addField(
        "shear",
        function(n,x,y,z){
            let l = Env.get("LLSteering",x,y,z,true);
            let u = Env.get("ULSteering",x,y,z,true);
            this.vec.set(u);
            this.vec.sub(l);
            return this.vec;
        },
        {
            vector: true,
            magMap: [0,8,0,25]
        }
    );

    Env.addField(
        "SSTAnomaly",
        function(n,x,y){
            let v = n(0);
            v = v*2;
            let i = v<1 ? -1 : 1;
            v = 1-abs(1-v);
            if(v===0) v = 0.000001;
            v = log(v);
            let r = map(y,0,HEIGHT,6,3);
            v = -r*v;
            v = v*i;
            return v;
        },
        {
            hueMap: function(v){
                colorMode(HSB);
                let cold = color(240,100,70);
                let hot = color(0,100,70);
                let cNeutral = color(240,1,90);
                let hNeutral = color(0,1,90);
                let c;
                if(v<0) c = lerpColor(cold,cNeutral,map(v,-5,0,0,1));
                else c = lerpColor(hNeutral,hot,map(v,0,5,0,1));
                colorMode(RGB);
                return c;
            },
            oceanic: true
        },
        [6,0.5,150,3000,0.05,1.5]
    );

    Env.addField(
        "SST",
        function(n,x,y,z){
            if(y<0) return 0;
            let anom = Env.get("SSTAnomaly",x,y,z,true);
            let s = seasonalSine(z);
            let w = map(cos(map(x,0,WIDTH,0,PI)),-1,1,0,1);
            let h0 = y/HEIGHT;
            let h1 = (sqrt(h0)+h0)/2;
            let h2 = sqrt(sqrt(h0));
            let h = map(cos(lerp(PI,0,lerp(h1,h2,sq(w)))),-1,1,0,1);
            let ospt = basin.hyper ? HYPER_OFF_SEASON_POLAR_TEMP : OFF_SEASON_POLAR_TEMP;
            let pspt = basin.hyper ? HYPER_PEAK_SEASON_POLAR_TEMP : PEAK_SEASON_POLAR_TEMP;
            let ostt = basin.hyper ? HYPER_OFF_SEASON_TROPICS_TEMP : OFF_SEASON_TROPICS_TEMP;
            let pstt = basin.hyper ? HYPER_PEAK_SEASON_TROPICS_TEMP : PEAK_SEASON_TROPICS_TEMP;
            let t = lerp(map(s,-1,1,ospt,pspt),map(s,-1,1,ostt,pstt),h);
            return t+anom;
        },
        {
            hueMap: function(v){
                colorMode(HSB);
                let c;
                if(v<26) c = lerpColor(color(300,100,80),color(120,100,80),map(v,5,26,0,1));
                else if(v<29) c = lerpColor(color(60,100,100),color(0,100,70),map(v,26,29,0,1));
                else c = lerpColor(color(0,100,70),color(0,5,100),map(v,29,34,0,1));
                colorMode(RGB);
                return c;
            },
            oceanic: true
        }
    );

    Env.addField(
        "moisture",
        function(n,x,y,z){
            let v = n(0);
            let s = seasonalSine(z);
            let l = land.get(x,basin.hemY(y));
            let pm = basin.hyper ? 0.52 : 0.43;
            let tm = basin.hyper ? 0.62 : 0.57;
            let mm = basin.hyper ? 0.3 : 0.2;
            let m = map(l,0.5,0.7,map(y,0,HEIGHT,pm,tm),mm,true);
            m += map(s,-1,1,-0.08,0.08);
            m += map(v,0,1,-0.3,0.3);
            m = constrain(m,0,1);
            return m;
        },
        {
            hueMap: function(v){
                colorMode(HSB);
                let c;
                if(v<0.5) c = lerpColor(color(45,100,30),color(45,1,90),map(v,0,0.5,0,1));
                else c = lerpColor(color(180,1,90),color(180,100,30),map(v,0.5,1,0,1));
                colorMode(RGB);
                return c;
            }
        },
        [4,0.5,120,120,0.3,2]
    );

    for(let i in basin.envData){
        for(let j in basin.envData[i]){
            basin.envData[i][j].init();
        }
    }
};

class Land{
    constructor(){
        this.noise = new NoiseChannel(9,0.5,100);
        this.map = [];
        this.oceanTile = [];
        this.drawn = false;
        this.shaderDrawn = false;
    }

    get(x,y){
        x = floor(x);
        y = floor(y);
        if(this.map[x] && this.map[x][y]){
            let v = this.map[x][y];
            return v > 0.5 ? v : 0;
        }else return 0;
    }

    *init(){
        yield "Calculating land...";
        for(let i=0;i<WIDTH;i++){
            this.map[i] = [];
            for(let j=0;j<HEIGHT;j++){
                let n = this.noise.get(i,j);
                let mapTypeControls = MAP_TYPES[basin.mapType];
                let landBiasFactors = mapTypeControls.landBiasFactors;
                let landBias;
                if(mapTypeControls.form == "linear"){
                    let landBiasAnchor = WIDTH * landBiasFactors[0];
                    landBias = i < landBiasAnchor ?
                        map(i,0,landBiasAnchor,landBiasFactors[1],landBiasFactors[2]) :
                        map(i-landBiasAnchor,0,WIDTH-landBiasAnchor,landBiasFactors[2],landBiasFactors[3]);
                }else if(mapTypeControls.form == "radial"){
                    let EWAnchor = WIDTH * landBiasFactors[0];
                    let NSAnchor = HEIGHT * landBiasFactors[1];
                    let pointDist = sqrt(sq(i-EWAnchor)+sq(j-NSAnchor));
                    let distAnchor1 = landBiasFactors[2] * sqrt(WIDTH*HEIGHT);
                    let distAnchor2 = landBiasFactors[3] * sqrt(WIDTH*HEIGHT);
                    landBias = pointDist < distAnchor1 ?
                        map(pointDist,0,distAnchor1,landBiasFactors[4],landBiasFactors[5]) : pointDist < distAnchor2 ?
                        map(pointDist,distAnchor1,distAnchor2,landBiasFactors[5],landBiasFactors[6]) :
                        landBiasFactors[6];
                }
                this.map[i][j] = n + landBias;
                let ox = floor(i/ENV_LAYER_TILE_SIZE);
                let oy = floor(j/ENV_LAYER_TILE_SIZE);
                if(!this.oceanTile[ox]) this.oceanTile[ox] = [];
                if(this.map[i][j]<=0.5) this.oceanTile[ox][oy] = true;
            }
        }
        yield* this.draw();
    }

    *draw(){
        yield "Rendering land...";
        let lget = (x,y)=>this.get(x/scaler,y/scaler);
        for(let i=0;i<width;i++){
            for(let j=0;j<height;j++){
                let landVal = lget(i,j);
                if(landVal){
                    for(let k=0;k<COLORS.land.length;k++){
                        if(landVal > COLORS.land[k][0]){
                            landBuffer.fill(COLORS.land[k][1]);
                            landBuffer.rect(i,j,1,1);
                            break;
                        }
                    }
                    let touchingOcean = false;
                    if(i>0 && !lget(i-1,j)) touchingOcean = true;
                    if(j>0 && !lget(i,j-1)) touchingOcean = true;
                    if(i<WIDTH-1 && !lget(i+1,j)) touchingOcean = true;
                    if(j<HEIGHT-1 && !lget(i,j+1)) touchingOcean = true;
                    if(touchingOcean) coastLine.rect(i,j,1,1);
                }
            }
        }
        if(simSettings.snowLayers){
            yield* this.drawSnow();
        }
        if(simSettings.useShader){
            yield* this.drawShader();
        }
        this.drawn = true;
    }

    *drawSnow(){
        yield "Rendering " + (random()<0.02 ? "sneaux" : "snow") + "...";
        let lget = (x,y)=>this.get(x/scaler,y/scaler);
        let snowLayers = simSettings.snowLayers * 10;
        for(let i=0;i<width;i++){
            for(let j=0;j<height;j++){
                let landVal = lget(i,j);
                if(landVal){
                    let l = 1-basin.hemY(j)/HEIGHT;
                    let h = 0.95-landVal;
                    let p = l>0 ? ceil(map(h/l,0.15,0.45,0,snowLayers)) : h<0 ? 0 : snowLayers;
                    for(let k=max(p,0);k<snowLayers;k++) snow[k].rect(i,j,1,1);
                }
            }
        }
        this.snowDrawn = true;
    }

    *drawShader(){
        yield "Rendering shader...";
        let lget = (x,y)=>this.get(x/scaler,y/scaler);
        for(let i=0;i<width;i++){
            for(let j=0;j<height;j++){
                let v = lget(i,j);
                if(v===0) v = 0.5;
                let m = 0;
                for(let k=1;k<6;k++){
                    let s = lget(i-k,j-k)-v-k*0.0008;
                    s = constrain(map(s,0,0.14,0,191),0,191);
                    if(s>m) m = s;
                }
                if(m>0){
                    landShader.fill(0,m);
                    landShader.rect(i,j,1,1);
                }
            }
        }
        this.shaderDrawn = true;
    }

    tileContainsOcean(x,y){
        x = floor(x/ENV_LAYER_TILE_SIZE);
        y = floor(y/ENV_LAYER_TILE_SIZE);
        return this.oceanTile[x][y];
    }

    clearSnow(){
        for(let i=0;i<MAX_SNOW_LAYERS;i++) snow[i].clear();
        this.snowDrawn = false;
    }

    clear(){
        landBuffer.clear();
        coastLine.clear();
        landShader.clear();
        this.clearSnow();
        this.drawn = false;
        this.shaderDrawn = false;
    }
}

function seasonalSine(t,off){
    off = off===undefined ? 5/12 : off;
    return sin((TAU*(t-YEAR_LENGTH*off))/YEAR_LENGTH);
}