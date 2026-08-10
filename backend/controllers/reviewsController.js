import crypto from "node:crypto";
import sharp from "sharp";
import { supabase } from "../lib/supabase.js";
import { getReviewMediaType, hasValidReviewMediaSignature } from "../utils/reviewMedia.js";

const publicReviewSelect = `
  id, token, status, appointment_id,
  appointments (client_name, appointment_date, services (name)),
  organizations!inner (id, name, logo_organization, slug_organization),
  client_reviews (rating, description, media_url, media_type, created_at)
`;

async function loadInvitation(slug, token) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(token || ""))) return null;
  const { data, error } = await supabase.from("review_invitations")
    .select(publicReviewSelect)
    .eq("token", token)
    .eq("organizations.slug_organization", slug)
    .maybeSingle();
  if (error) throw error;
  if (!data?.organizations) return null;
  return data;
}

async function loadReviewCoupon(organizationId) {
  const { data: policy } = await supabase.from("organization_policies").select("review_coupon_id")
    .eq("organization_id", organizationId).maybeSingle();
  if (!policy?.review_coupon_id) return null;
  const { data } = await supabase.from("coupons")
    .select("code, name, description, discount_type, discount_value, valid_until, is_active")
    .eq("id", policy.review_coupon_id).eq("organization_id", organizationId).eq("is_active", true).maybeSingle();
  return data || null;
}

async function withSignedMedia(review) {
  if (!review?.media_url) return review;
  const { data, error } = await supabase.storage.from("review-media").createSignedUrl(review.media_url, 60 * 60);
  return { ...review, media_url: error ? null : data.signedUrl };
}

export async function getReviewInvitation(req, res) {
  res.set("Cache-Control", "no-store, private");
  try {
    const invitation = await loadInvitation(req.params.slug, req.params.token);
    if (!invitation) return res.status(404).json({ error: "Convite de avaliação inválido" });

    const { data: palette } = await supabase.from("organizations_colors")
      .select("strong_color, light_color, text_dark_color, text_light_color, background_color_main")
      .eq("organization_id", invitation.organizations.id)
      .maybeSingle();

    const existingReview = Array.isArray(invitation.client_reviews) ? invitation.client_reviews[0] : invitation.client_reviews;
    const submitted = invitation.status === "submitted" || Boolean(existingReview);
    return res.json({
      organization: invitation.organizations,
      appointment: invitation.appointments,
      palette: palette || {},
      submitted,
      review: await withSignedMedia(existingReview || null),
      coupon: submitted ? await loadReviewCoupon(invitation.organizations.id) : null,
    });
  } catch (error) {
    console.error("GET REVIEW INVITATION ERROR:", error);
    return res.status(500).json({ error: "Não foi possível carregar a avaliação" });
  }
}

export async function submitReview(req, res) {
  let uploadedPath = null;
  try {
    const invitation = await loadInvitation(req.params.slug, req.params.token);
    if (!invitation) return res.status(404).json({ error: "Convite de avaliação inválido" });
    const existingReview = Array.isArray(invitation.client_reviews) ? invitation.client_reviews[0] : invitation.client_reviews;
    if (invitation.status === "submitted" || existingReview) {
      return res.status(409).json({ error: "Este agendamento já foi avaliado" });
    }

    const rating = Number(req.body.rating);
    const description = String(req.body.description || "").trim();
    if (!Number.isInteger(rating) || rating < 0 || rating > 5) {
      return res.status(400).json({ error: "A nota deve ser um número inteiro entre 0 e 5" });
    }
    if (description.length > 2000) return res.status(400).json({ error: "Comentário muito longo" });

    let mediaUrl = null;
    let mediaType = null;
    if (req.file) {
      const media = getReviewMediaType(req.file.mimetype);
      if (!media || !hasValidReviewMediaSignature(req.file)) {
        return res.status(400).json({ error: "Arquivo inválido. Envie JPG, PNG, WEBP, MP4, WEBM ou MOV" });
      }
      if (media.kind === "image") await sharp(req.file.buffer).metadata();
      uploadedPath = `${invitation.organizations.id}/${invitation.appointment_id}/${crypto.randomUUID()}.${media.extension}`;
      const { error } = await supabase.storage.from("review-media").upload(uploadedPath, req.file.buffer, {
        contentType: req.file.mimetype,
        cacheControl: "31536000",
        upsert: false,
      });
      if (error) throw error;
      mediaUrl = uploadedPath;
      mediaType = media.kind;
    }

    const { data: review, error: reviewError } = await supabase.from("client_reviews").insert({
      appointment_id: invitation.appointment_id,
      organization_id: invitation.organizations.id,
      invitation_id: invitation.id,
      rating,
      description: description || null,
      media_url: mediaUrl,
      media_type: mediaType,
    }).select("id, rating, description, media_url, media_type, created_at").single();

    if (reviewError) {
      if (reviewError.code === "23505") {
        if (uploadedPath) await supabase.storage.from("review-media").remove([uploadedPath]);
        return res.status(409).json({ error: "Este agendamento já foi avaliado" });
      }
      throw reviewError;
    }

    await supabase.from("review_invitations").update({ status: "submitted", updated_at: new Date().toISOString() })
      .eq("id", invitation.id);

    const coupon = await loadReviewCoupon(invitation.organizations.id);
    return res.status(201).json({ success: true, review: await withSignedMedia(review), coupon });
  } catch (error) {
    if (uploadedPath) await supabase.storage.from("review-media").remove([uploadedPath]);
    console.error("SUBMIT REVIEW ERROR:", error);
    return res.status(500).json({ error: "Não foi possível enviar sua avaliação" });
  }
}

export async function listOrganizationReviews(req, res) {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page || "1", 10));
    const limit = Math.min(50, Math.max(1, Number.parseInt(req.query.limit || "20", 10)));
    const from = (page - 1) * limit;
    const { data: organization } = await supabase.from("organizations").select("id")
      .eq("slug_organization", req.params.slug).maybeSingle();
    if (!organization) return res.status(404).json({ error: "Organização não encontrada" });

    const { data, error, count } = await supabase.from("client_reviews")
      .select("id, rating, description, media_url, media_type, created_at, appointments (client_name, appointment_date, services (name))", { count: "exact" })
      .eq("organization_id", organization.id)
      .order("created_at", { ascending: false })
      .range(from, from + limit - 1);
    if (error) throw error;

    const { data: statsRows, error: statsError } = await supabase.rpc("get_review_stats", {
      p_organization_id: organization.id,
    });
    if (statsError) throw statsError;
    const stats = statsRows?.[0] || { average: 0, total: 0, distribution: [0, 0, 0, 0, 0, 0] };
    const reviews = await Promise.all((data || []).map(withSignedMedia));
    return res.json({ reviews, page, total: Number(stats.total || count || 0), average: Number(stats.average || 0), distribution: stats.distribution });
  } catch (error) {
    console.error("LIST REVIEWS ERROR:", error);
    return res.status(500).json({ error: "Não foi possível carregar as avaliações" });
  }
}
