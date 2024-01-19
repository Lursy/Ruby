import {
    makeWASocket, DisconnectReason, fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore, useMultiFileAuthState,
} from '@whiskeysockets/baileys'
import { Message } from "./core/messages";
import { call } from "./commands/manager";
import { Boom } from '@hapi/boom'
import pino from "pino"


export async function main() {
    const { version } = await fetchLatestBaileysVersion();
    const auth = await useMultiFileAuthState(process.cwd() + "/auth/");
    const botVersion = require("../package.json").version;
    const logger = pino({ level: "fatal" }) as any;
    

    const sock = makeWASocket({
        version,
        auth: {
            creds: auth.state.creds,
            keys: await makeCacheableSignalKeyStore(
                auth.state.keys,
                logger
            )
        },
        printQRInTerminal: true,
        browser: ["Ruby", "Desktop", botVersion],
    });
    
    sock.ev.on('creds.update', auth.saveCreds);

    
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        
        if(connection === 'close' && lastDisconnect !== undefined) {
            const shouldReconnect = (lastDisconnect.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut
            console.log('connection closed due to ', lastDisconnect.error, ', reconnecting ', shouldReconnect);

            if(shouldReconnect) {
                main();
            }

        } else if(connection === 'open') {
            console.log('opened connection');
        }
    })
    
    sock.ev.on('messages.upsert', async m => {
        if(m.messages[0].key.remoteJid === "status@broadcast") return;
        if(m.type != "notify") return;

        let message = new Message(m.messages, sock);
        let core_message = message.essential();
        console.log(message);

        if(core_message.isCommand){
            let separate = core_message.text.split(" ");
            call(separate[0].slice(1), separate.slice(1), message);
        }
    })
}


main();