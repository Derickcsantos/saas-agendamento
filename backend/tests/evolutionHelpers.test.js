import test from "node:test";
import assert from "node:assert/strict";
import {
  buildEvolutionWebhookPayload,
  buildEvolutionTextPayload,
  dedupeRecordsByKeys,
  extractEvolutionConnectionState,
  extractEvolutionWebhookConfig,
} from "../utils/evolution.js";

test("builds the sendText payload with text at the top level", () => {
  const payload = buildEvolutionTextPayload("5511986261007", "Mensagem de confirmacao");

  assert.deepEqual(payload, {
    number: "5511986261007",
    text: "Mensagem de confirmacao",
  });
  assert.equal("textMessage" in payload, false);
});

test("builds the webhook payload using Evolution camelCase fields", () => {
  const payload = buildEvolutionWebhookPayload("https://api.marcafy.com.br/whatsapp/evolution/webhook");

  assert.equal(payload.enabled, true);
  assert.equal(payload.url, "https://api.marcafy.com.br/whatsapp/evolution/webhook");
  assert.equal(payload.webhookByEvents, false);
  assert.equal(payload.webhookBase64, true);
  assert.deepEqual(payload.events, ["CONNECTION_UPDATE", "QRCODE_UPDATED", "MESSAGES_UPSERT"]);
  assert.equal("webhook_by_events" in payload, false);
  assert.equal("base64" in payload, false);
});

test("deduplicates contact upserts by conflict key without losing populated fields", () => {
  const deduped = dedupeRecordsByKeys(
    [
      {
        organization_id: "org-1",
        phone_contact: "5511999999999",
        whatsapp_jid: "5511999999999@s.whatsapp.net",
        name_contact: "Derick",
        image_contact: null,
      },
      {
        organization_id: "org-1",
        phone_contact: "5511999999999",
        whatsapp_jid: null,
        name_contact: null,
        image_contact: "https://cdn.example.com/avatar.png",
      },
    ],
    ["organization_id", "phone_contact"]
  );

  assert.equal(deduped.length, 1);
  assert.deepEqual(deduped[0], {
    organization_id: "org-1",
    phone_contact: "5511999999999",
    whatsapp_jid: "5511999999999@s.whatsapp.net",
    name_contact: "Derick",
    image_contact: "https://cdn.example.com/avatar.png",
  });
});

test("extracts the configured webhook from nested Evolution responses", () => {
  const config = extractEvolutionWebhookConfig({
    webhook: {
      instanceName: "instancia-teste",
      webhook: {
        enabled: true,
        url: "https://api.marcafy.com.br/whatsapp/evolution/webhook",
        events: ["CONNECTION_UPDATE"],
      },
    },
  });

  assert.deepEqual(config, {
    enabled: true,
    url: "https://api.marcafy.com.br/whatsapp/evolution/webhook",
    events: ["CONNECTION_UPDATE"],
  });
});

test("reads connection state from the official Evolution payload shape", () => {
  assert.equal(
    extractEvolutionConnectionState({
      instance: {
        instanceName: "instancia-teste",
        state: "open",
      },
    }),
    "open"
  );
});
