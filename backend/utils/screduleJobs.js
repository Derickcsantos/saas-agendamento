import cron from 'node-cron';
import updateYesterdayAppointmentsToCompleted from './confirmAppointments.js';
import sendBirthdayMessages from './sendBirthdayMessages.js';
import sendAppointmentReminders from './sendAppointmentReminders.js';

const TZ = "America/Sao_Paulo";

export default function scheduleJob(cronExpr, label) {
  cron.schedule(
    cronExpr,
    async () => {
      console.log(`[CRON ${label}] Executando tarefas diárias...`);

      // Atualiza agendamentos para completed
      const appointmentResult = await updateYesterdayAppointmentsToCompleted({ lookbackDays: 2 });
      if (appointmentResult.success) console.log(`[CRON ${label}] Agendamentos: ${appointmentResult.message}`);
      else console.error(`[CRON ${label}] Erro ao atualizar agendamentos:`, appointmentResult.error);

      // Envia mensagens de aniversário
      const birthdayResult = await sendBirthdayMessages();
      if (birthdayResult.success) console.log(`[CRON ${label}] Aniversários: ${birthdayResult.message}`);
      else console.error(`[CRON ${label}] Erro ao enviar mensagens de aniversário:`, birthdayResult.error);

      // Envia lembretes de agendamentos para amanhã
      const reminderResult = await sendAppointmentReminders();
      if (reminderResult.success) console.log(`[CRON ${label}] Lembretes: ${reminderResult.message}`);
      else console.error(`[CRON ${label}] Erro ao enviar lembretes:`, reminderResult.error);
    },
    { timezone: TZ }
  );
}