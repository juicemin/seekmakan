const LABELS = {
  open: "Open now",
  closed: "Closed now",
  unknown: "Hours unavailable",
};

export default function OpeningStatus({ status }) {
  const value = Object.hasOwn(LABELS, status) ? status : "unknown";

  return (
    <span
      className={`opening-status opening-status--${value}`}
      title="Based on listed hours at the last refresh, in Malaysia time."
    >
      {LABELS[value]}
    </span>
  );
}