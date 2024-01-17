import { AnyMessageContent, MiscMessageGenerationOptions, WAMessage, proto, WASocket } from "@whiskeysockets/baileys"


type sender = [string, AnyMessageContent,  MiscMessageGenerationOptions | undefined]
export type essential = {
    message: proto.IMessage
    text: string,
    isCommand: boolean,
    quoted: proto.IMessage | undefined,
    type: string
}

export class Message{
    socket: WASocket;
    base: WAMessage;
    key:  proto.IMessageKey | undefined | null

    constructor (m: proto.IWebMessageInfo[], socket: WASocket){
        this.base = m[0]
        this.socket = socket;
        this.key = this.base.key;
    }

    essential = (message = this.base.message) => {
        let text = "";
        let isCommand = false;
        let quoted: proto.IMessage | undefined;
    
        let type_details = Object.keys(message);
        let type: string = type_details[type_details.length - 1];
    
        if(type_details.includes("extendedTextMessage")){
            type = "extendedTextMessage"
            text = message.extendedTextMessage?.text;
            quoted = message.extendedTextMessage?.contextInfo?.quotedMessage;
        }
        else if(type_details.includes("conversation")){
            type = "conversation";
            text = message.conversation;
        }
        else if(type_details.includes("videoMessage")){
            type = "videoMessage";
            text = message.videoMessage?.caption;
        }
        else if(type_details.includes("imageMessage")){
            type = "imageMessage";
            text = message.imageMessage?.caption;
        }
        else if(type_details.includes("documentMessage")){
            type = "documentMessage";
        }
        else if(type_details.includes("documentWithCaptionMessage")){
            type = "documentWithCaptionMessage";
            text = message.documentWithCaptionMessage.message.documentMessage.caption;
        }
        else if(type_details.includes("viewOnceMessageV2")){
            type = "viewOnceMessageV2";
            let message_v2 = message.viewOnceMessageV2?.message;
            if(message_v2){
                if(Object.keys(message_v2).includes("imageMessage")){
                    type = "viewOnceMessageV2Image";
                    text = message_v2.imageMessage?.caption;
                }
                if(Object.keys(message_v2).includes("videoMessage")){
                    type = "viewOnceMessageV2Video";
                    text = message_v2.videoMessage?.caption;
                }
            }
        }
    
        isCommand =  text?.startsWith(".");
        let response: essential = {
            message:message,
            text: text,
            isCommand: isCommand,
            quoted: quoted,
            type: type
        }
    
        return response;
    }

    media = (base: essential = this.essential()) => {
        let image: proto.Message.IVideoMessage | proto.Message.IImageMessage | proto.Message.IDocumentMessage = undefined
        switch(base.type){
            case "imageMessage":
                image = base.message.imageMessage;
                break;
            case "videoMessage":
                image = base.message.videoMessage;
                break;
            case "documentMessage":
                image = isMedia(base.message.documentMessage);
                break;
            case "documentWithCaptionMessage":
                image = isMedia(base.message.documentWithCaptionMessage.message.documentMessage);
                break;
            case "viewOnceMessageV2Image":
                image = base.message.viewOnceMessageV2.message.imageMessage;
                break;
            case "viewOnceMessageV2Video":
                image = base.message.viewOnceMessageV2.message.videoMessage;
                break;
        }
        return image;
    }

    private response = (response: string | AnyMessageContent, option: MiscMessageGenerationOptions | undefined = undefined) => {
        let responseMessage: any;
        responseMessage = [this.key.remoteJid, { text: response }, option];

        if (typeof response == "object") {
            responseMessage = [this.key.remoteJid, response, option];
        }

        return responseMessage;
    }

    reply = (content: string | AnyMessageContent) => {
        let data: sender = this.response(content, { quoted: this.base });
        return this.socket.sendMessage(...data);
    }
    
    react = async (emoji: string) => {
        await this.send({react:{text: emoji, key: this.key}})
    }

    send = (content: string | AnyMessageContent) => {
        let data: sender = this.response(content);
        return this.socket.sendMessage(...data);
    }
}

function isMedia(document){
    if(
        [
        'jpg', 'jpeg', 'png',
        'mp4', 'gif', 'mkv', 'webp'
        ].includes(document.fileName.split('.').pop())
    ){
        return document;
    }
}