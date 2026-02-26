import { supabase } from "../lib/supabase.js";
import { sendWhatsAppMessage } from "../lib/whatsapp.js";
import { normalizePhone } from "./normalizePhone.js";

/**
 * Formata data no padrão brasileiro (DD/MM/YYYY)
 * @param {string} dateStr - Data no formato YYYY-MM-DD
 * @returns {string} Data formatada
 */
function formatDateBR(dateStr) {
  const [year, month, day] = dateStr.split("-");
  return `${day}/${month}/${year}`;
}

/**
 * Formata horário removendo segundos (HH:MM:SS -> HH:MM)
 * @param {string} timeStr - Horário no formato HH:MM:SS
 * @returns {string} Horário formatado
 */
function formatTime(timeStr) {
  if (!timeStr) return "";
  return timeStr.substring(0, 5); // Pega apenas HH:MM
}

/**
 * Verifica se organização tem WhatsApp próprio conectado
 * @param {number} organizationId - ID da organização
 * @returns {Promise<boolean>} true se tem WhatsApp próprio
 */
async function hasOrganizationWhatsApp(organizationId) {
  if (!organizationId) return false;
  
  try {
    const { data, error } = await supabase
      .from("whatsapp_organization")
      .select("whatsapp_api_key")
      .eq("organization_id", organizationId)
      .maybeSingle();
    
    return !error && data?.whatsapp_api_key;
  } catch {
    return false;
  }
}

/**
 * Envia lembretes para agendamentos do dia seguinte (24h depois)
 */
