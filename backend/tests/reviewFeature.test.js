import test from "node:test";
import assert from "node:assert/strict";
import { hasValidReviewMediaSignature } from "../utils/reviewMedia.js";
import { localAppointmentEnd } from "../utils/reviewSchedule.js";

test("calculates the appointment end in the organization timezone", () => {
  const end = localAppointmentEnd({ appointment_date: "2026-08-10", end_time: "11:00:00" }, "America/Sao_Paulo");
  assert.equal(end.toISOString(), "2026-08-10T14:00:00.000Z");
  assert.equal(new Date(end.getTime() + 3 * 60 * 60 * 1000).toISOString(), "2026-08-10T17:00:00.000Z");
});

test("validates media by signature instead of trusting MIME alone", () => {
  const validPng = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), Buffer.alloc(8)]);
  assert.equal(hasValidReviewMediaSignature({ mimetype: "image/png", buffer: validPng }), true);
  assert.equal(hasValidReviewMediaSignature({ mimetype: "image/png", buffer: Buffer.from("not an image") }), false);
});
