class Designation{
    constructor(value,tick,sub){
        this.num = undefined;
        if(value instanceof Array){
            let n;
            if(value.length>2){
                n = value[1];
                value[1] = zeroPad(n,2);
            }else{
                n = value[0];
                value[0] = zeroPad(n,2);
            }
            this.value = value.join('');
            if(typeof n === 'number') this.num = n;
        }else this.value = value;
        this.effectiveTicks = [tick];
        this.hideTicks = [];
        this.subBasin = sub || 0;
        if(this.value instanceof LoadData) this.load(this.value);
    }

    isName(){
        if(this.num===undefined) return true;
    }

    truncate(){
        if(this.isName()){
            return ({
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
            })[this.value] || this.value.slice(0,1);
        }else return this.num + '';
    }
    
    activeAt(t){
        let e;
        let h;
        for(let i=0;i<this.effectiveTicks.length;i++){
            let n = this.effectiveTicks[i];
            if(t>=n && (!e || n>e)) e = n;
        }
        for(let i=0;i<this.hideTicks.length;i++){
            let n = this.hideTicks[i];
            if(t>=n && (!h || n>h)) h = n;
        }
        if(e && (!h || e>h)) return e;
        return false;
    }

    hide(t){
        if(typeof t === 'number') this.hideTicks.push(t);
    }

    show(t){
        if(typeof t === 'number') this.effectiveTicks.push(t);
    }

    save(){
        let o = {};
        for(let p of [
            'value',
            'num',
            'effectiveTicks',
            'hideTicks',
            'subBasin'
        ]) o[p] = this[p];
        return o;
    }

    load(data){
        if(data instanceof LoadData){
            let o = data.value;
            for(let p of [
                'value',
                'num',
                'subBasin'
            ]) this[p] = o[p];
            for(let p of [
                'effectiveTicks',
                'hideTicks'
            ]) if(o[p]) this[p] = o[p];
            if(o.effectiveTick) this.effectiveTicks.push(o.effectiveTick);
        }
    }
}

class DesignationSystem{
    constructor(data){
        let opts;
        if(data && !(data instanceof LoadData)) opts = data;
        else opts = {};
        this.subBasin = undefined;
        this.displayName = opts.displayName;
        // if designations should be secondary instead of primary
        this.secondary = opts.secondary;
        this.numbering = {};
        // set to false to disable numbering (prefixes and suffixes may still be used for numbered designations from a parent sub-basin)
        this.numbering.enabled = opts.numEnable===undefined ? true : opts.numEnable;
        // a prefix for numbered designations (e.g. "BOB" and "ARB")
        this.numbering.prefix = undefined;
        if(opts.prefix!==undefined) this.numbering.prefix = opts.prefix;
        else if(this.numbering.enabled) this.numbering.prefix = '';
        // a suffix for numbered designations (e.g. "L" and "E")
        this.numbering.suffix = undefined;
        if(opts.suffix!==undefined) this.numbering.suffix = opts.suffix;
        else if(this.numbering.enabled){
            if(opts.prefix!==undefined) this.numbering.suffix = '';
            else this.numbering.suffix = DEPRESSION_LETTER;
        }
        // scale category threshold for numbering a system (overrides Scale.numberingThreshold)
        this.numbering.threshold = opts.numThresh;
        // behavior for primary designations of basin-crossing systems [may need more testing]
        // 0 = always redesignate (use previous designation from this sub-basin if exists)
        // 1 = strictly redesignate (use new designation even if a previous one from this sub-basin exists)
        // 2 = redesignate regenerating systmes (keep designations of systems that retain TC status through the crossing; use previous designation if applicable)
        // 3 = strictly redesignate regenerating systems (always use new designation for regenerating systems even if previous one exists)
        // 4 = never redesignate (keep designations regardless of retaining TC status)
        this.numbering.crossingMode = opts.numCross===undefined ? DESIG_CROSSMODE_ALWAYS : opts.numCross;
        this.naming = {};
        // main name lists to be used
        this.naming.mainLists = [];
        if(opts.mainLists instanceof Array) this.naming.mainLists = opts.mainLists;
        // auxiliary lists to be used if the main list for a year is exhausted (only applicable to annual naming)
        this.naming.auxiliaryLists = [];
        if(opts.auxLists instanceof Array) this.naming.auxiliaryLists = opts.auxLists;
        // lists to be used for automatic replacement of names on other lists [To Be Implemented]
        this.naming.replacementLists = [];
        if(opts.repLists instanceof Array) this.naming.replacementLists = opts.repLists;
        // whether naming should be annual (Atl/EPac/SWIO/PAGASA) or continuous (WPac/CPac/Aus/etc.)
        this.naming.annual = opts.annual;
        // the year to anchor the cycle of annual lists to (this year will use the #0 (first) name list)
        this.naming.annualAnchorYear = opts.anchor===undefined ? 1979 : opts.anchor;
        // counter for continuous name assignment (only applicable to continuous naming)
        this.naming.continuousNameIndex = opts.indexOffset || 0;
        // scale category threshold for naming a system (overrides Scale.namingThreshold)
        this.naming.threshold = opts.nameThresh;
        // behavior for primary designations of basin-crossing systems (see above)
        this.naming.crossingMode = opts.nameCross===undefined ? DESIG_CROSSMODE_STRICT_REGEN : opts.nameCross;
        if(data instanceof LoadData) this.load(data);
    }

