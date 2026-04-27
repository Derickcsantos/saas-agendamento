export function normalizeEmployeeImage(value) {
  if (!value) return null;

  const image = String(value).trim();

  if (!image) return null;

  // Já é URL pública ou caminho completo
  if (/^https?:\/\//i.test(image)) {
    return image;
  }

  // Já vem como data URI
  if (/^data:image\//i.test(image)) {
    return image;
  }

  // Base64 puro -> converte para data URI padrão
  return `data:image/jpeg;base64,${image}`;
}