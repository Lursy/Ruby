
export class Log{
    text: string

    constructor(text: string){
        this.text = text;
    }

    public center() {
        const larguraTerminal = process.stdout.columns;
        this.text.split("\n").forEach(line => {
            const espacosAntes = Math.floor((larguraTerminal - line.length) / 2);
            const espacosDepois = larguraTerminal - line.length - espacosAntes;
            console.log(" ".repeat(espacosAntes) + line + " ".repeat(espacosDepois));
        })
    }
}