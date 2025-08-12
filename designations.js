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
        ['Ana','Bill','Claudette','Danny','Elsa','Fred','Grace','Henri','Imani','Julian','Kate','Larry','Mindy','Nicholas','Odette','Peter','Rose','Sam','Teresa','Victor','Wanda'],
        ['Alex','Bonnie','Colin','Danielle','Earl','Farrah','Gaston','Hermine','Idris','Julia','Karl','Lisa','Martin','Nicole','Owen','Paula','Richard','Shary','Tobias','Virginie','Walter'],
        ['Arlene','Bret','Cindy','Don','Emily','Franklin','Gert','Harold','Idalia','Jose','Katia','Lee','Margot','Nigel','Ophelia','Philippe','Rina','Sean','Tammy','Vince','Whitney'],
        ['Alberto','Brianna','Chris','Debby','Ernesto','Francine','Gordon','Holly','Isaac','Joyce','Kirk','Leslie','Miguel','Nadine','Oscar','Patty','Rafael','Sara','Tony','Valerie','William'],
        ['Andrea','Barry','Chantal','Dexter','Erin','Fernand','Gabrielle','Humberto','Imelda','Jerry','Karen','Lorenzo','Melissa','Nestor','Olga','Pablo','Rebekah','Sebastien','Tanya','Van','Wendy'],
        ['Arthur','Bertha','Cristobal','Dolly','Edouard','Fay','Gonzalo','Hanna','Isaias','Josephine','Kyle','Leah','Marco','Nana','Omar','Paulette','Rene','Sally','Teddy','Vicky','Wilfred']
    ],
    auxLists: [
        ["Adria", "Braylen", "Caridad", "Deshawn", "Emery", "Foster", "Gemma", "Heath", "Isla", "Jacobus", "Kenzie", "Lucio", "Makayla", "Nolan", "Orlanda", "Pax", "Ronin", "Sophie", "Tayshaun", "Viviana", "Will"]
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
        ["Adrian","Beatriz","Calvin","Debora","Eugene","Fernanda","Greg","Hilary","Irwin","Jova","Kenneth","Lidia","Max","Norma","Otilio","Pilar","Ramon","Selma","Todd","Veronica","Wiley","Xina","York","Zelda"],
        ["Aletta","Bud","Carlotta","Daniel","Emilia","Fabio","Gilma","Hector","Ileana","Jake","Kristy","Lane","Miriam","Norman","Olivia","Paul","Rosa","Sergio","Tara","Vicente","Willa","Xavier","Yolanda","Zeke"],
        ["Alvin","Barbara","Cosme","Dalila","Erick","Flossie","Gil","Henriette","Ivo","Juliette","Kiko","Lorena","Mario","Narda","Octave","Priscilla","Raymond","Sonia","Tico","Velma","Wallis","Xina","York","Zelda"],
        ["Amanda","Boris","Cristina","Douglas","Elida","Fausto","Genevieve","Hernan","Iselle","Julio","Karina","Lowell","Marie","Norbert","Odalys","Polo","Rachel","Simon","Trudy","Vance","Winnie","Xavier","Yolanda","Zeke"]
    ],
    auxLists: [
        ["Aidan", "Bruna", "Carmelo", "Daniella", "Esteban", "Flor", "Gerardo", "Hedda", "Izzy", "Jacinta", "Kenito", "Luna", "Marina", "Nancy", "Ovidio", "Pia", "Rey", "Skylar", "Teo", "Violeta", "Wilfredo", "Xinia", "Yariel", "Zoe"]
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
    mainLists: [    // names marked with empty comments are retired and will be replaced when replacement names are announced
        ["Damrey","Tianma","Kirogi","Yun-yeung","Koinu","Bolaven","Sanba","Jelawat","Ewiniar"/**/,"Maliksi","Gaemi","Prapiroon","Maria","Son-Tinh","Ampil","Wukong","Jongdari","Shanshan","Yagi"/**/,"Leepi","Bebinca","Pulasan","Soulik","Cimaron","Jebi"/**/,"Krathon"/**/,"Barijat","Trami"/**/],
        ["Kong-rey"/**/,"Yinxing","Toraji"/**/,"Man-yi"/**/,"Usagi"/**/,"Pabuk","Wutip","Sepat","Mun","Danas","Nari","Wipha","Francisco","Co-May","Krosa","Bailu","Podul","Lingling","Kajiki","Nongfa","Peipah","Tapah","Mitag","Ragasa","Neoguri","Bualoi","Matmo","Halong"],
        ["Nakri","Fengshen","Kalmaegi","Fung-wong","Koto","Nokaen","Penha","Nuri","Sinlaku","Hagupit","Jangmi","Mekkhala","Higos","Bavi","Maysak","Haishen","Noul","Dolphin","Kujira","Chan-hom","Peilou","Nangka","Saudel","Narra","Gaenari","Atsani","Etau","Bang-lang"],
        ["Krovanh","Dujuan","Surigae","Choi-wan","Koguma","Champi","In-fa","Cempaka","Nepartak","Lupit","Mirinae","Nida","Omais","Luc-binh","Chanthu","Dianmu","Mindulle","Lionrock","Tokei","Namtheun","Malou","Nyatoh","Sarbul","Amuyao","Gosari","Chaba","Aere","Songda"],
        ["Trases","Mulan","Meari","Tsing-ma","Tokage","Ong-mang","Muifa","Merbok","Nanmadol","Talas","Hodu","Kulap","Roke","Sonca","Nesat","Haitang","Jamjari","Banyan","Yamaneko","Pakhar","Sanvu","Mawar","Guchol","Talim","Bori","Khanun","Lan","Saobien"]
    ]
});

