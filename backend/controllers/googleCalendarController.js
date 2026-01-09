// controllers/googleCalendarController.js
import { google } from "googleapis";
import { supabase } from "../lib/supabase.js";

const {
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_SECRET_KEY,
  GOOGLE_REDIRECT_URI,
  FRONTEND_URL,
} = process.env;

const OAUTH_CLIENT_SECRET = GOOGLE_CLIENT_SECRET || GOOGLE_SECRET_KEY;

if (!GOOGLE_CLIENT_ID || !OAUTH_CLIENT_SECRET || !GOOGLE_REDIRECT_URI) {
  console.warn(
    "[GoogleCalendar] Variáveis de ambiente faltando. Verifique GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET/GOOGLE_SECRET_KEY e GOOGLE_REDIRECT_URI."
  );
}

const SCOPES = [
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/userinfo.email",
  "openid",
];

// =====================================================
// OAuth Client
// =====================================================
function createOAuthClient() {
  return new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    OAUTH_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI
  );
}

// =====================================================
// 1) STATUS – verifica se o USER já conectou seu Google Calendar
// =====================================================
export async function getCalendarStatus(req, res) {
  try {
    const userId = Number(req.query.userId);
    if (!userId) {
      return res.status(400).json({ error: "userId é obrigatório na query string" });
    }

    const { data, error } = await supabase
      .from("organization_google_calendar")
      .select("google_email")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return res.json({ isAuthorized: false });
    }

    return res.json({
      isAuthorized: true,
      email: data.google_email,
    });

  } catch (err) {
    console.error("getCalendarStatus error:", err);
    return res.status(500).json({ error: "Erro ao verificar integração" });
  }
}

// =====================================================
// 2) CONNECT – inicia o OAuth para apenas UM usuário
// =====================================================
export async function connectGoogleCalendar(req, res) {
  try {
    const { slug } = req.params;
    const userId = Number(req.query.userId);

    if (!userId) {
      return res.status(400).json({ error: "userId é obrigatório na query string" });
    }

    const oauth2Client = createOAuthClient();

    // Guardamos apenas slug e userId
    const statePayload = Buffer.from(
      JSON.stringify({ slug, userId }),
      "utf8"
    ).toString("base64url");

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      scope: SCOPES,
      state: statePayload,
      redirect_uri: GOOGLE_REDIRECT_URI,
    });

    return res.redirect(authUrl);

  } catch (err) {
    console.error("connectGoogleCalendar error:", err);
    return res.status(500).json({ error: "Erro ao iniciar OAuth" });
  }
}

