class NoiseChannel{
    constructor(octaves,falloff,zoom,zZoom,xOff,yOff,zOff){
        this.octaves = octaves || 4;
        this.falloff = falloff || 0.5;
        this.zoom = zoom || 100;
        this.zZoom = zZoom || this.zoom;
        this.xOff = xOff || 0;
        this.yOff = yOff || 0;
        this.zOff = zOff || 0;
    }

    get(x,y,z,xo,yo,zo){
        x = x || 0;
        y = y || 0;
        z = z || 0;
        xo = xo!==undefined ? xo : this.xOff;
        yo = yo!==undefined ? yo : this.yOff;
        zo = zo!==undefined ? zo : this.zOff;
        noiseDetail(this.octaves,this.falloff);
        return noise(x/this.zoom+xo,y/this.zoom+yo,z/this.zZoom+zo);
    }
}

class EnvNoiseChannel extends NoiseChannel{
    constructor(basin,field,index,loadData,octaves,falloff,zoom,zZoom,wMax,zWMax,wRFac){
        let r = NC_OFFSET_RANDOM_FACTOR;
        super(octaves,falloff,zoom,zZoom,random(r),random(r),random(r));
        this.wobbleMax = wMax || 1;
        this.zWobbleMax = zWMax || this.wobbleMax;
        this.wobbleRotFactor = wRFac || PI/16;
        this.wobbleVector = p5.Vector.random2D();

        this.basin = basin instanceof Basin && basin;
        this.field = field;
        this.index = index;
        if(loadData instanceof LoadData) this.load(loadData);
    }

    get(x,y,z){
        let o = this.fetchOffsets(z);
        if(!o) throw ENVDATA_NOT_FOUND_ERROR;
        let {xo, yo, zo} = o;
        return super.get(x,y,z,xo,yo,zo);
    }

    fetchOffsets(t){
        let basin = this.basin;
        if(t>=basin.tick) return {
            xo: this.xOff,
            yo: this.yOff,
            zo: this.zOff
        };
        else{
            t = floor(t/ADVISORY_TICKS)*ADVISORY_TICKS;
            let s = basin.getSeason(t);
            t = (t-basin.seasonTick(s))/ADVISORY_TICKS;
            let d = basin.fetchSeason(s);
            if(d && d.envData && d.envData[this.field] && d.envData[this.field][this.index]){
                t -= d.envRecordStarts;
                let o = d.envData[this.field][this.index][t];
                return {
                    xo: o.x,
                    yo: o.y,
                    zo: o.z
                };
            }
        }
    }

    wobble(){
        let v = this.wobbleVector;
        v.setMag(random(0.0001,this.wobbleMax));
        this.xOff += v.x/this.zoom;
        this.yOff += v.y/this.zoom;
        this.zOff += random(-this.zWobbleMax,this.zWobbleMax)/this.zZoom;
        v.rotate(random(-this.wobbleRotFactor,this.wobbleRotFactor));
    }

    record(){
        let basin = this.basin;
        let seas = basin.fetchSeason(-1,true,true);
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
        if(startingRecord) seas.envRecordStarts = floor(basin.tick/ADVISORY_TICKS)-basin.seasonTick()/ADVISORY_TICKS;
        s.push({
            x: this.xOff,
            y: this.yOff,
            z: this.zOff
        });
        seas.modified = true;
    }

    save(){
        let obj = {};
        let w = obj.wobbleVector = {};
        w.x = this.wobbleVector.x;
        w.y = this.wobbleVector.y;
        for(let p of ['xOff','yOff','zOff']) obj[p] = this[p];
        return obj;
    }

    load(data){
        if(data instanceof LoadData){
            let wx;
            let wy;
            if(data.format>=FORMAT_WITH_INDEXEDDB){
                let obj = data.value;
                for(let p of ['xOff','yOff','zOff']) if(obj[p]) this[p] = obj[p];
                wx = obj.wobbleVector && obj.wobbleVector.x;
                wy = obj.wobbleVector && obj.wobbleVector.y;
            }else{
                let str = data.value;
                let arr = decodeB36StringArray(str);
                this.xOff = arr.pop() || this.xOff;
                this.yOff = arr.pop() || this.yOff;
                this.zOff = arr.pop() || this.zOff;
                wx = arr.pop();
                wy = arr.pop();
            }
            if(wx!==undefined && wy!==undefined) this.wobbleVector = createVector(wx,wy);
        }
    }
}