DesignationSystem.PAGASA = new DesignationSystem({
    displayName: 'PAGASA',
    secondary: true,
    numEnable: false,
    annual: true,
    anchor: 2001,
    nameThresh: 0,
    mainLists: [
        ["Auring","Bising","Crising","Dante","Emong","Fabian","Gorio","Huaning","Isang","Jacinto","Kiko","Lannie","Mirasol","Nando","Opong","Paolo","Quedan","Ramil","Salome","Tino","Uwan","Verbena","Wilma","Yasmin","Zoraida","Alamid","Bruno","Conching","Dolor","Ernie","Florante","Gerardo","Hernan","Isko","Jerome"],
        ["Ada","Basyang","Caloy","Domeng","Ester","Francisco","Gardo","Henry","Inday","Josie","Kiyapo","Luis","Maymay","Neneng","Obet","Pilandok","Queenie","Rosal","Samuel","Tomas","Umberto","Venus","Waldo","Yayang","Zeny","Agila","Bagwis","Chito","Diego","Elena","Felino","Gunding","Harriet","Indang","Jessa"],
        ["Amang","Betty","Chedeng","Dodong","Emil","Falcon","Gavino","Hanna","Ineng","Jenny","Kabayan","Liwayway","Marilyn","Nimfa","Onyok","Perla","Quiel","Ramon","Sarah","Tamaraw","Ugong","Viring","Weng","Yoyoy","Zigzag","Abe","Berto","Charo","Dado","Estoy","Felion","Gening","Herman","Irma","Jaime"],
        ["Amuyao","Butchoy","Carina","Dindo","Edring","Ferdie","Gener","Helen","Igme","Josefa","Kidul","Lekep","Marce","Nanolay","Onos","Puwok","Querubin","Romina","Siony","Tonyo","Upang","Vicky","Warren","Yoyong","Zosimo","Alakdan","Baldo","Clara","Dencio","Estong","Felipe","Gomer","Heling","Ismael","Julio"]
    ]
});

DesignationSystem.australianRegionBoM = new DesignationSystem({
    displayName: 'Australian Region (BoM)',
    suffix: 'U',
    mainLists: [
        ["Anika","Billy","Charlotte","Darian","Ellie","Freddy"/* to be replaced */,"Gemm","Herman","Isabella","Julian","Kima","Lincoln","Merryn","Neville","Olga","Paul","Robyn","Sean","Taliah","Vince","Zelia"],
        ["Anthony","Bianca","Courtney","Dianne","Errol","Fina","Grant","Hayley","Iggy","Jenna","Koji","Luana","Mitchell","Narelle","Oran","Peta","Riordan","Sandra","Tim","Victoria","Zane"],
        ["Alessia","Bruce","Catherine","Dylan","Edna","Fletcher","Gillian","Hadi","Ivana","Jack","Kate","Laszlo","Mingzhu","Nathan","Oriana","Quincey","Raquel","Stan","Tatiana","Uriah","Yvette"],
        ["Alfred","Blanche","Caleb","Dara","Ernie","Frances","Greg","Hilda","Irving","Joyce","Kelvin","Linda","Marco","Nora","Owen","Penny","Riley","Savannah","Trung","Verity","Wallace"],
        ["Amber","Blake","Claudia","Declan","Esther","Ferdinand","Gretel","Heath","Imogen","Joshua","Kimi","Lucas","Marian","Niran","Odette","Paddy","Ruby","Stafford","Tiffany","Vernon"]
    ]
});

