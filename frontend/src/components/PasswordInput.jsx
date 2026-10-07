import { useState } from "react";

export default function PasswordInput({ id, ...inputProps }) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="password-input">
      <input
        {...inputProps}
        id={id}
        type={visible ? "text" : "password"}
      />

      <button
        type="button"
        onClick={() => setVisible(current => !current)}
        aria-controls={id}
        aria-label={visible ? "Hide password" : "Show password"}
      >
        {visible ? "Hide" : "Show"}
      </button>
    </div>
  );
}