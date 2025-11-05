import dotenv from 'dotenv';
dotenv.config();
import { create } from '@wppconnect-team/wppconnect';
import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let whatsappClient = null;
const SESSION_DIR = path.join(__dirname, 'tokens');
const SESSION_FILE = path.join(SESSION_DIR, 'salon-bot.json');

if (!fs.existsSync(SESSION_DIR)) {
  fs.mkdirSync(SESSION_DIR, { recursive: true });
}

export default async function startWhatsappBot() {
  try {
    const sessionExists = fs.existsSync(SESSION_FILE);
    
    const client = await create({
      session: 'salon-bot',
      puppeteerOptions: {
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium',
        headless: "new",
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-gpu',
          '--disable-dev-shm-usage',
          '--single-process',
          '--no-zygote'
        ],
        ignoreDefaultArgs: ['--disable-extensions']
      },
      catchQR: (base64Qr) => {
        if (!sessionExists) {
          console.log('=== SCANEAE ESTE QR CODE UMA VEZ ===');
          console.log('Base64 QR:', base64Qr);
        }
      },
      statusFind: (status) => {
        console.log('Status:', status);
        if (status === 'authenticated') {
          console.log('✅ Login realizado!');
        }
      }
    });

    client.on('authenticated', (session) => {
      fs.writeFileSync(SESSION_FILE, JSON.stringify(session));
    });

    client.onMessage(async (message) => {
      if (message.body === '!ping') {
        await client.sendText(message.from, '🏓 Pong!');
      }
    });

    console.log('🤖 Bot iniciado com sucesso');

  } catch (error) {
    console.error('Erro crítico no bot:', error);
    // Não encerre o processo, permita reinicialização
    setTimeout(startWhatsappBot, 30000); // Tenta reiniciar em 30 segundos
  }
}