DesignationSystem.australianRegionJakarta = new DesignationSystem({
    displayName: 'Australian Region (Jakarta)',
    numEnable: false,
    mainLists: [
        ['Anggrek','Bakung','Cempaka','Dahlia','Flamboyan','Kenanga','Lili','Melati','Rambutan','Teratai']
    ],
    replacementLists: [
        ['Anggur','Belimbing','Duku','Jambu','Lengkeng','Manggis','Nangka','Pepaya','Terong','Sawo']
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
        ['Fani','Vayu','Hikaa','Kyarr','Maha','Bulbul','Pawan','Amphan'],
        ['Nisarga','Gati','Nivar','Burevi','Tauktae','Yaas','Gulab','Shaheen','Jawad','Asani','Sitrang','Mandous','Mocha'],
        ['Biparjoy','Tej','Hamoon','Midhili','Michaung','Remal','Asna','Dana','Fengal','Shakhti','Montha','Senyar','Ditwah'],
        ['Arnab','Murasu','Akvan','Kaani','Ngamann','Sail','Sahab','Lulu','Ghazeer','Gigum','Thianyot','Afoor','Diksam'],
        ['Upakul','Aag','Sepand','Odi','Kyarthit','Naseem','Afshan','Mouj','Asif','Gagana','Bulan','Nahhaam','Sira'],
        ['Barshon','Vyom','Booran','Kenau','Sapakyee','Muzn','Manahil','Suhail','Sidrah','Verambha','Phutala','Quffal','Bakhur'],
        ['Rajani','Jhar','Anahita','Endheri','Wetwun','Sadeem','Shujana','Sadaf','Hareed','Garjana','Aiyara','Daaman','Ghwyzi'],
        ['Nishith','Probaho','Azar','Riyau','Mwaihout','Dima','Parwaz','Reem','Faid','Neeba','Saming','Deem','Hawf'],
        ['Urmi','Neer','Pooyan','Guruva','Kywe','Manjour','Zannata','Rayhan','Kaseer','Ninnada','Kraison','Gargoor','Balhaf'],
        ['Meghala','Prabhanjan','Arsham','Kurangi','Pinku','Rukam','Sarsar','Anbar','Nakheel','Viduli','Matcha','Khubb','Brom'],
        ['Samiron','Ghurni','Hengame','Kuredhi','Yinkaung','Watad','Badban','Oud','Haboob','Ogha','Mahingsa','Degl','Shuqra'],
        ['Pratikul','Ambud','Savas','Horangu','Linyone','Al-jarz','Sarrab','Bahar','Bareq','Salitha','Phraewa','Athmad','Fartak'],
        ['Sarobor','Jaladhi','Tahamtan','Thundi','Kyeekan','Rabab','Gulnar','Seef','Alreem','Rivi','Asuri','Boom','Darsah'],
        ['Mahanisha','Vega','Toofan','Faana','Bautphat','Raad','Waseq','Fanar','Wabil','Rudu','Thara','Saffar','Samhah']
    ]
});

DesignationSystem.southWestIndianOcean = new DesignationSystem({
    displayName: 'Southwest Indian Ocean',
    suffix: 'R',
    annual: true,
    anchor: 2017,
    mainLists: [
        ['Awo','Blossom','Chenge','Dudzai','Ewetse','Fytia','Gezani','Horacio','Indusa','Juluka','Kundai','Lisebo','Michel','Nousra','Olivier','Pokera','Quincy','Rebaone','Salama','Tristan','Ursula','Violet','Wilson','Xila','Yekela','Zaina'],
        ['Alvaro','Belal','Candice','Djoungou','Eleanor','Filipo','Gamane','Hidaya','Ialy','Jeremy','Kanga','Ludzi','Melina','Noah','Onias','Pelagie','Quamar','Rita','Solani','Tarik','Urilia','Vuyane','Wagner','Xusa','Yarona','Zacarias'],
        ['Ancha','Bheki','Chido','Dikeledi','Elvis','Faida','Garance','Honde','Ivone','Jude','Kanto','Lira','Maipelo','Njazi','Oscar','Pamela','Quentin','Rajab','Savana','Themba','Uyapo','Viviane','Walter','Xangy','Yemurai','Zanele']
    ]
});

