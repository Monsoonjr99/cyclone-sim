import { simulationState_test } from './simulation';

export default function(cmd: string){
    if(/^\//.test(cmd))
        cmd = cmd.slice(1);
    const tokens = tokenize(cmd);
    if(tokens.length > 0)
        return parseCmd(tokens);
    else
        return "";
}

enum TokenType{
    Word,
    Number,
    SingleQuote,
    DoubleQuote,
    Operator,
    Error
}

interface Token{
    type: TokenType;
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
            return [{type: TokenType.Error, val: `ERR - Invalid token "${rawTokens[i]}" at position ${i/2}`}];

        if(i+1 < rawTokens.length){
            let token = rawTokens[i+1];
	    if(token.charAt(0) !== '"' && token.charAt(0) !== "'")
                token = token.toLowerCase();
	    intermediateTokens.push(token);
        }
    }
    for(let t of intermediateTokens){
        if(/^(?:[a-zA-Z_]|-(?!\d))/.test(t))
            finalTokens.push({type: TokenType.Word, val: t});
        else if(/^-?\d/.test(t))
            finalTokens.push({type: TokenType.Number, val: t});
        else if(/^"/.test(t))
            finalTokens.push({type: TokenType.DoubleQuote, val: t});
        else if(/^'/.test(t))
            finalTokens.push({type: TokenType.SingleQuote, val: t});
        else if(/^[.=]$/.test(t))
            finalTokens.push({type: TokenType.Operator, val: t});
        else
            return [{type: TokenType.Error, val: `ERR - Token type of "${t}" not recognized`}];
    }
    return finalTokens;
}

function parseCmd(tokenList: Token[]){
    const cmd = tokenList[0];
    if(cmd.type === TokenType.Error)
        return cmd.val;
    if(cmd.type !== TokenType.Word)
        return `ERR - Unexpected token "${cmd.val}"`;
    if(Commands.hasOwnProperty(cmd.val))
        return Commands[cmd.val](tokenList.slice(1));

    return `ERR - Command not found "${cmd.val}"`;
}

const Commands: {[key: string]: (args: Token[])=>string} = {};

Commands.nuke = function(args: Token[]){
    if(args.length > 0 && args[0].type !== TokenType.Number)
        return `ERR - Unexpected argument of type "${TokenType[args[0].type]}" for cmd "nuke"; expected "Number"`;
    if(args.length > 1)
        return `ERR - Unexpected argument "${args[1].val}" #2 for cmd "nuke"; expected 1 argument`;

    if(simulationState_test.length > 0){
        let target = simulationState_test[Math.floor(Math.random()*simulationState_test.length)];
	let nukeAmt = 100 + Math.random() * 400;
	if(args.length > 0)
            nukeAmt = parseFloat(args[0].val);
	target.mountainShredded = false;
	target.wind += nukeAmt;
	return `Nuked storm #${target.numeral || "NULL"}${target.name !== undefined ? " (\"" + target.name + "\")" : ""} by ${Math.round(nukeAmt)} kt`;
    }else
        return "Nuked 0 storms";
}

Commands.clear = function(args: Token[]){
    const debugTrayOut = <HTMLUListElement>document.querySelector('.cmd-line-out ul');
    debugTrayOut.innerHTML = "";
    return "";
}

Commands.collapse = function(args: Token[]){
    const debugTray = <HTMLDivElement>document.querySelector('#debug-tray');
    debugTray.classList.add('collapsed');
    return "";
}

Commands.help = function(args: Token[]){
    return "(Early debug tray test; very preliminary and expect things to change)<br />help - shows debug tray help<br />clear - clears the debug tray output<br />collapse - collapses the debug tray<br />nuke - ???";
}
