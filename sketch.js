var paused,
    land,
    newBasinSettings,
    waitingFor,
    waitingDesc,
    waitingTCSymbolSHem,
    simSettings,
    textInput,
    buffers,
    scaler,
    tracks,
    stormIcons,
    forecastTracks,
    landBuffer,
    outBasinBuffer,
    landShader,
    coastLine,
    envLayer,
    magnifyingGlass,
    snow,
    simSpeed,
    simSpeedFrameCounter,
    keyRepeatFrameCounter,
    viewTick,
    selectedStorm,
    renderToDo,
    oldMouseX,
    oldMouseY;

function setup(){
    setVersion(TITLE + " v",VERSION_NUMBER);
    document.title = TITLE;
    versionLink.onmouseover = ()=>setVersion(TITLE + ' v',VERSION_NUMBER + ' (b' + BUILD_NUMBER + ')');
    versionLink.onmouseleave = ()=>setVersion(TITLE + ' v',VERSION_NUMBER);

    setupDatabase();

    createCanvas(WIDTH,HEIGHT);
    defineColors(); // Set the values of COLORS since color() can't be used before setup()
    background(COLORS.bg);
    paused = false;
    // basin = undefined;
    newBasinSettings = {};
    waitingFor = 0;
    waitingDesc = '';
    waitingTCSymbolSHem = false; // yes seriously, a global var for this
    simSettings = new Settings();
    // storageQuotaExhausted = false;

    textInput = document.createElement("input");
    textInput.type = "text";
    document.body.appendChild(textInput);
    textInput.style.position = "absolute";
    textInput.style.left = "-500px";
    textInput.onblur = ()=>{
        if(UI.focusedInput) UI.focusedInput.value = textInput.value;
        UI.focusedInput = undefined;
    };

    buffers = new Map();
    scaler = 1;

    let fullW = deviceOrientation===PORTRAIT ? displayHeight : displayWidth;
    let fullH = fullW*HEIGHT/WIDTH;
    tracks = createBuffer();
    tracks.strokeWeight(2);
    stormIcons = createBuffer();
    stormIcons.strokeWeight(3);
    forecastTracks = createBuffer();
    forecastTracks.strokeWeight(3);
    forecastTracks.stroke(240,240,0);
    landBuffer = createBuffer(fullW,fullH,true);
    landBuffer.noStroke();
    outBasinBuffer = createBuffer(fullW,fullH,true);
    outBasinBuffer.noStroke();
    outBasinBuffer.fill(COLORS.outBasin);
    landShader = createBuffer(fullW,fullH,true);
    landShader.noStroke();
    coastLine = createBuffer(fullW,fullH,true);
    coastLine.fill(0);
    coastLine.noStroke();
    envLayer = createBuffer(WIDTH,HEIGHT,false,true);
    envLayer.colorMode(HSB);
    envLayer.strokeWeight(2);
    envLayer.noStroke();
    magnifyingGlass = createBuffer(ENV_LAYER_TILE_SIZE*4,ENV_LAYER_TILE_SIZE*4,false,true);
    magnifyingGlass.colorMode(HSB);
    magnifyingGlass.strokeWeight(2);
    magnifyingGlass.noStroke();
    snow = [];
    for(let i=0;i<MAX_SNOW_LAYERS;i++){
        snow[i] = createBuffer(fullW,fullH,true);
        snow[i].noStroke();
        snow[i].fill(COLORS.snow);
    }

    simSpeed = 0; // The exponent for the simulation speed (0 is full-speed, 1 is half-speed, etc.)
    simSpeedFrameCounter = 0; // Counts frames of draw() while unpaused; modulo 2^simSpeed to advance sim when 0
    keyRepeatFrameCounter = 0;

    upgradeLegacySaves();
    UI.init();
}

