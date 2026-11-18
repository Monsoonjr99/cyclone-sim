import { RAD_TO_DEG } from './util';
// import { getMaps } from './worldmap';
import { GeoCoordinate } from './geocoordinate';

interface EnvData{
    mapData: ImageData;
}

let envData: EnvData;

// (async ()=>{
//     let mapData_ = (await getMaps()).mapData;
//     if(mapData_ !== null){
//         mapData = mapData_;
//         ready = true;
//     }else
//         console.error("Map data failed to load");
// })();

export function init(envData_: EnvData){
    envData = envData_;
}

function isReady(){
    if(!envData){
        console.error('simulation envData not initialized');
	return false;
    }
    return true;
}

export interface TestStorm{
    latitude : number;
    longitude : number;
    sh : boolean;
    wind : number;
    mountainShredded? : boolean;
    motion: {x : number, y : number};
    numeral? : number;
    name? : string;
}

export let simulationState_test : TestStorm[] = [];
let latestStormNumeral = 0;
let latestNameIndex = 0;

const nameList_test = [
    "Able",
    "Baker",
    "Charlie",
    "Dog",
    "Easy",
    "Fox",
    "George",
    "How",
    "Item",
    "Jig",
    "King",
    "Love",
    "Mike",
    "Nan",
    "Oboe",
    "Peter",
    "Queen",
    "Roger",
    "Sugar",
    "Tare",
    "Uncle",
    "Victor",
    "William",
    "Xray",
    "Yoke",
    "Zebra"
];

function getLand_test(mapData : ImageData, latitude : number, longitude : number){
    // if(!ready) return 0;

    const x = Math.floor(mapData.width * (longitude + 180) / 360);
    const y = Math.floor(mapData.height * (-latitude + 90) / 180);
    const greenChannel = 1;
    const redChannel = 0;
    const isLand = mapData.data[4 * (mapData.width * y + x) + greenChannel];
    const elevation = mapData.data[4 * (mapData.width * y + x) + redChannel];
    if(elevation >= 50)
        return 2;
    else if(isLand > 0)
        return 1;
    else
        return 0;
}

export function randomSpawn_test(){
    if(!isReady()) return;

    let sanity = 10000;
    let lat: number;
    let long: number;
    do{
        lat = Math.asin(Math.random() * 2 - 1) * RAD_TO_DEG;
        long = Math.random() * 360 - 180;
        sanity--;
    }while(getLand_test(envData.mapData, lat, long) > 0 && sanity > 0);
    const dir = Math.random() * 2 * Math.PI;
    simulationState_test.push({
        latitude: lat,
        longitude: long,
        sh: lat < 0,
        wind: 25 + Math.random() * 15,
        motion: {
            x: 12 * Math.cos(dir),
            y: 12 * Math.sin(dir)
        },
        numeral: latestStormNumeral++
    });
}

// test "simulation"
export function simulation_test(iterations: number){
    if(!isReady()) return;

    for(let i = 0; i < iterations; i++){
        for(let j = simulationState_test.length - 1; j >= 0; j--){
            const testStorm = simulationState_test[j];
            const newPos = GeoCoordinate.addMovement(testStorm, testStorm.motion);
            const newDir = Math.PI / 2 - GeoCoordinate.directionToward(newPos, testStorm) * Math.PI / 180 + Math.PI;
            const oldDir = Math.atan2(testStorm.motion.y, testStorm.motion.x);
            testStorm.latitude = newPos.latitude;
            testStorm.longitude = newPos.longitude;
            const rotateMotionBy = newDir - oldDir + (Math.random() - 0.5) * (Math.PI / 8);
            testStorm.motion = {x: testStorm.motion.x * Math.cos(rotateMotionBy) - testStorm.motion.y * Math.sin(rotateMotionBy), y: testStorm.motion.x * Math.sin(rotateMotionBy) + testStorm.motion.y * Math.cos(rotateMotionBy)};
            const landVal = getLand_test(envData.mapData, testStorm.latitude, testStorm.longitude);
            if(landVal === 2){
                testStorm.wind += (Math.random() - 1.7) * 4.375;
                testStorm.mountainShredded = true;
            }else if(landVal === 1)
                testStorm.wind += (Math.random() - 0.7) * 4.375;
            else
                testStorm.wind += (Math.random() - 0.48) * 4.375;
            if(testStorm.mountainShredded){
                if(testStorm.wind > 50)
                    testStorm.wind -= (testStorm.wind - 50) * 0.1;
                if(landVal === 0 && Math.random() < 0.001)
                    testStorm.mountainShredded = false;
            }
            if(testStorm.numeral === undefined)
                testStorm.numeral = latestStormNumeral++;
            if(testStorm.name === undefined && testStorm.wind >= 35)
                testStorm.name = nameList_test[(latestNameIndex++) % nameList_test.length];
            if(testStorm.wind <= 8.75)
                simulationState_test.splice(j, 1);
        }
        if(Math.random() < 0.01)
            randomSpawn_test();
    }
}



// import { deepClone } from "./util";
//
// interface StormData{
//     latitude: number;
//     longitude: number;
//     pressure: number;
//     windSpeed: number;
// }
//
// interface ActiveStorm extends StormData{
//     id: number;
// }
//
// interface SimulationState{
//     liveTick: number;
//     activeStorms: ActiveStorm[];
// }
//
// function state(toCopy?: SimulationState): SimulationState{
//     if(toCopy)
//         return deepClone<SimulationState>(toCopy);
//     else
//         return {
//             liveTick: 0,
//             activeStorms: []
//         };
// }
