window.onload = function(){
    let message : string = 'Hello World!';
    let para = document.createElement('p');
    para.innerText = message;
    document.body.appendChild(para);
};