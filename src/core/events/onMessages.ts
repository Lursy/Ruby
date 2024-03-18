import { WASocket } from "@whiskeysockets/baileys";
import { Message } from "../utils/Message";
import { readFileSync} from "fs";
import { command } from "../commands";
import { device } from "../utils/interface";

const pay = `
_*Para utilizar o bot compre o ticket ou o modo premium*_
envie: \`.ticket <sua chave pix>\` (use sua chave pix para concorrer ao sorteio) ou \`.premium\`

exemplo: 
.ticket 35999477343

*Vantagens TICKET* \`R$3.00\`
_ticket válido até o sorteio_

* concorra a metade do valor total acumulado ☘️
* tenha acesso premium enquanto o ticket for válido 💎

*Vantagens PREMIUM* \`R$15.00\`

* acesso ilimitado ao bot  💎

em caso de duvidas entre em contato pelo link:
https://wa.me/+5535999477343
`

const safe = [".menu", ".ticket", ".premium", ".help"];

export async function receiveMessages(sock: WASocket){
    sock.ev.on('messages.upsert', 
        async (m) => {
            try{
                if(m.messages[0].key.remoteJid === "status@broadcast") return;
                if(m.type != "notify") return;
            
                let message = new Message(m.messages, sock);
                let data = new Date();

                console.log(`╓∙User: ${message.name}\n╟∙Command: ${message.isCommand}\n╟∙Message: ${message.text?message.text.length<25?message.text:message.text.substring(0, 20)+"[...]":message.type}\n╟∙Device: ${device(message.key.id)}\n╙∙Hora: ${data.toISOString().slice(11, 23)}\n`);

                if(message.isCommand){
                    let commands = require("../commands");

                    if(Object.keys(commands).includes(message.splited[0].slice(1))){
                        let acess = JSON.parse(readFileSync("./src/core/data/users.json", "utf-8"));
                        // if(!acess.premium.includes(message.key.participant??message.key.remoteJid) && !Object.keys(acess.tickets).includes(message.key.participant??message.key.remoteJid)){
                        //     if(!safe.includes(message.splited[0])) return message.reply(pay, true);
                        // }
                        let command: command = new commands[message.splited[0].slice(1)]();
                        let isGroup = await message.getGroup();

                        if(command.groupOnly && !isGroup){
                            return await message.send("Comando somente para grupos");
                        } 
                        
                        if(command.adminOnly && !message.group.isAdmin){
                            return message.send("Necessário privilégio de administrador para usar esse comando");
                        }
                        
                        return command.run(message);
                    }

                    let aliases = JSON.parse(readFileSync("./src/core/data/groups.json", "utf-8"));
                    if (!aliases[message.key.remoteJid]) return;

                    for(let [key, value] of Object.entries(aliases[message.key.remoteJid])){
                        if((value as string[]).includes(message.splited[0].slice(1))){
                            let acess = JSON.parse(readFileSync("./src/core/data/users.json", "utf-8"));
                            // if(!acess.premium.includes(message.key.participant??message.key.remoteJid) && !Object.keys(acess.tickets).includes(message.key.participant??message.key.remoteJid)){
                            //     if(!safe.includes(message.splited[0])) return message.reply(pay, true);
                            // }
                            let command: command = new commands[key]();
                            let isGroup = await message.getGroup();

                            if(command.groupOnly && !isGroup){
                                return await message.send("Comando somente para grupos");
                            } 
                            
                            if(command.adminOnly && !message.group.isAdmin){
                                return message.send("Necessário privilégio de administrador para usar esse comando");
                            }

                            return command.run(message);
                        }
                    }
                }
            }
            catch(err){
                console.log(m);
                console.log(err);
            }
        }
    );
}

