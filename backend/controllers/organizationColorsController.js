import { supabase } from '../lib/supabase.js';

// Validação simples de cor HEX (#RGB / #RRGGBB)
const isHex = (s) => /^#([0-9A-Fa-f]{3}){1,2}$/.test(s);

/**
 * GET /api/organization-colors/:slug
 * Busca a paleta por slug. Se não existir, retorna os defaults.
 */
export const getColorsBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    // 1) Busca organização
    const { data: org, error: orgErr } = await supabase
      .from('organizations')
      .select('id, name, logo_organization')
      .eq('slug_organization', slug)
      .single();

    if (orgErr || !org) {
      return res.status(404).json({ error: 'Organização não encontrada' });
    }

    // 2) Busca paleta
    const { data: palette, error: palErr } = await supabase
      .from('organizations_colors')
      .select(`
        id, 
        strong_color, 
        light_color, 
        text_dark_color, 
        text_light_color, 
        background_color_main,
        created_at, 
        updated_at`
      )
      .eq('organization_id', org.id)
      .single();

    if (palErr || !palette) {
      // Sem registro: devolve defaults (sem criar)
      return res.json({
        organization_id: org.id,
        strong_color: '#5E3BEE',
        light_color: '#FFFFFF',
        text_dark_color: '#111',
        text_light_color: '#ffffff',
        background_color_main: '#ffffff',
        from_defaults: true
      });
    }

    return res.json({ organization_id: org.id, ...palette, from_defaults: false });
  } catch (e) {
    console.error('getColorsBySlug error:', e);
    return res.status(500).json({ error: 'Erro ao buscar paleta' });
  }
};

/**
 * GET /api/organization-colors?id=UUID
 * Alternativa por organization_id (útil para admin/painel)
 */
export const getColorsByOrgId = async (req, res) => {
  try {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'id (organization_id) é obrigatório' });

    const { data, error } = await supabase
      .from('organizations_colors')
      .select(`
        id, 
        strong_color, 
        light_color, 
        text_dark_color, 
        text_light_color, 
        background_color_main,
        created_at, 
        updated_at`
      )
      .eq('organization_id', id)
      .single();

    if (error || !data) {
      return res.json({
        organization_id: id,
        strong_color: '#5E3BEE',
        light_color: '#FFFFFF',
        text_dark_color: '#111',
        text_light_color: '#ffffff',
        background_color_main: "#ffffff",
        from_defaults: true
      });
    }

    return res.json({ organization_id: id, ...data, from_defaults: false });
  } catch (e) {
    console.error('getColorsByOrgId error:', e);
    return res.status(500).json({ error: 'Erro ao buscar paleta' });
  }
};

export const createColorsBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    let { strong_color = '#5E3BEE', light_color = '#FFFFFF', text_dark_color = '#111', text_light_color = '#ffffff', background_color_main = '#ffffff' } = req.body;

    // validação
    if (!isHex(strong_color) || !isHex(light_color) || !isHex(text_light_color) || !isHex(text_dark_color)) {
      return res.status(400).json({ error: 'Cores devem estar em formato HEX (#RRGGBB ou #RGB)' });
    }

    // org
    const { data: org, error: orgErr } = await supabase
      .from('organizations')
      .select('id')
      .eq('slug_organization', slug)
      .single();

    if (orgErr || !org) return res.status(404).json({ error: 'Organização não encontrada' });

    // já existe?
    const { data: exists } = await supabase
      .from('organizations_colors')
      .select('id')
      .eq('organization_id', org.id)
      .maybeSingle();

    if (exists) {
      return res.status(409).json({ error: 'Paleta já existe para esta organização' });
    }

    // cria
    const { error: insErr } = await supabase
    .from('organizations_colors')
    .insert({
      organization_id: org.id,
      strong_color,
      light_color,
      text_dark_color,
      text_light_color,
      background_color_main,
    });

    if (insErr) throw insErr;

    return res.status(201).json({
      success: true,
      organization_id: org.id,
      strong_color,
      light_color,
      text_dark_color,
      text_light_color,
      background_color_main
    });
  } catch (e) {
    console.error('createColorsBySlug error:', e);
    return res.status(500).json({ error: 'Erro ao criar paleta' });
  }
};


export const upsertColorsBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    let { strong_color, light_color, text_dark_color, text_light_color, background_color_main } = req.body;

    // org
    const { data: org, error: orgErr } = await supabase
      .from('organizations')
      .select('id')
      .eq('slug_organization', slug)
      .single();

    if (orgErr || !org) return res.status(404).json({ error: 'Organização não encontrada' });

    // pega atual p/ defaults
    const { data: current } = await supabase
      .from('organizations_colors')
      .select('strong_color, light_color, text_dark_color, text_light_color')
      .eq('organization_id', org.id)
      .maybeSingle();

    strong_color = strong_color ?? current?.strong_color ?? '#5E3BEE';
    light_color  = light_color  ?? current?.light_color  ?? '#FFFFFF';
    text_dark_color = text_dark_color   ?? current?.text_dark_color   ?? '#111';
    text_light_color = text_light_color   ?? current?.text_light_color   ?? '#ffffff';
    background_color_main = background_color_main ?? current?.background_color_main ?? '#ffffff';

    if (!isHex(strong_color) || !isHex(light_color) || !isHex(text_dark_color)) {
      return res.status(400).json({ error: 'Cores devem estar em formato HEX (#RRGGBB ou #RGB)' });
    }

    // upsert
    const { error: upErr } = await supabase
      .from('organizations_colors')
      .upsert(
        {
          organization_id: org.id,
          strong_color,
          light_color,
          text_dark_color,
          text_light_color,
          background_color_main,
          updated_at: new Date().toISOString()
        },
        { onConflict: 'organization_id' }
      );

    if (upErr) throw upErr;

    return res.json({
      success: true,
      organization_id: org.id,
      strong_color,
      light_color,
      text_dark_color,
      text_light_color,
      background_color_main
    });
  } catch (e) {
    console.error('upsertColorsBySlug error:', e);
    return res.status(500).json({ error: 'Erro ao salvar paleta' });
  }
};

/**
 * DELETE /api/organization-colors/:slug
 * Remove a paleta da organização (não apaga a org).
 */
export const deleteColorsBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    const { data: org, error: orgErr } = await supabase
      .from('organizations')
      .select('id')
      .eq('slug_organization', slug)
      .single();

    if (orgErr || !org) return res.status(404).json({ error: 'Organização não encontrada' });

    const { error: delErr } = await supabase
      .from('organizations_colors')
      .delete()
      .eq('organization_id', org.id);

    if (delErr) throw delErr;

    return res.json({ success: true, message: 'Paleta removida' });
  } catch (e) {
    console.error('deleteColorsBySlug error:', e);
    return res.status(500).json({ error: 'Erro ao remover paleta' });
  }
};
