import { useId, useState } from "react";

export default function ContributionTags({
  label,
  options,
  selected,
  onChange,
  maxItems,
  disabled = false,
}) {
  const inputId = useId();
  const [query, setQuery] = useState("");

  const search = query.trim();
  const normalise = value => value.toLocaleLowerCase();

  const uniqueOptions = [
    ...new Map(
      [...selected, ...options].map(value => [
        normalise(value),
        value,
      ])
    ).values(),
  ].sort((a, b) => a.localeCompare(b));

  const matching = uniqueOptions.filter(value =>
    normalise(value).includes(normalise(search))
  );

  const alreadyExists = uniqueOptions.some(
    value => normalise(value) === normalise(search)
  );

  const atLimit = selected.length >= maxItems;

  function toggle(value) {
    if (disabled) return;

    if (selected.includes(value)) {
      onChange(selected.filter(item => item !== value));
    } else if (!atLimit) {
      onChange([...selected, value]);
    }
  }

  function addNew() {
    if (
      disabled ||
      !search ||
      alreadyExists ||
      atLimit ||
      Array.from(search).length > 100
    ) {
      return;
    }

    onChange([...selected, search]);
    setQuery("");
  }

  return (
    <div className="contribution-tags">
      <details>
        <summary>
          {label} — optional
          {selected.length > 0 && ` (${selected.length} selected)`}
        </summary>

        <fieldset disabled={disabled}>
          <legend>Select any that apply</legend>

          <label htmlFor={inputId}>Search or add {label.toLowerCase()}</label>
          <input
            id={inputId}
            type="search"
            value={query}
            maxLength={100}
            onChange={event => setQuery(event.target.value)}
            onKeyDown={event => {
              if (event.key === "Enter") {
                event.preventDefault();
                addNew();
              }
            }}
          />

          <div className="contribution-tags__options">
            {matching.map(value => (
              <label key={value}>
                <input
                  type="checkbox"
                  checked={selected.includes(value)}
                  disabled={atLimit && !selected.includes(value)}
                  onChange={() => toggle(value)}
                />
                <span>{value}</span>
              </label>
            ))}
          </div>

          {matching.length === 0 && (
            <p>No matching options. You can add a missing one.</p>
          )}

          {search && !alreadyExists && (
            <button
              type="button"
              disabled={atLimit}
              onClick={addNew}
            >
              Add “{search}”
            </button>
          )}

          {atLimit && <p>Maximum {maxItems} selections reached.</p>}
        </fieldset>
      </details>

      {selected.length > 0 && (
        <div className="contribution-tags__selected">
          {selected.map(value => (
            <button
              key={value}
              type="button"
              disabled={disabled}
              aria-label={`Remove ${value}`}
              onClick={() => toggle(value)}
            >
              {value} ×
            </button>
          ))}
        </div>
      )}
    </div>
  );
}