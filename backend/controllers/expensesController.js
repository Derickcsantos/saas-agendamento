import { supabase } from '../lib/supabase.js';
import { GoogleGenerativeAI } from '@google/generative-ai';

// 🚀 CACHE SYSTEM
const cacheStore = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

const geminiClient = process.env.GEMINI_ANALIST_KEY
  ? new GoogleGenerativeAI(process.env.GEMINI_ANALIST_KEY)
  : null;

function setExpenseCache(orgId, data) {
  cacheStore.set(`expenses_${orgId}`, {
    data,
    timestamp: Date.now(),
  });
}

function getExpenseCache(orgId) {
  const cached = cacheStore.get(`expenses_${orgId}`);
  if (!cached) return null;
  
  if (Date.now() - cached.timestamp > CACHE_TTL) {
    cacheStore.delete(`expenses_${orgId}`);
    return null;
  }
  
  return cached.data;
}

function invalidateExpenseCache(orgId) {
  cacheStore.delete(`expenses_${orgId}`);
}

// ------------------------------------------
// HELPERS
// ------------------------------------------

function tryParseJsonBlock(text) {
  if (!text) return null;
  const match = text.match(/```json\s*([\s\S]*?)\s*```/i);
  const payload = match ? match[1] : text;
  try {
    return JSON.parse(payload);
  } catch (err) {
    return null;
  }
}

function normalizeNumber(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return value;
  if (typeof value !== 'string') return null;
  const cleaned = value.replace(/\./g, '').replace(/,/g, '.').match(/-?\d+(\.\d+)?/);
  if (!cleaned) return null;
  const parsed = parseFloat(cleaned[0]);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}

async function getOrgBySlug(slug) {
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .select('id')
    .eq('slug_organization', slug)
    .single();

  if (orgError || !org) {
    const err = new Error('Organização não encontrada');
    err.status = 404;
    throw err;
  }
  return org;
}

// ==========================================
// CATEGORIAS DE DESPESAS
// ==========================================

export async function getAllExpenseCategories(req, res) {
  try {
    const { slug } = req.params;
    const { search } = req.query;

    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("id")
      .eq("slug_organization", slug)
      .single();

    if (orgError || !org) {
      return res.status(404).json({ error: "Organização não encontrada" });
    }

    let query = supabase
      .from('organizations_category_expenses')
      .select('*')
      .or(`organization_id.eq.${org.id},organization_id.is.null`)
      .order('name_category', { ascending: true });

    if (search) {
      query = query.ilike('name_category', `%${search}%`);
    }

    const { data, error } = await query;

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error('Error fetching expense categories:', error);
    res.status(500).json({ error: 'Erro ao buscar categorias de despesas' });
  }
}

export async function getExpenseCategoryById(req, res) {
  try {
    const { id } = req.params;
    const { slug } = req.params;

    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("id")
      .eq("slug_organization", slug)
      .single();

    if (orgError || !org) {
      return res.status(404).json({ error: "Organização não encontrada" });
    }

    const { data, error } = await supabase
      .from('organizations_category_expenses')
      .select('*')
      .eq('category_expense_id', id)
      .or(`organization_id.eq.${org.id},organization_id.is.null`)
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({ error: 'Categoria não encontrada' });
    }

    res.json(data);
  } catch (error) {
    console.error('Error fetching expense category:', error);
    res.status(500).json({ error: 'Erro ao buscar categoria' });
  }
}

export async function createExpenseCategory(req, res) {
  try {
    const { slug } = req.params;
    const { name_category, description_category } = req.body;

    if (!name_category) {
      return res.status(400).json({ error: 'Nome da categoria é obrigatório' });
    }

    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("id")
      .eq("slug_organization", slug)
      .single();

    if (orgError || !org) {
      return res.status(404).json({ error: "Organização não encontrada" });
    }

    const { data, error } = await supabase
      .from('organizations_category_expenses')
      .insert({
        organization_id: org.id,
        name_category,
        description_category,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') { // unique_violation
        return res.status(409).json({ error: 'Categoria com este nome já existe' });
      }
      throw error;
    }

    res.status(201).json(data);
  } catch (error) {
    console.error('Error creating expense category:', error);
    res.status(500).json({ error: 'Erro ao criar categoria' });
  }
}

