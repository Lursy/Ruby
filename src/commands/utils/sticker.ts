import { BufferedEventData, downloadContentFromMessage, downloadEncryptedContent, downloadMediaMessage, proto } from "@whiskeysockets/baileys";
import { writeFileSync, unlinkSync, readFileSync } from "fs";
import webp from "node-webpmux";
import ffmpeg from "fluent-ffmpeg";
import sharp from "sharp";

export class stickerMedia{
    private insertAttr = async (path: string = '') => {
      const img = new webp.Image();
    
      const json = {
        "sticker-pack-id": "666",
        "sticker-pack-name": "Ruby",
        "sticker-pack-publisher": "BOT"
      };
    
      const exifAttr = Buffer.from([
        0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57,
        0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00,
      ]);
    
      const jsonBuff = Buffer.from(JSON.stringify(json), "utf-8");
    
      const exif = Buffer.concat([exifAttr, jsonBuff]);
    
      exif.writeUIntLE(jsonBuff.length, 14, 4);
      
      await img.load(path);
    
      img.exif = exif;
    
      await img.save(path);
    };

    makeStiker = async (mmedia: proto.Message.IVideoMessage | proto.Message.IImageMessage | proto.Message.IDocumentMessage) => {
      let buffer = Buffer.from([]);
      let namePath = "sticker";
      console.log(mmedia);

      let path: string;
      
      let media = null;
      if(!mmedia["fileName"]){
        if(mmedia.mimetype.split("/")[0] == "image"){
          media = await downloadContentFromMessage(mmedia, "image");
        }else{
          media = await downloadContentFromMessage(mmedia, "video");
        }
      }else{
        media = await downloadContentFromMessage(mmedia, "document");
      }

      for await (const chunk of media) {
        buffer = Buffer.concat([buffer, chunk]);
      }
      
      path = `./temp/${namePath}.${mmedia.mimetype.split("/")[1]}`;

      let pathOut = `./temp/.${namePath}.webp`
      
      
      let quality = Math.floor(1024*1024*40/buffer.byteLength);
      if(quality>80) quality=80;
      let buff: Buffer;

      if(mmedia.mimetype.split("/")[0] == "image"){
        buff = await sharp(buffer, {animated: true})
        .resize(512, 512)
        .webp({ quality: quality })
        .toBuffer();
      }
      else{
        writeFileSync(path, buffer);
        buff = await new Promise(async (resolve, reject) => {
          ffmpeg(path)
            .on("error", reject)
            .on("end", () => resolve(true))
            .addOutputOptions([
              '-vcodec',
              'libwebp',
              '-vf',
              'scale=\'iw*min(300/iw\,300/ih)\':\'ih*min(300/iw\,300/ih)\',format=rgba,pad=300:300:\'(300-iw)/2\':\'(300-ih)/2\':\'#00000000\',setsar=1,fps=20,split[s0][s1];[s0]palettegen[p];[s1]fifo[v];[v][p]paletteuse',
              '-loop',
              '0',
              '-ss',
              '00:00:00.0',
              '-t',
              '00:00:05.0',
              '-preset',
              'default',
              '-an',
              '-vsync',
              '0',
              '-s',
              '512:512',
              '-q',
              '20'
          ])
            .save(pathOut);
        }).then(async () => {
          const buff = readFileSync(pathOut);
      
          unlinkSync(path);
          unlinkSync(pathOut);
      
          return buff;
        });
      }

      console.log(buff.byteLength);

      return buff;
    }
}    
