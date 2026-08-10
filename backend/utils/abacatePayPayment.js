export function parseAbacatePayPaidEvent(payload = {}) {
  const data = payload?.data || {};
  const resource = data?.transparent || data?.billing || data?.payment ||
    (data?.id || data?.status ? data : null) || payload;
  const event = String(payload?.event || "").toLowerCase();
  const status = String(resource?.status || payload?.status || "").toUpperCase();

  return {
    externalId: resource?.id || data?.payment?.id || null,
    internalId: resource?.externalId || data?.billing?.externalId || null,
    isPaid: status === "PAID" || ["billing.paid", "transparent.completed", "checkout.completed"].includes(event),
  };
}

export async function checkAbacatePayPixStatus(externalId, axiosClient) {
  if (!externalId) return null;
  const response = await axiosClient.get(`${process.env.ABACATEPAY_BASE_URL}/v1/pixQrCode/check`, {
    params: { id: externalId },
    headers: { Authorization: `Bearer ${process.env.ABACATEPAY_API_KEY}` },
    timeout: 8000,
  });
  return String(response.data?.data?.status || response.data?.status || "").toUpperCase();
}
