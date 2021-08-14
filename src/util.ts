// miscellaneous utility functions

// proper modulus calculation
export function mod(a : number, b : number){
    return (a % b + b) % b;
}

export async function loadImg(src : string) : Promise<HTMLImageElement>{
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