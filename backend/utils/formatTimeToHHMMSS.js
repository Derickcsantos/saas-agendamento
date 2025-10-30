
export default function formatTimeToHHMMSS(time) {
  if (!time) return '09:00:00'; // Valor padrão
  
  // Se já está no formato HH:MM:SS
  if (typeof time === 'string' && time.match(/^\d{2}:\d{2}:\d{2}$/)) {
    return time;
  }
  
  // Se está no formato HH:MM
  if (typeof time === 'string' && time.match(/^\d{2}:\d{2}$/)) {
    return `${time}:00`;
  }
  
  // Se é um número como 800 (8:00) ou 1700 (17:00)
  if (typeof time === 'number') {
    const timeStr = String(time).padStart(4, '0');
    return `${timeStr.substr(0, 2)}:${timeStr.substr(2, 2)}:00`;
  }
  
  return '09:00:00'; // Valor padrão se não reconhecer
}
