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

// like Object.assign() but also clones nested objects
export function deepClone<Type extends object>(target: any, source: Type): Type{
    for(let i in source){
        if(source.hasOwnProperty(i)){
            let srcItem = source[i];
            if(typeof srcItem === "object"){
                let objClone = deepClone<any>({}, srcItem);
                if(srcItem instanceof Array){
                    target[i] = [];
                    for(let j = 0; j < srcItem.length; j++)
                        target[i][j] = objClone[j];
                }else
                    target[i] = objClone;
            }else
                target[i] = srcItem;
        }
    }
    return target;
}