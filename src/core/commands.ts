import { readFileSync, writeFileSync } from "fs"
import { downloads } from "./utils/downloads";
import { Conversor } from "./utils/conversor";
import { Message } from "./utils/Message";
import { bV, device } from "./utils/interface";

export interface command {
    description: string;
    adminOnly: boolean;
    groupOnly: boolean;
    example: string;
    run: (...any) => Promise<any>;
}


function initResponse(name: string, id: string){
    return `\`\`\`╓∙User:    ⌜${name}⌟\n╟∙Device:  ⌜${device(id)}⌟\n╟∙Version: ⌜${bV}⌟\n╙∙Prefix:  ⌜.⌟\`\`\`\n\n`
}


export class tag implements command{
    description: string = "Marca todas as pessoas do grupo em uma mensagem";
    adminOnly: boolean = true;
    groupOnly: boolean = true;
    example: string = "use: _(Marque uma mensagem)_ *.tag*";

    run = async (message: Message) => {
        if(message.splited[1]){
            return await message.send({text: message.splited.slice(1).join(" "), mentions: message.group.members});
        }
        return await message.send({
            forward: {
                key: {
                    fromMe: false, id: message.base.message.extendedTextMessage.contextInfo.stanzaId
                },
                message: message.quoted
            },
            mentions: message.group.members
        });
    }
}


export class menu implements command{
    description: string = "Exibe lista de comandos do bot";
    adminOnly: boolean = false;
    groupOnly: boolean = false;
    example: string = "use: *.menu*";

    run = async (message: Message) => {
        let content = initResponse(message.name, message.key.id);
        let commands = Object.keys(require("./commands"));
        let space = " ".repeat(5);
        
        content += `${space}╓═──┤MENU├──═╖\n`;
        commands.forEach(item => {content += `${space}╠∙∙► \`\`\`.${item}\`\`\`\n`});
        content += `${space}╙═──┤MENU├──═╜`; 

        return await message.reply({caption: content, video: {url: "./src/static/ruby.mp4"}, gifPlayback: true, contextInfo: {externalAdReply: {title: "Ruby 🟢 Online", body: "Venha ver meu código fonte! clique aqui.", thumbnail: readFileSync("./src/static/icon.png"), sourceUrl:"https://github.com/Lursy/Ruby", sourceType: "PHOTO"}}}, true);
    }
}


export class help implements command{
    description: string = "Exibe informações sobre comando informado";
    adminOnly: boolean = false;
    groupOnly: boolean = false;
    example: string = "use: *.help* _<nome de algum comando>_";

    run = async (message: Message, alias: string = undefined) => {
        let commands = require("./commands");
        this.example = alias?this.example.replace("help", alias):this.example;
        
        if(message.splited.length > 1){
            if(Object.keys(commands).includes(message.splited[1])){
                let command: command = new commands[message.splited[1]]();
                let response: string = `${initResponse(message.name, message.key.id)}*Descrição:*\n\t${command.description}\n\n*Examplo:*\n\t${command.example}`
                return message.reply(response);
            }

            let aliases = JSON.parse(readFileSync("./src/core/data/groups.json", "utf-8"));
            for(let [key, value] of Object.entries(aliases[message.key.remoteJid])){
                if((value as string[]).includes(message.splited[1])){
                    let command: command = new commands[key]();
                    let response: string = `${initResponse(message.name, message.key.id)}*Descrição:*\n\t${command.description}\n\n*Examplo:*\n\t${command.example.replaceAll(key, message.splited[1])}`
                    return message.reply(response);
                }
            }
            return message.reply("Este comando não existe! use o comando .menu para abrir a lista de comandos.")
        }
        return message.send(this.example);
    }
}


export class ping implements command{
    description: string = "Envia a latência do bot";
    adminOnly: boolean = false;
    groupOnly: boolean = false;
    example: string = "use: .ping";

    run = async (message: Message) => {
        let startTime = Date.now();
        let pong = await message.reply({text: "Pong"});
        let latency = Date.now() - startTime;
        return message.reply({edit: pong?.key, text: `Pong\nLatência: ${latency}ms`});
    }
}


export class unlock implements command{
    description: string = "Debloqueia qualquer midia em visualização única";
    adminOnly: boolean = false;
    groupOnly: boolean = false;
    example: string = "use: _(marque uma mensagem ou adicione na legenda)_ *.unlock*";

