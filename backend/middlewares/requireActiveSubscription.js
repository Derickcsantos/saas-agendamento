import { supabase } from "../lib/supabase.js";

const trial_days = 7
const ms_in_days = 1000 * 60 * 60 * 24

export default async function requireActiveSubscription(req, res, next) {
    try {
        const slug = req.params.slug

        if (!slug) {
            return res.status(400).json({
                error: "Slug da organização não informado."
            });
        }

        const { data: organization, error: orgError } = await supabase
            .from("organizations")
            .select("id, is_active, created_at")
            .eq("slug_organization", slug)
            .single();

        if (orgError || !organization) {
            return res.status(404).json({ message: "Organização não encontrada" });
        }

        const createdAt = new Date(organization.created_at)
        const now = new Date()

        const diffDays = Math.floor((now - createdAt) / ms_in_days)

        const hasActivePlan = organization.is_active === true

        if (!hasActivePlan && diffDays >= trial_days) {
            return res.status(402).json({
                code: "TRIAL_EXPIRED",
                message: "Seu período de teste expirou"
            })
        }

        next()
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Erro ao validar assinatura" });
    }
}