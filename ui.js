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
            if(this.clickFunc && mouseX>=left && mouseX<right && mouseY>=top && mouseY<bottom) return this;
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

UI.updateMouseOver = function(){
    if(UI.mouseOver && UI.mouseOver.checkMouseOver()===UI.mouseOver) return UI.mouseOver;
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

    mainMenu = new UI(null,0,0,width,height);
    basinCreationMenu = new UI(null,0,0,width,height,undefined,undefined,false);
    primaryWrapper = new UI(null,0,0,width,height,undefined,undefined,false);

    // main menu

    mainMenu.append(false,width/2,height/4,0,0,function(){  // title text
        fill(0);
        noStroke();
        textAlign(CENTER,CENTER);
        textSize(36);
        text(TITLE,0,0);
        textSize(18);
        textStyle(ITALIC);
        text("Simulate your own monster storms!",0,40);
    });

    mainMenu.append(false,width/2-100,height/2-20,200,40,function(){    // "New Basin" button
        fill(200,200,200,100);
        noStroke();
        this.fullRect();
        if(this.isHovered()) this.fullRect();
        fill(0);
        textAlign(CENTER,CENTER);
        textSize(24);
        text("New Basin",100,20);
    },function(){
        // init();
        mainMenu.hide();
        basinCreationMenu.show();
    });

    // basin creation menu

    basinCreationMenu.append(false,width/2,height/8,0,0,function(){ // menu title text
        fill(0);
        noStroke();
        textAlign(CENTER,CENTER);
        textSize(36);
        // textStyle(ITALIC);
        text("New Basin Settings",0,0);
    });

    basinCreationMenu.append(false,width/2-100,height/4-20,200,40,function(){
        fill(200,200,200,100);
        noStroke();
        this.fullRect();
        if(this.isHovered()) this.fullRect();
        fill(0);
        textAlign(CENTER,CENTER);
        textSize(18);
        let hem = "Random";
        if(newBasinSettings.hem===1) hem = "Northern";
        if(newBasinSettings.hem===2) hem = "Southern";
        text("Hemisphere: "+hem,100,20);
    },function(){
        if(newBasinSettings.hem===undefined) newBasinSettings.hem = 1;
        else{
            newBasinSettings.hem++;
            newBasinSettings.hem %= 3;
        }
    });

    basinCreationMenu.append(false,width/2-100,7*height/8-20,200,40,function(){    // "Start" button
        fill(200,200,200,100);
        noStroke();
        this.fullRect();
        if(this.isHovered()) this.fullRect();
        fill(0);
        textAlign(CENTER,CENTER);
        textSize(24);
        text("Start",100,20);
    },function(){
        init();
        basinCreationMenu.hide();
    });

    // primary "in sim" scene

    let topBar = primaryWrapper.append(false,0,0,width,30,function(){   // Top bar
        fill(200,200,200,100);
        noStroke();
        this.fullRect();
        textSize(18);
    },false);//,false);

    topBar.append(false,5,3,100,24,function(){  // Date indicator
        let txtStr = tickMoment(viewTick).format(TIME_FORMAT) + (viewingPresent() ? '' : ' [Analysis]');
        this.setBox(undefined,undefined,textWidth(txtStr)+6);
        if(this.isHovered()) this.fullRect();
        fill(0);
        textAlign(LEFT,TOP);
        text(txtStr,3,3);
    },function(){
        dateNavigator.toggleShow();
    });

    dateNavigator = primaryWrapper.append(false,0,30,140,50,function(){     // Analysis navigator panel
        fill(200,200,200,140);
        noStroke();
        this.fullRect();
    },true,false);

    let navButtonRend = function(){     // Navigator button render function
        if(this.isHovered()){
            fill(200,200,200,100);
            this.fullRect();
        }
        if(paused) fill(0);
        else fill(130);
        if(this.metadata%2===0) triangle(2,8,10,2,18,8);
        else triangle(2,2,18,2,10,8);
    };

    let navButtonClick = function(){    // Navigator button click function
        if(paused){
            let m = tickMoment(viewTick);
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
            let t = floor((m.valueOf()-basin.startTime)/TICK_DURATION);
            if(this.metadata%2===0 && t%ADVISORY_TICKS!==0) t = floor(t/ADVISORY_TICKS)*ADVISORY_TICKS;
            if(this.metadata%2!==0 && t%ADVISORY_TICKS!==0) t = ceil(t/ADVISORY_TICKS)*ADVISORY_TICKS;
            if(t>basin.tick) t = basin.tick;
            if(t<0) t = 0;
            viewTick = t;
            refreshTracks();
            Env.displayLayer();
        }
    };

    for(let i=0;i<8;i++){   // Navigator buttons
        let x = floor(i/2)*30+15;
        let y = i%2===0 ? 10 : 30;
        let button = dateNavigator.append(false,x,y,20,10,navButtonRend,navButtonClick);
        button.metadata = i;
    }

    let pauseButton = topBar.append(false,width-29,3,24,24,function(){  // Pause/resume button
        if(this.isHovered()) this.fullRect();
        fill(0);
        if(paused) triangle(3,3,21,12,3,21);
        else{
            rect(5,3,5,18);
            rect(14,3,5,18);
        }
    },function(){
        paused = !paused;
    });

    pauseButton.append(false,-105,0,100,24,function(){  // Pause/speed/selected storm indicator
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
        fill(200,200,200,100);
        if(this.isHovered()) this.fullRect();
        fill(0);
        textAlign(RIGHT,TOP);
        text(txtStr,this.width-3,3);
    },function(){
        if(!selectedStorm) paused = !paused;
        else stormInfoBox.toggleShow();
    });

    let bottomBar = primaryWrapper.append(false,0,height-30,width,30,function(){    // Bottom bar
        fill(200,200,200,100);
        noStroke();
        this.fullRect();
        textSize(18);
    },false);//,false);

    bottomBar.append(false,5,3,100,24,function(){   // Map layer/environmental field indicator
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
                x = mouseX;
                y = mouseY;
            }
            if(x >= width || x < 0 || y >= height || y < 0 || (Env.fields[f].oceanic && land.get(x,y))){
                txtStr += "N/A";
            }else{
                let v = Env.get(f,x,y,viewTick);
                if(Env.fields[f].isVectorField){
                    let m = v.mag();
                    let h = v.heading();
                    txtStr += "(a: " + (round(h*1000)/1000) + ", m: " + (round(m*1000)/1000) + ")";
                }else txtStr += round(v*1000)/1000;
            }
            txtStr += " @ " + (s ? "selected storm" : "mouse pointer / finger");
        }else txtStr += "none";
        this.setBox(undefined,undefined,textWidth(txtStr)+6);
        if(this.isHovered()) this.fullRect();
        fill(0);
        textAlign(LEFT,TOP);
        text(txtStr,3,3);
    },function(){
        Env.displayNext();
    });

    bottomBar.append(false,width-29,3,24,24,function(){  // Help button
        if(this.isHovered()) this.fullRect();
        fill(0);
        textAlign(CENTER,CENTER);
        textSize(22);
        text("?",12,12);
    },function(){
        helpBox.toggleShow();
    });

    stormInfoBox = primaryWrapper.append(false,3*width/4,topBar.height,width/4,height-topBar.height-bottomBar.height,function(){
        if(selectedStorm===undefined){
            this.hide();
            return;
        }
        let s = selectedStorm;
        fill(200,200,200,100);
        noStroke();
        this.fullRect();
        fill(0);
        textAlign(CENTER,TOP);
        textSize(18);
        text(s.getFullNameByTick("peak"),this.width/2,10);
        textSize(15);
        let txt = "";
        let formTime;
        let dissTime;
        if(s.TC){
            formTime = tickMoment(s.formationTime).format(TIME_FORMAT);
            dissTime = tickMoment(s.dissipationTime).format(TIME_FORMAT);
            txt += "Dates active:\n" + formTime + " -\n" + (s.dissipationTime ? dissTime : "currently active");
        }else txt += "Dates active: N/A";
        txt += "\nPeak pressure: " + (s.peak ? s.peak.pressure : "N/A");
        txt += "\nWind speed @ peak: " + (s.peak ? s.peak.windSpeed + " kts" : "N/A");
        txt += "\nACE: " + s.ACE;
        txt += "\nDamage: TBA";
        txt += "\nDeaths: TBA";
        text(txt,this.width/2,40);
        rectMode(CORNER);
    },true,false);

    stormInfoBox.append(false,stormInfoBox.width-30,10,20,20,function(){
        fill(200,200,200,100);
        if(this.isHovered()) this.fullRect();
        fill(0);
        textAlign(CENTER,CENTER);
        textSize(22);
        text("X",10,10);
    },function(){
        stormInfoBox.hide();
    });

    helpBox = primaryWrapper.append(false,width/8,height/8,3*width/4,3*height/4,function(){
        fill(200,200,200,100);
        noStroke();
        this.fullRect();
        fill(0);
        textAlign(LEFT,TOP);
        textSize(18);
        text(HELP_TEXT,10,10);
    },true,false);

    helpBox.append(false,helpBox.width-30,10,20,20,function(){
        fill(200,200,200,100);
        if(this.isHovered()) this.fullRect();
        fill(0);
        textAlign(CENTER,CENTER);
        textSize(22);
        text("X",10,10);
    },function(){
        helpBox.hide();
    });
};