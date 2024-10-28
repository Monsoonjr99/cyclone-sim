// handles geographic (latitude/longitude) coordinates and associated vector operations on spherical geometry

import { mod, clamp } from './util';

// definition constants of latitude/longitude scale bounds
export const LATITUDE_MAX = 90;
export const LONGITUDE_MAX = 180;

export interface LatLongCoord{
    latitude : number;
    longitude : number;
}

export class GeoCoordinate implements LatLongCoord{
    readonly latitude: number;
    readonly longitude: number;

    constructor(latitude: number, longitude: number){
        this.latitude = clamp(latitude, -LATITUDE_MAX, LATITUDE_MAX);
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
    static dist(coord1: LatLongCoord, latOrCoord: LatLongCoord | number, longitude?: number){
        const lat1 = coord1.latitude * Math.PI / 180;
        const lon1 = coord1.longitude * Math.PI / 180;
        let lat2 = 0, lon2 = 0;
        if(typeof latOrCoord === 'object'){
            lat2 = latOrCoord.latitude * Math.PI / 180;
            lon2 = latOrCoord.longitude * Math.PI / 180;
        }else if(longitude !== undefined){
            lat2 = latOrCoord;
            lon2 = longitude;
        }
        return Math.acos(Math.sin(lat1) * Math.sin(lat2) + Math.cos(lat1) * Math.cos(lat2) * Math.cos(lon1 - lon2)) * (180 / Math.PI) * 60;
    }

    dist(otherCoord: LatLongCoord): number;
    dist(latitude: number, longitude: number): number;
    dist(latOrCoord: LatLongCoord | number, longitude?: number){
        if(typeof latOrCoord === 'object' && longitude === undefined)
            return GeoCoordinate.dist(this, latOrCoord);
        else if(typeof latOrCoord === 'number' && longitude !== undefined)
            return GeoCoordinate.dist(this, latOrCoord, longitude);
    }
}

// normalize longitude for values outside of [-180, 180)
export function normalizeLongitude(longitude : number){
    return mod(longitude + LONGITUDE_MAX, 2 * LONGITUDE_MAX) - LONGITUDE_MAX;
}