    setSubBasin(sb){
        if(sb instanceof SubBasin) this.subBasin = sb;
    }

    addMainLists(...lists){
        for(let l of lists){
            if(l instanceof Array){
                this.naming.mainLists.push(l);
            }
        }
        return this;
    }

    addAuxiliaryLists(...lists){
        for(let l of lists){
            if(l instanceof Array){
                this.naming.auxiliaryLists.push(l);
            }
        }
        return this;
    }

    addReplacementLists(...lists){
        for(let l of lists){
            if(l instanceof Array){
                this.naming.replacementLists.push(l);
            }
        }
        return this;
    }

    setSecondary(v){
        this.secondary = !!v;
        return this;
    }

    setCrossingModes(numCM,nameCM){
        if(numCM !== undefined) this.numbering.crossingMode = numCM;
        if(nameCM !== undefined) this.naming.crossingMode = nameCM;
        return this;
    }

    setThresholds(numThresh,nameThresh){
        if(numThresh !== undefined) this.numbering.threshold = numThresh;
        if(nameThresh !== undefined) this.naming.threshold = nameThresh;
        return this;
    }

    setContinuousNameIndex(i){
        if(i !== undefined) this.naming.continuousNameIndex = i;
        return this;
    }

    getName(tick,year,index){
        if(this.naming.mainLists.length<1) return undefined;
        if(tick===undefined && this.subBasin) tick = this.subBasin.basin.tick;
        let name;
        if(this.naming.annual){
            if(year===undefined && this.subBasin) year = this.subBasin.basin.getSeason(tick);
            let y = year - this.naming.annualAnchorYear;
            let m = this.naming.mainLists;
            let numOfLists = m.length;
            let i = (y%numOfLists+numOfLists)%numOfLists;
            let l = m[i];
            if(index===undefined) index = 0;
            if(index>=l.length){
                index -= l.length;
                m = this.naming.auxiliaryLists;
                i = 0;
                let sum = 0;
                while(i<m.length && index-sum >= m[i].length){
                    sum += m[i].length;
                    i++;
                }
                if(i>=m.length) return undefined;
                index -= sum;
                name = m[i][index];
            }else name = l[index];
        }else{
            if(index===undefined) index = 0;
            let m = this.naming.mainLists;
            let i = 0;
            let sum = 0;
            while(i<m.length && index-sum >= m[i].length){
                sum += m[i].length;
                i++;
            }
            if(i>=m.length){
                index = 0;
                i = 0;
            }else index -= sum;
            name = m[i][index];
        }
        return new Designation(name,tick,this.subBasin ? this.subBasin.id : 0);
    }

    getNewName(){
        if(this.subBasin){
            let sb = this.subBasin;
            let basin = sb.basin;
            let t = basin.tick;
            let y = basin.getSeason(t);
            let season = basin.fetchSeason(y,false,true);
            let i;
            if(this.naming.annual) i = season.stats(sb.id).designationCounters.name++;
            else{
                i = this.naming.continuousNameIndex++;
                let totalLength = 0;
                for(let l of this.naming.mainLists) totalLength += l.length;
                if(this.naming.continuousNameIndex>=totalLength) this.naming.continuousNameIndex = 0;
            }
            return this.getName(t,y,i);
        }
        return undefined;
    }

