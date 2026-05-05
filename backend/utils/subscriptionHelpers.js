export const asInt = (v, d) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};

export const normalizePaymentMode = (value) => {
  const normalized = String(value || "").trim().toLowerCase();
  if (["credit", "credito", "crédito"].includes(normalized)) return "credit";
  if (["debit", "debito", "débito"].includes(normalized)) return "debit";
  return "any";
};

export const getVerifiedPaymentMode = (funding) => {
  if (!funding) return null;
  const f = String(funding).toLowerCase();
  if (f.includes("debit")) return "debit";
  if (f.includes("credit")) return "credit";
  return null;
};