export default async function sendAppointmentReminders() {
  try {
    // Calcula data de amanhã
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0]; // YYYY-MM-DD

    console.log(`📅 Verificando agendamentos para ${tomorrowStr}...`);

    // Busca agendamentos de amanhã com status confirmado
    const { data: appointments, error } = await supabase
      .from("appointments")
      .select(`
        id,
        client_name,
        client_phone,
        appointment_date,
        start_time,
        end_time,
        meeting_url,
        employee_id,
        organization_id,
        organizations (
          name,
          address,
          slug_organization
        )
      `)
      .eq("appointment_date", tomorrowStr)
      .in("status", ["confirmed", "pending"])
      .not("client_phone", "is", null);

    if (error) throw error;

    if (!appointments || appointments.length === 0) {
      console.log(`ℹ️ Nenhum agendamento encontrado para ${tomorrowStr}`);
      return { success: true, message: "Nenhum agendamento para amanhã", sent: 0 };
    }

    console.log(`📋 ${appointments.length} agendamento(s) encontrado(s) para amanhã`);

    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    // Envia lembrete para cada agendamento (cliente)
    for (const appointment of appointments) {
      try {
        const phoneObj = normalizePhone(appointment.client_phone);
        if (!phoneObj) {
          console.warn(`⚠️ Telefone inválido para ${appointment.client_name} (ID: ${appointment.id})`);
          errorCount++;
          errors.push({ appointmentId: appointment.id, error: "Telefone inválido" });
          continue;
        }
        const phone = phoneObj.whatsappPlus;
        const hasOrgWhatsApp = await hasOrganizationWhatsApp(appointment.organization_id);
        const organizationName = appointment.organizations?.name || "nossa equipe";
        const dateBR = formatDateBR(appointment.appointment_date);
        const startTime = formatTime(appointment.start_time);
        const endTime = formatTime(appointment.end_time);
        let message = `Olá, ${appointment.client_name}! 👋\n\n`;
        if (!hasOrgWhatsApp) {
          message += `Este é um lembrete do(a) *${organizationName}* sobre o seu agendamento:\n\n`;
        } else {
          message += `Este é um lembrete sobre o seu agendamento:\n\n`;
        }
        message += `📅 *Data:* ${dateBR}\n`;
        message += `🕐 *Horário:* ${startTime}`;
        if (endTime) {
          message += ` até ${endTime}`;
        }
        message += `\n`;
        if (appointment.meeting_url) {
          message += `\n🔗 *Link da reunião:*\n${appointment.meeting_url}\n`;
        }
        message += `\n🗺️ Endereço: ${appointment.organizations?.address}`;
        message += `\n`;
        message += `\nAguardamos você! 😊`;
        console.log(`📤 Enviando lembrete para ${appointment.client_name} (${phone})...`);
        await sendWhatsAppMessage(phone, message, appointment.organization_id);
        successCount++;
        console.log(`✅ Lembrete enviado para ${appointment.client_name}`);
      } catch (err) {
        errorCount++;
        errors.push({ appointmentId: appointment.id, clientName: appointment.client_name, error: err.message });
        console.error(`❌ Erro ao enviar para ${appointment.client_name}:`, err.message);
      }
    }

    // Agrupa appointments por employee_id
    const employeeAppointmentsMap = {};
    for (const appointment of appointments) {
      if (!appointment.employee_id) continue;
      if (!employeeAppointmentsMap[appointment.employee_id]) {
        employeeAppointmentsMap[appointment.employee_id] = [];
      }
      employeeAppointmentsMap[appointment.employee_id].push(appointment);
    }

    // Para cada funcionário, envia lembrete para cada appointment, aguardando 5 segundos entre cada
    for (const employeeId in employeeAppointmentsMap) {
      // Busca dados do funcionário
      let employee;
      try {
        const { data, error } = await supabase
          .from("employees")
          .select("name, phone")
          .eq("id", employeeId)
          .maybeSingle();
        if (error) throw error;
        if (!data || !data.phone) {
          console.warn(`⚠️ Funcionário não encontrado ou sem telefone (ID: ${employeeId})`);
          errors.push({ employeeId, error: "Funcionário não encontrado ou sem telefone" });
          continue;
        }
        employee = data;
      } catch (err) {
        errorCount++;
        errors.push({ employeeId, error: err.message });
        console.error(`❌ Erro ao buscar funcionário (ID: ${employeeId}):`, err.message);
        continue;
      }

      // Envia lembrete para cada appointment do funcionário
      for (const appointment of employeeAppointmentsMap[employeeId]) {
        try {
          let employeeMessage = `Olá, ${employee.name}! 👋\n\n`;
          employeeMessage += `Você tem um agendamento confirmado para amanhã:\n\n`;
          employeeMessage += `👤 Cliente: ${appointment.client_name}\n`;
          employeeMessage += `📅 Data: ${formatDateBR(appointment.appointment_date)}\n`;
          employeeMessage += `🕐 Horário: ${formatTime(appointment.start_time)}`;
          if (appointment.end_time) {
            employeeMessage += ` até ${formatTime(appointment.end_time)}`;
          }
          employeeMessage += `\n`;
          if (appointment.meeting_url) {
            employeeMessage += `\n🔗 Link da reunião:\n${appointment.meeting_url}\n`;
          }
          employeeMessage += `\n🗺️ Endereço: ${appointment.organizations?.address}`;
          employeeMessage += `\n`;
          employeeMessage += `\nPrepare-se para atender o cliente! 😊`;
          await sendWhatsAppMessage(employee.phone, employeeMessage, appointment.organization_id);
          console.log(`✅ Lembrete enviado para funcionário ${employee.name} (appointment ${appointment.id})`);
          await new Promise(resolve => setTimeout(resolve, 5000));
        } catch (err) {
          errorCount++;
          errors.push({ appointmentId: appointment.id, employeeId, error: err.message });
          console.error(`❌ Erro ao enviar para funcionário (ID: ${employeeId}, appointment ${appointment.id}):`, err.message);
        }
      }
    }

    const result = {
      success: true,
      message: `${successCount} lembrete(s) enviado(s), ${errorCount} erro(s)`,
      sent: successCount,
      errors: errorCount,
      details: errors,
      appointmentCount: appointments.length,
      date: tomorrowStr,
    };

    console.log(`📅 Resumo: ${result.message}`);
    return result;
  } catch (error) {
    console.error("❌ Erro ao enviar lembretes de agendamento:", error);
    return { success: false, error: error.message };
  }
}
