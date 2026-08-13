export const EVOLUTION_WEBHOOK_EVENTS = ["CONNECTION_UPDATE", "QRCODE_UPDATED", "MESSAGES_UPSERT"];

function mergeDefined(previous, next) {
  if (!previous) return { ...next };

  const merged = { ...previous };
  for (const [key, value] of Object.entries(next || {})) {
    if (value !== undefined && value !== null && value !== "") {
      merged[key] = value;
    } else if (!(key in merged)) {
      merged[key] = value;
    }
  }
  return merged;
}

export function buildEvolutionWebhookPayload(webhookUrl) {
  return {
    enabled: true,
    url: webhookUrl,
    events: EVOLUTION_WEBHOOK_EVENTS,
    webhookByEvents: false,
    webhookBase64: true,
  };
}

export function buildEvolutionTextPayload(number, message) {
  return {
    number,
    text: String(message),
  };
}

export function extractEvolutionWebhookConfig(payload) {
  if (!payload || typeof payload !== "object") return null;

  if (payload.url && Array.isArray(payload.events)) {
    return payload;
  }

  if (payload.webhook && typeof payload.webhook === "object") {
    return extractEvolutionWebhookConfig(payload.webhook);
  }

  if (payload.data && typeof payload.data === "object") {
    return extractEvolutionWebhookConfig(payload.data);
  }

  return null;
}

export function extractEvolutionConnectionState(payload) {
  const instance = payload?.instance || payload?.data?.instance || payload?.data || payload;
  return String(
    instance?.state ||
    instance?.status ||
    instance?.connectionStatus?.state ||
    instance?.connectionStatus?.status ||
    ""
  ).toLowerCase();
}

export function dedupeRecordsByKeys(records, keys) {
  const normalizedKeys = Array.isArray(keys) ? keys : [keys];
  const map = new Map();

  for (const record of records || []) {
    const compositeKey = normalizedKeys.map((key) => String(record?.[key] ?? "")).join("::");
    if (!compositeKey) continue;
    map.set(compositeKey, mergeDefined(map.get(compositeKey), record));
  }

  return [...map.values()];
}
