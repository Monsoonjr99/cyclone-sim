class NoiseChannel{
    constructor(octaves,falloff,zoom,zZoom,wMax,zWMax,wRFac){
        // const OFFSET_RANDOM_FACTOR = 4096;
        this.octaves = octaves || 4;
        this.falloff = falloff || 0.5;
        this.zoom = zoom || 100;
        this.zZoom = zZoom || this.zoom;
        this.meta = undefined;
        // this.xOff = random(OFFSET_RANDOM_FACTOR);
        // this.yOff = random(OFFSET_RANDOM_FACTOR);
        // this.zOff = random(OFFSET_RANDOM_FACTOR);
        // this.wobbleVector = p5.Vector.random2D();
        this.wobbleMax = wMax || 1;
        this.zWobbleMax = zWMax || this.wobbleMax;
        this.wobbleRotFactor = wRFac || PI/16;
        // this.wobbleSave = {};
        // this.save();
    }

    get(x,y,z){
        x = x || 0;
        y = y || 0;
        z = z || 0;
        // let p = viewingPresent();
        // let xo = p ? this.xOff : basin.envWobbleHist[];
        let xo;
        let yo;
        let zo;
        if(this.meta){
            let m = this.meta.fetch(z);
            if(!m) return 0;
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

    // save(){
    //     let m = this.wobbleSave;
    //     m.wobbleX = this.wobbleVector.x;
    //     m.wobbleY = this.wobbleVector.y;
    //     m.xOff = this.xOff;
    //     m.yOff = this.yOff;
    //     m.zOff = this.zOff;
    // }

    // load(){
    //     let m = this.wobbleSave;
    //     this.wobbleVector.set(m.wobbleX,m.wobbleY);
    //     this.xOff = m.xOff;
    //     this.yOff = m.yOff;
    //     this.zOff = m.zOff;
    // }
}

class NCMetadata{
    constructor(field,index,load){
        this.field = field;
        this.index = index;
        this.channel = null;
        this.wobbleVector = load ? createVector(load.vec.x,load.vec.y) : p5.Vector.random2D();
        let r = NC_OFFSET_RANDOM_FACTOR;
        this.xOff = load ? load.x : random(r);
        this.yOff = load ? load.y : random(r);
        this.zOff = load ? load.z : random(r);
        this.history = {};
        if(load) for(let i=0;i<load.hist.length;i++) this.history[load.hist[i].t] = load.hist[i].p;
        if(!basin.envData[this.field]) basin.envData[this.field] = {};
        basin.envData[this.field][this.index] = this;
    }

    init(){
        if(Env){
            this.channel = Env.fields[this.field].noise[this.index];
            this.channel.bind(this);
        }
    }

    fetch(t){
        if(t>=basin.tick) return {
            x: this.xOff,
            y: this.yOff,
            z: this.zOff
        };
        else{
            t = floor(t/ADVISORY_TICKS)*ADVISORY_TICKS;
            return this.history[t];
        }
    }

    record(){
        this.history[basin.tick] = {
            x: this.xOff,
            y: this.yOff,
            z: this.zOff
        };
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
            if(!basin.envData[this.name][i]) new NCMetadata(this.name,i);
        }
    }

    get(x,y,z,noHem){
        if(!noHem) y = hemY(y);
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
        for(let i=0;i<width;i+=ENV_LAYER_TILE_SIZE){
            for(let j=0;j<height;j+=ENV_LAYER_TILE_SIZE){
                let x = i+ENV_LAYER_TILE_SIZE/2;
                let y = j+ENV_LAYER_TILE_SIZE/2;
                if(!this.oceanic || land.tileContainsOcean(x,y)){
                    let v = this.get(x,y,viewTick);
                    if(this.isVectorField){
                        envLayer.push();
                        envLayer.stroke(0);
                        envLayer.translate(x,y);
                        envLayer.rotate(v.heading());
                        let mg = v.mag();
                        let mp = this.magMap;
                        let l = map(mg,mp[0],mp[1],mp[2],mp[3]);
                        envLayer.line(0,0,l,0);
                        envLayer.noStroke();
                        envLayer.fill(0);
                        envLayer.triangle(l+5,0,l,3,l,-3);
                        envLayer.pop();
                    }else{
                        let h = this.hueMap;
                        if(h instanceof Function) envLayer.fill(h(v));
                        else envLayer.fill(map(v,h[0],h[1],h[2],h[3]),100,100);
                        envLayer.rect(i,j,ENV_LAYER_TILE_SIZE,ENV_LAYER_TILE_SIZE);
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

    // save(){
    //     if(this.noise) this.noise.save();
    // }

    // load(){
    //     if(this.noise) this.noise.load();
    // }

    // saveWobbleHist(){
    //     if(!this.noWobble){
    //         let b = basin.envWobbleHist;
    //         let n = this.name;
    //         if(!b[n]) b[n] = {};
    //         let h = b[n];
    //         for(let i=0;i<f.noise.length;i++){
    //             let c = this.noise[i];
    //             if(!h[i]) h[i] = {};
    //             let p = {};
    //             p.x = c.xOff;
    //             p.y = c.yOff;
    //             p.z = c.zOff;
    //             h[i][basin.tick] = p;
    //         }
    //     }
    // }
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

    // startForecast(){
    //     for(let i in this.fields) this.fields[i].save();
    // }

    // resetForecast(){
    //     for(let i in this.fields) this.fields[i].load();
    // }

    get(field,x,y,z,noHem){
        return this.fields[field].get(x,y,z,noHem);
    }

    // test(field){
    //     if(field) testNoise = this.fields[field];
    //     else testNoise = undefined;
    //     testGraphics.clear();
    // }

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

    // testChaos(n){
    //     this.resetForecast();
    //     for(let i=0;i<n;i++) this.wobble();
    // }

    // saveWobbleHist(){
    //     for(let i=0;i<this.fieldList.length;i++){
    //         let n = this.fieldList[i];
    //         let f = this.fields[n];
    //         let b = basin.envWobbleHist;
    //         if(!f.noWobble){
    //             if(!b[n]) b[n] = {};
    //             let h = b[n];
    //             for(let j=0;j<f.noise.length;j++){
    //                 let c = f.noise[j];
    //                 if(!h[j]) h[j] = {};
    //                 let p = {};
    //                 p.x = c.xOff;
    //                 p.y = c.yOff;
    //                 p.z = c.zOff;
    //                 h[j][basin.tick] = p;
    //             }
    //         }
    //     }
    // }
}

Environment.init = function(){
    Env = new Environment();    // Sad environmental stuff that is barely even used so far

    Env.addField(
        "jetstream",
        function(n,x,y,z){
            let s = seasonalSine(z);
            let l = map(sqrt(map(s,-1,1,0,1)),0,1,0.55,0.35);
            let v = n(0,x-z*3,0,z);
            let r = map(s,-1,1,0.5,0.35);
            v = map(v,0,1,-r,r);
            return (l+v)*height;
        },
        {
            invisible: true
        },
        [4,0.5,160,300,1,2]
    );

    Env.addField(
        "LLSteering",
        function(n,x,y,z){
            // let h = map(y,0,height,1,-1);
            // let mainDir = map(h<0?-sqrt(-h):sqrt(h),1,-1,0,-PI);
            // let noiseDir = map(this.noise.get(x,y,z),0,1,-PI,PI);
            // let noiseMult = map(y,0,height,3/4,1/4)/*-1/2*sq(h)+1/2*/;
            // return mainDir+noiseDir*noiseMult;

            // return map(this.noise[0].get(x,y,z),0,1,0,TAU*2);

            this.vec.set(1);    // reset vector

            // Jetstream
            let j = Env.get("jetstream",x,y,z,true);
            // Cosine curve from 0 at poleward side of map to 1 at equatorward side
            let h = map(cos(map(y,0,height,0,PI)),-1,1,1,0);
            // let h = map(cos(lerp(0,PI,y<j?map(y,0,j,0,0.4):map(y,j,height,0.4,1))),-1,1,1,0);
            // westerlies
            let west = constrain(pow(1-h+map(n(0),0,1,-0.3,0.3)+map(j,0,height,-0.4,0.4),2)*4,0,4);
            // ridging, trades and weakness
            let ridging = constrain(n(1)+map(j,0,height,0.3,-0.3),0,1);
            let trades = constrain(pow(h+map(ridging,0,1,-0.3,0.3),2)*3,0,3);
            let tAngle = map(h,0.9,1,511*PI/512,17*PI/16); // trades angle
            // let weakness = pow(map(h,0,1,1.01,1.28),map(ridging,0,1,0,-12))*constrain(map(west-trades,0,4,1,0),0,1);
            // noise angle
            let a = map(n(3),0,1,0,4*TAU);
            // noise magnitude
            let m = pow(1.5,map(n(2),0,1,-8,4));

            // apply to vector
            this.vec.rotate(a);
            // this.vec.mult(m/(1+(sin(a)/2+0.5)*trades));  // Uses the sine of the angle to give poleward bias depending on the strength of the trades -- deprecated in favor of weakness
            this.vec.mult(m);
            this.vec.add(west+trades*cos(tAngle),trades*sin(tAngle)/*-weakness*/);
            this.vec.y = hem(this.vec.y); // hemisphere flip
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
            let ridging = 0.45-j0/height-map(sqrt(map(s,-1,1,0,1)),0,1,0.15,0);             // how much 'ridge' or 'trough' there is from jetstream
            // power of winds equatorward of jetstream
            let hadley = (map(ridging,-0.3,0.2,5,1.5,true)+map(m,0,1,-1.5,1.5))*jOP*(y>j0?1:0);
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

            this.vec.y = hem(this.vec.y);                                                   // hemisphere flip
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
            magMap: [0,8,0,25]//,
            // invisible: true         // remove when wind shear is actually added to storm algorithm
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
            let r = map(y,0,height,6,3);
            v = -r*v;
            v = v*i;
            return v;
            // return map(n(0),0,1,-5,5);
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
            let w = map(cos(map(x,0,width,0,PI)),-1,1,0,1);
            let h0 = y/height;
            let h1 = (sqrt(h0)+h0)/2;
            let h2 = sqrt(sqrt(h0));
            let h = map(cos(lerp(PI,0,lerp(h1,h2,sq(w)))),-1,1,0,1);
            let t = lerp(map(s,-1,1,OFF_SEASON_POLAR_TEMP,PEAK_SEASON_POLAR_TEMP),map(s,-1,1,OFF_SEASON_TROPICS_TEMP,PEAK_SEASON_TROPICS_TEMP),h);
            return t+anom;
        },
        {
            hueMap: function(v){
                colorMode(HSB);
                let c;
                /* if(v<5) c = color(300,100,80);
                else  */if(v<26) c = lerpColor(color(300,100,80),color(120,100,80),map(v,5,26,0,1));
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
            let l = land.get(x,hemY(y));
            let m = map(l,0.5,0.7,map(y,0,height,0.43,0.57),0.2,true);
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

    // Env.addField("steeringMag",function(x,y,z){
    //     // return map(y,0,height,4,2)*map(this.noise.get(x,y,z),0,1,0.7,1.3);
    //     return pow(1.5,map(this.noise[0].get(x,y,z),0,1,-4,4))*2;
    // },{},[4,0.5,80,100,1,3]);
    // Env.addField("westerlies",function(x,y,z){
    //     let h = cos(map(y,0,height,0,PI))/2+0.5;
    //     return constrain(pow(h+map(this.noise[0].get(x,y,z),0,1,-0.3,0.3),2)*4,0,4);
    // },{},[4,0.5,80,100,1,3]);
    // Env.addField("trades",function(x,y,z){
    //     let h = cos(map(y,0,height,PI,0))/2+0.5;
    //     return constrain(pow(h+map(this.noise[0].get(x,y,z),0,1,-0.3,0.3),2)*3,0,3);
    // },{},[4,0.5,80,100,1,3]);
    // Env.addField("test",function(x,y,z){
    //     this.vec.set(1);
    //     let n = this.noise[0].get(x,y,z);
    //     this.vec.rotate(map(n,0,1,0,4*TAU));
    //     this.vec.setMag(map(this.noise[1].get(x,y,z),0,1,0,3));
    //     return this.vec;
    // },{vector:true,magMap:[0,3,0,16]},[4,0.5,170,200,0.7,1],'');

    for(let i in basin.envData){
        for(let j in basin.envData[i]){
            basin.envData[i][j].init();
        }
    }
};

class Land{
    constructor(){
        this.noise = new NoiseChannel(9,0.5,100);
        // this.noise.xOff = 0;
        // this.noise.yOff = 0;
        // this.noise.zOff = 0;
        this.map = [];
        this.oceanTile = [];
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
        for(let i=0;i<width;i++){
            this.map[i] = [];
            for(let j=0;j<height;j++){
                let n = this.noise.get(i,j);
                let landBiasAnchor = width * LAND_BIAS_FACTORS[0];
                let landBias = i < landBiasAnchor ?
                    map(i,0,landBiasAnchor,LAND_BIAS_FACTORS[1],LAND_BIAS_FACTORS[2]) :
                    map(i-landBiasAnchor,0,width-landBiasAnchor,LAND_BIAS_FACTORS[2],LAND_BIAS_FACTORS[3]);
                this.map[i][j] = n + landBias;
                let ox = floor(i/ENV_LAYER_TILE_SIZE);
                let oy = floor(j/ENV_LAYER_TILE_SIZE);
                if(!this.oceanTile[ox]) this.oceanTile[ox] = [];
                if(this.map[i][j]<=0.5) this.oceanTile[ox][oy] = true;
            }
        }
        yield "Rendering land...";
        for(let i=0;i<width;i++){
            for(let j=0;j<height;j++){
                let landVal = this.get(i,j);
                if(landVal){
                    for(let k=0;k<COLORS.land.length;k++){
                        if(landVal > COLORS.land[k][0]){
                            landBuffer.fill(COLORS.land[k][1]);
                            landBuffer.rect(i,j,1,1);
                            break;
                        }
                    }
                    let touchingOcean = false;
                    if(i>0 && !this.get(i-1,j)) touchingOcean = true;
                    if(j>0 && !this.get(i,j-1)) touchingOcean = true;
                    if(i<width-1 && !this.get(i+1,j)) touchingOcean = true;
                    if(j<height-1 && !this.get(i,j+1)) touchingOcean = true;
                    if(touchingOcean) coastLine.rect(i,j,1,1);
                }
            }
        }
        yield "Rendering " + (random()<0.02 ? "sneaux" : "snow") + "...";
        for(let i=0;i<width;i++){
            for(let j=0;j<height;j++){
                let landVal = this.get(i,j);
                if(landVal){
                    let l = 1-hemY(j)/height;
                    let h = 0.95-landVal;
                    let p = l>0 ? ceil(map(h/l,0.15,0.45,0,SNOW_LAYERS)) : h<0 ? 0 : SNOW_LAYERS;
                    for(let k=max(p,0);k<SNOW_LAYERS;k++) snow[k].rect(i,j,1,1);
                }
            }
        }
        if(useShader){
            yield "Rendering shader...";
            for(let i=0;i<width;i++){
                for(let j=0;j<height;j++){
                    let v = this.get(i,j);
                    if(v===0) v = 0.5;
                    let m = 0;
                    for(let k=1;k<6;k++){
                        let s = this.get(i-k,j-k)-v-k*0.0008;
                        s = constrain(map(s,0,0.14,0,191),0,191);
                        if(s>m) m = s;
                    }
                    if(m>0){
                        landShader.fill(0,m);
                        landShader.rect(i,j,1,1);
                    }
                }
            }
        }
    }

    tileContainsOcean(x,y){
        x = floor(x/ENV_LAYER_TILE_SIZE);
        y = floor(y/ENV_LAYER_TILE_SIZE);
        return this.oceanTile[x][y];
    }

    clear(){
        landBuffer.clear();
        coastLine.clear();
        landShader.clear();
        for(let i=0;i<SNOW_LAYERS;i++) snow[i].clear();
    }
}

function seasonalSine(t,off){
    off = off===undefined ? 5/12 : off;
    return sin((TAU*(t-YEAR_LENGTH*off))/YEAR_LENGTH);
}

// function getLand(x,y){
//     let n = landNoise.get(x,y);
//     let landBiasAnchor = width * LAND_BIAS_FACTORS[0];
//     let landBias = x < landBiasAnchor ?
//         map(x,0,landBiasAnchor,LAND_BIAS_FACTORS[1],LAND_BIAS_FACTORS[2]) :
//         map(x-landBiasAnchor,0,width-landBiasAnchor,LAND_BIAS_FACTORS[2],LAND_BIAS_FACTORS[3]);
//     let lh = n + landBias;
//     return lh > 0.5 ? lh : 0;
// }

// function createLand(){
//     landNoise = new NoiseChannel(9,0.5,100);
//     landNoise.xOff = 0;
//     landNoise.yOff = 0;
//     landNoise.zOff = 0;
// }

// function renderLand(){
//     for(let i=0;i<width;i++){
//         for(let j=0;j<height;j++){
//             let landVal = getLand(i,j);
//             if(landVal){
//                 for(let k=0;k<COLORS.land.length;k++){
//                     if(landVal > COLORS.land[k][0]){
//                         land.fill(COLORS.land[k][1]);
//                         land.rect(i,j,1,1);
//                         break;
//                     }
//                 }
//                 for(let k=0;k<SNOW_LAYERS;k++){
//                     let p = k/SNOW_LAYERS;
//                     let l = 1-hemY(j)/height;
//                     let h = 0.95-l*map(p,0,1,0.15,0.45);
//                     if(landVal > h) snow[k].rect(i,j,1,1);
//                 }
//             }
//         }
//     }
// }