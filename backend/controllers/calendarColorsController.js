import { supabase } from '../lib/supabase.js';

export const getCalendarColors = async (req, res) => {
  try {
    const { slug } = req.params;

    // Buscar organização
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("id")
      .eq("slug_organization", slug)
      .single();

    if (orgError || !org) {
      return res.status(404).json({ error: "Organização não encontrada" });
    }

    // Buscar cores de calendário do sistema
    const { data: colors, error: colorsError } = await supabase
      .from('google_calendar_colors')
      .select('calendar_color_id, google_color_hex, google_color_id')
      .order('calendar_color_id', { ascending: true });

    if (colorsError) throw colorsError;

    // Formatar para o frontend
    const formattedColors = colors.map(color => ({
      id: color.calendar_color_id,
      hex_color: color.google_color_hex || '#000000',
      google_color_id: color.google_color_id
    }));

    res.json(formattedColors);
  } catch (error) {
    console.error('Error fetching calendar colors:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
};
