export function localAppointmentEnd(appointment, timezone = "America/Sao_Paulo") {
  const [year, month, day] = appointment.appointment_date.split("-").map(Number);
  const [hour, minute, second = 0] = String(appointment.end_time || "00:00:00").split(":").map(Number);
  const wantedAsUtc = Date.UTC(year, month - 1, day, hour, minute, second);
  let guess = wantedAsUtc;
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
  });
  for (let attempt = 0; attempt < 2; attempt++) {
    const parts = Object.fromEntries(formatter.formatToParts(new Date(guess)).map(({ type, value }) => [type, value]));
    const renderedAsUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
    guess += wantedAsUtc - renderedAsUtc;
  }
  return new Date(guess);
}

export function dateInTimeZone(date, timezone = "America/Sao_Paulo") {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
