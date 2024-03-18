import dotenv from 'dotenv'; 
dotenv.config();


export default {
    sandbox: false,
    client_id: process.env.CLIENT_ID,
    client_secret: process.env.CLIENT_SECRET,
    certificate: './certificate/certificadop.p12',
    // debug: true
}