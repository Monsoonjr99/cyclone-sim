class UI{
    constructor(parent,x,y,w,h,renderer,onclick,showing){
        if(parent instanceof UI){
            this.parent = parent;
            this.parent.children.push(this);
        }
        this.relX = x;
        this.relY = y;
        this.width = w;
        this.height = h;
        if(renderer instanceof Function) this.renderFunc = renderer;
        this.clickFunc = onclick;
        this.children = [];
        this.showing = showing===undefined ? true : showing;
        if(!this.parent) UI.elements.push(this);
    }

    getX(){
        if(this.parent) return this.parent.getX() + this.relX;
        return this.relX;
    }

    getY(){
        if(this.parent) return this.parent.getY() + this.relY;
        return this.relY;
    }

    render(){
        if(this.showing){
            translate(this.relX,this.relY);
            if(this.renderFunc) this.renderFunc();
            if(this.children.length===1){
                this.children[0].render();
            }else{
                for(let c of this.children){
                    push();
                    c.render();
                    pop();
                }
            }
        }
    }

    fullRect(){
        rect(0,0,this.width,this.height);   // Easy method for use in the render function
    }

    setBox(x,y,w,h){    // Should be used inside of the renderer function
        if(x===undefined) x = this.relX;
        if(y===undefined) y = this.relY;
        if(w===undefined) w = this.width;
        if(h===undefined) h = this.height;
        translate(x-this.relX,y-this.relY);
        this.relX = x;
        this.relY = y;
        this.width = w;
        this.height = h;
    }

    append(chain,...opts){
        if(chain!==false && this.children.length>chain) return this.children[chain].append(0,...opts);
        return new UI(this,...opts);
    }

    checkMouseOver(){
        if(this.showing){
            if(this.children.length>0){
                let cmo = null;
                for(let i=this.children.length-1;i>=0;i--){
                    cmo = this.children[i].checkMouseOver();
                    if(cmo) return cmo;
                }
            }
            let left = this.getX();
            let right = left + this.width;
            let top = this.getY();
            let bottom = top + this.height;
            if(this.clickFunc && getMouseX()>=left && getMouseX()<right && getMouseY()>=top && getMouseY()<bottom) return this;
        }
        return null;
    }

    isHovered(){
        return UI.mouseOver===this;     // onclick parameter in constructor is required in order for hovering to work; use any truthy non-function value if clicking the UI does nothing
    }

    clicked(){
        if(this.clickFunc instanceof Function) this.clickFunc();
    }

    show(){
        this.showing = true;
    }

    hide(){
        this.showing = false;
    }

    toggleShow(){
        this.showing = !this.showing;
    }

    remove(){
        let mouseIsHere = false;
        if(this.checkMouseOver()){
            UI.mouseOver = undefined;
            mouseIsHere = true;
        }
        if(this.parent){
            for(let i=this.parent.children.length-1;i>=0;i--){
                if(this.parent.children[i]===this){
                    this.parent.children.splice(i,1);
                    break;
                }
            }
        }else{
            for(let i=UI.elements.length-1;i>=0;i--){
                if(UI.elements[i]===this){
                    UI.elements.splice(i,1);
                    break;
                }
            }
        }
        if(mouseIsHere) UI.updateMouseOver();
    }

    dropChildren(){
        let mouseIsHere = false;
        if(this.checkMouseOver()){
            UI.mouseOver = undefined;
            mouseIsHere = true;
        }
        this.children = [];
        if(mouseIsHere) UI.updateMouseOver();
    }
}

UI.elements = [];

UI.renderAll = function(){
    for(let u of UI.elements){
        push();
        u.render();
        pop();
    }
};

UI.mouseOver = undefined;
UI.focusedInput = undefined;

UI.updateMouseOver = function(){
    for(let i=UI.elements.length-1;i>=0;i--){
        let u = UI.elements[i];
        let mo = u.checkMouseOver();
        if(mo){
            UI.mouseOver = mo;
            return mo;
        }
    }
    UI.mouseOver = null;
    return null;
};

UI.click = function(){
    UI.updateMouseOver();
    if(UI.mouseOver){
        UI.mouseOver.clicked();
        return true;
    }
    return false;
};

// Definitions for all UI elements

