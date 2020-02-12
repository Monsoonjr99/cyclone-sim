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
        if(renderer instanceof Array){
            let size = renderer[0];
            let charLimit = renderer[1];
            let enterFunc = renderer[2];
            this.isInput = true;
            this.value = '';
            this.clickFunc = function(){
                textInput.value = this.value;
                if(charLimit) textInput.maxLength = charLimit;
                else textInput.removeAttribute('maxlength');
                textInput.focus();
                UI.focusedInput = this;
                if(onclick instanceof Function) onclick.call(this,UI.focusedInput===this);
            };
            this.textCanvas = createBuffer(this.width,this.height);
            this.renderFunc = function(s){
                s.input(size);
            };
            if(enterFunc) this.enterFunc = enterFunc;
        }else{
            this.clickFunc = onclick;
            this.isInput = false;
        }
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
            if(this.renderFunc) this.renderFunc(this.schematics());
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

    schematics(){
        let s = {};
        s.fullRect = ()=>{
            rect(0,0,this.width,this.height);
        };
        s.button = (txt,box,size,grey)=>{
            noStroke();
            if(box){
                fill(COLORS.UI.buttonBox);
                s.fullRect();
            }
            if(this.isHovered()){
                fill(COLORS.UI.buttonHover);
                s.fullRect();
            }
            if(grey) fill(COLORS.UI.greyText);
            else fill(COLORS.UI.text);
            textAlign(CENTER,CENTER);
            textSize(size || 18);
            text(txt,this.width/2,this.height/2);
        };
        s.input = (size)=>{
            fill(COLORS.UI.input);
            if(UI.focusedInput===this) stroke(COLORS.UI.text);
            else{
                if(this.isHovered()){
                    noStroke();
                    s.fullRect();
                    fill(COLORS.UI.buttonHover);
                }
                stroke(COLORS.UI.nonSelectedInput);
            }
            s.fullRect();
            let c = this.textCanvas;
            c.clear();
            c.noStroke();
            c.fill(COLORS.UI.text);
            c.textSize(size || 18);
            let t = UI.focusedInput===this ? textInput.value : this.value;
            let xAnchor;
            if(UI.focusedInput===this){
                c.textAlign(LEFT,CENTER);
                let caret1X = c.textWidth(t.slice(0,textInput.selectionStart));
                let caret2X = c.textWidth(t.slice(0,textInput.selectionEnd));
                if(caret2X>this.width-5) xAnchor = this.width-5-caret2X;
                else xAnchor = 5;
                caret1X += xAnchor;
                caret2X += xAnchor;
                c.text(t,xAnchor,this.height/2);
                if(textInput.selectionStart===textInput.selectionEnd){
                    c.stroke(COLORS.UI.text);
                    c.noFill();
                    if(millis()%1000<500) c.line(caret1X,this.height/8,caret1X,7*this.height/8);
                }else{
                    c.rect(caret1X,this.height/8,caret2X-caret1X,3*this.height/4);
                    c.fill(COLORS.UI.input);
                    c.text(t.slice(textInput.selectionStart,textInput.selectionEnd),caret1X,this.height/2);
                }
            }else{
                if(c.textWidth(t)>this.width-5){
                    c.textAlign(RIGHT,CENTER);
                    xAnchor = this.width-5;
                }else{
                    c.textAlign(LEFT,CENTER);
                    xAnchor = 5;
                }
                c.text(t,xAnchor,this.height/2);
            }
            image(c,0,0);
        };
        return s;
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

UI.viewBasin = undefined;
// UI.viewTick = undefined;

// Definitions for all UI elements

UI.init = function(){
    // hoist!

    let yearselbox;

    // "scene" wrappers

    mainMenu = new UI(null,0,0,WIDTH,HEIGHT);
    basinCreationMenu = new UI(null,0,0,WIDTH,HEIGHT,undefined,function(){
        yearselbox.enterFunc();
    },false);
    loadMenu = new UI(null,0,0,WIDTH,HEIGHT,undefined,undefined,false);
    settingsMenu = new UI(null,0,0,WIDTH,HEIGHT,undefined,undefined,false);
    primaryWrapper = new UI(null,0,0,WIDTH,HEIGHT,function(s){
        if(UI.viewBasin instanceof Basin){
            let basin = UI.viewBasin;
            if(basin.viewingPresent()) for(let S of basin.activeSystems) S.fetchStorm().renderIcon();
            else{
                let seas = basin.fetchSeason(viewTick,true);
                if(seas) for(let S of seas.forSystems(true)) S.renderIcon();
            }
    
            if(!land.drawn){
                renderToDo = land.draw();
                return;
            }
            let drawMagGlass = ()=>{
                if(simSettings.showMagGlass){
                    let magMeta = buffers.get(magnifyingGlass);
                    image(
                        magnifyingGlass,
                        getMouseX()-magMeta.baseWidth/2,
                        getMouseY()-magMeta.baseHeight/2,
                        magMeta.baseWidth,
                        magMeta.baseHeight
                    );
                }
            };
            drawBuffer(outBasinBuffer);
            if(basin.env.displaying>=0 && basin.env.layerIsOceanic){
                drawBuffer(envLayer);
                drawMagGlass();
            }
            drawBuffer(landBuffer);
            if(simSettings.snowLayers){
                if(land.snowDrawn) drawBuffer(snow[floor(map(seasonalSine(viewTick,SNOW_SEASON_OFFSET),-1,1,0,simSettings.snowLayers*10))]);
                else renderToDo = land.drawSnow();
            }
            if(simSettings.useShader){
                if(land.shaderDrawn) drawBuffer(landShader);
                else renderToDo = land.drawShader();
            }
            if(basin.env.displaying>=0 && !basin.env.layerIsOceanic){
                drawBuffer(envLayer);
                drawMagGlass();
                if(!basin.env.layerIsVector) drawBuffer(coastLine);
            }
            // let sub = land.getSubBasin(getMouseX(),getMouseY());
            // if(basin.subBasins[sub] instanceof SubBasin && basin.subBasins[sub].mapOutline) drawBuffer(basin.subBasins[sub].mapOutline);   // test
            drawBuffer(tracks);
            drawBuffer(forecastTracks);
            drawBuffer(stormIcons);
        }
    },function(){
        helpBox.hide();
        sideMenu.hide();
        seedBox.hide();
        if(UI.viewBasin instanceof Basin){
            let basin = UI.viewBasin;
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
                }else if(key === "6"){
                    g.sType = "6";
                }else if(key === "7"){
                    g.sType = "7";
                }else if(key === "8"){
                    g.sType = "8";
                }else if(key === "9"){
                    g.sType = "9";
                }else if(key === "0"){
                    g.sType = "10";
                }else if(key === "y" || key === "Y"){
                    g.sType = "y";
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
                if(vSeason){
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
        }
    },false);
    areYouSure = new UI(null,0,0,WIDTH,HEIGHT,function(s){
        fill(COLORS.UI.box);
        noStroke();
        s.fullRect();
    },true,false);

    // main menu

    mainMenu.append(false,WIDTH/2,HEIGHT/4,0,0,function(s){  // title text
        fill(COLORS.UI.text);
        noStroke();
        textAlign(CENTER,CENTER);
        textSize(36);
        text(TITLE,0,0);
        textSize(18);
        textStyle(ITALIC);
        text("Simulate your own monster storms!",0,40);
    });

    mainMenu.append(false,WIDTH/2-100,HEIGHT/2-20,200,40,function(s){    // "New Basin" button
        s.button('New Basin',true,24);
    },function(){
        mainMenu.hide();
        basinCreationMenu.show();
    }).append(false,0,60,200,40,function(s){     // load button
        s.button('Load Basin',true,24);
    },function(){
        mainMenu.hide();
        loadMenu.show();
        loadMenu.refresh();
    }).append(false,0,60,200,40,function(s){     // settings menu button
        s.button('Settings',true,24);
    },function(){
        mainMenu.hide();
        settingsMenu.show();
    });

    // basin creation menu

    basinCreationMenu.append(false,WIDTH/2,HEIGHT/16,0,0,function(s){ // menu title text
        fill(COLORS.UI.text);
        noStroke();
        textAlign(CENTER,CENTER);
        textSize(36);
        text("New Basin Settings",0,0);
    });

    let basinCreationMenuButtonSpacing = 36;
    let basinCreationMenuButtonHeights = 28;

    let hemsel = basinCreationMenu.append(false,WIDTH/2-150,HEIGHT/8,300,basinCreationMenuButtonHeights,function(s){   // hemisphere selector
        let hem = "Random";
        if(newBasinSettings.hem===1) hem = "Northern";
        if(newBasinSettings.hem===2) hem = "Southern";
        s.button('Hemisphere: '+hem,true);
    },function(){
        yearselbox.enterFunc();
        if(newBasinSettings.hem===undefined) newBasinSettings.hem = 1;
        else{
            newBasinSettings.hem++;
            newBasinSettings.hem %= 3;
        }
    });

    let yearsel = hemsel.append(false,0,basinCreationMenuButtonSpacing,0,basinCreationMenuButtonHeights,function(s){ // Year selector
        textAlign(LEFT,CENTER);
        text("Starting year: ",0,basinCreationMenuButtonHeights/2);
    });

    yearsel.append(false,110,0,190,basinCreationMenuButtonHeights,function(s){
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
        textAlign(LEFT,CENTER);
        let fontSize = 18;
        textSize(fontSize);
        while(textWidth(yName)>this.width-10 && fontSize>8){
            fontSize--;
            textSize(fontSize);
        }
        s.button(yName,true,fontSize);
    },function(){
        yearselbox.toggleShow();
        if(yearselbox.showing) yearselbox.clicked();
    });

    yearselbox = yearsel.append(false,110,0,190,basinCreationMenuButtonHeights,[18,16,function(){
        if(yearselbox.showing){
            let v = yearselbox.value;
            let m = v.match(/^\s*(\d+)(\s+B\.?C\.?(?:E\.?)?)?(?:\s*-\s*(\d+))?(?:\s+(?:(B\.?C\.?(?:E\.?)?)|A\.?D\.?|C\.?E\.?))?\s*$/i);
            if(m){
                let bce = m[2] || m[4];
                let bce2 = m[4];
                let year1 = parseInt(m[1]);
                if(bce) year1 = 1-year1;
                let year2;
                if(m[3]){
                    year2 = parseInt(m[3]);
                    if(bce2) year2 = 1-year2;
                    if(year1+1===year2 || (year1+1)%100===year2) newBasinSettings.year = year1+1;
                    else newBasinSettings.year = undefined;
                }else newBasinSettings.year = year1;
            }else if(v!=='') newBasinSettings.year = undefined;
            if(newBasinSettings.year && !moment.utc([newBasinSettings.year,0,1]).isValid()) newBasinSettings.year = undefined;
            yearselbox.value = '';
            yearselbox.hide();
        }
    }],undefined,false);

    let gmodesel = yearsel.append(false,0,basinCreationMenuButtonSpacing,300,basinCreationMenuButtonHeights,function(s){    // Simulation mode selector
        let mode = newBasinSettings.actMode || 0;
        mode = SIMULATION_MODES[mode];
        s.button('Simulation Mode: '+mode,true);
    },function(){
        yearselbox.enterFunc();
        if(newBasinSettings.actMode===undefined) newBasinSettings.actMode = 0;
        newBasinSettings.actMode++;
        newBasinSettings.actMode %= SIMULATION_MODES.length;
    }).append(false,0,basinCreationMenuButtonSpacing,300,basinCreationMenuButtonHeights,function(s){    // Scale selector
        let scale = newBasinSettings.scale || 0;
        scale = Scale.presetScales[scale].displayName;
        s.button('Scale: '+scale,true);
    },function(){
        yearselbox.enterFunc();
        if(newBasinSettings.scale===undefined) newBasinSettings.scale = 0;
        newBasinSettings.scale++;
        newBasinSettings.scale %= Scale.presetScales.length;
        newBasinSettings.scaleFlavor = 0;
        newBasinSettings.scaleColorScheme = 0;
    }).append(false,0,basinCreationMenuButtonSpacing,300,basinCreationMenuButtonHeights,function(s){     // Scale flavor selector
        let scale = newBasinSettings.scale || 0;
        scale = Scale.presetScales[scale];
        let flavor = newBasinSettings.scaleFlavor || 0;
        let grey = scale.flavorDisplayNames.length<2;
        s.button('Scale Flavor: '+(scale.flavorDisplayNames[flavor] || 'N/A'),true,18,grey);
    },function(){
        yearselbox.enterFunc();
        let scale = newBasinSettings.scale || 0;
        scale = Scale.presetScales[scale];
        if(scale.flavorDisplayNames.length<2) return;
        if(newBasinSettings.scaleFlavor===undefined) newBasinSettings.scaleFlavor = 0;
        newBasinSettings.scaleFlavor++;
        newBasinSettings.scaleFlavor %= scale.flavorDisplayNames.length;
    }).append(false,0,basinCreationMenuButtonSpacing,300,basinCreationMenuButtonHeights,function(s){     // Scale color scheme selector
        let scale = newBasinSettings.scale || 0;
        scale = Scale.presetScales[scale];
        let scheme = newBasinSettings.scaleColorScheme || 0;
        let grey = scale.colorSchemeDisplayNames.length<2;
        s.button('Scale Color Scheme: '+(scale.colorSchemeDisplayNames[scheme] || 'N/A'),true,18,grey);
    },function(){
        yearselbox.enterFunc();
        let scale = newBasinSettings.scale || 0;
        scale = Scale.presetScales[scale];
        if(scale.colorSchemeDisplayNames.length<2) return;
        if(newBasinSettings.scaleColorScheme===undefined) newBasinSettings.scaleColorScheme = 0;
        newBasinSettings.scaleColorScheme++;
        newBasinSettings.scaleColorScheme %= scale.colorSchemeDisplayNames.length;
    }).append(false,0,basinCreationMenuButtonSpacing,300,basinCreationMenuButtonHeights,function(s){     // Name list selector
        let list = newBasinSettings.names || 0;
        list = ["Atl","EPac","CPac","WPac","PAGASA","Aus","Atl 1979-1984","NIO","SWIO","SPac","SAtl","Jakarta","Port Moresby","Periodic Table","Periodic Table (Annual)"][list];
        s.button('Name List: '+list,true);
    },function(){
        yearselbox.enterFunc();
        if(newBasinSettings.names===undefined) newBasinSettings.names = 0;
        newBasinSettings.names++;
        newBasinSettings.names %= NAME_LIST_PRESETS.length;
    }).append(false,0,basinCreationMenuButtonSpacing,300,basinCreationMenuButtonHeights,function(s){     // Map type Selector
        let maptype = ["Two Continents","East Continent","West Continent","Island Ocean","Central Continent","Central Inland Sea","Atlantic",'Eastern Pacific','Western Pacific','Northern Indian Ocean','Australian Region','South Pacific','South-West Indian Ocean'][newBasinSettings.mapType || 0];
        s.button('Map Type: '+maptype,true);
    },function(){
        yearselbox.enterFunc();
        if(newBasinSettings.mapType===undefined) newBasinSettings.mapType = 0;
        newBasinSettings.mapType++;
        newBasinSettings.mapType %= MAP_TYPES.length;
    }).append(false,0,basinCreationMenuButtonSpacing,300,basinCreationMenuButtonHeights,function(s){     // God mode Selector
        let gMode = newBasinSettings.godMode ? "Enabled" : "Disabled";
        s.button('God Mode: '+gMode,true);
    },function(){
        yearselbox.enterFunc();
        newBasinSettings.godMode = !newBasinSettings.godMode;
    });

    let seedsel = gmodesel.append(false,0,basinCreationMenuButtonSpacing,0,basinCreationMenuButtonHeights,function(s){
        textAlign(LEFT,CENTER);
        text('Seed:',0,basinCreationMenuButtonHeights/2);
    }).append(false,50,0,250,basinCreationMenuButtonHeights,[18,16],function(){
        yearselbox.enterFunc();
    });

    basinCreationMenu.append(false,WIDTH/2-150,7*HEIGHT/8-20,300,basinCreationMenuButtonHeights,function(s){    // "Start" button
        s.button("Start",true,20);
    },function(){
        yearselbox.enterFunc();
        let seed = seedsel.value;
        if(/^-?\d+$/g.test(seed)) newBasinSettings.seed = parseInt(seed);
        else newBasinSettings.seed = hashCode(seed);
        seedsel.value = '';
        let opts = {};
        if(newBasinSettings.hem===1) opts.hem = false;
        else if(newBasinSettings.hem===2) opts.hem = true;
        else opts.hem = random()<0.5;
        opts.year = opts.hem ? SHEM_DEFAULT_YEAR : NHEM_DEFAULT_YEAR;
        if(newBasinSettings.year!==undefined) opts.year = newBasinSettings.year;
        for(let o of [
            'seed',
            'actMode',
            'names',
            'mapType',
            'godMode',
            'scale',
            'scaleFlavor',
            'scaleColorScheme'
        ]) opts[o] = newBasinSettings[o];
        let basin = new Basin(false,opts);
        newBasinSettings = {};
        basin.initialized.then(()=>{
            basin.mount();
        });
        basinCreationMenu.hide();
    }).append(false,0,basinCreationMenuButtonSpacing,300,basinCreationMenuButtonHeights,function(s){ // "Cancel" button
        s.button("Cancel",true,20);
    },function(){
        yearselbox.value = '';
        yearselbox.hide();
        basinCreationMenu.hide();
        mainMenu.show();
    });

    // load menu

    loadMenu.loadables = []; // cache that stores a list of saved basins and if they are loadable
    loadMenu.page = 0;

    loadMenu.append(false,WIDTH/2,HEIGHT/8,0,0,function(s){ // menu title text
        fill(COLORS.UI.text);
        noStroke();
        textAlign(CENTER,CENTER);
        textSize(36);
        text("Load Basin",0,0);
    });

    loadMenu.refresh = function(){
        loadMenu.loadables = [];
        waitForAsyncProcess(()=>{
            return db.transaction('r',db.saves,()=>{
                let col = db.saves.orderBy('format');
                let saveNames = col.primaryKeys();
                let formats = col.keys();
                return Promise.all([saveNames,formats]);
            }).then(res=>{
                let saveNames = res[0];
                let formats = res[1];
                for(let i=0;i<saveNames.length;i++){
                    loadMenu.loadables.push({
                        saveName: saveNames[i],
                        format: formats[i]
                    });
                }
                loadMenu.loadables.sort((a,b)=>{
                    a = a.saveName;
                    b = b.saveName;
                    if(a===AUTOSAVE_SAVE_NAME) return -1;
                    if(b===AUTOSAVE_SAVE_NAME) return 1;
                    return a>b ? 1 : -1;
                });
            });
        },'Fetching Saved Basins...').catch(e=>{
            console.error(e);
        });
    };

    let loadbuttonrender = function(s){
        let b = loadMenu.loadables[loadMenu.page*LOAD_MENU_BUTTONS_PER_PAGE+this.buttonNum];
        let label;
        let loadable;
        if(!b){
            label = '--Empty--';
            loadable = false;
        }else{
            label = b.saveName;
            if(b.format<EARLIEST_COMPATIBLE_FORMAT){
                label += " [Incompatible]";
                loadable = false;
            }else loadable = true;
        }
        let fontSize = 18;
        textSize(fontSize);
        while(textWidth(label)>this.width-10 && fontSize>8){
            fontSize--;
            textSize(fontSize);
        }
        s.button(label,true,fontSize,!loadable);
    };

    let loadbuttonclick = function(){
        let b = loadMenu.loadables[loadMenu.page*LOAD_MENU_BUTTONS_PER_PAGE+this.buttonNum];
        if(b && b.format>=EARLIEST_COMPATIBLE_FORMAT){
            let basin = new Basin(b.saveName);
            basin.initialized.then(()=>{
                basin.mount();
            });
            loadMenu.hide();
        }
    };

    let loadbuttons = [];

    for(let i=0;i<LOAD_MENU_BUTTONS_PER_PAGE;i++){
        let x = i===0 ? WIDTH/2-150 : 0;
        let y = i===0 ? HEIGHT/4 : 40;
        loadbuttons[i] = loadMenu.append(1,x,y,300,30,loadbuttonrender,loadbuttonclick);
        loadbuttons[i].buttonNum = i;
    }

    loadMenu.append(1,0,40,300,30,function(s){ // "Cancel" button
        s.button("Cancel",true,20);
    },function(){
        loadMenu.hide();
        mainMenu.show();
    });

    loadMenu.append(false,WIDTH/2-75,HEIGHT/4-40,30,30,function(s){   // prev page
        s.button('',true,18,loadMenu.page<1);
        triangle(5,15,25,5,25,25);
    },function(){
        if(loadMenu.page>0) loadMenu.page--;
    }).append(false,120,0,30,30,function(s){    // next page
        let grey = loadMenu.page>=ceil(loadMenu.loadables.length/LOAD_MENU_BUTTONS_PER_PAGE)-1;
        s.button('',true,18,grey);
        triangle(5,5,25,15,5,25);
    },function(){
        if(loadMenu.page<ceil(loadMenu.loadables.length/LOAD_MENU_BUTTONS_PER_PAGE)-1) loadMenu.page++;
    });

    let delbuttonrender = function(s){
        let b = loadMenu.loadables[loadMenu.page*LOAD_MENU_BUTTONS_PER_PAGE+this.parent.buttonNum];
        s.button("Del",true,18,!b);
    };

    let delbuttonclick = function(){
        let b = loadMenu.loadables[loadMenu.page*LOAD_MENU_BUTTONS_PER_PAGE+this.parent.buttonNum];
        if(b){
            areYouSure.dialog(()=>{
                Basin.deleteSave(b.saveName,()=>{
                    loadMenu.refresh();
                });
            },'Delete "'+b.saveName+'"?');
        }
    };

    for(let i=0;i<LOAD_MENU_BUTTONS_PER_PAGE;i++) loadbuttons[i].append(false,315,0,40,30,delbuttonrender,delbuttonclick);

    // Settings Menu

    settingsMenu.append(false,WIDTH/2,HEIGHT/8,0,0,function(s){ // menu title text
        fill(COLORS.UI.text);
        noStroke();
        textAlign(CENTER,CENTER);
        textSize(36);
        text("Settings",0,0);
    });

    settingsMenu.append(false,WIDTH/2-150,HEIGHT/4,300,30,function(s){   // storm intensity indicator
        let b = simSettings.showStrength ? "Enabled" : "Disabled";
        s.button("Intensity Indicator: "+b,true);
    },function(){
        simSettings.setShowStrength("toggle");
    }).append(false,0,37,300,30,function(s){     // autosaving
        let b = simSettings.doAutosave ? "Enabled" : "Disabled";
        s.button("Autosaving: "+b,true);
    },function(){
        simSettings.setDoAutosave("toggle");
    }).append(false,0,37,300,30,function(s){     // track mode
        let m = ["Active TC Tracks","Full Active Tracks","Season Summary","No Tracks"][simSettings.trackMode];
        s.button("Track Mode: "+m,true);
    },function(){
        simSettings.setTrackMode("incmod",4);
        refreshTracks(true);
    }).append(false,0,37,300,30,function(s){     // snow
        let b = simSettings.snowLayers ? (simSettings.snowLayers*10) + " layers" : "Disabled";
        s.button("Snow: "+b,true);
    },function(){
        simSettings.setSnowLayers("incmod",floor(MAX_SNOW_LAYERS/10)+1);
        if(land) land.clearSnow();
    }).append(false,0,37,300,30,function(s){     // shader
        let b = simSettings.useShader ? "Enabled" : "Disabled";
        s.button("Land Shader: "+b,true);
    },function(){
        simSettings.setUseShader("toggle");
    }).append(false,0,37,300,30,function(s){     // magnifying glass
        let b = simSettings.showMagGlass ? "Enabled" : "Disabled";
        s.button("Magnifying Glass: "+b,true);
    },function(){
        simSettings.setShowMagGlass("toggle");
        if(UI.viewBasin) UI.viewBasin.env.updateMagGlass();
    }).append(false,0,37,300,30,function(s){     // smooth land color
        let b = simSettings.smoothLandColor ? "Enabled" : "Disabled";
        s.button("Smooth Land Color: "+b,true);
    },function(){
        simSettings.setSmoothLandColor("toggle");
        if(land){
            landBuffer.clear();
            land.drawn = false;
        }
    });

    settingsMenu.append(false,WIDTH/2-150,7*HEIGHT/8-20,300,30,function(s){ // "Back" button
        s.button("Back",true,20);
    },function(){
        settingsMenu.hide();
        if(UI.viewBasin instanceof Basin) primaryWrapper.show();
        else mainMenu.show();
    });

    // Are you sure dialog

    areYouSure.append(false,WIDTH/2,HEIGHT/4,0,0,function(s){ // dialog text
        fill(COLORS.UI.text);
        noStroke();
        textAlign(CENTER,CENTER);
        textSize(36);
        text("Are You Sure?",0,0);
        if(areYouSure.desc){
            textSize(24);
            text(areYouSure.desc,0,50);
        }
    });

    areYouSure.append(false,WIDTH/2-108,HEIGHT/4+100,100,30,function(s){ // "Yes" button
        s.button("Yes",true,20);
    },function(){
        if(areYouSure.action){
            areYouSure.action();
            areYouSure.action = undefined;
        }
        else console.error("No action tied to areYouSure dialog");
        areYouSure.hide();
    }).append(false,116,0,100,30,function(s){ // "No" button
        s.button("No",true,20);
    },function(){
        areYouSure.hide();
    });

    areYouSure.dialog = function(action,desc){
        if(action instanceof Function){
            areYouSure.action = action;
            if(typeof desc === "string") areYouSure.desc = desc;
            else areYouSure.desc = undefined;
            areYouSure.show();
        }
    };

    // primary "in sim" scene

    let topBar = primaryWrapper.append(false,0,0,WIDTH,30,function(s){   // Top bar
        fill(COLORS.UI.bar);
        noStroke();
        s.fullRect();
        textSize(18);
    },false);

    topBar.append(false,5,3,100,24,function(s){  // Date indicator
        if(!(UI.viewBasin instanceof Basin)) return;
        let basin = UI.viewBasin;
        let txtStr = formatDate(basin.tickMoment(viewTick)) + (basin.viewingPresent() ? '' : ' [Analysis]');
        this.setBox(undefined,undefined,textWidth(txtStr)+6);
        if(this.isHovered()){
            fill(COLORS.UI.buttonHover);
            s.fullRect();
        }
        fill(COLORS.UI.text);
        textAlign(LEFT,TOP);
        text(txtStr,3,3);
    },function(){
        dateNavigator.toggleShow();
    });

    dateNavigator = primaryWrapper.append(false,0,30,140,80,function(s){     // Analysis navigator panel
        fill(COLORS.UI.box);
        noStroke();
        s.fullRect();
        fill(COLORS.UI.text);
        textAlign(LEFT,TOP);
        textSize(15);
        text('Y:',15,53);
    },true,false);

    let navButtonRend = function(s){     // Navigator button render function
        s.button('',false,18,!paused);
        if(this.metadata%2===0) triangle(2,8,10,2,18,8);
        else triangle(2,2,18,2,10,8);
    };

    let navButtonClick = function(){    // Navigator button click function
        if(UI.viewBasin instanceof Basin && paused){
            let basin = UI.viewBasin;
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
            changeViewTick(t);
        }
    };

    for(let i=0;i<8;i++){   // Navigator buttons
        let x = floor(i/2)*30+15;
        let y = i%2===0 ? 10 : 30;
        let button = dateNavigator.append(false,x,y,20,10,navButtonRend,navButtonClick);
        button.metadata = i;
    }

    let dateNavYearInput = dateNavigator.append(false,30,50,70,20,[15,5,function(){
        if(!(UI.viewBasin instanceof Basin)) return;
        let basin = UI.viewBasin;
        let v = this.value;
        let n = parseInt(v);
        if(!Number.isNaN(n) && paused){
            let m = basin.tickMoment(viewTick);
            m.year(n);
            let t = basin.tickFromMoment(m);
            if(t%ADVISORY_TICKS!==0) t = floor(t/ADVISORY_TICKS)*ADVISORY_TICKS;
            if(t>basin.tick) t = basin.tick;
            if(t<0) t = 0;
            changeViewTick(t);
            this.value = '';
        }
    }]);

    dateNavYearInput.append(false,80,0,20,20,function(s){
        let v = UI.focusedInput === dateNavYearInput ? textInput.value : dateNavYearInput.value;
        let grey;
        if(Number.isNaN(parseInt(v))) grey = true;
        s.button('',false,15,grey);
        triangle(6,3,17,10,6,17);
        rect(2,8,4,4);
    },function(){
        dateNavYearInput.enterFunc();
    });

    topBar.append(false,WIDTH-29,3,24,24,function(s){    // Toggle button for storm info panel
        s.button('');
        if(stormInfoPanel.showing) triangle(6,15,18,15,12,9);
        else triangle(6,9,18,9,12,15);
    },function(){
        if(!stormInfoPanel.showing) stormInfoPanel.target = selectedStorm || UI.viewBasin.getSeason(viewTick);
        stormInfoPanel.toggleShow();
    }).append(false,-29,0,24,24,function(s){  // Pause/resume button
        s.button('');
        if(paused) triangle(3,3,21,12,3,21);
        else{
            rect(5,3,5,18);
            rect(14,3,5,18);
        }
    },function(){
        paused = !paused;
    }).append(false,-105,0,100,24,function(s){  // Pause/speed/selected storm indicator
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
            s.fullRect();
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

    let bottomBar = primaryWrapper.append(false,0,HEIGHT-30,WIDTH,30,function(s){    // Bottom bar
        fill(COLORS.UI.bar);
        noStroke();
        s.fullRect();
        textSize(18);
    },false);

    bottomBar.append(false,5,3,24,24,function(s){    // Side menu button
        s.button('');
        rect(3,6,18,2);
        rect(3,11,18,2);
        rect(3,16,18,2);
    },function(){
        sideMenu.toggleShow();
        saveBasinAsPanel.hide();
    }).append(false,29,0,100,24,function(s){   // Map layer/environmental field indicator
        let basin = UI.viewBasin;
        let txtStr = "Map Layer: ";
        let red = false;
        if(basin.env.displaying!==-1){
            let f = basin.env.fieldList[basin.env.displaying];
            txtStr += f + " -- ";
            let x;
            let y;
            let S = selectedStorm && selectedStorm.aliveAt(viewTick);
            if(S){
                let p = selectedStorm.getStormDataByTick(viewTick,true).pos;
                x = p.x;
                y = p.y;
            }else{
                x = getMouseX();
                y = getMouseY();
            }
            if(x >= WIDTH || x < 0 || y >= HEIGHT || y < 0 || (basin.env.fields[f].oceanic && land.get(x,y))){
                txtStr += "N/A";
            }else{
                let v = basin.env.get(f,x,y,viewTick);
                if(v===null){
                    txtStr += "Unavailable";
                    red = true;
                }else if(basin.env.fields[f].isVectorField){
                    let m = v.mag();
                    let h = v.heading();
                    txtStr += "(a: " + (round(h*1000)/1000) + ", m: " + (round(m*1000)/1000) + ")";
                }else txtStr += round(v*1000)/1000;
            }
            txtStr += " @ " + (S ? "selected storm" : "mouse pointer / finger");
            if(viewTick<=basin.env.fields[f].accurateAfter){
                txtStr += ' [MAY BE INACCURATE]';
                red = true;
            }
        }else txtStr += "none";
        this.setBox(undefined,undefined,textWidth(txtStr)+6);
        if(this.isHovered()){
            fill(COLORS.UI.buttonHover);
            s.fullRect();
        }
        if(red) fill('red');
        else fill(COLORS.UI.text);
        textAlign(LEFT,TOP);
        text(txtStr,3,3);
    },function(){
        UI.viewBasin.env.displayNext();
    });

    bottomBar.append(false,WIDTH-29,3,24,24,function(s){  // Help button
        s.button("?",false,22);
    },function(){
        helpBox.toggleShow();
    });

    stormInfoPanel = primaryWrapper.append(false,3*WIDTH/4,topBar.height,WIDTH/4,HEIGHT-topBar.height-bottomBar.height,function(s){
        let S = this.target;
        fill(COLORS.UI.box);
        noStroke();
        s.fullRect();
        fill(COLORS.UI.text);
        textAlign(CENTER,TOP);
        textSize(18);
        const txtW = 7*this.width/8;
        if(S instanceof Storm){
            let n = S.getFullNameByTick("peak");
            n = wrapText(n,txtW);
            let nameHeight = countTextLines(n)*textLeading();
            text(n,this.width/2,35);
            textSize(15);
            let txt = "";
            txt += 'Dates active: ';
            if(S.inBasinTC){
                let enterTime = formatDate(UI.viewBasin.tickMoment(S.enterTime));
                let exitTime = formatDate(UI.viewBasin.tickMoment(S.exitTime));
                txt += enterTime;
                if(S.enterTime>S.formationTime) txt += ' (entered basin)';
                txt += ' - ';
                if(S.exitTime){
                    txt += exitTime;
                    if(!S.dissipationTime || S.exitTime<S.dissipationTime) txt += ' (left basin)';
                }else txt += 'currently active';
            }else if(S.TC){
                let formTime = formatDate(UI.viewBasin.tickMoment(S.formationTime));
                let dissTime = formatDate(UI.viewBasin.tickMoment(S.dissipationTime));
                txt += formTime + " - " + (S.dissipationTime ? dissTime : "currently active");
            }else txt += "N/A";
            txt += "\nPeak pressure: " + (S.peak ? S.peak.pressure : "N/A");
            txt += "\nWind speed @ peak: " + (S.peak ? S.peak.windSpeed + " kts" : "N/A");
            txt += "\nACE: " + S.ACE;
            txt += "\nDamage: " + damageDisplayNumber(S.damage);
            txt += "\nDeaths: " + S.deaths;
            txt += "\nLandfalls: " + S.landfalls;
            txt = wrapText(txt,txtW);
            text(txt,this.width/2,35+nameHeight);
        }else{
            let n = seasonName(S);
            n = wrapText(n,txtW);
            let nh = countTextLines(n)*textLeading();
            text(n,this.width/2,35);
            textSize(15);
            let se = UI.viewBasin.fetchSeason(S);
            let txt;
            if(se instanceof Season){
                let stats = se.stats(DEFAULT_MAIN_SUBBASIN);
                let c = stats.classificationCounters;
                let scale = UI.viewBasin.getScale(DEFAULT_MAIN_SUBBASIN);
                txt = '';
                for(let {statName, cNumber} of scale.statDisplay()) txt += statName + ': ' + c[cNumber] + '\n';
                txt += "Total ACE: " + stats.ACE;
                txt += "\nDamage: " + damageDisplayNumber(stats.damage);
                txt += "\nDeaths: " + stats.deaths;
                txt += "\nLandfalls: " + stats.landfalls;
            }else txt = "Season Data Unavailable";
            txt = wrapText(txt,txtW);
            text(txt,this.width/2,35+nh);
        }
    },true,false);

    stormInfoPanel.append(false,3,3,24,24,function(s){   // info panel previous season button
        let S = stormInfoPanel.target;
        s.button('',false,18,(S instanceof Storm) || S<=UI.viewBasin.getSeason(0));
        triangle(19,5,19,19,5,12);
    },function(){
        let s = stormInfoPanel.target;
        if(!(s instanceof Storm) && s>UI.viewBasin.getSeason(0)) stormInfoPanel.target--;
    });
    
    stormInfoPanel.append(false,stormInfoPanel.width-27,3,24,24,function(s){ // info panel next season button
        let S = stormInfoPanel.target;
        s.button('',false,18,(S instanceof Storm) || S>=UI.viewBasin.getSeason(-1));
        triangle(5,5,5,19,19,12);
    },function(){
        let s = stormInfoPanel.target;
        if(!(s instanceof Storm) && s<UI.viewBasin.getSeason(-1)) stormInfoPanel.target++;
    });
    
    stormInfoPanel.append(false,30,3,stormInfoPanel.width-60,24,function(s){ // info panel "Jump to" button
        s.button("Jump to",false,15,!paused || stormInfoPanel.target===undefined);
    },function(){
        if(paused && stormInfoPanel.target!==undefined){
            let s = stormInfoPanel.target;
            let t;
            if(s instanceof Storm){
                if(s.enterTime) t = s.enterTime;
                else if(s.formationTime) t = s.formationTime;
                else t = s.birthTime;
                t = ceil(t/ADVISORY_TICKS)*ADVISORY_TICKS;
            }else{
                t = UI.viewBasin.seasonTick(s);
            }
            changeViewTick(t);
        }
    });

    stormInfoPanel.append(false,30,stormInfoPanel.height-27,stormInfoPanel.width-60,24,function(s){ // show season summary timeline button
        s.button("Show Timeline",false,15);
    },function(){
        timelineBox.toggleShow();
    });

    let buildtimeline = function(){
        let tb = timelineBox;
        tb.parts = [];
        let plotWidth = tb.width*0.9;
        let target = stormInfoPanel.target;
        if(target!==undefined && !(target instanceof Storm)){
            let gen = s=>{
                let TCs = [];
                let beginSeasonTick;
                let endSeasonTick;
                for(let sys of s.forSystems()){
                    if(sys.inBasinTC && (UI.viewBasin.getSeason(sys.enterTime)===target || UI.viewBasin.getSeason(sys.enterTime)<target && (sys.exitTime===undefined || UI.viewBasin.getSeason(sys.exitTime-1)>=target))){
                        TCs.push(sys);
                        let dissTime = sys.exitTime || UI.viewBasin.tick;
                        if(beginSeasonTick===undefined || sys.enterTime<beginSeasonTick) beginSeasonTick = sys.enterTime;
                        if(endSeasonTick===undefined || dissTime>endSeasonTick) endSeasonTick = dissTime;
                    }
                }
                for(let n=0;n<TCs.length-1;n++){
                    let t0 = TCs[n];
                    let t1 = TCs[n+1];
                    if(t0.enterTime>t1.enterTime){
                        TCs[n] = t1;
                        TCs[n+1] = t0;
                        if(n>0) n -= 2;
                    }
                }
                let sMoment = UI.viewBasin.tickMoment(beginSeasonTick);
                tb.sMonth = sMoment.month();
                sMoment.startOf('month');
                let beginPlotTick = UI.viewBasin.tickFromMoment(sMoment);
                let eMoment = UI.viewBasin.tickMoment(endSeasonTick);
                eMoment.endOf('month');
                let endPlotTick = UI.viewBasin.tickFromMoment(eMoment);
                tb.months = eMoment.diff(sMoment,'months') + 1;
                for(let t of TCs){
                    let part = {};
                    part.storm = t;
                    part.segments = [];
                    part.label = t.getNameByTick(-2);
                    let aSegment;
                    for(let q=0;q<t.record.length;q++){
                        let rt = ceil(t.birthTime/ADVISORY_TICKS)*ADVISORY_TICKS + q*ADVISORY_TICKS;
                        let d = t.record[q];
                        if(tropOrSub(d.type)&&land.inBasin(d.pos.x,d.pos.y)){
                            let clsn = UI.viewBasin.getScale(DEFAULT_MAIN_SUBBASIN).get(d);
                            if(!aSegment){
                                aSegment = {};
                                part.segments.push(aSegment);
                                aSegment.startTick = rt;
                                aSegment.maxCat = clsn;
                                aSegment.fullyTrop = (d.type===TROP);
                            }
                            if(clsn > aSegment.maxCat) aSegment.maxCat = clsn;
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
                    textSize(12);
                    let thisLabelZone = textWidth(part.label) + 6;
                    do{
                        part.row++;
                        rowFits = true;
                        for(let q=0;q<tb.parts.length;q++){
                            let p = tb.parts[q];
                            let otherLabelZone = textWidth(p.label) + 6;
                            let thisS = part.segments[0].startX;
                            let thisE = part.segments[part.segments.length-1].endX + thisLabelZone;
                            let otherS = p.segments[0].startX;
                            let otherE = p.segments[p.segments.length-1].endX + otherLabelZone;
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
            };
            if(UI.viewBasin.fetchSeason(target)) gen(UI.viewBasin.fetchSeason(target));
            else{
                tb.months = 12;
                tb.sMonth = 0;
                UI.viewBasin.fetchSeason(target,false,false,s=>{
                    gen(s);
                });
            }
        }else{
            tb.months = 12;
            tb.sMonth = 0;
        }
        tb.builtFor = target;
        tb.builtAt = UI.viewBasin.tick;
    };

    timelineBox = primaryWrapper.append(false,WIDTH/16,HEIGHT/4,7*WIDTH/8,HEIGHT/2,function(s){
        let target = stormInfoPanel.target;
        if(target!==this.builtFor || (UI.viewBasin.tick!==this.builtAt && (UI.viewBasin.getSeason(this.builtAt)===target || UI.viewBasin.getSeason(this.builtAt)===(target+1)))) buildtimeline();
        fill(COLORS.UI.box);
        noStroke();
        s.fullRect();
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
            let mx = getMouseX()-this.getX();
            let my = getMouseY()-this.getY();
            textSize(12);
            if(mx>=lBound+p.segments[0].startX && mx<lBound+p.segments[p.segments.length-1].endX+textWidth(p.label)+6 && my>=y && my<y+10) stroke(255);
            else noStroke();
            for(let j=0;j<p.segments.length;j++){
                let S = p.segments[j];
                fill(UI.viewBasin.getScale(DEFAULT_MAIN_SUBBASIN).getColor(S.maxCat,!S.fullyTrop));
                rect(lBound+S.startX,y,max(S.endX-S.startX,1),10);
            }
            let labelLeftBound = lBound + p.segments[p.segments.length-1].endX;
            fill(COLORS.UI.text);
            textAlign(LEFT,CENTER);
            text(p.label,labelLeftBound+3,y+5);
        }
    },function(){
        let w = this.width;
        let h = this.height;
        let lBound = w*0.05;
        let tBound = h*0.2;
        let newTarget;
        for(let i=this.parts.length-1;i>=0;i--){
            let p = this.parts[i];
            let y = tBound+p.row*15;
            let mx = getMouseX()-this.getX();
            let my = getMouseY()-this.getY();
            textSize(12);
            if(mx>=lBound+p.segments[0].startX && mx<lBound+p.segments[p.segments.length-1].endX+textWidth(p.label)+6 && my>=y && my<y+10){
                newTarget = p.storm;
                break;
            }
        }
        if(newTarget) stormInfoPanel.target = newTarget;
    },false);

    timelineBox.months = 12;
    timelineBox.sMonth = 0;
    timelineBox.parts = [];
    timelineBox.builtAt = undefined;
    timelineBox.builtFor = undefined;

    timelineBox.append(false,timelineBox.width-30,10,20,20,function(s){
        s.button("X",false,22);
    },function(){
        timelineBox.hide();
    });

    let returntomainmenu = function(p){
        sideMenu.hide();
        stormInfoPanel.hide();
        timelineBox.hide();
        primaryWrapper.hide();
        land.clear();
        timelineBox.builtAt = -1;
        for(let t in UI.viewBasin.seasonExpirationTimers) clearTimeout(UI.viewBasin.seasonExpirationTimers[t]);
        for(let s in UI.viewBasin.subBasins){
            let sb = UI.viewBasin.subBasins[s];
            if(sb instanceof SubBasin && sb.mapOutline) sb.mapOutline.remove();
        }
        let wait = ()=>{
            UI.viewBasin = undefined;
            mainMenu.show();
        };
        if(p instanceof Promise) p.then(wait);
        else wait();
    };

    sideMenu = primaryWrapper.append(false,0,topBar.height,WIDTH/4,HEIGHT-topBar.height-bottomBar.height,function(s){
        fill(COLORS.UI.box);
        noStroke();
        s.fullRect();
        fill(COLORS.UI.text);
        textAlign(CENTER,TOP);
        textSize(18);
        text("Menu",this.width/2,10);
    },true,false);

    sideMenu.append(false,5,30,sideMenu.width-10,25,function(s){ // Save and return to main menu button
        s.button("Save and Return to Main Menu",false,15);
    },function(){
        if(UI.viewBasin.saveName===AUTOSAVE_SAVE_NAME) saveBasinAsPanel.invoke(true);
        else{
            returntomainmenu(UI.viewBasin.save());
        }
    }).append(false,0,30,sideMenu.width-10,25,function(s){   // Return to main menu w/o saving button
        s.button("Return to Main Menu w/o Saving",false,15);
    },function(){
        areYouSure.dialog(returntomainmenu);
    }).append(false,0,30,sideMenu.width-10,25,function(s){   // Save basin button
        let txt = "Save Basin";
        if(UI.viewBasin.tick===UI.viewBasin.lastSaved) txt += " [Saved]";
        s.button(txt,false,15);
    },function(){
        if(UI.viewBasin.saveName===AUTOSAVE_SAVE_NAME) saveBasinAsPanel.invoke();
        else UI.viewBasin.save();
    }).append(false,0,30,sideMenu.width-10,25,function(s){   // Save basin as button
        s.button("Save Basin As...",false,15);
    },function(){
        saveBasinAsPanel.invoke();
    }).append(false,0,30,sideMenu.width-10,25,function(s){   // Settings menu button
        s.button("Settings",false,15);
    },function(){
        primaryWrapper.hide();
        settingsMenu.show();
        paused = true;
    }).append(false,0,30,sideMenu.width-10,25,function(s){  // Basin seed button
        s.button('Basin Seed',false,15);
    },function(){
        seedBox.toggleShow();
        if(seedBox.showing) seedBox.clicked();
    });

    saveBasinAsPanel = sideMenu.append(false,sideMenu.width,0,sideMenu.width*3/4,100,function(s){
        fill(COLORS.UI.box);
        noStroke();
        s.fullRect();
        fill(COLORS.UI.text);
        textAlign(CENTER,TOP);
        textSize(18);
        text("Save Basin As...",this.width/2,10);
        stroke(0);
        line(0,0,0,this.height);
    },true,false);

    let saveBasinAsTextBox = saveBasinAsPanel.append(false,5,40,saveBasinAsPanel.width-10,25,[15,32,function(){
        let n = this.value;
        if(n!=='' && n!==AUTOSAVE_SAVE_NAME){
            if(n===UI.viewBasin.saveName){
                UI.viewBasin.save();
                saveBasinAsPanel.hide();
            }else{
                let f = ()=>{
                    let p = UI.viewBasin.saveAs(n);
                    saveBasinAsPanel.hide();
                    if(saveBasinAsPanel.exit) returntomainmenu(p);
                };
                db.saves.where(':id').equals(n).count().then(c=>{
                    if(c>0) areYouSure.dialog(f,'Overwrite "'+n+'"?');
                    else f();
                });
            }
        }
    }]);

    saveBasinAsTextBox.append(false,0,30,saveBasinAsPanel.width-10,25,function(s){
        let n = UI.focusedInput===saveBasinAsTextBox ? textInput.value : saveBasinAsTextBox.value;
        let grey = n==='' || n===AUTOSAVE_SAVE_NAME;
        s.button('Ok',false,15,grey);
    },function(){
        saveBasinAsTextBox.enterFunc();
    });

    saveBasinAsPanel.invoke = function(exit){
        saveBasinAsPanel.exit = exit;
        saveBasinAsPanel.toggleShow();
        saveBasinAsTextBox.value = UI.viewBasin.saveName===AUTOSAVE_SAVE_NAME ? '' : UI.viewBasin.saveName;
    };

    seedBox = primaryWrapper.append(false,WIDTH/2-100,HEIGHT/2-15,200,30,[18,undefined,function(){  // textbox for copying the basin seed
        this.value = UI.viewBasin.seed.toString();
    }],function(){
        textInput.value = this.value = UI.viewBasin.seed.toString();
        textInput.setSelectionRange(0,textInput.value.length);
    },false);

    helpBox = primaryWrapper.append(false,WIDTH/8,HEIGHT/8,3*WIDTH/4,3*HEIGHT/4,function(s){
        fill(COLORS.UI.box);
        noStroke();
        s.fullRect();
        fill(COLORS.UI.text);
        textAlign(LEFT,TOP);
        textSize(15);
        text(HELP_TEXT,10,10);
    },true,false);

    helpBox.append(false,helpBox.width-30,10,20,20,function(s){
        s.button("X",false,22);
    },function(){
        helpBox.hide();
    });
};

function mouseInCanvas(){
    return coordinateInCanvas(getMouseX(),getMouseY());
}

function mouseClicked(){
    if(mouseInCanvas() && waitingFor<1){
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
        if(keyCode === ESCAPE){
            textInput.value = UI.focusedInput.value;
            textInput.blur();
            return false;
        }
        if(keyCode === ENTER){
            let u = UI.focusedInput;
            textInput.blur();
            if(u.enterFunc) u.enterFunc();
            return false;
        }
        return;
    }
    keyRepeatFrameCounter = -1;
    switch(key){
        case " ":
        if(UI.viewBasin && primaryWrapper.showing) paused = !paused;
        break;
        case "a":
        if(UI.viewBasin && paused && primaryWrapper.showing) UI.viewBasin.advanceSim();
        break;
        case "w":
        simSettings.setShowStrength("toggle");
        break;
        case "e":
        if(UI.viewBasin) UI.viewBasin.env.displayNext();
        break;
        case "t":
        simSettings.setTrackMode("incmod",4);
        refreshTracks(true);
        break;
        case "m":
        simSettings.setShowMagGlass("toggle");
        if(UI.viewBasin) UI.viewBasin.env.updateMagGlass();
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

function changeViewTick(t){
    let oldS = UI.viewBasin.getSeason(viewTick);
    viewTick = t;
    let newS = UI.viewBasin.getSeason(viewTick);
    let finish = ()=>{
        refreshTracks(oldS!==newS);
        UI.viewBasin.env.displayLayer();
    };
    let requisites = s=>{
        let arr = [];
        let allFound = true;
        for(let i=0;i<s.systems.length;i++){
            let r = s.systems[i];
            if(r instanceof StormRef && (r.lastApplicableAt===undefined || r.lastApplicableAt>=viewTick || simSettings.trackMode===2)){
                arr.push(r.season);
                allFound = allFound && UI.viewBasin.fetchSeason(r.season);
            }
        }
        if(allFound) finish();
        else{
            for(let i=0;i<arr.length;i++){
                arr[i] = UI.viewBasin.fetchSeason(arr[i],false,false,true);
            }
            Promise.all(arr).then(finish);
        }
    };
    if(UI.viewBasin.fetchSeason(viewTick,true)){
        requisites(UI.viewBasin.fetchSeason(viewTick,true));
    }else UI.viewBasin.fetchSeason(viewTick,true,false,s=>{
        requisites(s);
    });
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

function oneMinToTenMin(w,rnd){
    let val = w*7/8;    // simple ratio
    if(rnd) val = round(val/rnd)*rnd;
    return val;
}

function mbToInHg(mb,rnd){
    let val = mb*0.02953;
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

function formatDate(m){
    if(m instanceof moment){
        const f = 'HH[z] MMM DD';
        let str = m.format(f);
        let y = m.year();
        let bce;
        if(y<1){
            y = 1-y;
            bce = true;
        }
        str += ' ' + zeroPad(y,4);
        if(bce) str += ' B.C.E.';
        return str;
    }
}

function seasonName(y,h){
    if(h===undefined) h = UI.viewBasin instanceof Basin && UI.viewBasin.SHem;
    let str = '';
    let eraYear = yr=>{
        if(yr<1) return 1-yr;
        return yr;
    };
    const bce = ' B.C.E.';
    if(h){
        str += zeroPad(eraYear(y-1),4);
        if(y===1) str += bce;
        str += '-' + zeroPad(eraYear(y)%100,2);
        if(y<1) str += bce;
        return str;
    }
    str += zeroPad(eraYear(y),4);
    if(y<1) str += bce;
    return str;
}