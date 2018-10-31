class NoiseChannel{
    constructor(octaves,falloff,zoom,zZoom,wMax,zWMax,wRFac){
        const OFFSET_RANDOM_FACTOR = 4096;
        this.octaves = octaves || 4;
        this.falloff = falloff || 0.5;
        this.zoom = zoom || 100;
        this.zZoom = zZoom || this.zoom;
        this.xOff = random(OFFSET_RANDOM_FACTOR);
        this.yOff = random(OFFSET_RANDOM_FACTOR);
        this.zOff = random(OFFSET_RANDOM_FACTOR);
        this.wobbleVector = p5.Vector.random2D();
        this.wobbleMax = wMax || 1;
        this.zWobbleMax = zWMax || this.wobbleMax;
        this.wobbleRotFactor = wRFac || PI/16;
        this.wobbleSave = {};
        this.save();
    }

    get(x,y,z){
        x = x || 0;
        y = y || 0;
        z = z || 0;
        // let p = viewingPresent();
        // let xo = p ? this.xOff : basin.envWobbleHist[];
        noiseDetail(this.octaves,this.falloff);
        return noise(x/this.zoom+this.xOff,y/this.zoom+this.yOff,z/this.zZoom+this.zOff);
    }

    wobble(){
        this.wobbleVector.setMag(random(0.0001,this.wobbleMax));
        this.xOff += this.wobbleVector.x/this.zoom;
        this.yOff += this.wobbleVector.y/this.zoom;
        this.zOff += random(-this.zWobbleMax,this.zWobbleMax)/this.zZoom;
        this.wobbleVector.rotate(random(-this.wobbleRotFactor,this.wobbleRotFactor));
    }

    save(){
        let m = this.wobbleSave;
        m.wobbleX = this.wobbleVector.x;
        m.wobbleY = this.wobbleVector.y;
        m.xOff = this.xOff;
        m.yOff = this.yOff;
        m.zOff = this.zOff;
    }

    load(){
        let m = this.wobbleSave;
        this.wobbleVector.set(m.wobbleX,m.wobbleY);
        this.xOff = m.xOff;
        this.yOff = m.yOff;
        this.zOff = m.zOff;
    }
}

class EnvField{
    constructor(mapFunc,opts,...noiseC){
        this.noise = [];
        this.isVectorField = opts.vector;
        this.noWobble = opts.noWobble;
        this.hueMap = opts.hueMap || [0,1,0,300];
        this.magMap = opts.magMap || [0,1,0,10];
        this.invisible = opts.invisible;
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
                    if(getLand(x,y)<0.5) envLayer.rect(i,j,ENV_LAYER_TILE_SIZE,ENV_LAYER_TILE_SIZE);
                }
            }
        }
    }

    save(){
        if(this.noise) this.noise.save();
    }

    load(){
        if(this.noise) this.noise.load();
    }
}

class Environment{
    constructor(){
        this.fields = {};
        this.fieldList = [];
        this.displaying = -1;
    }

    addField(name,...fieldArgs){
        this.fields[name] = new EnvField(...fieldArgs);
        this.fieldList.push(name);
    }

    wobble(){
        for(let i in this.fields) this.fields[i].wobble();
    }

    startForecast(){
        for(let i in this.fields) this.fields[i].save();
    }