export async function updateExpenseCategory(req, res) {
  try {
    const { slug, id } = req.params;
    const { name_category, description_category } = req.body;

    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("id")
      .eq("slug_organization", slug)
      .single();

    if (orgError || !org) {
      return res.status(404).json({ error: "Organização não encontrada" });
    }

    const updates = {};
    if (name_category !== undefined) updates.name_category = name_category;
    if (description_category !== undefined) updates.description_category = description_category;
    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('organizations_category_expenses')
      .update(updates)
      .eq('category_expense_id', id)
      .eq('organization_id', org.id)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return res.status(409).json({ error: 'Categoria com este nome já existe' });
      }
      throw error;
    }

    if (!data) {
      return res.status(404).json({ error: 'Categoria não encontrada' });
    }

    res.json(data);
  } catch (error) {
    console.error('Error updating expense category:', error);
    res.status(500).json({ error: 'Erro ao atualizar categoria' });
  }
}

export async function deleteExpenseCategory(req, res) {
  try {
    const { slug, id } = req.params;

    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("id")
      .eq("slug_organization", slug)
      .single();

    if (orgError || !org) {
      return res.status(404).json({ error: "Organização não encontrada" });
    }

    const { error } = await supabase
      .from('organizations_category_expenses')
      .delete()
      .eq('category_expense_id', id)
      .eq('organization_id', org.id);

    if (error) throw error;

    res.json({ message: 'Categoria excluída com sucesso' });
  } catch (error) {
    console.error('Error deleting expense category:', error);
    res.status(500).json({ error: 'Erro ao excluir categoria' });
  }
}

// ==========================================
// MÉTODOS DE PAGAMENTO
// ==========================================

export async function getAllPaymentMethods(req, res) {
  try {
    const { data, error } = await supabase
      .from('payment_methods')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error('Error fetching payment methods:', error);
    res.status(500).json({ error: 'Erro ao buscar métodos de pagamento' });
  }
}

// ==========================================
// DESPESAS
// ==========================================

export async function getAllExpenses(req, res) {
  try {
    const { slug } = req.params;
    const { search, status_expense, category_expense_id, start_date, end_date, payment_method_id } = req.query;

    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("id")
      .eq("slug_organization", slug)
      .single();

    if (orgError || !org) {
      return res.status(404).json({ error: "Organização não encontrada" });
    }

    // ✅ Tenta buscar do cache se não houver filtros
    let expenses = null;
    const hasFilters = search || status_expense || category_expense_id || start_date || end_date || payment_method_id;
    
    if (!hasFilters) {
      expenses = getExpenseCache(org.id);
    }

    // Se não tem no cache, busca do banco
    if (!expenses) {
      let query = supabase
        .from('organizations_expenses')
        .select(`
          *,
          category:organizations_category_expenses(category_expense_id, name_category),
          payment_method:payment_methods(id, name),
          installments:expense_installments(count)
        `)
        .eq('organization_id', org.id)
        .order('created_at', { ascending: false });

      if (search) {
        query = query.or(`name_expense.ilike.%${search}%,description_expense.ilike.%${search}%`);
      }

      if (status_expense) {
        query = query.eq('status_expense', status_expense);
      }

      if (category_expense_id) {
        query = query.eq('category_expense_id', category_expense_id);
      }

      if (payment_method_id) {
        query = query.eq('payment_method_id', payment_method_id);
      }

      if (start_date) {
        query = query.gte('created_at', start_date);
      }

      if (end_date) {
        query = query.lte('created_at', end_date);
      }

      const { data, error } = await query;

      if (error) throw error;
      expenses = data;

      // Salva no cache apenas se não houver filtros
      if (!hasFilters) {
        setExpenseCache(org.id, expenses);
      }
    }

    res.json(expenses);
  } catch (error) {
    console.error('Error fetching expenses:', error);
    res.status(500).json({ error: 'Erro ao buscar despesas' });
  }
}

export async function getExpenseById(req, res) {
  try {
    const { slug, id } = req.params;

    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("id")
      .eq("slug_organization", slug)
      .single();

    if (orgError || !org) {
      return res.status(404).json({ error: "Organização não encontrada" });
    }

    const { data, error } = await supabase
      .from('organizations_expenses')
      .select(`
        *,
        category:organizations_category_expenses(category_expense_id, name_category),
        payment_method:payment_methods(id, name),
        installments:expense_installments(*),
        attachments:expense_attachments(*)
      `)
      .eq('expense_id', id)
      .eq('organization_id', org.id)
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({ error: 'Despesa não encontrada' });
    }

    res.json(data);
  } catch (error) {
    console.error('Error fetching expense:', error);
    res.status(500).json({ error: 'Erro ao buscar despesa' });
  }
}

