import { downloadContentFromMessage, downloadMediaMessage } from "@whiskeysockets/baileys";
import { Message } from "../core/messages";
import { makeStiker, toIMG } from "./utils/sticker";
import { readFileSync } from "fs"


const commands = {
    "all": {
        "menu": {
            help: {
                description: "Exibe os comandos do bot",
                use: ".menu",
                response: "<Lista de comandos>"
            },
            run: async  (message: Message) => {
                let text = `╔═══════════════╡ *BOT* │\n╟──Name: \`\`\`｢RUBY｣\`\`\`\n╟──Prefix: \`\`\`｢ . ｣\`\`\`\n╟──Version: \`\`\`｢ ${require("./../../package.json").version} ｣\`\`\`\n╚═══════════════╡ *BOT* │`;
                for(let [key, value] of Object.entries(commands)){
                    text += `\n\n\n════════╡ *${key.toUpperCase()}*\n`
                    let keys_value = Object.keys(value)
                    for(let key = 0; key != keys_value.length; key++){
                        text += "* " + `_.${keys_value[key]}_` + "\n"
                    }
                }
            text += "\n\n\n*Developed by*: _Lursy_\n*GitHub*: https://github.com/Lursy/Ruby/"
                message.reply({caption: text, video: readFileSync('./video/ruby.mp4'), gifPlayback: true});
            },
        },
        "toimg": {
            help: {
                description: "O bot transforma uma figurinha em imagem",
                use: "\t(marque um sticker)\n\t.toimg",
                response: "<image>"
            },
            run: async (message: Message) => {
                try{
                    if(message.quoted){
                        message.essential(message.quoted);
                        if(message.type == "stickerMessage"){
                            let buffer: any = await toIMG(message.quoted.stickerMessage, "jpg");
                            return message.reply({image: buffer});
                        }
                    }
                }catch{
                    return message.reply("Figurinha expirada, reenvie a figurinha e use o comando novamente");
                }
            }
        },
        "sticker": {
            help: {
                description: "O bot transforma uma imagem em figurinha",
                use: "\t(marque uma imagem)\n\t.sticker (1 <optional type of image resizing>)\n\n\t(envie uma imagem)\n\t.sticker (1 <optional type of image resizing>)",
                response: "<sticker>"
            },
            run: async (message: Message, type) => {
                let media = message.media();
    
                if(!media && message.quoted){
                    let quot = message.essential(message.quoted);
                    media = message.media(quot);
                }
    
                if(media){
                    await message.react("⏱️");
                    let buff = await makeStiker(media, type);
                    if(buff){
                        await message.reply({sticker: buff});
                        console.log((await message.react("✅")));
                    }else{
                        await message.reply("Ocorreu algum erro durante a conversão.")
                        await message.react("❌");
                    }
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
        "unlock": {
            help: {
                description: "reenvia uma foto que foi enviada em visualização única",
                use: "(marque media de viesualização única).unlock",
                response: "<desbloqueia foto de visualização única>"
            },
            run: async (message: Message) => {
                let media = message.media();
    
                if(!media && message.quoted){
                    let quot = message.essential(message.quoted);
                    media = message.media(quot);
                }

                if(!media) return;
                let buffer = Buffer.from([]);
                if(media.mimetype.split("/")[0] == "video"){
                    let Mbuffer = await downloadContentFromMessage(media, "video")
                    for await (const chunk of Mbuffer) {
                        buffer = Buffer.concat([buffer, chunk]);
                    }
                    return message.send({caption: message.text,video: buffer})
                }
                if(media.mimetype.split("/")[0] == "image"){
                    let Mbuffer = await downloadContentFromMessage(media, "image")
                    for await (const chunk of Mbuffer) {
                        buffer = Buffer.concat([buffer, chunk]);
                    }
                    return message.send({caption: message.text, image: buffer})
                }
            }
        },
        "help": {
            help: {
                description: "Exibe informações sobre determinado comando",
                use: ".help <name>",
                response: "<detalhes do comando>"
            },
            run: async (message: Message, command: string) => {
                console.log(command)
                let text = "comando não identificado";
                let object;
                if(!command){
                    return message.send("Use: .help <nome de um comando>")
                }
                if(Object.keys(commands.all).includes(command)) object = commands.all
                if(Object.keys(commands.group).includes(command)) object = commands.group
                if(Object.keys(commands.admin).includes(command)) object = commands.admin
                
                if(!object){
                    return message.send("Comando não encontrado na lista. Use o comando `.menu` para ver a lista de comandos")
                }

                text = `*${command}*\n\n\n` + "```";
                for(const [key, value] of Object.entries(object[command].help)){
                    text += `${key}:\n\t${value}\n\n`;
                }
                text += "```";
                
                return message.reply(text);
            }
        }
    },
    "group": {
        "me": {
            help: {
                description: "Retorna foto, nome e status do usuário",
                use: ".me",
                response: "<Detalhes do perfil>"
            },
            run: async (message: Message, group) => {
                let name = message.base.pushName;
                let user = await message.user(group.idSender);
                message.send({caption: `\`\`\`″${user.bio.status}″\`\`\`\n\n\n\t${group.name}\n╔═══════════╡USER│\n║ Nome\n╠═\t*${name}*\n║ Status\n╠═\t${group.isAdmin? "*" + group.isAdmin.toLocaleUpperCase() + "*":"_MEMBER_"}\n╚═══════════╡INFO│`, image: user.profile.data, mentions: [group.idSender]});
            }
        }
    },
    "admin": {
        "tag":{
            help: {
                description: "Reenvia a mensagem marcando todos os membros do grupo",
                use: "<marque uma mensagem>.tag",
                response: "<mensagem>"
            },
            run: async (message: Message) => {
                let quot = message.quoted?message.essential(message.quoted):{"text": "Atenção!"};
                let members = (await message.getGroup()).members;
                return message.send({text: quot.text, mentions: members});
            }
        }
    }
}


export async function call(func: string, args: any[], message: Message){
    if(Object.keys(commands.all).includes(func)){
        return commands.all[func].run(message, ...args);
    }

    let group = await message.getGroup();

    if(Object.keys(commands.group).includes(func)){
        if(group){
            return commands.group[func].run(message, group, ...args);
        }
        return message.send("Comando válido somente para grupos");
    }
    if(Object.keys(commands.admin).includes(func)){
        if(group && group.isAdmin){
            return commands.admin[func].run(message, group, ...args);
        }
        return message.send("Comando válido somente para admins em grupos");
    }

}