import { supabase } from "../lib/supabase.js";

// formata data no timezone local (BR) sem depender de toISOString()
function formatDateBR(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default async function updateYesterdayAppointmentsToCompleted({ lookbackDays = 2 } = {}) {
  try {
    // Vamos rodar para "ontem" e também "anteontem" (lookbackDays=2)
    const dates = [];
    for (let i = 1; i <= lookbackDays; i++) {
      const dt = new Date();
      dt.setDate(dt.getDate() - i);
      dates.push(formatDateBR(dt));
    }

    const { data, error, count } = await supabase
      .from("appointments")
      .update({ status: "completed" })
      .in("appointment_date", dates)
      .eq("status", "confirmed")
      .select("id", { count: "exact" }); // retorna ids atualizados + count

    if (error) throw error;

    const updatedIds = (data || []).map((x) => x.id);

    return {
      success: true,
      message: `${updatedIds.length} agendamentos atualizados para "completed" (datas: ${dates.join(", ")})`,
      updatedIds,
      count: count ?? updatedIds.length,
      dates,
    };
  } catch (error) {
    console.error("Error updating yesterday appointments:", error);
    return { success: false, error: error.message };
  }
}
