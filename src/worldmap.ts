import { loadImg, extractImageData } from "./util";

const mapImageURL = new URL('../resources/nasabluemarble.jpg', import.meta.url).href;
const mapDataImageURL = new URL('../resources/earth.png', import.meta.url).href;

let loaded = false;
let mapImage: HTMLImageElement, mapData: ImageData | null;

async function loadMaps(){
    const [mapImage, mapDataImage] = await Promise.all([loadImg(mapImageURL), loadImg(mapDataImageURL)]);
    const mapData = extractImageData(mapDataImage);
    return {
        mapImage,
        mapData
    };
}

export async function getMaps(){
    if(loaded){
        return {
            mapImage,
            mapData
        };
    }else{
        ({mapImage, mapData} = await loadMaps());
        loaded = true;
        return {
            mapImage,
            mapData
        };
    }
}
