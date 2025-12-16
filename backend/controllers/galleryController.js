import { supabase } from '../lib/supabase.js';
import sharp from 'sharp';

export const getImagesBySlug = async (req, res) => {
  const { slug } = req.params;
  const { page = 1, limit = 12, search } = req.query;

  try {
    // 1️⃣ Busca a organização pelo slug
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id, name')
      .eq('slug_organization', slug)
      .single();

    if (orgError || !org) {
      return res.status(404).json({ error: 'Organização não encontrada' });
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    // 2️⃣ Busca imagens dessa organização
    let query = supabase
      .from('galeria')
      .select('imagem_id, imagem_nome, imagem_descricao, imagem_url, created_at', { count: 'exact' })
      .eq('organization_id', org.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1);

    if (search && search.trim() !== '') {
      query = query.ilike('imagem_nome', `%${search}%`);
    }

    const { data: imagens, count, error } = await query;

    if (error) throw error;

    const total = count || 0;
    const totalPages = Math.ceil(total / parseInt(limit));

    res.json({
      organization: org,
      page: parseInt(page),
      totalPages,
      total,
      imagens,
    });
  } catch (error) {
    console.error('Erro ao listar imagens:', error);
    res.status(500).json({ error: 'Erro ao carregar galeria' });
  }
};

/**
 * Upload de imagem associada ao slug da organização
 */
export const uploadImageBySlug = async (req, res) => {
  const { slug } = req.params;
  const { titulo, descricao } = req.body;
  const file = req.file;

  try {
    // 1️⃣ Validações
    if (!file) {
      return res.status(400).json({ error: 'Nenhuma imagem enviada' });
    }

    // 2️⃣ Busca a organização
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id')
      .eq('slug_organization', slug)
      .single();

    if (orgError || !org) {
      return res.status(404).json({ error: 'Organização não encontrada' });
    }

    // 3️⃣ Compressão com Sharp (70%)
    const buffer = await sharp(file.buffer)
      .resize({ width: 1280, withoutEnlargement: true })
      .jpeg({ quality: 70 })
      .toBuffer();

    const filename = `${org.id}/${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`;

    // 4️⃣ Upload no Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('gallery-images')
      .upload(filename, buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (uploadError) throw uploadError;

    // 5️⃣ Obtém a URL pública
    const { data: publicUrlData } = supabase.storage
      .from('gallery-images')
      .getPublicUrl(filename);

    const imageUrl = publicUrlData.publicUrl;

    // 6️⃣ Registra no banco
    const { error: insertError } = await supabase
      .from('galeria')
      .insert({
        organization_id: org.id,
        imagem_nome: titulo || 'Sem título',
        imagem_descricao: descricao || '',
        imagem_url: imageUrl,
      });

    if (insertError) throw insertError;

    res.json({
      success: true,
      message: 'Imagem enviada com sucesso!',
      imageUrl,
    });
  } catch (error) {
    console.error('Erro no upload:', error);
    res.status(500).json({ error: 'Falha ao salvar imagem' });
  }
};

/**
 * Deleta imagem associada a uma organização (via slug)
 */
export const deleteImageBySlug = async (req, res) => {
  const { slug, id } = req.params;

  try {
    // 1️⃣ Busca a organização
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id')
      .eq('slug_organization', slug)
      .single();

    if (orgError || !org) {
      return res.status(404).json({ error: 'Organização não encontrada' });
    }

    // 2️⃣ Busca a imagem
    const { data: imagem, error: imgError } = await supabase
      .from('galeria')
      .select('imagem_url')
      .eq('imagem_id', id)
      .eq('organization_id', org.id)
      .single();

    if (imgError || !imagem) {
      return res.status(404).json({ error: 'Imagem não encontrada' });
    }

    // 3️⃣ Remove do Supabase Storage
    const path = imagem.imagem_url.split('/gallery-images/')[1];
    await supabase.storage.from('gallery-images').remove([path]);

    // 4️⃣ Remove do banco
    const { error: delError } = await supabase
      .from('galeria')
      .delete()
      .eq('imagem_id', id)
      .eq('organization_id', org.id);

    if (delError) throw delError;

    res.json({ success: true, message: 'Imagem excluída com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir imagem:', error);
    res.status(500).json({ error: 'Erro ao excluir imagem' });
  }
};
