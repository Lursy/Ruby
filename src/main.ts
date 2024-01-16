import { connectToWhatsApp, WASocket } from "./core/connect"

async function main(){
    const sock: WASocket = await connectToWhatsApp();

    
    sock.ev.on('messages.upsert', async m => {
        if(m.messages[0].key.remoteJid === "status@broadcast") return;
        
        console.log(m.messages[0]);
    })
}

main()