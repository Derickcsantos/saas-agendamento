import sharp from "sharp";
import { GoogleGenerativeAI } from "@google/generative-ai";

const MARCAFY_SYSTEM_PROMPT = `
Você será um assistente de postagem para o instagram, seu trabalho será analisar as imagens, o contexto e gerar uma legenda para os posts do instagram, garantindo uma cta atrativa, persuasiva, e que engaje o publico, direcionando-os para o site www.marcafy.com.br, engajando o publico a comentar, curtir e seguir.
`;

const MARCAFY_RULES = `
Você está criando legendas APENAS para a empresa Marcafy (plataforma de agendamentos online e gestão empresarial completa para profissionais de serviço).
Instagram oficial: https://www.instagram.com/marcafy.oficial/
WhatsApp: 11953404003
Site: www.marcafy.com.br

Requisitos de saída:
1) Retorne APENAS um JSON válido (sem markdown, sem texto fora do JSON).
2) O JSON deve seguir exatamente o schema:
{
  "caption": "string",
  "cta": "string",
  "hashtags": ["string"],
  "tone": "string",
  "best_post_time_suggestion": "string",
  "notes": "string"
}

Diretrizes de copy:
- Escreva em português do Brasil.
- CTA deve levar ao site (www.marcafy.com.br) e também sugerir falar no WhatsApp (11953404003) quando fizer sentido.
- Incentive comentar, curtir e seguir (@marcafy.oficial).
- Evite promessas irreais (ex.: "garante X% de vendas").
- Seja bem persuasivo e voltado a conversão.
- Se não houver imagens, foque no contexto e mensagens.
- Nossa plataforma oferece site customizável, página para o cliente, página para o profissional, link de agendamento, painel administrativo, galeria, gerenciamento de cupons, gerenciamento de escala de trabalho, gerenciamento de serviços dos profissionais, integração com google calendário, integração com google meet, visualização de receita e muito mais. Use como base quando precisar.
- Se houver imagens, descreva o que vê de forma sutil na legenda (sem inventar detalhes).
- Inclua emojis moderados (não exagerar).
- Hashtags: 10 a 20 (misture nicho + intenção + marca).
`;

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY não configurada no .env");
  }
  return new GoogleGenerativeAI(apiKey);
}

async function filesToGeminiInlineParts(files = []) {
  const selected = (files || []).slice(0, 3);

  const parts = [];
  for (const file of selected) {
    if (!file?.buffer) continue;

    const webpBuffer = await sharp(file.buffer)
      .rotate()
      .resize({ width: 1200, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();

    const base64 = webpBuffer.toString("base64");

    parts.push({
      inlineData: {
        mimeType: "image/webp",
        data: base64,
      },
    });
  }

  return parts;
}

function normalizeConversation(messages = []) {
  if (!Array.isArray(messages)) return [];

  return messages
    .slice(-20) 
    .map((m) => ({
      role: m?.role === "assistant" ? "assistant" : "user",
      content: String(m?.content || "").trim(),
    }))
    .filter((m) => m.content.length > 0);
}

export async function generateMarcafyInstagramCaption(req, res) {
  try {
    const context = String(req.body?.context || "").trim();

    let messages = req.body?.messages;

    if (typeof messages === "string") {
      try {
        messages = JSON.parse(messages);
      } catch {
        messages = [];
      }
    }

    if (!Array.isArray(messages)) messages = [];
    const conversation = normalizeConversation(messages);

    const files = Array.isArray(req.files) ? req.files : [];
    if (files.length > 3) {
      return res.status(400).json({
        error: "Limite excedido",
        message: "Envie no máximo 3 imagens.",
      });
    }

    if (!context && conversation.length === 0 && files.length === 0) {
      return res.status(400).json({
        error: "Conteúdo insuficiente",
        message:
          "Envie ao menos um dos itens: context, messages ou images (até 3).",
      });
    }

    const genAI = getGeminiClient();
    const modelName = process.env.GEMINI_MODEL || "gemini-2.0-flash";
    const model = genAI.getGenerativeModel({ model: modelName });

    const imageParts = await filesToGeminiInlineParts(files);

    const conversationText =
      conversation.length > 0
        ? conversation
            .map((m, i) => `#${i + 1} (${m.role}): ${m.content}`)
            .join("\n")
        : "Sem mensagens anteriores.";

    const inputText = `
Empresa/Organização: Marcafy

Contexto do post (do usuário):
${context || "Sem contexto adicional."}

Mensagens da conversa (histórico):
${conversationText}

Tarefa:
Gere uma legenda para Instagram da Marcafy seguindo TODAS as regras.
`.trim();

    const parts = [
      { text: MARCAFY_SYSTEM_PROMPT.trim() },
      { text: MARCAFY_RULES.trim() },
      { text: inputText },
      ...imageParts,
    ];

    const result = await model.generateContent(parts);
    const text = result?.response?.text?.() || "";

    let parsed = null;

    try {
      parsed = JSON.parse(text);
    } catch {

      const match = text.match(/\{[\s\S]*\}/);
      if (match?.[0]) {
        try {
          parsed = JSON.parse(match[0]);
        } catch {
          parsed = null;
        }
      }
    }

    if (!parsed) {
      return res.status(502).json({
        error: "Resposta inválida do Gemini",
        message: "Não foi possível obter JSON válido.",
        raw: text,
      });
    }

    if (
      typeof parsed.caption !== "string" ||
      typeof parsed.cta !== "string" ||
      !Array.isArray(parsed.hashtags)
    ) {
      return res.status(502).json({
        error: "JSON fora do padrão",
        message: "O Gemini retornou um JSON que não segue o schema esperado.",
        raw: parsed,
      });
    }

    return res.status(200).json({
      success: true,
      organization: "marcafy",
      model: modelName,
      input: {
        hasImages: files.length > 0,
        imagesCount: files.length,
        hasContext: Boolean(context),
        messagesCount: conversation.length,
      },
      data: parsed,
    });
  } catch (error) {
    console.error("Gemini generateMarcafyInstagramCaption error:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: error?.message || "Erro desconhecido",
    });
  }
}

