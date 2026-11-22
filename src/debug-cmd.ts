export default function(cmd: string){
    const tokens = tokenize(cmd);
    return `TOKENS  -  ${JSON.stringify(tokens)}`;
}

// basic tokenizer that recognizes standard labels, numbers, quoted strings, and some operators that might come in handy
// case insensitive except inside quotes
function tokenize(cmd: string){
    const tokenSplitter = /(".*?(?<!\\)(?:(?:\\\\)*")|'.*?(?<!\\)(?:(?:\\\\)*')|[.=]|[a-zA-Z_]\w*|\d+\.?\d*)/;
    const rawTokens = cmd.split(tokenSplitter);
    const finalTokens: string[] = [];
    for(let i=0; i<rawTokens.length; i+=2){
        if(!/^\s*$/.test(rawTokens[i]))
            return [`ERR - Unexpected token "${rawTokens[i]}"`];

        if(i+1 < rawTokens.length){
            let token = rawTokens[i+1];
	    if(token.charAt(0) !== '"' && token.charAt(0) !== "'")
                token = token.toLowerCase();
	    finalTokens.push(token);
        }
    }
    return finalTokens;
}