    resetForecast(){
        for(let i in this.fields) this.fields[i].load();
    }

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
        this.displayLayer();
    }

    testChaos(n){
        this.resetForecast();
        for(let i=0;i<n;i++) this.wobble();
    }

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
    // Env.addField("shear",undefined,{},[5,0.5,100,40,1.5,2]);

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
            // Cosine curve from 0 at poleward side of map to 1 at equatorward side
            let h = map(cos(map(y,0,height,0,PI)),-1,1,1,0);
            // westerlies
            let west = constrain(pow(1-h+map(n(0),0,1,-0.3,0.3),2)*4,0,4);
            // ridging, trades and weakness
            let ridging = n(1);
            let trades = constrain(pow(h+map(ridging,0,1,-0.3,0.3),2)*3,0,3);
            let weakness = pow(map(h,0,1,1.01,1.28),map(ridging,0,1,0,-12))*constrain(map(west-trades,0,4,1,0),0,1);
            // noise angle
            let a = map(n(3),0,1,0,4*TAU);
            // noise magnitude
            let m = pow(1.5,map(n(2),0,1,-8,4));

            // apply to vector
            this.vec.rotate(a);
            // this.vec.mult(m/(1+(sin(a)/2+0.5)*trades));  // Uses the sine of the angle to give poleward bias depending on the strength of the trades -- deprecated in favor of weakness
            this.vec.mult(m);
            this.vec.add(west-trades,-weakness);
            this.vec.y = hem(this.vec.y);
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
        "SSTAnomaly",
        function(n){
            return map(n(0),0,1,-5,5);
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
            }
        },
        [6,0.5,150,1000,0.2,2]
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
            let t = lerp(map(s,-1,1,-3,10),map(s,-1,1,27,29),h);
            return t+anom;
        },
        {
            hueMap: function(v){
                colorMode(HSB);
                let c;
                if(v<5) c = color(300,100,80);
                else if(v<26) c = lerpColor(color(300,100,80),color(120,100,80),map(v,5,26,0,1));
                else if(v<29) c = lerpColor(color(60,100,100),color(0,100,70),map(v,26,29,0,1));
                else c = lerpColor(color(0,100,70),color(0,5,100),map(v,29,34,0,1));
                colorMode(RGB);
                return c;
            }
        }
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
    // Env.addField("moisture",undefined,{},[4,0.5,130,100,1,2]);
    // Env.addField("test",function(x,y,z){
    //     this.vec.set(1);
    //     let n = this.noise[0].get(x,y,z);
    //     this.vec.rotate(map(n,0,1,0,4*TAU));
    //     this.vec.setMag(map(this.noise[1].get(x,y,z),0,1,0,3));
    //     return this.vec;
    // },{vector:true,magMap:[0,3,0,16]},[4,0.5,170,200,0.7,1],'');
};

function seasonalSine(t,off){
    off = off===undefined ? 5/12 : off;
    return sin((TAU*(t-YEAR_LENGTH*off))/YEAR_LENGTH);
}

function getLand(x,y){
    let n = landNoise.get(x,y);
    let landBiasAnchor = width * LAND_BIAS_FACTORS[0];
    let landBias = x < landBiasAnchor ?
        map(x,0,landBiasAnchor,LAND_BIAS_FACTORS[1],LAND_BIAS_FACTORS[2]) :
        map(x-landBiasAnchor,0,width-landBiasAnchor,LAND_BIAS_FACTORS[2],LAND_BIAS_FACTORS[3]);
    let lh = n + landBias;
    return lh > 0.5 ? lh : 0;
}

function createLand(){
    landNoise = new NoiseChannel(9,0.5,100);
    landNoise.xOff = 0;
    landNoise.yOff = 0;
    landNoise.zOff = 0;
}

function renderLand(){
    for(let i=0;i<width;i++){
        for(let j=0;j<height;j++){
            let landVal = getLand(i,j);
            if(landVal){
                for(let k=0;k<COLORS.land.length;k++){
                    if(landVal > COLORS.land[k][0]){
                        land.fill(COLORS.land[k][1]);
                        land.rect(i,j,1,1);
                        break;
                    }
                }
                for(let k=0;k<SNOW_LAYERS;k++){
                    let p = k/SNOW_LAYERS;
                    let l = 1-hemY(j)/height;
                    let h = 0.95-l*map(p,0,1,0.15,0.45);
                    if(landVal > h) snow[k].rect(i,j,1,1);
                }
            }
        }
    }
}