
export default function formatDateBR(dateString) {
  if (!dateString) return "—";
  const d = new Date(dateString);
  if (isNaN(d)) return "—";
  return d.toLocaleDateString("pt-BR");
}