function draw(){
    try{
        scale(scaler);
        background(COLORS.bg);
        if(waitingFor<1){   // waitingFor applies to asynchronous processes such as saving and loading
            if(UI.viewBasin instanceof Basin){
                if(renderToDo){     // renderToDo applies to synchronous single-threaded rendering functions
                    let t = renderToDo.next();
                    if(t.done){
                        renderToDo = undefined;
                        return;
                    }
                    push();
                    textSize(48);
                    textAlign(CENTER,CENTER);
                    text(t.value,WIDTH/2,HEIGHT/2);
                    pop();
                    return;
                }
                stormIcons.clear();
                if(!paused){
                    simSpeedFrameCounter++;
                    simSpeedFrameCounter%=pow(2,simSpeed);
                    if(simSpeedFrameCounter===0) UI.viewBasin.advanceSim();
                }
                keyRepeatFrameCounter++;
                if(keyIsPressed && document.activeElement!==textInput && (keyRepeatFrameCounter>=KEY_REPEAT_COOLDOWN || keyRepeatFrameCounter===0) && keyRepeatFrameCounter%KEY_REPEATER===0){
                    if(paused && primaryWrapper.showing){
                        if(keyCode===LEFT_ARROW && viewTick>=ADVISORY_TICKS){
                            changeViewTick(ceil(viewTick/ADVISORY_TICKS-1)*ADVISORY_TICKS);
                        }else if(keyCode===RIGHT_ARROW){
                            let t;
                            if(viewTick<UI.viewBasin.tick-ADVISORY_TICKS) t = floor(viewTick/ADVISORY_TICKS+1)*ADVISORY_TICKS;
                            else t = UI.viewBasin.tick;
                            changeViewTick(t);
                        }
                    }
                }
                if((mouseX!==oldMouseX || mouseY!==oldMouseY) && simSettings.showMagGlass) UI.viewBasin.env.updateMagGlass();
            }
        
            UI.updateMouseOver();
            UI.renderAll();
        }else{
            let d = 100;
            push();
            translate(WIDTH/2,HEIGHT/2);
            push();
            noStroke();
            fill(0,64,128);
            ellipse(0,0,d);
            if(waitingTCSymbolSHem) scale(1,-1);
            rotate(millis()*-PI/500);
            beginShape();
            vertex(d*5/8,-d);
            bezierVertex(-d*3/2,-d*5/8,d*3/2,d*5/8,-d*5/8,d);
            bezierVertex(d*5/8,0,-d*5/8,0,d*5/8,-d);
            endShape();
            pop();
            textSize(48);
            textAlign(CENTER,CENTER);
            text(waitingDesc,0,0);
            pop();
        }
        oldMouseX = mouseX;
        oldMouseY = mouseY;
    }catch(err){            // BSOD
        resetMatrix();
        colorMode(RGB);
        background(15,15,200);
        fill(255);
        textSize(24);
        textAlign(LEFT,TOP);
        text("The program has committed a crime and will now cease to exist. :(",width/16,height/8);
        textSize(15);
        text(err.stack,width/16,height/4);
        console.error(err);
        noLoop();
    }
}

// function init(load){
//     // selectedStorm = undefined;
//     // let whenBasinLoaded = basin=>{
//     //     viewTick = basin.tick;
//     //     UI.viewBasin = basin;
//     //     refreshTracks(true);
//     //     primaryWrapper.show();
//     //     renderToDo = land.draw();
//     // };

//     let basin;
//     if(load!==undefined) basin = new Basin(load);
//     else{
//         let opts = {};
//         if(newBasinSettings.hem===1) opts.hem = false;
//         else if(newBasinSettings.hem===2) opts.hem = true;
//         else opts.hem = random()<0.5;
//         opts.year = opts.hem ? SHEM_DEFAULT_YEAR : NHEM_DEFAULT_YEAR;
//         if(newBasinSettings.year!==undefined) opts.year = newBasinSettings.year;
//         opts.seed = newBasinSettings.seed;
//         opts.actMode = newBasinSettings.actMode;
//         opts.names = newBasinSettings.names;
//         opts.hurrTerm = newBasinSettings.hurrTerm;
//         opts.mapType = newBasinSettings.mapType;
//         opts.godMode = newBasinSettings.godMode;
//         opts.hypoCats = newBasinSettings.hypoCats;
//         basin = new Basin(false,opts);
//         newBasinSettings = {};
//         // noiseSeed(basin.seed);
//         // Environment.init(basin);
//         // let theRest = basin=>{
//         //     land = new Land(basin);
//         //     basin.seasons[basin.getSeason(-1)] = new Season(basin);
//         //     basin.env.record();
//         //     whenBasinLoaded(basin);
//         // };
//         // if(MAP_TYPES[basin.mapType].form==='pixelmap'){
//         //     return loadImg(MAP_TYPES[basin.mapType].path).then(img=>{
//         //         img.loadPixels();
//         //         basin.mapImg = img;
//         //         theRest(basin);
//         //     }).catch(e=>{
//         //         console.error(e);
//         //     });
//         // }else theRest(basin);
//     }
//     basin.initialized.then(()=>{
//         basin.mount();
//     });
// }

