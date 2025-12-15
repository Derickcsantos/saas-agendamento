import { supabase } from "../lib/supabase.js";

export const getOrganizationPolicies = async (req, res) => {
  try {
    const { slug } = req.params;

    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("id")
      .eq("slug_organization", slug)
      .single();

    if (orgError || !org) {
      return res.status(404).json({ message: "Organização não encontrada" });
    }

    const { data: policy, error: policyError } = await supabase
      .from("organization_policies")
      .select("*")
      .eq("organization_id", org.id)
      .single();

    if (policyError || !policy) {
      return res.status(200).json({
        organization_id: org.id,
        max_schedule_days: 30,
        min_hours_before_booking: 0,
        sync_google_calendar: true,
      });
    }

    return res.status(200).json(policy);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const updateOrganizationPolicies = async (req, res) => {
  try {
    const { slug } = req.params;
    const { max_schedule_days, allow_same_day, min_hours_before_booking, sync_google_calendar } =
      req.body;

    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("id")
      .eq("slug_organization", slug)
      .single();

    if (orgError || !org) {
      return res.status(404).json({ message: "Organização não encontrada" });
    }

    const { error: updateError } = await supabase
      .from("organization_policies")
      .upsert(
        {
          organization_id: org.id,
          max_schedule_days,
          min_hours_before_booking,
          sync_google_calendar: Boolean(sync_google_calendar),
        },
        { onConflict: "organization_id" }
      );

    if (updateError) throw updateError;

    return res.status(200).json({ message: "Políticas atualizadas!" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
