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

function initUI(){
    topBar = new UI(null,0,0,width,30,function(){
        fill(200,200,200,100);
        noStroke();
        this.fullRect();
        textSize(18);
    });

    dateUI = topBar.append(false,5,3,100,24,function(){
        let txtStr = tickMoment(viewTick).format(TIME_FORMAT) + (viewingPresent() ? '' : ' [Analysis]');
        this.setBox(undefined,undefined,textWidth(txtStr)+6);
        if(this.isHovered()) this.fullRect();
        fill(0);
        textAlign(LEFT,TOP);
        text(txtStr,3,3);
    },function(){
        dateNavigator.toggleShow();
    });

    dateNavigator = new UI(null,0,30,140,50,function(){
        fill(200,200,200,140);
        noStroke();
        this.fullRect();
    },true,false);

    for(let i=0;i<8;i++){
        let x = floor(i/2)*30+15;
        let y = i%2===0 ? 10 : 30;
        let rend = function(){
            if(this.isHovered()){
                fill(200,200,200,100);
                this.fullRect();
            }
            if(paused) fill(0);
            else fill(130);
            if(this.metadata%2===0) triangle(2,8,10,2,18,8);
            else triangle(2,2,18,2,10,8);
        };
        let clck = function(){
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
            }
        };
        let button = dateNavigator.append(false,x,y,20,10,rend,clck);
        button.metadata = i;
    }

    pauseButton = topBar.append(false,width-29,3,24,24,function(){
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

    stormSelectUI = pauseButton.append(false,-105,0,100,24,function(){
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
    });
}