export async function createExpense(req, res) {
  try {
    const { slug } = req.params;
    const {
      name_expense,
      description_expense,
      value_expense,
      category_expense_id,
      payment_method_id,
      is_installment,
      status_expense,
      payment_date,
      installments_config, // { installments_total, due_dates: [{due_date, amount}] }
    } = req.body;

    if (!name_expense || !value_expense || !status_expense) {
      return res.status(400).json({ 
        error: 'Campos obrigatórios: name_expense, value_expense, status_expense' 
      });
    }

    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("id")
      .eq("slug_organization", slug)
      .single();

    if (orgError || !org) {
      return res.status(404).json({ error: "Organização não encontrada" });
    }

    // Criar despesa
    const { data: expense, error: expenseError } = await supabase
      .from('organizations_expenses')
      .insert({
        organization_id: org.id,
        name_expense,
        description_expense,
        value_expense,
        category_expense_id,
        payment_method_id,
        is_installment: is_installment || false,
        status_expense,
        payment_date,
      })
      .select()
      .single();

    if (expenseError) throw expenseError;

    // Se for parcelado, criar parcelas
    if (is_installment && installments_config?.due_dates?.length > 0) {
      const installmentsToInsert = installments_config.due_dates.map((inst, idx) => ({
        organization_id: org.id,
        expense_id: expense.expense_id,
        installment_number: idx + 1,
        installments_total: installments_config.due_dates.length,
        due_date: inst.due_date,
        amount: inst.amount,
        status: 'pendente',
      }));

      const { error: installmentsError } = await supabase
        .from('expense_installments')
        .insert(installmentsToInsert);

      if (installmentsError) throw installmentsError;
    }

    invalidateExpenseCache(org.id);

    res.status(201).json(expense);
  } catch (error) {
    console.error('Error creating expense:', error);
    res.status(500).json({ error: 'Erro ao criar despesa' });
  }
}

export async function updateExpense(req, res) {
  try {
    const { slug, id } = req.params;
    const {
      name_expense,
      description_expense,
      value_expense,
      category_expense_id,
      payment_method_id,
      status_expense,
      payment_date,
    } = req.body;

    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("id")
      .eq("slug_organization", slug)
      .single();

    if (orgError || !org) {
      return res.status(404).json({ error: "Organização não encontrada" });
    }

    const updates = {};
    if (name_expense !== undefined) updates.name_expense = name_expense;
    if (description_expense !== undefined) updates.description_expense = description_expense;
    if (value_expense !== undefined) updates.value_expense = value_expense;
    if (category_expense_id !== undefined) updates.category_expense_id = category_expense_id;
    if (payment_method_id !== undefined) updates.payment_method_id = payment_method_id;
    if (status_expense !== undefined) updates.status_expense = status_expense;
    if (payment_date !== undefined) updates.payment_date = payment_date;
    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('organizations_expenses')
      .update(updates)
      .eq('expense_id', id)
      .eq('organization_id', org.id)
      .select()
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({ error: 'Despesa não encontrada' });
    }

    invalidateExpenseCache(org.id);

    res.json(data);
  } catch (error) {
    console.error('Error updating expense:', error);
    res.status(500).json({ error: 'Erro ao atualizar despesa' });
  }
}

export async function deleteExpense(req, res) {
  try {
    const { slug, id } = req.params;

    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("id")
      .eq("slug_organization", slug)
      .single();

    if (orgError || !org) {
      return res.status(404).json({ error: "Organização não encontrada" });
    }

    const { error } = await supabase
      .from('organizations_expenses')
      .delete()
      .eq('expense_id', id)
      .eq('organization_id', org.id);

    if (error) throw error;

    invalidateExpenseCache(org.id);

    res.json({ message: 'Despesa excluída com sucesso' });
  } catch (error) {
    console.error('Error deleting expense:', error);
    res.status(500).json({ error: 'Erro ao excluir despesa' });
  }
}

// ==========================================
// PARCELAS
// ==========================================

export async function getExpenseInstallments(req, res) {
  try {
    const { slug, expenseId } = req.params;

    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("id")
      .eq("slug_organization", slug)
      .single();

    if (orgError || !org) {
      return res.status(404).json({ error: "Organização não encontrada" });
    }

    const { data, error } = await supabase
      .from('expense_installments')
      .select('*')
      .eq('expense_id', expenseId)
      .eq('organization_id', org.id)
      .order('installment_number', { ascending: true });

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error('Error fetching installments:', error);
    res.status(500).json({ error: 'Erro ao buscar parcelas' });
  }
}

