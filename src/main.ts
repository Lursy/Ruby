import { makeWASocket, DisconnectReason, fetchLatestBaileysVersion, useMultiFileAuthState } from '@whiskeysockets/baileys'
import { receiveMessages } from './core/events/onMessages';
import { Log } from './core/utils/log';
import { Boom } from '@hapi/boom';
import pino from "pino";

export const bV = require("./../package.json").version;
const NodeCache = require("node-cache");

const logo = `
┌────────────────────╮
│        Ruby        │
├────────────────────┤
├  DEVELOPER: Lursy  ┤
├   versão:  ${bV}   ┤
├  github.com/lursy  ┤
└────────────────────╯
`;

const msgRetryCounterCache = new NodeCache();


export async function main() {
    const { state, saveCreds } = await useMultiFileAuthState("./auth");
    const { version } = await fetchLatestBaileysVersion();
    
    const sock = makeWASocket({
        logger: pino({ level: "silent" }) as any,
        browser: ["Ruby", "Desktop", bV],
        printQRInTerminal: true,
        msgRetryCounterCache,
        mobile: false,
        auth: state,
        version
    });
    
    sock.ev.on('creds.update', saveCreds);
    
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        
        if(connection === 'close') {
            const shouldReconnect = (lastDisconnect.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut

            if(shouldReconnect) {
                console.log("Reconectando...");
                main()
            }

        } else if(connection === 'open') {
            receiveMessages(sock);
            const log = new Log(logo);
            process.stdout.write('\x1bc');
            log.center();
        }
    })
}

console.log(main());