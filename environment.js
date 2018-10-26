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
    constructor(noiseC,mapFunc,dependent){
        if(noiseC instanceof NoiseChannel) this.noise = noiseC;
        if(mapFunc instanceof Function) this.mapFunc = mapFunc;
        this.dependent = dependent;
    }

    get(x,y,z){
        let val = 0;
        y = hemY(y);
        if(this.mapFunc) val += this.mapFunc(x,y,z);
        if(this.noise && (!this.dependent || !this.mapFunc)) val += this.noise.get(x,y,z);
        return val;
    }

    wobble(){
        if(this.noise) this.noise.wobble();
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
    }

    addField(name,...fieldArgs){
        this.fields[name] = new EnvField(...fieldArgs);
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

    get(field,x,y,z){
        return this.fields[field].get(x,y,z);
    }

    test(field){
        if(field) testNoise = this.fields[field];
        else testNoise = undefined;
        testGraphics.clear();
    }

    testChaos(n){
        this.resetForecast();
        for(let i=0;i<n;i++) this.wobble();
    }
}

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