    getNum(tick,index,altPre,altSuf){
        let pre = this.numbering.prefix;
        let suf = this.numbering.suffix;
        if(altPre!==undefined) pre = altPre;
        if(altSuf!==undefined) suf = altSuf;
        let num = [pre,index,suf];
        return new Designation(num,tick,this.subBasin ? this.subBasin.id : 0);
    }

    getNewNum(altPre,altSuf){
        if(this.subBasin){
            let sb = this.subBasin;
            let basin = sb.basin;
            let t = basin.tick;
            let season = basin.fetchSeason(t,true,true);
            let i = ++season.stats(sb.id).designationCounters.number; // prefix increment because numbering starts at 01
            let numDesig = this.getNum(t,i,altPre,altSuf);
            return numDesig;
        }
        return undefined;
    }

    clone(){
        let newDS = new DesignationSystem();
        newDS.secondary = this.secondary;
        newDS.displayName = this.displayName;
        let numg = this.numbering;
        let namg = this.naming;
        let Numg = newDS.numbering;
        let Namg = newDS.naming;
        for(let p of [
            'enabled',
            'prefix',
            'suffix',
            'threshold',
            'crossingMode'
        ]) Numg[p] = numg[p];
        for(let p of [
            'annual',
            'annualAnchorYear',
            'continuousNameIndex',
            'threshold',
            'crossingMode'
        ]) Namg[p] = namg[p];
        for(let p of [
            'mainLists',
            'auxiliaryLists',
            'replacementLists'
        ]) Namg[p] = JSON.parse(JSON.stringify(namg[p]));
        return newDS;
    }

    save(){
        let d = {};
        d.secondary = this.secondary;
        d.displayName = this.displayName;
        let numg = d.numbering = {};
        let namg = d.naming = {};
        let Numg = this.numbering;
        let Namg = this.naming;
        for(let p of [
            'enabled',
            'prefix',
            'suffix',
            'threshold',
            'crossingMode'
        ]) numg[p] = Numg[p];
        for(let p of [
            'mainLists',
            'auxiliaryLists',
            'replacementLists',
            'annual',
            'annualAnchorYear',
            'continuousNameIndex',
            'threshold',
            'crossingMode'
        ]) namg[p] = Namg[p];
        return d;
    }

    load(data){
        if(data instanceof LoadData){
            let d = data.value;
            this.secondary = d.secondary;
            this.displayName = d.displayName;
            let Numg = this.numbering;
            let Namg = this.naming;
            let numg = d.numbering;
            let namg = d.naming;
            for(let p of [
                'enabled',
                'prefix',
                'suffix',
                'threshold'
            ]) Numg[p] = numg[p];
            Numg.crossingMode = numg.crossingMode || 0;
            for(let p of [
                'mainLists',
                'auxiliaryLists',
                'replacementLists',
                'annual',
                'annualAnchorYear',
                'continuousNameIndex',
                'threshold'
            ]) Namg[p] = namg[p];
            Namg.crossingMode = namg.crossingMode===undefined ? DESIG_CROSSMODE_STRICT_REGEN : namg.crossingMode;
            for(let i=Namg.auxiliaryLists.length-1;i>=0;i--){
                let a = Namg.auxiliaryLists[i];
                if(a.length===1 && a[0]==="Unnamed") Namg.auxiliaryLists.splice(i,1);
            }
            if(data.format<FORMAT_WITH_SCALES){ // convert thresholds from pre-v0.2 values
                Numg.threshold = Scale.convertOldValue(Numg.threshold);
                Namg.threshold = Scale.convertOldValue(Namg.threshold);
            }
        }
    }

    static convertFromOldNameList(list){
        let annual = list[0] instanceof Array;
        let main = [];
        let aux = [];
        if(annual){
            for(let i=0;i<list.length-1;i++) main.push(JSON.parse(JSON.stringify(list[i])));
            let auxlist = list[list.length-1];
            if(auxlist && auxlist[0]!=="Unnamed") aux.push(JSON.parse(JSON.stringify(auxlist)));
        }else main.push(JSON.parse(JSON.stringify(list)));
        return new DesignationSystem({
            mainLists: main,
            auxLists: aux,
            annual: annual
        });
    }
}