    run = async (message: Message) =>{
        let download = new downloads(message);
        let media = message.get_media();

        if(!media && message.quoted){
            let type = message.type;
            let quot = message.essential(message.quoted);
            media = message.get_media(quot);
            message.type = type;
        }

        if(!media || !media["viewOnce"]) return await message.reply("Marque uma midia de visualização única.");

        let buffer: Buffer = await download.media_message(media);

        if(!buffer) return message.reply("Erro ao decriptar imagem");

        if(media.mimetype.split("/")[0] === "video"){
            return message.send({ video: buffer, caption: message.text });
        }
        if(media.mimetype.split("/")[0] === "image"){
            return message.send({ image: buffer, caption: message.text });
        }
        if(media.mimetype.split("/")[0] === "audio"){
            return message.send({ audio: buffer });
        }

        return await message.reply("Marque uma midia de visualização única.");
    }
}


export class to implements command{
    description: string = "transforma sticker em foto ou gif";
    adminOnly: boolean = false;
    groupOnly: boolean = false;
    example: string = "use: (marque um sticker)\n\t*.to gif* ou *.to png*";


    run = async (message: Message) => {
        let separate = message.text.slice(1).split(" ");
        
        if(separate.length <= 1) return await message.send("*Sintax incorreta*\n\nuse o comando .help to para verificar as propriedades do comando");
        if(separate[1] != "png" && separate[1] != "gif") return await message.reply("*Sintax incorreta*\n\nuse o comando .help to para verificar as propriedades do comando");
        
        let download = new downloads(message);
        let type = message.type;
        let quot = message.essential(message.quoted);
        let media = message.get_media(quot);

        if(message.type != "stickerMessage") return await message.reply("Está função é especifica para figurinhas!");
        
        await message.react("⏱️");
        message.type = type;
        
        let conversor = new Conversor(message);
        let buffer: Buffer = await conversor.toImg(await download.media_message(media), separate[1]);
        let content = separate[1]=="gif"?{video: await conversor.toMp4(buffer), gifPlayback: true}:{image: buffer}


        
        return await message.send(content).then(async (response) => {await message.react("✅"); return response});
    }
}

export class sticker implements command{
    description: string = "transforma imagem ou video em sticker";
    adminOnly: boolean = false;
    groupOnly: boolean = false;
    example: string = "use: (marque uma media) *.sticker*";


    run = async (message: Message) => {
        let media = message.get_media();

        if(!media && message.quoted){
            let type = message.type;
            let quot = message.essential(message.quoted);
            media = message.get_media(quot);

            if(message.type == "stickerMessage") return await message.send("*Media incorreta*\n\nuse o comando .help sticker para verificar as propriedades do comando");

            message.type = type;
        }
        
        if(!media) return await message.send("Nenhuma media foi relacionada. use o comando .help sticker para verificar as propriedades do comando");
        
        await message.react("⏱️");

        const download = new downloads(message);

        let buffer: Buffer = await download.media_message(media);
        let conversor = new Conversor(message);
        console.log(media.mimetype);
        buffer = await conversor.toWebp(buffer, media.mimetype.split("/")[0]);

        return await message.send({sticker: buffer}).then(async (response) => {await message.react("✅"); return response});
    }
}


export class alias implements command{
    description: string = "gerenciador de nomes para comandos";
    adminOnly: boolean = false;
    groupOnly: boolean = false;
    example: string = `*.alias*\n\`\`\`> Lista com todos aliases cadastrados\`\`\`\n\n\t*.alias* _<nome de um comando>_\n\`\`\`> Para receber todos os nomes de um comando\`\`\`\n\n\t*.alias* _<nome original>_ --add _<apelido para o comando>_\n\t*.alias* _<nome original>_ --remove _<apelido existente>_\n\`\`\`> Adiciona um novo nome para o comando ou remove um alias já existente\`\`\`\n\n\n_*somente admins podem usar a função --add e --remove*_`;


