import { supabase } from "../lib/supabase.js";
import { sendWhatsAppMessage } from "../lib/whatsapp.js";

/**
 * Normaliza telefone brasileiro removendo caracteres especiais
 * @param {string} phone - Telefone a normalizar
 * @returns {string} Telefone limpo
 */
function normalizePhone(phone) {
  if (!phone) return null;
  
  // Remove parênteses, espaços, traços e outros caracteres
  const cleaned = phone.replace(/[\s\(\)\-]/g, "");
  
  // Garante que começa com +55
  if (cleaned.startsWith("+55")) {
    return cleaned;
  } else if (cleaned.startsWith("55")) {
    return `+${cleaned}`;
  } else {
    return `+55${cleaned}`;
  }
}

/**
 * Verifica aniversariantes do dia e envia mensagens de felicitações
 */
export default async function sendBirthdayMessages() {
  try {
    const today = new Date();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    
    console.log(`🎂 Verificando aniversariantes do dia ${day}/${month}...`);

    // Busca usuários que fazem aniversário hoje (comparando mês e dia)
    const { data: users, error } = await supabase
      .from("users")
      .select("id, username, phone, aniversario, organization_id")
      .not("aniversario", "is", null)
      .not("phone", "is", null);

    if (error) throw error;

    if (!users || users.length === 0) {
      console.log("Nenhum usuário com data de aniversário cadastrada");
      return { success: true, message: "Nenhum usuário encontrado", sent: 0 };
    }

    // Filtra aniversariantes do dia
    const birthdayUsers = users.filter((user) => {
      if (!user.aniversario) return false;
      
      const [year, userMonth, userDay] = user.aniversario.split("-");
      return userMonth === month && userDay === day;
    });

    if (birthdayUsers.length === 0) {
      console.log(`ℹ️ Nenhum aniversariante encontrado para ${day}/${month}`);
      return { success: true, message: "Nenhum aniversariante hoje", sent: 0 };
    }

    console.log(`🎉 ${birthdayUsers.length} aniversariante(s) encontrado(s)!`);

    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    // Envia mensagem para cada aniversariante
    for (const user of birthdayUsers) {
      try {
        const phone = normalizePhone(user.phone);
        
        if (!phone) {
          console.warn(`⚠️ Telefone inválido para usuário ${user.username} (ID: ${user.id})`);
          errorCount++;
          errors.push({ userId: user.id, error: "Telefone inválido" });
          continue;
        }

        const message = `Parabéns, ${user.username}! 🎉 No dia de hoje, nosso único desejo é que você se sinta cercado de carinho. É um privilégio para nós conhecer sua história e fazer parte do seu dia a dia. Obrigado por ser quem você é. Feliz vida!`;

        console.log(`📤 Enviando mensagem de aniversário para ${user.username} (${phone})...`);

        await sendWhatsAppMessage(phone, message, user.organization_id);

        successCount++;
        console.log(`✅ Mensagem enviada para ${user.username}`);
      } catch (err) {
        errorCount++;
        errors.push({ userId: user.id, username: user.username, error: err.message });
        console.error(`❌ Erro ao enviar para ${user.username}:`, err.message);
      }
    }

    const result = {
      success: true,
      message: `${successCount} mensagem(ns) enviada(s), ${errorCount} erro(s)`,
      sent: successCount,
      errors: errorCount,
      details: errors,
      birthdayCount: birthdayUsers.length,
    };

    console.log(`🎂 Resumo: ${result.message}`);
    return result;
  } catch (error) {
    console.error("❌ Erro ao verificar aniversariantes:", error);
    return { success: false, error: error.message };
  }
}
