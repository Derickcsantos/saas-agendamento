import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js'; 
import cors from 'cors';
import nodemailer from 'nodemailer';
import bodyParser from 'body-parser';
import { create } from '@wppconnect-team/wppconnect';
import cookieParser from 'cookie-parser';
import ExcelJS from 'exceljs';
import multer from 'multer';
import fs from 'fs';
import mongoose from 'mongoose';
const upload = multer(); 
import schedule from 'node-schedule';
import cron from 'node-cron';
import sharp from 'sharp';
import session from 'express-session';
import passport from 'passport';
import passportGoogleOauth20 from 'passport-google-oauth20';
const GoogleStrategy = passportGoogleOauth20.Strategy;
import { v4 as uuidv4 } from 'uuid'; 
import setupSwagger from './swagger.js';
// import { mongoURI } from './lib/mongo.js';
import { supabase } from './lib/supabase.js';
import { Galeria } from './models/Galeria.js';
import { emailContactRouter } from './routes/contatoRoutes.js';
import { categoryRouter } from './routes/categoryRoutes.js';
import generateAccessToken  from './utils/jwt.js';
import jwt from 'jsonwebtoken';
import { authenticateJWT } from './middlewares/authMiddleware.js';
import { extractOrganizationId } from './middlewares/authMiddleware.js';
import { whatsappRouter } from './routes/whatsappRoutes.js';
import { userRouter } from './routes/userRoutes.js';
import generatePassword from './utils/PasswordGenerator.js';
import { checkAuth } from './utils/checkAuth.js';
import updateUserPassword from './utils/updateUserPassword.js';
import { forgotPasswordRouter } from './routes/forgotPasswordRoutes.js';
import { verifyUserRouter } from './routes/verifyUserRoutes.js';
import { couponRouter } from './routes/couponRoutes.js';
import formatTimeFromDB from './utils/formatTimeFromDB.js';
import { serviceRouter } from './routes/ServiceRoutes.js';
import updateYesterdayAppointmentsToCompleted from './utils/confirmAppointments.js';
import convertDayToNumber from './utils/convertDayToNumber.js';
import formatTimeToHHMMSS from './utils/formatTimeToHHMMSS.js';
import isValidTime from './utils/isValidTime.js';
import setTokenCookie from './utils/setTokenCookie.js';
import { appointmentServicesRouter } from './routes/appointmentServicesRoutes.js'
import { registerUserRouter } from './routes/registerUserRoutes.js';
import { appointmentCategoryRouter } from './routes/appointmentCategoryRoutes.js'
import { appointmentEmployeeRouter } from './routes/appointmentEmployeeRoutes.js'
import { appointmentsRouter } from './routes/appointmentsRoutes.js'
import { adminAppointmentRouter } from './routes/adminAppointmentRoutes.js';
import { adminEmployeeRouter } from './routes/adminEmployeeRoutes.js';
import { employeeServicesRouter } from './routes/employeeServicesRoutes.js';
import { galeryRouter } from './routes/galeryRoutes.js';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let whatsappClient = null;
const SESSION_DIR = path.join(__dirname, 'tokens');
const SESSION_FILE = path.join(SESSION_DIR, 'salon-bot.json');

// A pasta TOKEN serve para guardar onde os arquivos serão guardados

const app = express();
const port = process.env.PORT || 3000;

// Swagger Docs
setupSwagger(app)


app.use(cookieParser());

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Credentials', 'true'); // importante
  next();
});

// Criar diretório se não existir
if (!fs.existsSync(SESSION_DIR)) {
  fs.mkdirSync(SESSION_DIR, { recursive: true });
}

const corsOptions = {
  origin: ['http://localhost:3000', 'https://ubiquitous-train-v6pw96wx6v64h664v-3000.app.github.dev'], 
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'organization-id', 'organization_id', 'Accept'],
  credentials: true,
};


// Middlewares
app.use(cors(corsOptions));

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: process.env.SESSION_SECRET || 'secretao',
  resave: false,
  saveUninitialized: true
}));

app.use(passport.initialize());
app.use(passport.session());

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

app.use('/api/contato', emailContactRouter)

app.post('/api/logout', (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
  });
  res.json({ success: true, message: 'Logout realizado com sucesso' });
});

// Significa:

// 0 → no minuto 0

// 3 → na hora 3 (ou seja, 03:00)

