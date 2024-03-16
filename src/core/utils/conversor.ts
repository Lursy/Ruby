import { readFileSync, unlinkSync, writeFileSync } from "fs";
import { Message } from "./Message";
import sharp from "sharp";

const ffmpeg = require('fluent-ffmpeg');

export class Conversor{
    message: Message

    constructor(message: Message) {
        this.message = message;
    }


    toWebp = async (buffer: Buffer, from: string) => {
        console.log(from);
        if(from !== "document"){
            let path = `./temp/${this.message.key.id}.mp4`;
            let pathOut = `./temp/${this.message.key.id}.webp`;

            await writeFileSync(path, buffer);
            
            try{
                return await new Promise(async (resolve, reject) => {
                    ffmpeg(path)
                        .on("error", reject)
                        .on("end", () => resolve(true))
                        .addOutputOptions(['-vcodec', 'libwebp',
                        '-vf', 'scale=\'iw*min(300/iw\,300/ih)\':\'ih*min(300/iw\,300/ih)\',format=rgba,pad=300:300:\'(300-iw)/2\':\'(300-ih)/2\':\'#00000000\',setsar=1,fps=20',
                        '-loop', '0',
                        '-ss', '00:00:00.0',
                        '-t', '00:00:05.0',
                        '-preset', 'default',
                        '-an',
                        '-vsync', '0',
                        '-s', '512:512',
                        '-q', '20'
                        ])
                        .save(pathOut);
                })
                .then(async () => {
                    const buff = readFileSync(pathOut);

                    unlinkSync(path);
                    unlinkSync(pathOut);
            
                    return buff;
                });
            }
            catch(err){
                console.log(err);
                return null;
            }
        }

        let quality = Math.floor(1024*1024*40/buffer.byteLength);
        
        if(quality>80) quality=80;
        if(quality<10) quality=10;
        
        const buff = await sharp(buffer, {animated: true})
            .resize(512, 512)
            .webp({ quality: quality })
            .toBuffer();

        return buff;
    }


    toMp4 = async (buffer: Buffer) => {
        let path = `./temp/${this.message.key.id}.gif`;
        let pathOut = `./temp/${this.message.key.id}.mp4`;

        await writeFileSync(path, buffer);

        try{
            return await new Promise(async (resolve, reject) => {
                ffmpeg(path)
                    .on("error", reject)
                    .on("end", () => resolve(true))
                    .addOutputOptions(['-vcodec', 'libx264', '-pix_fmt', 'yuv420p'])
                    .format('mp4')
                    .save(pathOut);
            })
            .then(async () => {
                const buff = readFileSync(pathOut);

                unlinkSync(path);
                unlinkSync(pathOut);
        
                return buff;
            });
        }
        catch(err){
            console.log(err);
            return null;
        }
    }

    toImg = async (buffer: Buffer, ext: "png" | "gif") => {
        return await sharp(buffer, {animated: ext=="gif"}).toFormat(ext).toBuffer();
    }
}