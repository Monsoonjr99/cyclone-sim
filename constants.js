const TITLE = "Cyclone Simulator";
const VERSION_NUMBER = "20190201a";

const SAVE_FORMAT = 0;  // Format "0" is probably to be a test and ultimately incompatible
const EARLIEST_COMPATIBLE_FORMAT = 0;

const DIAMETER = 20;    // Storm icon diameter
const PERLIN_ZOOM = 100;    // Resolution for perlin noise
const TICK_DURATION = 3600000;  // How long in sim time does a tick last in milliseconds (1 hour)
const ADVISORY_TICKS = 6;    // Number of ticks per advisory
const YEAR_LENGTH = 365.2425*24;        // The length of a year in ticks; used for seasonal activity
const TIME_FORMAT = "HH[z] MMM DD Y";
const NHEM_DEFAULT_YEAR = moment.utc().year();
const SHEM_DEFAULT_YEAR = moment.utc().month() < 6 ? NHEM_DEFAULT_YEAR : NHEM_DEFAULT_YEAR+1;
const DEPRESSION_LETTER = "H";
const WINDSPEED_ROUNDING = 5;
const LAND_BIAS_FACTORS = [
    5/8,        // Where the "center" should be for land/ocean bias (0-1 scale from west to east)
    0.15,       // Bias factor for the west edge (positive = land more likely, negative = sea more likely)
    -0.3,       // Bias factor for the "center" (as defined by LAND_BIAS_FACTORS[0])
    0.1         // Bias factor for the east edge
];
const EXTROP = 0;//"extratropical";
const SUBTROP = 1;//"subtropical";
const TROP = 2;//"tropical";
const TROPWAVE = 3;//"tropical wave";
const STORM_TYPES = 4;//[EXTROP,SUBTROP,TROP,TROPWAVE];
const NAMES = [        // Temporary Hardcoded Name List
    ['Ana','Bill','Claudette','Danny','Elsa','Fred','Grace','Henri','Ida','Julian','Kate','Larry','Mindy','Nicholas','Odette','Peter','Rose','Sam','Teresa','Victor','Wanda'],
    ['Alex','Bonnie','Colin','Danielle','Earl','Fiona','Gaston','Hermine','Ian','Julia','Karl','Lisa','Martin','Nicole','Owen','Paula','Richard','Shary','Tobias','Virginie','Walter'],
    ['Arlene','Bret','Cindy','Don','Emily','Franklin','Gert','Harold','Idalia','Jose','Katia','Lee','Margot','Nigel','Ophelia','Philippe','Rina','Sean','Tammy','Vince','Whitney'],
    ['Alberto','Beryl','Chris','Debby','Ernesto','Florence','Gordon','Helene','Isaac','Joyce','Kirk','Leslie','Michael','Nadine','Oscar','Patty','Rafael','Sara','Tony','Valerie','William'],
    ['Andrea','Barry','Chantal','Dorian','Erin','Fernand','Gabrielle','Humberto','Imelda','Jerry','Karen','Lorenzo','Melissa','Nestor','Olga','Pablo','Rebekah','Sebastien','Tanya','Van','Wendy'],
    ['Arthur','Bertha','Cristobal','Dolly','Edouard','Fay','Gonzalo','Hanna','Isaias','Josephine','Kyle','Laura','Marco','Nana','Omar','Paulette','Rene','Sally','Teddy','Vicky','Wilfred'],
    ['Alpha','Beta','Gamma','Delta','Epsilon','Zeta','Eta','Theta','Iota','Kappa','Lambda','Mu','Nu','Xi','Omicron','Pi','Rho','Sigma','Tau','Upsilon','Phi','Chi','Psi','Omega']
];
const KEY_LEFT_BRACKET = 219;
const KEY_RIGHT_BRACKET = 221;
const KEY_REPEAT_COOLDOWN = 15;
const KEY_REPEATER = 5;
const SNOW_LAYERS = 40;
const SNOW_SEASON_OFFSET = 5/6;
const ENV_LAYER_TILE_SIZE = 20;
const NC_OFFSET_RANDOM_FACTOR = 4096;
const LOCALSTORAGE_KEY_PREFIX = "cyclone-sim-";
const LOCALSTORAGE_KEY_BASIN = "basin";
const LOCALSTORAGE_KEY_FORMAT = "format";
const AUTOSAVE_TICK_PERIOD = 240;