export async function updateInstallmentStatus(req, res) {
  try {
    const { slug, installmentId } = req.params;
    const { status } = req.body;

    if (!['pendente', 'pago', 'cancelada'].includes(status)) {
      return res.status(400).json({ error: 'Status inválido' });
    }

    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("id")
      .eq("slug_organization", slug)
      .single();

    if (orgError || !org) {
      return res.status(404).json({ error: "Organização não encontrada" });
    }

    const updates = {
      status,
      paid_at: status === 'pago' ? new Date().toISOString() : null,
    };

    const { data, error } = await supabase
      .from('expense_installments')
      .update(updates)
      .eq('id', installmentId)
      .eq('organization_id', org.id)
      .select()
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({ error: 'Parcela não encontrada' });
    }

    invalidateExpenseCache(org.id);

    res.json(data);
  } catch (error) {
    console.error('Error updating installment:', error);
    res.status(500).json({ error: 'Erro ao atualizar parcela' });
  }
}

// ==========================================
// ANEXOS
// ==========================================

export async function getExpenseAttachments(req, res) {
  try {
    const { slug, expenseId } = req.params;

    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("id")
      .eq("slug_organization", slug)
      .single();

    if (orgError || !org) {
      return res.status(404).json({ error: "Organização não encontrada" });
    }

    const { data, error } = await supabase
      .from('expense_attachments')
      .select('*')
      .eq('expense_id', expenseId)
      .eq('organization_id', org.id)
      .order('uploaded_at', { ascending: false });

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error('Error fetching attachments:', error);
    res.status(500).json({ error: 'Erro ao buscar anexos' });
  }
}

