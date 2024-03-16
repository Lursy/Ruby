import { MediaType, downloadContentFromMessage, proto } from "@whiskeysockets/baileys";
import { TiktokDownloader as TiktokDL } from "@tobyg74/tiktok-api-dl"
import { Message } from "./Message";
import ytdl from "ytdl-core";

const instagramDl = require("@sasmeee/igdl");


export type media = proto.Message.IImageMessage
| proto.Message.IVideoMessage
| proto.Message.IAudioMessage
| proto.Message.IStickerMessage
| proto.Message.IDocumentMessage;

export class downloads{
    message: Message;
    separate: string[];

    constructor(message: Message){
        this.message = message;
        this.separate = message.text.split(" ");
    }

    public media_message = async (media: media) => {
        if(!media && this.message.quoted){
            let quot = this.message.essential(this.message.quoted);
            media = this.message.get_media(quot);
        }

        //media.url = !media.directPath ? media?.url : null;

        let buffer: Buffer = Buffer.from([]);
        let type = media.mimetype.split("/")[0] as MediaType;
        let Mbuffer = await downloadContentFromMessage(media, !media["fileName"]?type:"document");

        try{
            for await (const chunk of Mbuffer) {
                buffer = Buffer.concat([buffer, chunk]);
            }
        }catch(err){
            console.log(err);
        }

        return buffer;
    }

    public async TikTok(){
        const { result } = await TiktokDL(this.message.splited[1], { version: "v1" });
        return result[result.type][0];
    }

    public async Instagram(){
        const result = await instagramDl(this.message.splited[1]);
        return result[0].download_link
    }

    public async YouTube(){
        const info = await ytdl.getInfo(this.message.splited[1]);
        const result = ytdl.chooseFormat(info.formats, {filter: "audioandvideo"});
        return result.url;
    }
}