const OFF_SEASON_POLAR_TEMP = -3;
const PEAK_SEASON_POLAR_TEMP = 10;
const OFF_SEASON_TROPICS_TEMP = 26;
const PEAK_SEASON_TROPICS_TEMP = 29;

const HELP_TEXT = "Keyboard Controls:\n" +
    "\t\tSPACE - Pause/resume simulation\n" +
    "\t\tA - Step simulation one hour while paused\n" +
    "\t\tE - Cycle through map layers\n" +
    "\t\tW - Toggle strength indicators below storm icons (kts / hPa)\n" +
    "\t\t[ - Decrease simulation speed by half\n" +
    "\t\t] - Increase simulation speed by double\n" +
    "\t\tLEFT ARROW - Step backwards through analysis\n" +
    "\t\tRIGHT ARROW - Step forewards through analysis\n" +
    "\t\tCLICK + [special key] - Spawn [corresponding storm system]\n" +
    "\t\t\t\tX - Extratropical cyclone\n" +
    "\t\t\t\tL - Tropical Low/Wave\n" +
    "\t\t\t\tD - Tropical Depression\n" +
    "\t\t\t\tS - Tropical Storm\n" +
    "\t\t\t\t[number key 1-5] - Category [1-5] Tropical Cyclone";

const COLORS = {};      // For storing all colors used in the graphics

function defineColors(){    // Since p5 color() function doesn't work until setup(), this is called in setup()
    COLORS.bg = color(0,127,255);
    COLORS.storm = {};
    COLORS.storm[EXTROP] = color(220,220,220);
    COLORS.storm[TROPWAVE] = color(130,130,240);
    COLORS.storm[TROP] = {};
    COLORS.storm[TROP][-2] = color(130,130,240);
    COLORS.storm[TROP][-1] = color(20,20,230);
    COLORS.storm[TROP][0] = color(20,230,20);
    COLORS.storm[TROP][1] = color(230,230,20);
    COLORS.storm[TROP][2] = color(240,170,20);
    COLORS.storm[TROP][3] = color(240,20,20);
    COLORS.storm[TROP][4] = color(250,40,250);
    COLORS.storm[TROP][5] = color(250,140,250);
    COLORS.storm[SUBTROP] = {};
    COLORS.storm[SUBTROP][-1] = color(60,60,220);
    COLORS.storm[SUBTROP][0] = color(60,220,60);
    COLORS.storm.extL = "red";
    COLORS.land = [];
    COLORS.land.push([0.85, color(190,190,190)]);
    COLORS.land.push([0.8, color(160,160,160)]);
    COLORS.land.push([0.75, color(145,115,90)]);
    COLORS.land.push([0.7, color(160,125,100)]);
    COLORS.land.push([0.65, color(30,160,30)]);
    COLORS.land.push([0.6, color(20,175,20)]);
    COLORS.land.push([0.55, color(0,200,0)]);
    COLORS.land.push([0.53, color(220,220,110)]);
    COLORS.land.push([0.5, color(250,250,90)]);
    COLORS.snow = color(240);
    COLORS.UI = {};
    COLORS.UI.bar = color(200,100);
    COLORS.UI.box = color(200,170);
    COLORS.UI.buttonBox = color(200,170);
    COLORS.UI.buttonHover = color(200);
    COLORS.UI.text = color(0);
    COLORS.UI.greyText = color(130);
}