// * → todos os dias do mês

// * → todos os meses

// * → todos os dias da semana

// 👉 Ou seja: todo dia às 03:00 da manhã.
cron.schedule('0 3 * * *', async () => {
  console.log('Executando atualização diária de agendamentos...');
  const result = await updateYesterdayAppointmentsToCompleted();
  if (result.success) {
    console.log(result.message);
  } else {
    console.error('Erro na tarefa agendada:', result.error);
  }
});



app.use('/api/forgot-password', forgotPasswordRouter) 

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


// Rota para enviar mensagem via WhatsApp
app.use('/api/send-whatsapp-confirmation', whatsappRouter )


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


app.use('/api/users', userRouter)

// Rota de cadastro
app.use('/api/register', registerUserRouter);

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
      organization_id: req.organizationId,
      tipo: user.tipo
    };

    const token = generateAccessToken(userData);
    setTokenCookie(res, token);


    return res.json({
      success: true,
      message: 'login bem sucedido',
      user: userData
    });


  } catch (err) {
    console.error('Erro ao fazer login:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});


// Login com o Google
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_SECRET_KEY,
    callbackURL: process.env.CALLBACK_URL,
    passReqToCallback: true
  },
  async (req, accessToken, refreshToken, profile, done) => {
    try {
      // o Passport coloca o state em req.query.state
      const organizationId = req.query.state;
      console.log('State recebido:', req.query.state);


      const email = profile.emails[0].value;
      const username = profile.displayName;

      // Verifica se usuário já existe
      const { data: existingUser } = await supabase
        .from('users')
        .select('id, username, email, aniversario, phone, tipo, organization_id')
        .eq('organization_id', organizationId)
        .eq('email', email)
        .single();

      if (existingUser) {
        return done(null, existingUser);
      }

      // Cria novo usuário
      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert([{
          username,
          email,
          password_plaintext: null,
          tipo: 'comum',
          organization_id: organizationId,
          created_at: new Date().toISOString()
        }])
        .select('id, username, email, aniversario, phone, tipo, organization_id')
        .single();

      if (insertError) throw insertError;

      return done(null, newUser);
    } catch (err) {
      return done(err, null);
    }
  }
));

passport.serializeUser((user, done) => {
  done(null, user); // salva o objeto todo
});

passport.deserializeUser((obj, done) => {
  done(null, obj); // devolve o objeto direto
});


// Inicia o login com Google
app.get('/auth/google', (req, res, next) => {
  const organizationId = req.query.organization_id;

  passport.authenticate('google', {
    scope: ['profile', 'email'],
    state: organizationId // aqui vai junto no fluxo
  })(req, res, next);
});

// Callback do Google
app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res) => {
    const userData = {
      id: req.user.id,
      username: req.user.username,
      email: req.user.email,
      aniversario: req.user.aniversario,
      phone: req.user.phone,
      organization_id: req.user.organization_id,
      tipo: req.user.tipo
    };

    const token = generateAccessToken(userData);

    // redireciona de acordo com o tipo do usuário
    let redirectUrl = `/logado?organization_id=${userData.organization_id}`;
    if (userData.tipo === 'admin') {
      redirectUrl = `/admin?organization_id=${userData.organization_id}`;
    } else if (userData.tipo === 'funcionario') {
      redirectUrl = `/funcionario?organization_id=${userData.organization_id}`;
    } else {
      redirectUrl = `/logado?organization_id=${userData.organization_id}`;
    }

    res.redirect(redirectUrl);
  }
);


app.use('/api/verifica-usuario', verifyUserRouter); 

app.use('/api/categories', appointmentCategoryRouter); 

app.get('/api/employees', appointmentEmployeeRouter);

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


app.use('/api/appointments', appointmentsRouter); 

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


app.use('/api/services', appointmentServicesRouter);
app.use('/api/admin/categories', categoryRouter);
app.use('/api/admin/services', serviceRouter);
app.use('/api/admin/appointments', adminAppointmentRouter); 
app.use('/api/admin/employees', adminEmployeeRouter); 
app.use('/api/employee-services/', employeeServicesRouter) ;
app.use('/api/galeria', galeryRouter);

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

app.use('/api/coupons', couponRouter); 


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
app.get('/api/admin/revenue', extractOrganizationId, async (req, res) => {
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

// Iniciar o servidor
app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});