export async function createExpenseAttachment(req, res) {
  try {
    const { slug, expenseId } = req.params;
    const { public_url, note, installment_id } = req.body;

    const file = req.file;

    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("id")
      .eq("slug_organization", slug)
      .single();

    if (orgError || !org) {
      return res.status(404).json({ error: "Organização não encontrada" });
    }

    let finalUrl = public_url;

    // Se receber arquivo, faz upload para o bucket expense-attachments
    if (file) {
      const ext = file.originalname.split('.').pop();
      const fileName = `${org.id}/${expenseId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from('expense-attachments')
        .upload(fileName, file.buffer, {
          contentType: file.mimetype || 'application/octet-stream',
          upsert: true,
        });

      if (uploadErr) {
        console.error('Erro ao subir anexo:', uploadErr.message);
        return res.status(500).json({ error: 'Erro ao fazer upload do anexo' });
      }

      const { data: publicData } = supabase.storage
        .from('expense-attachments')
        .getPublicUrl(fileName);

      finalUrl = publicData?.publicUrl || null;
    }

    if (!finalUrl) {
      return res.status(400).json({ error: 'URL do anexo é obrigatória' });
    }

    const { data, error } = await supabase
      .from('expense_attachments')
      .insert({
        organization_id: org.id,
        expense_id: expenseId,
        installment_id,
        public_url: finalUrl,
        note,
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json(data);
  } catch (error) {
    console.error('Error creating attachment:', error);
    res.status(500).json({ error: 'Erro ao criar anexo' });
  }
}

export async function deleteExpenseAttachment(req, res) {
  try {
    const { slug, attachmentId } = req.params;

    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("id")
      .eq("slug_organization", slug)
      .single();

    if (orgError || !org) {
      return res.status(404).json({ error: "Organização não encontrada" });
    }

    const { error } = await supabase
      .from('expense_attachments')
      .delete()
      .eq('id', attachmentId)
      .eq('organization_id', org.id);

    if (error) throw error;

    res.json({ message: 'Anexo excluído com sucesso' });
  } catch (error) {
    console.error('Error deleting attachment:', error);
    res.status(500).json({ error: 'Erro ao excluir anexo' });
  }
}

// ==========================================
// ESTATÍSTICAS E RELATÓRIOS
// ==========================================

export async function getExpensesSummary(req, res) {
  try {
    const { slug } = req.params;
    const { start_date, end_date } = req.query;

    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("id")
      .eq("slug_organization", slug)
      .single();

    if (orgError || !org) {
      return res.status(404).json({ error: "Organização não encontrada" });
    }

    let query = supabase
      .from('organizations_expenses')
      .select('value_expense, status_expense, category_expense_id, organizations_category_expenses(name_category)')
      .eq('organization_id', org.id);

    if (start_date) {
      query = query.gte('created_at', start_date);
    }

    if (end_date) {
      query = query.lte('created_at', end_date);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Calcular totais
    const summary = {
      total_expenses: data.length,
      total_value: data.reduce((sum, exp) => sum + parseFloat(exp.value_expense || 0), 0),
      by_status: {},
      by_category: {},
    };

    // Agrupar por status
    data.forEach(exp => {
      const status = exp.status_expense || 'indefinido';
      if (!summary.by_status[status]) {
        summary.by_status[status] = { count: 0, total: 0 };
      }
      summary.by_status[status].count++;
      summary.by_status[status].total += parseFloat(exp.value_expense || 0);
    });

    // Agrupar por categoria
    data.forEach(exp => {
      const category = exp.organizations_category_expenses?.name_category || 'Sem categoria';
      if (!summary.by_category[category]) {
        summary.by_category[category] = { count: 0, total: 0 };
      }
      summary.by_category[category].count++;
      summary.by_category[category].total += parseFloat(exp.value_expense || 0);
    });

    res.json(summary);
  } catch (error) {
    console.error('Error fetching expenses summary:', error);
    res.status(500).json({ error: 'Erro ao buscar resumo de despesas' });
  }
}

// ==========================================
// IMPORTAÇÃO VIA GEMINI
// ==========================================

export async function importExpensesFromStatement(req, res) {
  try {
    const { slug } = req.params;

    if (!geminiClient) {
      return res.status(503).json({ error: 'GEMINI_API_KEY não configurada' });
    }

    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'Envie um arquivo PDF ou CSV' });
    }

    const isCsv = file.mimetype?.includes('csv') || file.originalname?.toLowerCase().endsWith('.csv');
    const isPdf = file.mimetype === 'application/pdf' || file.originalname?.toLowerCase().endsWith('.pdf');

    if (!isCsv && !isPdf) {
      return res.status(400).json({ error: 'Formato não suportado. Utilize PDF ou CSV.' });
    }

    const org = await getOrgBySlug(slug);

    const rawContent = isPdf ? file.buffer.toString('base64') : file.buffer.toString('utf8');
    const model = geminiClient.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `Você é um assistente financeiro. Extraia despesas de um extrato fornecido (PDF base64 ou CSV texto).\n\nRegras:\n- Responda apenas JSON válido.\n- Estrutura: [{"name":"descricao", "description":"detalhe opcional", "value":123.45, "payment_date":"YYYY-MM-DD", "category":"nome da categoria"}]\n- payment_date é opcional; tente deduzir.\n- value sempre número (use ponto decimal).\n- Máximo 50 itens.\n- Não invente valores que não existam.\n- Se não encontrar despesas, retorne [].`;

    const result = await model.generateContent([
      { text: prompt },
      { text: isPdf ? `PDF_BASE64:\n${rawContent}` : rawContent },
    ]);

    const text = result?.response?.text();
    const parsed = tryParseJsonBlock(text);

    if (!Array.isArray(parsed)) {
      return res.status(422).json({ error: 'Não foi possível extrair despesas do arquivo' });
    }

    if (parsed.length === 0) {
      return res.status(200).json({ imported: 0, message: 'Nenhuma despesa encontrada no arquivo' });
    }

    const limited = parsed.slice(0, 50);

    const { data: categories, error: catErr } = await supabase
      .from('organizations_category_expenses')
      .select('category_expense_id, name_category, organization_id')
      .or(`organization_id.eq.${org.id},organization_id.is.null`);

    if (catErr) throw catErr;

    const categoryIndex = new Map();
    (categories || []).forEach((c) => {
      categoryIndex.set(c.name_category.toLowerCase(), c.category_expense_id);
    });

    const rows = limited
      .map((item, idx) => {
        const value = normalizeNumber(item.value ?? item.valor ?? item.amount);
        if (!value) return null;

        const name = (item.name || item.title || item.description || `Despesa ${idx + 1}`).toString().trim().slice(0, 200);
        const description = (item.description || '').toString().slice(0, 900) || null;
        const payment_date = normalizeDate(item.payment_date || item.date || item.data);
        const categoryKey = (item.category || '').toString().toLowerCase();
        const category_expense_id = categoryKey && categoryIndex.get(categoryKey) ? categoryIndex.get(categoryKey) : null;

        return {
          organization_id: org.id,
          name_expense: name,
          description_expense: description,
          value_expense: value,
          category_expense_id,
          payment_method_id: null,
          is_installment: false,
          status_expense: 'pendente',
          payment_date,
        };
      })
      .filter(Boolean);

    if (!rows.length) {
      return res.status(422).json({ error: 'Arquivo processado, mas nenhum valor válido foi encontrado' });
    }

    const { data: inserted, error: insertErr } = await supabase
      .from('organizations_expenses')
      .insert(rows)
      .select();

    if (insertErr) throw insertErr;

    invalidateExpenseCache(org.id);

    res.status(201).json({ imported: inserted?.length || 0, sample: inserted?.slice(0, 3) });
  } catch (error) {
    console.error('Error importing statement:', error);
    const status = error.status || 500;
    res.status(status).json({ error: error.message || 'Erro ao importar extrato' });
  }
}
