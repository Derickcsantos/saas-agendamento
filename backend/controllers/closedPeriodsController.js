import { supabase } from '../lib/supabase.js';

export const getClosedPeriods = async (req, res) => {
  try {
    const { slug } = req.params;

    const { data: org, orgError } = await supabase
      .from("organizations")
      .select("id")
      .eq("slug_organization", slug)
      .single();

    if (orgError || !org) {
      return res.status(404).json({ error: "Organização não encontrada" });
    }

    const { data, error } = await supabase
      .from('closed_periods')
      .select(`
        period_id, 
        start_day, 
        end_day, 
        created_at,
        updated_at
       `)
      .eq('organization_id', org.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error fetching closed periods:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getClosedPeriodById = async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('closed_periods')
      .select(`
        period_id, 
        start_day, 
        end_day, 
        created_at,
        updated_at
       `)
      .eq('period_id', id)
      .eq('organization_id', org.id)  

    if (error) throw error;
    if (data.length === 0) return res.status(404).json({ error: 'Periodos fechados não encontrado nessa organização' });
    
    res.json(data[0]);
  } catch (error) {
    console.error('Error fetching closed periods:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createClosedPeriod = async (req, res) => {
  try {
    const { start_day, end_day } = req.body;
    const { slug } = req.params;

    const { data: org, orgError } = await supabase
      .from("organizations")
      .select("id")
      .eq("slug_organization", slug)
      .single();

    if (orgError || !org) {
      return res.status(404).json({ error: "Organização não encontrada" });
    }

    const { data, error} = await supabase
      .from('closed_periods')
      .insert([
        {
          start_day,
          end_day,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ])
      .select('*')
      .single();

    if (error) {
      console.error('Não foi possivel cadastrar o novo horário fechado', error)
    };

    res.status(201).json(data);
  } catch (err) {
    console.error('Erro ao cadastrar horário fechado:', err);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
};

export const updateClosedPeriod = async (req, res) => {
  try {
    const { id, slug } = req.params;
    const { start_day, end_day } = req.body;

    const { data: org, orgError } = await supabase
      .from("organizations")
      .select("id")
      .eq("slug_organization", slug)
      .single();

    if (orgError || !org) {
      return res.status(404).json({ error: "Organização não encontrada" });
    }

    if (!start_day || !end_day) {
      return res.status(400).json({ error: 'Nome de usuário e e-mail são obrigatórios.' });
    }

    const updateData = {
      start_day,
      end_day,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('closed_periods')
      .update(updateData)
      .eq('period_id', id)
      .eq('organization_id', org.id)
      .select('*')
      .single();

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error('Erro ao atualizar usuário:', error);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
};

export const deleteClosedPeriod = async (req, res) => {
  try {
    const { id, slug } = req.params;

    const { data: org, orgError } = await supabase
      .from("organizations")
      .select("id")
      .eq("slug_organization", slug)
      .single();

    if (orgError || !org) {
      return res.status(404).json({ error: "Organização não encontrada" });
    }

    const { error: deleteError } = await supabase
      .from('closed_periods')
      .delete()
      .eq('id', id)
      .eq('organization_id', org.id);

    if (deleteError) throw deleteError;

    res.json({ success: true });
  } catch (err) {
    console.error('Erro ao excluir usuário:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};