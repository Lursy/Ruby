import express from 'express';
import bodyParser from 'body-parser';
import { WASocket } from '@whiskeysockets/baileys';
import { readFileSync } from 'fs';


export async function server(sock: WASocket){
      
    const app = express();
    const PORT = 80;
    
    // app.use(logger('dev'));  // Comente essa linha caso não queira que seja exibido o log do servidor no seu console
	  app.use(bodyParser.json());
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));
    
    // Endpoint para configuração do webhook, você precisa cadastrar https://SEUDOMINIO.com/webhook
    app.get("/", (req, res) => {
      console.log(req.body);
      res.send(200);
    });

    app.post("/webhook(/pix)?", (request, response) => {
        response.send(200);
        console.log(request.body.pix[0]);
        let payment = JSON.parse(readFileSync("./src/core/data/users.json", "utf-8"));
        sock.sendMessage(payment.payment_pendding[request.body.pix[0].txid][0], {text: "Pagamento concluido!"});
        delete payment.payment_pendding[request.body.pix[0].txid];
    });
      
      
    app.listen(PORT, () =>
      console.log(`Express server currently running on port ${PORT}`)
    );
}