const TITLE = "Cyclone Simulator";
const VERSION_NUMBER = "0.2.7";
const BUILD_NUMBER = "20200217a";

const SAVE_FORMAT = 6;  // Format #6 in use starting in v0.2
const EARLIEST_COMPATIBLE_FORMAT = 0;
const ENVDATA_COMPATIBLE_FORMAT = 0;

const WIDTH = 960; // 16:9 aspect ratio
const HEIGHT = 540;
const DIAMETER = 20;    // Storm icon diameter
const PERLIN_ZOOM = 100;    // Resolution for perlin noise
const TICK_DURATION = 3600000;  // How long in sim time does a tick last in milliseconds (1 hour)
const ADVISORY_TICKS = 6;    // Number of ticks per advisory
const YEAR_LENGTH = 365.2425*24;        // The length of a year in ticks; used for seasonal activity
const NHEM_DEFAULT_YEAR = moment.utc().year();
const SHEM_DEFAULT_YEAR = moment.utc().month() < 6 ? NHEM_DEFAULT_YEAR : NHEM_DEFAULT_YEAR+1;
const DEPRESSION_LETTER = "H";
const WINDSPEED_ROUNDING = 5;
const MAP_DEFINITION = 2;   // normal scaler for the land map
const MAP_TYPES = [     // Land generation controls for different map types
    {   // "Two Continents" map type
        form: "linear",
        landBiasFactors: [
            5/8,        // Where the "center" should be for land/ocean bias (0-1 scale from west to east)
            0.15,       // Bias factor for the west edge (positive = land more likely, negative = sea more likely)
            -0.3,       // Bias factor for the "center" (as defined by .landBiasFactors[0])
            0.1         // Bias factor for the east edge
        ]
    },
    {   // "East Continent" map type
        form: "linear",
        landBiasFactors: [
            5/8,
            -0.3,
            -0.3,
            0.15
        ]
    },
    {   // "West Continent" map type
        form: "linear",
        landBiasFactors: [
            1/2,
            0.15,
            -0.3,
            -0.3
        ]
    },
    {   // "Island Ocean" map type
        form: "linear",
        landBiasFactors: [
            1/2,
            -0.28,
            -0.28,
            -0.28
        ]
    },
    {   // "Central Continent" map type
        form: "radial",
        landBiasFactors: [
            1/2,    // Where the east-west center should be (0-1 scale from west to east)
            1/2,    // Where the north-south center should be (0-1 scale from north to south)
            1/2,    // First control distance (in terms of the geometric mean of the canvas dimensions)
            1,      // Second control distance
            0.15,   // Bias factor for the center
            -0.27,   // Bias factor for the first control distance
            -0.3    // Bias factor for the second control distance and outward
        ]
    },
    {   // "Central Inland Sea" map type
        form: "radial",
        landBiasFactors: [
            1/2,
            1/2,
            3/8,
            1,
            -0.3,
            0.2,
            0.3
        ]
    },
    {   // "Atlantic" map type
        form: 'pixelmap',
        path: 'resources/Atlantic.png'
    },
    {   // "Eastern Pacific" map type
        form: 'pixelmap',
        path: 'resources/EasternPacific.png',
        special: 'CPac'
    },
    {   // "Western Pacific" map type
        form: 'pixelmap',
        path: 'resources/WesternPacific.png',
        special: 'PAGASA'
    },
    {   // "Northern Indian Ocean" map type
        form: 'pixelmap',
        path: 'resources/NIO.png',
        special: 'NIO'
    },
    {   // "Australian Region" map type
        form: 'pixelmap',
        path: 'resources/Aus.png',
        special: 'AUS'
    },
    {   // "South Pacific" map type
        form: 'pixelmap',
        path: 'resources/SouthPacific.png'
    },
    {   // "South-West Indian Ocean" map type
        form: 'pixelmap',
        path: 'resources/SWIO.png'
    }
];
const EXTROP = 0;
const SUBTROP = 1;
const TROP = 2;
const TROPWAVE = 3;
const STORM_TYPES = 4;
const KEY_LEFT_BRACKET = 219;
const KEY_RIGHT_BRACKET = 221;
const KEY_F11 = 122;
const KEY_REPEAT_COOLDOWN = 15;
const KEY_REPEATER = 5;
const MAX_SNOW_LAYERS = 50;
const SNOW_SEASON_OFFSET = 5/6;
const ENV_LAYER_TILE_SIZE = 20;
const NC_OFFSET_RANDOM_FACTOR = 4096;
const ACE_WIND_THRESHOLD = 34;
const ACE_DIVISOR = 10000;
const DAMAGE_DIVISOR = 1000;
const ENVDATA_NOT_FOUND_ERROR = "envdata-not-found";
const LOADED_SEASON_REQUIRED_ERROR = "loaded-season-required";
const LOAD_MENU_BUTTONS_PER_PAGE = 6;
const DEFAULT_MAIN_SUBBASIN = 0;
const DEFAULT_OUTBASIN_SUBBASIN = 255;
const DESIG_CROSSMODE_ALWAYS = 0;
const DESIG_CROSSMODE_STRICT_ALWAYS = 1;
const DESIG_CROSSMODE_REGEN = 2;
const DESIG_CROSSMODE_STRICT_REGEN = 3;
const DESIG_CROSSMODE_KEEP = 4;
const SCALE_MEASURE_ONE_MIN_KNOTS = 0;
const SCALE_MEASURE_TEN_MIN_KNOTS = 1;
const SCALE_MEASURE_MILLIBARS = 2;
const SCALE_MEASURE_INHG = 3;
const SCALE_MEASURE_ONE_MIN_MPH = 4;
const SCALE_MEASURE_TEN_MIN_MPH = 5;
const SCALE_MEASURE_ONE_MIN_KMH = 6;
const SCALE_MEASURE_TEN_MIN_KMH = 7;

