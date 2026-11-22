export default function(cmd: string){
    if(/^\//.test(cmd))
        cmd = cmd.slice(1);
    const tokens = tokenize(cmd);
    return `TOKENS  -  ${JSON.stringify(tokens)}`;
}

enum TokenTypes{
    Word,
    Number,
    SingleQuote,
    DoubleQuote,
    Operator,
    Error
}

interface Token{
    type: TokenTypes;
    val: string;
}

// basic tokenizer that recognizes standard words (inc. hyphens), numbers, quoted strings, and some operators that might come in handy
// case insensitive except inside quotes
function tokenize(cmd: string): Token[] {
    const tokenSplitter = /(".*?(?<!\\)(?:(?:\\\\)*")|'.*?(?<!\\)(?:(?:\\\\)*')|[.=]|(?:[a-zA-Z_]|-(?!\d))[a-zA-Z0-9_-]*|-?\d+(?:(?:\.(?![a-zA-Z_-]))?\d*))/;
    const rawTokens = cmd.split(tokenSplitter);
    const intermediateTokens: string[] = [];
    const finalTokens: Token[] = [];
    for(let i=0; i<rawTokens.length; i+=2){
        if(!/^\s*$/.test(rawTokens[i]))
            return [{type: TokenTypes.Error, val: `ERR - Invalid token "${rawTokens[i]}" at position ${i/2}`}];

        if(i+1 < rawTokens.length){
            let token = rawTokens[i+1];
	    if(token.charAt(0) !== '"' && token.charAt(0) !== "'")
                token = token.toLowerCase();
	    intermediateTokens.push(token);
        }
    }
    for(let t of intermediateTokens){
        if(/^(?:[a-zA-Z_]|-(?!\d))/.test(t))
            finalTokens.push({type: TokenTypes.Word, val: t});
        else if(/^-?\d/.test(t))
            finalTokens.push({type: TokenTypes.Number, val: t});
        else if(/^"/.test(t))
            finalTokens.push({type: TokenTypes.DoubleQuote, val: t});
        else if(/^'/.test(t))
            finalTokens.push({type: TokenTypes.SingleQuote, val: t});
        else if(/^[.=]$/.test(t))
            finalTokens.push({type: TokenTypes.Operator, val: t});
        else
            finalTokens.push({type: TokenTypes.Error, val: `ERR - Token type of "${t}" not recognized`});
    }
    return finalTokens;
}