DesignationSystem.atlantic = new DesignationSystem({
    displayName: 'Atlantic',
    suffix: 'L',
    annual: true,
    anchor: 1979,
    mainLists: [
        ['Ana','Bill','Claudette','Danny','Elsa','Fred','Grace','Henri','Ida','Julian','Kate','Larry','Mindy','Nicholas','Odette','Peter','Rose','Sam','Teresa','Victor','Wanda'],
        ['Alex','Bonnie','Colin','Danielle','Earl','Fiona','Gaston','Hermine','Ian','Julia','Karl','Lisa','Martin','Nicole','Owen','Paula','Richard','Shary','Tobias','Virginie','Walter'],
        ['Arlene','Bret','Cindy','Don','Emily','Franklin','Gert','Harold','Idalia','Jose','Katia','Lee','Margot','Nigel','Ophelia','Philippe','Rina','Sean','Tammy','Vince','Whitney'],
        ['Alberto','Beryl','Chris','Debby','Ernesto','Francine','Gordon','Helene','Isaac','Joyce','Kirk','Leslie','Milton','Nadine','Oscar','Patty','Rafael','Sara','Tony','Valerie','William'],
        ['Andrea','Barry','Chantal','Dorian','Erin','Fernand','Gabrielle','Humberto','Imelda','Jerry','Karen','Lorenzo','Melissa','Nestor','Olga','Pablo','Rebekah','Sebastien','Tanya','Van','Wendy'],
        ['Arthur','Bertha','Cristobal','Dolly','Edouard','Fay','Gonzalo','Hanna','Isaias','Josephine','Kyle','Laura','Marco','Nana','Omar','Paulette','Rene','Sally','Teddy','Vicky','Wilfred']
    ],
    auxLists: [
        ['Alpha','Beta','Gamma','Delta','Epsilon','Zeta','Eta','Theta','Iota','Kappa','Lambda','Mu','Nu','Xi','Omicron','Pi','Rho','Sigma','Tau','Upsilon','Phi','Chi','Psi','Omega'],
        ['Alef','Bet','Gimel','Dalet','He','Vav','Zayin','Het','Tet','Yod','Kaf','Lamed','Mem','Nun','Samekh','Ayin','Pe','Tsadi','Qof','Resh','Shin','Tav'] // Hebrew Alphabet not actually official, but added due to popular demand
    ]
});

DesignationSystem.easternPacific = new DesignationSystem({
    displayName: 'Eastern Pacific',
    suffix: 'E',
    annual: true,
    anchor: 1979,
    mainLists: [
        ["Andres","Blanca","Carlos","Dolores","Enrique","Felicia","Guillermo","Hilda","Ignacio","Jimena","Kevin","Linda","Marty","Nora","Olaf","Pamela","Rick","Sandra","Terry","Vivian","Waldo","Xina","York","Zelda"],
        ["Agatha","Blas","Celia","Darby","Estelle","Frank","Georgette","Howard","Ivette","Javier","Kay","Lester","Madeline","Newton","Orlene","Paine","Roslyn","Seymour","Tina","Virgil","Winifred","Xavier","Yolanda","Zeke"],
        ["Adrian","Beatriz","Calvin","Dora","Eugene","Fernanda","Greg","Hilary","Irwin","Jova","Kenneth","Lidia","Max","Norma","Otis","Pilar","Ramon","Selma","Todd","Veronica","Wiley","Xina","York","Zelda"],
        ["Aletta","Bud","Carlotta","Daniel","Emilia","Fabio","Gilma","Hector","Ileana","John","Kristy","Lane","Miriam","Norman","Olivia","Paul","Rosa","Sergio","Tara","Vicente","Willa","Xavier","Yolanda","Zeke"],
        ["Alvin","Barbara","Cosme","Dalila","Erick","Flossie","Gil","Henriette","Ivo","Juliette","Kiko","Lorena","Mario","Narda","Octave","Priscilla","Raymond","Sonia","Tico","Velma","Wallis","Xina","York","Zelda"],
        ["Amanda","Boris","Cristina","Douglas","Elida","Fausto","Genevieve","Hernan","Iselle","Julio","Karina","Lowell","Marie","Norbert","Odalys","Polo","Rachel","Simon","Trudy","Vance","Winnie","Xavier","Yolanda","Zeke"]
    ],
    auxLists: [
        ['Alpha','Beta','Gamma','Delta','Epsilon','Zeta','Eta','Theta','Iota','Kappa','Lambda','Mu','Nu','Xi','Omicron','Pi','Rho','Sigma','Tau','Upsilon','Phi','Chi','Psi','Omega'],
        ['Alef','Bet','Gimel','Dalet','He','Vav','Zayin','Het','Tet','Yod','Kaf','Lamed','Mem','Nun','Samekh','Ayin','Pe','Tsadi','Qof','Resh','Shin','Tav'] // Hebrew Alphabet not actually official, but added due to popular demand
    ]
});

