import test from "node:test";
import assert from "node:assert/strict";
import { parseAbacatePayPaidEvent } from "../utils/abacatePayPayment.js";

test("parses the current billing.paid payload", () => {
  assert.deepEqual(
    parseAbacatePayPaidEvent({
      event: "billing.paid",
      data: { billing: { id: "pix_123", externalId: "tx_123", status: "PAID" } },
    }),
    { externalId: "pix_123", internalId: "tx_123", isPaid: true }
  );
});

test("keeps compatibility with the legacy flat payload", () => {
  assert.deepEqual(parseAbacatePayPaidEvent({ id: "pix_legacy", status: "paid" }), {
    externalId: "pix_legacy",
    internalId: null,
    isPaid: true,
  });
});

test("does not confirm pending events", () => {
  assert.equal(
    parseAbacatePayPaidEvent({ event: "billing.created", data: { id: "pix_123", status: "PENDING" } }).isPaid,
    false
  );
});
