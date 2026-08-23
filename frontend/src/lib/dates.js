export function toISODate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function todayISO() {
  return toISODate(new Date());
}

export function formatDayLabel(isoDate) {
  const d = new Date(`${isoDate}T00:00:00`);
  return d.toLocaleDateString(undefined, { weekday: "short", day: "2-digit", month: "short" });
}

export function formatTime(isoDateTime) {
  if (!isoDateTime) return "—";
  return new Date(isoDateTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function formatDuration(hoursDecimal) {
  if (hoursDecimal === null || hoursDecimal === undefined) return "—";
  const totalMinutes = Math.round(Number(hoursDecimal) * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h}h ${m}m`;
}

export function timeStrToMinutes(timeStr) {
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + m;
}

export function shiftDurationMinutes(shift) {
  if (!shift) return 480;
  const start = timeStrToMinutes(shift.start_time);
  let end = timeStrToMinutes(shift.end_time);
  if (end <= start) end += 24 * 60;
  return end - start;
}

// Monday-start week containing `date`, returned as an array of 7 ISO date strings.
export function weekDates(date = new Date()) {
  const day = date.getDay(); // 0 = Sun
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(date);
  monday.setDate(date.getDate() + mondayOffset);
  monday.setHours(0, 0, 0, 0);

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return toISODate(d);
  });
}