DesignationSystem.centralPacific = new DesignationSystem({
    displayName: 'Central Pacific',
    suffix: 'C',
    mainLists: [
        ["Akoni","Ema","Hone","Iona","Keli","Lala","Moke","Nolo","Olana","Pena","Ulana","Wale"],
        ["Aka","Ekeka","Hene","Iolana","Keoni","Lino","Mele","Nona","Oliwa","Pama","Upana","Wene"],
        ["Alika","Ele","Huko","Iopa","Kika","Lana","Maka","Neki","Omeka","Pewa","Unala","Wali"],
        ["Ana","Ela","Halola","Iune","Kilo","Loke","Malia","Niala","Oho","Pali","Ulika","Walaka"]
    ]
});

DesignationSystem.westernPacific = new DesignationSystem({
    displayName: 'Western Pacific',
    suffix: 'W',
    mainLists: [
        ["Damrey","Haikui","Kirogi","Yun-yeung","Koinu","Bolaven","Sanba","Jelawat","Ewiniar","Maliksi","Gaemi","Prapiroon","Maria","Son-Tinh","Ampil","Wukong","Jongdari","Shanshan","Yagi","Leepi","Bebinca","Rumbia","Soulik","Cimaron","Jebi","Mangkhut","Barijat","Trami"],
        ["Kong-rey","Yutu","Toraji","Man-yi","Usagi","Pabuk","Wutip","Sepat","Mun","Danas","Nari","Wipha","Francisco","Lekima","Krosa","Bailu","Podul","Lingling","Kajiki","Faxai","Peipah","Tapah","Mitag","Hagibis","Neoguri","Bualoi","Matmo","Halong"],
        ["Nakri","Fengshen","Kalmaegi","Fung-wong","Kammuri","Phanfone","Vongfong","Nuri","Sinlaku","Hagupit","Jangmi","Mekkhala","Higos","Bavi","Maysak","Haishen","Noul","Dolphin","Kujira","Chan-hom","Linfa","Nangka","Saudel","Molave","Goni","Atsani","Etau","Vamco"],
        ["Krovanh","Dujuan","Surigae","Choi-wan","Koguma","Champi","In-fa","Cempaka","Nepartak","Lupit","Mirinae","Nida","Omais","Conson","Chanthu","Dianmu","Mindulle","Lionrock","Kompasu","Namtheun","Malou","Nyatoh","Rai","Malakas","Megi","Chaba","Aere","Songda"],
        ["Trases","Mulan","Meari","Ma-on","Tokage","Hinnamnor","Muifa","Merbok","Nanmadol","Talas","Noru","Kulap","Roke","Sonca","Nesat","Haitang","Nalgae","Banyan","Yamaneko","Pakhar","Sanvu","Mawar","Guchol","Talim","Doksuri","Khanun","Lan","Saola"]
    ]
});

