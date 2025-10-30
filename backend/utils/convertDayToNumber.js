

export default function convertDayToNumber(day) {
  if (typeof day === 'number') {
    return (day >= 0 && day <= 6) ? day : null;
  }

   const daysMap = {
    'domingo': 0,
    'segunda': 1, 'segunda-feira': 1,
    'terça': 2, 'terça-feira': 2,
    'quarta': 3, 'quarta-feira': 3,
    'quinta': 4, 'quinta-feira': 4,
    'sexta': 5, 'sexta-feira': 5,
    'sábado': 6, 'sabado': 6
    
  };

  return daysMap[day.toLowerCase()] || null;
}