class EnvField{
    constructor(basin,name,loadData,attribs){
        this.basin = basin instanceof Basin && basin;
        this.name = name;
        this.noise = [];
        this.accurateAfter = -1;
        this.version = attribs.version;
        if(loadData instanceof LoadData){
            if(loadData.value.version!==this.version) this.accurateAfter = this.basin.tick;
            else this.accurateAfter = loadData.value.accurateAfter;
        }
        this.isVectorField = attribs.vector;
        this.noVectorFlip = attribs.noVectorFlip;   // do not reflect the output vector over the y-axis in the southern hemisphere if this is true
        this.noWobble = attribs.noWobble;
        this.hueMap = attribs.hueMap || [0,1,0,300];
        this.magMap = attribs.magMap || [0,1,0,10];
        this.invisible = attribs.invisible;
        this.oceanic = attribs.oceanic;
        this.modifiers = attribs.modifiers;
        if(this.isVectorField) this.vec = createVector();
        if(attribs.mapFunc instanceof Function) this.mapFunc = attribs.mapFunc;
        let a = null;
        if(attribs.noiseChannels instanceof Array){
            let noiseC = attribs.noiseChannels;
            for(let i=0;i<noiseC.length;i++){
                if(noiseC[i] instanceof Array || (noiseC[i]==='' && a instanceof Array)){
                    let d;
                    if(loadData instanceof LoadData){
                        d = loadData.value.noiseData[i];
                        d = loadData.sub(d);
                    }
                    if(noiseC[i] instanceof Array) a = noiseC[i];
                    let c = new EnvNoiseChannel(this.basin,this.name,i,d,...a);
                    this.noise.push(c);
                }
            }
        }
    }

