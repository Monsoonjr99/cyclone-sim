class City{
    constructor(name, longitude, latitude, pop){
        this.name = name;
        this.location = {longitude, latitude};
        this.population = pop || 0;
    }

    pos(mapType){
        if(mapType === undefined)
            mapType = 6; // default to Atlantic
        return Coordinate.convertToXY(mapType, this.location.longitude, this.location.latitude);
    }

    onMap(mapType){
        if(MAP_TYPES[mapType].form !== 'earth')
            return false;

        let {west, east, north, south} = MAP_TYPES[mapType];
        let inbounds = true;
        if(this.location.latitude > north || this.location.latitude <= south)
            inbounds = false;
        if(west > east){
            if(this.location.longitude < west && this.location.longitude >= east)
                inbounds = false;
        }else if(this.location.longitude < west || this.location.longitude >= east)
            inbounds = false;
        
        return inbounds;
    }

    renderIcon(mapType, minimal){
        const icon_diameter = 10;
        let pos = this.pos(mapType);
        cityIcons.push();
        cityIcons.translate(pos.x, pos.y);
        if(minimal)
            cityIcons.fill(50, 190);
        else
            cityIcons.fill(50);
        cityIcons.noStroke();

        cityIcons.beginShape();
        cityIcons.vertex(0, -icon_diameter/2);
        cityIcons.vertex(icon_diameter/2, 0);
        cityIcons.vertex(0, icon_diameter/2);
        cityIcons.vertex(-icon_diameter/2, 0);
        cityIcons.endShape();

        if(!minimal){
            cityIcons.fill(0);
            cityIcons.textStyle(BOLD);
            cityIcons.textSize(10);
            cityIcons.textAlign(LEFT,CENTER);
            cityIcons.text(this.name, icon_diameter, 0);
        }

        cityIcons.pop();
    }
}

City.cities = [
    new City('Miami', -80.2, 25.8),
    new City('Houston', -95.4, 29.8),
    new City('New York', -74.0, 40.7),
    new City('Washington', -77.0, 38.9),
    new City('New Orleans', -90.1, 29.9),
    new City('Havana', -82.4, 23.1),
    new City('San Juan', -66.1, 18.4),
    new City('Boston', -71.1, 42.4),
    new City('Lisbon', -9.1, 38.7)
];