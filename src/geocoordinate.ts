// handles geographic (latitude/longitude) coordinates and associated vector operations on spherical geometry
// formulas for calculations courtesy of Ed Williams - https://edwilliams.org/avform147.htm

import { mod, clamp } from './util';

// definition constants of latitude/longitude scale bounds
export const LATITUDE_MAX = 90;
export const LONGITUDE_MAX = 180;

// angle measurement conversions
const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 1 / DEG_TO_RAD;
const DEG_TO_NM = 60;
const NM_TO_DEG = 1 / DEG_TO_NM;
const RAD_TO_NM = RAD_TO_DEG * DEG_TO_NM;
const NM_TO_RAD = 1 / RAD_TO_NM;

export interface LatLongCoord{
    latitude : number;
    longitude : number;
}

export class GeoCoordinate implements LatLongCoord{
    readonly latitude: number;
    readonly longitude: number;

    constructor(latitude: number, longitude: number){
        this.latitude = clampLatitude(latitude);
        this.longitude = normalizeLongitude(longitude);

        // make immutable
        Object.freeze(this);
    }

    // performs plain vector addition upon coordinates
    static add(coord1: LatLongCoord, coord2: LatLongCoord): GeoCoordinate;
    static add(coord: LatLongCoord, latitudeAmt: number, longitudeAmt: number): GeoCoordinate;
    static add(coord1: LatLongCoord, latOrCoord: LatLongCoord | number, longAmt?: number){
        let latitudeAmt = 0, longitudeAmt = 0;
        if(typeof latOrCoord === 'object'){
            latitudeAmt = latOrCoord.latitude;
            longitudeAmt = latOrCoord.longitude;
        }else if(longAmt !== undefined){
            latitudeAmt = latOrCoord;
            longitudeAmt = longAmt;
        }
        return new GeoCoordinate(coord1.latitude + latitudeAmt, coord1.longitude + longitudeAmt);
    }

    add(otherCoord: LatLongCoord): GeoCoordinate;
    add(latitudeAmt: number, longitudeAmt: number): GeoCoordinate;
    add(latOrCoord: LatLongCoord | number, longAmt?: number){
        if(typeof latOrCoord === 'object' && longAmt === undefined)
            return GeoCoordinate.add(this, latOrCoord);
        else if(typeof latOrCoord === 'number' && longAmt !== undefined)
            return GeoCoordinate.add(this, latOrCoord, longAmt);
    }

    // calculates great circle distance between two points in nautical miles
    static dist(coord1: LatLongCoord, coord2: LatLongCoord): number;
    static dist(coord: LatLongCoord, latitude: number, longitude: number): number;
    static dist(...args: (LatLongCoord | number)[]){
        const {c1, c2} = resolveTwoCoords(...args);
        const lat1 = c1.latitude * DEG_TO_RAD;
        const lon1 = c1.longitude * DEG_TO_RAD;
        const lat2 = c2.latitude * DEG_TO_RAD;
        const lon2 = c2.longitude * DEG_TO_RAD;
        return Math.acos(Math.sin(lat1) * Math.sin(lat2) + Math.cos(lat1) * Math.cos(lat2) * Math.cos(lon1 - lon2)) * RAD_TO_NM;
    }

    dist(otherCoord: LatLongCoord): number;
    dist(latitude: number, longitude: number): number;
    dist(latOrCoord: LatLongCoord | number, longitude?: number){
        if(typeof latOrCoord === 'object' && longitude === undefined)
            return GeoCoordinate.dist(this, latOrCoord);
        else if(typeof latOrCoord === 'number' && longitude !== undefined)
            return GeoCoordinate.dist(this, latOrCoord, longitude);
    }

    // calculates the bearing from one coordinate toward another
    static bearing(coord1: LatLongCoord, coord2: LatLongCoord): number;
    static bearing(coord1: LatLongCoord, latitude: number, longitude: number): number;
    static bearing(...args: (LatLongCoord | number)[]){
        const {c1, c2} = resolveTwoCoords(...args);
        const lat1 = c1.latitude * DEG_TO_RAD;
        const lon1 = c1.longitude * DEG_TO_RAD;
        const lat2 = c2.latitude * DEG_TO_RAD;
        const lon2 = c2.longitude * DEG_TO_RAD;

        let b: number;

        // bearing from poles
        if(Math.cos(lat1) < Number.EPSILON){
            if(lat1 > 0)
                b = Math.PI;
            else
                b = 2 * Math.PI;
        }else
            // bearing elsewhere
            b = mod(Math.atan2(Math.sin(lon1 - lon2) * Math.cos(lat2), Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(lon1 - lon2)), 2 * Math.PI);
        
        return (2 * Math.PI - b) * RAD_TO_DEG;
    }

    bearing(otherCoord: LatLongCoord): number;
    bearing(latitude: number, longitude: number): number;
    bearing(latOrCoord: LatLongCoord | number, longitude?: number){
        if(typeof latOrCoord === 'object' && longitude === undefined)
            return GeoCoordinate.bearing(this, latOrCoord);
        else if(typeof latOrCoord === 'number' && longitude !== undefined)
            return GeoCoordinate.bearing(this, latOrCoord, longitude);
    }
}

// normalize longitude for values outside of [-180, 180)
export function normalizeLongitude(longitude : number){
    return mod(longitude + LONGITUDE_MAX, 2 * LONGITUDE_MAX) - LONGITUDE_MAX;
}

export function clampLatitude(latitude: number){
    return clamp(latitude, -LATITUDE_MAX, LATITUDE_MAX);
}

// helper function for overloads
function resolveTwoCoords(...args: (LatLongCoord | number)[]): {c1: GeoCoordinate, c2: GeoCoordinate}{
    let c1: GeoCoordinate, c2: GeoCoordinate;
    if(typeof args[0] === 'number' && typeof args[1] === 'number'){
        c1 = new GeoCoordinate(args[0], args[1]);
        if(typeof args[2] === 'number' && typeof args[3] === 'number')
            c2 = new GeoCoordinate(args[2], args[3]);
        else if(typeof args[2] === 'object')
            c2 = new GeoCoordinate(args[2].latitude, args[2].longitude);
        else
            c2 = new GeoCoordinate(0, 0);
    }else if(typeof args[0] === 'object'){
        c1 = new GeoCoordinate(args[0].latitude, args[0].longitude);
        if(typeof args[1] === 'number' && typeof args[2] === 'number')
            c2 = new GeoCoordinate(args[1], args[2]);
        else if(typeof args[1] === 'object')
            c2 = new GeoCoordinate(args[1].latitude, args[1].longitude);
        else
            c2 = new GeoCoordinate(0, 0);
    }else{
        c1 = new GeoCoordinate(0, 0);
        c2 = new GeoCoordinate(0, 0);
    }
    return {c1, c2};
}