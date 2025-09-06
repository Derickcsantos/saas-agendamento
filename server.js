require('dotenv').config();
const express = require('express');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');  // Cliente para interagir com o Banco de Dados
const cors = require('cors');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const { create } = require('@wppconnect-team/wppconnect');
const cookieParser = require('cookie-parser');
const ExcelJS = require('exceljs');
const multer = require('multer');
const fs = require('fs');
const mongoose = require('mongoose');
const swaggerJsdoc = require('swagger-jsdoc');  
const swaggerUi = require('swagger-ui-express');  // Cria um ainterface para testarmos a API
const upload = multer();
const schedule = require('node-schedule');
const cron = require('node-cron');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid'); // Gera ids unicos


// Configuração do Swagger personalizada
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Sistema de Agendamentos Online',
      version: '1.0.0',
      description: 'Documentação das rotas da API de agendamentos',
      contact: {
        name: 'Dérick Campos',
        email: 'derickcampossantos1@gmail.com'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Servidor local'
      },
      {
        url: 'https://agendaagora.onrender.com',
        description: 'Servidor de produção'
      }
    ]
  },
  apis: ['./server.js'] // Todas as rotas estão neste arquivo
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Configuração do Swagger UI com opções personalizadas
const swaggerUiOptions = {
  customSiteTitle: "Sistema de Agendamentos Online - Documentação",
  customCss: `
    .topbar { display: none }
    .swagger-ui .information-container { background-color: #f5f5f5 }
  `,
  customfavIcon: '/favicon.ico'
};

let whatsappClient = null;
const SESSION_DIR = path.join(__dirname, 'tokens');
const SESSION_FILE = path.join(SESSION_DIR, 'salon-bot.json');

// A pasta TOKEN serve para guardar onde os arquivos serão guardados

const app = express();
const port = process.env.PORT || 3000;

// Configuração do Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);
app.use(cookieParser());

// Criar diretório se não existir
if (!fs.existsSync(SESSION_DIR)) {
  fs.mkdirSync(SESSION_DIR, { recursive: true });
}

const corsOptions = {
  origin: '*',              // Permite qualquer origem
  methods: ['GET', 'POST', 'PUT', 'DELETE'],  // Permite os métodos HTTP que você precisa
  allowedHeaders: ['Content-Type'], // Permite esses cabeçalhos específicos
  credentials: true,        // Permite cookies (importante se for necessário)
};

// const mongoURI = process.env.MONGO_URI || 'uri do banco de dados mongodb'
// // Conexão com MongoDB
//  mongoose.connect('uri do banco de dados para a galeria, utilizar mongodb', {
//    useNewUrlParser: true,
//    useUnifiedTopology: true,
//    serverSelectionTimeoutMS: 10000,
//    socketTimeoutMS: 45000
//  })
//  .then(() => console.log('✅ MongoDB conectado com sucesso'))
//  .catch(err => {
//    console.error('❌ Falha na conexão com MongoDB:', err);
//    process.exit(1);
//  });

// Modelo da Galeria
const ImagemSchema = new mongoose.Schema({
  dados: {
    type: Buffer,
    required: true
  },
  tipo: {
    type: String,
    required: true
  }
}, { _id: false });;

const GaleriaSchema = new mongoose.Schema({
  titulo: {
    type: String,
    default: 'Sem título'
  },
  imagem: {
    type: ImagemSchema,
    required: true
  },
  criadoEm: {
    type: Date,
    default: Date.now
  }
}, { versionKey: false });

const Galeria = mongoose.model('Galeria', GaleriaSchema);


// Middlewares
app.use(cors(corsOptions));

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));


// TODAS AS ROTAS QUE PRECISAM DO ID DA ORGANIZAÇÃO
const extractOrganizationId = (req, res, next) => {
  const organizationId = req.headers['organization-id'] || req.query.organization_id || (req.body && req.body.organization_id);
  
  if (!organizationId) {
    return res.status(400).json({ error: 'Organization ID é obrigatório' });
  }
  
  req.organizationId = organizationId;
  next();
};

const checkAuth = (req, res, next) => {
  const userData = req.cookies.userData;  // Obtendo os dados do usuário do cookie

  if (!userData) {
    return res.status(403).send('Acesso negado');  // Caso não tenha cookie
  }

  const parsedUser = JSON.parse(userData);

  // Verificando se o tipo do usuário é 'admin' ou 'funcionario'
  if (parsedUser.tipo === 'admin' || parsedUser.tipo === 'funcionario') {
    req.organizationId = parsedUser.organization_id;
    next();  // Usuário autorizado, segue para a rota
  } else {
    return res.status(403).send('Acesso negado');
  }
};

async function migrateImages() {
  const { data: services, error } = await supabase
    .from("services")
    .select("id, imagem_service");

  if (error) {
    console.error("Erro buscando serviços:", error);
    return;
  }

  for (const service of services) {
    if (!service.imagem_service) continue; // não tem imagem base64

    try {
      const buffer = Buffer.from(service.imagem_service, "base64");

      // converte para webp
      const optimized = await sharp(buffer)
        .resize({ width: 600 })
        .webp({ quality: 80 })
        .toBuffer();

      const fileName = `service-${service.id}.webp`;

      // upload para bucket
      const { error: uploadError } = await supabase.storage
        .from("services-images")
        .upload(fileName, optimized, {
          contentType: "image/webp",
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: publicUrl } = supabase.storage
        .from("services-images")
        .getPublicUrl(fileName);

      // atualiza tabela
      const { error: updateError } = await supabase
        .from("services")
        .update({ imagem_service: publicUrl.publicUrl })
        .eq("id", service.id);

      if (updateError) throw updateError;

      console.log(`Migrado serviço ${service.id}`);
    } catch (err) {
      console.error(`Erro migrando serviço ${service.id}:`, err);
    }
  }

  console.log("✅ Migração concluída!");
}

// migrateImages();

// Integração com Express (coloque isto ANTES das outras rotas)
app.use(
  '/api-docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, swaggerUiOptions)
);
// Rotas para servir os arquivos HTML
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/home', (req, res) => res.sendFile(path.join(__dirname, 'public', 'home.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));
app.get('/galeria', (req, res) => res.sendFile(path.join(__dirname, 'public', 'galeria.html')));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));
// app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));
app.get('/admin', checkAuth, async (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});
app.get('/funcionario', checkAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'funcionario.html'));
});
// Rota para a página inicial logada
app.get('/logado', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'logado.html'), {
    headers: {
      'Content-Type': 'text/html',
      'Cache-Control': 'no-cache'
    }
  });
});

app.get('/logado/agendamentos', (req, res) => {
  // Verifique se o usuário está autenticado
  if (!req.session.user) {
    return res.redirect('/login');
  }
  
  // Envie o mesmo arquivo que a página principal, mas o JavaScript cuidará da exibição
  res.sendFile(path.join(__dirname, 'public', 'logado.html'), {
    headers: {
      'Content-Type': 'text/html',
      'Cache-Control': 'no-cache'
    }
  });
});