DesignationSystem.southPacific = new DesignationSystem({
    displayName: 'South Pacific',
    suffix: 'F',
    mainLists: [
        ['Aru','Bina','Carol','Dovi','Eva','Fili','Gina','Hale','Irene','Josese','Kirio','Lute','Mata','Nat','Osai','Pita','Rae','Seru','Tam','Urmil','Vaianu','Wati','Xavier','Yani','Zita'],
        ['Arthur','Becky','Chip','Denia','Elisa','Fotu','Glen','Hettie','Innis','Julie','Ken','Lin','Maciu','Nisha','Orea','Palu','Rene','Sarah','Troy','Uinita','Vanessa','Wano','Yvonne','Zaka'],
        ['Alvin','Bune','Cyril','Danial','Eden','Florin','Garry','Haley','Isa','June','Kofi','Louise','Mike','Niko','Opeti','Perry','Reuben','Solo','Tuni','Ulu','Victor','Wanita','Yates','Zidane'],
        ['Amos','Bart','Crystal','Dean','Ella','Fehi','Garth','Hola','Iris','Jo','Kala','Liua','Mona','Neil','Oma','Pana','Rita','Samadiyo','Tasi','Uesi','Vicky','Wasi','Yabaki','Zazu']
    ],
    replacementLists: [
        ['Adama','Ben','Christy','Dakai','Emosi','Feki','Germaine','Hart','Ili','Junina','Kosi','Lia','Manoah','Neta','Olina','Paea','Rex','Sete','Temo','Uila','Velma','Wane','Yavala','Zanna']
    ]
});

DesignationSystem.southAtlantic = new DesignationSystem({
    displayName: 'South Atlantic',
    suffix: 'Q',
    mainLists: [
        ['Arani','Bapo','Cari','Deni','E\u00e7a\u00ed','Guar\u00e1','Iba','Jaguar','Kurum\u00ed','Mani','Oquira','Potira','Raoni','Ub\u00e1','Yakecan'],
        ['Akar\u00e1', 'Bigu\u00e1', 'Caiob\u00e1', 'Endy', 'Guarani', 'Igua\u00e7\u00fa', 'Jaci', 'Kaet\u00e9', 'Marac\u00e1', 'Okanga', 'Poti', 'Reri', 'Sum\u00e9', 'Tup\u00e3', 'Upaba', 'Ybatinga'],
        ['Aratu', 'Buri', 'Cai\u00e7ara', 'Esap\u00e9', 'Gua\u00ed', 'It\u00e3', 'Juru', 'Katu', 'Murici', 'Oryba', 'Peri', 'Reia', 'Sambur\u00e1', 'Taubat\u00e9', 'Uruana', 'Ytu']
    ]
});

// This is somewhat inaccurate but it works for now
DesignationSystem.mediterranean = new DesignationSystem({
    displayName: 'Mediterranean',
    suffix: 'M',
    annual: true,
    anchor: 2021,
    mainLists: [
        ['Apollo', 'Bianca', 'Ciril', 'Diana', 'Enea', 'Fedra', 'Goran', 'Hera', 'Ivan', 'Lina', 'Marco', 'Nada', 'Ole', 'Pandora', 'Remo', 'Sandra', 'Teodor', 'Ursula', 'Vito', 'Zora'],
        ['Ana', 'Bogdan', 'Clio', 'Dino', 'Eva', 'Fobos', 'Gaia', 'Helios', 'Ilina', 'Leon', 'Minerva', 'Nino', 'Olga', 'Petar', 'Rea', 'Silvan', 'Talia', 'Ugo', 'Vesta', 'Zenon'],
        ['Alexis', 'Bettina', 'Ciro', 'Dorothea', 'Emil', 'Fedra', 'Gori', 'Helga', 'Italo', 'Lilith', 'Marco', 'Nada', 'Ole', 'Palmira', 'Rocky', 'Shirlene', 'Tino', 'Ute', 'Vito', 'Zena'],
        ['Atena','Boris','Cassandra','Dionisio','Elena','Felix','Gabri','Hans','Ines','Lukas','Moira','Nenu','Oana','Pino','Rosa','Sirio','Talia','Uli','Vera','Zoran']
    ]
});

