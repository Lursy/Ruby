import { AnyMessageContent, MiscMessageGenerationOptions, WAMessage, proto, WASocket } from "@whiskeysockets/baileys"
import axios from "axios"


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
    key:  proto.IMessageKey | undefined | null;
    text: string;
    type: string;
    isCommand: boolean;
    quoted: proto.IMessage | undefined;
    image: 
    |proto.Message.IVideoMessage 
    | proto.Message.IImageMessage
    | proto.Message.IDocumentMessage = undefined;
    group: {
        name: string, idGroup: string,
        idSender: string,
        isAdmin: string
    }

    constructor (m: proto.IWebMessageInfo[], socket: WASocket){
        this.base = m[0]
        this.socket = socket;
        this.key = this.base.key;
    }

    essential = (message = this.base.message) => {
        this.text = "";
    
        let type_details = Object.keys(message);
        this.type = type_details[type_details.length - 1];
    
        if(type_details.includes("extendedTextMessage")){
            this.type = "extendedTextMessage"
            this.text = message.extendedTextMessage?.text;
            this.quoted = message.extendedTextMessage?.contextInfo?.quotedMessage;
        }
        else if(type_details.includes("conversation")){
            this.type = "conversation";
            this.text = message.conversation;
        }
        else if(type_details.includes("videoMessage")){
            this.type = "videoMessage";
            this.text = message.videoMessage?.caption;
        }
        else if(type_details.includes("imageMessage")){
            this.type = "imageMessage";
            this.text = message.imageMessage?.caption;
        }
        else if(type_details.includes("documentMessage")){
            this.type = "documentMessage";
        }
        else if(type_details.includes("documentWithCaptionMessage")){
            this.type = "documentWithCaptionMessage";
            this.text = message.documentWithCaptionMessage.message.documentMessage.caption;
        }
        else if(type_details.includes("viewOnceMessageV2")){
            this.type = "viewOnceMessageV2";
            let message_v2 = message.viewOnceMessageV2?.message;
            if(message_v2){
                if(Object.keys(message_v2).includes("imageMessage")){
                    this.type = "viewOnceMessageV2Image";
                    this.text = message_v2.imageMessage?.caption;
                }
                if(Object.keys(message_v2).includes("videoMessage")){
                    this.type = "viewOnceMessageV2Video";
                    this.text = message_v2.videoMessage?.caption;
                }
            }
        }
    
        this.isCommand =  this.text?.startsWith(".");
        let response: essential = {
            message:message,
            text: this.text,
            isCommand: this.isCommand,
            quoted: this.quoted,
            type: this.type
        }
    
        return response;
    }

    getGroup = async () => {
        if(this.key.remoteJid?.endsWith("@g.us")){
            let groupInfo = await this.socket.groupMetadata(this.key.remoteJid);
            console.log(this.key.remoteJid)
            console.log(groupInfo.participants.find((participant) => participant.id === this.key.participant).admin);
            this.group = {
                "name": groupInfo.subject,
                "idGroup": this.key.remoteJid,
                "idSender": this.key.participant,
                "isAdmin": groupInfo.participants.find((participant) => participant.id === this.key.participant).admin
            };
    
            return this.group
        }
    }

    media = (base: essential = this.essential()) => {
        switch(base.type){
            case "imageMessage":
                this.image = base.message.imageMessage;
                break;
            case "videoMessage":
                this.image = base.message.videoMessage;
                break;
            case "documentMessage":
                this.image = isMedia(base.message.documentMessage);
                break;
            case "documentWithCaptionMessage":
                this.image = isMedia(base.message.documentWithCaptionMessage.message.documentMessage);
                break;
            case "viewOnceMessageV2Image":
                this.image = base.message.viewOnceMessageV2.message.imageMessage;
                break;
            case "viewOnceMessageV2Video":
                this.image = base.message.viewOnceMessageV2.message.videoMessage;
                break;
        }
        return this.image;
    }

    user = async (user: string) => {
        let bio: {
            status: string,
            setAt: Date
        };
        let profile = ""
        try{
            bio = await this.socket.fetchStatus(user);
        }catch(err){
            bio = {status: "undefined", setAt: null}
        }
        try{
            profile = await this.socket.profilePictureUrl(user, "image");
        }catch (err){
            profile = "https://labes.inf.ufes.br/wp-content/uploads/sem-foto.jpg";
        }
        const info = {
            "bio": bio,
            "profile": (await axios.get(profile, { responseType: 'arraybuffer' }))
        }
    
        return info;
    }
    

    private response = (response: string | AnyMessageContent, option: MiscMessageGenerationOptions | undefined = undefined) => {
        let responseMessage: any;
        
        if(this.base.message[this.type]?.contextInfo?.expiration){
            if(option){
                option.ephemeralExpiration = this.base.message[this.type].contextInfo.expiration
            }else{
                option = { ephemeralExpiration: this.base.message[this.type].contextInfo.expiration }
            }
        }
        
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
    
    react = (emoji: string) => {
        return this.send({react:{text: emoji, key: this.key}})
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