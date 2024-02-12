import { MediaType, downloadContentFromMessage, proto } from "@whiskeysockets/baileys";
import { Message } from "./Message";

export type media = proto.Message.IImageMessage
| proto.Message.IVideoMessage
| proto.Message.IAudioMessage
| proto.Message.IStickerMessage
| proto.Message.IDocumentMessage;

export class downloads{
    core_message: Message

    constructor(message: Message){
        this.core_message = message;
    }

    public media_message = async (media: media) => {
        if(!media && this.core_message.quoted){
            let quot = this.core_message.essential(this.core_message.quoted);
            media = this.core_message.get_media(quot);
        }
        
        let buffer: Buffer = Buffer.from([]);

        let type = media.mimetype.split("/")[0] as MediaType;
      
        let Mbuffer = await downloadContentFromMessage(media, !media["fileName"]?type:"document");
    
        
        for await (const chunk of Mbuffer) {
            buffer = Buffer.concat([buffer, chunk]);
        }

        return buffer;
    }
}