DesignationSystem.atlantic1950 = new DesignationSystem({
    displayName: 'Atlantic (1950-52)',
    suffix: 'L',
    annual: true,
    anchor: 1950,
    mainLists: [
        ['Able', 'Baker', 'Charlie', 'Dog', 'Easy', 'Fox', 'George', 'How', 'Item', 'Jig', 'King', 'Love', 'Mike', 'Nan', 'Oboe', 'Peter', 'Queen', 'Roger', 'Sugar', 'Tare', 'Uncle', 'Victor', 'William', 'Xray', 'Yoke', 'Zebra']
    ]
});

DesignationSystem.atlantic1953 = new DesignationSystem({
    displayName: 'Atlantic (1953-59)',
    suffix: 'L',
    annual: true,
    anchor: 1953,
    mainLists: [
        ['Alice', 'Barbara', 'Carol', 'Dolly', 'Edna', 'Florence', 'Gail', 'Hazel', 'Irene', 'Jill', 'Katherine', 'Lucy', 'Mabel', 'Norma', 'Orpha', 'Patsy', 'Queen', 'Rachel', 'Susie', 'Tina', 'Una', 'Vicky', 'Wallis'],
        ['Alice', 'Barbara', 'Carol', 'Dolly', 'Edna', 'Florence', 'Gilda', 'Hazel', 'Irene', 'Jill', 'Katherine', 'Lucy', 'Mabel', 'Norma', 'Orpha', 'Patsy', 'Queen', 'Rachel', 'Susie', 'Tina', 'Una', 'Vicky', 'Wallis'],
        ['Alice', 'Brenda', 'Connie', 'Diane', 'Edith', 'Flora', 'Gladys', 'Hilda', 'Ione', 'Janet', 'Katie', 'Linda', 'Martha', 'Nelly', 'Orva', 'Peggy', 'Queena', 'Rosa', 'Stella', 'Trudy', 'Ursa', 'Verna', 'Wilma', 'Xenia', 'Yvonne', 'Zelda'],
        ['Anna', 'Betsy', 'Carla', 'Dora', 'Ethel', 'Flossy', 'Greta', 'Hattie', 'Inez', 'Judith', 'Kitty', 'Laura', 'Molly', 'Nona', 'Odette', 'Paula', 'Quenby', 'Rhoda', 'Sadie', 'Terese', 'Ursel', 'Vesta', 'Winny', 'Xina', 'Yola', 'Zenda'],
        ['Audrey', 'Bertha', 'Carrie', 'Debbie', 'Esther', 'Frieda', 'Gracie', 'Hannah', 'Inga', 'Jessie', 'Kathie', 'Lisa', 'Margo', 'Netty', 'Odelle', 'Patty', 'Quinta', 'Roxie', 'Sandra', 'Theo', 'Undine', 'Venus', 'Wenda', 'Xmay', 'Yasmin', 'Zita'],
        ['Alma', 'Becky', 'Cleo', 'Daisy', 'Ella', 'Fifi', 'Gerda', 'Helene', 'Ilsa', 'Janice', 'Katy', 'Lila', 'Milly', 'Nola', 'Orchid', 'Portia', 'Queeny', 'Rena', 'Sherry', 'Thora', 'Udele', 'Virgy', 'Wilna', 'Xrae', 'Yurith', 'Zorna'],
        ['Arlene', 'Beulah', 'Cindy', 'Debra', 'Edith', 'Flora', 'Gracie', 'Hannah', 'Irene', 'Judith', 'Kristy', 'Lois', 'Marsha', 'Nellie', 'Orpha', 'Penny', 'Quella', 'Rachel', 'Sophie', 'Tanya', 'Udele', 'Vicky', 'Wilma', 'Xcel', 'Yasmin', 'Zasu']
    ]
});

