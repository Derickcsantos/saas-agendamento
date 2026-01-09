export default async function findCalendarIdByEventId(calendar, eventId) {
  // lista calendários que o usuário pode alterar (igual seu list)
  const calendars = await calendar.calendarList.list();

  const validCalendars = (calendars.data.items || []).filter(
    (cal) => cal.primary === true || cal.accessRole === "owner" || cal.accessRole === "writer"
  );

  // tenta achar o evento em algum calendário
  for (const cal of validCalendars) {
    try {
      await calendar.events.get({ calendarId: cal.id, eventId });
      return cal.id; // achou
    } catch (e) {
      // 404/410 -> não está nesse calendário, segue
      continue;
    }
  }

  return null;
}