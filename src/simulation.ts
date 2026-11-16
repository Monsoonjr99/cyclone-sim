import { RAD_TO_DEG } from './util';
import { getMaps } from './worldmap';
import { GeoCoordinate } from './geocoordinate';

let mapData: ImageData;
let ready = false;

(async ()=>{
    let mapData_ = (await getMaps()).mapData;
    if(mapData_ !== null){
        mapData = mapData_;
        ready = true;
    }else
        console.error("Map data failed to load");
})();

export interface TestIcon{
    latitude : number;
    longitude : number;
    sh : boolean;
    omega : number;
    motion: {x : number, y : number};
    numeral? : number;
    name? : string;
}

export let simulationState_test : TestIcon[] = [];
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

function getLand_test(latitude : number, longitude : number){
    if(!ready) return 0;

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
    let sanity = 10000;
    let lat: number;
    let long: number;
    do{
        lat = Math.asin(Math.random() * 2 - 1) * RAD_TO_DEG;
	long = Math.random() * 360 - 180;
	sanity--;
    }while(getLand_test(lat, long) > 0 && sanity > 0);
    const dir = Math.random() * 2 * Math.PI;
    simulationState_test.push({
        latitude: lat,
        longitude: long,
        sh: lat < 0,
        omega: Math.PI * 1 / 2,
        motion: {
            x: 12 * Math.cos(dir),
            y: 12 * Math.sin(dir)
        },
	numeral: latestStormNumeral++
    });
}

// test "simulation"
export function simulation_test(iterations: number){
    if(!ready) return;

    for(let i = 0; i < iterations; i++){
        for(let j = simulationState_test.length - 1; j >= 0; j--){
            const testIcon = simulationState_test[j];
            const newPos = GeoCoordinate.addMovement(testIcon, testIcon.motion);
            const newDir = Math.PI / 2 - GeoCoordinate.directionToward(newPos, testIcon) * Math.PI / 180 + Math.PI;
            const oldDir = Math.atan2(testIcon.motion.y, testIcon.motion.x);
            testIcon.latitude = newPos.latitude;
            testIcon.longitude = newPos.longitude;
            const rotateMotionBy = newDir - oldDir + (Math.random() - 0.5) * (Math.PI / 8);
            testIcon.motion = {x: testIcon.motion.x * Math.cos(rotateMotionBy) - testIcon.motion.y * Math.sin(rotateMotionBy), y: testIcon.motion.x * Math.sin(rotateMotionBy) + testIcon.motion.y * Math.cos(rotateMotionBy)};
            const landVal = getLand_test(testIcon.latitude, testIcon.longitude);
	    if(landVal === 2)
                testIcon.omega += (Math.random() - 2) * (Math.PI / 12);
            else if(landVal === 1)
                testIcon.omega += (Math.random() - 0.7) * (Math.PI / 12);
            else
                testIcon.omega += (Math.random() - 0.48) * (Math.PI / 12);
            testIcon.omega = Math.min(testIcon.omega, 4 * Math.PI);
	    if(testIcon.name === undefined && testIcon.omega >= Math.PI * 2 / 3)
                testIcon.name = nameList_test[(latestNameIndex++) % nameList_test.length];
            if(testIcon.omega <= Math.PI / 6)
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
