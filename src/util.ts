// miscellaneous utility functions

// proper modulus calculation
export function mod(a: number, b: number){
    return (a % b + b) % b;
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