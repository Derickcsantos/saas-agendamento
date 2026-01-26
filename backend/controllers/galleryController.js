import { supabase } from '../lib/supabase.js';
import sharp from 'sharp';

/**
 * =====================================================
 * LISTAR IMAGENS POR SLUG
 * =====================================================
 */
export const getImagesBySlug = async (req, res) => {
  const { slug } = req.params;
  const { page = 1, limit = 12, search } = req.query;

  try {
    // 1️⃣ Busca organização
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id, name')
      .eq('slug_organization', slug)
      .single();

    if (orgError || !org) {
      return res.status(404).json({ error: 'Organização não encontrada' });
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = supabase
      .from('galeria')
      .select(
        'imagem_id, imagem_nome, imagem_descricao, imagem_url, created_at',
        { count: 'exact' }
      )
      .eq('organization_id', org.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1);

    if (search && search.trim() !== '') {
      query = query.ilike('imagem_nome', `%${search}%`);
    }

    const { data: imagens, count, error } = await query;
    if (error) throw error;

    return res.json({
      organization: org,
      page: parseInt(page),
      totalPages: Math.ceil((count || 0) / parseInt(limit)),
      total: count || 0,
      imagens,
    });
  } catch (error) {
    console.error('Erro ao listar imagens:', error);
    return res.status(500).json({ error: 'Erro ao carregar galeria' });
  }
};

/**
 * =====================================================
 * UPLOAD DE MÚLTIPLAS IMAGENS
 * =====================================================
 */
export const uploadImageBySlug = async (req, res) => {
  const { slug } = req.params;
  const { titulo, descricao } = req.body;
  const files = req.files;

  try {
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'Nenhuma imagem enviada' });
    }

    // 1️⃣ Busca organização
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id')
      .eq('slug_organization', slug)
      .single();

    if (orgError || !org) {
      return res.status(404).json({ error: 'Organização não encontrada' });
    }

    // 2️⃣ Processa uploads em paralelo
    const uploadPromises = files.map(async (file) => {
      // Compressão com Sharp
      const buffer = await sharp(file.buffer)
        .resize({ width: 1280, withoutEnlargement: true })
        .jpeg({ quality: 70 })
        .toBuffer();

      // Nome único
      const uniqueName = `${Date.now()}-${Math.random()
        .toString(36)
        .substring(2)}`;

      const safeOriginalName = file.originalname.replace(/\s+/g, '_');

      const filePath = `${org.id}/${uniqueName}-${safeOriginalName}`;

      // Upload no Storage
      const { error: uploadError } = await supabase.storage
        .from('gallery-images')
        .upload(filePath, buffer, {
          contentType: file.mimetype,
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // URL pública
      const { data: publicUrlData } = supabase.storage
        .from('gallery-images')
        .getPublicUrl(filePath);

      return {
        organization_id: org.id,
        imagem_nome: titulo || file.originalname,
        imagem_descricao: descricao || '',
        imagem_url: publicUrlData.publicUrl,
      };
    });

    const imagesToInsert = await Promise.all(uploadPromises);

    // 3️⃣ Insere no banco
    const { error: insertError } = await supabase
      .from('galeria')
      .insert(imagesToInsert);

    if (insertError) throw insertError;

    return res.json({
      success: true,
      message: `${files.length} imagens enviadas com sucesso`,
      images: imagesToInsert,
    });
  } catch (error) {
    console.error('Erro no upload múltiplo:', error);
    return res.status(500).json({ error: 'Falha ao processar upload' });
  }
};

/**
 * =====================================================
 * DELETE DE IMAGEM
 * =====================================================
 */
export const deleteImageBySlug = async (req, res) => {
  const { slug, id } = req.params;

  try {
    // 1️⃣ Organização
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id')
      .eq('slug_organization', slug)
      .single();

    if (orgError || !org) {
      return res.status(404).json({ error: 'Organização não encontrada' });
    }

    // 2️⃣ Busca imagem
    const { data: imagem, error: imgError } = await supabase
      .from('galeria')
      .select('imagem_url')
      .eq('imagem_id', id)
      .eq('organization_id', org.id)
      .single();

    if (imgError || !imagem) {
      return res.status(404).json({ error: 'Imagem não encontrada' });
    }

    // 3️⃣ Remove do storage
    const path = imagem.imagem_url.split('/gallery-images/')[1];
    await supabase.storage.from('gallery-images').remove([path]);

    // 4️⃣ Remove do banco
    const { error: deleteError } = await supabase
      .from('galeria')
      .delete()
      .eq('imagem_id', id)
      .eq('organization_id', org.id);

    if (deleteError) throw deleteError;

    return res.json({
      success: true,
      message: 'Imagem excluída com sucesso',
    });
  } catch (error) {
    console.error('Erro ao excluir imagem:', error);
    return res.status(500).json({ error: 'Erro ao excluir imagem' });
  }
};

/**
 * =====================================================
 * DELETE EM LOTE
 * =====================================================
 */
export const deleteImagesBatchBySlug = async (req, res) => {
  const { slug } = req.params;
  const { ids } = req.body;
  const parseIds = ids.map(id => Number(id)).filter(Boolean);

  try {
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'IDs inválidos' });
    }

    // 1️⃣ Organização
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id')
      .eq('slug_organization', slug)
      .single();

    if (orgError || !org) {
      return res.status(404).json({ error: 'Organização não encontrada' });
    }

    // 2️⃣ Busca imagens
    const { data: images, error: imagesError } = await supabase
      .from('galeria')
      .select('imagem_id, imagem_url')
      .in('imagem_id', parseIds)
      .eq('organization_id', org.id);

    if (imagesError) throw imagesError;

    if (!images || images.length === 0) {
      return res.status(404).json({ error: 'Nenhuma imagem encontrada' });
    }

    // 3️⃣ Remove do Storage
    const paths = images
      .map((img) => img.imagem_url.split('/gallery-images/')[1])
      .filter(Boolean);

    if (paths.length > 0) {
      await supabase
        .storage
        .from('gallery-images')
        .remove(paths);
    }

    // 4️⃣ Remove do banco
    const { error: deleteError } = await supabase
      .from('galeria')
      .delete()
      .in('imagem_id', parseIds)
      .eq('organization_id', org.id);

    if (deleteError) throw deleteError;

    return res.json({
      success: true,
      deleted: parseIds.length
    });
  } catch (error) {
    console.error('Erro exclusão em lote:', error);
    return res.status(500).json({ error: 'Erro ao excluir imagens' });
  }
};