    run = async (message: Message) => {
        let data = JSON.parse(readFileSync("./src/core/data/groups.json", "utf-8"));

        if(message.splited.length == 3 && message.splited.length > 4) return await message.send("*Sintaxe incompleta*\n\nuse _.help alias_ para verificar as propriedades do comando");
        
        let commands = Object.keys(require("./commands"));

        if(!data[message.key.remoteJid]) data[message.key.remoteJid] = {};
        
        if(message.splited.length == 1){
            let content = "*Menu de aliases*\n\n\n";
            for(let [key, value] of Object.entries(data[message.key.remoteJid])){
                content += `*${key}* > _${(value as string[]).join(", ")}_\n\n`;
            }
            return await message.reply(content);
        }
        
        if(message.splited.length == 4){
            let admin = (await message.getGroup())?message.group.isAdmin:true;
            if(!admin) return await message.send("Somente admins podem utilizar esses parametros");

            if(!commands.includes(message.splited[1])) return message.reply("Comando citado não existe, use o nome original do comadno para criar ou remover aliases");

            if(message.splited[2] == "--add"){
                for(let [key, value] of Object.entries(data[message.key.remoteJid])){
                    if((value as string[]).includes(message.splited[3])){
                        console.log(data[message.key.remoteJid]);
                        return await message.reply(`O alias ${message.splited[3]} já está em uso pelo comando ${key}`)
                    }
                }
                if(!data[message.key.remoteJid][message.splited[1]]){
                    data[message.key.remoteJid][message.splited[1]] = [message.splited[3]];
                }else{
                    if(data[message.key.remoteJid][message.splited[1]].length == 10) return await message.send("Limite de aliases atingidos.");
                    data[message.key.remoteJid][message.splited[1]].push(message.splited[3]);
                }
            }
            else if (message.splited[2] == "--remove"){
                if(!data[message.key.remoteJid][message.splited[1]].includes(message.splited[3])) return await message.reply(`O alias "${message.splited[3]}" não foi encontrado na lista de aliases pertencente ao comando ${message.splited[1]}`);

                let index = data[message.key.remoteJid][message.splited[1]].indexOf(message.splited[3]);
                data[message.key.remoteJid][message.splited[1]].splice(index, 1);
            }
            else{
                return message.send(`*Erro de sintax*\n${message.splited[2]} não é um parametro valido! use --add ou --remove`);
            }
            writeFileSync("./src/core/data/groups.json", JSON.stringify(data, null, "\t"), "utf-8");
            return await message.reply(`Alias ${message.splited[2]=="--add"?"adicionado":"removido"} com sucesso!`);
        }
        
        if(!Object.keys(data[message.key.remoteJid]).includes(message.splited[1])){
            for(let [key, value] of Object.entries(data[message.key.remoteJid])){
                if((value as string[]).includes(message.splited[1])){
                    message.splited[1] = key;
                    break;
                }
            }
        }

        if(!Object.keys(data[message.key.remoteJid]).includes(message.splited[1])) return await message.reply("Comando citado não existe ou não possui aliases. Use os nomes originais para se referir aos comandos");

        let aliases: string[] = data[message.key.remoteJid][message.splited[1]];
        return message.reply(`*Lista de aliases*\n\nComando original: *${message.splited[1]}*\n\n*Aliases*\n- ${aliases.join("\n- ")}`);
    }
}

class dload implements command{
    description: string = "Baixa videos do YouTube, Instagram ou TikTok";
    adminOnly: boolean = false;
    groupOnly: boolean = false;
    example: string = ".dload <url>";

    run = async (message: Message) => {
        const download = new downloads(message);
        const tiktokUrlRegex = /https?:\/\/(?:m|www|vm)\.tiktok\.com\/.*?(?:\/(?:usr|v|embed|user|video)\/|\?shareId=|&item_id=)(\d+)|https?:\/\/(?:www\.)?vm\.tiktok\.com\/\S*/g;
        const instagramUrlRegex = /https?:\/\/(www\.)?instagram\.com\/(p|tv|reel)\/([a-zA-Z0-9_-]+)\/?/;
        const youtubeUrlRegex = /^((?:https?:)?\/\/)?((?:www|m)\.)?((?:youtube(-nocookie)?\.com|youtu.be))(\/(?:[\w\-]+\?v=|embed\/|v\/)?)([\w\-]+)(\S+)?$/;
        let url: string;

        await message.react("⏱️");
        if(tiktokUrlRegex.test(message.splited[1])){
            url = await download.TikTok();
        }
        else if(instagramUrlRegex.test(message.splited[1])){
            url = await download.Instagram();
        }
        else if(youtubeUrlRegex.test(message.splited[1])){
            url = await download.YouTube();
        }
        else{
            return await message.react("❌");
        }
        await message.reply({video: {url: url}});
        await message.react("✅");
    }
}

module.exports = { sticker, unlock, alias, dload, help, menu, ping, tag, to};