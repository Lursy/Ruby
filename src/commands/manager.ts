import { Message, essential } from "../core/messages";
import { stickerMedia } from "./utils/sticker";


const app = {
    "menu": {
        help: {
            description: "Exibe os comandos do bot",
            use: ".menu",
            response: "<Lista de comandos>"
        },
        run: async  (message: Message) => {
            let functions = Object.keys(app);
            let text = '*`▌Lista de comandos▐`*\n\n';
            for(let key = 0; key != functions.length; key++){
                text += "* " + `_.${functions[key]}_` + "\n"
            }
            message.reply(text);
        },
    },
    "sticker": {
        help: {

            description: "O bot transforma uma imagem em figurinha",
            use: "(marque uma imagem).sticker\n\t(envie uma imagem).sticker",
            response: "<sticker>"
        },
        run: async (message: Message) => {
            let media = message.media();
            let msg_core: essential = message.essential()

            if(!media && msg_core.quoted){
                let normalize_quoted = message.essential(msg_core.quoted);
                media = message.media(normalize_quoted);
            }

            if(media){
                await message.react("⏱️");
                let stk = new stickerMedia();
                let buff = await stk.makeStiker(media);
                await message.send({sticker: buff});
                await message.react("✅");
            }else{
                message.send({text: "Use este comando em imagens ou videos"});
            }
        },
    },
    "ping": {
        help: {
            description: "Retorna a latência do bot",
            use: ".ping",
            response: "Pong\nLatência: XXXms"
        },
        run: async  (message: Message) => {
            let startTime = Date.now();
            let pong = await message.send({text: "Pong"});
            let latency = Date.now() - startTime;
            message.reply({edit: pong?.key, text: `Pong\nLatência: ${latency}ms`});
        },
    },
    // "profile": {
    //     help: {
    //         description: "Retorna foto, nome e biografia do usuário",
    //         use: ".profile (<@mentioned> opcional)",
    //         response: "<Detalhes do perfil>"
    //     },
    //     run: async (message: Message) => {
    //         let isGroup = message.key.remoteJid?.endsWith("@g.us");
    //         let name = message.base.pushName;
    //         let userId: string;

    //         if(isGroup){
    //             userId = message.key.participant;
    //             if(message.base.message[message.essential().type].contextInfo?.mentionedJid[0] !== undefined){
    //             name = "";
    //                 let gp = await message.socket.groupMetadata(message.key.remoteJid);
    //                 userId = message.base.message[message.essential().type].contextInfo.mentionedJid[0];
    //             }
    //         }else{
    //             userId = message.key.remoteJid;
    //         }

    //         let info_user = await this.user(userId, message.socket);
    //         message.send({caption: `*${name}*\n\n\`\`\`${info_user.bio.status}\`\`\``, image: info_user.profile.data});
    //     }
    // },
    "help": {
        help: {
            description: "Exibe informações sobre determinado comando",
            use: ".help <name>",
            response: "<detalhes do comando>"
        },
        run: async (message: Message, command: string) => {
            var text = "comando não identificado";
            if(Object.keys(app).includes(command)){
                text = `*${command}*\n\n\n` + "```";
                for(const [key, value] of Object.entries(app[command].help)){
                    text += `${key}:\n\t${value}\n\n`;
                }
                text += "```";
            }else{
                text = "Insira um comando valido. Para ver a lista de comandos digite .menu"
                if(!command){
                    text = "Use: .help <nome de um comando>"
                }
            }
            message.reply(text);
        },
    }
}


export function call(func: string, args: any[], message: Message){
        if(Object.keys(app).includes(func)){
            console.log(func);
            app[func].run(message, ...args);
        }
}