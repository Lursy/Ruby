import {
    makeWASocket, DisconnectReason, fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore, useMultiFileAuthState,
} from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'
import pino from "pino"


export async function connectToWhatsApp() {
    const { version } = await fetchLatestBaileysVersion();
    const auth = await useMultiFileAuthState(process.cwd() + "/auth/");
    const botVersion = require("../../package.json").version;
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
                connectToWhatsApp();
            }

        } else if(connection === 'open') {
            console.log('opened connection');
        }
    })
    
    return sock;
}