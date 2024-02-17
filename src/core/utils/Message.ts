import { AnyMessageContent, MiscMessageGenerationOptions, proto, WASocket } from "@whiskeysockets/baileys"
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
    base: proto.IWebMessageInfo;
    key:  proto.IMessageKey | undefined | null;
    text: string;
    name: string;
    type: string;
    isCommand: boolean;
    quoted: proto.IMessage | undefined;
    media: undefined
    | proto.Message.IVideoMessage 
    | proto.Message.IImageMessage
    | proto.Message.IAudioMessage
    | proto.Message.IDocumentMessage = undefined;
    group: {
        name: string, idGroup: string,
        idSender: string,
        isAdmin: string
        members: string[]
    }
    splited: string[];

    constructor (m: proto.IWebMessageInfo[], socket: WASocket){
        this.base = m[0]
        this.name = m[0].pushName;
        this.socket = socket;
        this.key = this.base.key;
        this.essential();
    }

    public essential = (message = this.base.message) => {
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
        else if(type_details.includes("stickerMessage")){
            this.type = "stickerMessage";
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
        this.splited = this.text.split(" ");

        let response: essential = {
            message:message,
            text: this.text,
            isCommand: this.isCommand,
            quoted: this.quoted,
            type: this.type
        }
    
        return response;
    }

    public getGroup = async () => {
        if(this.key.remoteJid?.endsWith("@g.us")){
            let groupInfo = await this.socket.groupMetadata(this.key.remoteJid);
            let members = groupInfo.participants
            this.group = {
                "name": groupInfo.subject,
                "idGroup": this.key.remoteJid,
                "idSender": this.key.participant,
                "members": members.map(participant => participant.id),
                "isAdmin": members.find((participant) => participant.id === this.key.participant).admin
            };
    
            return this.group
        }
    }

    public get_media = (base: essential = this.essential()) => {
        switch(base.type){
            case "imageMessage":
                this.media = base.message.imageMessage;
                break;
            case "videoMessage":
                this.media = base.message.videoMessage;
                break;
            case "stickerMessage":
                this.media = base.message.stickerMessage;
                break;
            case "audioMessage":
                this.media = base.message.audioMessage;
                break;
            case "documentMessage":
                this.media = isMedia(base.message.documentMessage);
                break;
            case "documentWithCaptionMessage":
                this.media = isMedia(base.message.documentWithCaptionMessage.message.documentMessage);
                break;
            case "viewOnceMessageV2Image":
                this.media = base.message.viewOnceMessageV2.message.imageMessage;
                break;
            case "viewOnceMessageV2Video":
                this.media = base.message.viewOnceMessageV2.message.videoMessage;
                break;
            case "viewOnceMessageV2Extension":
                this.media = base.message.viewOnceMessageV2Extension.message.audioMessage;
        }

        return this.media;
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

    private selo = async () => {
        let quoted: proto.IWebMessageInfo = JSON.parse(JSON.stringify(this.base));;
        let Jid = this.key.participant?this.key.participant:this.key.remoteJid;
        console.log(this.key);
        let number = Jid.split("@")[0];
        quoted.key.fromMe = false;
        quoted.key.participant = "0@s.whatsapp.net";
        quoted.key.remoteJid = "0@s.whatsapp.net";
        console.log(number)
        quoted.message = {
            contactMessage: {
                displayName: `${this.name}`,
                vcard: 'BEGIN:VCARD\n' +
                'VERSION:3.0\n' +
                `N:;${this.name};;;\n` +
                `FN:${this.name}\n` +
                `item1.TEL;waid=${number}:+${number}\n` +
                'item1.X-ABLabel:Celular\n' +
                'END:VCARD'
            }
        }
        return quoted;
    }

    reply = async (content: string | AnyMessageContent, selo: boolean = false) => {
        let data: sender = this.response(content, { quoted: selo? await this.selo():this.base });
        return await this.socket.sendMessage(...data);
    }
    
    react = async (emoji: string) => {
        return await this.send({react:{text: emoji, key: this.key}});
    }

    send = async (content: string | AnyMessageContent) => {
        let data: sender = this.response(content);
        return await this.socket.sendMessage(...data);
    }
}

function isMedia(document){
    if(
        [
        'jpg', 'jpeg', 'png',
        'mp4', 'gif', 'mkv', 'webp'
        ].includes(document.fileName.split('.').pop())
    ){
        document.mimetype = "document/media";
        return document;
    }
}