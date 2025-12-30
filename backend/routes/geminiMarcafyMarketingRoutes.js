import { Router } from "express";
import multer from "multer";
import { generateMarcafyInstagramCaption } from "../controllers/geminiMarcafyMarketingController.js";

export const marcafyMarketingRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    files: 3,
    fileSize: 6 * 1024 * 1024, 
  },
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.mimetype)) {
      return cb(
        new Error("Formato inválido. Envie JPG, PNG ou WEBP."),
        false
      );
    }
    cb(null, true);
  },
});

/**
 * @swagger
 * tags:
 *   - name: Marcafy Marketing (Gemini)
 *     description: Endpoints de IA (Google Gemini) exclusivos para marketing da Marcafy.
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     MarcafyConversationMessage:
 *       type: object
 *       additionalProperties: false
 *       properties:
 *         role:
 *           type: string
 *           description: Papel da mensagem no histórico.
 *           enum: [user, assistant]
 *           example: user
 *         content:
 *           type: string
 *           description: Conteúdo textual da mensagem.
 *           example: "Preciso de uma legenda para um post sobre agendamento online."
 *       required: [role, content]
 *
 *     MarcafyInstagramCaptionResponse:
 *       type: object
 *       additionalProperties: false
 *       properties:
 *         caption:
 *           type: string
 *           description: Legenda final, pronta para Instagram (PT-BR).
 *           example: "🚀 Organize seus atendimentos e ganhe tempo no dia a dia! ..."
 *         cta:
 *           type: string
 *           description: CTA curto e direto com foco em conversão (site + opcional WhatsApp).
 *           example: "Acesse www.marcafy.com.br e comece hoje. Quer ajuda? Chame no WhatsApp 11953404003."
 *         hashtags:
 *           type: array
 *           items:
 *             type: string
 *           description: 10 a 20 hashtags relevantes.
 *           example: ["#marcafy", "#agendamentoonline", "#gestaodeagenda"]
 *         tone:
 *           type: string
 *           description: "Tom sugerido da legenda ex profissional, descontraído, premium."
 *           example: "profissional e persuasivo"
 *         best_post_time_suggestion:
 *           type: string
 *           description: Sugestão de melhor horário/slot para postar.
 *           example: "Entre 18:00 e 20:30 (dias úteis), quando profissionais encerram atendimentos."
 *         notes:
 *           type: string
 *           description: "Observações estratégicas (ex.: variação A/B, dica de criativo, etc.)."
 *           example: "Teste também uma versão com pergunta no 1º parágrafo para aumentar comentários."
 *       required: [caption, cta, hashtags, tone, best_post_time_suggestion, notes]
 *
 *     MarcafyGenerateCaptionSuccess:
 *       type: object
 *       additionalProperties: false
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         model:
 *           type: string
 *           example: "gemini-1.5-flash"
 *         input:
 *           type: object
 *           additionalProperties: false
 *           properties:
 *             slug:
 *               type: string
 *               example: "marcafy"
 *             hasImages:
 *               type: boolean
 *               example: true
 *             imagesCount:
 *               type: integer
 *               example: 2
 *             hasContext:
 *               type: boolean
 *               example: true
 *             messagesCount:
 *               type: integer
 *               example: 4
 *           required: [slug, hasImages, imagesCount, hasContext, messagesCount]
 *         data:
 *           $ref: "#/components/schemas/MarcafyInstagramCaptionResponse"
 *       required: [success, model, input, data]
 *
 *     ApiError:
 *       type: object
 *       properties:
 *         error:
 *           type: string
 *           example: "Internal server error"
 *         message:
 *           type: string
 *           example: "Detalhe do erro"
 */

/**
 * @swagger
 * /api/marketing/instagram/marcafy/ai/gemini:
 *   post:
 *     summary: Gera legenda para Instagram da Marcafy usando Google Gemini (até 3 imagens + contexto + conversa)
 *     description: |
 *       Endpoint **exclusivo para marketing da Marcafy**.
 *
 *       A IA:
 *       - Analisa **até 3 imagens** (upload)
 *       - Lê um **contexto** (texto livre)
 *       - Considera **mensagens anteriores** (histórico da conversa)
 *       - Retorna uma legenda persuasiva com **CTA para www.marcafy.com.br**, incentivo a comentar/curtir/seguir
 *         e, quando fizer sentido, sugere contato no WhatsApp **11953404003**.
 *
 *       Instagram oficial: https://www.instagram.com/marcafy.oficial/
 *     tags:
 *       - Marcafy Marketing (Gemini)
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               context:
 *                 type: string
 *                 description: Contexto do post (tema, objetivo, oferta, público, data comemorativa, etc.).
 *                 example: "Post para atrair profissionais autônomos (barbeiros e manicures) para testar agendamento online."
 *               messages:
 *                 description: |
 *                   Histórico da conversa em JSON (array). **No multipart/form-data, envie como string JSON**.
 *                   Exemplo: [{"role":"user","content":"..."}]
 *                 type: string
 *                 example: '[{"role":"user","content":"Quero um post sobre agenda organizada."},{"role":"assistant","content":"Perfeito, qual público?"}]'
 *               images:
 *                 type: array
 *                 description: Até 3 imagens (JPG/PNG/WEBP).
 *                 items:
 *                   type: string
 *                   format: binary
 *             required: []
 *     responses:
 *       200:
 *         description: Legenda gerada com sucesso.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/MarcafyGenerateCaptionSuccess"
 *       400:
 *         description: "Erro de validação (ex.: mais de 3 imagens, payload vazio, etc.)."
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ApiError"
 *       502:
 *         description: Resposta inválida do Gemini (não retornou JSON no padrão).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ApiError"
 *       500:
 *         description: Erro interno.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ApiError"
 */
marcafyMarketingRouter.post("/", upload.array("images", 3), generateMarcafyInstagramCaption);