import { AnyMessageContent, MiscMessageGenerationOptions, proto, WASocket } from "@whiskeysockets/baileys"
import { readFileSync } from "fs"
import axios from "axios"
import Long from "long"

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
        let quoted: proto.IWebMessageInfo = JSON.parse(JSON.stringify(this.base));
        let bio: string;
        try{
            bio = (await this.socket.fetchStatus(await this.getGroup()?this.group.idSender:this.key.remoteJid))?.status
        }catch{
            bio = "Biografia privada";
        }
        quoted.key.fromMe = false;
        quoted.key.participant = "0@s.whatsapp.net";
        quoted.key.remoteJid = "120363233965096957@g.us";
        quoted.message.conversation = null;
        quoted.message = 
        {
            imageMessage: {
                interactiveAnnotations: [],
                scanLengths: [ 2362, 5451, 965, 796 ],
                annotations: [],
                url: "https://mmg.whatsapp.net/v/t62.7118-24/33410244_685136303542308_5228593185369115373_n.enc?ccb=11-4&oh=01_AdSlFGEtp3Iv1_1Sddg4zdto8JaUXGjjlBP-Cbt8kUkfHA&oe=65EAA7D6&_nc_sid=5e03e0&mms3=true",
                jpegThumbnail: readFileSync("./src/static/image.jpeg"),
                // jpegThumbnail: new Uint8Array([255, 216, 255, 224, 0, 16, 74, 70, 73, 70, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0, 255, 219, 0, 132, 0, 27, 27, 27, 27, 28, 27, 30, 33, 33, 30, 42, 45, 40, 45, 42, 61, 56, 51, 51, 56, 61, 93, 66, 71, 66, 71, 66, 93, 141, 88, 103, 88, 88, 103, 88, 141, 125, 151, 123, 115, 123, 151, 125, 224, 176, 156, 156, 176, 224, 255, 217, 206, 217, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 1, 27, 27, 27, 27, 28, 27, 30, 33, 33, 30, 42, 45, 40, 45, 42, 61, 56, 51, 51, 56, 61, 93, 66, 71, 66, 71, 66, 93, 141, 88, 103, 88, 88, 103, 88, 141, 125, 151, 123, 115, 123, 151, 125, 224, 176, 156, 156, 176, 224, 255, 217, 206, 217, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 194, 0, 17, 8, 0, 72, 0, 55, 3, 1, 34, 0, 2, 17, 1, 3, 17, 1, 255, 196, 0, 43, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 6, 4, 5, 2, 3, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 255, 218, 0, 12, 3, 1, 0, 2, 16, 3, 16, 0, 0, 0, 153, 53, 25, 93, 127, 153, 204, 0, 15, 126, 5, 236, 157, 52, 145, 148, 0, 1, 111, 37, 91, 36, 101, 52, 153, 128, 54, 21, 178, 61, 111, 145, 197, 168, 194, 56, 96, 0, 0, 0, 255, 196, 0, 39, 16, 0, 1, 3, 2, 3, 8, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 1, 3, 4, 0, 5, 17, 32, 52, 16, 18, 21, 48, 49, 82, 100, 114, 20, 34, 50, 255, 218, 0, 8, 1, 1, 0, 1, 63, 0, 228, 70, 136, 236, 165, 84, 110, 184, 36, 238, 202, 114, 211, 45, 161, 34, 49, 202, 14, 27, 107, 136, 18, 165, 90, 95, 55, 97, 33, 26, 212, 249, 47, 156, 151, 69, 77, 112, 199, 53, 147, 65, 83, 117, 79, 123, 102, 178, 104, 42, 110, 169, 239, 108, 214, 77, 5, 77, 213, 61, 237, 177, 168, 143, 60, 217, 184, 3, 136, 135, 92, 150, 97, 32, 130, 152, 212, 193, 47, 148, 247, 213, 127, 85, 184, 125, 171, 81, 24, 38, 45, 111, 41, 245, 45, 177, 37, 36, 101, 37, 86, 132, 233, 47, 238, 138, 96, 141, 13, 45, 231, 199, 10, 227, 62, 48, 83, 247, 183, 95, 100, 154, 80, 228, 255, 0, 255, 196, 0, 20, 17, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 64, 255, 218, 0, 8, 1, 2, 1, 1, 63, 0, 39, 255, 196, 0, 20, 17, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 64, 255, 218, 0, 8, 1, 3, 1, 1, 63, 0, 39, 255, 217]),
                fileSha256: new Uint8Array([
                    31, 194, 235, 147,  72, 207, 128, 123,
                    73, 136,  19,  75,   1,  84, 222,  97,
                    46, 249, 244,  47, 199, 199, 238, 119,
                    15, 155, 253,  21, 126, 207,  26, 132
                ]),
                fileLength: Long.fromBits(9574, 0, true),
                height: 1200,
                width: 900,
                mediaKey: new Uint8Array([
                    47, 225, 162, 131, 105,  78, 247, 240,
                129,  93,  38, 217, 231,  60, 185, 156,
                190, 122,   5, 143, 193,  16, 191, 123,
                    37,  54, 152,  89,  96, 171, 163,  92
                ]),
                fileEncSha256: new Uint8Array([
                    175, 132, 234, 255,  91,  83,  60,  59,
                    74,  44, 101, 117, 183, 114, 211, 245,
                    149, 147,  74,  82,  60,  19,   5, 214,
                    247,  32,  63, 244, 213, 204, 152, 203
                ]),
                scansSidecar: new Uint8Array([
                154, 219, 237,  64, 118, 217, 221,  62,
                100, 234, 186, 154, 184,  50, 199, 124,
                241, 206, 248, 151, 193, 115, 193,  16,
                240, 137,  76, 126,  26, 117,  91,  86,
                    79,  33, 196, 223, 175, 125, 226, 160
                ]),
                midQualityFileSha256: new Uint8Array([
                    96,  15, 179,  15, 228, 120,  10, 137,
                    99,  98,  14,   4, 104, 118, 127, 124,
                    111,   1, 148, 126,  16, 214, 103, 205,
                    72, 204, 109, 132, 127, 208, 216, 236
                ]),
                directPath: '/v/t62.7118-24/33410244_685136303542308_5228593185369115373_n.enc?ccb=11-4&oh=01_AdSlFGEtp3Iv1_1Sddg4zdto8JaUXGjjlBP-Cbt8kUkfHA&oe=65EAA7D6&_nc_sid=5e03e0',
                mediaKeyTimestamp: Long.fromBits(1707294372, 0, false),
                mimetype: "image/jpeg",
                caption: `${bio}\n`
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
        return document;
    }
}