UI.init = function(){
    // "scene" wrappers

    mainMenu = new UI(null,0,0,WIDTH,HEIGHT);
    basinCreationMenu = new UI(null,0,0,WIDTH,HEIGHT,undefined,undefined,false);
    loadMenu = new UI(null,0,0,WIDTH,HEIGHT,undefined,undefined,false);
    settingsMenu = new UI(null,0,0,WIDTH,HEIGHT,undefined,undefined,false);
    primaryWrapper = new UI(null,0,0,WIDTH,HEIGHT,function(){
        if(basin){
            if(basin.viewingPresent()) for(let s of basin.activeSystems) s.fetchStorm().renderIcon();
            else for(let s of basin.fetchSeason(viewTick,true).forSystems()) s.renderIcon();
    
            if(Env.displaying>=0 && Env.layerIsOceanic) drawBuffer(envLayer);
            if(!land.drawn){
                finisher = land.draw();
                return;
            }
            drawBuffer(landBuffer);
            if(simSettings.snowLayers){
                if(land.snowDrawn) drawBuffer(snow[floor(map(seasonalSine(viewTick,SNOW_SEASON_OFFSET),-1,1,0,simSettings.snowLayers*10))]);
                else finisher = land.drawSnow();
            }
            if(simSettings.useShader){
                if(land.shaderDrawn) drawBuffer(landShader);
                else finisher = land.drawShader();
            }
            if(Env.displaying>=0 && !Env.layerIsOceanic){
                drawBuffer(envLayer);
                if(!Env.layerIsVector) drawBuffer(coastLine);
            }
            drawBuffer(tracks);
            drawBuffer(forecastTracks);
            drawBuffer(stormIcons);
        }
    },function(){
        helpBox.hide();
        sideMenu.hide();
        if(basin){
            if(basin.godMode && keyIsPressed && basin.viewingPresent()) {
                let g = {x: getMouseX(), y: getMouseY()};
                if(key === "l" || key === "L"){
                    g.sType = "l";
                }else if(key === "d"){
                    g.sType = "d";
                }else if(key === "D"){
                    g.sType = "sd";
                }else if(key === "s"){
                    g.sType = "s";
                }else if(key === "S"){
                    g.sType = "ss";
                }else if(key === "1"){
                    g.sType = "1";
                }else if(key === "2"){
                    g.sType = "2";
                }else if(key === "3"){
                    g.sType = "3";
                }else if(key === "4"){
                    g.sType = "4";
                }else if(key === "5"){
                    g.sType = "5";
                }else if(key === "x" || key === "X"){
                    g.sType = "x";
                }else return;
                basin.spawn(false,g);
            }else if(basin.viewingPresent()){
                let mVector = createVector(getMouseX(),getMouseY());
                for(let i=basin.activeSystems.length-1;i>=0;i--){
                    let s = basin.activeSystems[i].fetchStorm();
                    let p = s.getStormDataByTick(viewTick,true).pos;
                    if(p.dist(mVector)<DIAMETER){
                        selectStorm(s);
                        refreshTracks(true);
                        return;
                    }
                }
                selectStorm();
                refreshTracks(true);
            }else{
                let vSeason = basin.fetchSeason(viewTick,true);
                let mVector = createVector(getMouseX(),getMouseY());
                for(let i=vSeason.systems.length-1;i>=0;i--){
                    let s = vSeason.fetchSystemAtIndex(i);
                    if(s && s.aliveAt(viewTick)){
                        let p = s.getStormDataByTick(viewTick).pos;
                        if(p.dist(mVector)<DIAMETER){
                            selectStorm(s);
                            refreshTracks(true);
                            return;
                        }
                    }
                }
                selectStorm();
                refreshTracks(true);
            }
        }
    },false);
    areYouSure = new UI(null,0,0,WIDTH,HEIGHT,function(){
        fill(COLORS.UI.box);
        noStroke();
        this.fullRect();
    },true,false);

    // main menu

    mainMenu.append(false,WIDTH/2,HEIGHT/4,0,0,function(){  // title text
        fill(COLORS.UI.text);
        noStroke();
        textAlign(CENTER,CENTER);
        textSize(36);
        text(TITLE,0,0);
        textSize(18);
        textStyle(ITALIC);
        text("Simulate your own monster storms!",0,40);
    });

    mainMenu.append(false,WIDTH/2-100,HEIGHT/2-20,200,40,function(){    // "New Basin" button
        fill(COLORS.UI.buttonBox);
        noStroke();
        this.fullRect();
        if(this.isHovered()){
            fill(COLORS.UI.buttonHover);
            this.fullRect();
        }
        fill(COLORS.UI.text);
        textAlign(CENTER,CENTER);
        textSize(24);
        text("New Basin",100,20);
    },function(){
        mainMenu.hide();
        basinCreationMenu.show();
    }).append(false,0,60,200,40,function(){     // load button
        fill(COLORS.UI.buttonBox);
        noStroke();
        this.fullRect();
        if(this.isHovered()){
            fill(COLORS.UI.buttonHover);
            this.fullRect();
        }
        fill(COLORS.UI.text);
        textAlign(CENTER,CENTER);
        textSize(24);
        text("Load Basin",100,20);
    },function(){
        mainMenu.hide();
        loadMenu.show();
        loadMenu.loadables = {};
    }).append(false,0,60,200,40,function(){     // settings menu button
        fill(COLORS.UI.buttonBox);
        noStroke();
        this.fullRect();
        if(this.isHovered()){
            fill(COLORS.UI.buttonHover);
            this.fullRect();
        }
        fill(COLORS.UI.text);
        textAlign(CENTER,CENTER);
        textSize(24);
        text("Settings",100,20);
    },function(){
        mainMenu.hide();
        settingsMenu.show();
    })/*.append(false,0,60,200,40,function(){     // test test test
        fill("white");
        stroke("black");
        this.fullRect();
        noStroke();
        if(this.isHovered()){
            fill(COLORS.UI.buttonHover);
            this.fullRect();
        }
        fill(COLORS.UI.text);
        textAlign(CENTER,CENTER);
        textSize(24);
        text(textInput.value,100,20);
    },function(){
        textInput.focus();
        UI.focusedInput = this;
    })*/;

    // basin creation menu

    basinCreationMenu.append(false,WIDTH/2,HEIGHT/16,0,0,function(){ // menu title text
        fill(COLORS.UI.text);
        noStroke();
        textAlign(CENTER,CENTER);
        textSize(36);
        text("New Basin Settings",0,0);
    });

    let hemsel = basinCreationMenu.append(false,WIDTH/2-150,HEIGHT/8,300,30,function(){   // hemisphere selector
        fill(COLORS.UI.buttonBox);
        noStroke();
        this.fullRect();
        if(this.isHovered()){
            fill(COLORS.UI.buttonHover);
            this.fullRect();
        }
        fill(COLORS.UI.text);
        textAlign(CENTER,CENTER);
        textSize(18);
        let hem = "Random";
        if(newBasinSettings.hem===1) hem = "Northern";
        if(newBasinSettings.hem===2) hem = "Southern";
        text("Hemisphere: "+hem,150,15);
    },function(){
        if(newBasinSettings.hem===undefined) newBasinSettings.hem = 1;
        else{
            newBasinSettings.hem++;
            newBasinSettings.hem %= 3;
        }
    });

    let yearsel = hemsel.append(false,0,45,0,30,function(){ // Year selector
        let yName;
        if(newBasinSettings.year===undefined) yName = "Current year";
        else{
            let y = newBasinSettings.year;
            let h;
            if(newBasinSettings.hem===1) h = false;
            if(newBasinSettings.hem===2) h = true;
            if(h===undefined){
                yName = seasonName(y,false) + " or " + seasonName(y,true);
            }else yName = seasonName(y,h);
        }
        textAlign(CENTER,CENTER);
        text("Starting year: "+yName,150,15);
    });
    
    yearsel.append(false,0,0,20,10,function(){ // Year increment button
        fill(COLORS.UI.buttonBox);
        this.fullRect();
        if(this.isHovered()){
            fill(COLORS.UI.buttonHover);
            this.fullRect();
        }
        fill(COLORS.UI.text);
        triangle(2,8,10,2,18,8);
    },function(){
        if(newBasinSettings.year===undefined){
            if(newBasinSettings.hem===2) newBasinSettings.year = SHEM_DEFAULT_YEAR + 1;
            else newBasinSettings.year = NHEM_DEFAULT_YEAR + 1;
        }else newBasinSettings.year++;
    }).append(false,0,20,20,10,function(){  // Year decrement button
        fill(COLORS.UI.buttonBox);
        this.fullRect();
        if(this.isHovered()){
            fill(COLORS.UI.buttonHover);
            this.fullRect();
        }
        fill(COLORS.UI.text);
        triangle(2,2,18,2,10,8);
    },function(){
        if(newBasinSettings.year===undefined){
            if(newBasinSettings.hem===2) newBasinSettings.year = SHEM_DEFAULT_YEAR - 1;
            else newBasinSettings.year = NHEM_DEFAULT_YEAR - 1;
        }else newBasinSettings.year--;
    });

    yearsel.append(false,0,45,300,30,function(){    // Activity mode selector
        fill(COLORS.UI.buttonBox);
        noStroke();
        this.fullRect();
        if(this.isHovered()){
            fill(COLORS.UI.buttonHover);
            this.fullRect();
        }
        fill(COLORS.UI.text);
        textAlign(CENTER,CENTER);
        textSize(18);
        let mode = newBasinSettings.hyper ? "Hyper" : "Normal";
        text("Activity Mode: "+mode,150,15);
    },function(){
        newBasinSettings.hyper = !newBasinSettings.hyper;
    }).append(false,0,45,300,30,function(){     // Name list selector
        fill(COLORS.UI.buttonBox);
        noStroke();
        this.fullRect();
        if(this.isHovered()){
            fill(COLORS.UI.buttonHover);
            this.fullRect();
        }
        fill(COLORS.UI.text);
        textAlign(CENTER,CENTER);
        textSize(18);
        let list = newBasinSettings.names || 0;
        list = ["Atl","EPac","CPac","WPac","PAGASA","Aus","Atl 1979-1984","NIO","SWIO","SPac","SAtl","Jakarta","Port Moresby"][list];
        text("Name List: "+list,150,15);
    },function(){
        if(newBasinSettings.names===undefined) newBasinSettings.names = 0;
        newBasinSettings.names++;
        newBasinSettings.names %= NAME_LIST_PRESETS.length;
    }).append(false,0,45,300,30,function(){     // Hurricane term selector
        fill(COLORS.UI.buttonBox);
        noStroke();
        this.fullRect();
        if(this.isHovered()){
            fill(COLORS.UI.buttonHover);
            this.fullRect();
        }
        fill(COLORS.UI.text);
        textAlign(CENTER,CENTER);
        textSize(18);
        let term = newBasinSettings.hurrTerm || 0;
        text("Hurricane-Strength Term: "+HURRICANE_STRENGTH_TERM[term],150,15);
    },function(){
        if(newBasinSettings.hurrTerm===undefined) newBasinSettings.hurrTerm = 0;
        newBasinSettings.hurrTerm++;
        newBasinSettings.hurrTerm %= HURRICANE_STRENGTH_TERM.length;
    }).append(false,0,45,300,30,function(){     // Map type Selector
        fill(COLORS.UI.buttonBox);
        noStroke();
        this.fullRect();
        if(this.isHovered()){
            fill(COLORS.UI.buttonHover);
            this.fullRect();
        }
        fill(COLORS.UI.text);
        textAlign(CENTER,CENTER);
        textSize(18);
        let maptype = ["Two Continents","East Continent","West Continent","Island Ocean","Central Continent","Central Inland Sea"][newBasinSettings.mapType || 0];
        text("Map Type: "+maptype,150,15);
    },function(){
        if(newBasinSettings.mapType===undefined) newBasinSettings.mapType = 0;
        newBasinSettings.mapType++;
        newBasinSettings.mapType %= MAP_TYPES.length;
    }).append(false,0,45,300,30,function(){     // God mode Selector
        fill(COLORS.UI.buttonBox);
        noStroke();
        this.fullRect();
        if(this.isHovered()){
            fill(COLORS.UI.buttonHover);
            this.fullRect();
        }
        fill(COLORS.UI.text);
        textAlign(CENTER,CENTER);
        textSize(18);
        let gMode = newBasinSettings.godMode ? "Enabled" : "Disabled";
        text("God Mode: "+gMode,150,15);
    },function(){
        newBasinSettings.godMode = !newBasinSettings.godMode;
    });

    basinCreationMenu.append(false,WIDTH/2-150,7*HEIGHT/8-20,300,30,function(){    // "Start" button
        fill(COLORS.UI.buttonBox);
        noStroke();
        this.fullRect();
        if(this.isHovered()){
            fill(COLORS.UI.buttonHover);
            this.fullRect();
        }
        fill(COLORS.UI.text);
        textAlign(CENTER,CENTER);
        textSize(20);
        text("Start",this.width/2,this.height/2);
    },function(){
        init();
        basinCreationMenu.hide();
    }).append(false,0,40,300,30,function(){ // "Cancel" button
        fill(COLORS.UI.buttonBox);
        noStroke();
        this.fullRect();
        if(this.isHovered()){
            fill(COLORS.UI.buttonHover);
            this.fullRect();
        }
        fill(COLORS.UI.text);
        textAlign(CENTER,CENTER);
        textSize(20);
        text("Cancel",this.width/2,this.height/2);
    },function(){
        basinCreationMenu.hide();
        mainMenu.show();
    });

    // load menu

    loadMenu.loadables = {}; // cache that stores whether the save slot has a loadable basin or not

    loadMenu.append(false,WIDTH/2,HEIGHT/8,0,0,function(){ // menu title text
        fill(COLORS.UI.text);
        noStroke();
        textAlign(CENTER,CENTER);
        textSize(36);
        text("Load Basin",0,0);
    });

    let getslotloadable = function(s){
        let l = loadMenu.loadables[s];
        if(l===undefined){
            let f = localStorage.getItem(Basin.storagePrefix(s) + LOCALSTORAGE_KEY_FORMAT);
            l = loadMenu.loadables[s] = f===null ? 0 : f>=EARLIEST_COMPATIBLE_FORMAT ? 1 : -1;
        }
        return l;
    };

    let loadbuttonrender = function(){
        fill(COLORS.UI.buttonBox);
        noStroke();
        this.fullRect();
        if(this.isHovered()){
            fill(COLORS.UI.buttonHover);
            this.fullRect();
        }
        let loadable = getslotloadable(this.slotNum);
        if(loadable<1) fill(COLORS.UI.greyText);
        else fill(COLORS.UI.text);
        textAlign(CENTER,CENTER);
        textSize(18);
        let label = "Slot ";
        label += this.slotNum;
        if(this.slotNum===0) label += " (Autosave)";
        if(loadable<0) label += " [Incompatible]";
        text(label,150,15);
    };

    let loadbuttonclick = function(){
        let loadable = getslotloadable(this.slotNum);
        if(loadable>0){
            init(this.slotNum);
            loadMenu.hide();
            loadMenu.loadables = {};
        }
    };

    let loadbuttons = [];

    for(let i=0;i<SAVE_SLOTS;i++){
        let x = i===0 ? WIDTH/2-150 : 0;
        let y = i===0 ? HEIGHT/4 : 40;
        loadbuttons[i] = loadMenu.append(1,x,y,300,30,loadbuttonrender,loadbuttonclick);
        loadbuttons[i].slotNum = i;
    }

    loadMenu.append(1,0,40,300,30,function(){ // "Cancel" button
        fill(COLORS.UI.buttonBox);
        noStroke();
        this.fullRect();
        if(this.isHovered()){
            fill(COLORS.UI.buttonHover);
            this.fullRect();
        }
        fill(COLORS.UI.text);
        textAlign(CENTER,CENTER);
        textSize(20);
        text("Cancel",this.width/2,this.height/2);
    },function(){
        loadMenu.hide();
        mainMenu.show();
        loadMenu.loadables = {};
    });

    let delbuttonrender = function(){
        fill(COLORS.UI.buttonBox);
        noStroke();
        this.fullRect();
        if(this.isHovered()){
            fill(COLORS.UI.buttonHover);
            this.fullRect();
        }
        let exists = getslotloadable(this.parent.slotNum);
        if(exists) fill(COLORS.UI.text);
        else fill(COLORS.UI.greyText);
        textAlign(CENTER,CENTER);
        textSize(18);
        text("Del",this.width/2,this.height/2);
    };

    let delbuttonclick = function(){
        let s = this.parent.slotNum;
        if(getslotloadable(s)){
            areYouSure.dialog(()=>{
                Basin.deleteSave(s);
                loadMenu.loadables = {};
            });
        }
    };

    for(let i=0;i<SAVE_SLOTS;i++) loadbuttons[i].append(false,315,0,40,30,delbuttonrender,delbuttonclick);

    // Settings Menu

    settingsMenu.append(false,WIDTH/2,HEIGHT/8,0,0,function(){ // menu title text
        fill(COLORS.UI.text);
        noStroke();
        textAlign(CENTER,CENTER);
        textSize(36);
        text("Settings",0,0);
    });

    settingsMenu.append(false,WIDTH/2-150,HEIGHT/4,300,30,function(){   // storm intensity indicator
        fill(COLORS.UI.buttonBox);
        noStroke();
        this.fullRect();
        if(this.isHovered()){
            fill(COLORS.UI.buttonHover);
            this.fullRect();
        }
        fill(COLORS.UI.text);
        textAlign(CENTER,CENTER);
        textSize(18);
        let b = simSettings.showStrength ? "Enabled" : "Disabled";
        text("Intensity Indicator: "+b,150,15);
    },function(){
        simSettings.setShowStrength("toggle");
    }).append(false,0,45,300,30,function(){     // autosaving
        fill(COLORS.UI.buttonBox);
        noStroke();
        this.fullRect();
        if(this.isHovered()){
            fill(COLORS.UI.buttonHover);
            this.fullRect();
        }
        fill(COLORS.UI.text);
        textAlign(CENTER,CENTER);
        textSize(18);
        let b = simSettings.doAutosave ? "Enabled" : "Disabled";
        text("Autosaving: "+b,150,15);
    },function(){
        simSettings.setDoAutosave("toggle");
    }).append(false,0,45,300,30,function(){     // track mode
        fill(COLORS.UI.buttonBox);
        noStroke();
        this.fullRect();
        if(this.isHovered()){
            fill(COLORS.UI.buttonHover);
            this.fullRect();
        }
        fill(COLORS.UI.text);
        textAlign(CENTER,CENTER);
        textSize(18);
        let m = ["Active TC Tracks","Full Active Tracks","Season Summary","No Tracks"][simSettings.trackMode];
        text("Track Mode: "+m,150,15);
    },function(){
        simSettings.setTrackMode("incmod",4);
        refreshTracks(true);
    }).append(false,0,45,300,30,function(){     // snow
        fill(COLORS.UI.buttonBox);
        noStroke();
        this.fullRect();
        if(this.isHovered()){
            fill(COLORS.UI.buttonHover);
            this.fullRect();
        }
        fill(COLORS.UI.text);
        textAlign(CENTER,CENTER);
        textSize(18);
        let b = simSettings.snowLayers ? (simSettings.snowLayers*10) + " layers" : "Disabled";
        text("Snow: "+b,150,15);
    },function(){
        simSettings.setSnowLayers("incmod",floor(MAX_SNOW_LAYERS/10)+1);
        if(land) land.clearSnow();
    }).append(false,0,45,300,30,function(){     // shader
        fill(COLORS.UI.buttonBox);
        noStroke();
        this.fullRect();
        if(this.isHovered()){
            fill(COLORS.UI.buttonHover);
            this.fullRect();
        }
        fill(COLORS.UI.text);
        textAlign(CENTER,CENTER);
        textSize(18);
        let b = simSettings.useShader ? "Enabled" : "Disabled";
        text("Land Shader: "+b,150,15);
    },function(){
        simSettings.setUseShader("toggle");
    });

    settingsMenu.append(false,WIDTH/2-150,7*HEIGHT/8-20,300,30,function(){ // "Back" button
        fill(COLORS.UI.buttonBox);
        noStroke();
        this.fullRect();
        if(this.isHovered()){
            fill(COLORS.UI.buttonHover);
            this.fullRect();
        }
        fill(COLORS.UI.text);
        textAlign(CENTER,CENTER);
        textSize(20);
        text("Back",this.width/2,this.height/2);
    },function(){
        settingsMenu.hide();
        if(basin) primaryWrapper.show();
        else mainMenu.show();
    });

    // Are you sure dialog

    areYouSure.append(false,WIDTH/2,HEIGHT/4,0,0,function(){ // dialog text
        fill(COLORS.UI.text);
        noStroke();
        textAlign(CENTER,CENTER);
        textSize(36);
        text("Are You Sure?",0,0);
    });

    areYouSure.append(false,WIDTH/2-108,HEIGHT/4+100,100,30,function(){ // "Yes" button
        fill(COLORS.UI.buttonBox);
        noStroke();
        this.fullRect();
        if(this.isHovered()){
            fill(COLORS.UI.buttonHover);
            this.fullRect();
        }
        fill(COLORS.UI.text);
        textAlign(CENTER,CENTER);
        textSize(20);
        text("Yes",this.width/2,this.height/2);
    },function(){
        if(areYouSure.action){
            areYouSure.action();
            areYouSure.action = undefined;
        }
        else console.error("No action tied to areYouSure dialog");
        areYouSure.hide();
    }).append(false,116,0,100,30,function(){ // "No" button
        fill(COLORS.UI.buttonBox);
        noStroke();
        this.fullRect();
        if(this.isHovered()){
            fill(COLORS.UI.buttonHover);
            this.fullRect();
        }
        fill(COLORS.UI.text);
        textAlign(CENTER,CENTER);
        textSize(20);
        text("No",this.width/2,this.height/2);
    },function(){
        areYouSure.hide();
    });

    areYouSure.dialog = function(action){
        if(action instanceof Function){
            areYouSure.action = action;
            areYouSure.show();
        }
    };

    // primary "in sim" scene

    let topBar = primaryWrapper.append(false,0,0,WIDTH,30,function(){   // Top bar
        fill(COLORS.UI.bar);
        noStroke();
        this.fullRect();
        textSize(18);
    },false);

    topBar.append(false,5,3,100,24,function(){  // Date indicator
        let txtStr = basin.tickMoment(viewTick).format(TIME_FORMAT) + (basin.viewingPresent() ? '' : ' [Analysis]');
        this.setBox(undefined,undefined,textWidth(txtStr)+6);
        if(this.isHovered()){
            fill(COLORS.UI.buttonHover);
            this.fullRect();
        }
        fill(COLORS.UI.text);
        textAlign(LEFT,TOP);
        text(txtStr,3,3);
    },function(){
        dateNavigator.toggleShow();
    });

    dateNavigator = primaryWrapper.append(false,0,30,140,50,function(){     // Analysis navigator panel
        fill(COLORS.UI.box);
        noStroke();
        this.fullRect();
    },true,false);

    let navButtonRend = function(){     // Navigator button render function
        if(this.isHovered()){
            fill(COLORS.UI.buttonHover);
            this.fullRect();
        }
        if(paused) fill(COLORS.UI.text);
        else fill(COLORS.UI.greyText);
        if(this.metadata%2===0) triangle(2,8,10,2,18,8);
        else triangle(2,2,18,2,10,8);
    };

    let navButtonClick = function(){    // Navigator button click function
        if(paused){
            let m = basin.tickMoment(viewTick);
            switch(this.metadata){
                case 0:
                m.add(TICK_DURATION*ADVISORY_TICKS,"ms");
                break;
                case 1:
                m.subtract(TICK_DURATION*ADVISORY_TICKS,"ms");
                break;
                case 2:
                m.add(1,"M");
                break;
                case 3:
                m.subtract(1,"M");
                break;
                case 4:
                m.add(1,"d");
                break;
                case 5:
                m.subtract(1,"d");
                break;
                case 6:
                m.add(1,"y");
                break;
                case 7:
                m.subtract(1,"y");
                break;
            }
            let t = basin.tickFromMoment(m);
            if(this.metadata%2===0 && t%ADVISORY_TICKS!==0) t = floor(t/ADVISORY_TICKS)*ADVISORY_TICKS;
            if(this.metadata%2!==0 && t%ADVISORY_TICKS!==0) t = ceil(t/ADVISORY_TICKS)*ADVISORY_TICKS;
            if(t>basin.tick) t = basin.tick;
            if(t<0) t = 0;
            let os = basin.getSeason(viewTick);
            let ns = basin.getSeason(t);
            viewTick = t;
            refreshTracks(ns!==os);
            Env.displayLayer();
        }
    };

    for(let i=0;i<8;i++){   // Navigator buttons
        let x = floor(i/2)*30+15;
        let y = i%2===0 ? 10 : 30;
        let button = dateNavigator.append(false,x,y,20,10,navButtonRend,navButtonClick);
        button.metadata = i;
    }

    topBar.append(false,WIDTH-29,3,24,24,function(){    // Toggle button for storm info panel
        if(this.isHovered()){
            fill(COLORS.UI.buttonHover);
            this.fullRect();
        }
        fill(COLORS.UI.text);
        if(stormInfoPanel.showing) triangle(6,15,18,15,12,9);
        else triangle(6,9,18,9,12,15);
    },function(){
        if(!stormInfoPanel.showing) stormInfoPanel.target = selectedStorm || basin.getSeason(viewTick);
        stormInfoPanel.toggleShow();
    }).append(false,-29,0,24,24,function(){  // Pause/resume button
        if(this.isHovered()){
            fill(COLORS.UI.buttonHover);
            this.fullRect();
        }
        fill(COLORS.UI.text);
        if(paused) triangle(3,3,21,12,3,21);
        else{
            rect(5,3,5,18);
            rect(14,3,5,18);
        }
    },function(){
        paused = !paused;
    }).append(false,-105,0,100,24,function(){  // Pause/speed/selected storm indicator
        let txtStr = "";
        if(selectedStorm){
            let sName = selectedStorm.getFullNameByTick(viewTick);
            let sData = selectedStorm.getStormDataByTick(viewTick);
            if(sData){
                let sKts = sData ? sData.windSpeed : 0;
                let sMph = ktsToMph(sKts,WINDSPEED_ROUNDING);
                let sKmh = ktsToKmh(sKts,WINDSPEED_ROUNDING);
                let sPrsr = sData ? sData.pressure: 1031;
                txtStr = sName + ": " + sKts + " kts, " + sMph + " mph, " + sKmh + " km/h / " + sPrsr + " hPa";
            }else{
                sName = selectedStorm.getFullNameByTick("peak");
                txtStr = sName + " - ACE: " + selectedStorm.ACE;
            }
        }else txtStr = paused ? "Paused" : (simSpeed===0 ? "Full-" : simSpeed===1 ? "Half-" : "1/" + pow(2,simSpeed) + " ") + "Speed";
        let newW = textWidth(txtStr)+6;
        this.setBox(-newW-5,undefined,newW);
        if(this.isHovered()){
            fill(COLORS.UI.buttonHover);
            this.fullRect();
        }
        fill(COLORS.UI.text);
        textAlign(RIGHT,TOP);
        text(txtStr,this.width-3,3);
    },function(){
        if(!selectedStorm) paused = !paused;
        else{
            stormInfoPanel.target = selectedStorm;
            stormInfoPanel.show();
        }
    });

    let bottomBar = primaryWrapper.append(false,0,HEIGHT-30,WIDTH,30,function(){    // Bottom bar
        fill(COLORS.UI.bar);
        noStroke();
        this.fullRect();
        textSize(18);
    },false);

    bottomBar.append(false,5,3,24,24,function(){    // Side menu button
        if(this.isHovered()){
            fill(COLORS.UI.buttonHover);
            this.fullRect();
        }
        fill(COLORS.UI.text);
        rect(3,6,18,2);
        rect(3,11,18,2);
        rect(3,16,18,2);
        if(storageQuotaExhausted){
            fill(COLORS.UI.redText);
            textAlign(CENTER,TOP);
            text("!",24,3);
        }
    },function(){
        sideMenu.toggleShow();
        saveBasinAsPanel.hide();
    }).append(false,29,0,100,24,function(){   // Map layer/environmental field indicator
        let txtStr = "Map Layer: ";
        if(Env.displaying!==-1){
            let f = Env.fieldList[Env.displaying];
            txtStr += f + " -- ";
            let x;
            let y;
            let s = selectedStorm && selectedStorm.aliveAt(viewTick);
            if(s){
                let p = selectedStorm.getStormDataByTick(viewTick,true).pos;
                x = p.x;
                y = p.y;
            }else{
                x = getMouseX();
                y = getMouseY();
            }
            if(x >= WIDTH || x < 0 || y >= HEIGHT || y < 0 || (Env.fields[f].oceanic && land.get(x,y))){
                txtStr += "N/A";
            }else{
                let v = Env.get(f,x,y,viewTick);
                if(v===null) txtStr += "Unavailable";
                else if(Env.fields[f].isVectorField){
                    let m = v.mag();
                    let h = v.heading();
                    txtStr += "(a: " + (round(h*1000)/1000) + ", m: " + (round(m*1000)/1000) + ")";
                }else txtStr += round(v*1000)/1000;
            }
            txtStr += " @ " + (s ? "selected storm" : "mouse pointer / finger");
        }else txtStr += "none";
        this.setBox(undefined,undefined,textWidth(txtStr)+6);
        if(this.isHovered()){
            fill(COLORS.UI.buttonHover);
            this.fullRect();
        }
        fill(COLORS.UI.text);
        textAlign(LEFT,TOP);
        text(txtStr,3,3);
    },function(){
        Env.displayNext();
    });

    bottomBar.append(false,WIDTH-29,3,24,24,function(){  // Help button
        if(this.isHovered()){
            fill(COLORS.UI.buttonHover);
            this.fullRect();
        }
        fill(COLORS.UI.text);
        textAlign(CENTER,CENTER);
        textSize(22);
        text("?",12,12);
    },function(){
        helpBox.toggleShow();
    });

    stormInfoPanel = primaryWrapper.append(false,3*WIDTH/4,topBar.height,WIDTH/4,HEIGHT-topBar.height-bottomBar.height,function(){
        let s = this.target;
        fill(COLORS.UI.box);
        noStroke();
        this.fullRect();
        fill(COLORS.UI.text);
        textAlign(CENTER,TOP);
        textSize(18);
        const txtW = 7*this.width/8;
        if(s instanceof Storm){
            let n = s.getFullNameByTick("peak");
            n = wrapText(n,txtW);
            let nameHeight = countTextLines(n)*textLeading();
            text(n,this.width/2,35);
            textSize(15);
            let txt = "";
            let formTime;
            let dissTime;
            if(s.TC){
                formTime = basin.tickMoment(s.formationTime).format(TIME_FORMAT);
                dissTime = basin.tickMoment(s.dissipationTime).format(TIME_FORMAT);
                txt += "Dates active: " + formTime + " - " + (s.dissipationTime ? dissTime : "currently active");
            }else txt += "Dates active: N/A";
            txt += "\nPeak pressure: " + (s.peak ? s.peak.pressure : "N/A");
            txt += "\nWind speed @ peak: " + (s.peak ? s.peak.windSpeed + " kts" : "N/A");
            txt += "\nACE: " + s.ACE;
            txt += "\nDamage: " + damageDisplayNumber(s.damage);
            txt += "\nDeaths: " + s.deaths;
            txt = wrapText(txt,txtW);
            text(txt,this.width/2,35+nameHeight);
        }else{
            let n = seasonName(s);
            n = wrapText(n,txtW);
            let nh = countTextLines(n)*textLeading();
            text(n,this.width/2,35);
            textSize(15);
            let se = basin.fetchSeason(s);
            let txt = "Depressions: " + se.depressions;
            txt += "\nNamed storms: " + se.namedStorms;
            txt += "\n" + HURRICANE_STRENGTH_TERM[basin.hurricaneStrengthTerm] + "s: " + se.hurricanes;
            txt += "\nMajor " + HURRICANE_STRENGTH_TERM[basin.hurricaneStrengthTerm] + "s: " + se.majors;
            txt += "\nCategory 5s: " + se.c5s;
            txt += "\nTotal ACE: " + se.ACE;
            txt += "\nDamage: " + damageDisplayNumber(se.damage);
            txt += "\nDeaths: " + se.deaths;
            txt = wrapText(txt,txtW);
            text(txt,this.width/2,35+nh);
        }
    },true,false);

    stormInfoPanel.append(false,3,3,24,24,function(){   // info panel previous season button
        if(this.isHovered()){
            fill(COLORS.UI.buttonHover);
            this.fullRect();
        }
        fill(COLORS.UI.greyText);
        let s = stormInfoPanel.target;
        if(!(s instanceof Storm) && s>basin.getSeason(0)) fill(COLORS.UI.text);
        triangle(19,5,19,19,5,12);
    },function(){
        let s = stormInfoPanel.target;
        if(!(s instanceof Storm) && s>basin.getSeason(0)) stormInfoPanel.target--;
    });
    
    stormInfoPanel.append(false,stormInfoPanel.width-27,3,24,24,function(){ // info panel next season button
        if(this.isHovered()){
            fill(COLORS.UI.buttonHover);
            this.fullRect();
        }
        fill(COLORS.UI.greyText);
        let s = stormInfoPanel.target;
        if(!(s instanceof Storm) && s<basin.getSeason(-1)) fill(COLORS.UI.text);
        triangle(5,5,5,19,19,12);
    },function(){
        let s = stormInfoPanel.target;
        if(!(s instanceof Storm) && s<basin.getSeason(-1)) stormInfoPanel.target++;
    });
    
    stormInfoPanel.append(false,30,3,stormInfoPanel.width-60,24,function(){ // info panel "Jump to" button
        if(this.isHovered()){
            fill(COLORS.UI.buttonHover);
            this.fullRect();
        }
        fill(COLORS.UI.greyText);
        if(paused && stormInfoPanel.target!==undefined) fill(COLORS.UI.text);
        textAlign(CENTER,CENTER);
        textSize(15);
        text("Jump to",this.width/2,this.height/2);
    },function(){
        if(paused && stormInfoPanel.target!==undefined){
            let s = stormInfoPanel.target;
            let t;
            if(s instanceof Storm){
                t = s.birthTime;
                t = ceil(t/ADVISORY_TICKS)*ADVISORY_TICKS;
            }else{
                t = basin.seasonTick(s);
            }
            let os = basin.getSeason(viewTick);
            let ns = basin.getSeason(t);
            viewTick = t;
            refreshTracks(ns!==os);
            Env.displayLayer();
        }
    });

    stormInfoPanel.append(false,30,stormInfoPanel.height-27,stormInfoPanel.width-60,24,function(){
        if(this.isHovered()){
            fill(COLORS.UI.buttonHover);
            this.fullRect();
        }
        fill(COLORS.UI.text);
        textAlign(CENTER,CENTER);
        textSize(15);
        text("Show Timeline",this.width/2,this.height/2);
    },function(){
        timelineBox.toggleShow();
    });

    let buildtimeline = function(){
        let tb = timelineBox;
        tb.parts = [];
        let plotWidth = tb.width*0.9;
        let target = stormInfoPanel.target;
        if(target!==undefined && !(target instanceof Storm)){
            let s = basin.fetchSeason(target);
            let TCs = [];
            let beginSeasonTick;
            let endSeasonTick;
            for(let sys of s.forSystems()){
                if(sys.TC && (basin.getSeason(sys.formationTime)===target || basin.getSeason(sys.formationTime)<target && (sys.dissipationTime===undefined || basin.getSeason(sys.dissipationTime-1)>=target))){
                    TCs.push(sys);
                    let dissTime = sys.dissipationTime || basin.tick;
                    if(beginSeasonTick===undefined || sys.formationTime<beginSeasonTick) beginSeasonTick = sys.formationTime;
                    if(endSeasonTick===undefined || dissTime>endSeasonTick) endSeasonTick = dissTime;
                }
            }
            for(let n=0;n<TCs.length-1;n++){
                let t0 = TCs[n];
                let t1 = TCs[n+1];
                if(t0.formationTime>t1.formationTime){
                    TCs[n] = t1;
                    TCs[n+1] = t0;
                    if(n>0) n -= 2;
                }
            }
            let sMoment = basin.tickMoment(beginSeasonTick);
            tb.sMonth = sMoment.month();
            sMoment.startOf('month');
            let beginPlotTick = basin.tickFromMoment(sMoment);
            let eMoment = basin.tickMoment(endSeasonTick);
            eMoment.endOf('month');
            let endPlotTick = basin.tickFromMoment(eMoment);
            tb.months = eMoment.diff(sMoment,'months') + 1;
            for(let t of TCs){
                let part = {};
                part.segments = [];
                part.label = t.named ?
                    ({
                        'Alpha':'\u03B1',
                        'Beta':'\u03B2',
                        'Gamma':'\u03B3',
                        'Delta':'\u03B4',
                        'Epsilon':'\u03B5',
                        'Zeta':'\u03B6',
                        'Eta':'\u03B7',
                        'Theta':'\u03B8',
                        'Iota':'\u03B9',
                        'Kappa':'\u03BA',
                        'Lambda':'\u03BB',
                        'Mu':'\u03BC',
                        'Nu':'\u03BD',
                        'Xi':'\u03BE',
                        'Omicron':'\u03BF',
                        'Pi':'\u03C0',
                        'Rho':'\u03C1',
                        'Sigma':'\u03C3',
                        'Tau':'\u03C4',
                        'Upsilon':'\u03C5',
                        'Phi':'\u03C6',
                        'Chi':'\u03C7',
                        'Psi':'\u03C8',
                        'Omega':'\u03C9'
                    })[t.name] || t.name.slice(0,1) :
                    t.depressionNum + '';
                let aSegment;
                for(let q=0;q<t.record.length;q++){
                    let rt = ceil(t.birthTime/ADVISORY_TICKS)*ADVISORY_TICKS + q*ADVISORY_TICKS;
                    let d = t.record[q];
                    if(tropOrSub(d.type)){
                        let cat = d.getCat();
                        if(!aSegment){
                            aSegment = {};
                            part.segments.push(aSegment);
                            aSegment.startTick = rt;
                            aSegment.maxCat = cat;
                            aSegment.fullyTrop = (d.type===TROP);
                        }
                        if(cat > aSegment.maxCat) aSegment.maxCat = cat;
                        aSegment.fullyTrop = aSegment.fullyTrop || (d.type===TROP);
                        aSegment.endTick = rt;
                    }else if(aSegment) aSegment = undefined;
                }
                for(let q=0;q<part.segments.length;q++){
                    let seg = part.segments[q];
                    seg.startX = map(seg.startTick,beginPlotTick,endPlotTick,0,plotWidth);
                    seg.endX = map(seg.endTick,beginPlotTick,endPlotTick,0,plotWidth);
                }
                let rowFits;
                part.row = -1;
                let labelZone = 20;
                do{
                    part.row++;
                    rowFits = true;
                    for(let q=0;q<tb.parts.length;q++){
                        let p = tb.parts[q];
                        let thisS = part.segments[0].startX;
                        let thisE = part.segments[part.segments.length-1].endX + labelZone;
                        let otherS = p.segments[0].startX;
                        let otherE = p.segments[p.segments.length-1].endX + labelZone;
                        if(p.row===part.row){
                            if(thisS>=otherS && thisS<=otherE ||
                                thisE>=otherS && thisE<=otherE ||
                                otherS>=thisS && otherS<=thisE ||
                                otherE>=thisS && otherE<=thisE) rowFits = false;
                        }
                    }
                }while(!rowFits);
                tb.parts.push(part);
            }
        }else{
            tb.months = 12;
            tb.sMonth = 0;
        }
        tb.builtFor = target;
        tb.builtAt = basin.tick;
    };

    timelineBox = primaryWrapper.append(false,WIDTH/16,HEIGHT/4,7*WIDTH/8,HEIGHT/2,function(){
        let target = stormInfoPanel.target;
        if(target!==this.builtFor || (target===basin.getSeason(-1) && basin.tick!==this.builtAt)) buildtimeline();
        fill(COLORS.UI.box);
        noStroke();
        this.fullRect();
        stroke(COLORS.UI.text);
        let w = this.width;
        let h = this.height;
        let lBound = w*0.05;
        let rBound = w*0.95;
        let tBound = h*0.2;
        let bBound = h*0.85;
        line(lBound,bBound,rBound,bBound);
        line(lBound,bBound,lBound,tBound);
        fill(COLORS.UI.text);
        textAlign(CENTER,TOP);
        textSize(13);
        let M = ['J','F','M','A','M','J','J','A','S','O','N','D'];
        for(let i=0;i<this.months;i++){
            stroke(COLORS.UI.text);
            let x0 = map(i+1,0,this.months,lBound,rBound);
            let x1 = map(i+0.5,0,this.months,lBound,rBound);
            line(x0,bBound,x0,tBound);
            noStroke();
            text(M[(i+this.sMonth)%12],x1,bBound+h*0.02);
        }
        noStroke();
        textSize(18);
        let t;
        if(target===undefined) t = "none";
        else if(target instanceof Storm) t = "WIP";
        else t = seasonName(target);
        text("Timeline of " + t,w*0.5,h*0.05);
        for(let i=0;i<this.parts.length;i++){
            let p = this.parts[i];
            let y = tBound+p.row*15;
            for(let j=0;j<p.segments.length;j++){
                let s = p.segments[j];
                if(s.fullyTrop) fill(getColor(s.maxCat,TROP));
                else fill(getColor(s.maxCat,SUBTROP));
                rect(lBound+s.startX,y,max(s.endX-s.startX,1),10);
            }
            let labelLeftBound = lBound + p.segments[p.segments.length-1].endX;
            fill(COLORS.UI.text);
            textAlign(LEFT,CENTER);
            textSize(12);
            text(p.label,labelLeftBound+5,y+5);
        }
    },true,false);

    timelineBox.months = 12;
    timelineBox.sMonth = 0;
    timelineBox.parts = [];
    timelineBox.builtAt = undefined;
    timelineBox.builtFor = undefined;

    timelineBox.append(false,timelineBox.width-30,10,20,20,function(){
        if(this.isHovered()){
            fill(COLORS.UI.buttonHover);
            this.fullRect();
        }
        fill(COLORS.UI.text);
        textAlign(CENTER,CENTER);
        textSize(22);
        text("X",10,10);
    },function(){
        timelineBox.hide();
    });

    let returntomainmenu = function(){
        sideMenu.hide();
        stormInfoPanel.hide();
        timelineBox.hide();
        primaryWrapper.hide();
        land.clear();
        for(let t in basin.seasonExpirationTimers) clearTimeout(basin.seasonExpirationTimers[t]);
        basin = undefined;
        mainMenu.show();
    };

    sideMenu = primaryWrapper.append(false,0,topBar.height,WIDTH/4,HEIGHT-topBar.height-bottomBar.height,function(){
        fill(COLORS.UI.box);
        noStroke();
        this.fullRect();
        fill(COLORS.UI.text);
        textAlign(CENTER,TOP);
        textSize(18);
        text("Menu",this.width/2,10);
        if(storageQuotaExhausted){
            textSize(14);
            fill(COLORS.UI.redText);
            text("localStorage quota for origin\n" + origin + "\nexceeded; unable to save",this.width/2,this.height-60);
        }
    },true,false);

    sideMenu.append(false,5,30,sideMenu.width-10,25,function(){ // Save and return to main menu button
        if(this.isHovered()){
            fill(COLORS.UI.buttonHover);
            this.fullRect();
        }
        if(!storageQuotaExhausted) fill(COLORS.UI.text);
        else fill(COLORS.UI.greyText);
        textAlign(CENTER,CENTER);
        textSize(15);
        text("Save and Return to Main Menu",this.width/2,this.height/2);
    },function(){
        if(!storageQuotaExhausted){
            if(basin.saveSlot===0) saveBasinAsPanel.invoke(true);
            else{
                basin.save();
                returntomainmenu();
            }
        }
    }).append(false,0,30,sideMenu.width-10,25,function(){   // Return to main menu w/o saving button
        if(this.isHovered()){
            fill(COLORS.UI.buttonHover);
            this.fullRect();
        }
        fill(COLORS.UI.text);
        textAlign(CENTER,CENTER);
        textSize(15);
        text("Return to Main Menu w/o Saving",this.width/2,this.height/2);
    },function(){
        areYouSure.dialog(returntomainmenu);
    }).append(false,0,30,sideMenu.width-10,25,function(){   // Save basin button
        if(this.isHovered()){
            fill(COLORS.UI.buttonHover);
            this.fullRect();
        }
        if(!storageQuotaExhausted) fill(COLORS.UI.text);
        else fill(COLORS.UI.greyText);
        textAlign(CENTER,CENTER);
        textSize(15);
        let txt = "Save Basin";
        if(basin.tick===basin.lastSaved) txt += " [Saved]";
        text(txt,this.width/2,this.height/2);
    },function(){
        if(!storageQuotaExhausted){
            if(basin.saveSlot===0) saveBasinAsPanel.invoke();
            else basin.save();
        }
    }).append(false,0,30,sideMenu.width-10,25,function(){   // Save basin as button
        if(this.isHovered()){
            fill(COLORS.UI.buttonHover);
            this.fullRect();
        }
        if(!storageQuotaExhausted) fill(COLORS.UI.text);
        else fill(COLORS.UI.greyText);
        textAlign(CENTER,CENTER);
        textSize(15);
        text("Save Basin As...",this.width/2,this.height/2);
    },function(){
        if(!storageQuotaExhausted) saveBasinAsPanel.invoke();
    }).append(false,0,30,sideMenu.width-10,25,function(){   // Settings menu button
        if(this.isHovered()){
            fill(COLORS.UI.buttonHover);
            this.fullRect();
        }
        fill(COLORS.UI.text);
        textAlign(CENTER,CENTER);
        textSize(15);
        text("Settings",this.width/2,this.height/2);
    },function(){
        primaryWrapper.hide();
        settingsMenu.show();
        paused = true;
    });

    saveBasinAsPanel = sideMenu.append(false,sideMenu.width,0,sideMenu.width*3/4,sideMenu.height/2,function(){
        fill(COLORS.UI.box);
        noStroke();
        this.fullRect();
        fill(COLORS.UI.text);
        textAlign(CENTER,TOP);
        textSize(18);
        text("Save Basin As...",this.width/2,10);
        stroke(0);
        line(0,0,0,this.height);
    },true,false);

    saveBasinAsPanel.invoke = function(exit){
        saveBasinAsPanel.exit = exit;
        saveBasinAsPanel.toggleShow();
    };
    
    let saveslotbuttonrender = function(){
        noStroke();
        if(this.isHovered()){
            fill(COLORS.UI.buttonHover);
            this.fullRect();
        }
        if(!storageQuotaExhausted) fill(COLORS.UI.text);
        else fill(COLORS.UI.greyText);
        textAlign(CENTER,CENTER);
        textSize(15);
        let slotOccupied = getslotloadable(this.slotNum);
        let txt = "Slot " + this.slotNum;
        if(basin.saveSlot===this.slotNum) txt += " [This]";
        else if(slotOccupied) txt += " [Overwrite]";
        text(txt,this.width/2,this.height/2);
    };

    let saveslotbuttonclick = function(){
        if(!storageQuotaExhausted){
            if(basin.saveSlot===this.slotNum){
                basin.save();
                loadMenu.loadables = {};
                saveBasinAsPanel.hide();
            }else{
                let slotOccupied = getslotloadable(this.slotNum);
                let f = ()=>{
                    basin.saveAs(this.slotNum);
                    loadMenu.loadables = {};
                    saveBasinAsPanel.hide();
                    if(saveBasinAsPanel.exit) returntomainmenu();
                };
                if(slotOccupied) areYouSure.dialog(f);
                else f();
            }
        }
    };

    for(let i=1;i<SAVE_SLOTS;i++){  // 1-indexed as to not include the autosave slot 0
        let x = i===1 ? 5 : 0;
        let y = i===1 ? 40 : 30;
        let b = saveBasinAsPanel.append(0,x,y,saveBasinAsPanel.width-10,25,saveslotbuttonrender,saveslotbuttonclick);
        b.slotNum = i;
    }

    helpBox = primaryWrapper.append(false,WIDTH/8,HEIGHT/8,3*WIDTH/4,3*HEIGHT/4,function(){
        fill(COLORS.UI.box);
        noStroke();
        this.fullRect();
        fill(COLORS.UI.text);
        textAlign(LEFT,TOP);
        textSize(18);
        text(HELP_TEXT,10,10);
    },true,false);

    helpBox.append(false,helpBox.width-30,10,20,20,function(){
        if(this.isHovered()){
            fill(COLORS.UI.buttonHover);
            this.fullRect();
        }
        fill(COLORS.UI.text);
        textAlign(CENTER,CENTER);
        textSize(22);
        text("X",10,10);
    },function(){
        helpBox.hide();
    });
};

