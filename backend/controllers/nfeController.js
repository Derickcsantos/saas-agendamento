// nfeController.js
import axios from "axios";
import dotenv from "dotenv";
import { supabase } from "../lib/supabase.js";

dotenv.config();

const nfe = axios.create({
  baseURL: "https://api.nfe.io/v1",
  headers: {
    "Content-Type": "application/json",
    "x-access-token": process.env.NFEIO_API_KEY,
  },
});

export const NfeController = {
  // =====================================================
  // Emitir nota fiscal
  // =====================================================
  async emitirNota({ organization, customer, amount, pagarme_charge_id, subscription_id }) {
    try {
      const payload = {
        cityServiceCode: "101", // ajustar conforme regra municipal
        description: `Assinatura ${organization.name} - Plano SaaS`,
        servicesAmount: amount / 100, // pagarme → centavos
        borrower: {
          federalTaxNumber: customer.document,
          name: customer.name,
          email: customer.email,
          address: {
            country: "BRA",
            postalCode: customer.zipcode,
            street: customer.street,
            number: customer.number,
            district: customer.neighborhood,
            city: customer.city,
            state: customer.state,
          },
        },
      };

      const response = await nfe.post(`/organizations/${process.env.NFE_ORG_ID}/services`, payload);
      const nota = response.data;

      // salva no banco
      await supabase.from("invoices").insert({
        organization_id: organization.id,
        pagarme_subscription_id: subscription_id,
        pagarme_charge_id,
        nfe_document_id: nota.id,
        status: nota.status,
        total_amount: payload.servicesAmount,
        pdf_url: nota.pdf,
        xml_url: nota.xml,
      });

      return nota;
    } catch (error) {
      console.error("Erro ao emitir NFE.io:", error.response?.data || error);
      return null;
    }
  },

  // =====================================================
  // Consultar nota fiscal
  // =====================================================
  async consultarNota(req, res) {
    try {
      const { document_id } = req.params;

      const response = await nfe.get(
        `/organizations/${process.env.NFE_ORG_ID}/services/${document_id}`
      );

      return res.status(200).json(response.data);
    } catch (error) {
      console.error("Erro ao consultar NFE:", error.response?.data || error);
      return res.status(500).json(error.response?.data || { message: "Erro interno" });
    }
  },
};
