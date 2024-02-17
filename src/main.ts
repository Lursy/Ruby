import { makeWASocket, DisconnectReason, fetchLatestBaileysVersion, useMultiFileAuthState } from '@whiskeysockets/baileys'
import { receiveMessages } from './core/events/onMessages';
import { banner } from './core/utils/interface';
import { Boom } from '@hapi/boom';
import inquirer from 'inquirer';
import pino from "pino";


const NodeCache = require("node-cache");
const cacheMedia =  new NodeCache({stdTTL: 60 * 5, useClones: false})
const cacheMSG =  new NodeCache({stdTTL: 60 * 5, useClones: false})

export async function main() {
    process.stdout.write('\x1bc'); 
    const { state, saveCreds } = await useMultiFileAuthState("./auth");
    const { version } = await fetchLatestBaileysVersion();

    let usePairingCode = false;
    
    if(!state.creds.registered){
        const answers = await inquirer.prompt([
            {
                type: "list",
                name: "usePairingCode",
                message: "Selecione o método de conexão:",
                choices: [
                    { name: "Conectar via Qr-Code", value: false },
                    { name: "Conectar via Número", value: true },
                ],
                default: false,
            },
        ]);
        usePairingCode = answers.usePairingCode;
    }
    
    const sock = makeWASocket({
        logger: pino({ level: "silent" }) as any,
        browser: ['Mac OS', 'chrome', '121.0.6167.159'],
        printQRInTerminal: !usePairingCode,
        mediaCache: cacheMedia,
        msgRetryCounterCache: cacheMSG,
        mobile: false,
        auth: state,
        version
    });


    if (usePairingCode) {
        const phoneNumber = String((await inquirer.prompt([
            {
                type: 'input',
                name: 'phoneNumber',
                message: 'Número de telefone:',
                validate: (value) => {
                    const regex = /^\+?[1-9]\d{1,14}$/;
                    return regex.test(value) || 'Por favor, digite um número de telefone válido.';
                },
            }
        ])).phoneNumber);
        let code = await sock.requestPairingCode(phoneNumber);
        console.log(`Your code: ${code}\n`);
        console.log("Open your WhatsApp, go to Connected Devices > Connect a new Device > Connect using phone number.");
    }else{
        state.creds.registered = true;
        saveCreds();
    }
    
    sock.ev.on('creds.update', saveCreds);
    
    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;
        
        if(connection === 'close') {
            const shouldReconnect = (lastDisconnect.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut

            if(shouldReconnect) {
                console.log("Reconectando...");
                main()
            }

        } else if(connection === 'open') {
            receiveMessages(sock);
            banner();
        }
    })
}


main();