function mouseInCanvas(){
    return getMouseX() >= 0 && getMouseX() < WIDTH && getMouseY() >= 0 && getMouseY() < HEIGHT;
}

function mouseClicked(){
    if(mouseInCanvas()){
        UI.click();
        return false;
    }
}

function selectStorm(s){
    if(s instanceof Storm){
        selectedStorm = s;
        stormInfoPanel.target = s;
    }else selectedStorm = undefined;
}

function keyPressed(){
    // console.log("keyPressed: " + key + " / " + keyCode);
    if(document.activeElement === textInput){
        if(keyCode === ENTER){
            textInput.blur();
            return false;
        }
        return;
    }
    keyRepeatFrameCounter = -1;
    switch(key){
        case " ":
        if(basin && primaryWrapper.showing) paused = !paused;
        break;
        case "a":
        if(basin && paused && primaryWrapper.showing) advanceSim();
        break;
        case "w":
        simSettings.setShowStrength("toggle");
        break;
        case "e":
        if(basin) Env.displayNext();
        break;
        case "t":
        simSettings.setTrackMode("incmod",4);
        refreshTracks(true);
        break;
        default:
        switch(keyCode){
            case KEY_LEFT_BRACKET:
            simSpeed++;
            if(simSpeed>5) simSpeed=5;
            break;
            case KEY_RIGHT_BRACKET:
            simSpeed--;
            if(simSpeed<0) simSpeed=0;
            break;
            case KEY_F11:
            toggleFullscreen();
            break;
            default:
            return;
        }
    }
    return false;
}

