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
import multer from 'multer';
import fs from 'fs';
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
import { availableTimesRouter } from './routes/availableTimesRoutes.js'
import { revenueRouter } from './routes/revenueRouter.js'
import { employeeScheduleRouter } from './routes/employeeScheduleRoutes.js'
import { loginRouter } from './routes/loginRoutes.js'
import { emailRouter } from './routes/emailRoutes.js'
import { dashboardDataRouter } from './routes/dashboardDataRoutes.js'
import { checkHealthRouter } from './routes/checkHealthRoutes.js'
import { loggedInUserRouter } from './routes/loggedInUserRoutes.js'
import { corsOptions } from './utils/corsOptions.js'


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SESSION_DIR = path.join(__dirname, 'tokens');
const SESSION_FILE = path.join(SESSION_DIR, 'salon-bot.json');
const app = express();
const port = process.env.PORT || 3000;
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
app.use('/api/send-confirmation-email', emailRouter)
app.use('/api/send-whatsapp-confirmation', whatsappRouter )
app.use('/api/health', checkHealthRouter)
app.use('/api/users', userRouter)
app.use('/api/register', registerUserRouter);
app.use('/api/login', loginRouter) 

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

app.get('/auth/google', (req, res, next) => {
  const organizationId = req.query.organization_id;

  passport.authenticate('google', {
    scope: ['profile', 'email'],
    state: organizationId // aqui vai junto no fluxo
  })(req, res, next);
});

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
app.use('/api/employees', appointmentEmployeeRouter);
app.use('/api/available-times', availableTimesRouter); 
app.use('/api/appointments', appointmentsRouter); 
app.use('/api/logado', loggedInUserRouter);
app.use('/api/services', appointmentServicesRouter);
app.use('/api/admin/categories', categoryRouter);
app.use('/api/admin/services', serviceRouter);
app.use('/api/admin/appointments', adminAppointmentRouter); 
app.use('/api/admin/employees', adminEmployeeRouter); 
app.use('/api/employee-services/', employeeServicesRouter) ;
app.use('/api/galeria', galeryRouter);
app.use("/api/schedules", employeeScheduleRouter)
app.use('/api/admin/dashboard', dashboardDataRouter) 
app.use('/api/coupons', couponRouter); 
app.use('/api/admin/revenue', revenueRouter) 

app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});