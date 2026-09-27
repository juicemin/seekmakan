export default function HiddenGemBadge({ eligible }) {
  if (!eligible) return null;

  return (
    <span
      className="hidden-gem-badge"
      title="Highly rated with fewer reviews on SeekMakan."
    >
      Hidden Gem
    </span>
  );
}