DesignationSystem.PAGASA = new DesignationSystem({
    displayName: 'PAGASA',
    secondary: true,
    numEnable: false,
    annual: true,
    anchor: 1963,
    nameThresh: 0,
    mainLists: [
        ["Amang","Betty","Chedeng","Dodong","Egay","Falcon","Goring","Hanna","Ineng","Jenny","Kabayan","Liwayway","Marilyn","Nimfa","Onyok","Perla","Quiel","Ramon","Sarah","Tamaraw","Ugong","Viring","Weng","Yoyoy","Zigzag","Abe","Berto","Charo","Dado","Estoy","Felion","Gening","Herman","Irma","Jaime"],
        ["Ambo","Butchoy","Carina","Dindo","Enteng","Ferdie","Gener","Helen","Igme","Julian","Kristine","Leon","Marce","Nika","Ofel","Pepito","Quinta","Rolly","Siony","Tonyo","Ulysses","Vicky","Warren","Yoyong","Zosimo","Alakdan","Baldo","Clara","Dencio","Estong","Felipe","Gomer","Heling","Ismael","Julio"],
        ["Auring","Bising","Crising","Dante","Emong","Fabian","Gorio","Huaning","Isang","Jolina","Kiko","Lannie","Maring","Nando","Odette","Paolo","Quedan","Ramil","Salome","Tino","Uwan","Verbena","Wilma","Yasmin","Zoraida","Alamid","Bruno","Conching","Dolor","Ernie","Florante","Gerardo","Hernan","Isko","Jerome"],
        ["Agaton","Basyang","Caloy","Domeng","Ester","Florita","Gardo","Henry","Inday","Josie","Karding","Luis","Maymay","Neneng","Obet","Paeng","Queenie","Rosal","Samuel","Tomas","Umberto","Venus","Waldo","Yayang","Zeny","Agila","Bagwis","Chito","Diego","Elena","Felino","Gunding","Harriet","Indang","Jessa"]
    ]
});

DesignationSystem.australianRegionBoM = new DesignationSystem({
    displayName: 'Australian Region (BoM)',
    suffix: 'U',
    mainLists: [
        ["Anika","Billy","Charlotte","Dominic","Ellie","Freddy","Gabrielle","Herman","Ilsa","Jasper","Kirrily","Lincoln","Megan","Neville","Olga","Paul","Robyn","Sean","Tasha","Vince","Zelia"],
        ["Anthony","Bianca","Courtney","Dianne","Errol","Fina","Grant","Hayley","Iggy","Jenna","Koji","Luana","Mitchell","Narelle","Oran","Peta","Riordan","Sandra","Tim","Victoria","Zane"],
        ["Alessia","Bruce","Catherine","Dylan","Edna","Fletcher","Gillian","Hadi","Ivana","Jack","Kate","Laszlo","Mingzhu","Nathan","Olwyn","Quincey","Raquel","Stan","Tatiana","Uriah","Yvette"],
        ["Alfred","Blanche","Caleb","Dara","Ernie","Frances","Greg","Hilda","Irving","Joyce","Kelvin","Linda","Marco","Nora","Owen","Penny","Riley","Savannah","Trevor","Veronica","Wallace"],
        ["Ann","Blake","Claudia","Damien","Esther","Ferdinand","Gretel","Harold","Imogen","Joshua","Kimi","Lucas","Marian","Niran","Odette","Paddy","Ruby","Seth","Tiffany","Vernon"]
    ]
});

DesignationSystem.australianRegionJakarta = new DesignationSystem({
    displayName: 'Australian Region (Jakarta)',
    numEnable: false,
    mainLists: [
        ['Anggrek','Bakung','Cempaka','Dahlia','Flamboyan','Kenanga','Lili','Mangga','Seroja','Teratai']
    ],
    replacementLists: [
        ['Anggur','Belimbing','Duku','Jambu','Lengkeng','Melati','Nangka','Pisang','Rambutan','Sawo']
    ]
});

DesignationSystem.australianRegionPortMoresby = new DesignationSystem({
    displayName: 'Australian Region (Port Moresby)',
    numEnable: false,
    mainLists: [
        ['Alu','Buri','Dodo','Emau','Fere','Hibu','Ila','Kama','Lobu','Maila']
    ],
    replacementLists: [
        ['Nou','Obaha','Paia','Ranu','Sabi','Tau','Ume','Vali','Wau','Auram']
    ]
});

DesignationSystem.northIndianOcean = new DesignationSystem({
    displayName: 'North Indian Ocean',
    numEnable: false,
    mainLists: [
        ['Onil','Agni','Hibaru','Pyarr','Baaz','Fanoos','Mala','Mukda'],
        ['Ogni','Akash','Gonu','Yemyin','Sidr','Nargis','Rashmi','Khai-Muk'],
        ['Nisha','Bijli','Aila','Phyan','Ward','Laila','Bandu','Phet'],
        ['Giri','Jal','Keila','Thane','Murjan','Nilam','Viyaru','Phailin'],
        ['Helen','Lehar','Madi','Nanauk','Hudhud','Nilofar','Ashobaa','Komen'],
        ['Chapala','Megh','Roanu','Kyant','Nada','Vardah','Maarutha','Mora'],
        ['Ockhi','Sagar','Mekunu','Daye','Luban','Titli','Gaja','Phethai'],
        ['Fani','Vayu','Hikaa','Kyarr','Maha','Bulbul','Pawan','Amphan']
    ]
});

