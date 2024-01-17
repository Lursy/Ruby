import { WASocket } from "@whiskeysockets/baileys";
import { connectToWhatsApp } from "./core/connect"
import { Message } from "./core/messages";
import { call } from "./commands/manager";

async function main(){
    const sock: WASocket = await connectToWhatsApp();

    
    sock.ev.on('messages.upsert', async m => {
        if(m.messages[0].key.remoteJid === "status@broadcast") return;
        if(m.type != "notify") return;

        let message = new Message(m.messages, sock);
        let core_message = message.essential();

        if(core_message.isCommand){
            let separate = core_message.text.split(" ");
            call(separate[0].slice(1), separate, message);
        }
    })
}

main()