    get(x,y,z,noHem){
        try{
            if(!noHem) y = this.basin.hemY(y);
            if(this.mapFunc){
                let u = {}; // utility argument
                u.noise = (num,x1,y1,z1)=>{     // get noise channel value (coordinates optional as they default to the main "get" coordinates)
                    if(x1===undefined) x1 = x;
                    if(y1===undefined) y1 = y;
                    if(z1===undefined) z1 = z;
                    return this.noise[num].get(x1,y1,z1);
                };
                u.basin = this.basin;
                u.field = (name,x1,y1,z1)=>{    // get value of another env field (coordinates optional)
                    if(x1===undefined) x1 = x;
                    if(y1===undefined) y1 = y;
                    if(z1===undefined) z1 = z;
                    if(this.basin.env.fields[name].accurateAfter>this.accurateAfter) this.accurateAfter = this.basin.env.fields[name].accurateAfter;
                    return this.basin.env.get(name,x1,y1,z1,true);
                };
                u.yearfrac = z=>(z%YEAR_LENGTH)/YEAR_LENGTH;    // fraction of the way through the year for a tick (SHem year begins July 1 so this value is climatologically the same for both hemispheres)
                u.piecewise = (s,arr)=>{
                    // constructs and evaluates an interpolation function defined piecewise with linear segments
                    // s is a year fraction in the range 0 to 1 (the argument to the interpolation function)
                    // arr is an array of "points" expressed as length-2 arrays
                    // first value of each "point" ("x") represents a number of months through the year (range 0 to 12)
                    // second value of each "point" ("y") represents the value to interpolate from
                    let m = s*12;
                    let x = [arr[arr.length-1][0]-12,arr[arr.length-1][1]];
                    for(let q of arr){
                        if(m<q[0]) return map(m,x[0],q[0],x[1],q[1]);
                        x = q;
                    }
                    return map(m,x[0],arr[0][0]+12,x[1],arr[0][1]);
                };
                u.vec = this.vec;
                u.modifiers = this.modifiers || {};
                let res = this.mapFunc(u,x,y,z);
                if(this.isVectorField && !this.noVectorFlip) res.y = this.basin.hem(res.y);
                return res;
            }
            if(this.isVectorField){
                this.vec.set(1);
                this.vec.rotate(map(this.noise[0].get(x,y,z),0,1,0,4*TAU));
                if(!this.noVectorFlip) this.vec.y = this.basin.hem(this.vec.y);
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
        if(simSettings.showMagGlass) this.renderMagGlass();
    }

    renderMagGlass(){
        let centerX = getMouseX();
        let centerY = getMouseY();
        magnifyingGlass.noFill();
        let vCenter = this.get(centerX,centerY,viewTick);
        if(this.isVectorField){
            if(coordinateInCanvas(centerX,centerY) && (!this.oceanic || (land.tileContainsOcean(centerX,centerY) && !land.get(centerX,centerY)))){
                let v = vCenter;
                magnifyingGlass.push();
                magnifyingGlass.stroke(0);
                magnifyingGlass.scale(scaler);
                let magMeta = buffers.get(magnifyingGlass);
                magnifyingGlass.translate(magMeta.baseWidth/2,magMeta.baseHeight/2);
                if(v!==null){
                    magnifyingGlass.rotate(v.heading());
                    let mg = v.mag();
                    let mp = this.magMap;
                    let l = map(mg,mp[0],mp[1],mp[2],mp[3]);
                    magnifyingGlass.line(0,0,l,0);
                    magnifyingGlass.noStroke();
                    magnifyingGlass.fill(0);
                    magnifyingGlass.triangle(l+5,0,l,3,l,-3);
                }else{
                    magnifyingGlass.line(-3,-3,3,3);
                    magnifyingGlass.line(-3,3,3,-3);
                }
                magnifyingGlass.pop();
            }
        }else{
            if(vCenter!==null){
                for(let i=floor(magnifyingGlass.width/4);i<3*magnifyingGlass.width/4;i++){
                    for(let j=floor(magnifyingGlass.height/4);j<3*magnifyingGlass.height/4;j++){
                        let i1 = i-magnifyingGlass.width/2;
                        let j1 = j-magnifyingGlass.height/2;
                        if(sqrt(sq(i1)+sq(j1))<magnifyingGlass.width/4){
                            let x = centerX+i1/scaler;
                            let y = centerY+j1/scaler;
                            if(coordinateInCanvas(x,y) && (!this.oceanic || (land.tileContainsOcean(x,y) && !land.get(x,y)))){
                                let v = this.get(x,y,viewTick);
                                if(v!==null){
                                    let h = this.hueMap;
                                    if(h instanceof Function) magnifyingGlass.fill(h(v));
                                    else magnifyingGlass.fill(map(v,h[0],h[1],h[2],h[3]),100,100);
                                }else magnifyingGlass.fill(0,0,50);
                                magnifyingGlass.rect(i,j,1,1);
                            }
                        }
                    }
                }
            }else{
                magnifyingGlass.fill(0,0,50);
                magnifyingGlass.ellipse(magnifyingGlass.width/2,magnifyingGlass.height/2,magnifyingGlass.width,magnifyingGlass.height);
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

class Environment{  // Environmental fields that determine storm strength and steering
    constructor(basin){
        this.basin = basin instanceof Basin && basin;
        this.fields = {};
        this.fieldList = [];
        this.displaying = -1;
        this.layerIsOceanic = false;
        this.layerIsVector = false;
    }

    addField(name,...fieldArgs){
        this.fields[name] = new EnvField(this.basin,name,...fieldArgs);
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
        magnifyingGlass.clear();
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

    updateMagGlass(){
        magnifyingGlass.clear();
        if(simSettings.showMagGlass && this.displaying>=0) this.fields[this.fieldList[this.displaying]].renderMagGlass();
    }

    init(data){
        if(data instanceof LoadData && data.format<FORMAT_WITH_IMPROVED_ENV){   // Hardcoded conversion of data structure to Format 3 (doesn't affect values, thus old format number should cascade)
            let newData = {};
            let v = data.value;
            let o = (...d)=>{return {
                version: 0,
                accurateAfter: -1,
                noiseData: d
            };};
            newData.jetstream = o(v[8]);
            newData.LLSteering = o(v[7],v[6],v[5],v[4]);
            newData.ULSteering = o(v[3],v[2]);
            newData.shear = o();
            newData.SSTAnomaly = o(v[1]);
            newData.SST = o();
            newData.moisture = o(v[0]);
            data = data.sub(newData);
        }

        for(let f in ENV_DEFS[this.basin.actMode]){ // add all fields specified for the basin's simulation mode
            let attribs = {};
            attribs.modifiers = {};
            if(ENV_DEFS.defaults[f]){
                // field attributes shared among simulation modes
                let defs = ENV_DEFS.defaults[f];
                for(let a in defs){
                    if(a==='modifiers'){
                        for(let m in defs.modifiers) attribs.modifiers[m] = defs.modifiers[m];
                    }else attribs[a] = defs[a];
                }
            }
            // field attributes unique to this basin's simulation mode
            let defs = ENV_DEFS[this.basin.actMode][f];
            for(let a in defs){
                if(a==='modifiers'){
                    for(let m in defs.modifiers) attribs.modifiers[m] = defs.modifiers[m];
                }else attribs[a] = defs[a];
            }
            let d = data instanceof LoadData && data.sub(data.value[f]);
            this.addField(f,d,attribs);
        }
    }
}

class Land{
    constructor(basin){
        this.basin = basin instanceof Basin && basin;
        this.noise = new NoiseChannel(9,0.5,100);
        this.map = [];
        this.oceanTile = [];
        this.mapDefinition = undefined;
        this.drawn = false;
        this.shaderDrawn = false;
        this.calculate();
    }

    get(x,y){
        let d = this.mapDefinition;
        x = floor(x*d);
        y = floor(y*d);
        if(this.map[x] && this.map[x][y]){
            let v = this.map[x][y].val;
            return v > 0.5 ? v : 0;
        }else return 0;
    }

    getSubBasin(x,y){
        let d = this.mapDefinition;
        x = floor(x*d);
        y = floor(y*d);
        if(this.map[x] && this.map[x][y]){
            return this.map[x][y].subBasin;
        }else return 0;
    }

    inBasin(x,y){
        let r = this.getSubBasin(x,y);
        return this.basin.subInBasin(r);
    }

    calculate(){
        let mapTypeControls = MAP_TYPES[this.basin.mapType];
        let W;
        let H;
        if(mapTypeControls.form==='pixelmap'){
            W = this.basin.mapImg.width;
            H = this.basin.mapImg.height;
            this.mapDefinition = W/WIDTH;
        }else{
            W = WIDTH*MAP_DEFINITION;
            H = HEIGHT*MAP_DEFINITION;
            this.mapDefinition = MAP_DEFINITION;
        }
        for(let i=0;i<W;i++){
            this.map[i] = [];
            for(let j=0;j<H;j++){
                let p = this.map[i][j] = {};
                let x = i/this.mapDefinition;
                let y = j/this.mapDefinition;
                if(mapTypeControls.form==='pixelmap'){
                    let img = this.basin.mapImg;
                    let index = 4 * (j*W+i);
                    let v = img.pixels[index];
                    p.val = map(v,0,255,0,1);
                    p.subBasin = img.pixels[index+1];
                }else{
                    let n = this.noise.get(x,y);
                    let landBiasFactors = mapTypeControls.landBiasFactors;
                    let landBias;
                    if(mapTypeControls.form == "linear"){
                        let landBiasAnchor = WIDTH * landBiasFactors[0];
                        landBias = x < landBiasAnchor ?
                            map(x,0,landBiasAnchor,landBiasFactors[1],landBiasFactors[2]) :
                            map(x-landBiasAnchor,0,WIDTH-landBiasAnchor,landBiasFactors[2],landBiasFactors[3]);
                    }else if(mapTypeControls.form == "radial"){
                        let EWAnchor = WIDTH * landBiasFactors[0];
                        let NSAnchor = HEIGHT * landBiasFactors[1];
                        let pointDist = sqrt(sq(x-EWAnchor)+sq(y-NSAnchor));
                        let distAnchor1 = landBiasFactors[2] * sqrt(WIDTH*HEIGHT);
                        let distAnchor2 = landBiasFactors[3] * sqrt(WIDTH*HEIGHT);
                        landBias = pointDist < distAnchor1 ?
                            map(pointDist,0,distAnchor1,landBiasFactors[4],landBiasFactors[5]) : pointDist < distAnchor2 ?
                            map(pointDist,distAnchor1,distAnchor2,landBiasFactors[5],landBiasFactors[6]) :
                            landBiasFactors[6];
                    }
                    p.val = n + landBias;
                    p.subBasin = 0;
                }
                let ox = floor(x/ENV_LAYER_TILE_SIZE);
                let oy = floor(y/ENV_LAYER_TILE_SIZE);
                if(!this.oceanTile[ox]) this.oceanTile[ox] = [];
                if(p.val<=0.5) this.oceanTile[ox][oy] = true;
            }
        }
    }

    *draw(){
        yield "Rendering land...";
        let W = deviceOrientation===PORTRAIT ? displayHeight : displayWidth;
        let H = W*HEIGHT/WIDTH;
        let scl = W/WIDTH;
        let lget = (x,y)=>this.get(x/scl,y/scl);
        let bget = (x,y)=>this.inBasin(x/scl,y/scl);
        for(let i=0;i<W;i++){
            for(let j=0;j<H;j++){
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
                    if(i<width-1 && !lget(i+1,j)) touchingOcean = true;
                    if(j<height-1 && !lget(i,j+1)) touchingOcean = true;
                    if(touchingOcean) coastLine.rect(i,j,1,1);
                }else if(!bget(i,j)){
                    outBasinBuffer.rect(i,j,1,1);
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
        let W = deviceOrientation===PORTRAIT ? displayHeight : displayWidth;
        let H = W*HEIGHT/WIDTH;
        let scl = W/WIDTH;
        let lget = (x,y)=>this.get(x/scl,y/scl);
        let snowLayers = simSettings.snowLayers * 10;
        for(let i=0;i<W;i++){
            for(let j=0;j<H;j++){
                let landVal = lget(i,j);
                if(landVal){
                    let l = 1-this.basin.hemY(j)/height;
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
        let W = deviceOrientation===PORTRAIT ? displayHeight : displayWidth;
        let H = W*HEIGHT/WIDTH;
        let scl = W/WIDTH;
        let lget = (x,y)=>this.get(x/scl,y/scl);
        for(let i=0;i<W;i++){
            for(let j=0;j<H;j++){
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
        outBasinBuffer.clear();
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