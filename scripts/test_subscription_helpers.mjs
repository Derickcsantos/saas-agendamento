import { normalizePaymentMode, getVerifiedPaymentMode, asInt } from '../backend/utils/subscriptionHelpers.js';

const cases = [
  { paymentMode: 'debito', cardFunding: 'credit' },
  { paymentMode: 'debito', cardFunding: 'debit' },
  { paymentMode: 'credito', cardFunding: 'debit' },
  { paymentMode: 'any', cardFunding: 'credit' },
  { paymentMode: 'credito', cardFunding: 'debit,credit' },
  { paymentMode: 'debito', cardFunding: 'DEBIT,CREDIT' },
  { paymentMode: 'debito', cardFunding: null },
];

for (const c of cases) {
  const normalized = normalizePaymentMode(c.paymentMode);
  const verified = getVerifiedPaymentMode(c.cardFunding);
  console.log(JSON.stringify({ input: c, normalized, verified }));
}
