import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import cron from 'node-cron';
import setupSwagger from './swagger.js';
import { categoryRouter } from './routes/categoryRoutes.js';
import { userRouter } from './routes/userRoutes.js';
import { forgotPasswordRouter } from './routes/forgotPasswordRoutes.js';
import { verifyUserRouter } from './routes/verifyUserRoutes.js';
import { couponRouter } from './routes/couponRoutes.js';
import { serviceRouter } from './routes/ServiceRoutes.js';
import updateYesterdayAppointmentsToCompleted from './utils/confirmAppointments.js';
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
import { userRepresentativeRouter } from './routes/userRepresentativeRoutes.js';
import { plansRouter } from "./routes/plansRoutes.js";
import { subscriptionsRouter } from "./routes/subscriptionRoutes.js";
import { googleCalendarRouter } from './routes/googleCalendarRoutes.js';
import { marcafyMarketingRouter } from './routes/geminiMarcafyMarketingRoutes.js';
import { marcafyInstagramStatsRouter } from './routes/marcafyInstagramStatsRoutes.js';
import { closedPeriodsRouter } from './routes/closedPeriodsRoutes.js';
import { calendarColorsRouter } from './routes/calendarColorsRoutes.js';
import { whatsappOrganizationRouter } from './routes/whatsappOrganizationRoutes.js';
import { clientRouter } from './routes/clientRoutes.js';
// import { sendWhatsappRouter } from "./routes/sendWhatsappRoutes.js";

const app = express();
const port = process.env.PORT || 3000;

app.set("trust proxy", 1);

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

setupSwagger(app)

app.use(passport.initialize());

const TZ = "America/Sao_Paulo";

function scheduleJob(cronExpr, label) {
  cron.schedule(
    cronExpr,
    async () => {
      console.log(`[CRON ${label}] Executando atualização diária de agendamentos...`);

      // Se você atualizou sua função para aceitar lookbackDays:
      const result = await updateYesterdayAppointmentsToCompleted({ lookbackDays: 2 });

      // Se sua função AINDA não aceita params, use:
      // const result = await updateYesterdayAppointmentsToCompleted();

      if (result.success) console.log(`[CRON ${label}] ${result.message}`);
      else console.error(`[CRON ${label}] Erro na tarefa agendada:`, result.error);
    },
    { timezone: TZ }
  );
}

scheduleJob("0 0 * * *", "00:00");
scheduleJob("0 3 * * *", "03:00");
scheduleJob("0 8 * * *", "08:00");


app.get('/', (req, res) => res.status(200).json({message: 'Servidor rodando'}));
app.use('/api/appointments', appointmentProcessRouter);
app.use('/api/forgot-password', forgotPasswordRouter) 
app.use('/api/send-confirmation-email', emailRouter)
app.use('/api/users', userRouter)
app.use('/api/register', registerUserRouter);
app.use('/api/login', loginRouter) 
app.use('/auth/google', googleRouter);
app.use('/api/verifica-usuario', verifyUserRouter); 
app.use('/api/appointments', appointmentsRouter); 
app.use('/api/minha-conta', loggedInUserRouter);
app.use('/api/admin/categories', categoryRouter);
app.use('/api/admin/services', serviceRouter);
app.use('/api/admin/appointments', adminAppointmentRouter); 
app.use('/api/admin/employees', adminEmployeeRouter); 
app.use('/api/employee-services/', employeeServicesRouter) ;
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
app.use('/api/representative-organization', userRepresentativeRouter)
app.use("/api/plans", plansRouter);
app.use("/api/subscriptions", subscriptionsRouter);
app.use('/api/google-calendar', googleCalendarRouter)
app.use('/api/marketing/instagram/marcafy', marcafyMarketingRouter)
app.use('/api/marcafy-instagram', marcafyInstagramStatsRouter)
app.use('/api/closed-periods', closedPeriodsRouter);
app.use('/api/calendar-colors', calendarColorsRouter);
app.use('/api/whatsapp-organization', whatsappOrganizationRouter);
app.use('/api/clients', clientRouter)
// app.use("/api/whatsapp-send", sendWhatsappRouter);

app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});