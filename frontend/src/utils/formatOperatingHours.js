export function formatOperatingHours(hours) {
  if (!hours) return "Not provided";
  if (hours.status === "closed") return "Closed";
  if (hours.status === "open_24_hours") return "Open 24 hours";

  const periods =
    Array.isArray(hours.periods) && hours.periods.length > 0
      ? hours.periods
      : [{ open: hours.open, close: hours.close }];

  const labels = periods
    .filter(period => period?.open && period?.close)
    .map(period => `${period.open} – ${period.close}`);

  return labels.length > 0 ? labels.join(", ") : "Not provided";
}