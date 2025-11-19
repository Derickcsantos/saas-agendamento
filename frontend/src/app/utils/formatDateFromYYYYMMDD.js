
export default function formatDateFromYYYYMMDD(dateString) {
    if (!dateString) return "—";
    try {
      const [year, month, day] = dateString.split("-");
      return `${day}/${month}/${year}`;
    } catch {
      return "—";
    }
  }