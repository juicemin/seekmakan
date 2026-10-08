import { useState } from "react";

const FIELDS = [
  { key: "name", label: "Restaurant name", min: 2, max: 100 },
  { key: "full_address", label: "Full address", min: 5, max: 300 },
  { key: "city", label: "City / town", min: 2, max: 100 },
  { key: "state", label: "State", min: 2, max: 100 },
  { key: "postcode", label: "Postcode", optional: true },
];

function isValid(field, value) {
  const text = value.trim();

  if (field.key === "postcode") {
    return text === "" || /^[0-9]{5}$/.test(text);
  }

  return text.length >= field.min && text.length <= field.max;
}

export default function SubmissionRestaurantInfo({ value, onChange }) {
  const [editing, setEditing] = useState(false);
  const missingDetails = FIELDS.some(
    field => !isValid(field, value[field.key])
  );

  function updateField(key, text) {
    setEditing(true);
    onChange(current => ({ ...current, [key]: text }));
  }

  return (
    <section className="submission-restaurant-info">
      <h3>Restaurant details</h3>

      <div>
        <strong>{value.name || "Restaurant name not provided"}</strong>
        <p>{value.full_address || "Address not provided"}</p>
      </div>

      <button
        type="button"
        aria-expanded={editing}
        onClick={() => setEditing(current => !current)}
      >
        {editing ? "Finish editing" : "Edit restaurant details"}
      </button>

      {missingDetails && (
        <p>Please complete the missing or invalid details below.</p>
      )}

      {FIELDS.map(field => {
        // Valid information stays in state without showing another input.
        if (!editing && isValid(field, value[field.key])) return null;

        const id = `submission-info-${field.key}`;

        return (
          <div key={field.key}>
            <label htmlFor={id}>
              {field.label}{field.optional ? " — optional" : " *"}
            </label>

            {field.key === "full_address" ? (
              <textarea
                id={id}
                value={value[field.key]}
                onChange={event =>
                  updateField(field.key, event.target.value)
                }
                rows={2}
                minLength={field.min}
                maxLength={field.max}
                required
              />
            ) : (
              <input
                id={id}
                value={value[field.key]}
                onChange={event =>
                  updateField(field.key, event.target.value)
                }
                minLength={field.min}
                maxLength={field.key === "postcode" ? 5 : field.max}
                inputMode={
                  field.key === "postcode" ? "numeric" : undefined
                }
                pattern={
                  field.key === "postcode" ? "[0-9]{5}" : undefined
                }
                required={!field.optional}
              />
            )}
          </div>
        );
      })}
    </section>
  );
}