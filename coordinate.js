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
}