const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Rota para enviar email de contato
app.post('/api/contact', async (req, res) => {
    const { name, email, phone, message } = req.body;

    // Validação básica
    if (!name || !email || !message) {
        return res.status(400).json({ error: 'Nome, email e mensagem são obrigatórios' });
    }

    // Configuração do transporter (substitua com suas credenciais SMTP)
    const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false, // true para 465, false para outras portas
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });

    // Configuração do email
    const mailOptions = {
        from: `"Formulário de Contato" <${email}>`,
        to: 'salaopaulatrancas@gmail.com',
        subject: `Nova mensagem de ${name} - Site Paula Tranças`,
        text: `
            Nome: ${name}
            Email: ${email}
            Telefone: ${phone || 'Não informado'}
            
            Mensagem:
            ${message}
        `,
        html: `
            <h2>Nova mensagem do site Paula Tranças</h2>
            <p><strong>Nome:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Telefone:</strong> ${phone || 'Não informado'}</p>
            <p><strong>Mensagem:</strong></p>
            <p>${message.replace(/\n/g, '<br>')}</p>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        res.status(200).json({ message: 'Mensagem enviada com sucesso!' });
    } catch (error) {
        console.error('Erro ao enviar email:', error);
        res.status(500).json({ error: 'Ocorreu um erro ao enviar a mensagem. Por favor, tente novamente mais tarde.' });
    }
});

// Função para gerar senha
function gerarSenha() {
  const letras = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numeros = '0123456789';

  let senha = '';
  for (let i = 0; i < 4; i++) {
    senha += letras.charAt(Math.floor(Math.random() * letras.length));
  }
  for (let i = 0; i < 3; i++) {
    senha += numeros.charAt(Math.floor(Math.random() * numeros.length));
  }

  return senha;
}

// Busca usuário por email
async function findUserByEmail(email) {
  const { data, error } = await supabase
    .from('users')
    .select('id, email, username')
    .eq('email', email)
    .single();

  if (error) {
    console.error('Erro ao buscar usuário por email:', error);
    return null;
  }

  return data;
}

// Atualiza a senha do usuário
async function updateUserPassword(userId, newPassword) {
  const { error } = await supabase
    .from('users')
    .update({ password_plaintext: newPassword })
    .eq('id', userId);

  if (error) {
    throw error;
  }
}

/**
 * @swagger
 * /api/forgot-password:
 *   post:
 *     summary: Recuperação de senha
 *     description: Envia uma nova senha para o e-mail do usuário caso ele tenha esquecido.
 *     tags:
 *       - Autenticação
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: usuario@exemplo.com
 *     responses:
 *       200:
 *         description: Senha enviada com sucesso por e-mail
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *       404:
 *         description: E-mail não encontrado
 *       500:
 *         description: Erro interno ao processar a solicitação
 */

// Rota para recuperação de senha
app.post('/api/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    // Aqui você deve verificar se o email existe no seu banco de dados
    // Esta é uma implementação simulada - substitua pela sua lógica real
    const user = await findUserByEmail(email); // Você precisa implementar esta função
    
    if (!user) {
      return res.status(404).json({ success: false, error: 'Email não encontrado' });
    }

    // Gera nova senha
    const newPassword = gerarSenha();
    
    // Atualiza a senha no banco de dados (implemente esta função)
    await updateUserPassword(user.id, newPassword);
    
    // Envia email com a nova senha
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Recuperação de Senha - Salão de Beleza',
      html: `
        <h2>Recuperação de Senha</h2>
        <p>Você solicitou uma nova senha para acessar o sistema do Salão de Beleza.</p>
        <p>Sua nova senha é: <strong>${newPassword}</strong></p>
        <p>Recomendamos que você altere esta senha após o login.</p>
        <p>Caso não tenha solicitado esta alteração, por favor ignore este email.</p>
      `
    };

    await transporter.sendMail(mailOptions);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Erro na recuperação de senha:', error);
    res.status(500).json({ success: false, error: 'Erro ao processar solicitação' });
  }
});

/**
 * @swagger
 * /api/send-confirmation-email:
 *   post:
 *     summary: Enviar e-mail de confirmação
 *     description: Envia um e-mail com assunto e corpo personalizados.
 *     tags:
 *       - Notificações
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - subject
 *               - body
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: cliente@exemplo.com
 *               subject:
 *                 type: string
 *                 example: Confirmação de Agendamento
 *               body:
 *                 type: string
 *                 example: "<p>Olá! Seu agendamento está confirmado.</p>"
 *     responses:
 *       200:
 *         description: E-mail enviado com sucesso
 *       500:
 *         description: Erro ao enviar e-mail
 */
app.post('/api/send-confirmation-email', async (req, res) => {
  try {
    const { email, subject, body } = req.body;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: subject,
      html: body
    };

    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: 'E-mail enviado com sucesso' });
  } catch (error) {
    console.error('Erro ao enviar e-mail:', error);
    res.status(500).json({ error: 'Erro ao enviar e-mail' });
  }
});

/**
 * @swagger
 * /api/send-whatsapp-confirmation:
 *   post:
 *     summary: Enviar mensagem de confirmação via WhatsApp
 *     description: Envia uma mensagem de confirmação de agendamento para o cliente via WhatsApp.
 *     tags:
 *       - Notificações
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - clientPhone
 *               - appointmentDetails
 *             properties:
 *               clientPhone:
 *                 type: string
 *                 example: "11987654321"
 *               appointmentDetails:
 *                 type: object
 *                 required:
 *                   - service
 *                   - professional
 *                   - date
 *                   - time
 *                 properties:
 *                   service:
 *                     type: string
 *                     example: "Corte de Cabelo"
 *                   professional:
 *                     type: string
 *                     example: "Maria Silva"
 *                   date:
 *                     type: string
 *                     example: "2025-06-10"
 *                   time:
 *                     type: string
 *                     example: "14:00"
 *     responses:
 *       200:
 *         description: Mensagem enviada com sucesso
 *       400:
 *         description: Dados incompletos
 *       500:
 *         description: Erro ao enviar mensagem via WhatsApp
 */
// Rota para enviar mensagem via WhatsApp
app.post('/api/send-whatsapp-confirmation', async (req, res) => {
  try {
    const { clientPhone, appointmentDetails } = req.body;

    if (!whatsappClient) {
      return res.status(500).json({ 
        success: false, 
        error: "WhatsApp não conectado. Por favor, reinicie o servidor." 
      });
    }

    // Validação dos dados
    if (!clientPhone || !appointmentDetails) {
      return res.status(400).json({
        success: false,
        error: "Dados incompletos"
      });
    }

    const formattedPhone = `55${clientPhone.replace(/\D/g, '')}@c.us`;
    const message = `📅 *Confirmação de Agendamento* \n\n` +
      `✅ *Serviço:* ${appointmentDetails.service}\n` +
      `👩🏾‍💼 *Profissional:* ${appointmentDetails.professional}\n` +
      `📆 *Data:* ${appointmentDetails.date}\n` +
      `⏰ *Horário:* ${appointmentDetails.time}\n\n` +
      `_Agradecemos sua preferência!_`;

    // Envia a mensagem
    await whatsappClient.sendText(formattedPhone, message);
    
    res.json({ success: true });

  } catch (error) {
    console.error("Erro ao enviar WhatsApp:", error);
    res.status(500).json({ 
      success: false, 
      error: error.message || "Falha no envio" 
    });
  }
});

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Verifica o estado da aplicação
 *     description: Retorna o status da API e do cliente WhatsApp.
 *     tags:
 *       - Sistema
 *     responses:
 *       200:
 *         description: Sistema está saudável
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: healthy
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       503:
 *         description: Cliente WhatsApp não conectado
 */
// Health Check
app.get('/health', (req, res) => {
  res.status(whatsappClient ? 200 : 503).json({
    status: whatsappClient ? 'healthy' : 'unavailable',
    timestamp: new Date()
  });
});

async function startWhatsappBot() {
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

//--------------------------------------------------------------------------------------------------------------------------------------------------------

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: Gerenciamento de usuários
 */

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Retorna todos os usuários em uma organização
 *     tags: [Users]
 *     parameters:
 *       - in: query
 *         name: organization_id
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: ID da organização
 *     responses:
 *       200:
 *         description: Lista de todos os usuários
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/User'
 *       500:
 *         description: Erro interno do servidor
 */
app.get('/api/users', extractOrganizationId, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, username, email, tipo, created_at')
      .eq('organization_id', req.organizationId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Retorna um usuário específico em uma organização
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: ID do usuário
 *       - in: query
 *         name: organization_id
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: ID da organização
 *     responses:
 *       200:
 *         description: Dados do usuário
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       404:
 *         description: Usuário não encontrado
 *       500:
 *         description: Erro interno do servidor
 */
app.get('/api/users/:id', extractOrganizationId, async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .eq('organization_id', req.organizationId)  // ALTERADO
      // .single();

    if (error) throw error;
    if (data.length === 0) return res.status(404).json({ error: 'Usuário não encontrado nessa organização' });
    
    res.json(data[0]);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/users:
 *   post:
 *     summary: Cria um novo usuário em uma organização
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserInput'
 *     responses:
 *       200:
 *         description: Usuário criado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: Usuário ou email já cadastrado
 *       500:
 *         description: Erro interno do servidor
 */
app.post('/api/users', extractOrganizationId, async (req, res) => {
  const { username, email, password_plaintext, tipo = 'comum', id_employee } = req.body;

  // console.log("EU SOU O REQ ORGANIZATIONID: ",req.organizationId)
  // console.log("EU SOU O REQ BODY ORGANIZATIONID: ",req.body.organizationId)

  try {
    const { data: existingUsers, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('organization_id', req.organizationId)    // ALTERADO
      .or(`username.eq.${username},email.eq.${email}`);

    if (userError) throw userError;

    if (existingUsers && existingUsers.length > 0) {
      return res.status(400).json({
        error: 'Usuário ou email já cadastrado'
      });
    }

    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert([{
        organization_id: req.organizationId,  // ALTERADO
        username,
        email,
        password_plaintext,
        tipo,
        id_employee: tipo === 'funcionario' ? id_employee : null,
        created_at: new Date().toISOString()
      }])
      .select('*')
      .single();

    if (insertError) throw insertError;

    res.json(newUser);
  } catch (err) {
    console.error('Erro ao cadastrar usuário:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     summary: Atualiza um usuário existente em uma organização
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: ID do usuário
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserUpdate'
 *     responses:
 *       200:
 *         description: Usuário atualizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: Nome de usuário e e-mail são obrigatórios
 *       404:
 *         description: Usuário não encontrado
 *       500:
 *         description: Erro interno do servidor
 */
app.put('/api/users/:id', extractOrganizationId, async (req, res) => {
  try {
    const { id } = req.params;
    const { username, email, password_plaintext, phone, aniversario, tipo, id_employee } = req.body;
    const organization_id = req.organizationId

    if (!username || !email) {
      return res.status(400).json({ error: 'Nome de usuário e e-mail são obrigatórios' });
    }

    const updateData = {
      username,
      email,
      phone,
      aniversario,
      updated_at: new Date().toISOString(),
      ...(tipo && { tipo }),
      ...(password_plaintext && { password_plaintext }),
      id_employee: tipo === 'funcionario' ? id_employee : null
    };

    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', id)
      .eq('organization_id', organization_id)
      .select('*')
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     summary: Remove um usuário em uma organização
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: ID do usuário
 *       - in: query
 *         name: organization_id
 *         schema:
 *           type: string
 *           format: uuid
 *         required: false
 *         description: Organização do usuário
 *     responses:
 *       200:
 *         description: Usuário removido com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *       404:
 *         description: Usuário não encontrado
 *       500:
 *         description: Erro interno do servidor
 */
app.delete('/api/users/:id', extractOrganizationId, async (req, res) => {
  try {
    const { id } = req.params;
    const organization_id = req.organizationId

    const { data: existingUser, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('id', id)
      .eq('organization_id', organization_id)
      .single();

    if (userError || !existingUser) {
      return res.status(404).json({ error: 'Usuário não encontrado nessa organização' });
    }

    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .eq('id', id)
      .eq('organization_id', organization_id);

    if (deleteError) throw deleteError;

    res.json({ success: true });
  } catch (err) {
    console.error('Erro ao excluir usuário:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: ID do usuário
 *         username:
 *           type: string
 *           description: Nome de usuário
 *         email:
 *           type: string
 *           format: email
 *           description: E-mail do usuário
 *         tipo:
 *           type: string
 *           enum: [comum, admin]
 *           default: comum
 *           description: Tipo de usuário
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: Data de criação
 *         updated_at:
 *           type: string
 *           format: date-time
 *           description: Data de atualização
 *       example:
 *         id: "1"
 *         username: "john_doe"
 *         email: "john@example.com"
 *         tipo: "comum"
 *         created_at: "2023-01-01T00:00:00Z"
 *         updated_at: "2023-01-02T00:00:00Z"
 * 
 *     UserInput:
 *       type: object
 *       required:
 *         - username
 *         - email
 *         - password_plaintext
 *       properties:
 *         username:
 *           type: string
 *         email:
 *           type: string
 *           format: email
 *         password_plaintext:
 *           type: string
 *         tipo:
 *           type: string
 *           enum: [comum, admin]
 *           default: comum
 *       example:
 *         username: "john_doe"
 *         email: "john@example.com"
 *         password_plaintext: "senha123"
 *         tipo: "comum"
 *         organization_id: "11111111-1111-1111-1111-111111111111"
 * 
 *     UserUpdate:
 *       type: object
 *       properties:
 *         username:
 *           type: string
 *         email:
 *           type: string
 *           format: email
 *         password_plaintext:
 *           type: string
 *         tipo:
 *           type: string
 *           enum: [comum, admin]
 *       example:
 *         username: "john_doe_updated"
 *         email: "john.updated@example.com"
 *         password_plaintext: "nova_senha123"
 *         tipo: "admin"
 *         organization_id: "11111111-1111-1111-1111-111111111111"
 */

//-------------------------------------------------------------------------------------------

/**
 * @swagger
 * tags:
 *   name: Autenticação
 *   description: Endpoints para registro e login de usuários
 */

/**
 * @swagger
 * /api/register:
 *   post:
 *     summary: Cadastra um novo usuário no sistema
 *     tags: [Autenticação]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - email
 *               - aniversario
 *               - password_plaintext
 *             properties:
 *               username:
 *                 type: string
 *                 description: Nome de usuário único
 *                 example: "derick_campos"
 *               email:
 *                 type: string
 *                 format: email
 *                 description: E-mail válido do usuário
 *                 example: "derick@exemplo.com"
 *               aniversario:
 *                 type: string
 *                 format: date
 *                 description: Data de nascimento no formato YYYY-MM-DD
 *                 example: "1990-01-15"
 *               password_plaintext:
 *                 type: string
 *                 description: Senha em texto puro (em produção deve ser criptografada)
 *                 example: "senhaSegura123"
 *     responses:
 *       200:
 *         description: Usuário cadastrado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     username:
 *                       type: string
 *                     email:
 *                       type: string
 *                     aniversario:
 *                       type: string
 *                     created_at:
 *                       type: string
 *       400:
 *         description: Erro na requisição (usuário ou e-mail já cadastrado)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Usuário ou email já cadastrado"
 *       500:
 *         description: Erro interno do servidor
 */

// Rota de cadastro
app.post('/api/register', extractOrganizationId, async (req, res) => {
  const { username, email, aniversario, phone, password_plaintext } = req.body;

  try {
    // Verifica se já existe usuário com mesmo username ou email
    const { data: existingUsers, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('organization_id', req.organizationId)
      .or(`username.eq.${username},email.eq.${email}`);

    if (userError) {
      throw userError;
    }

    if (existingUsers && existingUsers.length > 0) {
      return res.status(400).json({
        error: 'Usuário ou email já cadastrado'
      });
    }

    // Insere novo usuário com tipo "comum"
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert([{
        username,
        email,
        aniversario,
        phone,
        password_plaintext, // Em produção: criptografar
        tipo: 'comum',
        organization_id: req.organizationId,
        created_at: new Date().toISOString()
      }])
      .select('id, username, email, aniversario, phone, created_at')
      .eq('organization_id', req.organizationId)
      .single();

    if (insertError) {
      throw insertError;
    }

    res.json({
      success: true,
      user: newUser
    });

  } catch (err) {
    console.error('Erro ao cadastrar usuário:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});



/**
 * @swagger
 * /api/login:
 *   post:
 *     summary: Autentica um usuário no sistema (versão desenvolvimento)
 *     description: |
 *       Esta rota é uma versão SIMPLIFICADA para desenvolvimento que compara a senha em texto puro.
 *       EM PRODUÇÃO, substitua por um sistema seguro com hash de senha e JWT.
 *     tags: [Autenticação]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 description: Nome de usuário cadastrado
 *                 example: "derick_campos"
 *               password:
 *                 type: string
 *                 description: Senha em texto puro (APENAS PARA DESENVOLVIMENTO)
 *                 example: "senhaSegura123"
 *     responses:
 *       200:
 *         description: Login realizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     username:
 *                       type: string
 *                     email:
 *                       type: string
 *                     tipo:
 *                       type: string
 *                       enum: [comum, admin]
 *         headers:
 *           Set-Cookie:
 *             schema:
 *               type: string
 *             description: Cookie HTTP-only contendo os dados do usuário autenticado
 *       401:
 *         description: Credenciais inválidas
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Credenciais inválidas"
 *       500:
 *         description: Erro interno do servidor
 */
app.post('/api/login', extractOrganizationId, async (req, res) => {
  const { login, password } = req.body;

  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, username, email, aniversario, password_plaintext, phone, tipo')
      .eq('organization_id', req.organizationId)
      .or(`username.eq.${login},email.eq.${login}`)
      .single();

    if (error || !user || user.password_plaintext !== password) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    // Se a autenticação for bem-sucedida, define o cookie com os dados do usuário
    const userData = {
      id: user.id,
      username: user.username,
      aniversario: user.aniversario,
      email: user.email,
      phone: user.phone,
      tipo: user.tipo
    };

    res.cookie('userData', JSON.stringify(userData), {
      httpOnly: true,   // Evita que o cookie seja acessado via JavaScript
      secure: false,    // Coloque true se estiver usando HTTPS em produção
      maxAge: 60 * 60 * 1000, // Expira após 1 hora
    });

    res.json({
      success: true,
      user: userData
    });

  } catch (err) {
    console.error('Erro ao fazer login:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * @swagger
 * /api/verifica-usuario:
 *   post:
 *     summary: Verifica se um nome de usuário já está cadastrado
 *     description: |
 *       Endpoint utilizado para verificar a disponibilidade de um username durante o cadastro,
 *       evitando duplicidades no sistema.
 *     tags: [Autenticação]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *             properties:
 *               username:
 *                 type: string
 *                 description: Nome de usuário a ser verificado
 *                 example: "derick_campos"
 *     responses:
 *       200:
 *         description: Resposta da verificação
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 exists:
 *                   type: boolean
 *                   description: Indica se o usuário já está cadastrado
 *                   example: true
 *       500:
 *         description: Erro interno do servidor
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 exists:
 *                   type: boolean
 *                   description: Sempre retorna false em caso de erro
 *                   example: false
 *                 error:
 *                   type: string
 *                   description: Mensagem de erro (apenas em modo de desenvolvimento)
 *                   example: "Erro ao acessar o banco de dados"
 */
app.post('/api/verifica-usuario', extractOrganizationId, async (req, res) => {
  const { username } = req.body;

  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id')
      .eq('username', username)
      .eq('organization_id', req.organizationId)
      .single();

    if (error || !user) {
      return res.json({ exists: false });
    }

    res.json({ exists: true });
  } catch (err) {
    console.error('Erro ao verificar usuário:', err);
    res.status(500).json({ exists: false });
  }
});

//------------------------------------------------------------------------------------------------------------------------------------------

/**
 * @swagger
 * tags:
 *   - name: Agendamento
 *     description: Endpoints para o processo de agendamento online
 */

/**
 * @swagger
 * /api/categories:
 *   get:
 *     summary: Lista todas as categorias de serviços disponíveis para uma organização
 *     description: Retorna todas as categorias cadastradas no sistema para a organização especificada com suas imagens convertidas para formato base64
 *     tags: [Agendamento]
 *     parameters:
 *       - in: header
 *         name: organization-id
 *         schema:
 *           type: string
 *         required: true
 *         description: ID da organização
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *       - in: query
 *         name: organization_id
 *         schema:
 *           type: string
 *         required: false
 *         description: ID da organização (alternativa ao header)
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *     responses:
 *       200:
 *         description: Lista de categorias retornada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                     example: 1
 *                   name:
 *                     type: string
 *                     example: "Cabelo"
 *                   imagem_category:
 *                     type: string
 *                     description: Imagem em formato data URL (base64) ou null
 *                     example: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ..."
 *                   organization_id:
 *                     type: string
 *                     description: ID da organização à qual a categoria pertence
 *                     example: "123e4567-e89b-12d3-a456-426614174000"
 *       400:
 *         description: ID da organização não fornecido
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Organization ID é obrigatório"
 *       500:
 *         description: Erro interno do servidor
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Internal server error"
 */

app.get('/api/categories', extractOrganizationId, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('id, name, imagem_category')
      .eq('organization_id', req.organizationId)
      .not('name', 'eq', 'Interno')
      .order('name', { ascending: true });

    if (error) throw error;
    
    // Converter imagens base64 para URLs de dados
    const categoriesWithImages = data.map(category => {
      return {
        ...category,
        imagem_category: category.imagem_category 
          ? category.imagem_category
          : null
      };
    });
    
    res.json(categoriesWithImages);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


/**
 * @swagger
 * /api/services/{categoryId}:
 *   get:
 *     summary: Lista serviços de uma categoria específica
 *     description: Retorna todos os serviços disponíveis para uma categoria, com imagens convertidas para base64
 *     tags: [Agendamento]
 *     parameters:
 *       - in: path
 *         name: categoryId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID da categoria
 *         example: 2
 *     responses:
 *       200:
 *         description: Lista de serviços retornada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                     example: 5
 *                   name:
 *                     type: string
 *                     example: "Corte masculino"
 *                   price:
 *                     type: number
 *                     format: float
 *                     example: 45.90
 *                   duration:
 *                     type: integer
 *                     description: Duração em minutos
 *                     example: 30
 *                   imagem_service:
 *                     type: string
 *                     description: Imagem em formato data URL (base64) ou null
 *                     example: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ..."
 *       500:
 *         description: Erro interno do servidor
 */

app.get('/api/services/:categoryId', extractOrganizationId, async (req, res) => {
  try {
    const { categoryId } = req.params;
    const { data, error } = await supabase
      .from('services')
      .select('id, name, price, duration, imagem_service')
      .eq('category_id', categoryId)
      .eq('organization_id', req.organizationId)
      .order('name', { ascending: true });

    if (error) throw error;
    
    // Converter imagens base64 para URLs de dados
    const servicesWithImages = data.map(service => {
      return {
        ...service,
        imagem_service: service.imagem_service 
          ? service.imagem_service
          : null
      };
    });
    
    res.json(servicesWithImages);
  } catch (error) {
    console.error('Error fetching services:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


/**
 * @swagger
 * /api/employees/{serviceId}:
 *   get:
 *     summary: Lista funcionários disponíveis para um serviço
 *     description: Retorna os profissionais qualificados para realizar um serviço específico, com imagens de perfil em base64
 *     tags: [Agendamento]
 *     parameters:
 *       - in: path
 *         name: serviceId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do serviço
 *         example: 3
 *     responses:
 *       200:
 *         description: Lista de funcionários retornada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                     example: 3
 *                   name:
 *                     type: string
 *                     example: "João Silva"
 *                   imagem_funcionario:
 *                     type: string
 *                     description: Imagem em formato data URL (base64) ou null
 *                     example: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ..."
 *                   is_active:
 *                     type: boolean
 *                     description: Indica se o funcionário está ativo
 *                     example: true
 *       500:
 *         description: Erro interno do servidor
 */
app.get('/api/employees/:serviceId', extractOrganizationId, async (req, res) => {
  try {
    const { serviceId } = req.params;
    const { data, error } = await supabase
      .from('employee_services')
      .select(`
        employees(
          id,
          name,
          imagem_funcionario,
          is_active
        )
      `)
      .eq('service_id', serviceId)
      .eq('organization_id', req.organizationId);

    if (error) throw error;
    
    // Converter imagens base64 para URLs de dados
    const employees = data.map(item => ({
      ...item.employees,
      imagem_funcionario: item.employees.imagem_funcionario 
        ? `data:image/jpeg;base64,${item.employees.imagem_funcionario}`
        : null
    }));
    
    res.json(employees);
  } catch (error) {
    console.error('Error fetching employees:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


/**
 * @swagger
 * /api/available-times:
 *   get:
 *     summary: Consulta horários disponíveis para agendamento
 *     description: |
 *       Retorna os horários disponíveis para agendamento considerando:
 *       - O horário de trabalho do funcionário
 *       - Os compromissos já marcados
 *       - A duração do serviço selecionado
 *     tags: [Agendamento]
 *     parameters:
 *       - in: query
 *         name: employeeId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do funcionário
 *         example: 3
 *       - in: query
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Data para consulta (formato YYYY-MM-DD)
 *         example: "2023-12-25"
 *       - in: query
 *         name: duration
 *         required: true
 *         schema:
 *           type: integer
 *         description: Duração do serviço em minutos
 *         example: 30
 *     responses:
 *       200:
 *         description: Lista de horários disponíveis
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   start:
 *                     type: string
 *                     format: time
 *                     description: Hora de início (HH:MM)
 *                     example: "14:30"
 *                   end:
 *                     type: string
 *                     format: time
 *                     description: Hora de término (HH:MM)
 *                     example: "15:00"
 *       400:
 *         description: Parâmetros inválidos ou faltando
 *       500:
 *         description: Erro interno do servidor
 */

app.get('/api/available-times', extractOrganizationId, async (req, res) => {
  try {
    const { employeeId, date, duration } = req.query;
    const organizationId = req.organizationId;
    console.log('Parâmetros recebidos:', { employeeId, date, duration, organizationId });
    
    const dateObj = new Date(date);
    const dayOfWeek = dateObj.getDay(); // 0=Domingo, 1=Segunda, 2=Terça, ..., 6=Sábado
    console.log('Dia da semana calculado:', dayOfWeek);

    const { data: schedule, error: scheduleError } = await supabase
      .from('work_schedules')
      .select('*')
      .eq('employee_id', employeeId)
      .eq('day_of_week', dayOfWeek)
      .eq('organization_id', req.organizationId)
      .single();

    if (scheduleError || !schedule || !schedule.is_available) {
      return res.json([]);
    }

    const { data: appointments, error: appointmentsError } = await supabase
      .from('appointments')
      .select('*')
      .eq('employee_id', employeeId)
      .eq('appointment_date', date)
      .eq('organization_id', req.organizationId)
      .order('start_time', { ascending: true });

    if (appointmentsError) throw appointmentsError;

    const workStart = new Date(`${date}T${schedule.start_time}`);
    const workEnd = new Date(`${date}T${schedule.end_time}`);
    const interval = 15 * 60 * 1000;
    const durationMs = duration * 60 * 1000;
    
    let currentSlot = new Date(workStart);
    const availableSlots = [];

    while (currentSlot.getTime() + durationMs <= workEnd.getTime()) {
      const slotStart = new Date(currentSlot);
      const slotEnd = new Date(slotStart.getTime() + durationMs);
      
      const isAvailable = !appointments.some(appointment => {
        const apptStart = new Date(`${date}T${appointment.start_time}`);
        const apptEnd = new Date(`${date}T${appointment.end_time}`);
        
        return (
          (slotStart >= apptStart && slotStart < apptEnd) ||
          (slotEnd > apptStart && slotEnd <= apptEnd) ||
          (slotStart <= apptStart && slotEnd >= apptEnd)
        );
      });
      
      if (isAvailable) {
        availableSlots.push({
          start: slotStart.toTimeString().substring(0, 5),
          end: slotEnd.toTimeString().substring(0, 5)
        });
      }
      
      currentSlot = new Date(currentSlot.getTime() + interval);
    }

    res.json(availableSlots);
  } catch (error) {
    console.error('Error fetching available times:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

//---------------------------------------------------------------------------------------------------------------------------------------------------------------------------

/**
 * @swagger
 * tags:
 *   - name: Agendamentos
 *     description: Endpoints para gestão de agendamentos
 */

/**
 * @swagger
 * /api/appointments:
 *   post:
 *     summary: Cria um novo agendamento
 *     tags: [Agendamentos]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - client_name
 *               - client_email
 *               - client_phone
 *               - service_id
 *               - employee_id
 *               - date
 *               - start_time
 *               - end_time
 *             properties:
 *               client_name:
 *                 type: string
 *                 example: "João Silva"
 *               client_email:
 *                 type: string
 *                 format: email
 *                 example: "joao@exemplo.com"
 *               client_phone:
 *                 type: string
 *                 example: "11999998888"
 *               service_id:
 *                 type: integer
 *                 example: 1
 *               employee_id:
 *                 type: integer
 *                 example: 2
 *               date:
 *                 type: string
 *                 format: date
 *                 example: "2023-12-25"
 *               start_time:
 *                 type: string
 *                 format: time
 *                 example: "14:30"
 *               end_time:
 *                 type: string
 *                 format: time
 *                 example: "15:00"
 *               final_price:
 *                 type: number
 *                 example: 80.50
 *               coupon_code:
 *                 type: string
 *                 example: "DESCONTO10"
 *               original_price:
 *                 type: number
 *                 example: 90.00
 *     responses:
 *       201:
 *         description: Agendamento criado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Appointment'
 *       500:
 *         description: Erro interno do servidor
 */


app.post('/api/appointments', extractOrganizationId, async (req, res) => {
  try {
    const { client_name, client_email, client_phone, service_id, employee_id, date, start_time, end_time , final_price , coupon_code , original_price } = req.body;
    
    const { data, error } = await supabase
      .from('appointments')
      .insert([{
        organization_id: req.organizationId,
        client_name,
        client_email,
        client_phone,
        service_id,
        employee_id,
        appointment_date: date,
        start_time,
        end_time,
        final_price,
        coupon_code,
        original_price, 
        status: 'confirmed'
      }])
      .select();

    if (error) throw error;
    res.status(201).json(data[0]);
  } catch (error) {
    console.error('Error creating appointment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/logado/appointments:
 *   get:
 *     summary: Lista agendamentos de um cliente (por e-mail)
 *     tags: [Agendamentos]
 *     parameters:
 *       - in: query
 *         name: email
 *         required: true
 *         schema:
 *           type: string
 *           format: email
 *         description: E-mail do cliente
 *     responses:
 *       200:
 *         description: Lista de agendamentos formatada
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   date:
 *                     type: string
 *                     format: date
 *                   start_time:
 *                     type: string
 *                   end_time:
 *                     type: string
 *                   status:
 *                     type: string
 *                     enum: [confirmed, completed, canceled]
 *                   service_name:
 *                     type: string
 *                   service_price:
 *                     type: number
 *                   professional_name:
 *                     type: string
 *       500:
 *         description: Erro interno do servidor
 */
// Rota para obter agendamentos por email (área do cliente)
app.get('/api/logado/appointments', async (req, res) => {
  try {
    const { email } = req.query;
    
    if (!email) {
      return res.status(400).json({ error: 'Email é obrigatório' });
    }

    // Busca os agendamentos do cliente
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        id,
        client_name,
        client_email,
        client_phone,
        appointment_date,
        start_time,
        end_time,
        status,
        created_at,
        services(name, price),
        employees(name)
      `)
      .eq('client_email', email)
      .order('appointment_date', { ascending: true })
      .order('start_time', { ascending: true });

    if (error) throw error;

    // Formata os dados para resposta (ajustando para o formato esperado pelo frontend)
    const formattedData = data.map(item => ({
      id: item.id,
      date: item.appointment_date, // Mantém o nome do campo que seu frontend espera
      start_time: item.start_time,
      end_time: item.end_time,
      status: item.status,
      service_name: item.services?.name || 'Serviço não especificado',
      price: item.services?.price || 0,
      professional_name: item.employees?.name || 'Profissional não especificado',
      client_name: item.client_name,
      client_email: item.client_email,
      client_phone: item.client_phone
    }));

    res.json(formattedData);
  } catch (error) {
    console.error('Error fetching client appointments:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/admin/appointments/by-employee:
 *   get:
 *     summary: Contagem de agendamentos por funcionário (dashboard admin)
 *     tags: [Agendamentos]
 *     responses:
 *       200:
 *         description: Lista ordenada por quantidade de agendamentos
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   employee_id:
 *                     type: integer
 *                   employee_name:
 *                     type: string
 *                   count:
 *                     type: integer
 *                     description: Número de agendamentos confirmados
 *       500:
 *         description: Erro interno do servidor
 */
// Rota para obter agendamentos por funcionário
app.get('/api/admin/appointments/by-employee', async (req, res) => {
  try {
    // Primeiro, buscamos todos os funcionários
    const { data: employees, error: employeesError } = await supabase
      .from('employees')
      .select('id, name')
      .order('name', { ascending: true });

    if (employeesError) throw employeesError;

    // Depois, para cada funcionário, contamos os agendamentos confirmados
    const appointmentsByEmployee = await Promise.all(
      employees.map(async (employee) => {
        const { count, error: countError } = await supabase
          .from('appointments')
          .select('*', { count: 'exact', head: true })
          .eq('employee_id', employee.id)
          .eq('status', 'confirmed');

        if (countError) throw countError;

        return {
          employee_id: employee.id,
          employee_name: employee.name,
          count: count || 0
        };
      })
    );

    // Ordenar por quantidade de agendamentos (decrescente)
    const sortedData = appointmentsByEmployee.sort((a, b) => b.count - a.count);

    res.json(sortedData);
  } catch (error) {
    console.error('Error fetching appointments by employee:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
});

// Rota para obter agendamentos por employee_id
app.get('/api/appointments/by-employee/:employeeId', async (req, res) => {
  try {
    const { employeeId } = req.params;
    
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        services:service_id (name),
        employees:employee_id (name)
      `)
      .eq('employee_id', employeeId)
      .order('appointment_date', { ascending: true })
      .order('start_time', { ascending: true });

    if (error) throw error;
    
    res.json(data || []);
  } catch (error) {
    console.error('Error fetching appointments:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/admin/appointments:
 *   get:
 *     summary: Lista completa de agendamentos com filtros (admin)
 *     tags: [Agendamentos]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Busca por nome, e-mail ou telefone do cliente
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           pattern: '^\d{2}-\d{2}-\d{4}$'
 *         description: Data no formato DD-MM-YYYY
 *       - in: query
 *         name: employee
 *         schema:
 *           type: string
 *         description: Nome do profissional
 *     responses:
 *       200:
 *         description: Lista filtrada de agendamentos
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/AppointmentWithDetails'
 *       500:
 *         description: Erro interno do servidor
 */
// Rotas para agendamentos (admin)
app.get('/api/admin/appointments', async (req, res) => {
  try {
    const { search, date, employee, start_date, end_date } = req.query;
    let query = supabase
      .from('appointments')
      .select(`
        *,
        services:service_id (name, price),
        employees:employee_id (name)
      `)
      .eq('organization_id', req.organizationId)
      .order('appointment_date', { ascending: true })
      .order('start_time', { ascending: true });

    if (search) {
      query = query.or(`client_name.ilike.%${search}%,client_email.ilike.%${search}%,client_phone.ilike.%${search}%`);
    }

    if (date) {
      // Converte DD-MM-YYYY para YYYY-MM-DD (formato do Supabase)
      query = query.eq('appointment_date', date);
    } else if (start_date && end_date) {
      // Converte DD-MM-YYYY para YYYY-MM-DD
      const [startDay, startMonth, startYear] = start_date.split('-');
      const [endDay, endMonth, endYear] = end_date.split('-');
      
      const dbStartDate = `${startYear}-${startMonth}-${startDay}`;
      const dbEndDate = `${endYear}-${endMonth}-${endDay}`;
      
      query = query.gte('appointment_date', dbStartDate).lte('appointment_date', dbEndDate);
    }

    if (employee) {
      query = query.ilike('employees.name', `%${employee}%`);
    }

    const { data, error } = await query;

    if (error) throw error;
    
    let filteredData = data;
    if (employee) {
      filteredData = data.filter(appt => 
        appt.employees?.name?.toLowerCase().includes(employee.toLowerCase())
      );
    }

    res.json(filteredData);
  } catch (error) {
    console.error('Error fetching appointments:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/admin/appointments/{id}:
 *   get:
 *     summary: Detalhes de um agendamento específico
 *     tags: [Agendamentos]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Detalhes completos do agendamento
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 client_name:
 *                   type: string
 *                 service:
 *                   type: string
 *                 professional:
 *                   type: string
 *                 date:
 *                   type: string
 *                   format: date
 *                 start_time:
 *                   type: string
 *                 end_time:
 *                   type: string
 *                 status:
 *                   type: string
 *                 price:
 *                   type: number
 *       404:
 *         description: Agendamento não encontrado
 *       500:
 *         description: Erro interno do servidor
 */
// Rota para obter detalhes de um agendamento específico
app.get('/api/admin/appointments/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        services(name, price),
        employees(name)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Agendamento não encontrado' });

    res.json({
      id: data.id,
      client_name: data.client_name,
      service: data.services?.name || 'N/A',
      professional: data.employees?.name || 'N/A',
      date: data.appointment_date, // Formato YYYY-MM-DD
      start_time: data.start_time, // Formato HH:MM:SS
      end_time: data.end_time,     // Formato HH:MM:SS
      status: data.status,
      price: data.services?.price || 0
    });
  } catch (error) {
    console.error('Error fetching appointment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/admin/appointments/{id}/complete:
 *   put:
 *     summary: Marca agendamento como concluído
 *     tags: [Agendamentos]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Agendamento atualizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Appointment'
 *       400:
 *         description: Agendamento já concluído ou cancelado
 *       404:
 *         description: Agendamento não encontrado
 *       500:
 *         description: Erro interno do servidor
 */
// Rota para marcar agendamento como concluído
app.put('/api/admin/appointments/:id/complete', extractOrganizationId, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar se o agendamento existe E pertence à organização correta
    const { data: appointmentData, error: fetchError } = await supabase
      .from('appointments')
      .select('status')
      .eq('id', id)
      .eq('organization_id', req.organizationId) // Filtro por organization_id
      .single();

    if (fetchError) throw fetchError;
    if (!appointmentData) return res.status(404).json({ error: 'Agendamento não encontrado' });

    // Verificar se o agendamento já está concluído ou cancelado
    if (appointmentData.status === 'completed') {
      return res.status(400).json({ error: 'Agendamento já está concluído' });
    }
    if (appointmentData.status === 'canceled') {
      return res.status(400).json({ error: 'Agendamento cancelado não pode ser concluído' });
    }

    // Ao atualizar, também garantimos que só atualizamos da organização correta
    const { data, error } = await supabase
      .from('appointments')
      .update({
        status: 'completed'
      })
      .eq('id', id)
      .eq('organization_id', req.organizationId) // Filtro por organization_id
      .select();

    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'Agendamento não encontrado' });
    }

    res.json(data[0]);
  } catch (error) {
    console.error('Error in API:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
});

async function updateYesterdayAppointmentsToCompleted() {
  try {
    // Obter a data de ontem no formato YYYY-MM-DD
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayFormatted = yesterday.toISOString().split('T')[0];

    // Buscar todos os agendamentos de ontem que não estão cancelados
    const { data: appointments, error: fetchError } = await supabase
      .from('appointments')
      .select('id, status')
      .eq('appointment_date', yesterdayFormatted)
      .neq('status', 'canceled');

    if (fetchError) throw fetchError;

    // Filtrar apenas os que estão "confirmed" ou outros status que devem ser completados
    const appointmentsToUpdate = appointments.filter(
      appt => appt.status === 'confirmed' // Adicione outros status se necessário
    );

    // Atualizar cada agendamento
    const updatePromises = appointmentsToUpdate.map(async (appt) => {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'completed' })
        .eq('id', appt.id);

      if (error) throw error;
      return appt.id;
    });

    const updatedIds = await Promise.all(updatePromises);

    return {
      success: true,
      message: `${updatedIds.length} agendamentos atualizados para "completed"`,
      updatedIds
    };
  } catch (error) {
    console.error('Error updating yesterday appointments:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Rota para executar manualmente a atualização
app.put('/api/admin/appointments/complete-yesterday', async (req, res) => {
  try {
    const result = await updateYesterdayAppointmentsToCompleted();
    
    if (!result.success) {
      return res.status(500).json({ 
        error: 'Failed to update appointments',
        details: result.error 
      });
    }

    res.json({
      message: result.message,
      updatedCount: result.updatedIds.length,
      updatedIds: result.updatedIds
    });
  } catch (error) {
    console.error('Error in complete-yesterday route:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
});

cron.schedule('0 3 * * *', async () => {
  console.log('Executando atualização diária de agendamentos...');
  const result = await updateYesterdayAppointmentsToCompleted();
  if (result.success) {
    console.log(result.message);
  } else {
    console.error('Erro na tarefa agendada:', result.error);
  }
});

// Significa:

// 0 → no minuto 0

// 3 → na hora 3 (ou seja, 03:00)

// * → todos os dias do mês

// * → todos os meses

// * → todos os dias da semana

// 👉 Ou seja: todo dia às 03:00 da manhã.

/**
 * @swagger
 * /api/admin/appointments/{id}/cancel:
 *   put:
 *     summary: Cancela um agendamento
 *     tags: [Agendamentos]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Agendamento cancelado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Appointment'
 *       400:
 *         description: Agendamento já concluído ou cancelado
 *       404:
 *         description: Agendamento não encontrado
 *       500:
 *         description: Erro interno do servidor
 */
// Rota para cancelar agendamento
app.put('/api/admin/appointments/:id/cancel', async (req, res) => {
  const { id } = req.params;
  const { cancel_reason } = req.body || null;

  try {
    // 1. Buscar agendamento pelo id
    const { data: appointment, error: fetchError } = await supabase
      .from('appointments')
      .select('*')
      .eq('id', id)
      .eq('organization_id', req.organizationId)
      .single();

    if (fetchError) throw fetchError;
    if (!appointment) return res.status(404).json({ error: 'Agendamento não encontrado' });

    // 2. Verificar se pode cancelar
    if (appointment.status === 'completed') {
      return res.status(400).json({ error: 'Agendamento concluído não pode ser cancelado' });
    }

    // (Não precisa verificar cancelado, pois vai remover da tabela)

    // 3. Inserir dados na tabela canceled_appointments
    const { data: canceledData, error: insertError } = await supabase
      .from('canceled_appointments')
      .insert([{
        original_appointment_id: appointment.id,
        client_name: appointment.client_name,
        client_email: appointment.client_email,
        client_phone: appointment.client_phone,
        service_id: appointment.service_id,
        employee_id: appointment.employee_id,
        appointment_date: appointment.appointment_date,
        start_time: appointment.start_time,
        end_time: appointment.end_time,
        status: 'canceled',
        notes: appointment.notes,
        created_at: appointment.created_at,
        updated_at: appointment.updated_at,
        final_price: appointment.final_price,
        original_price: appointment.original_price,
        coupon_code: appointment.coupon_code,
        cancel_reason: cancel_reason || null,
        canceled_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (insertError) throw insertError;

    // 4. Apagar o agendamento original da tabela appointments
    const { error: deleteError } = await supabase
      .from('appointments')
      .delete()
      .eq('id', id);

    if (deleteError) throw deleteError;

    // 5. Responder com os dados do cancelamento
    res.json(canceledData);

  } catch (error) {
    console.error('Error canceling appointment:', error);
    res.status(500).json({ 
      error: 'Erro interno no servidor',
      details: error.message
    });
  }
});


app.get('/api/admin/canceled_appointments', async (req, res) => {
  try {
    const { search, date, employee, start_date, end_date } = req.query;
    let query = supabase
      .from('canceled_appointments')
      .select(`
        *,
        services(name, price),
        employees(name)
      `)
      .order('appointment_date', { ascending: true })
      .order('start_time', { ascending: true });

    if (search) {
      query = query.or(`client_name.ilike.%${search}%,client_email.ilike.%${search}%,client_phone.ilike.%${search}%`);
    }

    if (date) {
      // Esperando data no formato YYYY-MM-DD
      query = query.eq('appointment_date', date);
    } else if (start_date && end_date) {
      query = query.gte('appointment_date', start_date).lte('appointment_date', end_date);
    }

    if (employee) {
      query = query.ilike('employees.name', `%${employee}%`);
    }

    const { data, error } = await query;

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error('Erro ao buscar agendamentos cancelados:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * components:
 *   schemas:
 *     Appointment:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         client_name:
 *           type: string
 *         client_email:
 *           type: string
 *         client_phone:
 *           type: string
 *         service_id:
 *           type: integer
 *         employee_id:
 *           type: integer
 *         appointment_date:
 *           type: string
 *           format: date
 *         start_time:
 *           type: string
 *         end_time:
 *           type: string
 *         status:
 *           type: string
 *           enum: [confirmed, completed, canceled]
 *         final_price:
 *           type: number
 *         coupon_code:
 *           type: string
 *         original_price:
 *           type: number
 * 
 *     AppointmentWithDetails:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         client_name:
 *           type: string
 *         client_email:
 *           type: string
 *         client_phone:
 *           type: string
 *         appointment_date:
 *           type: string
 *           format: date
 *         start_time:
 *           type: string
 *         end_time:
 *           type: string
 *         status:
 *           type: string
 *         services:
 *           type: object
 *           properties:
 *             name:
 *               type: string
 *             price:
 *               type: number
 *         employees:
 *           type: object
 *           properties:
 *             name:
 *               type: string
 */

//-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

/**
 * @swagger
 * tags:
 *   - name: Categorias
 *     description: Endpoints para gestão de categorias de serviços (admin)
 */

/**
 * @swagger
 * /api/admin/categories:
 *   get:
 *     summary: Lista todas as categorias
 *     tags: [Categorias]
 *     responses:
 *       200:
 *         description: Lista de categorias ordenadas por nome
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Category'
 *       500:
 *         description: Erro interno do servidor
 */
// Rotas para categorias
app.get('/api/admin/categories', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('id, name') // Adicione aqui apenas os campos que você quer retornar
      .eq('organization_id', req.organizationId)
      .order('name', { ascending: true });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


/**
 * @swagger
 * /api/admin/categories/{id}:
 *   get:
 *     summary: Obtém detalhes de uma categoria específica
 *     tags: [Categorias]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID da categoria
 *     responses:
 *       200:
 *         description: Dados completos da categoria
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Category'
 *       404:
 *         description: Categoria não encontrada
 *       500:
 *         description: Erro interno do servidor
 */
app.get('/api/admin/categories/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('id', id)
      .eq('organization_id', req.organizationId)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Categoria não encontrada' });
    
    res.json(data);
  } catch (error) {
    console.error('Error fetching category:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


/**
 * @swagger
 * /api/admin/categories:
 *   post:
 *     summary: Cria uma nova categoria
 *     tags: [Categorias]
 *     consumes:
 *       - multipart/form-data
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 description: Nome da categoria
 *                 example: "Cabelo"
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Imagem da categoria (opcional)
 *     responses:
 *       201:
 *         description: Categoria criada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Category'
 *       400:
 *         description: Dados inválidos
 *       500:
 *         description: Erro interno do servidor
 */

// Atualize a rota POST de categorias
app.post('/api/admin/categories', upload.single('image'), async (req, res) => {
  try {
    const { name } = req.body;
    let imagePath = null;

    if (req.file) {
      // processa a imagem
      const buffer = await sharp(req.file.buffer)
        .resize({ width: 600 }) // redimensiona
        .webp({ quality: 80 }) // converte para webp
        .toBuffer();

      // cria um nome único para a imagem
      const fileName = `${uuidv4()}.webp`;

      // faz upload para o Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('category-images')
        .upload(fileName, buffer, {
          contentType: 'image/webp',
          upsert: false, // evita sobrescrever
        });

      if (uploadError) throw uploadError;

      // gera a URL pública (se o bucket for público)
      const { data: publicUrl } = supabase.storage
        .from('category-images')
        .getPublicUrl(fileName);

      imagePath = publicUrl.publicUrl;
    }

    // salva no banco só o caminho/URL
    const { data, error } = await supabase
      .from('categories')
      .insert([{ 
        name, 
        imagem_category: imagePath 
      }])
      .select();

    if (error) throw error;
    res.status(201).json(data[0]);
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/admin/categories/{id}:
 *   put:
 *     summary: Atualiza uma categoria existente
 *     tags: [Categorias]
 *     consumes:
 *       - multipart/form-data
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID da categoria
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Novo nome da categoria
 *                 example: "Cabelo e Barba"
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Nova imagem da categoria (opcional)
 *     responses:
 *       200:
 *         description: Categoria atualizada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Category'
 *       404:
 *         description: Categoria não encontrada
 *       500:
 *         description: Erro interno do servidor
 */
// Atualize a rota PUT de categorias
app.put('/api/admin/categories/:id', upload.single('image'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    let imageUrl = null;

    // Se enviou nova imagem → salva no Storage
    if (req.file) {
      const buffer = await sharp(req.file.buffer)
        .resize({ width: 600 }) // redimensiona
        .webp({ quality: 80 }) // converte para webp
        .toBuffer();

      // Gera nome único
      const fileName = `${uuidv4()}.webp`;

      // Upload no bucket
      const { error: uploadError } = await supabase.storage
        .from('category-images')
        .upload(fileName, buffer, {
          contentType: 'image/webp',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // URL pública
      const { data: publicUrl } = supabase.storage
        .from('category-images')
        .getPublicUrl(fileName);

      imageUrl = publicUrl.publicUrl;
    }

    // Atualiza no banco
    const updateData = { 
      name,
      ...(imageUrl && { imagem_category: imageUrl }) // só troca se veio imagem
    };

    const { data, error } = await supabase
      .from('categories')
      .update(updateData)
      .eq('id', id)
      .select();

    if (error) throw error;
    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'Categoria não encontrada' });
    }

    res.json(data[0]);
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});


/**
 * @swagger
 * /api/admin/categories/{id}:
 *   delete:
 *     summary: Remove uma categoria
 *     tags: [Categorias]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID da categoria
 *     responses:
 *       204:
 *         description: Categoria removida com sucesso
 *       404:
 *         description: Categoria não encontrada
 *       500:
 *         description: Erro interno do servidor
 */

app.delete('/api/admin/categories/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


/**
 * @swagger
 * components:
 *   schemas:
 *     Category:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         name:
 *           type: string
 *           example: "Cabelo"
 *         imagem_category:
 *           type: string
 *           description: Imagem em formato base64 (pode ser null)
 *           example: "iVBORw0KGgoAAAANSUhEUgAA..."
 *         created_at:
 *           type: string
 *           format: date-time
 *           example: "2023-01-01T00:00:00Z"
 *         updated_at:
 *           type: string
 *           format: date-time
 *           example: "2023-01-02T00:00:00Z"
 */

//----------------------------------------------------------------------------------------------------------------------------------------------------------------------------

/**
 * @swagger
 * tags:
 *   - name: Serviços
 *     description: Endpoints para gestão de serviços
 */

/**
 * @swagger
 * /api/services:
 *   get:
 *     summary: Lista todos os serviços disponíveis
 *     description: Retorna todos os serviços cadastrados no sistema, ordenados por nome
 *     tags: [Serviços]
 *     responses:
 *       200:
 *         description: Lista de serviços retornada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Service'
 *       500:
 *         description: Erro interno do servidor
 */
app.get('/api/services', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('services')
      .select('id, name, category_id, duration, price, imagem_service')
      .eq('organization_id', req.organizationId)
      .order('name', { ascending: true });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error fetching services:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/admin/services:
 *   get:
 *     summary: Lista completa de serviços (admin)
 *     description: Retorna todos os serviços com informações da categoria associada
 *     tags: [Serviços]
 *     responses:
 *       200:
 *         description: Lista de serviços com detalhes da categoria
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ServiceWithCategory'
 *       500:
 *         description: Erro interno do servidor
 */

// Rotas para serviços
app.get('/api/admin/services', async (req, res) => {
  try {
    const { name } = req.query;

    let query = supabase
      .from('services')
      .select('id, name, category_id, duration, price, categories(name)')
      .eq('organization_id', req.organizationId)
      .order('name', { ascending: true });

    // Se o parâmetro `name` for fornecido, aplica o filtro
    if (name) {
      query = query.ilike('name', `%${name}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Erro ao buscar dados do Supabase:', error);
      throw error;
    }

    res.json(data);
  } catch (error) {
    console.error('Erro no servidor ao buscar serviços:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


/**
 * @swagger
 * /api/admin/services:
 *   post:
 *     summary: Cria um novo serviço
 *     tags: [Serviços]
 *     consumes:
 *       - multipart/form-data
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - category_id
 *               - name
 *               - duration
 *               - price
 *             properties:
 *               category_id:
 *                 type: integer
 *                 description: ID da categoria associada
 *                 example: 1
 *               name:
 *                 type: string
 *                 description: Nome do serviço
 *                 example: "Corte de Cabelo"
 *               description:
 *                 type: string
 *                 description: Descrição detalhada do serviço
 *                 example: "Corte profissional com técnicas modernas"
 *               duration:
 *                 type: integer
 *                 description: Duração em minutos
 *                 example: 30
 *               price:
 *                 type: number
 *                 format: float
 *                 description: Preço do serviço
 *                 example: 50.00
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Imagem ilustrativa do serviço (opcional)
 *     responses:
 *       201:
 *         description: Serviço criado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Service'
 *       400:
 *         description: Dados inválidos ou faltando
 *       500:
 *         description: Erro interno do servidor
 */
// Rota POST de serviços
app.post('/api/admin/services', upload.single('image'), async (req, res) => {
  try {
    const { category_id, name, description, duration, price } = req.body;
    let imageUrl = null;

    if (req.file) {
      const buffer = await sharp(req.file.buffer)
        .resize({ width: 600 })
        .webp({ quality: 80 })
        .toBuffer();

      // nome único do arquivo
      const fileName = `service-${Date.now()}.webp`;

      // upload para o bucket "services-image"
      const { error: uploadError } = await supabase.storage
        .from('services-images')
        .upload(fileName, buffer, {
          contentType: 'image/webp',
          upsert: false, // evita sobrescrever
        });

      if (uploadError) throw uploadError;

      // gera a URL pública
      const { data: publicUrl } = supabase.storage
        .from('services-images')
        .getPublicUrl(fileName);

      imageUrl = publicUrl.publicUrl;
    }

    const { data, error } = await supabase
      .from('services')
      .insert([{ 
        category_id, 
        name, 
        description, 
        duration, 
        price,
        imagem_service: imageUrl // agora salva só a URL pública
      }])
      .select();

    if (error) throw error;
    res.status(201).json(data[0]);
  } catch (error) {
    console.error('Error creating service:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});


/**
 * @swagger
 * /api/admin/services/{id}:
 *   get:
 *     summary: Obtém detalhes de um serviço específico
 *     tags: [Serviços]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do serviço
 *     responses:
 *       200:
 *         description: Detalhes completos do serviço
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ServiceWithCategory'
 *       404:
 *         description: Serviço não encontrado
 *       500:
 *         description: Erro interno do servidor
 */
app.get('/api/admin/services/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('services')
      .select('*, categories(name)')
      .eq('id', id)
      .eq('organization_id', req.organizationId)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Serviço não encontrado' });
    
    res.json(data);
  } catch (error) {
    console.error('Error fetching service:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/admin/services/{id}:
 *   put:
 *     summary: Atualiza um serviço existente
 *     tags: [Serviços]
 *     consumes:
 *       - multipart/form-data
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do serviço
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               category_id:
 *                 type: integer
 *                 example: 2
 *               name:
 *                 type: string
 *                 example: "Corte Premium"
 *               description:
 *                 type: string
 *                 example: "Corte com técnicas avançadas"
 *               duration:
 *                 type: integer
 *                 example: 45
 *               price:
 *                 type: number
 *                 example: 75.00
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Nova imagem do serviço (opcional)
 *     responses:
 *       200:
 *         description: Serviço atualizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Service'
 *       404:
 *         description: Serviço não encontrado
 *       500:
 *         description: Erro interno do servidor
 */
// Rota PUT de serviços
app.put('/api/admin/services/:id', upload.single('image'), async (req, res) => {
  try {
    const { id } = req.params;
    const { category_id, name, description, duration, price } = req.body;
    let imageData = null;

    // Se enviou nova imagem, converte para base64
    if (req.file) {
    const buffer = await sharp(req.file.buffer)
      .resize({ width: 600 }) // opcional: redimensiona para largura máxima de 600px
      .webp({ quality: 80 }) // converte para webp com qualidade razoável
      .toBuffer();

      imageData = buffer.toString('base64'); // se ainda quiser salvar como base64
    }

    const updateData = { 
      category_id,
      name,
      description,
      duration,
      price,
      ...(imageData && { imagem_service: imageData })
    };

    const { data, error } = await supabase
      .from('services')
      .update(updateData)
      .eq('id', id)
      .select();

    if (error) throw error;
    res.json(data[0]);
  } catch (error) {
    console.error('Error updating service:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/admin/services/{id}:
 *   delete:
 *     summary: Remove um serviço
 *     tags: [Serviços]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do serviço
 *     responses:
 *       204:
 *         description: Serviço removido com sucesso
 *       404:
 *         description: Serviço não encontrado
 *       500:
 *         description: Erro interno do servidor
 */

app.delete('/api/admin/services/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase
      .from('services')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting service:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * components:
 *   schemas:
 *     Service:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         category_id:
 *           type: integer
 *           example: 2
 *         name:
 *           type: string
 *           example: "Corte de Cabelo"
 *         description:
 *           type: string
 *           example: "Corte profissional"
 *         duration:
 *           type: integer
 *           description: Duração em minutos
 *           example: 30
 *         price:
 *           type: number
 *           format: float
 *           example: 50.00
 *         imagem_service:
 *           type: string
 *           description: Imagem em base64 ou null
 *           example: "iVBORw0KGgoAAAANSUhEUgAA..."
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 * 
 *     ServiceWithCategory:
 *       allOf:
 *         - $ref: '#/components/schemas/Service'
 *         - type: object
 *           properties:
 *             categories:
 *               type: object
 *               properties:
 *                 name:
 *                   type: string
 *                   example: "Cabelo"
 */
//---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

/**
 * @swagger
 * tags:
 *   - name: Funcionários
 *     description: Endpoints para gestão de funcionários/profissionais
 */

/**
 * @swagger
 * /api/admin/employees:
 *   get:
 *     summary: Lista todos os funcionários com detalhes
 *     description: Retorna todos os funcionários cadastrados com seus serviços associados e horários de trabalho
 *     tags: [Funcionários]
 *     responses:
 *       200:
 *         description: Lista completa de funcionários com detalhes
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/EmployeeWithDetails'
 *       500:
 *         description: Erro interno do servidor
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                 details:
 *                   type: string
 */
app.get('/api/admin/employees', async (req, res) => {
  try {
    // Buscar funcionários
    const { data: employees, error: employeesError } = await supabase
      .from('employees')
      .select('name, email, phone, comissao, is_active, id')
      .eq('organization_id', req.organizationId)
      .order('created_at', { ascending: false });

    if (employeesError) throw employeesError;

    // Buscar serviços e horários para cada funcionário
    const employeesWithDetails = await Promise.all(
      employees.map(async employee => {
        // Buscar serviços
        const { data: services, error: servicesError } = await supabase
          .from('employee_services')
          .select('services(name)')
          .eq('employee_id', employee.id);

        if (servicesError) throw servicesError;

        // Buscar horários
        const { data: schedules, error: schedulesError } = await supabase
          .from('work_schedules')
          .select('*')
          .eq('employee_id', employee.id);

        if (schedulesError) throw schedulesError;

        return { 
          ...employee, 
          services: services?.map(item => item.services) || [],
          work_schedules: schedules || [] 
        };
      })
    );

    res.json(employeesWithDetails);
  } catch (error) {
    console.error('Error fetching employees:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
});


/**
 * @swagger
 * /api/admin/employees/{id}:
 *   get:
 *     summary: Obtém detalhes de um funcionário específico
 *     description: Retorna os dados completos de um funcionário, convertendo a imagem para data URL se existir
 *     tags: [Funcionários]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do funcionário
 *     responses:
 *       200:
 *         description: Dados do funcionário
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Employee'
 *       404:
 *         description: Funcionário não encontrado
 *       500:
 *         description: Erro interno do servidor
 */
app.get('/api/admin/employees/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('id', id)
      .eq('organization_id', req.organizationId)
      .single();

    if (error) throw error;

    // Converter imagem base64 para URL de dados se existir
    const employeeWithImage = data.imagem_funcionario 
      ? {
          ...data,
          imagem_funcionario: `data:image/jpeg;base64,${data.imagem_funcionario}`
        }
      : data;

    res.json(employeeWithImage);
  } catch (error) {
    console.error('Error fetching employee:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


/**
 * @swagger
 * /api/admin/employees:
 *   post:
 *     summary: Cadastra um novo funcionário
 *     tags: [Funcionários]
 *     consumes:
 *       - multipart/form-data
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - phone
 *             properties:
 *               name:
 *                 type: string
 *                 example: "João Silva"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "joao@exemplo.com"
 *               phone:
 *                 type: string
 *                 example: "11999998888"
 *               comissao:
 *                 type: number
 *                 format: float
 *                 description: Percentual de comissão
 *                 example: 10.5
 *               is_active:
 *                 type: boolean
 *                 description: Status do funcionário
 *                 example: true
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Foto do funcionário (opcional)
 *     responses:
 *       201:
 *         description: Funcionário criado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Employee'
 *       400:
 *         description: Dados inválidos ou faltando
 *       500:
 *         description: Erro interno do servidor
 */
// Rota POST para funcionários
app.post('/api/admin/employees', upload.single('image'), async (req, res) => {
  try {
    // Extrair dados do corpo da requisição
    const { name, email, phone, comissao, is_active } = req.body;
    let imageData = null;

    // Se houver arquivo, converte para base64
    if (req.file) {
      const buffer = await sharp(req.file.buffer)
        .resize({ width: 600 }) // opcional: redimensiona para largura máxima de 600px
        .webp({ quality: 80 }) // converte para webp com qualidade razoável
        .toBuffer();

        imageData = buffer.toString('base64'); // se ainda quiser salvar como base64
    }

    const { data, error } = await supabase
      .from('employees')
      .insert([{ 
        name, 
        email, 
        phone,
        comissao, 
        imagem_funcionario: imageData,
        is_active: is_active === 'true' || is_active === true
      }])
      .select();

    if (error) throw error;
    res.status(201).json(data[0]);
  } catch (error) {
    console.error('Error creating employee:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/admin/employees/{id}:
 *   put:
 *     summary: Atualiza um funcionário existente
 *     tags: [Funcionários]
 *     consumes:
 *       - multipart/form-data
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do funcionário
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               phone:
 *                 type: string
 *               comissao:
 *                 type: number
 *                 format: float
 *               is_active:
 *                 type: boolean
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Nova foto do funcionário (opcional)
 *     responses:
 *       200:
 *         description: Funcionário atualizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Employee'
 *       404:
 *         description: Funcionário não encontrado
 *       500:
 *         description: Erro interno do servidor
 */
// Rota PUT para funcionários
app.put('/api/admin/employees/:id', upload.single('image'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, comissao, is_active } = req.body;
    let imageData = null;

    // Se enviou nova imagem, converte para base64
    if (req.file) {
      const buffer = await sharp(req.file.buffer)
        .resize({ width: 600 }) // opcional: redimensiona para largura máxima de 600px
        .webp({ quality: 80 }) // converte para webp com qualidade razoável
        .toBuffer();

        imageData = buffer.toString('base64'); // se ainda quiser salvar como base64
    }

    const updateData = { 
      name, 
      email, 
      phone, 
      comissao,
      is_active: is_active === 'true' || is_active === true,
      ...(imageData && { imagem_funcionario: imageData })
    };

    const { data, error } = await supabase
      .from('employees')
      .update(updateData)
      .eq('id', id)
      .select();

    if (error) throw error;
    res.json(data[0]);
  } catch (error) {
    console.error('Error updating employee:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/admin/employees/{id}:
 *   delete:
 *     summary: Remove um funcionário e seus horários associados
 *     tags: [Funcionários]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do funcionário
 *     responses:
 *       204:
 *         description: Funcionário e horários removidos com sucesso
 *       404:
 *         description: Funcionário não encontrado
 *       500:
 *         description: Erro interno do servidor
 */
app.delete('/api/admin/employees/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Primeiro deletar os horários associados
    const { error: scheduleError } = await supabase
      .from('work_schedules')
      .delete()
      .eq('employee_id', id);

    if (scheduleError) throw scheduleError;

    // Depois deletar o funcionário
    const { error: employeeError } = await supabase
      .from('employees')
      .delete()
      .eq('id', id);

    if (employeeError) throw employeeError;

    res.status(204).end();
  } catch (error) {
    console.error('Error deleting employee:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * components:
 *   schemas:
 *     Employee:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         name:
 *           type: string
 *           example: "João Silva"
 *         email:
 *           type: string
 *           format: email
 *           example: "joao@exemplo.com"
 *         phone:
 *           type: string
 *           example: "11999998888"
 *         comissao:
 *           type: number
 *           format: float
 *           example: 10.5
 *         imagem_funcionario:
 *           type: string
 *           description: Imagem em base64 ou data URL
 *           example: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ..."
 *         is_active:
 *           type: boolean
 *           example: true
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 * 
 *     EmployeeWithDetails:
 *       allOf:
 *         - $ref: '#/components/schemas/Employee'
 *         - type: object
 *           properties:
 *             services:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   name:
 *                     type: string
 *                     example: "Corte de Cabelo"
 *             work_schedules:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/WorkSchedule'
 * 
 *     WorkSchedule:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         employee_id:
 *           type: integer
 *         day_of_week:
 *           type: integer
 *           description: 0-6 (Domingo-Sábado)
 *         start_time:
 *           type: string
 *           format: time
 *           example: "09:00:00"
 *         end_time:
 *           type: string
 *           format: time
 *           example: "18:00:00"
 *         is_available:
 *           type: boolean
 */
//------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

/**
 * @swagger
 * tags:
 *   - name: Serviços de Funcionários
 *     description: Endpoints para gestão da relação entre funcionários e serviços
 */

/**
 * @swagger
 * /api/employee-services/{employeeId}:
 *   get:
 *     summary: Lista serviços associados a um funcionário
 *     description: Retorna todos os IDs de serviços que um funcionário pode realizar
 *     tags: [Serviços de Funcionários]
 *     parameters:
 *       - in: path
 *         name: employeeId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do funcionário
 *         example: 1
 *     responses:
 *       200:
 *         description: Lista de IDs de serviços associados
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   service_id:
 *                     type: integer
 *                     description: ID do serviço que o funcionário pode realizar
 *                     example: 5
 *       500:
 *         description: Erro interno do servidor
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */
// Rota para obter serviços de um funcionário
app.get('/api/employee-services/:employeeId', async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { data, error } = await supabase
      .from('employee_services')
      .select('service_id')
      .eq('employee_id', employeeId)
      .eq('organization_id', req.organizationId);

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error fetching employee services:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/employee-services/{employeeId}:
 *   put:
 *     summary: Atualiza serviços associados a um funcionário
 *     description: |
 *       Substitui completamente a lista de serviços que um funcionário pode realizar.
 *       Primeiro remove todas as associações existentes e depois cria as novas.
 *     tags: [Serviços de Funcionários]
 *     parameters:
 *       - in: path
 *         name: employeeId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do funcionário
 *         example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               type: object
 *               required:
 *                 - service_id
 *                 - employee_id
 *               properties:
 *                 service_id:
 *                   type: integer
 *                   description: ID do serviço a ser associado
 *                   example: 3
 *                 employee_id:
 *                   type: integer
 *                   description: ID do funcionário (deve corresponder ao parâmetro da URL)
 *                   example: 1
 *             example:
 *               - service_id: 3
 *                 employee_id: 1
 *               - service_id: 5
 *                 employee_id: 1
 *     responses:
 *       200:
 *         description: Serviços atualizados com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *       400:
 *         description: Dados inválidos (IDs inconsistentes ou formato incorreto)
 *       500:
 *         description: Erro interno do servidor
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */
// Rota para atualizar serviços de um funcionário
app.put('/api/employee-services/:employeeId', async (req, res) => {
  try {
    const { employeeId } = req.params;
    const services = req.body;

    // Validar que todos os serviços têm employee_id
    const validServices = services.filter(service => {
      // Se não tiver employee_id, usar o da URL
      if (!service.employee_id) {
        service.employee_id = parseInt(employeeId);
      }
      return service.service_id; // Garantir que pelo menos tem service_id
    });

    // Primeiro deletar todos os serviços atuais
    const { error: deleteError } = await supabase
      .from('employee_services')
      .delete()
      .eq('employee_id', employeeId);

    if (deleteError) throw deleteError;

    // Depois inserir os novos serviços (se houver) em lotes
    if (validServices.length > 0) {
      // Dividir em lotes de 10 serviços para evitar sobrecarga
      const batchSize = 10;
      for (let i = 0; i < validServices.length; i += batchSize) {
        const batch = validServices.slice(i, i + batchSize);
        const { error: insertError } = await supabase
          .from('employee_services')
          .insert(batch);

        if (insertError) throw insertError;
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating employee services:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * components:
 *   schemas:
 *     EmployeeService:
 *       type: object
 *       required:
 *         - employee_id
 *         - service_id
 *       properties:
 *         employee_id:
 *           type: integer
 *           description: ID do funcionário
 *           example: 1
 *         service_id:
 *           type: integer
 *           description: ID do serviço
 *           example: 3
 */
//-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

/**
 * @swagger
 * tags:
 *   - name: Escalas de Trabalho
 *     description: Endpoints para gestão de horários e escalas de funcionários
 */

/**
 * @swagger
 * /schedules:
 *   get:
 *     summary: Lista todas as escalas de trabalho
 *     description: Retorna todos os horários cadastrados com informações dos funcionários
 *     tags: [Escalas de Trabalho]
 *     responses:
 *       200:
 *         description: Lista de escalas com detalhes dos funcionários
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/WorkScheduleWithEmployee'
 *       500:
 *         description: Erro interno do servidor
 */
// ROTAS DE HORÁRIOS
app.get("/schedules", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("work_schedules")
      .select("*, employees(name, email)")
      .eq('organization_id', req.organizationId);


    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error fetching schedules:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /schedules:
 *   post:
 *     summary: Cria um novo horário na escala
 *     tags: [Escalas de Trabalho]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - employee_id
 *               - day_of_week
 *               - start_time
 *               - end_time
 *             properties:
 *               employee_id:
 *                 type: integer
 *                 description: ID do funcionário
 *                 example: 1
 *               day_of_week:
 *                 type: string
 *                 description: Dia da semana (0-6 ou nome)
 *                 example: "Segunda-feira"
 *               start_time:
 *                 type: string
 *                 description: Hora de início (HH:MM ou HH:MM:SS)
 *                 example: "09:00"
 *               end_time:
 *                 type: string
 *                 description: Hora de término (HH:MM ou HH:MM:SS)
 *                 example: "18:00"
 *               is_available:
 *                 type: boolean
 *                 description: Se o horário está disponível
 *                 default: true
 *     responses:
 *       201:
 *         description: Horário criado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/WorkSchedule'
 *       400:
 *         description: Dados inválidos ou incompletos
 *       500:
 *         description: Erro interno do servidor
 */
// Rota para criar/atualizar horários
app.post("/schedules", async (req, res) => {
  try {
    const { employee_id, day_of_week, start_time, end_time, is_available = true } = req.body;

    // Validações
    if (!employee_id || day_of_week === undefined || !start_time || !end_time) {
      return res.status(400).json({ 
        error: 'Dados incompletos',
        details: 'employee_id, day_of_week (número), start_time e end_time são obrigatórios'
      });
    }

    // Converter dia da semana para número se for string
    const dayNumber = convertDayToNumber(day_of_week);
    if (dayNumber === null) {
      return res.status(400).json({ 
        error: 'Dia da semana inválido',
        details: 'Use número (0-6) ou nome do dia (ex: "Segunda-feira")'
      });
    }

    // Formatando os horários para HH:MM:SS
    const formattedStart = formatTimeToHHMMSS(start_time);
    const formattedEnd = formatTimeToHHMMSS(end_time);

    // Inserção no banco
    const { data, error } = await supabase
      .from("work_schedules")
      .insert([{ 
        employee_id, 
        day_of_week: dayNumber, 
        start_time: formattedStart, 
        end_time: formattedEnd, 
        is_available 
      }])
      .select();

    if (error) throw error;
    res.status(201).json(data[0]);

  } catch (error) {
    console.error('Erro no servidor:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
});

// Funções auxiliares
function convertDayToNumber(day) {
  if (typeof day === 'number') {
    return (day >= 0 && day <= 6) ? day : null;
  }

   const daysMap = {
    'domingo': 0,
    'segunda': 1, 'segunda-feira': 1,
    'terça': 2, 'terça-feira': 2,
    'quarta': 3, 'quarta-feira': 3,
    'quinta': 4, 'quinta-feira': 4,
    'sexta': 5, 'sexta-feira': 5,
    'sábado': 6, 'sabado': 6
    
  };

  return daysMap[day.toLowerCase()] || null;
}

function formatTimeToHHMMSS(time) {
  if (!time) return '09:00:00'; // Valor padrão
  
  // Se já está no formato HH:MM:SS
  if (typeof time === 'string' && time.match(/^\d{2}:\d{2}:\d{2}$/)) {
    return time;
  }
  
  // Se está no formato HH:MM
  if (typeof time === 'string' && time.match(/^\d{2}:\d{2}$/)) {
    return `${time}:00`;
  }
  
  // Se é um número como 800 (8:00) ou 1700 (17:00)
  if (typeof time === 'number') {
    const timeStr = String(time).padStart(4, '0');
    return `${timeStr.substr(0, 2)}:${timeStr.substr(2, 2)}:00`;
  }
  
  return '09:00:00'; // Valor padrão se não reconhecer
}

// Função auxiliar de validação
function isValidTime(time) {
  return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(time);
}

/**
 * @swagger
 * /schedules/{employee_id}:
 *   get:
 *     summary: Obtém a escala de um funcionário específico
 *     description: Retorna todos os horários de um funcionário com os dias formatados
 *     tags: [Escalas de Trabalho]
 *     parameters:
 *       - in: path
 *         name: employee_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do funcionário
 *     responses:
 *       200:
 *         description: Lista de horários formatados
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/FormattedWorkSchedule'
 *       500:
 *         description: Erro interno do servidor
 */
app.get("/schedules/:employee_id", async (req, res) => {
  try {
    const { employee_id } = req.params;
    const { data, error } = await supabase
      .from("work_schedules")
      .select("*")
      .eq("employee_id", employee_id)
      .eq('organization_id', req.organizationId);

    if (error) throw error;
    
    // Função para converter número para nome do dia
    const convertNumberToDayName = (dayNumber) => {
      const days = [
        'Domingo',
        'Segunda-feira', 
        'Terça-feira',
        'Quarta-feira',
        'Quinta-feira',
        'Sexta-feira',
        'Sábado'
      ];
      return days[dayNumber] || 'Dia inválido';
    };

    // Formatar os dados antes de retornar
    const formattedData = data.map(schedule => ({
      ...schedule,
      day: convertNumberToDayName(schedule.day_of_week), // Adiciona o nome do dia
      start_time: formatTimeFromDB(schedule.start_time),
      end_time: formatTimeFromDB(schedule.end_time)
    }));
    
    res.json(formattedData);
  } catch (error) {
    console.error('Error fetching employee schedules:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Função auxiliar para formatar o horário do banco de dados
function formatTimeFromDB(time) {
  if (!time) return null;
  
  // Se já estiver no formato HH:MM
  if (typeof time === 'string' && time.includes(':')) return time;
  
  // Se for um número (como 100000 para 10:00:00)
  if (typeof time === 'number') {
    const timeStr = String(time).padStart(6, '0');
    return `${timeStr.substr(0, 2)}:${timeStr.substr(2, 2)}`;
  }
  
  return time;
}


/**
 * @swagger
 * /schedules/{employee_id}:
 *   put:
 *     summary: Atualiza toda a escala de um funcionário
 *     description: Substitui completamente os horários de um funcionário
 *     tags: [Escalas de Trabalho]
 *     parameters:
 *       - in: path
 *         name: employee_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do funcionário
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               type: object
 *               required:
 *                 - day_of_week
 *                 - start_time
 *                 - end_time
 *               properties:
 *                 day_of_week:
 *                   type: integer
 *                   description: Dia da semana (0-6)
 *                   example: 1
 *                 start_time:
 *                   type: string
 *                   description: Hora de início
 *                   example: "09:00:00"
 *                 end_time:
 *                   type: string
 *                   description: Hora de término
 *                   example: "17:00:00"
 *     responses:
 *       200:
 *         description: Escala atualizada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *       400:
 *         description: Dados inválidos ou funcionário não encontrado
 *       500:
 *         description: Erro interno do servidor
 */
app.put('/schedules/:employee_id', async (req, res) => {
  try {
    const { employee_id } = req.params;
    const schedules = req.body;

    // Verificar se o funcionário existe
    const { data: employee, error: employeeError } = await supabase
      .from('employees')
      .select('id')
      .eq('id', employee_id)
      .single();

    if (employeeError || !employee) {
      throw new Error('Funcionário não encontrado');
    }

    // Deletar horários existentes
    const { error: deleteError } = await supabase
      .from('work_schedules')
      .delete()
      .eq('employee_id', employee_id);

    if (deleteError) throw deleteError;

    // Inserir novos horários (se houver)
    if (schedules.length > 0) {
      // Validar horários
      const validSchedules = schedules.map(schedule => {
        if (isNaN(schedule.day_of_week) || schedule.day_of_week < 0 || schedule.day_of_week > 6) {
          throw new Error('Dia da semana inválido');
        }

        return {
          employee_id,
          day_of_week: schedule.day_of_week,
          start_time: schedule.start_time,
          end_time: schedule.end_time
        };
      });

      const { error: insertError } = await supabase
        .from('work_schedules')
        .insert(validSchedules);

      if (insertError) throw insertError;
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating schedules:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message
    });
  }
});


/**
 * @swagger
 * /schedules/employees/{employee_id}:
 *   delete:
 *     summary: Remove todos os horários de um funcionário
 *     tags: [Escalas de Trabalho]
 *     parameters:
 *       - in: path
 *         name: employee_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do funcionário
 *     responses:
 *       204:
 *         description: Horários removidos com sucesso
 *       500:
 *         description: Erro interno do servidor
 */
app.delete("/schedules/employees/:employee_id", async (req, res) => {
  try {
    const { employee_id } = req.params;
    const { error } = await supabase
      .from("work_schedules")
      .delete()
      .eq("employee_id", employee_id);

    if (error) throw error;
    res.status(204).end();
  } catch (error) {
    console.error('Error deleting employee schedules:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


/**
 * @swagger
 * /schedules/{id}:
 *   delete:
 *     summary: Remove um horário específico
 *     tags: [Escalas de Trabalho]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do horário
 *     responses:
 *       204:
 *         description: Horário removido com sucesso
 *       500:
 *         description: Erro interno do servidor
 */
app.delete("/schedules/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase
      .from("work_schedules")
      .delete()
      .eq("id", id);

    if (error) throw error;
    res.status(204).end();
  } catch (error) {
    console.error('Error deleting schedule:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


/**
 * @swagger
 * components:
 *   schemas:
 *     WorkSchedule:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         employee_id:
 *           type: integer
 *         day_of_week:
 *           type: integer
 *           description: 0-6 (Domingo-Sábado)
 *         start_time:
 *           type: string
 *           format: time
 *         end_time:
 *           type: string
 *           format: time
 *         is_available:
 *           type: boolean
 *         created_at:
 *           type: string
 *           format: date-time
 * 
 *     WorkScheduleWithEmployee:
 *       allOf:
 *         - $ref: '#/components/schemas/WorkSchedule'
 *         - type: object
 *           properties:
 *             employees:
 *               type: object
 *               properties:
 *                 name:
 *                   type: string
 *                 email:
 *                   type: string
 *                   format: email
 * 
 *     FormattedWorkSchedule:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         employee_id:
 *           type: integer
 *         day_of_week:
 *           type: integer
 *         day:
 *           type: string
 *           description: Nome do dia da semana
 *         start_time:
 *           type: string
 *           description: Hora formatada (HH:MM)
 *         end_time:
 *           type: string
 *           description: Hora formatada (HH:MM)
 *         is_available:
 *           type: boolean
 */
//-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

/**
 * @swagger
 * tags:
 *   - name: Dashboard
 *     description: Endpoints para dados do painel administrativo
 */

/**
 * @swagger
 * /api/admin/dashboard:
 *   get:
 *     summary: Obtém dados consolidados para o painel administrativo
 *     description: |
 *       Retorna métricas e dados estatísticos para exibição no dashboard administrativo,
 *       incluindo contagens totais, distribuições e dados para gráficos.
 *     tags: [Dashboard]
 *     responses:
 *       200:
 *         description: Dados do dashboard retornados com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalEmployees:
 *                   type: integer
 *                   description: Número total de funcionários cadastrados
 *                   example: 15
 *                 totalCategories:
 *                   type: integer
 *                   description: Número total de categorias cadastradas
 *                   example: 5
 *                 totalServices:
 *                   type: integer
 *                   description: Número total de serviços cadastrados
 *                   example: 25
 *                 totalAppointments:
 *                   type: integer
 *                   description: Número total de agendamentos confirmados
 *                   example: 120
 *                 monthlyAppointments:
 *                   type: array
 *                   description: Contagem de agendamentos por mês (índices 0-11 representando Janeiro-Dezembro)
 *                   items:
 *                     type: integer
 *                   example: [10, 12, 15, 8, 5, 12, 18, 20, 10, 5, 8, 7]
 *                 employeesStatus:
 *                   type: object
 *                   description: Distribuição de funcionários por status
 *                   properties:
 *                     active:
 *                       type: integer
 *                       example: 12
 *                     inactive:
 *                       type: integer
 *                       example: 3
 *                 usersDistribution:
 *                   type: object
 *                   description: Distribuição de usuários por tipo
 *                   properties:
 *                     admin:
 *                       type: integer
 *                       example: 3
 *                     comum:
 *                       type: integer
 *                       example: 45
 *                 couponsStatus:
 *                   type: object
 *                   description: Distribuição de cupons por status
 *                   properties:
 *                     active:
 *                       type: integer
 *                       example: 8
 *                     inactive:
 *                       type: integer
 *                       example: 5
 *                 lastUpdated:
 *                   type: string
 *                   format: date-time
 *                   description: Timestamp da última atualização dos dados
 *                   example: "2023-08-15T14:30:00.000Z"
 *       500:
 *         description: Erro interno do servidor
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                 details:
 *                   type: string
 */
// Rota para dados do dashboard
app.get('/api/admin/dashboard', extractOrganizationId, async (req, res) => {
  try {
    // 1. Contagem básica de funcionários, categorias, serviços e agendamentos
    const [
      { count: employeesCount },
      { count: categoriesCount },
      { count: servicesCount },
      { count: appointmentsCount }
    ] = await Promise.all([
      supabase.from('employees').select('*', { count: 'exact', head: true }).eq('organization_id', req.organizationId), 
      supabase.from('categories').select('*', { count: 'exact', head: true }).eq('organization_id', req.organizationId), 
      supabase.from('services').select('*', { count: 'exact', head: true }).eq('organization_id', req.organizationId), 
      supabase.from('appointments').select('*', { count: 'exact', head: true }).eq('organization_id', req.organizationId).eq('status', 'confirmed') 
    ]);

    // 2. Dados detalhados para os gráficos
    const [
      { data: employeesData, error: employeesError },
      { data: usersData, error: usersError },
      { data: couponsData, error: couponsError },
      { data: appointmentsData, error: appointmentsError }
    ] = await Promise.all([
      supabase.from('employees').select('is_active').eq('organization_id', req.organizationId), 
      supabase.from('users').select('tipo').eq('organization_id', req.organizationId), 
      supabase.from('coupons').select('is_active').eq('organization_id', req.organizationId), 
      supabase.from('appointments').select('appointment_date').eq('organization_id', req.organizationId).eq('status', 'confirmed') 
    ]);

    // Verificar erros nas consultas
    if (employeesError || usersError || couponsError || appointmentsError) {
      throw new Error(
        employeesError?.message || 
        usersError?.message || 
        couponsError?.message || 
        appointmentsError?.message
      );
    }

    // 3. Processamento dos dados para os gráficos
    // Funcionários (ativos/inativos)
    const employeesStatus = {
      active: employeesData.filter(e => e.is_active).length,
      inactive: employeesData.filter(e => !e.is_active).length
    };

    // Usuários (admin/comum)
    const usersDistribution = {
      admin: usersData.filter(u => u.tipo === 'admin').length,
      comum: usersData.filter(u => u.tipo === 'comum').length
    };

    // Cupons (ativos/inativos)
    const couponsStatus = {
      active: couponsData.filter(c => c.is_active).length,
      inactive: couponsData.filter(c => !c.is_active).length
    };

    // Agendamentos por mês
    const monthlyAppointments = Array(12).fill(0); // Janeiro a Dezembro
    appointmentsData.forEach(item => {
      const month = new Date(item.appointment_date).getMonth(); // 0-11
      monthlyAppointments[month]++;
    });

    // 4. Retornar todos os dados consolidados
    res.json({
      // Totais básicos
      totalEmployees: employeesCount || 0,
      totalCategories: categoriesCount || 0,
      totalServices: servicesCount || 0,
      totalAppointments: appointmentsCount || 0,
      
      // Dados para gráficos
      monthlyAppointments,
      employeesStatus,
      usersDistribution,
      couponsStatus,
      
      // Metadados
      lastUpdated: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
});

//----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

/**
 * @swagger
 * tags:
 *   - name: Cupons
 *     description: Endpoints para gestão e validação de cupons de desconto
 */

/**
 * @swagger
 * /api/coupons:
 *   get:
 *     summary: Lista todos os cupons
 *     description: Retorna todos os cupons cadastrados, ordenados por data de criação (mais recentes primeiro)
 *     tags: [Cupons]
 *     responses:
 *       200:
 *         description: Lista de cupons retornada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Coupon'
 *       500:
 *         description: Erro interno do servidor
 */
// Rotas de Cupons
app.get('/api/coupons', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('organization_id', req.organizationId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


/**
 * @swagger
 * /api/coupons/{id}:
 *   get:
 *     summary: Obtém detalhes de um cupom específico
 *     tags: [Cupons]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do cupom
 *     responses:
 *       200:
 *         description: Dados do cupom
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Coupon'
 *       404:
 *         description: Cupom não encontrado
 *       500:
 *         description: Erro interno do servidor
 */
app.get('/api/coupons/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('id', req.params.id)
      .eq('organization_id', req.organizationId)
      .single();
    
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/coupons:
 *   post:
 *     summary: Cria um novo cupom
 *     tags: [Cupons]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CouponInput'
 *     responses:
 *       201:
 *         description: Cupom criado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Coupon'
 *       400:
 *         description: Dados inválidos
 *       500:
 *         description: Erro interno do servidor
 */
app.post('/api/coupons', async (req, res) => {
  try {
    const couponData = {
      ...req.body,
      code: req.body.code.toUpperCase()
    };
    
    const { data, error } = await supabase
      .from('coupons')
      .insert(couponData)
      .select()
      .single();
    
    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


/**
 * @swagger
 * /api/coupons/{id}:
 *   put:
 *     summary: Atualiza um cupom existente
 *     tags: [Cupons]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do cupom
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CouponInput'
 *     responses:
 *       200:
 *         description: Cupom atualizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Coupon'
 *       404:
 *         description: Cupom não encontrado
 *       500:
 *         description: Erro interno do servidor
 */
app.put('/api/coupons/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('coupons')
      .update(req.body)
      .eq('id', req.params.id)
      .select()
      .single();
    
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


/**
 * @swagger
 * /api/coupons/{id}:
 *   delete:
 *     summary: Remove um cupom
 *     tags: [Cupons]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do cupom
 *     responses:
 *       204:
 *         description: Cupom removido com sucesso
 *       404:
 *         description: Cupom não encontrado
 *       500:
 *         description: Erro interno do servidor
 */
app.delete('/api/coupons/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('coupons')
      .delete()
      .eq('id', req.params.id);
    
    if (error) throw error;
    res.status(204).end();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


/**
 * @swagger
 * /api/validate-coupon:
 *   get:
 *     summary: Valida um cupom para um serviço específico
 *     description: Verifica se um cupom é válido para aplicação em determinado serviço
 *     tags: [Cupons]
 *     parameters:
 *       - in: query
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *         description: Código do cupom
 *       - in: query
 *         name: serviceId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do serviço
 *     responses:
 *       200:
 *         description: Resultado da validação
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 valid:
 *                   type: boolean
 *                   description: Indica se o cupom é válido
 *                 message:
 *                   type: string
 *                   description: Mensagem descritiva
 *                 discount:
 *                   type: number
 *                   description: Valor do desconto (apenas se válido)
 *                 discountType:
 *                   type: string
 *                   enum: [percentage, fixed]
 *                   description: Tipo do desconto (apenas se válido)
 *       500:
 *         description: Erro interno do servidor
 */
app.get('/api/validate-coupon', async (req, res) => {
  try {
    const { code, serviceId } = req.query;
    const cleanCode = code.trim().toUpperCase();

    // Busca o serviço
    const { data: service, error: serviceError } = await supabase
      .from('services')
      .select('price, name')
      .eq('id', serviceId)
      .single();

    if (serviceError || !service) {
      return res.json({ valid: false, message: 'Serviço não encontrado' });
    }

    // Busca o cupom básico
    const { data: coupon, error: couponError } = await supabase
      .from('coupons')
      .select('*')
      .eq('code', cleanCode)
      .eq('is_active', true)
      .eq('organization_id', req.organizationId)
      .single();

    if (couponError || !coupon) {
      return res.json({ valid: false, message: 'Cupom não encontrado ou inativo' });
    }

    const now = new Date();

    // Valida data de validade
    if (coupon.valid_until && new Date(coupon.valid_until) < now) {
      return res.json({ valid: false, message: 'Este cupom expirou' });
    }

    // Valida número máximo de usos
    if (coupon.max_uses !== null && coupon.current_uses >= coupon.max_uses) {
      return res.json({ valid: false, message: 'Este cupom atingiu o número máximo de usos' });
    }

    // Valida valor mínimo do serviço
    if (service.price < coupon.min_service_value) {
      return res.json({
        valid: false,
        message: `Este cupom requer serviço com valor mínimo de R$ ${coupon.min_service_value.toFixed(2)}`
      });
    }

    // Cupom válido
    return res.json({
      valid: true,
      discount: coupon.discount_value,
      discountType: coupon.discount_type,
      message: `Cupom aplicado! Desconto de ${coupon.discount_value}${coupon.discount_type === 'percentage' ? '%' : 'R$'}`
    });

  } catch (error) {
    console.error('Erro na validação:', error);
    return res.status(500).json({ valid: false, message: 'Erro interno ao validar cupom' });
  }
});


/**
 * @swagger
 * components:
 *   schemas:
 *     Coupon:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         code:
 *           type: string
 *           description: Código do cupom (em maiúsculas)
 *           example: "PROMO10"
 *         discount_type:
 *           type: string
 *           enum: [percentage, fixed]
 *           description: Tipo de desconto (percentual ou valor fixo)
 *           example: "percentage"
 *         discount_value:
 *           type: number
 *           description: Valor do desconto
 *           example: 10
 *         min_service_value:
 *           type: number
 *           description: Valor mínimo do serviço para aplicar o cupom
 *           example: 50
 *         max_uses:
 *           type: integer
 *           nullable: true
 *           description: Número máximo de usos (null para ilimitado)
 *           example: 100
 *         current_uses:
 *           type: integer
 *           description: Número de vezes que o cupom já foi usado
 *           example: 25
 *         valid_until:
 *           type: string
 *           format: date
 *           nullable: true
 *           description: Data de validade (null para sem expiração)
 *           example: "2023-12-31"
 *         is_active:
 *           type: boolean
 *           description: Indica se o cupom está ativo
 *           example: true
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: Data de criação
 * 
 *     CouponInput:
 *       type: object
 *       required:
 *         - code
 *         - discount_type
 *         - discount_value
 *         - min_service_value
 *       properties:
 *         code:
 *           type: string
 *           example: "PROMO10"
 *         discount_type:
 *           type: string
 *           enum: [percentage, fixed]
 *           example: "percentage"
 *         discount_value:
 *           type: number
 *           example: 10
 *         min_service_value:
 *           type: number
 *           example: 50
 *         max_uses:
 *           type: integer
 *           nullable: true
 *           example: 100
 *         valid_until:
 *           type: string
 *           format: date
 *           nullable: true
 *           example: "2023-12-31"
 *         is_active:
 *           type: boolean
 *           example: true
 */

/**
 * @swagger
 * components:
 *   responses:
 *     CouponValidationResponse:
 *       description: Resposta de validação de cupom
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               valid:
 *                 type: boolean
 *                 example: true
 *               message:
 *                 type: string
 *                 example: "Cupom aplicado! Desconto de 10%"
 *               discount:
 *                 type: number
 *                 example: 10
 *               discountType:
 *                 type: string
 *                 example: "percentage"
 */
//---------------------------------------------------------------------------------------------------------------------------------------------------------------------------

/**
 * @swagger
 * tags:
 *   - name: Relatórios
 *     description: Endpoints para geração de relatórios financeiros
 */

/**
 * @swagger
 * /api/admin/revenue:
 *   get:
 *     summary: Relatório de receitas detalhado
 *     description: |
 *       Retorna um relatório completo de receitas, incluindo:
 *       - Total de agendamentos
 *       - Faturamento total
 *       - Comissões totais
 *       - Detalhes por funcionário (faturamento, comissões e lucro líquido)
 *     tags: [Relatórios]
 *     parameters:
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           format: date
 *         description: Data inicial do período (YYYY-MM-DD)
 *         example: "2023-01-01"
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date
 *         description: Data final do período (YYYY-MM-DD)
 *         example: "2023-12-31"
 *     responses:
 *       200:
 *         description: Relatório de receitas retornado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 period:
 *                   type: string
 *                   description: Período analisado
 *                   example: "2023-01-01 a 2023-12-31"
 *                 total_appointments:
 *                   type: integer
 *                   description: Número total de agendamentos
 *                   example: 150
 *                 total_revenue:
 *                   type: number
 *                   format: float
 *                   description: Faturamento total no período
 *                   example: 12500.50
 *                 total_commissions:
 *                   type: number
 *                   format: float
 *                   description: Total de comissões a pagar
 *                   example: 2500.10
 *                 details:
 *                   type: array
 *                   description: Detalhamento por funcionário
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         description: ID do funcionário
 *                       name:
 *                         type: string
 *                         description: Nome do funcionário
 *                       commission_rate:
 *                         type: number
 *                         description: Percentual de comissão
 *                       appointments_count:
 *                         type: integer
 *                         description: Número de agendamentos
 *                       total_revenue:
 *                         type: number
 *                         description: Faturamento gerado
 *                       commission_value:
 *                         type: number
 *                         description: Valor da comissão
 *                       net_profit:
 *                         type: number
 *                         description: Lucro líquido (faturamento - comissão)
 *       500:
 *         description: Erro interno do servidor
 */
// Rota para relatório de receitas (atualizada)
app.get('/api/admin/revenue', async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    
    // 1. Buscar todos os agendamentos concluídos
    let appointmentsQuery = supabase
      .from('appointments')
      .select('id, final_price, appointment_date, employee_id, employees(id, name, comissao)')
      .eq('status', 'completed')
      .eq('organization_id', req.organizationId);; // Considerar apenas agendamentos confirmados
    
    // Aplicar filtro de datas se existir (corrigido para usar appointment_date)
    if (start_date && end_date) {
      appointmentsQuery = appointmentsQuery
        .gte('appointment_date', start_date)
        .lte('appointment_date', end_date);
    }
    
    const { data: appointments, error: appointmentsError } = await appointmentsQuery;
    if (appointmentsError) throw appointmentsError;
    
    // 2. Buscar todos os funcionários para garantir que apareçam mesmo sem agendamentos
    const { data: employees, error: employeesError } = await supabase
      .from('employees')
      .select('id, name, comissao')
      .eq('organization_id', req.organizationId);
    
    if (employeesError) throw employeesError;
    
    // 3. Processar os dados para calcular métricas
    const employeesMap = new Map();
    let totalAppointments = 0;
    let totalRevenue = 0;
    let totalCommissions = 0;
    
    // Inicializar mapa com todos os funcionários
    employees.forEach(employee => {
      employeesMap.set(employee.id, {
        id: employee.id,
        name: employee.name,
        commission_rate: employee.comissao || 0,
        appointments_count: 0,
        total_revenue: 0,
        commission_value: 0,
        net_profit: 0
      });
    });
    
    // Processar agendamentos
    appointments.forEach(appointment => {
      totalAppointments++;
      
      const finalPrice = appointment.final_price || 0;
      totalRevenue += finalPrice;
      
      const employeeId = appointment.employee_id; // Usando employee_id diretamente
      if (!employeeId) return;
      
      const employee = employeesMap.get(employeeId);
      if (!employee) return;
      
      employee.appointments_count++;
      employee.total_revenue += finalPrice;
    });
    
    // Calcular comissões e lucro líquido para cada funcionário
    employeesMap.forEach(employee => {
      employee.commission_value = employee.total_revenue * (employee.commission_rate / 100);
      employee.net_profit = employee.total_revenue - employee.commission_value;
      
      totalCommissions += employee.commission_value;
    });
    
    // Converter o Map para array e ordenar por maior faturamento
    const details = Array.from(employeesMap.values())
      .sort((a, b) => b.total_revenue - a.total_revenue);
    
    // 4. Retornar os dados
    res.json({
      period: start_date && end_date 
        ? `${start_date} a ${end_date}` 
        : 'Todos os períodos',
      total_appointments: totalAppointments,
      total_revenue: totalRevenue,
      total_commissions: totalCommissions,
      details: details
    });
    
  } catch (error) {
    console.error('Error fetching revenue data:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
});


/**
 * @swagger
 * /api/admin/revenue/export:
 *   get:
 *     summary: Exporta relatório de receitas em Excel
 *     description: Gera um arquivo Excel com o mesmo relatório da rota principal
 *     tags: [Relatórios]
 *     parameters:
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           format: date
 *         description: Data inicial do período (YYYY-MM-DD)
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date
 *         description: Data final do período (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Arquivo Excel gerado com sucesso
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 *       500:
 *         description: Erro interno do servidor
 */
// Rota para exportar relatório de receitas (opcional)
app.get('/api/admin/revenue/export', async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    
    // Reutilizar a mesma lógica da rota principal
    let appointmentsQuery = supabase
      .from('appointments')
      .select('id, final_price, appointment_date, employees(id, name, comissao)')
      .eq('status', 'completed')
      .eq('organization_id', req.organizationId);
    
    if (start_date && end_date) {
      appointmentsQuery = appointmentsQuery
        .gte('appointment_date', start_date)
        .lte('appointment_date', end_date);
    }
    
    const { data: appointments, error: appointmentsError } = await appointmentsQuery;
    if (appointmentsError) throw appointmentsError;
    
    const { data: employees, error: employeesError } = await supabase
      .from('employees')
      .select('id, name, comissao');
    
    if (employeesError) throw employeesError;
    
    // Processar os dados (mesma lógica da rota principal)
    const employeesMap = new Map();
    employees.forEach(employee => {
      employeesMap.set(employee.id, {
        name: employee.name,
        commission_rate: employee.comissao || 0,
        appointments_count: 0,
        total_revenue: 0,
        commission_value: 0,
        net_profit: 0
      });
    });
    
    appointments.forEach(appointment => {
      const employeeId = appointment.employees?.id;
      if (!employeeId) return;
      
      const employee = employeesMap.get(employeeId);
      if (!employee) return;
      
      const finalPrice = appointment.final_price || 0;
      
      employee.appointments_count++;
      employee.total_revenue += finalPrice;
    });
    
    employeesMap.forEach(employee => {
      employee.commission_value = employee.total_revenue * (employee.commission_rate / 100);
      employee.net_profit = employee.total_revenue - employee.commission_value;
    });
    
    const details = Array.from(employeesMap.values())
      .sort((a, b) => b.total_revenue - a.total_revenue);
    
    // Criar arquivo Excel (usando a biblioteca exceljs)
    const ExcelJS = require('exceljs');
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Relatório de Receitas');
    
    // Adicionar cabeçalhos
    worksheet.columns = [
      { header: 'Profissional', key: 'name', width: 30 },
      { header: 'Agendamentos', key: 'appointments_count', width: 15 },
      { header: 'Faturamento Total', key: 'total_revenue', width: 20, style: { numFmt: '"R$"#,##0.00' } },
      { header: 'Comissão (%)', key: 'commission_rate', width: 15 },
      { header: 'Valor Comissão', key: 'commission_value', width: 20, style: { numFmt: '"R$"#,##0.00' } },
      { header: 'Lucro Líquido', key: 'net_profit', width: 20, style: { numFmt: '"R$"#,##0.00' } }
    ];
    
    // Adicionar dados
    worksheet.addRows(details);
    
    // Adicionar totais
    const totalAppointments = details.reduce((sum, emp) => sum + emp.appointments_count, 0);
    const totalRevenue = details.reduce((sum, emp) => sum + emp.total_revenue, 0);
    const totalCommissions = details.reduce((sum, emp) => sum + emp.commission_value, 0);
    
    worksheet.addRow([]);
    worksheet.addRow({
      name: 'TOTAIS',
      appointments_count: totalAppointments,
      total_revenue: totalRevenue,
      commission_value: totalCommissions
    });
    
    // Configurar resposta
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=relatorio-receitas.xlsx'
    );
    
    await workbook.xlsx.write(res);
    res.end();
    
  } catch (error) {
    console.error('Error exporting revenue data:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
});


/**
 * @swagger
 * components:
 *   schemas:
 *     RevenueReport:
 *       type: object
 *       properties:
 *         period:
 *           type: string
 *         total_appointments:
 *           type: integer
 *         total_revenue:
 *           type: number
 *         total_commissions:
 *           type: number
 *         details:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/EmployeeRevenueDetail'
 * 
 *     EmployeeRevenueDetail:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         name:
 *           type: string
 *         commission_rate:
 *           type: number
 *         appointments_count:
 *           type: integer
 *         total_revenue:
 *           type: number
 *         commission_value:
 *           type: number
 *         net_profit:
 *           type: number
 */
//-------------------------------------------------------------------------------------------------------------------------------------------------------------------

/**
 * @swagger
 * tags:
 *   - name: Galeria
 *     description: Endpoints para gerenciamento de imagens na galeria
 */
/**
 * @swagger
 * /api/galeria:
 *   get:
 *     summary: Lista todas as imagens (apenas metadados)
 *     description: Retorna a lista de todas as imagens da galeria sem os dados binários, ordenadas por data de criação (mais recentes primeiro)
 *     tags: [Galeria]
 *     responses:
 *       200:
 *         description: Lista de imagens retornada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ImagemMetadata'
 *       500:
 *         description: Erro ao carregar galeria
 */
// Rota para listar todas as imagens (metadados)
app.get('/api/galeria', async (req, res) => {
  try {
    const imagens = await Galeria.find({}, { 'imagem.dados': 0 }) // Exclui os dados binários da lista
      .sort({ criadoEm: -1 });
    res.json(imagens);
  } catch (error) {
    console.error('Erro ao listar imagens:', error);
    res.status(500).json({ error: 'Erro ao carregar galeria' });
  }
});

/**
 * @swagger
 * /api/galeria/upload:
 *   post:
 *     summary: Faz upload de uma nova imagem
 *     description: Envia uma imagem para a galeria com título opcional
 *     tags: [Galeria]
 *     consumes:
 *       - multipart/form-data
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               imagem:
 *                 type: string
 *                 format: binary
 *                 description: Arquivo de imagem a ser enviado
 *               titulo:
 *                 type: string
 *                 description: Título opcional para a imagem
 *                 example: "Minha Foto"
 *     responses:
 *       200:
 *         description: Upload realizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 id:
 *                   type: string
 *                   description: ID da imagem no banco de dados
 *                 titulo:
 *                   type: string
 *                   description: Título da imagem
 *                 criadoEm:
 *                   type: string
 *                   format: date-time
 *                   description: Data de criação
 *       400:
 *         description: Nenhuma imagem foi enviada
 *       500:
 *         description: Falha ao salvar imagem
 */
// Rota para upload de imagem
app.post('/api/galeria/upload', upload.single('imagem'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhuma imagem enviada' });
    }

    const novaImagem = new Galeria({
      titulo: req.body.titulo || 'Sem título',
      imagem: {
        dados: req.file.buffer,
        tipo: req.file.mimetype
      }
    });

    await novaImagem.save();

    res.json({ 
      success: true,
      id: novaImagem._id,
      titulo: novaImagem.titulo,
      criadoEm: novaImagem.criadoEm
    });

  } catch (error) {
    console.error('Erro no upload:', error);
    res.status(500).json({ error: 'Falha ao salvar imagem' });
  }
});

/**
 * @swagger
 * /api/galeria/imagem/{id}:
 *   get:
 *     summary: Recupera a imagem binária
 *     description: Retorna os dados binários da imagem com o Content-Type apropriado
 *     tags: [Galeria]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID da imagem
 *     responses:
 *       200:
 *         description: Imagem retornada com sucesso
 *         content:
 *           image/*:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: Imagem não encontrada
 *       500:
 *         description: Erro no servidor
 */
// Rota para recuperar a imagem binária
app.get('/api/galeria/imagem/:id', async (req, res) => {
  try {
    const imagem = await Galeria.findById(req.params.id).select('imagem');
    
    if (!imagem) {
      return res.status(404).send('Imagem não encontrada');
    }

    res.set('Content-Type', imagem.imagem.tipo);
    res.send(imagem.imagem.dados);

  } catch (error) {
    console.error('Erro ao recuperar imagem:', error);
    res.status(500).send('Erro no servidor');
  }
});

/**
 * @swagger
 * /api/galeria/busca:
 *   get:
 *     summary: Busca imagens por título
 *     description: Busca imagens cujo título corresponda ao termo (case insensitive)
 *     tags: [Galeria]
 *     parameters:
 *       - in: query
 *         name: termo
 *         required: true
 *         schema:
 *           type: string
 *         description: Termo para busca
 *         example: "paisagem"
 *     responses:
 *       200:
 *         description: Resultados da busca
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ImagemMetadata'
 *       400:
 *         description: Termo de busca é obrigatório
 *       500:
 *         description: Erro ao buscar imagens
 */
// Rota para buscar imagens
app.get('/api/galeria/busca', async (req, res) => {
  try {
    const { termo } = req.query;
    
    if (!termo || termo.trim() === '') {
      return res.status(400).json({ error: 'Termo de busca é obrigatório' });
    }

    const imagens = await Galeria.find(
      { titulo: { $regex: termo, $options: 'i' } },
      { 'imagem.dados': 0 } // Exclui os dados binários
    ).sort({ criadoEm: -1 });

    res.json(imagens);
  } catch (error) {
    console.error('Erro na busca:', error);
    res.status(500).json({ error: 'Erro ao buscar imagens' });
  }
});


/**
 * @swagger
 * /api/galeria/{id}:
 *   delete:
 *     summary: Exclui uma imagem
 *     description: Remove permanentemente uma imagem da galeria
 *     tags: [Galeria]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID da imagem a ser excluída
 *     responses:
 *       200:
 *         description: Imagem excluída com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Imagem excluída com sucesso"
 *       400:
 *         description: ID inválido
 *       404:
 *         description: Imagem não encontrada
 *       500:
 *         description: Erro ao excluir imagem
 */
// Rota para exclusão
app.delete('/api/galeria/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const resultado = await Galeria.findByIdAndDelete(req.params.id);
    
    if (!resultado) {
      return res.status(404).json({ error: 'Imagem não encontrada' });
    }

    res.json({ success: true, message: 'Imagem excluída com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir imagem:', error);
    res.status(500).json({ error: 'Erro ao excluir imagem' });
  }
});

/**
 * @swagger
 * components:
 *   schemas:
 *     ImagemMetadata:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: ID único da imagem
 *         titulo:
 *           type: string
 *           description: Título da imagem
 *         criadoEm:
 *           type: string
 *           format: date-time
 *           description: Data de criação
 *         imagem:
 *           type: object
 *           properties:
 *             tipo:
 *               type: string
 *               description: Tipo MIME da imagem
 *               example: "image/jpeg"
 */



// Iniciar o servidor
app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
  //startWhatsappBot();
});

