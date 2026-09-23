function CheckboxDropdown({
  label,
  options,
  selected,
  onChange,
}) {
  function toggleOption(value) {
    const nextSelected = selected.includes(value)
      ? selected.filter(item => item !== value)
      : [...selected, value];

    onChange(nextSelected);
  }

  return (
    <details className="checkbox-dropdown">
      <summary>
        {label}
        {selected.length > 0 && ` (${selected.length} selected)`}
      </summary>

      <fieldset className="checkbox-dropdown__options">
        <legend>{label} — select any</legend>

        {options.length === 0 ? (
          <p>No options available.</p>
        ) : (
          options.map(option => (
            <label key={option}>
              <input
                type="checkbox"
                checked={selected.includes(option)}
                onChange={() => toggleOption(option)}
              />
              <span>{option}</span>
            </label>
          ))
        )}
      </fieldset>
    </details>
  );
}

export default CheckboxDropdown;