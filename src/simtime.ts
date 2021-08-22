import { DateTime } from 'luxon';
import { zeroPad } from './util';

// simulation tick values and manipulation functions
export let liveTick = 0;               // the "present" tick of the simulation
export let viewTick = 0;               // the tick being viewed by the user

export function setLiveTick(t: number){
    liveTick = t;
}

export function advanceLiveTick(): number{
    return ++liveTick;
}

export function setViewTick(t: number){
    viewTick = t;
}

// convert tick to real date-and-time string
export function tickToFormattedDate(t: number, startYear: number): string{
    const partialFormat = "HH'z' LLL dd"
    let dt = DateTime.utc(startYear, 1, 1).plus({hours: t});
    let str = dt.toFormat(partialFormat);
    let y = dt.year;
    let bce: boolean;
    if(y < 1){
        y = 1 - y;
        bce = true;
    }
    str += ' ' + zeroPad(y, 4);
    if(bce)
        str += ' B.C.E.';
    return str;
}