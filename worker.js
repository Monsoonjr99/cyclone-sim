const WORKER_PATH = 'worker.js';

onmessage = function(e){
    let task = e.data.task;
    let id = e.data.id;
    let input = e.data.input;
    let output;
    let error;
    try{
        // test tasks
        if(task==='addfive') output = input + 5;
        else if(task==='saderror') throw 'a sad error';
        else if(task==='loopy'){
            output = 3;
            for(let i=0;i<input;i++) output *= 1.2;
        }
        else output = input;
    }catch(err){
        error = err;
        output = null;
    }
    postMessage({task, id, error, output});
};

class CSWorker{
    constructor(){
        this.worker = new Worker(WORKER_PATH);
        this.promiseHandlers = {};
        this.lowestFreeHandlerSlot = 0;
        this.busy = 0;
        this.worker.onmessage = e=>{
            let id = e.data.id;
            if(e.data.error) this.promiseHandlers[id].reject(e.data.error);
            else this.promiseHandlers[id].resolve(e.data.output);
            this.promiseHandlers[id] = undefined;
            if(id<this.lowestFreeHandlerSlot) this.lowestFreeHandlerSlot = id;
            this.busy--;
        };
    }

    run(task,input){
        return new Promise((resolve,reject)=>{
            let id = this.lowestFreeHandlerSlot;
            this.promiseHandlers[id] = {resolve,reject};
            while(this.promiseHandlers[this.lowestFreeHandlerSlot]!==undefined) this.lowestFreeHandlerSlot++;
            this.busy++;
            this.worker.postMessage({
                task,
                id,
                input
            });
        });
    }
}