function deviceTurned(){
    toggleFullscreen();
}

function wrapText(str,w){
    let newStr = "";
    for(let i = 0, j = 0;i<str.length;i=j){
        if(str.charAt(i)==='\n'){
            i++;
            j++;
            newStr += '\n';
            continue;
        }
        j = str.indexOf('\n',i);
        if(j===-1) j = str.length;
        let line = str.slice(i,j);
        while(textWidth(line)>w){
            let k=0;
            while(textWidth(line.slice(0,k))<=w) k++;
            k--;
            if(k<1){
                newStr += line.charAt(0) + '\n';
                line = line.slice(1);
                continue;
            }
            let l = line.lastIndexOf(' ',k-1);
            if(l!==-1){
                newStr += line.slice(0,l) + '\n';
                line = line.slice(l+1);
                continue;
            }
            let sub = line.slice(0,k);
            l = sub.search(/\W(?=\w*$)/);
            if(l!==-1){
                newStr += line.slice(0,l+1) + '\n';
                line = line.slice(l+1);
                continue;
            }
            newStr += sub + '\n';
            line = line.slice(k);
        }
        newStr += line;
    }
    return newStr;
}

function countTextLines(str){
    let l = 1;
    for(let i=0;i<str.length;i++) if(str.charAt(i)==='\n') l++;
    return l;
}

function ktsToMph(k,rnd){
    let val = k*1.15078;
    if(rnd) val = round(val/rnd)*rnd;
    return val;
}

function ktsToKmh(k,rnd){
    let val = k*1.852;
    if(rnd) val = round(val/rnd)*rnd;
    return val;
}

function damageDisplayNumber(d){
    if(d===0) return "none";
    if(d<50000000) return "minimal";
    if(d<1000000000) return "$ " + (round(d/1000)/1000) + " M";
    if(d<1000000000000) return "$ " + (round(d/1000000)/1000) + " B";
    return "$ " + (round(d/1000000000)/1000) + " T";
}

function seasonName(y,h){
    if(h===undefined) h = basin && basin.SHem;
    if(h){
        return (y-1) + "-" + (y%100<10 ? "0" : "") + (y%100);
    }
    return y + "";
}