// =====================================================
// 3) CALLBACK – salva tokens PARA O USUÁRIO (não mais por organização)
// =====================================================
export async function googleCalendarCallback(req, res) {
  try {
    const { code, state } = req.query;

    if (!code || !state) {
      return res.status(400).send("Missing code or state");
    }

    const decoded = JSON.parse(Buffer.from(state, "base64url").toString("utf8"));
    const { slug, userId } = decoded;

    if (!userId) {
      console.error("googleCalendarCallback: userId ausente no state");
      return res.status(400).send("userId ausente no state");
    }

    const oauth2Client = createOAuthClient();

    const { tokens } = await oauth2Client.getToken({
      code,
      redirect_uri: GOOGLE_REDIRECT_URI,
    });

    oauth2Client.setCredentials(tokens);

    const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
    const { data: userInfo } = await oauth2.userinfo.get();

    const { error } = await supabase
      .from("organization_google_calendar")
      .upsert(
        {
          user_id: userId,
          google_email: userInfo.email,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          token_type: tokens.token_type,
          scope: tokens.scope,
          expiry_date: tokens.expiry_date,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );

    if (error) {
      console.error("Erro ao salvar tokens no Supabase:", error);
      return res.status(500).send("Erro ao conectar Google Calendar. Tente novamente.");
    }

    const frontendBase = FRONTEND_URL || "http://localhost:3001";
    const redirectURL = `${frontendBase}/${slug}/admin?calendar=connected`;

    return res.redirect(redirectURL);

  } catch (err) {
    console.error("googleCalendarCallback error:", err);
    return res.status(500).send("Erro ao finalizar OAuth");
  }
}

// =====================================================
// 4) EVENTS – pega TODOS os eventos pessoais do usuário
// =====================================================
export async function getCalendarEvents(req, res) {
  try {
    const userId = Number(req.query.userId);

    if (!userId) {
      return res.status(400).json({ error: "userId é obrigatório" });
    }

    const { data: integration, error } = await supabase
      .from("organization_google_calendar")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw error;

    if (!integration) {
      return res.status(401).json({ error: "Google Calendar não está conectado" });
    }

    const oauth2Client = createOAuthClient();
    oauth2Client.setCredentials({
      access_token: integration.access_token,
      refresh_token: integration.refresh_token,
      token_type: integration.token_type,
      scope: integration.scope,
      expiry_date: integration.expiry_date,
    });

    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    const timeMin =
      req.query.timeMin ||
      new Date(new Date().setFullYear(new Date().getFullYear() - 1)).toISOString();

    const timeMax =
      req.query.timeMax ||
      new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString();

    const calendars = await calendar.calendarList.list();

    let allEvents = [];

    const validCalendars = calendars.data.items.filter((cal) =>
      cal.primary === true ||
      cal.accessRole === "owner" ||
      cal.accessRole === "writer"
    );

    for (const cal of validCalendars) {
      const { data } = await calendar.events.list({
        calendarId: cal.id,
        timeMin,
        timeMax,
        singleEvents: true,
        orderBy: "startTime",
        maxResults: 2500,
      });

      const events = data.items?.map((ev) => ({
        id: ev.id,
        summary: ev.summary || "Evento",
        start: ev.start?.dateTime || ev.start?.date,
        end: ev.end?.dateTime || ev.end?.date,
        calendarId: cal.id,
      })) ?? [];

      allEvents.push(...events);
    }



    // Atualiza token se Google renovou
    const newCreds = oauth2Client.credentials;
    if (newCreds.access_token && newCreds.access_token !== integration.access_token) {
      await supabase
        .from("organization_google_calendar")
        .update({
          access_token: newCreds.access_token,
          expiry_date: newCreds.expiry_date,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);
    }

    return res.json(allEvents);

  } catch (err) {
    console.error("getCalendarEvents error:", err);
    return res.status(500).json({ error: "Erro ao buscar eventos" });
  }
}

export async function patchCalendarEvent(req, res) {
  try {
    const userId = Number(req.query.userId);
    const { calendarId, eventId } = req.params;
    const updates = req.body || {};

    if (!userId) return res.status(400).json({ error: "userId é obrigatório" });
    if (!calendarId || !eventId) return res.status(400).json({ error: "calendarId e eventId são obrigatórios" });

    const { data: integration, error } = await supabase
      .from("organization_google_calendar")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw error;
    if (!integration) return res.status(401).json({ error: "Google Calendar não está conectado" });

    const oauth2Client = createOAuthClient();
    oauth2Client.setCredentials({
      access_token: integration.access_token,
      refresh_token: integration.refresh_token,
      token_type: integration.token_type,
      scope: integration.scope,
      expiry_date: integration.expiry_date,
    });

    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    const { data } = await calendar.events.patch({
      calendarId,
      eventId,
      requestBody: updates,
    });

    // se o Google renovar token
    const newCreds = oauth2Client.credentials;
    if (newCreds.access_token && newCreds.access_token !== integration.access_token) {
      await supabase
        .from("organization_google_calendar")
        .update({
          access_token: newCreds.access_token,
          expiry_date: newCreds.expiry_date,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);
    }

    return res.json({ ok: true, event: data });
  } catch (err) {
    console.error("patchCalendarEvent error:", err);
    return res.status(500).json({ error: "Erro ao atualizar evento", details: err.message });
  }
}


// =====================================================
// 5) DISCONNECT – remove toda integração do usuário
// =====================================================
export async function disconnectGoogleCalendar(req, res) {
  try {
    const userId = Number(req.query.userId);

    if (!userId) {
      return res.status(400).json({ error: "userId é obrigatório" });
    }

    const { error } = await supabase
      .from("organization_google_calendar")
      .delete()
      .eq("user_id", userId);

    if (error) throw error;

    return res.status(204).send();

  } catch (err) {
    console.error("disconnectGoogleCalendar error:", err);
    return res.status(500).json({ error: "Erro ao desconectar" });
  }
}