// Saving/loading-related constants

const AUTOSAVE_SAVE_NAME = "Autosave";
const DB_KEY_SETTINGS = "settings";
const LOADED_SEASON_EXPIRATION = 150000;    // minimum duration in miliseconds after a season was last accessed before it unloads (2.5 minutes)
const FORMAT_WITH_SAVED_SEASONS = 1;
const FORMAT_WITH_INDEXEDDB = 2;
const FORMAT_WITH_IMPROVED_ENV = 3;
const FORMAT_WITH_SUBBASIN_SEASON_STATS = 4;
const FORMAT_WITH_STORM_SUBBASIN_DATA = 5;
const FORMAT_WITH_SCALES = 6;

// Legacy saving/loading-related constants (backwards-compatibility)

const LEGACY_SAVE_NAME_PREFIX = "Slot ";
const LOCALSTORAGE_KEY_PREFIX = "cyclone-sim-";
const LOCALSTORAGE_KEY_SAVEDBASIN = "savedbasin-";
const LOCALSTORAGE_KEY_BASIN = "basin";
const LOCALSTORAGE_KEY_FORMAT = "format";
const LOCALSTORAGE_KEY_NAMES = "names";
const LOCALSTORAGE_KEY_SEASON = "season-";
const LOCALSTORAGE_KEY_SETTINGS = "settings";
const SAVING_RADIX = 36;
// const ENVDATA_SAVE_FLOAT = -2;
const ENVDATA_SAVE_MULT = 10000;
// const ACTIVESYSTEM_SAVE_FLOAT = -2;

const HELP_TEXT = "Keyboard Controls:\n" +
    "\t\tSPACE - Pause/resume simulation\n" +
    "\t\tA - Step simulation one hour while paused\n" +
    "\t\tE - Cycle through map layers\n" +
    "\t\tT - Cycle through track display modes\n" +
    "\t\tW - Toggle intensity indicators below storm icons (kts / hPa)\n" +
    "\t\tM - Toggle magnifying glass for map layers\n" +
    "\t\t[ - Decrease simulation speed (half)\n" +
    "\t\t] - Increase simulation speed (double)\n" +
    "\t\tLEFT ARROW - Step backwards through analysis\n" +
    "\t\tRIGHT ARROW - Step forewards through analysis\n" +
    "\t\tCLICK + [special key] - Spawn [corresponding storm system]\n" +
    "\t\t\t\tX - Extratropical cyclone\n" +
    "\t\t\t\tL - Tropical Low/Wave\n" +
    "\t\t\t\tD - Tropical Depression\n" +
    "\t\t\t\tS - Tropical Storm\n" +
    "\t\t\t\t[number key 1-9] - Category [1-9]* Tropical Cyclone\n" +
    '\t\t\t\t0 - Category 10* Tropical Cyclone\n' +
    '\t\t\t\tY - Hyperclone*\n' +
    '\t\t\t\t\t*must use Extended Saffir-Simpson scale to see C6+ storms';

const COLORS = {};      // For storing all colors used in the graphics

function defineColors(){    // Since p5 color() function doesn't work until setup(), this is called in setup()
    COLORS.bg = color(10,55,155);
    COLORS.storm = {};
    COLORS.storm[EXTROP] = color(220,220,220);
    COLORS.storm[TROPWAVE] = color(130,130,240);
    COLORS.storm.extL = "red";
    COLORS.land = [];
    COLORS.land.push([0.85, color(190,190,190)]);
    COLORS.land.push([0.8, color(160,160,160)]);
    COLORS.land.push([0.75, color(145,115,90)]);
    COLORS.land.push([0.7, color(160,125,100)]);
    COLORS.land.push([0.65, color(35,145,35)]);
    COLORS.land.push([0.6, color(35,160,35)]);
    COLORS.land.push([0.55, color(30,175,30)]);
    COLORS.land.push([0.53, color(205,205,105)]);
    COLORS.land.push([0.5, color(230,230,105)]);
    COLORS.snow = color(240);
    COLORS.outBasin = color(45,70,120);
    COLORS.subBasinOutline = color(255,255,0);
    COLORS.UI = {};
    COLORS.UI.bar = color(200,100);
    COLORS.UI.box = color(200,170);
    COLORS.UI.buttonBox = color(200,170);
    COLORS.UI.buttonHover = color(200);
    COLORS.UI.text = color(0);
    COLORS.UI.greyText = color(130);
    COLORS.UI.redText = color(240,0,0);
    COLORS.UI.nonSelectedInput = color(70);
    COLORS.UI.input = color(255);
    COLORS.UI.loadingSymbol = color(0,40,85);
}