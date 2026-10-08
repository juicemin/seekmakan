import SubmissionAddressLookup from "./SubmissionAddressLookup";

const FIELDS = [
  { key: "full_address", label: "Full address", min: 5, max: 300 },
  { key: "city", label: "City / town", min: 2, max: 100 },
  { key: "state", label: "State", min: 2, max: 100 },
  { key: "postcode", label: "Postcode", optional: true },
];

export default function SubmissionRestaurantInfo({
  value,
  onChange,
  onAddressSelected,
}) {

  function updateField(key, text) {
    onChange(current => ({ ...current, [key]: text }));
}

  return (
    <section className="submission-restaurant-info">
      <h3>Restaurant details</h3>

      <div>
        <p>{value.full_address || "Address not provided"}</p>
      </div>

      {FIELDS.map(field => {
        // Valid information stays in state without showing another input.

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

            {field.key === "full_address" && (
              <SubmissionAddressLookup
                address={value.full_address}
                onSelect={onAddressSelected}
              />
            )}
          </div>
        );
      })}
    </section>
  );
}