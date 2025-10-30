
export async function migrateImages() {
  const { data: services, error } = await supabase
    .from("services")
    .select("id, imagem_service");

  if (error) {
    console.error("Erro buscando serviços:", error);
    return;
  }

  for (const service of services) {
    if (!service.imagem_service) continue; // não tem imagem base64

    try {
      const buffer = Buffer.from(service.imagem_service, "base64");

      // converte para webp
      const optimized = await sharp(buffer)
        .resize({ width: 600 })
        .webp({ quality: 80 })
        .toBuffer();

      const fileName = `service-${service.id}.webp`;

      // upload para bucket
      const { error: uploadError } = await supabase.storage
        .from("services-images")
        .upload(fileName, optimized, {
          contentType: "image/webp",
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: publicUrl } = supabase.storage
        .from("services-images")
        .getPublicUrl(fileName);

      // atualiza tabela
      const { error: updateError } = await supabase
        .from("services")
        .update({ imagem_service: publicUrl.publicUrl })
        .eq("id", service.id);

      if (updateError) throw updateError;

      console.log(`Migrado serviço ${service.id}`);
    } catch (err) {
      console.error(`Erro migrando serviço ${service.id}:`, err);
    }
  }

  console.log("✅ Migração concluída!");
}