DesignationSystem.atlantic1960 = new DesignationSystem({
    displayName: 'Atlantic (1960-63)',
    suffix: 'L',
    annual: true,
    anchor: 1960,
    mainLists: [
        ['Abby', 'Brenda', 'Cleo', 'Donna', 'Ethel', 'Florence', 'Gladys', 'Hilda', 'Isbell', 'Janet', 'Katy', 'Lila', 'Molly', 'Nita', 'Odette', 'Paula', 'Roxie', 'Stella', 'Trudy', 'Vesta', 'Winny'],
        ['Anna', 'Betsy', 'Carla', 'Debbie', 'Esther', 'Frances', 'Gerda', 'Hattie', 'Inga', 'Jenny', 'Kara', 'Laurie', 'Martha', 'Netty', 'Orva', 'Peggy', 'Rhoda', 'Sadie', 'Tanya', 'Virgy', 'Wenda'],
        ['Alma', 'Becky', 'Celia', 'Daisy', 'Ella', 'Flossie', 'Greta', 'Hallie', 'Inez', 'Judith', 'Kendra', 'Lois', 'Marsha', 'Noreen', 'Orpha', 'Patty', 'Rena', 'Sherry', 'Thora', 'Vicky', 'Wilna'],
        ['Arlene', 'Beulah', 'Cindy', 'Debra', 'Edith', 'Flora', 'Ginny', 'Helena', 'Irene', 'Janice', 'Kristy', 'Laura', 'Margo', 'Nona', 'Orchid', 'Portia', 'Rachel', 'Sandra', 'Terese', 'Verna', 'Wallis']
    ]
});

DesignationSystem.atlantic1972 = new DesignationSystem({
    displayName: 'Atlantic (1972-78)',
    suffix: 'L',
    annual: true,
    anchor: 1972,
    mainLists: [
        ['Agnes', 'Betty', 'Carrie', 'Dawn', 'Edna', 'Felice', 'Gerda', 'Harriet', 'Ilene', 'Jane', 'Kara', 'Lucile', 'Mae', 'Nadine', 'Odette', 'Polly', 'Rita', 'Sarah', 'Tina', 'Velma', 'Wendy'],
        ['Alice', 'Brenda', 'Christine', 'Delia', 'Ellen', 'Fran', 'Gilda', 'Helen', 'Imogene', 'Joy', 'Kate', 'Loretta', 'Madge', 'Nancy', 'Ona', 'Patsy', 'Rose', 'Sally', 'Tam', 'Vera', 'Wilda'],
        ['Alma', 'Becky', 'Dolly', 'Elaine', 'Fifi', 'Gertrude', 'Hester', 'Ivy', 'Justine', 'Kathy', 'Linda', 'Marsha', 'Nelly', 'Olga', 'Pearl', 'Roxanne', 'Sabrina', 'Thelma', 'Viola', 'Wilma'],
        ['Amy', 'Blanche', 'Caroline', 'Doris', 'Eloise', 'Faye', 'Gladys', 'Hallie', 'Ingrid', 'Julia', 'Kitty', 'Lilly', 'Mabel', 'Niki', 'Opal', 'Peggy', 'Ruby', 'Sheila', 'Tilda', 'Vicky', 'Winnie'],
        ['Anna', 'Belle', 'Candice', 'Dottie', 'Emmy', 'Frances', 'Gloria', 'Holly', 'Inga', 'Jill', 'Kay', 'Lilias', 'Maria', 'Nola', 'Orpha', 'Pamela' ,'Ruth', 'Shirley', 'Trixie', 'Vilda', 'Wynne'],
        ['Anita', 'Babe', 'Clara', 'Dorothy', 'Evelyn', 'Frieda', 'Grace', 'Hannah', 'Ida', 'Jodie', 'Kristina', 'Lois', 'Mary', 'Nora', 'Odel', 'Penny', 'Raquel', 'Sophia', 'Trudy', 'Virginia', 'Willene'],
        ['Amelia', 'Bess', 'Cora', 'Debra', 'Ella', 'Flossie', 'Greta', 'Hope', 'Irma', 'Juliet', 'Kendra', 'Louise', 'Martha', 'Noreen', 'Ora', 'Paula', 'Rosalie', 'Susan', 'Tanya', 'Vanessa', 'Wanda']
    ]
});