DesignationSystem.southWestIndianOcean = new DesignationSystem({
    displayName: 'Southwest Indian Ocean',
    suffix: 'R',
    annual: true,
    anchor: 2017,
    mainLists: [
        ['Ambali','Belna','Calvinia','Diane','Esami','Francisco','Gabekile','Herold','Irondro','Jeruto','Kundai','Lisebo','Michel','Nousra','Olivier','Pokera','Quincy','Rebaone','Salama','Tristan','Ursula','Violet','Wilson','Xila','Yekela','Zania'],
        ['Ava','Bongoyo','Chalane','Danilo','Eloise','Faraji','Guambe','Habana','Iman','Jobo','Kanga','Ludzi','Melina','Nathan','Onias','Pelagie','Quamar','Rita','Solani','Tarik','Urilia','Vuyane','Wagner','Xusa','Yarona','Zacarias'],
        ['Ana','Batsirai','Cliff','Damako','Emnati','Fezile','Gombe','Halima','Issa','Jasmine','Karim','Letlama','Maipelo','Njazi','Oscar','Pamela','Quentin','Rajab','Savana','Themba','Uyapo','Viviane','Walter','Xangy','Yemurai','Zanele']
    ]
});

DesignationSystem.southPacific = new DesignationSystem({
    displayName: 'South Pacific',
    suffix: 'F',
    mainLists: [
        ['Ana','Bina','Cody','Dovi','Eva','Fili','Gina','Hale','Irene','Judy','Kevin','Lola','Mal','Nat','Osai','Pita','Rae','Seru','Tam','Urmil','Vaianu','Wati','Xavier','Yani','Zita'],
        ['Arthur','Becky','Chip','Denia','Elisa','Fotu','Glen','Hettie','Innis','Julie','Ken','Lin','Maciu','Nisha','Orea','Pearl','Rene','Sarah','Troy','Uinita','Vanessa','Wano','Yvonne','Zaka'],
        ['Alvin','Bune','Cyril','Daphne','Eden','Florin','Garry','Haley','Isa','June','Kofi','Louise','Mike','Niko','Opeti','Perry','Reuben','Solo','Tuni','Ulu','Victor','Wanita','Yates','Zidane'],
        ['Amos','Bart','Crystal','Dean','Ella','Fehi','Garth','Hola','Iris','Josie','Keni','Liua','Mona','Neil','Oma','Pola','Rita','Sarai','Tino','Uesi','Vicky','Wasi','Yolanda','Zazu']
    ],
    replacementLists: [
        ['Aru','Ben','Chris','Danial','Emosi','Feki','Germaine','Hart','Ili','Josese','Kirio','Lute','Mata','Neta','Olivia','Pana','Rex','Samadiyo','Tasi','Uila','Velma','Wane','Yasa','Zanna']
    ]
});

DesignationSystem.southAtlantic = new DesignationSystem({
    displayName: 'South Atlantic',
    suffix: 'Q',
    mainLists: [
        ['Arani','Bapo','Cari','Deni','E\u00e7a\u00ed','Guar\u00e1','Iba','Jaguar','Kurum\u00ed','Mani','Oquira','Potira','Raoni','Ub\u00e1','Yakecan']
    ]
});

