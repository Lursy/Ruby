import EfiPay from 'sdk-typescript-apis-efi';
import credentials from "./credentials";

export async function cob(value: string) {

    const efipay = new EfiPay(credentials);

    const body = {
        calendario: {
            expiracao: 3600,
        },
        valor: {
            original: value,
        },
        chave: '18120599659',
    };


    const response = await efipay.pixCreateImmediateCharge([], body).catch((err: Promise<any>) => err);

    const qrcode = await efipay.pixGenerateQRCode({id: response.loc.id}).catch( (err) => err );

    return [response, Buffer.from(qrcode.imagemQrcode.split(",")[1], "base64")];
}