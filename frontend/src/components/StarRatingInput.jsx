import { useId } from "react";
import { Star } from "lucide-react";

const RATING_LABELS = [
  "Poor",
  "Fair",
  "Good",
  "Very good",
  "Excellent",
];

export default function StarRatingInput({
  value,
  onChange,
  disabled = false,
}) {
  const groupId = useId();

  return (
    <fieldset className="star-rating" disabled={disabled}>
      <legend>Your rating</legend>

      <div className="star-rating__options">
        {RATING_LABELS.map((label, index) => {
          const rating = index + 1;
          const inputId = `${groupId}-${rating}`;

          return (
            <label
              key={rating}
              htmlFor={inputId}
              className="star-rating__option"
            >
              <input
                id={inputId}
                type="radio"
                name={groupId}
                value={rating}
                checked={value === rating}
                onChange={() => onChange(rating)}
                required
              />

              <span
                className={
                  rating <= value
                    ? "star-rating__star star-rating__star--filled"
                    : "star-rating__star"
                }
                aria-hidden="true"
              >
                <Star
                    size={28}
                    fill={rating <= value ? "currentColor" : "none"}
                    aria-hidden="true"
                />
              </span>

              <span className="star-rating__accessible-label">
                {rating} {rating === 1 ? "star" : "stars"} — {label}
              </span>
            </label>
          );
        })}
      </div>

      <p className="star-rating__description" aria-live="polite">
        {value >= 1 && value <= 5
          ? `${value}/5 — ${RATING_LABELS[value - 1]}`
          : "Choose a rating"}
      </p>
    </fieldset>
  );
}