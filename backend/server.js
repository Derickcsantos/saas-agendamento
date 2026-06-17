import dotenv from 'dotenv';
dotenv.config();

// Validar variáveis de ambiente ANTES de importar anything
import { validateEnvironment } from './utils/validateEnv.js';
validateEnvironment();

import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import setupSwagger from './swagger.js';
import { categoryRouter } from './routes/categoryRoutes.js';
import { userRouter } from './routes/userRoutes.js';
import { forgotPasswordRouter } from './routes/forgotPasswordRoutes.js';
import { verifyUserRouter } from './routes/verifyUserRoutes.js';
import { couponRouter } from './routes/couponRoutes.js';
import { serviceRouter } from './routes/ServiceRoutes.js';
import { registerUserRouter } from './routes/registerUserRoutes.js';
import { appointmentsRouter } from './routes/appointmentsRoutes.js'
import { adminAppointmentRouter } from './routes/adminAppointmentRoutes.js';
import { adminEmployeeRouter } from './routes/adminEmployeeRoutes.js';
import { employeeServicesRouter } from './routes/employeeServicesRoutes.js';
import { galleryRouter } from './routes/galleryRoutes.js';
import { revenueRouter } from './routes/revenueRouter.js'
import { employeeScheduleRouter } from './routes/employeeScheduleRoutes.js'
import { loginRouter } from './routes/loginRoutes.js'
import { emailRouter } from './routes/emailRoutes.js'
import { dashboardDataRouter } from './routes/dashboardDataRoutes.js'
import { loggedInUserRouter } from './routes/loggedInUserRoutes.js';
import { corsOptions } from './utils/corsOptions.js';
import { googleRouter } from './routes/googleRoutes.js';
import { landingPageRouter } from './routes/landingPagesRoutes.js';
import { authRouter } from './routes/authRoutes.js';
import { organizationRouter } from './routes/organizationRoutes.js';
import passport from './lib/passport.js';
import { organizationColorsRouter } from './routes/organizationColorsRoutes.js';
import { appointmentProcessRouter } from './routes/appointmentsProcessRoutes.js';
import { organizationPoliciesRouter } from "./routes/organizationPoliciesRoutes.js";
import { pagarmeRouter } from './routes/pagarmeRoutes.js';
import { stripeRouter } from './routes/stripeRoutes.js';
import { userRepresentativeRouter } from './routes/userRepresentativeRoutes.js';
import { plansRouter } from "./routes/plansRoutes.js";
import { subscriptionsRouter } from "./routes/subscriptionRoutes.js";
import { googleCalendarRouter } from './routes/googleCalendarRoutes.js';
import { marcafyMarketingRouter } from './routes/geminiMarcafyMarketingRoutes.js';
import { marcafyInstagramStatsRouter } from './routes/marcafyInstagramStatsRoutes.js';
import { closedPeriodsRouter } from './routes/closedPeriodsRoutes.js';
import { calendarColorsRouter } from './routes/calendarColorsRoutes.js';
import { employeeCalendarColorsRouter } from './routes/employeeCalendarColorsRoutes.js';
import { whatsappOrganizationRouter } from './routes/whatsappOrganizationRoutes.js';
import { clientRouter } from './routes/clientRoutes.js';
import { organizationsPaymentsRouter } from './routes/organizationsPaymentsRoutes.js';
import { expensesRouter } from './routes/expensesRoutes.js';
import queueRouter from './routes/queueRoutes.js';
import { userInvitesRouter } from './routes/userInvitesRoutes.js';
import { organizationSubscriptionsRouter } from './routes/organizationSubscriptionsRoutes.js';
import scheduleJob from './utils/screduleJobs.js';
import { startUnavailableDaysCacheJob } from './utils/unavailableDaysCacheJob.js';
import { startPixBillingJob } from './jobs/pixBillingJob.js';
import QueueWebSocketManager from './lib/websocket.js';
import http from 'http';
import { salariesRouter } from './routes/salaryRoutes.js';
import { employeeIntervalsRouter } from './routes/employeeIntervalsRoutes.js';
import { receiveEvolutionWebhook } from './controllers/whatsappOrganizationController.js';

const app = express();
const port = process.env.PORT || 3000;

// Criar servidor HTTP para suportar WebSocket
const server = http.createServer(app);

// Inicializar WebSocket Manager com error handling
let queueWebSocket = null;
try {
  queueWebSocket = new QueueWebSocketManager(server);
  console.log('✅ WebSocket Manager inicializado com sucesso');
} catch (error) {
  console.error('❌ Erro ao inicializar WebSocket Manager:', error.message);
  console.warn('⚠️  WebSocket desabilitado - fila em tempo real não funcionará');
  queueWebSocket = null;
}

