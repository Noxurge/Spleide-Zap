const { Client, LocalAuth } = require('whatsapp-web.js')
const qrcode = require('qrcode-terminal')
const colors = require('colors');
const fs = require('fs');
const { exec } = require('child_process');
require('dotenv').config();

function printError(message) {
    console.log(colors.red('[*] ' + message));
}

function printInfo(message) {
    console.log(colors.yellow('[!] ' + message));
}

function printSuccess(message) {
    console.log(colors.green('[+] ' + message));
}

function printCall(sender_contact, call) {
    let name = String(sender_contact.pushname);
    if (name === 'undefined') {
        name = "SEU_NOME_AQUI"
    }
    console.log(colors.blue(`[+] ${name} used ${call}`));
}

//ASCII ART ghost_bo
const banner = `
#######  ######   ##       #######   ######  ######   #######           #######   #####   #######
##       ##   ##  ##       ##          ##    ##   ##  ##                    ##   ##   ##  ##   ##
#######  ######   ##       #######     ##    ##   ##  #######  ######      ##    #######  #######
     ##  ##       ##       ##          ##    ##   ##  ##                  ##     ##   ##  ##
#######  ##       #######  #######   ######  ######   #######           #######  ##   ##  ##
`
console.log(colors.rainbow(banner));
printInfo('Initializing the bot...');

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        executablePath: 'C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe'
    }
});

printSuccess('Client ready!')
client.on('qr', qr => {
    printInfo('QR Code received, scan it please')
    qrcode.generate(qr, {small: true})
});

client.on('authenticated', (session) => printSuccess(`Whatsapp authentication success!`))
client.on('ready', () => printSuccess('Ready to use!'))
client.on('message_create', message => {
    if (message.fromMe) {
        commands(message);
    }
});

// Quando alguem editar uma mensagem esse código é ativado
client.on('message_edit', (message) => {
    console.log(`Message received from ${message.from}: ${message.body}`);
    const grupo = process.env.GRUPO;
    console.log(grupo);
});

// Recupera mensagens apagadas e as envia para o número particular
client.on('message_revoke_everyone', async (after, message) => {
        const sender_a = await message.getContact();
        const chat_a = await message.getChat();
        let name = String(sender_a.pushname);
        if (message.fromMe) {
           name = "SEU_NOME";
        };
        const t = `Mensagem apagada\nEnviada por: ${name}\nEm: ${chat_a.name}\nConteudo: ${message.body}`;
        printInfo(`Mensagem apagada por ${name}, enviando para o pv...`);
        console.log(message.id);
        client.sendMessage(process.env.PHONE_NUMBER, t);
});

client.initialize();

let jsonData;
fs.readFile('./bot-config.json', 'utf8', (err, data) => {
  if (err) {
    printError('Error reading config file:', err);
    process.exit(1);
  }
  try {
    jsonData = JSON.parse(data);
    const loaded_callers = Object.keys(jsonData);
    const loaded_callers_values_length = loaded_callers.length;
    printSuccess(`Loaded ${loaded_callers_values_length} callers (${loaded_callers})`);

  } catch (error) {
    printError('Error parsing JSON of config file ', error);
    process.exit(1);
  }
});

printInfo('Starting WhatsApp authentication...');

const commands = async (message) => {
    const callers = jsonData
    if (!message.body.includes(' ')) {
                message.body += ' '
        };

    let caller = await message.body.substring(0, message.body.indexOf(" "))
    var sender_contact = await message.getContact();
    const quotedMsg = await message.getQuotedMessage();

    switch (caller) {
        //Comando "ping" responde a sua própria mensagem com o texto "pong"
        case callers.ping:
            printCall(sender_contact, callers.ping);
            await message.reply('pong');
            break;
        
        //Comando /listar é usado para executar o comando dir na pasta atual do seu bot
        case callers.listar:
            printCall(sender_contact, callers.listar);
            exec('dir', (error, stdout, stderr) => {
                if (error) {
                    console.error(`Erro ao executar o comando: ${error.message}`);
                    return;
                }
                if (stderr) {
                    console.error(`Erro na saída do comando: ${stderr}`);
                    return;
                }
                comando = `Saída do comando:\n${stdout}`;
                client.sendMessage(process.env.PHONE_NUMBER, comando);
            });
            break;

        //Chamar o comando com /show em uma mensagem de visualização única para enviar para seu contato pessoal
        case callers.show:
            printCall(sender_contact, callers.show);
            if (quotedMsg && quotedMsg.hasMedia) {
                const media = await quotedMsg.downloadMedia();
                const options = {
                    media: media,
                    sendMediaAsSticker: false,
                };
                await client.sendMessage(process.env.PHONE_NUMBER, media, options);
                printSuccess('show responded OK');
            };
            break;
        
        case callers.teste:
            printCall(sender_contact, callers.teste);
    }
}