// function advanceSim(){
//     let vp = basin.viewingPresent();
//     let os = basin.getSeason(-1);
//     basin.tick++;
//     let vs = basin.getSeason(viewTick);
//     viewTick = basin.tick;
//     let curSeason = basin.getSeason(-1);
//     if(curSeason!==os){
//         let e = new Season();
//         for(let s of basin.activeSystems) e.addSystem(new StormRef(s.fetchStorm()));
//         basin.seasons[curSeason] = e;
//     }
//     if(!vp || curSeason!==vs) refreshTracks(curSeason!==vs);
//     Env.wobble();    // random change in environment for future forecast realism
//     for(let i=0;i<basin.activeSystems.length;i++){
//         for(let j=i+1;j<basin.activeSystems.length;j++){
//             basin.activeSystems[i].interact(basin.activeSystems[j],true);
//         }
//         basin.activeSystems[i].update();
//     }
//     if(!basin.hyper && random()<0.015*sq((seasonalSine(basin.tick)+1)/2)) basin.spawn(false);    // tropical waves (normal mode)
//     if(basin.hyper && random()<(0.013*sq((seasonalSine(basin.tick)+1)/2)+0.002)) basin.spawn(false);    // tropical waves (hyper mode)
//     if(random()<0.01-0.002*seasonalSine(basin.tick)) basin.spawn(true);    // extratropical cyclones
//     let stormKilled = false;
//     for(let i=basin.activeSystems.length-1;i>=0;i--){
//         if(!basin.activeSystems[i].fetchStorm().current){
//             basin.activeSystems.splice(i,1);
//             stormKilled = true;
//         }
//     }
//     if(stormKilled) refreshTracks();
//     if(basin.tick%ADVISORY_TICKS==0){
//         Env.displayLayer();
//         Env.record();
//     }
//     let curTime = basin.tickMoment();
//     if(simSettings.doAutosave && /* !storageQuotaExhausted && */ (curTime.date()===1 || curTime.date()===15) && curTime.hour()===0) basin.save();
// }

class Settings{
    constructor(){
        const order = Settings.order();
        const defaults = Settings.defaults();
        waitForAsyncProcess(()=>{
            return db.settings.get(DB_KEY_SETTINGS);
        },'Retrieving Settings...').catch(err=>{
            console.error(err);
        }).then(result=>{
            let v = result;
            if(!v){
                let lsKey = LOCALSTORAGE_KEY_PREFIX + LOCALSTORAGE_KEY_SETTINGS;
                v = localStorage.getItem(lsKey);
                if(v){
                    v = decodeB36StringArray(v);
                    db.settings.put(v,DB_KEY_SETTINGS).then(()=>{
                        localStorage.removeItem(lsKey);
                    }).catch(err=>{
                        console.error(err);
                    });
                }else v = [];
            }
            for(let i=order.length-1;i>=0;i--){
                if(v.length>0) this[order[i]] = v.pop();
                else this[order[i]] = defaults[i];
            }
            let sf = (k)=>{
                return (v,v2)=>{
                    this.set(k,v,v2);
                };
            };
            for(let i=0;i<order.length;i++){
                let n = "set" + order[i].charAt(0).toUpperCase() + order[i].slice(1);
                this[n] = sf(order[i]);
            }
        });
    }

    static order(){
        return ["showMagGlass","snowLayers","useShader","trackMode","showStrength","doAutosave"];    // add new settings to the beginning of this array
    }

    static defaults(){
        return [false,2,false,0,false,true];  // add new defaults to the beginning of this array
    }

    save(){
        const order = Settings.order();
        let v = [];
        for(let i=0;i<order.length;i++){
            v.push(this[order[i]]);
        }
        // v = encodeB36StringArray(v);
        // modifyLocalStorage(()=>{
        //     localStorage.setItem(k,v);
        // },(e)=>{
        //     console.error(e);
        //     alert("Cannot save settings due to saving quota");
        // });
        db.settings.put(v,DB_KEY_SETTINGS).catch(err=>{
            console.error(err);
        });
    }

    set(k,v,v2){
        if(v==="toggle") this[k] = !this[k];
        else if(v==="incmod"){
            this[k]++;
            this[k] %= v2;
        }else this[k] = v;
        this.save();
    }

    get(k){         // accessing the property directly also works (only for getting)
        return this[k];
    }
}
