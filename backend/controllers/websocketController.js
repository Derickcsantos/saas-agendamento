import { supabase } from '../lib/supabase.js';

/**
 * 🔐 Validar slug e retornar organization ID (para WebSocket)
 * Endpoint seguro que resolve slug → organizationId sem expor o ID na URL
 */
export async function validateSlugForWebSocket(req, res) {
  try {
    const { slug } = req.params;

    if (!slug) {
      return res.status(400).json({ error: 'Slug não fornecido' });
    }

    // Buscar apenas o ID da organização pelo slug
    const { data, error } = await supabase
      .from('organizations')
      .select('id, slug_organization')
      .eq('slug_organization', slug)
      .maybeSingle();

    if (error) {
      console.error('❌ Erro ao validar slug:', error);
      throw error;
    }

    if (!data) {
      return res.status(404).json({ error: 'Organização não encontrada' });
    }

    // Endpoint público - não valida is_active para permitir visualização da fila

    // Retornar apenas o ID (seguro)
    console.log(`✅ Slug validado: ${slug} → ID: ${data.id}`);
    res.json({
      organizationId: data.id,
      slug: data.slug_organization
    });

  } catch (error) {
    console.error('❌ Erro ao validar slug para WebSocket:', error);
    res.status(500).json({ error: 'Erro ao validar organização' });
  }
}
