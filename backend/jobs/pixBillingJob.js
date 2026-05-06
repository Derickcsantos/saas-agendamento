import { supabase } from "../lib/supabase.js";
import { sendWhatsAppMessage } from "../lib/whatsapp.js";

function startOfDayISO(d = new Date()) {
  const dt = new Date(d);
  dt.setUTCHours(0,0,0,0);
  return dt.toISOString();
}

function endOfDayISO(d = new Date()) {
  const dt = new Date(d);
  dt.setUTCHours(23,59,59,999);
  return dt.toISOString();
}

function addMonth(dateStr) {
  const dt = new Date(dateStr);
  const newDt = new Date(dt);
  newDt.setMonth(newDt.getMonth() + 1);
  return newDt.toISOString();
}

export async function runPixBillingJob() {
  try {
    const todayStart = startOfDayISO();
    const todayEnd = endOfDayISO();

    const { data: subs, error } = await supabase
      .from("subscriptions")
      .select("subscription_id, organization_id, latest_invoice_amount, current_period_start, current_period_end, status")
      .eq("billing_type", "pix")
      .gte("current_period_end", todayStart)
      .lte("current_period_end", todayEnd);

    if (error) {
      console.error("Erro ao buscar subscriptions PIX:", error);
      return;
    }

    if (!subs || subs.length === 0) {
      console.log("pixBillingJob: nenhum subscription PIX vence hoje");
      return;
    }

    console.log(`pixBillingJob: encontradas ${subs.length} assinaturas PIX vencendo hoje`);

    for (const s of subs) {
      try {
        // Buscar organização
        const { data: org, error: orgErr } = await supabase
          .from("organizations")
          .select("id, name, phone")
          .eq("id", s.organization_id)
          .maybeSingle();

        if (orgErr || !org) {
          console.warn("pixBillingJob: organização não encontrada para subscription", s.subscription_id);
          continue;
        }

        // Buscar representante (opcional)
        let repName = null;
        try {
          const { data: representative } = await supabase
            .from("organization_representative")
            .select("user_id")
            .eq("organization_id", org.id)
            .maybeSingle();

          if (representative?.user_id) {
            const { data: user } = await supabase
              .from("users")
              .select("username")
              .eq("id", representative.user_id)
              .maybeSingle();

            repName = user?.username || null;
          }
        } catch (repErr) {
          console.warn("pixBillingJob: falha ao buscar representante:", repErr?.message || repErr);
        }

        const recipientPhone = org.phone;
        if (!recipientPhone) {
          console.warn("pixBillingJob: organização sem telefone, pulando", org.id);
          continue;
        }

        // Escolher link pelo valor
        let payLink = "https://app.abacatepay.com/pay/bill_qEXQ1aTaURwTam3RGbft2jEZ"; // default 9990
        if (Number(s.latest_invoice_amount) === 4990) {
          payLink = "https://app.abacatepay.com/pay/bill_BG3NddrABchFX1B4XYM53Dy3";
        }

        // Nome do mês baseado no current_period_end
        const periodEnd = new Date(s.current_period_end);
        const monthNames = [
          "janeiro","fevereiro","março","abril","maio","junho",
          "julho","agosto","setembro","outubro","novembro","dezembro"
        ];
        const monthName = monthNames[periodEnd.getUTCMonth()];

        const representativeGreeting = repName ? `Olá, ${repName}` : `Olá, ${org.name}`;

        const message = `${representativeGreeting}! 🎉 Parabéns por completar mais um mês na Marcafy. Como você tem se sentido com o seu negócio mais organizado?

Estou passando para compartilhar o link de pagamento referente a ${monthName}.

🔗 Link de pagamento: ${payLink}

Ao confirmar o pagamento, atualizaremos sua assinatura automaticamente. Qualquer dúvida, responda por aqui.`;

        // Enviar usando API key padrão para garantir entrega
        await sendWhatsAppMessage(recipientPhone, message, null, true);

        console.log("pixBillingJob: WhatsApp enviado para org", org.id);

        // Atualizar periodos na tabela subscriptions
        const new_start = s.current_period_end;
        const new_end = addMonth(s.current_period_end);

        const { error: updErr } = await supabase
          .from("subscriptions")
          .update({
            current_period_start: new_start,
            current_period_end: new_end,
            updated_at: new Date().toISOString()
          })
          .eq("subscription_id", s.subscription_id);

        if (updErr) {
          console.error("pixBillingJob: falha ao atualizar subscription", s.subscription_id, updErr);
        } else {
          console.log("pixBillingJob: subscription atualizado", s.subscription_id);
        }

      } catch (innerErr) {
        console.error("pixBillingJob: erro processando subscription", s.subscription_id, innerErr);
      }
    }

  } catch (err) {
    console.error("pixBillingJob erro:", err);
  }
}

export function startPixBillingJob({ intervalMs = 24 * 60 * 60 * 1000 } = {}) {
  // Rodar assim que subir
  runPixBillingJob().catch((e) => console.warn("pixBillingJob inicial falhou:", e?.message || e));

  setInterval(() => {
    runPixBillingJob().catch((e) => console.warn("pixBillingJob falhou:", e?.message || e));
  }, intervalMs);
}