DesignationSystem.atlantic1979 = new DesignationSystem({
    displayName: 'Atlantic (1979-84)',
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
        ['Alpha','Beta','Gamma','Delta','Epsilon','Zeta','Eta','Theta','Iota','Kappa','Lambda','Mu','Nu','Xi','Omicron','Pi','Rho','Sigma','Tau','Upsilon','Phi','Chi','Psi','Omega']
    ]
});

DesignationSystem.easternPacific1960 = new DesignationSystem({
    displayName: 'Eastern Pacific (1960-65)',
    suffix: 'E',
    mainLists: [
        ['Annette', 'Bonny', 'Celeste', 'Diana', 'Estelle', 'Fernanda', 'Gwen', 'Hyacinth', 'Iva', 'Joanne', 'Kathleen', 'Liza', 'Madeline', 'Naomi', 'Orla', 'Pauline', 'Rebecca', 'Simone', 'Tara', 'Valerie', 'Willa'],
        ['Ava', 'Bernice', 'Claudia', 'Doreen', 'Emily', 'Florence', 'Glenda', 'Hazel', 'Irah', 'Jennifer', 'Katherine', 'Lillian', 'Mona', 'Natalie', 'Odessa', 'Prudence', 'Roslyn', 'Silvia', 'Tillie', 'Victoria', 'Wallie']
    ]
});

DesignationSystem.easternPacific1965 = new DesignationSystem({
    displayName: 'Eastern Pacific (1965-68)',
    suffix: 'E',
    annual: true,
    anchor: 1965,
    mainLists: [
        ['Ava', 'Bernice', 'Claudia', 'Doreen', 'Emily', 'Florence', 'Glenda', 'Hazel', 'Irah', 'Jennifer', 'Katherine', 'Lillian', 'Mona', 'Natalie', 'Odessa', 'Prudence', 'Roslyn', 'Silvia', 'Tillie', 'Victoria', 'Wallie'],
        ['Adele', 'Blanca', 'Connie', 'Dolores', 'Eileen', 'Francesca', 'Gretchen', 'Helga', 'Ione', 'Joyce', 'Kirsten', 'Lorraine', 'Maggie', 'Norma', 'Orlene', 'Patricia', 'Rosalie', 'Selma', 'Toni', 'Vivian', 'Winona'],
        ['Agatha', 'Bridget', 'Carlotta', 'Denise', 'Eleanor', 'Francene', 'Georgette', 'Hilary', 'Ilsa', 'Jewel', 'Katrina', 'Lily', 'Monica', 'Nanette', 'Olivia', 'Priscilla', 'Ramona', 'Sharon', 'Terry', 'Veronica', 'Winifred'],
        ['Annette', 'Bonny', 'Celeste', 'Diana', 'Estelle', 'Fernanda', 'Gwen', 'Hyacinth', 'Iva', 'Joanne', 'Kathleen', 'Liza', 'Madeline', 'Naomi', 'Orla', 'Pauline', 'Rebecca', 'Simone', 'Tara', 'Valerie', 'Willa']
    ]
});

// original four-year rotation of male/female EPac names
DesignationSystem.easternPacific1978 = new DesignationSystem({
    displayName: 'Eastern Pacific (1978-81)',
    suffix: 'E',
    annual: true,
    anchor: 1978,
    mainLists: [
        ['Aletta', 'Bud', 'Carlotta', 'Daniel', 'Emilia', 'Fico', 'Gilma', 'Hector', 'Iva', 'John', 'Kristy', 'Lane', 'Miriam', 'Norman', 'Olivia', 'Paul', 'Rosa', 'Sergio', 'Tara', 'Vicente', 'Willa'],
        ['Andres', 'Blanca', 'Carlos', 'Dolores', 'Enrique', 'Fefa', 'Guillermo', 'Hilda', 'Ignacio', 'Jimena', 'Kevin', 'Linda', 'Marty', 'Nora', 'Olaf', 'Pauline', 'Rick', 'Sandra', 'Terry', 'Vivian', 'Waldo'],
        ['Agatha', 'Blas', 'Celia', 'Darby', 'Estelle', 'Frank', 'Georgetta', 'Howard', 'Isis', 'Javier', 'Kay', 'Lester', 'Madeline', 'Newton', 'Orlene', 'Paine', 'Roslyn', 'Seymour', 'Tina', 'Virgil', 'Winifred'],
        ['Adrian', 'Beatriz', 'Calvin', 'Dora', 'Eugene', 'Fernanda', 'Greg', 'Hilary', 'Irwin', 'Jova', 'Knut', 'Lidia', 'Max', 'Norma', 'Otis', 'Pilar', 'Ramon', 'Selma', 'Todd', 'Veronica', 'Wiley']
    ],
    auxLists: [
        ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta', 'Eta', 'Theta', 'Iota', 'Kappa', 'Lambda', 'Mu', 'Nu', 'Xi', 'Omicron', 'Pi', 'Rho', 'Sigma', 'Tau', 'Upsilon', 'Phi', 'Chi', 'Psi', 'Omega']
    ]
});

