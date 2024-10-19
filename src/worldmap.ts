import { loadImg, extractImageData } from "./util";

const mapImageURL = new URL('../resources/nasabluemarble.jpg', import.meta.url).href;
const mapDataImageURL = new URL('../resources/earth.png', import.meta.url).href;

export async function loadMaps(){
    const [mapImage, mapDataImage] = await Promise.all([loadImg(mapImageURL), loadImg(mapDataImageURL)]);
    const mapData = extractImageData(mapDataImage);
    return {
        mapImage,
        mapData
    };
}