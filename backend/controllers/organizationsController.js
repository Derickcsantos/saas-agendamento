import { supabase } from '../lib/supabase.js';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import brevo from "../lib/brevo.js"; // ajuste o caminho conforme seu projeto

export async function getOrganizations(req, res) {
  try {
    const { data, error } = await supabase
      .from('organizations')
      .select('id, name, email, phone, address, is_active, logo_organization, slug_organization, created_at, updated_at')
      .order('created_at', { ascending: true });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error fetching organizações:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getOrganizationById(req, res) {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('organizations')
      .select('id, name, email, phone, address, is_active, logo_organization, slug_organization, created_at, updated_at')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Organização não encontrada' });

    res.json(data);
  } catch (error) {
    console.error('Error fetching organization:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// No seu organizationsController.js
export async function getOrganizationBySlug(req, res) {
  try {
    const { slug } = req.params;

    if (!slug) {
      return res.status(400).json({ error: 'Slug não fornecido' });
    }

    // Faça apenas UMA consulta, buscando direto pelo slug
    const { data, error } = await supabase
      .from('organizations')
      .select('id, name, email, phone, address, is_active, logo_organization, slug_organization, created_at, updated_at')
      .eq('slug_organization', slug) // Busca direto pelo slug
      .maybeSingle(); // Use .maybeSingle() para não dar erro se não achar

    // Se deu erro na consulta (exceto "não encontrado")
    if (error) {
      throw error;
    }

    // Se não encontrou dados
    if (!data) {
      return res.status(404).json({ error: 'Organização não encontrada' });
    }

    // Sucesso
    res.json(data);

  } catch (error) {
    console.error('Error fetching organization by slug:', error);

    // Se o erro for de sintaxe (ex: coluna slug é uuid), ele apareceria aqui
    if (error.code === '22P02') {
       return res.status(400).json({ error: 'Tipo de dado inválido para o slug.' });
    }

    res.status(500).json({ error: 'Internal server error' });
  }
}


export async function createOrganization(req, res) {
  try {
    const {
      name,
      email,
      phone,
      address,
      document_type,
      document_number,
      slug_organization,
      is_active
    } = req.body;

    // 🔧 Parse de tipos
    const parsedIsActive =
      typeof is_active === 'boolean'
        ? is_active
        : is_active === 'true' || is_active === true;

    const parsedPhone =
      typeof phone === 'string' && !isNaN(Number(phone))
        ? Number(phone)
        : phone;

    let imagePath = null;

    // 🔧 Upload da imagem
    if (req.file) {
      const buffer = await sharp(req.file.buffer)
        .resize({ width: 600 })
        .webp({ quality: 80 })
        .toBuffer();

      const fileName = `${uuidv4()}.webp`;

      const { error: uploadError } = await supabase.storage
        .from('organizations-logos')
        .upload(fileName, buffer, {
          contentType: 'image/webp',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: publicUrl } = supabase.storage
        .from('organizations-logos')
        .getPublicUrl(fileName);

      imagePath = publicUrl.publicUrl;
    }

    // 🔧 Inserção
    const { data, error } = await supabase
      .from('organizations')
      .insert([
        {
          name,
          email,
          phone: parsedPhone,
          address,
          slug_organization,
          is_active: parsedIsActive,
          document_type,
          document_number,
          logo_organization: imagePath,
        },
      ])
      .select();

      if (error) throw error;

    // 💾 1ª TENTATIVA DE INSERIR organization_landing
      let landingOrganizationError = null;
      let landingOrganizationResult = null;

      try {
        const { data: insertedLanding, error: insertLandingError } = await supabase
          .from("organization_landing")
          .insert({
            slug: slug_organization,
            meta_title: `${name}`,
            meta_description: `Site, galeria e sistema da ${name}`,
            meta_keywords: "agenda online, agenda",
            whatsapp: phone,
            instagram: "sem instagram",
            email: email,
            endereco: address,
            telefone: phone,
          })
          .select()
          .single();

        landingOrganizationResult = insertedLanding;
        landingOrganizationError = insertLandingError;
      } catch (err) {
        landingOrganizationError = err;
      }

      // ❗ Se falhou, tenta novamente
      if (landingOrganizationError) {
        console.warn("⚠ Falha ao criar organization_landing. Tentando novamente...");

        try {
          const { data: retryLanding, error: retryError } = await supabase
            .from("organization_landing")
            .insert({
              slug: slug_organization,
              meta_title: `${name}`,
              meta_description: `Site, galeria e sistema da ${name}`,
              meta_keywords: "agenda online, agenda",
              whatsapp: phone,
              instagram: "sem instagram",
              email: email,
              endereco: address,
              telefone: phone,
            })
            .select()
            .single();

          landingOrganizationResult = retryLanding;

          if (retryError) {
            console.error("❌ Falhou novamente ao criar organization_landing:", retryError);
          }
        } catch (err2) {
          console.error("❌ Erro crítico na segunda tentativa organization_landing:", err2);
        }
      }

      console.log("Landing Organization criada:", landingOrganizationResult);

      try{
        await brevo.sendTransacEmail({
          to: [{email, name}],
          sender: { email: 'marcafy.ofc@gmail.com', name: 'Marcafy' },
          templateId: 1,
          params: {
            organizationName: name,
            email: email
          }
        });

        console.log("E-mail de boas vindas enviado com sucesso")
      } catch (emailError) {
        console.error('Não foi possivel enviar o email de boas vindas: ', emailError)
      }

    res.status(201).json(data[0]);
  } catch (error) {
    console.error('Error creating organization:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

export async function updateOrganization(req, res) {
  try {
    const { slug } = req.params;
    const {
      name,
      email,
      phone,
      address,
      slug_organization,
      is_active
    } = req.body;

    const { data: org, error: orgErr } = await supabase
      .from('organizations')
      .select('id, name, logo_organization')
      .eq('slug_organization', slug)
      .single();

    if (orgErr || !org) {
      return res.status(404).json({ error: 'Organização não encontrada' });
    }

    // 🔧 Parse de tipos
    const parsedIsActive =
      typeof is_active === 'boolean'
        ? is_active
        : is_active === 'true' || is_active === true;

    const parsedPhone =
      typeof phone === 'string' && !isNaN(Number(phone))
        ? Number(phone)
        : phone;

    let imageUrl = null;

    if (req.file) {
      const buffer = await sharp(req.file.buffer)
        .resize({ width: 600 })
        .webp({ quality: 80 })
        .toBuffer();

      const fileName = `${uuidv4()}.webp`;

      const { error: uploadError } = await supabase.storage
        .from('organizations-logos')
        .upload(fileName, buffer, {
          contentType: 'image/webp',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: publicUrl } = supabase.storage
        .from('organizations-logos')
        .getPublicUrl(fileName);

      imageUrl = publicUrl.publicUrl;
    }

    const updateData = {
      name,
      email,
      phone: parsedPhone,
      address,
      slug_organization,
      is_active: parsedIsActive,
      ...(imageUrl && { logo_organization: imageUrl }),
    };

    const { data, error } = await supabase
      .from('organizations')
      .update(updateData)
      .eq('id', org.id)
      .select();

    if (error) throw error;
    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'Organização não encontrada' });
    }

    res.json(data[0]);
  } catch (error) {
    console.error('Error updating organization:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

export async function deleteOrganization(req, res) {
  try {
    const { slug } = req.params;

    const { data: org, error: orgErr } = await supabase
      .from('organizations')
      .select('id, name, logo_organization')
      .eq('slug_organization', slug)
      .single();

    if (orgErr || !org) {
      return res.status(404).json({ error: 'Organização não encontrada' });
    }

    const { error } = await supabase
      .from('organizations')
      .delete()
      .eq('id', org.id);

    if (error) throw error;
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting organization:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
