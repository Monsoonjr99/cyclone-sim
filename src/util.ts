// miscellaneous utility functions and constants

// angle measurement conversions
export const DEG_TO_RAD = Math.PI / 180;
export const RAD_TO_DEG = 1 / DEG_TO_RAD;
export const DEG_TO_NM = 60;
export const NM_TO_DEG = 1 / DEG_TO_NM;
export const RAD_TO_NM = RAD_TO_DEG * DEG_TO_NM;
export const NM_TO_RAD = 1 / RAD_TO_NM;

// proper modulus calculation
export function mod(a: number, b: number){
    return (a % b + b) % b;
}

// clamps a value between a minimum and maximum bound
export function clamp(v: number, min: number, max: number){
    return Math.min(Math.max(v, min), max);
}

export async function loadImg(src: string): Promise<HTMLImageElement>{
    return new Promise((resolve, reject)=>{
        let img = document.createElement('img');
        img.onload = ()=>resolve(img);
        img.onerror = (err)=>{
            console.error(err);
            reject(err);
        };
        img.src = src;
    });
}

export function extractImageData(img : HTMLImageElement){
    const cvs = document.createElement('canvas');
    cvs.width = img.width;
    cvs.height = img.height;
    const ctx = cvs.getContext('2d');
    if(ctx !== null){
        ctx.drawImage(img, 0, 0);
        const imgData = ctx.getImageData(0, 0, img.width, img.height);
        return imgData;
    }else{
        console.warn("extractImageData: Failed to acquire canvas context");
        return null;
    }
}

// formats a number or string containing a number to a zero-padded string
export function zeroPad(val: number | string, digits: number): string{
    let n: number;
    // coerce to number if string
    if(typeof val === 'string')
        n = parseFloat(val);
    else
        n = val;
    if(!Number.isNaN(n)){
        let str: string;                    // final string
        let intStr: string;                 // integer portion of number (as string)
        let int = parseInt(n.toString());   // integer portion of number (as number)
        if(int < 0){
            intStr = int.toString().slice(1); // does not include '-' sign
            str = '-' + intStr.padStart(digits, '0');
        }else{
            intStr = int.toString();
            str = intStr.padStart(digits, '0');
        }
        str = str.slice(0, -intStr.length); // remove integer portion of string to be replaced with full number
        str += Math.abs(n).toString();      // append number including float portion to final string
        return str;
    }else
        return 'NaN';
}

// creates a copy of an object including nested object references
export function deepClone<Type extends object>(source: Type): Type{
    const TypedArray = Object.getPrototypeOf(Int16Array); // the generic prototype of all typed arrays; the use of Int16Array in Object.getPrototypeOf() is arbitrary
    let copy: any;
    // Object.create() works well for making copies of most classes, but not for Arrays and TypedArrays, so their own .from() methods are used instead
    if(source instanceof Array)
        copy = Array.from(source);
    else if(source instanceof TypedArray){
        const SpecificTypedArray: any = source.constructor;
        copy = SpecificTypedArray.from(source);
    }else
        copy = Object.assign(Object.create(source.constructor.prototype), source);
    // recursively deepClone any nested objects
    for(let i in copy){
        if(copy.hasOwnProperty(i) && typeof copy[i] === 'object')
            copy[i] = deepClone<any>(copy[i]);
    }
    return copy;
}