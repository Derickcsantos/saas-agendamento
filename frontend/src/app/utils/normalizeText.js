export const generateNormalizedText = (text) => {
  return text
    .normalize("NFD")
    .replace(/\p{Mn}/gu, "") // Remove acentos
    .toLowerCase()
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9\s-]/g, "") // Remove caracteres especiais
    .trim()
    .replace(/\s+/g, "-") // Espaço vira hífen
    .replace(/-+/g, "-"); // Remove hifens duplos
};