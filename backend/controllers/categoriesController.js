import sharp from "sharp";
import { v4 as uuidv4 } from "uuid";
import { supabase } from "../lib/supabase.js";
import {
  getCatalogCache,
  invalidateCatalogCache,
  setCatalogCache,
} from "../utils/catalogCache.js";

async function getOrganizationBySlug(slug) {
  const { data, error } = await supabase
    .from("organizations")
    .select("id")
    .eq("slug_organization", slug)
    .single();

  return { org: data, error };
}

async function uploadCategoryImage(file) {
  const buffer = await sharp(file.buffer)
    .resize({ width: 600 })
    .webp({ quality: 80 })
    .toBuffer();

  const fileName = `${uuidv4()}.webp`;

  const { error: uploadError } = await supabase.storage
    .from("category-images")
    .upload(fileName, buffer, {
      contentType: "image/webp",
      upsert: false,
    });

  if (uploadError) throw uploadError;

  const { data: publicUrl } = supabase.storage
    .from("category-images")
    .getPublicUrl(fileName);

  return publicUrl.publicUrl;
}

async function getNextCategoryOrder(organizationId) {
  const { data, error } = await supabase
    .from("categories")
    .select("order_category")
    .eq("organization_id", organizationId)
    .order("order_category", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return Number(data?.order_category || 0) + 1;
}

export async function getAllCategories(req, res) {
  try {
    const { slug } = req.params;
    const { search } = req.query;

    const { org, error: orgError } = await getOrganizationBySlug(slug);

    if (orgError || !org) {
      return res.status(404).json({ error: "Organizacao nao encontrada" });
    }

    let categories = !search ? getCatalogCache("admin_categories", org.id) : null;

    if (!categories) {
      let query = supabase
        .from("categories")
        .select("id, name, order_category, imagem_category")
        .eq("organization_id", org.id)
        .order("order_category", { ascending: true, nullsFirst: false })
        .order("name", { ascending: true });

      if (search) {
        query = query.ilike("name", `%${search}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      categories = data || [];

      if (!search) {
        setCatalogCache("admin_categories", org.id, categories);
      }
    }

    return res.json(categories);
  } catch (error) {
    console.error("Error fetching categories:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function getCategoryById(req, res) {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .eq("id", id)
      .eq("organization_id", req.organizationId)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: "Categoria nao encontrada" });

    return res.json(data);
  } catch (error) {
    console.error("Error fetching category:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function createCategory(req, res) {
  try {
    const { name } = req.body;
    const { slug } = req.params;

    const { org, error: orgError } = await getOrganizationBySlug(slug);

    if (orgError || !org) {
      return res.status(404).json({ error: "Organizacao nao encontrada" });
    }

    const imagePath = req.file ? await uploadCategoryImage(req.file) : null;
    const orderCategory = await getNextCategoryOrder(org.id);

    const { data, error } = await supabase
      .from("categories")
      .insert([
        {
          organization_id: org.id,
          name,
          imagem_category: imagePath,
          order_category: orderCategory,
        },
      ])
      .select();

    if (error) throw error;

    invalidateCatalogCache(org.id);

    return res.status(201).json(data[0]);
  } catch (error) {
    console.error("Error creating category:", error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
}

export async function updateCategory(req, res) {
  try {
    const { id, slug } = req.params;
    const { name } = req.body;

    const { org, error: orgError } = await getOrganizationBySlug(slug);

    if (orgError || !org) {
      return res.status(404).json({ error: "Organizacao nao encontrada" });
    }

    const updateData = { name };
    if (req.file) {
      updateData.imagem_category = await uploadCategoryImage(req.file);
    }

    const { data, error } = await supabase
      .from("categories")
      .update(updateData)
      .eq("id", id)
      .eq("organization_id", org.id)
      .select();

    if (error) throw error;
    if (!data || data.length === 0) {
      return res.status(404).json({ error: "Categoria nao encontrada" });
    }

    invalidateCatalogCache(org.id);

    return res.json(data[0]);
  } catch (error) {
    console.error("Error updating category:", error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
}

export async function deleteCategory(req, res) {
  try {
    const { id, slug } = req.params;

    const { org, error: orgError } = await getOrganizationBySlug(slug);

    if (orgError || !org) {
      return res.status(404).json({ error: "Organizacao nao encontrada" });
    }

    const { error } = await supabase
      .from("categories")
      .delete()
      .eq("id", id)
      .eq("organization_id", org.id);

    if (error) throw error;

    invalidateCatalogCache(org.id);

    return res.status(204).send();
  } catch (error) {
    console.error("Error deleting category:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function reorderCategories(req, res) {
  try {
    const { slug } = req.params;
    const ids = Array.isArray(req.body?.ids)
      ? req.body.ids.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0)
      : [];

    if (!ids.length || ids.length !== new Set(ids).size) {
      return res.status(400).json({ error: "Lista de categorias invalida" });
    }

    const { org, error: orgError } = await getOrganizationBySlug(slug);

    if (orgError || !org) {
      return res.status(404).json({ error: "Organizacao nao encontrada" });
    }

    const { data: existing, error: existingError } = await supabase
      .from("categories")
      .select("id, order_category")
      .eq("organization_id", org.id);

    if (existingError) throw existingError;

    const existingIds = new Set((existing || []).map((category) => category.id));
    const includesEveryCategory = (existing || []).length === ids.length
      && ids.every((id) => existingIds.has(id));

    if (!includesEveryCategory) {
      return res.status(400).json({ error: "Ha categorias invalidas para esta organizacao" });
    }

    const maxOrder = Math.max(
      0,
      ...(existing || []).map((category) => Number(category.order_category) || 0)
    );

    const temporaryResults = await Promise.all(
      ids.map((id, index) =>
        supabase
          .from("categories")
          .update({ order_category: maxOrder + index + 1 })
          .eq("id", id)
          .eq("organization_id", org.id)
      )
    );

    const temporaryFailed = temporaryResults.find((result) => result.error);
    if (temporaryFailed?.error) throw temporaryFailed.error;

    const results = await Promise.all(
      ids.map((id, index) =>
        supabase
          .from("categories")
          .update({ order_category: index + 1 })
          .eq("id", id)
          .eq("organization_id", org.id)
      )
    );

    const failed = results.find((result) => result.error);
    if (failed?.error) throw failed.error;

    invalidateCatalogCache(org.id);

    return res.json({ success: true });
  } catch (error) {
    console.error("Error reordering categories:", error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
}
