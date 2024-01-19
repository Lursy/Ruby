import { Message } from "../core/messages";
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
            let text = '\t\t\`\`\`╔ Ruby ╗\n\t\t╚═════╝\`\`\`\n\n\n';
            for(let key = 0; key != functions.length; key++){
                text += "* " + `_.${functions[key]}_` + "\n"
            }
            text += "\n══════════════\n*Developed by*: _Lursy_\n══════════════\n*GitHub*: https://github.com/Lursy/Ruby/ \n═════════════════════════"
            message.reply(text);
        },
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
                let stk = new stickerMedia();
                let buff = await stk.makeStiker(media, type);
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
    "me": {
        help: {
            description: "Retorna foto, nome e biografia do usuário",
            use: ".me",
            response: "<Detalhes do perfil>"
        },
        run: async (message: Message) => {
            let group = await message.getGroup();
            let name = message.base.pushName;

            if(group){
                let user = await message.user(group.idSender);
                message.send({caption: `\`\`\`″${user.bio.status}″\`\`\`\n\n\n\t${group.name}\n╔═══════════╡USER│\n║ Nome\n╠═\t*${name}*\n║ Status\n╠═\t${group.isAdmin? "*" + group.isAdmin.toLocaleUpperCase() + "*":"_MEMBER_"}\n╚═══════════╡INFO│`, image: user.profile.data, mentions: [group.idSender]});
            }else{
                message.send("Este comando só é executado em grupos");
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