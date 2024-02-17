export const bV = require("./../../../package.json").version;

const logo = `
┌────────────────────╮
│        Ruby        │
├────────────────────┤
├  DEVELOPER: Lursy  ┤
├   versão:  ${bV}   ┤
├  github.com/lursy  ┤
└────────────────────╯
`;

export const device = ( id:string ) => id.length>22?"ANDROID":id.startsWith("3E")?"Wa Web":"IOS";


export function banner(text: string = logo) {
    text.split("\n").forEach(center);
}


function center(text: string){
    const larguraTerminal = process.stdout.columns;
    const espacosAntes = Math.floor((larguraTerminal - text.length) / 2);
    const espacosDepois = larguraTerminal - text.length - espacosAntes;
    console.log(" ".repeat(espacosAntes) + text + " ".repeat(espacosDepois));
}