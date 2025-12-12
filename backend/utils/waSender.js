import axios from "axios";

export async function sendWhatsappMessage(phone, message) {
  await axios.post(
    `${process.env.WASENDER_API_URL || 'https://wasenderapi.com'}/api/send-message`,
    {
      to: phone.startsWith("+") ? phone : `+${phone}`,
      text: message,
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.WASENDER_API_KEY || 'f6c068170216bec4da99b2287eaaa65b14a9542a91fb04ab1ba1362748512de0'}`,
        "Content-Type": "application/json",
      },
    }
  );
}

await sendWhatsappMessage("5511986261007", "Teste Wasender OK 🚀");