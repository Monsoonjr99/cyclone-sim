import { deepClone } from "./util";

interface StormData{
    phi: number;
    lambda: number;
    pressure: number;
    windSpeed: number;
}

interface ActiveStorm extends StormData{
    id: number;
}

interface SimulationState{
    liveTick: number;
    activeStorms: ActiveStorm[];
}

function state(toCopy?: SimulationState): SimulationState{
    if(toCopy)
        return deepClone<SimulationState>(toCopy);
    else
        return {
            liveTick: 0,
            activeStorms: []
        };
}