export { queueWebSocket };

app.set("trust proxy", 1);

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

setupSwagger(app)

app.use(passport.initialize());

// Inicializar jobs com error handling
console.log('\n📋 Inicializando tarefas agendadas...');

try {
  scheduleJob("0 8 * * *", "08:00");
  console.log('✅ CRON diário (08:00) - Agendado');
} catch (error) {
  console.error('❌ Erro ao agendar CRON diário:', error.message);
}

try {
  startUnavailableDaysCacheJob({ intervalMs: 180000 });
  console.log('✅ Cache de dias indisponíveis - Iniciado (a cada 3 min)');
} catch (error) {
  console.error('❌ Erro ao iniciar cache de dias indisponíveis:', error.message);
}

try {
  startPixBillingJob({ intervalMs: 24 * 60 * 60 * 1000 });
  console.log('✅ Faturamento PIX - Agendado (a cada 24h)');
} catch (error) {
  console.error('❌ Erro ao iniciar faturamento PIX:', error.message);
}

console.log('📋 Tarefas agendadas inicializadas\n');

app.get('/', (req, res) => res.status(200).json({message: 'Servidor rodando'}));
app.post('/whatsapp/evolution/webhook', receiveEvolutionWebhook);

app.use('/api/appointments', appointmentProcessRouter);
app.use('/api/forgot-password', forgotPasswordRouter) 
app.use('/api/send-confirmation-email', emailRouter)
app.use('/api/users', userRouter)
app.use('/api/register', registerUserRouter);
app.use('/api/login', loginRouter);
app.use('/auth/google', googleRouter);
app.use('/api/verifica-usuario', verifyUserRouter); 
app.use('/api/appointments', appointmentsRouter);
app.use('/api/minha-conta', loggedInUserRouter);
app.use('/api/admin/categories', categoryRouter);
app.use('/api/admin/services', serviceRouter);
app.use('/api/admin/appointments', adminAppointmentRouter); 
app.use('/api/admin/employees', adminEmployeeRouter); 
app.use('/api/employee-services/', employeeServicesRouter);
app.use('/api/admin/galeria', galleryRouter);
app.use("/api/schedules", employeeScheduleRouter)
app.use('/api/admin/dashboard', dashboardDataRouter) 
app.use('/api/coupons', couponRouter);
app.use('/api/admin/revenue', revenueRouter)
app.use('/api/landing-page', landingPageRouter)
app.use('/api/auth', authRouter)
app.use('/api/organizations', organizationRouter)
app.use('/api/organization-colors', organizationColorsRouter)
app.use("/api/organization-policies", organizationPoliciesRouter);
app.use('/api/pagarme', pagarmeRouter)
app.use('/api/stripe', stripeRouter)
app.use('/api/representative-organization', userRepresentativeRouter)
app.use("/api/plans", plansRouter);
app.use("/api/subscriptions", subscriptionsRouter);
app.use('/api/google-calendar', googleCalendarRouter)
app.use('/api/marketing/instagram/marcafy', marcafyMarketingRouter)
app.use('/api/marcafy-instagram', marcafyInstagramStatsRouter)
app.use('/api/closed-periods', closedPeriodsRouter);
app.use('/api/calendar-colors', calendarColorsRouter);
app.use('/api/employee-calendar-colors', employeeCalendarColorsRouter);
app.use('/api/whatsapp-organization', whatsappOrganizationRouter);
app.use('/api/clients', clientRouter)
app.use('/api/payments', organizationsPaymentsRouter)
app.use('/api/admin/expenses', expensesRouter)
app.use('/api/queues', queueRouter)
app.use('/api/user-invites', userInvitesRouter)
app.use('/api/organization-subscriptions', organizationSubscriptionsRouter)
app.use('/api/salaries', salariesRouter)
app.use('/api/employee-intervals', employeeIntervalsRouter)
// app.use("/api/whatsapp-send", sendWhatsappRouter);

// Error handler para não capturados
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Promise rejeitada não tratada:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Erro não capturado:', error);
  process.exit(1);
});

server.listen(port, () => {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 SERVIDOR INICIADO COM SUCESSO');
  console.log('='.repeat(60));
  console.log(`📍 API disponível em: http://localhost:${port}`);
  console.log(`📍 WebSocket disponível em: ws://localhost:${port}`);
  if (queueWebSocket) {
    console.log(`✅ Fila em tempo real: HABILITADA`);
  } else {
    console.log(`⚠️  Fila em tempo real: DESABILITADA`);
  }
  console.log('='.repeat(60) + '\n');
});