// modern six-year rotation of male/female EPac names (overlaps with previous four-year rotation)
DesignationSystem.easternPacific1979 = new DesignationSystem({
    displayName: 'Eastern Pacific (1979-84)',
    suffix: 'E',
    annual: true, 
    anchor: 1979,
    mainLists: [
        ['Andres', 'Blanca', 'Carlos', 'Dolores', 'Enrique', 'Fefa', 'Guillermo', 'Hilda', 'Ignacio', 'Jimena', 'Kevin', 'Linda', 'Marty', 'Nora', 'Olaf', 'Pauline', 'Rick', 'Sandra', 'Terry', 'Vivian', 'Waldo'],
        ['Agatha', 'Blas', 'Celia', 'Darby', 'Estelle', 'Frank', 'Georgetta', 'Howard', 'Isis', 'Javier', 'Kay', 'Lester', 'Madeline', 'Newton', 'Orlene', 'Paine', 'Roslyn', 'Seymour', 'Tina', 'Virgil', 'Winifred'],
        ['Adrian', 'Beatriz', 'Calvin', 'Dora', 'Eugene', 'Fernanda', 'Greg', 'Hilary', 'Irwin', 'Jova', 'Knut', 'Lidia', 'Max', 'Norma', 'Otis', 'Pilar', 'Ramon', 'Selma', 'Todd', 'Veronica', 'Wiley'],
        ['Aletta', 'Bud', 'Carlotta', 'Daniel', 'Emilia', 'Fabio', 'Gilma', 'Hector', 'Iva', 'John', 'Kristy', 'Lane', 'Miriam', 'Norman', 'Olivia', 'Paul', 'Rosa', 'Sergio', 'Tara', 'Vicente', 'Willa'],
        ['Adolph', 'Barbara', 'Cosme', 'Dalila', 'Erick', 'Flossie', 'Gil', 'Henriette', 'Ismael', 'Juliette', 'Kiko', 'Lorena', 'Manuel', 'Narda', 'Octave', 'Priscilla', 'Raymond', 'Sonia', 'Tico', 'Velma', 'Winnie'],
        ['Alma', 'Boris', 'Cristina', 'Douglas', 'Elida', 'Fausto', 'Genevieve', 'Hernan', 'Iselle', 'Julio', 'Kenna', 'Lowell', 'Marie', 'Norbert', 'Odile', 'Polo', 'Rachel', 'Simon', 'Trudy', 'Vance', 'Wallis']
    ],
    auxLists: [
        ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta', 'Eta', 'Theta', 'Iota', 'Kappa', 'Lambda', 'Mu', 'Nu', 'Xi', 'Omicron', 'Pi', 'Rho', 'Sigma', 'Tau', 'Upsilon', 'Phi', 'Chi', 'Psi', 'Omega']
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
    DesignationSystem.mediterranean,
    DesignationSystem.australianRegionJakarta,
    DesignationSystem.australianRegionPortMoresby,
    DesignationSystem.atlantic1950,
    DesignationSystem.atlantic1953,
    DesignationSystem.atlantic1960,
    DesignationSystem.atlantic1972,
    DesignationSystem.atlantic1979,
    DesignationSystem.easternPacific1960,
    DesignationSystem.easternPacific1965,
    DesignationSystem.easternPacific1978,
    DesignationSystem.easternPacific1979,
    DesignationSystem.periodicTable,
    DesignationSystem.periodicTableAnnual
];