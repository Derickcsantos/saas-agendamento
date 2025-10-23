
export default function formatTimeFromDB(time) {
  if (!time) return null;
  
  // Se já estiver no formato HH:MM
  if (typeof time === 'string' && time.includes(':')) return time;
  
  // Se for um número (como 100000 para 10:00:00)
  if (typeof time === 'number') {
    const timeStr = String(time).padStart(6, '0');
    return `${timeStr.substr(0, 2)}:${timeStr.substr(2, 2)}`;
  }
  
  return time;
}
