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
                t -= d.envData[this.field][this.index].recordStart;
                if(t >= 0){
                    let o = d.envData[this.field][this.index].val[t];
                    return {
                        xo: o.x,
                        yo: o.y,
                        zo: o.z
                    };
                }
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
        // let startingRecord;
        if(!s.envData){
            s.envData = {};
            // startingRecord = true;
        }
        s = s.envData;
        if(!s[this.field]){
            s[this.field] = {};
            // startingRecord = true;
        }
        s = s[this.field];
        if(!s[this.index]){
            s[this.index] = {
                val: [],
                recordStart: floor(basin.tick/ADVISORY_TICKS)-basin.seasonTick()/ADVISORY_TICKS
            };
            // startingRecord = true;
        }
        s = s[this.index].val;
        // if(startingRecord) seas.envRecordStarts = floor(basin.tick/ADVISORY_TICKS)-basin.seasonTick()/ADVISORY_TICKS;
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
        if(attribs.displayName)
            this.displayName = attribs.displayName;
        else
            this.displayName = name;
        this.noise = [];
        this.accurateAfter = -1;
        this.version = attribs.version;
        if(loadData instanceof LoadData && loadData.value){
            if(loadData.value.version!==this.version) this.accurateAfter = this.basin.tick;
            else this.accurateAfter = loadData.value.accurateAfter;
        }
        this.isVectorField = attribs.vector;
        this.noVectorFlip = attribs.noVectorFlip;   // do not reflect the output vector over the y-axis in the southern hemisphere if this is true
        this.noWobble = attribs.noWobble;
        if(attribs.hueMap)
            this.hueMap = attribs.hueMap;
        else if(!this.isVectorField)
            this.hueMap = [0,1,0,300];
        else
            this.hueMap = null;
        this.magMap = attribs.magMap || [0,1,0,10];
        if(attribs.displayFormat instanceof Function)
            this.displayFormat = attribs.displayFormat;
        else if(this.isVectorField)
            this.displayFormat = v=>{
                let m = v.mag();
                let h = v.heading();
                return "(a: " + (round(h*1000)/1000) + ", m: " + (round(m*1000)/1000) + ")";
            };
        else
            this.displayFormat = v=>''+round(v*1000)/1000;
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
                    if(loadData instanceof LoadData && loadData.value && loadData.value.noiseData && loadData.value.noiseData[i]){
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
            let longlat = Coordinate.convertFromXY(this.basin.mapType, x, y);
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
                u.coord = longlat;
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
                        envLayer.scale(scaler);
                        envLayer.translate(x,y);
                        if(v!==null){
                            envLayer.rotate(v.heading());
                            let mg = v.mag();
                            let mp = this.magMap;
                            let l = map(mg,mp[0],mp[1],mp[2],mp[3]);
                            let h = this.hueMap;
                            let c;
                            if(h instanceof Function)
                                c = h(mg);
                            else if(h instanceof Array)
                                c = color(map(mg,h[0],h[1],h[2],h[3]),100,100);
                            else
                                c = 'black';
                            envLayer.stroke(c);
                            envLayer.line(0,0,l,0);
                            envLayer.noStroke();
                            envLayer.fill(c);
                            envLayer.triangle(l+5,0,l,3,l,-3);
                        }else{
                            envLayer.stroke(0);
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
            if(coordinateInCanvas(centerX,centerY) && (!this.oceanic || (land.tileContainsOcean(centerX,centerY) && !land.get(Coordinate.convertFromXY(this.basin.mapType,centerX,centerY))))){
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
                            if(coordinateInCanvas(x,y) && (!this.oceanic || (land.tileContainsOcean(x,y) && !land.get(Coordinate.convertFromXY(this.basin.mapType,x,y))))){
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
        if(!this.fields[field]){
            console.error('Field "' + field + '" does not exist in simulation mode ' + this.basin.actMode);
            return 0;
        }
        return this.fields[field].get(x,y,z,noHem);
    }

    getDisplayName(field){
        if(!this.fields[field]){
            console.error('Field "' + field + '" does not exist in simulation mode ' + this.basin.actMode);
            return 0;
        }
        return this.fields[field].displayName;
    }

    formatFieldValue(field,val){
        if(!this.fields[field]){
            console.error('Field "' + field + '" does not exist in simulation mode ' + this.basin.actMode);
            return 0;
        }
        return this.fields[field].displayFormat(val);
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
    constructor(basin, mapImg){
        this.basin = basin instanceof Basin && basin;
        let mapTypeDef = MAP_TYPES[this.basin.mapType];
        this.earth = mapTypeDef.form === 'earth';
        const {fullW: W, fullH: H} = fullDimensions();
        this.map = createImage(W, H);
        if(this.earth){
            this.westBound = mapTypeDef.west;
            this.eastBound = mapTypeDef.east;
            this.northBound = mapTypeDef.north;
            this.southBound = mapTypeDef.south;
            this.wholeEarthMap = mapImg;
        }else if(mapImg){
            this.map.copy(mapImg, 0, 0, mapImg.width, mapImg.height, 0, 0, W, H);
        }
        this.noise = new NoiseChannel(9,0.5,100);
        this.oceanTile = [];
        this.mapDefinition = undefined;
        this.drawn = false;
        this.snowDrawn = false;
        this.shaderDrawn = false;
        this.calculate();
    }

    get(long, lat){
        if(long instanceof Coordinate)
            ({longitude: long, latitude: lat} = long);
        if(this.earth){
            let img = this.wholeEarthMap;
            long = (long + 180) % 360 - 180;
            let x1 = floor(map(long,-180,180,0,img.width));
            let y1 = floor(map(lat,90,-90,0,img.height-1));
            let index = 4 * (y1*img.width*sq(img._pixelDensity)+x1*img._pixelDensity);
            let hVal = img.pixels[index];
            let lVal = img.pixels[index+1];
            if(!lVal)
                return 0;
            else
                return map(sqrt(map(hVal,12,150,0,1,true)),0,1,0.501,1);
        }else{
            let img = this.map;
            let d = this.mapDefinition;
            let {x, y} = Coordinate.convertToXY(this.basin.mapType, long, lat);
            x = floor(x*d);
            y = floor(y*d);
            if(img && x >= 0 && x < img.width && y >= 0 && y < img.height){
                let d0 = img._pixelDensity;
                let index = 4 * (y * img.width * d0 * d0 + x * d0);
                let hVal = img.pixels[index];
                let lVal = img.pixels[index + 1];
                if(!lVal)
                    return 0;
                else
                    return hVal / 255;
            }else return 0;
        }
    }

    getSubBasin(long, lat){
        if(long instanceof Coordinate)
            ({longitude: long, latitude: lat} = long);
        if(this.earth){
            let img = this.wholeEarthMap;
            long = (long + 180) % 360 - 180;
            let x1 = floor(map(long,-180,180,0,img.width));
            let y1 = floor(map(lat,90,-90,0,img.height-1));
            let index = 4 * (y1*img.width*sq(img._pixelDensity)+x1*img._pixelDensity);
            return img.pixels[index+2];
        }else{
            let img = this.map;
            let d = this.mapDefinition;
            let {x, y} = Coordinate.convertToXY(this.basin.mapType, long, lat);
            x = floor(x*d);
            y = floor(y*d);
            if(img && x >= 0 && x < img.width && y >= 0 && y < img.height){
                let d0 = img._pixelDensity;
                let index = 4 * (y * img.width * d0 * d0 + x * d0);
                return img.pixels[index + 2];
            }else return 0;
        }
    }

    inBasin(long, lat){
        let r = this.getSubBasin(long, lat);
        return this.basin.subInBasin(r);
    }

    calculate(){
        const {fullW: W, fullH: H} = fullDimensions();
        let mapTypeControls = MAP_TYPES[this.basin.mapType];
        let mapForm = mapTypeControls.form;
        if(this.earth){                     // crop whole earth map to the map type's sector, used for drawing (but not getting)
            let earth = this.wholeEarthMap;
            let sector = this.map;
            let west_x = floor(map(this.westBound,-180,180,0,earth.width));
            let east_x = floor(map(this.eastBound,-180,180,0,earth.width));
            let north_y = floor(map(this.northBound,90,-90,0,earth.height-1));
            let south_y = floor(map(this.southBound,90,-90,0,earth.height-1));
            if(this.eastBound < this.westBound){
                let idl_x = W * (180 - this.westBound) / (this.eastBound + 360 - this.westBound);
                sector.copy(earth, west_x, north_y, earth.width - west_x, south_y - north_y, 0, 0, idl_x, H);
                sector.copy(earth, 0, north_y, east_x, south_y - north_y, idl_x, 0, W - idl_x, H);
            }else{
                sector.copy(earth, west_x, north_y, east_x - west_x, south_y - north_y, 0, 0, W, H);
            }
            sector.loadPixels();
            // for(let i = 0; i < sector.pixels.length; i += 4){
            //     let h = map(sqrt(map(sector.pixels[i],12,150,0,1,true)),0,1,0.501,1);
            //     sector.pixels[i] = floor(h * 255);
            // }
            // sector.updatePixels();
        }else if(mapForm === 'pixelmap'){   // map is already given; calculate ocean tile values
            let img = this.map;
            let mapDef = this.mapDefinition = W/WIDTH;
            let density = img._pixelDensity;
            let pixels = img.pixels;
            for(let i = 0; i < W; i++){
                for(let j = 0; j < H; j++){
                    let x = i/mapDef;
                    let y = j/mapDef;
                    let index = 4 * (j * W * density * density + i * density);
                    let landVal = pixels[index] / 255;
                    let ox = floor(x/ENV_LAYER_TILE_SIZE);
                    let oy = floor(y/ENV_LAYER_TILE_SIZE);
                    if(!this.oceanTile[ox])
                        this.oceanTile[ox] = [];
                    if(landVal <= 0.5)
                        this.oceanTile[ox][oy] = true;
                }
            }
        }else{                              // procedurally generate map from noise and store in this.map image
            let img = this.map;
            let mapDef = this.mapDefinition = W/WIDTH;

            img.loadPixels();
            let pixels = img.pixels;
            let density = img._pixelDensity;
    
            for(let i=0;i<W;i++){
                for(let j=0;j<H;j++){
                    let index = 4 * (j * W * density * density + i * density);
                    let landVal;
                    let x = i/mapDef;
                    let y = j/mapDef;
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
                    landVal = n + landBias;
                    pixels[index] = floor(landVal * 255);
                    pixels[index + 1] = landVal > 0.5 ? 255 : 0;
                    let ox = floor(x/ENV_LAYER_TILE_SIZE);
                    let oy = floor(y/ENV_LAYER_TILE_SIZE);
                    if(!this.oceanTile[ox])
                        this.oceanTile[ox] = [];
                    if(landVal <= 0.5)
                        this.oceanTile[ox][oy] = true;
                }
            }
            img.updatePixels();
        }
    }

    *draw(){
        yield "Rendering land...";
        const {fullW: W, fullH: H} = fullDimensions();
        const src = this.map.pixels; // source image for land data; red channel is elevation; green channel is land/water; blue channel is sub-basin id

        // abbreviate pixel arrays of images to draw to
        const landPx = landBuffer.pixels;
        const coastPx = coastLine.pixels;
        const outBasinPx = outBasinBuffer.pixels;

        // cache colors for 256 possible land height values to avoid expensive calculations in pixel loop
        const C = COLORS.land;
        const colorCache = [];
        for(let i = 255, ci = 0; i >= 0; i--){
            let l;
            if(this.earth)
                l = map(sqrt(map(i,12,150,0,1,true)),0,1,0.501,1);
            else
                l = Math.max(i / 255, 0.501);
            if(C[ci] && l <= C[ci][0])
                ci++;
            if(ci >= C.length)
                colorCache[i] = {r: 0, g: 0, b: 0};
            else{
                let color = C[ci][1];
                if(simSettings.smoothLandColor && ci > 0){
                    const color1 = C[ci - 1][1];
                    const f = map(l, C[ci][0], C[ci - 1][0], 0, 1);
                    color = lerpColor(color, color1, f);
                }
                colorCache[i] = {r: red(color), g: green(color), b: blue(color)};
            }
        }
        colorCache.outBasin = {r: red(COLORS.outBasin), g: green(COLORS.outBasin), b: blue(COLORS.outBasin)};

        // cache of booleans of whether a sub-basin is out-basin or not; cached as-needed from within pixel loop as sub-basin ids are assumed unknown
        const outBasinCache = {};

        for(let i=0;i<W;i++){
            for(let j=0;j<H;j++){
                let index = 4 * (j * W + i);
                if(src[index + 1]){ // if pixel is on land
                    const v = src[index]; // land elevation value
                    landPx[index] = colorCache[v].r;
                    landPx[index + 1] = colorCache[v].g;
                    landPx[index + 2] = colorCache[v].b;
                    landPx[index + 3] = 255;

                    let touchingOcean = false;
                    if(i>0 && !src[index - 4 + 1]) touchingOcean = true;
                    if(j>0 && !src[index - 4 * W + 1]) touchingOcean = true;
                    if(i<W-1 && !src[index + 4 + 1]) touchingOcean = true;
                    if(j<H-1 && !src[index + 4 * W + 1]) touchingOcean = true;
                    if(touchingOcean){
                        coastPx[index] = 0;
                        coastPx[index + 1] = 0;
                        coastPx[index + 2] = 0;
                        coastPx[index + 3] = 255;
                    }else
                        coastPx[index + 3] = 0;
                    outBasinPx[index + 3] = 0;
                }else{
                    landBuffer.pixels[index + 3] = 0;
                    coastPx[index + 3] = 0;
                    const sb = src[index + 2]; // sub-basin id
                    if(outBasinCache[sb] === undefined)
                        outBasinCache[sb] = !this.basin.subInBasin(sb);
                    if(outBasinCache[sb]){
                        outBasinPx[index] = colorCache.outBasin.r;
                        outBasinPx[index + 1] = colorCache.outBasin.g;
                        outBasinPx[index + 2] = colorCache.outBasin.b;
                        outBasinPx[index + 3] = 255;
                    }else
                        outBasinPx[index + 3] = 0;
                }
            }
        }
        landBuffer.updatePixels();
        outBasinBuffer.updatePixels();
        coastLine.updatePixels();
        if(simSettings.snowLayers && !this.snowDrawn){
            yield* this.drawSnow();
        }
        if(simSettings.useShadows && !this.shaderDrawn){
            yield* this.drawShader();
        }
        this.drawn = true;
    }

    *drawSnow(){
        yield "Rendering " + (random()<0.02 ? "sneaux" : "snow") + "...";
        const {fullW: W, fullH: H} = fullDimensions();
        const src = this.map.pixels; // source image for land data; red channel is elevation; green channel is land/water; blue channel is sub-basin id

        const eleCache = []; // cache elevation values to avoid expensive function calls in pixel loop
        for(let i = 255; i >= 0; i--){
            let l;
            if(this.earth)
                l = map(sqrt(map(i,12,150,0,1,true)),0,1,0.501,1);
            else
                l = Math.max(i / 255, 0.501);
            eleCache[i] = l;
        }
        const snowColor = {r: red(COLORS.snow), g: green(COLORS.snow), b: blue(COLORS.snow)};
        
        const SHem = this.basin.SHem;
        
        const snowLayers = simSettings.snowLayers * 10;
        for(let i=0;i<W;i++){
            for(let j=0;j<H;j++){
                let index = 4 * (j * W + i);
                if(src[index + 1]){ // if pixel is on land
                    let l = 1 - j / H;
                    if(SHem)
                        l = 1 - l;
                    let h = 0.95 - eleCache[src[index]];
                    let p = l > 0 ? Math.ceil((snowLayers / 0.3) * (h / l - 0.15)) : h < 0 ? 0 : snowLayers;
                    for(let k = 0; k < snowLayers; k++){
                        if(k >= p){
                            snow[k].pixels[index] = snowColor.r;
                            snow[k].pixels[index + 1] = snowColor.g;
                            snow[k].pixels[index + 2] = snowColor.b;
                            snow[k].pixels[index + 3] = 255;
                        }else
                            snow[k].pixels[index + 3] = 0;
                    }
                }else{
                    for(let k = 0; k < snowLayers; k++){
                        snow[k].pixels[index + 3] = 0;
                    }
                }
            }
        }
        for(let k = 0; k < snowLayers; k++){
            snow[k].updatePixels();
        }
        this.snowDrawn = true;
    }

    *drawShader(){
        yield "Rendering shadows...";
        const {fullW: W, fullH: H} = fullDimensions();
        const src = this.map.pixels; // source image for land data; red channel is elevation; green channel is land/water; blue channel is sub-basin id

        const eleCache = []; // cache elevation values to avoid expensive function calls in pixel loop
        for(let i = 255; i >= 0; i--){
            let l;
            if(this.earth)
                l = map(sqrt(map(i,12,150,0,1,true)),0,1,0.501,1);
            else
                l = Math.max(i / 255, 0.501);
            eleCache[i] = l;
        }
        
        for(let i=0;i<W;i++){
            for(let j=0;j<H;j++){
                let index = 4 * (j * W + i);
                let v = src[index + 1] ? eleCache[src[index]] : 0.5;
                let m = 0;
                for(let k = 1; k < 6; k++){
                    let s = eleCache[src[index - 4 * k * W - 4 * k]] - v - k * 0.0008;
                    s = Math.min(Math.max(s * 191 / 0.14, 0), 191);
                    if(s > m) m = s;
                }
                if(m > 0){
                    landShadows.pixels[index] = 0;
                    landShadows.pixels[index + 1] = 0;
                    landShadows.pixels[index + 2] = 0;
                    landShadows.pixels[index + 3] = Math.floor(m);
                }else
                    landShadows.pixels[index + 3] = 0;
            }
        }
        landShadows.updatePixels();
        this.shaderDrawn = true;
    }

    tileContainsOcean(x,y){
        if(this.earth)
            return true;
        
        x = floor(x/ENV_LAYER_TILE_SIZE);
        y = floor(y/ENV_LAYER_TILE_SIZE);
        return this.oceanTile[x][y];
    }

    clearSnow(){
        // for(let i=0;i<MAX_SNOW_LAYERS;i++) snow[i].clear();
        this.snowDrawn = false;
    }

    clear(){
        // landBuffer.clear();
        // outBasinBuffer.clear();
        // coastLine.clear();
        // landShadows.clear();
        this.clearSnow();
        this.drawn = false;
        this.shaderDrawn = false;
    }
}

function seasonalSine(t,off){
    off = off===undefined ? 5/12 : off;
    return sin((TAU*(t-YEAR_LENGTH*off))/YEAR_LENGTH);
}