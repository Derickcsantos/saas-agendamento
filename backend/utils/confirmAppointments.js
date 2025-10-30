import { supabase } from '../lib/supabase.js';

export default async function updateYesterdayAppointmentsToCompleted() {
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