DesignationSystem.atlantic1979 = new DesignationSystem({
    displayName: 'Atlantic (1979-1984)',
    suffix: 'L',
    annual: true,
    anchor: 1979,
    mainLists: [
        ['Ana','Bob','Claudette','David','Elena','Frederic','Gloria','Henri','Isabel','Juan','Kate','Larry','Mindy','Nicholas','Odette','Peter','Rose','Sam','Teresa','Victor','Wanda'],
        ['Allen','Bonnie','Charley','Danielle','Earl','Frances','Georges','Hermine','Ivan','Jeanne','Karl','Lisa','Mitch','Nicole','Otto','Paula','Richard','Shary','Tomas','Virginie','Walter'],
        ['Arlene','Bret','Cindy','Dennis','Emily','Floyd','Gert','Harvey','Irene','Jose','Katrina','Lenny','Maria','Nate','Ophelia','Philippe','Rita','Stan','Tammy','Vince','Wilma'],
        ['Alberto','Beryl','Chris','Debby','Ernesto','Florence','Gilbert','Helene','Isaac','Joan','Keith','Leslie','Michael','Nadine','Oscar','Patty','Rafael','Sandy','Tony','Valerie','William'],
        ['Alicia','Barry','Chantal','Dean','Erin','Felix','Gabrielle','Hugo','Iris','Jerry','Karen','Luis','Marilyn','Noel','Opal','Pablo','Roxanne','Sebastien','Tanya','Van','Wendy'],
        ['Arthur','Bertha','Cesar','Diana','Edouard','Fran','Gustav','Hortense','Isidore','Josephine','Klaus','Lili','Marco','Nana','Omar','Paloma','Rene','Sally','Teddy','Vicky','Wilfred']
    ],
    auxLists: [
        ['Alpha','Beta','Gamma','Delta','Epsilon','Zeta','Eta','Theta','Iota','Kappa','Lambda','Mu','Nu','Xi','Omicron','Pi','Rho','Sigma','Tau','Upsilon','Phi','Chi','Psi','Omega'],
        ['Alef','Bet','Gimel','Dalet','He','Vav','Zayin','Het','Tet','Yod','Kaf','Lamed','Mem','Nun','Samekh','Ayin','Pe','Tsadi','Qof','Resh','Shin','Tav'] // Hebrew Alphabet not actually official, but added due to popular demand
    ]
});

DesignationSystem.periodicTable = new DesignationSystem({
    displayName: 'Periodic Table',
    suffix: DEPRESSION_LETTER,
    mainLists: [
        ["Hydrogen","Helium","Lithium","Beryllium","Boron","Carbon","Nitrogen","Oxygen","Fluorine","Neon","Sodium","Magnesium","Aluminium","Silicon","Phosphorus","Sulfur","Chlorine","Argon","Potassium","Calcium","Scandium","Titanium","Vanadium","Chromium","Manganese","Iron","Cobalt","Nickel","Copper","Zinc","Gallium","Germanium","Arsenic","Selenium","Bromine","Krypton","Rubidium","Strontium","Yttrium","Zirconium","Niobium","Molybdenum","Technetium","Ruthenium","Rhodium","Palladium","Silver","Cadmium","Indium","Tin","Antimony","Tellurium","Iodine","Xenon","Caesium","Barium","Lanthanum","Cerium","Praseodymium","Neodymium","Promethium","Samarium","Europium","Gadolinium","Terbium","Dysprosium","Holmium","Erbium","Thulium","Ytterbium","Lutetium","Hafnium","Tantalum","Tungsten","Rhenium","Osmium","Iridium","Platinum","Gold","Mercury","Thallium","Lead","Bismuth","Polonium","Astatine","Radon","Francium","Radium","Actinium","Thorium","Protactinium","Uranium","Neptunium","Plutonium","Americium","Curium","Berkelium","Californium","Einsteinium","Fermium","Mendelevium","Nobelium","Lawrencium","Rutherfordium","Dubnium","Seaborgium","Bohrium","Hassium","Meitnerium","Darmstadtium","Roentgenium","Copernicium","Nihonium","Flerovium","Moscovium","Livermorium","Tennessine","Oganesson"]
    ]
});

DesignationSystem.periodicTableAnnual = DesignationSystem.periodicTable.clone();
DesignationSystem.periodicTableAnnual.naming.annual = true;
DesignationSystem.periodicTableAnnual.displayName = 'Periodic Table (Annual)';

DesignationSystem.presetDesignationSystems = [
    DesignationSystem.atlantic,
    DesignationSystem.easternPacific,
    DesignationSystem.centralPacific,
    DesignationSystem.westernPacific,
    DesignationSystem.PAGASA,
    DesignationSystem.northIndianOcean,
    DesignationSystem.australianRegionBoM,
    DesignationSystem.southPacific,
    DesignationSystem.southWestIndianOcean,
    DesignationSystem.southAtlantic,
    DesignationSystem.australianRegionJakarta,
    DesignationSystem.australianRegionPortMoresby,
    DesignationSystem.atlantic1979,
    DesignationSystem.periodicTable,
    DesignationSystem.periodicTableAnnual
];