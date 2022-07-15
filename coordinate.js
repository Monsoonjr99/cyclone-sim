class Coordinate{
    constructor(longitude, latitude){
        this.set(longitude, latitude);
    }

    set(long, lat){
        this.longitude = ((long + 180) % 360 + 360) % 360 - 180;
        this.latitude = constrain(lat, -90, 90);
    }

    add(long, lat){
        if(long instanceof Coordinate){
            lat = long.latitude;
            long = long.longitude;
        }
        this.set(this.longitude + long, this.latitude + lat);
    }

    // for simplicity, returns the equirectangular map projection distance in "Pythagorean degrees" rather than true spherical distance, which is good enough for tropical cyclones far from the poles
    dist(long, lat){
        if(long instanceof Coordinate){
            lat = long.latitude;
            long = long.longitude;
        }
        let long_dist = abs(this.longitude - long);
        long_dist = min(long_dist, 360 - long_dist);
        let lat_dist = abs(this.latitude - lat);
        return Math.hypot(long_dist, lat_dist);
    }

    static convertFromXY(mapType, x, y){
        if(x instanceof p5.Vector)
            ({x, y} = x);
        let west, east, north, south;
        if(MAP_TYPES[mapType].form === 'earth')
            ({west, east, north, south} = MAP_TYPES[mapType]);
        else
            ({west, east, north, south} = MAP_TYPES[6]); // default to Atlantic
        if(east < west)
            east += 360;
        let long = map(x, 0, WIDTH, west, east, true);
        let lat = map(y, 0, HEIGHT, north, south, true);
        return new Coordinate(long, lat);
    }

    static convertToXY(mapType, long, lat){
        if(long instanceof Coordinate){
            lat = long.latitude;
            long = long.longitude;
        }
        let west, east, north, south;
        if(MAP_TYPES[mapType].form === 'earth')
            ({west, east, north, south} = MAP_TYPES[mapType]);
        else
            ({west, east, north, south} = MAP_TYPES[6]); // default to Atlantic
        let x, y;
        if(east < west){
            if(long > west)
                x = map(long, west, east + 360, 0, WIDTH, true);
            else
                x = map(long, west - 360, east, 0, WIDTH, true);
        }else
            x = map(long, west, east, 0, WIDTH, true);
        y = map(lat, north, south, 0, HEIGHT, true);
        return createVector(x, y);
    }
}